import { mockApi } from './mock';
import type {
  Submission,
  CreateSubmissionPayload,
  VotePayload,
  UserStats,
} from './types';

// Toggle this to switch between mock and real API
const USE_MOCK = true;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  async listPendingSubmissions(excludeUserId?: string): Promise<Submission[]> {
    if (USE_MOCK) {
      return mockApi.listPendingSubmissions(excludeUserId);
    }
    return fetchApi<Submission[]>(`/submissions/pending?excludeUserId=${excludeUserId || ''}`);
  },

  async createSubmission(payload: CreateSubmissionPayload): Promise<Submission> {
    if (USE_MOCK) {
      return mockApi.createSubmission(payload);
    }
    return fetchApi<Submission>('/submissions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async voteOnSubmission(
    submissionId: string,
    voterId: string,
    vote: 'correct' | 'wrong' | 'unsure'
  ): Promise<{ submission: Submission; statsDelta: Partial<UserStats> }> {
    if (USE_MOCK) {
      return mockApi.voteOnSubmission(submissionId, voterId, vote);
    }
    return fetchApi<{ submission: Submission; statsDelta: Partial<UserStats> }>(
      `/submissions/${submissionId}/vote`,
      {
        method: 'POST',
        body: JSON.stringify({ voterId, vote }),
      }
    );
  },

  async getUserSubmissions(userId: string): Promise<Submission[]> {
    if (USE_MOCK) {
      return mockApi.getUserSubmissions(userId);
    }
    return fetchApi<Submission[]>(`/users/${userId}/submissions`);
  },

  async getLeaderboard(): Promise<UserStats[]> {
    if (USE_MOCK) {
      return mockApi.getLeaderboard();
    }
    return fetchApi<UserStats[]>('/leaderboard');
  },
};
