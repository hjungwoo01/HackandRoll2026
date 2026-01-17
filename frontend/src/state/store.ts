import { create } from 'zustand';
import { api } from '../api/client';
import { SEEDED_LABELS } from '../api/mock';
import type {
  Label,
  Submission,
  UserStats,
  VoteValue,
  CreateSubmissionPayload,
  Mission,
  Badge,
  FeedItem,
  ReportReason,
} from '../api/types';

interface AppState {
  // Data
  labels: Label[];
  submissions: Submission[];
  pendingSubmissions: Submission[];
  userSubmissions: Submission[];
  userStats: Map<string, UserStats>;
  leaderboard: UserStats[];
  missions: Mission[];
  badges: Badge[];
  
  // Feed (paginated by tab)
  feedByTab: Record<'for-you' | 'new', FeedItem[]>;
  cursorByTab: Record<'for-you' | 'new', string | null>;
  hasMoreByTab: Record<'for-you' | 'new', boolean>;
  loadingByTab: Record<'for-you' | 'new', boolean>;
  
  // Current user
  currentUserId: string;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Computed
  earnedBadges: Badge[];
  
  // Actions
  submitImage: (file: File, labelId: number) => Promise<Submission>;
  fetchPendingQueue: () => Promise<void>;
  castVote: (submissionId: string, vote: VoteValue) => Promise<Submission>;
  fetchUserSubmissions: () => Promise<void>;
  fetchLeaderboard: () => Promise<void>;
  removePendingSubmission: (submissionId: string) => void;
  
  // Missions & Badges
  fetchMissions: () => Promise<void>;
  fetchBadges: () => Promise<void>;
  recomputeMissions: () => Promise<void>;
  awardBadge: (badgeId: string) => Promise<Badge | null>;
  
