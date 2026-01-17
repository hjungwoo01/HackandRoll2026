import { create } from 'zustand';
import { api } from '../api/client';
import { SEEDED_LABELS } from '../api/mock';
import type {
  Label,
  Submission,
  UserStats,
  VoteValue,
  CreateSubmissionPayload,
} from '../api/types';

interface AppState {
  // Data
  labels: Label[];
  submissions: Submission[];
  pendingSubmissions: Submission[];
  userSubmissions: Submission[];
  userStats: Map<string, UserStats>;
  leaderboard: UserStats[];
  
  // Current user
  currentUserId: string;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  submitImage: (file: File, labelId: number) => Promise<Submission>;
  fetchPendingQueue: () => Promise<void>;
  castVote: (submissionId: string, vote: VoteValue) => Promise<Submission>;
  fetchUserSubmissions: () => Promise<void>;
  fetchLeaderboard: () => Promise<void>;
  removePendingSubmission: (submissionId: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  labels: SEEDED_LABELS,
  submissions: [],
  pendingSubmissions: [],
  userSubmissions: [],
  userStats: new Map(),
  leaderboard: [],
  currentUserId: 'user_demo_1',
  isLoading: false,
  error: null,

  submitImage: async (file: File, labelId: number) => {
    set({ isLoading: true, error: null });
    try {
      // Convert file to data URL for preview
      const imageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const payload: CreateSubmissionPayload = {
        uploaderId: get().currentUserId,
        imageUrl,
        proposedLabelId: labelId,
      };

      const submission = await api.createSubmission(payload);
      
      set((state) => ({
        submissions: [submission, ...state.submissions],
        userSubmissions: [submission, ...state.userSubmissions],
        isLoading: false,
      }));

      return submission;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to submit', isLoading: false });
      throw error;
    }
  },

  fetchPendingQueue: async () => {
    set({ isLoading: true, error: null });
    try {
      const pending = await api.listPendingSubmissions(get().currentUserId);
      set({ pendingSubmissions: pending, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch queue', isLoading: false });
    }
  },

  castVote: async (submissionId: string, vote: VoteValue) => {
    set({ isLoading: true, error: null });
    try {
      const { submission } = await api.voteOnSubmission(
        submissionId,
        get().currentUserId,
        vote
      );

      // Update submissions
      set((state) => {
        const updatedSubmissions = state.submissions.map((s) =>
          s.id === submissionId ? submission : s
        );
        const updatedPending = state.pendingSubmissions.filter((s) => s.id !== submissionId);
        
        // If verified/rejected, add to user submissions if it's the current user's
        let updatedUserSubmissions = state.userSubmissions;
        if (submission.uploaderId === state.currentUserId) {
          updatedUserSubmissions = updatedSubmissions.filter(
            (s) => s.uploaderId === state.currentUserId
          );
        }

        return {
          submissions: updatedSubmissions,
          pendingSubmissions: updatedPending,
          userSubmissions: updatedUserSubmissions,
          isLoading: false,
        };
      });

      // Refresh leaderboard
      await get().fetchLeaderboard();
      
      return submission;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to vote', isLoading: false });
      throw error;
    }
  },

  fetchUserSubmissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const submissions = await api.getUserSubmissions(get().currentUserId);
      set({ userSubmissions: submissions, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch submissions', isLoading: false });
    }
  },

  fetchLeaderboard: async () => {
    try {
      const leaderboard = await api.getLeaderboard();
      const statsMap = new Map<string, UserStats>();
      leaderboard.forEach((stat) => {
        statsMap.set(stat.userId, stat);
      });
      set({ leaderboard, userStats: statsMap });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch leaderboard' });
    }
  },

  removePendingSubmission: (submissionId: string) => {
    set((state) => ({
      pendingSubmissions: state.pendingSubmissions.filter((s) => s.id !== submissionId),
    }));
  },
}));
