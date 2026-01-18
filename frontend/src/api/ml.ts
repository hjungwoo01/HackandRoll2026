import { supabase } from '../lib/supabaseClient';
import type { DexEntry } from '../lib/supabaseDex';
import { supabaseDex } from '../lib/supabaseDex';

// ============================================
// TYPES
// ============================================

export interface MLClassificationRequest {
  submission_id: string;
  user_id: string;
}

export interface MLClassificationResponse {
  coarse_label: {
    id: number;
    name: string;
  };
  confidence: number; // 0..1
  suggested_entries: Array<{
    dex_entry_id: number;
    fine_label: string;
  rarity?: 'common' | 'rare' | 'epic';
  }>;
}

// ============================================
// MOCK CLASSIFIER (Deterministic fallback)
// ============================================

/**
 * Deterministic mock classifier based on submission_id hash
 * Returns consistent results for the same submission_id
 */
async function mockClassifier(
  submissionId: string,
  userId: string,
  labels: Array<{ id: number; name: string }>
): Promise<MLClassificationResponse> {
  // Create deterministic hash from submission_id
  let hash = 0;
  for (let i = 0; i < submissionId.length; i++) {
    const char = submissionId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const seed = Math.abs(hash);

  // Select category based on hash
  if (labels.length === 0) {
    throw new Error('No labels available for classification');
  }

  const categoryIndex = seed % labels.length;
  const selectedCategory = labels[categoryIndex];

  // Generate confidence between 0.55 and 0.90
  const confidence = 0.55 + ((seed % 35) / 100); // 0.55 to 0.90

  // Get top 5 dex entries for this category
  let suggestedEntries: Array<{
    dex_entry_id: number;
    fine_label: string;
    rarity?: 'common' | 'rare' | 'epic';
  }> = [];

  try {
    const dexEntries = await supabaseDex.getDexEntries('v0', {
      coarseLabelId: selectedCategory.id,
    });
    
    // Take top 5 entries, shuffled deterministically
    const shuffled = [...dexEntries].sort((a, b) => {
      const aHash = (a.id * seed) % 1000;
      const bHash = (b.id * seed) % 1000;
      return aHash - bHash;
    });
    
    suggestedEntries = shuffled.slice(0, 5).map((entry) => ({
      dex_entry_id: entry.id,
      fine_label: entry.fine_label,
      rarity: entry.rarity,
    }));
  } catch (error) {
    console.warn('Failed to fetch suggested entries for mock classifier:', error);
    // Fallback: create generic suggestions
    suggestedEntries = [
      { dex_entry_id: 0, fine_label: 'Item 1' },
      { dex_entry_id: 0, fine_label: 'Item 2' },
      { dex_entry_id: 0, fine_label: 'Item 3' },
    ];
  }

  return {
    coarse_label: {
      id: selectedCategory.id,
      name: selectedCategory.name,
    },
    confidence,
    suggested_entries: suggestedEntries,
  };
}

// ============================================
// ML API CLIENT
// ============================================

export const mlApi = {
  /**
   * Run lightweight validation checks (foreground + recapture)
   * Returns true if both checks pass, false otherwise
   */
  async validateImage(submissionId: string): Promise<{ valid: boolean; reason?: string }> {
    const mlEndpoint = import.meta.env.VITE_ML_ENDPOINT;

    if (!mlEndpoint) {
      console.warn('[ml] No ML endpoint configured, skipping validation');
      return { valid: true }; // Skip validation if no endpoint
    }

    try {
      // Get access token from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Check 1: Foreground check
      console.log('[ml] running foreground-check for:', submissionId);
      const foregroundResponse = await fetch(`${mlEndpoint}/foreground-check/${submissionId}`, {
        method: 'GET',
        headers,
      });

      if (!foregroundResponse.ok) {
        throw new Error(`Foreground check failed: ${foregroundResponse.statusText}`);
      }

      const foregroundResult = await foregroundResponse.json();
      if (!foregroundResult.accept) {
        console.log('[ml] foreground-check failed:', foregroundResult.reason);
        return { valid: false, reason: foregroundResult.reason || 'Foreground check failed' };
      }

      // Check 2: Recapture check
      console.log('[ml] running recapture-check for:', submissionId);
      const recaptureResponse = await fetch(`${mlEndpoint}/recapture-check/${submissionId}`, {
        method: 'GET',
        headers,
      });

      if (!recaptureResponse.ok) {
        throw new Error(`Recapture check failed: ${recaptureResponse.statusText}`);
      }

      const recaptureResult = await recaptureResponse.json();
      if (!recaptureResult.accept) {
        console.log('[ml] recapture-check failed:', recaptureResult.reason);
        return { valid: false, reason: recaptureResult.reason || 'Recapture check failed' };
      }

      console.log('[ml] validation checks passed');
      return { valid: true };
    } catch (error) {
      console.error('[ml] validation failed:', error);
      return { valid: false, reason: error instanceof Error ? error.message : 'Validation failed' };
    }
  },

  /**
   * Classify a submission using VLM verification endpoint (without proposed_label)
   * Falls back to mock classifier if endpoint is unavailable
   */
  async classifySubmission(
    submissionId: string,
    userId: string,
    labels: Array<{ id: number; name: string }>
  ): Promise<MLClassificationResponse> {
    const verifyEndpoint = import.meta.env.VITE_VERIFY_ML_ENDPOINT;

    // If no endpoint configured, use mock
    if (!verifyEndpoint) {
      console.log('[ml] No verification endpoint configured, using mock classifier');
      console.log('[ml] request payload:', { submission_id: submissionId, user_id: userId });
      return mockClassifier(submissionId, userId, labels);
    }

    try {
      // Get access token from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      console.log('[ml] calling vlm-verification for classification:', submissionId);

      // Call VLM verification endpoint without proposed_label to get classification
      const response = await fetch(`${verifyEndpoint}/vlm-verification/${submissionId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`VLM endpoint returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Map VLM response to MLClassificationResponse format
      // VLM returns: { coarse_label: { id, name }, confidence, suggested_entries }
      const mappedResponse: MLClassificationResponse = {
        coarse_label: {
          id: data.coarse_label?.id || 0,
          name: data.coarse_label?.name || 'Unknown',
        },
        confidence: data.confidence || 0.85,
        suggested_entries: data.suggested_entries || [],
      };

      // Map coarse_label name to actual label ID from labels array
      const matchedLabel = labels.find(l => 
        l.name.toLowerCase() === mappedResponse.coarse_label.name.toLowerCase()
      );
      if (matchedLabel) {
        mappedResponse.coarse_label.id = matchedLabel.id;
      }

      console.log('[ml] classification successful:', {
        category: mappedResponse.coarse_label.name,
        confidence: mappedResponse.confidence,
        suggestions: mappedResponse.suggested_entries.length,
      });

      return mappedResponse;
    } catch (error) {
      console.error('[ml] failed, using mock fallback:', error);
      console.log('[ml] request payload:', { submission_id: submissionId, user_id: userId });
      // Fallback to mock classifier
      return mockClassifier(submissionId, userId, labels);
    }
  },
};