  // Feed
  fetchFeed: (filter?: 'for-you' | 'new', cursor?: string) => Promise<void>;
  fetchNextFeedPage: (filter: 'for-you' | 'new') => Promise<void>;
  refreshFeed: (filter: 'for-you' | 'new') => Promise<void>;
  likeFeedItem: (feedItemId: string) => Promise<void>;
  saveFeedItem: (feedItemId: string) => Promise<void>;
  reportFeedItem: (feedItemId: string, reason: ReportReason, details?: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  labels: SEEDED_LABELS,
  submissions: [],
  pendingSubmissions: [],
  userSubmissions: [],
  userStats: new Map(),
  leaderboard: [],
  missions: [],
  badges: [],
  feedByTab: {
    'for-you': [],
    new: [],
  },
  cursorByTab: {
    'for-you': null,
    new: null,
  },
  hasMoreByTab: {
    'for-you': true,
    new: true,
  },
  loadingByTab: {
    'for-you': false,
    new: false,
  },
  currentUserId: 'user_demo_1',
  isLoading: false,
  error: null,
  earnedBadges: [],

  submitImage: async (file: File, labelId: number) => {
    set({ isLoading: true, error: null });
    try {
      // Validate JPEG format
      if (file.type !== 'image/jpeg' && file.type !== 'image/jpg') {
        throw new Error('Image must be in JPEG format');
      }

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
      
      // Award points immediately for accepted upload
      const stats = get().userStats.get(get().currentUserId);
      if (stats) {
        stats.points += 50;
        get().userStats.set(get().currentUserId, stats);
      }
      
      set((state) => ({
        submissions: [submission, ...state.submissions],
        userSubmissions: [submission, ...state.userSubmissions],
        isLoading: false,
      }));

      // Recompute missions after upload
      await get().recomputeMissions();

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

      set((state) => {
        const updatedSubmissions = state.submissions.map((s) =>
          s.id === submissionId ? submission : s
        );
        const updatedPending = state.pendingSubmissions.filter((s) => s.id !== submissionId);
        
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

      await get().fetchLeaderboard();
      
      // Recompute missions after vote
      await get().recomputeMissions();
      
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
      
      // Recompute missions after fetching submissions
      await get().recomputeMissions();
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

  fetchMissions: async () => {
    try {
      const missions = await api.getMissions(get().currentUserId);
      set({ missions });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch missions' });
    }
  },

  fetchBadges: async () => {
    try {
      const badges = await api.getBadges(get().currentUserId);
      const earned = badges.filter((b) => b.earnedAt);
      set({ badges, earnedBadges: earned });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch badges' });
    }
  },

  recomputeMissions: async () => {
    const userId = get().currentUserId;
    const previousMissions = get().missions;
    const missions = await api.getMissions(userId);
    
    // Check for newly completed missions
    const newlyCompleted = missions.filter(
      (m) => {
        const prev = previousMissions.find((pm) => pm.id === m.id);
        return m.completed && (!prev || !prev.completed);
      }
    );

    set({ missions });

    // Award badges for newly completed missions
    for (const mission of newlyCompleted) {
      if (mission.completed) {
        const badge = await get().awardBadge(mission.rewardBadgeId);
        if (badge) {
          // Badge unlock will be handled by Collection page watching earnedBadges
        }
      }
    }
  },

  awardBadge: async (badgeId: string) => {
    try {
      const badge = await api.awardBadge(get().currentUserId, badgeId);
      await get().fetchBadges();
      return badge;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to award badge' });
      return null;
    }
  },

  fetchFeed: async (filter: 'for-you' | 'new' = 'for-you', cursor?: string) => {
    const tab = filter;
    set((state) => ({
      loadingByTab: { ...state.loadingByTab, [tab]: true },
      error: null,
    }));
    try {
      const { items, nextCursor } = await api.getFeed(get().currentUserId, filter, cursor);
      set((state) => ({
        feedByTab: {
          ...state.feedByTab,
          [tab]: cursor ? [...state.feedByTab[tab], ...items] : items,
        },
        cursorByTab: {
          ...state.cursorByTab,
          [tab]: nextCursor,
        },
        hasMoreByTab: {
          ...state.hasMoreByTab,
          [tab]: nextCursor !== null,
        },
        loadingByTab: { ...state.loadingByTab, [tab]: false },
      }));
    } catch (error) {
      set((state) => ({
        error: error instanceof Error ? error.message : 'Failed to fetch feed',
        loadingByTab: { ...state.loadingByTab, [tab]: false },
      }));
    }
  },

  fetchNextFeedPage: async (filter: 'for-you' | 'new') => {
    const tab = filter;
    const state = get();
    if (!state.hasMoreByTab[tab] || state.loadingByTab[tab]) return;
    
    await get().fetchFeed(filter, state.cursorByTab[tab] || undefined);
  },

  refreshFeed: async (filter: 'for-you' | 'new') => {
    const tab = filter;
    set((state) => ({
      feedByTab: { ...state.feedByTab, [tab]: [] },
      cursorByTab: { ...state.cursorByTab, [tab]: null },
      hasMoreByTab: { ...state.hasMoreByTab, [tab]: true },
    }));
    await get().fetchFeed(filter);
  },

  likeFeedItem: async (feedItemId: string) => {
    try {
      const updated = await api.likeFeedItem(feedItemId, get().currentUserId);
      set((state) => {
        const updatedFeedByTab = { ...state.feedByTab };
        Object.keys(updatedFeedByTab).forEach((tab) => {
          updatedFeedByTab[tab as keyof typeof updatedFeedByTab] = updatedFeedByTab[
            tab as keyof typeof updatedFeedByTab
          ].map((item) => (item.id === feedItemId ? updated : item));
        });
        return { feedByTab: updatedFeedByTab };
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to like item' });
    }
  },

  saveFeedItem: async (feedItemId: string) => {
    try {
      const updated = await api.saveFeedItem(feedItemId, get().currentUserId);
      set((state) => {
        const updatedFeedByTab = { ...state.feedByTab };
        Object.keys(updatedFeedByTab).forEach((tab) => {
          updatedFeedByTab[tab as keyof typeof updatedFeedByTab] = updatedFeedByTab[
            tab as keyof typeof updatedFeedByTab
          ].map((item) => (item.id === feedItemId ? updated : item));
        });
        return { feedByTab: updatedFeedByTab };
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save item' });
    }
  },

  reportFeedItem: async (feedItemId: string, reason: ReportReason, details?: string) => {
    try {
      const feedItem = get().feedByTab['for-you'].find((item) => item.id === feedItemId) ||
                      get().feedByTab.new.find((item) => item.id === feedItemId);
      if (!feedItem) throw new Error('Feed item not found');
      
      const result = await api.reportSubmission({
        submissionId: feedItem.submissionId,
        reporterId: get().currentUserId,
        reason,
        details,
      });
      
      // Update feed item in state
      set((state) => {
        const updatedFeedByTab = { ...state.feedByTab };
        Object.keys(updatedFeedByTab).forEach((tab) => {
          updatedFeedByTab[tab as keyof typeof updatedFeedByTab] = updatedFeedByTab[
            tab as keyof typeof updatedFeedByTab
          ].map((item) => {
            if (item.id === feedItemId && result.feedItem) {
              return result.feedItem;
            }
            return item;
          });
        });
        return { feedByTab: updatedFeedByTab };
      });
      
      // Recompute missions in case this triggers Guardian mission
      await get().recomputeMissions();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to report item' });
      throw error;
    }
  },
}));
