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
   * Classify a submission using ML endpoint
   * Falls back to mock classifier if endpoint is unavailable
   */
  async classifySubmission(
    submissionId: string,
    userId: string,
    labels: Array<{ id: number; name: string }>
  ): Promise<MLClassificationResponse> {
    const mlEndpoint = import.meta.env.VITE_ML_ENDPOINT;

    // If no endpoint configured, use mock
    if (!mlEndpoint) {
      console.log('[ml] No ML endpoint configured, using mock classifier');
      console.log('[ml] request payload:', { submission_id: submissionId, user_id: userId });
      return mockClassifier(submissionId, userId, labels);
    }

    try {
      // Get access token from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.warn('[ml] No session token available, falling back to mock');
        console.log('[ml] request payload:', { submission_id: submissionId, user_id: userId });
        return mockClassifier(submissionId, userId, labels);
      }

      const requestBody: MLClassificationRequest = {
        submission_id: submissionId,
        user_id: userId,
      };

      console.log('[ml] request payload:', requestBody);

      const response = await fetch(`${mlEndpoint}/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`ML endpoint returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as MLClassificationResponse;

      // Validate response structure
      if (!data.coarse_label || !data.coarse_label.id || !data.coarse_label.name) {
        throw new Error('Invalid ML response: missing coarse_label');
      }
      if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) {
        throw new Error('Invalid ML response: confidence must be 0..1');
      }
      if (!Array.isArray(data.suggested_entries)) {
        throw new Error('Invalid ML response: suggested_entries must be an array');
      }

      console.log('[ml] classification successful:', {
        category: data.coarse_label.name,
        confidence: data.confidence,
        suggestions: data.suggested_entries.length,
      });

      return data;
    } catch (error) {
      console.error('[ml] failed, using mock fallback:', error);
      console.log('[ml] request payload:', { submission_id: submissionId, user_id: userId });
      // Fallback to mock classifier
      return mockClassifier(submissionId, userId, labels);
    }
  },
};
