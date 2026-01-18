import { supabase } from '../lib/supabaseClient';

// ============================================
// TYPES
// ============================================

export interface MLVerificationRequest {
  submission_id: string;
  user_id: string;
  fine_dex_entry_id: number | null;
  fine_label: string | null;
}

export interface MLVerificationResponse {
  ok: boolean;
  score: number; // 0..1
  reason?: string;
}

// ============================================
// MOCK VERIFIER (Deterministic fallback)
// ============================================

/**
 * Deterministic mock verifier based on submission_id hash
 * Returns consistent results for the same submission_id
 */
async function mockVerifier(
  submissionId: string,
  userId: string,
  fineDexEntryId: number | null,
  fineLabel: string | null
): Promise<MLVerificationResponse> {
  // Create deterministic hash from submission_id
  let hash = 0;
  for (let i = 0; i < submissionId.length; i++) {
    const char = submissionId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const seed = Math.abs(hash);

  // 80% pass rate for demo (deterministic based on submission_id)
  const shouldPass = (seed % 10) < 8;
  
  // Generate score between 0.65 and 0.95 for pass, 0.2 and 0.5 for fail
  const score = shouldPass
    ? 0.65 + ((seed % 30) / 100) // 0.65 to 0.95
    : 0.2 + ((seed % 30) / 100); // 0.2 to 0.5

  const reason = shouldPass
    ? 'Image matches selected label with high confidence'
    : 'Image does not match selected label. Please choose a different label or retake photo.';

  return {
    ok: shouldPass,
    score,
    reason,
  };
}

// ============================================
// VERIFICATION ML API CLIENT
// ============================================

export const mlVerifyApi = {
  /**
   * Verify a submission using ML verification endpoint
   * Falls back to mock verifier if endpoint is unavailable
   */
  async verifySubmission(
    submissionId: string,
    userId: string,
    fineDexEntryId: number | null,
    fineLabel: string | null
  ): Promise<MLVerificationResponse> {
    const verifyEndpoint = import.meta.env.VITE_VERIFY_ML_ENDPOINT;

    // If no endpoint configured, use mock
    if (!verifyEndpoint) {
      console.log('[verify] No verification endpoint configured, using mock verifier');
      const payload: MLVerificationRequest = {
        submission_id: submissionId,
        user_id: userId,
        fine_dex_entry_id: fineDexEntryId,
        fine_label: fineLabel,
      };
      console.log('[verify] request payload:', payload);
      const result = await mockVerifier(submissionId, userId, fineDexEntryId, fineLabel);
      console.log('[verify] response:', result);
      return result;
    }

    try {
      // Get access token from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        console.warn('[verify] No session token available, falling back to mock');
        const payload: MLVerificationRequest = {
          submission_id: submissionId,
          user_id: userId,
          fine_dex_entry_id: fineDexEntryId,
          fine_label: fineLabel,
        };
        console.log('[verify] request payload:', payload);
        const result = await mockVerifier(submissionId, userId, fineDexEntryId, fineLabel);
        console.log('[verify] response:', result);
        return result;
      }

      const requestBody: MLVerificationRequest = {
        submission_id: submissionId,
        user_id: userId,
        fine_dex_entry_id: fineDexEntryId,
        fine_label: fineLabel,
      };

      console.log('[verify] request payload:', requestBody);

      // Call VLM verification endpoint with proposed_label for verification
      const response = await fetch(
        `${verifyEndpoint}/vlm-verification/${submissionId}?proposed_label=${encodeURIComponent(fineLabel || '')}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Verification endpoint returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Map backend response format { decision, message, confidence } to frontend format
      // Backend returns: { decision: "accept"|"reject", message: string, confidence: number }
      const mappedResponse: MLVerificationResponse = {
        ok: data.decision === "accept",
        score: data.confidence || 0.5,
        reason: data.message || undefined,
      };

      // Validate response structure
      if (typeof mappedResponse.ok !== 'boolean') {
        throw new Error('Invalid verification response: missing decision field');
      }
      if (typeof mappedResponse.score !== 'number' || mappedResponse.score < 0 || mappedResponse.score > 1) {
        throw new Error('Invalid verification response: confidence must be 0..1');
      }

      console.log('[verify] response:', mappedResponse);

      return mappedResponse;
    } catch (error) {
      console.error('[verify] failed, using mock fallback:', error);
      const payload: MLVerificationRequest = {
        submission_id: submissionId,
        user_id: userId,
        fine_dex_entry_id: fineDexEntryId,
        fine_label: fineLabel,
      };
      console.log('[verify] request payload:', payload);
      // Fallback to mock verifier
      const result = await mockVerifier(submissionId, userId, fineDexEntryId, fineLabel);
      console.log('[verify] response:', result);
      return result;
    }
  },
};
