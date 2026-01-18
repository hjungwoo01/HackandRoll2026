import type {
  Submission,
  CreateSubmissionPayload,
  UserStats,
  Label,
  VoteValue,
  Mission,
  Badge,
  FeedItem,
  Report,
  ReportPayload,
} from './types';

// Seeded taxonomy labels
export const SEEDED_LABELS: Label[] = [
  { id: 1, name: 'Vintage Electronics', parentId: null },
  { id: 2, name: 'Rare Coins', parentId: null },
  { id: 3, name: 'Antique Furniture', parentId: null },
  { id: 4, name: 'Vintage Toys', parentId: null },
  { id: 5, name: 'Collectible Cards', parentId: null },
  { id: 6, name: 'Rare Books', parentId: null },
  { id: 7, name: 'Vintage Watches', parentId: null },
  { id: 8, name: 'Antique Jewelry', parentId: null },
  { id: 9, name: 'Rare Artifacts', parentId: null },
  { id: 10, name: 'Vintage Cameras', parentId: null },
  { id: 11, name: 'Collectible Figurines', parentId: null },
  { id: 12, name: 'Rare Stamps', parentId: null },
  { id: 13, name: 'Vintage Vinyl', parentId: null },
  { id: 14, name: 'Antique Pottery', parentId: null },
  { id: 15, name: 'Rare Minerals', parentId: null },
];

// Badges
export const ALL_BADGES: Badge[] = [
  {
    id: 'first-mark',
    name: 'First Mark',
    description: 'Submitted your first entry to RareDex',
    icon: 'Star',
    rarity: 'common',
  },
  {
    id: 'watchful-eye',
    name: 'Watchful Eye',
    description: 'Submitted reports that helped flag problematic content',
    icon: 'Eye',
    rarity: 'rare',
  },
  {
    id: 'curators-crest',
    name: "Curator's Crest",
    description: 'Got 2 entries verified by the community',
    icon: 'Crown',
    rarity: 'epic',
  },
];

// Missions
export const ALL_MISSIONS: Mission[] = [
  {
    id: 'first-entry',
    title: 'First Entry',
    description: 'Submit your first upload',
    target: 1,
    progress: 0,
    rewardBadgeId: 'first-mark',
    completed: false,
  },
  {
    id: 'guardian',
    title: 'Guardian',
    description: 'Submit 2 reports that help keep RareDex clean',
    target: 2,
    progress: 0,
    rewardBadgeId: 'watchful-eye',
    completed: false,
  },
  {
    id: 'curator',
    title: 'Curator',
    description: 'Get 2 verified uploads',
    target: 2,
    progress: 0,
    rewardBadgeId: 'curators-crest',
    completed: false,
  },
];

// Mock data storage
let submissions: Submission[] = [];
let votes: Map<string, { voterId: string; vote: VoteValue }[]> = new Map();
let userStats: Map<string, UserStats> = new Map();
let firstInClassLabels: Set<number> = new Set();
let feedItems: FeedItem[] = [];
let userEarnedBadges: Map<string, Set<string>> = new Map(); // userId -> Set<badgeId>
let feedLikes: Map<string, Set<string>> = new Map(); // feedItemId -> Set<userId>
let feedSaves: Map<string, Set<string>> = new Map(); // feedItemId -> Set<userId>
let reports: Report[] = [];
let submissionReports: Map<string, Set<string>> = new Map(); // submissionId -> Set<reporterId>

// Initialize with seeded submissions
const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400',
  'https://images.unsplash.com/photo-1579783902614-a76fb22739f6?w=400',
  'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400',
  'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
  'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400',
  'https://images.unsplash.com/photo-1605000797499-95a51c7b0eaa?w=400',
  'https://images.unsplash.com/photo-1605000797499-95a51c7b0eaa?w=400',
  'https://images.unsplash.com/photo-1605000797499-95a51c7b0eaa?w=400',
];

const MOCK_USER_NAMES = ['Spotter', 'Explorer', 'Seeker', 'Finder', 'Observer'];

function initializeMockData() {
  const now = new Date();
  const mockUsers = ['user_1', 'user_2', 'user_3', 'user_4', 'user_5'];
  
  // Create 10-12 pending submissions
  for (let i = 0; i < 12; i++) {
    const submission: Submission = {
      id: `sub_${i + 1}`,
      uploaderId: mockUsers[Math.floor(Math.random() * mockUsers.length)],
      imageUrl: PLACEHOLDER_IMAGES[i % PLACEHOLDER_IMAGES.length],
      proposedLabelId: SEEDED_LABELS[Math.floor(Math.random() * SEEDED_LABELS.length)].id,
      status: 'pending',
      createdAt: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      reportCount: 0,
    };
    submissions.push(submission);
    votes.set(submission.id, []);
    submissionReports.set(submission.id, new Set());
  }

  // Initialize user stats
  mockUsers.forEach((userId) => {
    userStats.set(userId, {
      userId,
      points: Math.floor(Math.random() * 500),
      percentile: 0,
      verifiedUploads: 0,
      correctVotes: 0,
      totalVotes: 0,
    });
    userEarnedBadges.set(userId, new Set());
  });

  // Initialize feed with some verified submissions
  for (let i = 0; i < 25; i++) {
    const submission = submissions[i % submissions.length];
    const label = SEEDED_LABELS.find((l) => l.id === submission.proposedLabelId);
    const uploaderName = MOCK_USER_NAMES[Math.floor(Math.random() * MOCK_USER_NAMES.length)];
    const likes = Math.floor(Math.random() * 50);
    const reasons: FeedItem['reason'][] = ['trending', 'new', 'suggested'];
    const tags = ['#spotted', '#found', '#seen', '#unique'];
    
    feedItems.push({
      id: `feed_${i + 1}`,
      submissionId: submission.id,
      imageUrl: submission.imageUrl,
      labelId: submission.proposedLabelId,
      labelName: label?.name || 'Unknown',
      uploaderName,
      uploaderId: submission.uploaderId,
      status: i % 3 === 0 ? 'verified' : 'pending',
      createdAt: new Date(now.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString(),
      likes,
      savedByMe: false,
      likedByMe: false,
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      caption: `A rare ${label?.name.toLowerCase() || 'item'} discovered by ${uploaderName}. ${tags[Math.floor(Math.random() * tags.length)]}`,
      tags: [tags[Math.floor(Math.random() * tags.length)]],
      reportCount: 0,
      flagged: false,
    });
    feedLikes.set(`feed_${i + 1}`, new Set());
    feedSaves.set(`feed_${i + 1}`, new Set());
  }
}

initializeMockData();

function recomputeConsensus(submissionId: string): Submission | null {
  const submission = submissions.find((s) => s.id === submissionId);
  if (!submission) return null;

  const submissionVotes = votes.get(submissionId) || [];
  const relevantVotes = submissionVotes.filter((v) => v.vote !== 'unsure');
  
  if (relevantVotes.length < 3) {
    return submission;
  }

  const correct = relevantVotes.filter((v) => v.vote === 'correct').length;
  const wrong = relevantVotes.filter((v) => v.vote === 'wrong').length;
  const total = relevantVotes.length;
  const ratio = correct / total;

  let newStatus: 'pending' | 'verified' | 'rejected' = 'pending';
  if (ratio >= 0.7) {
    newStatus = 'verified';
  } else if (wrong / total >= 0.7) {
    newStatus = 'rejected';
  }

  if (newStatus !== submission.status) {
    submission.status = newStatus;
    submission.verifiedLabelId = newStatus === 'verified' ? submission.proposedLabelId : null;
    
    // Vote summary removed - no longer part of Submission type

    // Award points
    awardPointsOnResolution(submission, submissionVotes);

    // Add to feed if verified
    if (newStatus === 'verified') {
      const label = SEEDED_LABELS.find((l) => l.id === submission.proposedLabelId);
      const uploaderName = MOCK_USER_NAMES[Math.floor(Math.random() * MOCK_USER_NAMES.length)];
      const feedItem: FeedItem = {
        id: `feed_${Date.now()}`,
        submissionId: submission.id,
        imageUrl: submission.imageUrl,
        labelId: submission.proposedLabelId,
        labelName: label?.name || 'Unknown',
        uploaderName,
        uploaderId: submission.uploaderId,
        status: 'verified',
        createdAt: new Date().toISOString(),
        likes: 0,
        savedByMe: false,
        likedByMe: false,
        reason: 'new' as const,
        caption: `A rare ${label?.name.toLowerCase() || 'item'} discovered by ${uploaderName}.`,
        reportCount: 0,
        flagged: false,
      };
      feedItems.unshift(feedItem);
      feedLikes.set(feedItem.id, new Set());
      feedSaves.set(feedItem.id, new Set());
    }
  }

  return submission;
}

function awardPointsOnResolution(
  submission: Submission,
  submissionVotes: { voterId: string; vote: VoteValue }[]
) {
  if (submission.status === 'verified') {
    const uploaderStats = userStats.get(submission.uploaderId);
    if (uploaderStats) {
      let points = 100;
      
      if (!firstInClassLabels.has(submission.proposedLabelId)) {
        points += 200;
        firstInClassLabels.add(submission.proposedLabelId);
      }
      
      uploaderStats.points += points;
      uploaderStats.verifiedUploads += 1;
    }

    const finalVote = 'correct';
    submissionVotes.forEach((v) => {
      if (v.vote === finalVote) {
        const voterStats = userStats.get(v.voterId);
        if (voterStats) {
          voterStats.points += 10;
          voterStats.correctVotes += 1;
        }
      }
      const voterStats = userStats.get(v.voterId);
      if (voterStats) {
        voterStats.totalVotes += 1;
      }
    });
  } else if (submission.status === 'rejected') {
    const finalVote = 'wrong';
    submissionVotes.forEach((v) => {
      if (v.vote === finalVote) {
        const voterStats = userStats.get(v.voterId);
        if (voterStats) {
          voterStats.points += 10;
          voterStats.correctVotes += 1;
        }
      }
      const voterStats = userStats.get(v.voterId);
      if (voterStats) {
        voterStats.totalVotes += 1;
      }
    });
  }
}

function computePercentiles() {
  const statsArray = Array.from(userStats.values());
  statsArray.sort((a, b) => b.points - a.points);
  
  statsArray.forEach((stat, index) => {
    const percentile = Math.round(((statsArray.length - index - 1) / statsArray.length) * 100);
    stat.percentile = percentile;
  });
}

export const mockApi = {
  async listPendingSubmissions(excludeUserId?: string): Promise<Submission[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return submissions
      .filter((s) => s.status === 'pending' && s.uploaderId !== excludeUserId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createSubmission(payload: CreateSubmissionPayload): Promise<Submission> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const submission: Submission = {
      id: `sub_${Date.now()}`,
      uploaderId: payload.uploaderId,
      imageUrl: payload.imageUrl,
      imagePath: payload.imagePath,
      proposedLabelId: payload.proposedLabelId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      reportCount: 0,
    };
    
    submissions.unshift(submission);
    votes.set(submission.id, []);

    // Add to feed
    const label = SEEDED_LABELS.find((l) => l.id === payload.proposedLabelId);
    const uploaderName = MOCK_USER_NAMES[Math.floor(Math.random() * MOCK_USER_NAMES.length)];
    const feedItem: FeedItem = {
      id: `feed_${Date.now()}`,
      submissionId: submission.id,
      imageUrl: payload.imageUrl,
      labelId: payload.proposedLabelId,
      labelName: label?.name || 'Unknown',
      uploaderName,
      uploaderId: payload.uploaderId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      likes: 0,
      savedByMe: false,
      likedByMe: false,
      reason: 'new',
      caption: `A rare ${label?.name.toLowerCase() || 'item'} discovered by ${uploaderName}.`,
      reportCount: 0,
      flagged: false,
    };
    feedItems.unshift(feedItem);
    feedLikes.set(feedItem.id, new Set());
    feedSaves.set(feedItem.id, new Set());
    
    return submission;
  },

  async voteOnSubmission(
    submissionId: string,
    voterId: string,
    vote: VoteValue
  ): Promise<{ submission: Submission; statsDelta: Partial<UserStats> }> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    const submissionVotes = votes.get(submissionId) || [];
    const existingVoteIndex = submissionVotes.findIndex((v) => v.voterId === voterId);
    
    if (existingVoteIndex >= 0) {
      submissionVotes[existingVoteIndex].vote = vote;
    } else {
      submissionVotes.push({ voterId, vote });
    }
    
    votes.set(submissionId, submissionVotes);
    
    const updatedSubmission = recomputeConsensus(submissionId);
    computePercentiles();
    
    return {
      submission: updatedSubmission || submissions.find((s) => s.id === submissionId)!,
      statsDelta: {},
    };
  },

  async getUserSubmissions(userId: string): Promise<Submission[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return submissions
      .filter((s) => s.uploaderId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getLeaderboard(): Promise<UserStats[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    computePercentiles();
    return Array.from(userStats.values())
      .sort((a, b) => b.points - a.points)
      .slice(0, 50);
  },

  // Missions & Badges
  async getMissions(userId: string): Promise<Mission[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const earnedBadges = userEarnedBadges.get(userId) || new Set();

    return ALL_MISSIONS.map((mission) => {
      let progress = 0;
      if (mission.id === 'first-entry') {
        const userSubs = submissions.filter((s) => s.uploaderId === userId);
        progress = userSubs.length;
      } else if (mission.id === 'guardian') {
        const userReports = reports.filter((r) => r.reporterId === userId);
        const flaggedReports = userReports.filter((r) => {
          const sub = submissions.find((s) => s.id === r.submissionId);
          return sub && sub.status === 'flagged';
        });
        progress = Math.max(userReports.length, flaggedReports.length);
      } else if (mission.id === 'curator') {
        // Count accepted uploads (not flagged/rejected)
        const userSubs = submissions.filter((s) => s.uploaderId === userId && s.status !== 'flagged' && s.status !== 'rejected');
        progress = userSubs.length;
      }

      return {
        ...mission,
        progress: Math.min(progress, mission.target),
        completed: earnedBadges.has(mission.rewardBadgeId),
      };
    });
  },

  async getBadges(userId: string): Promise<Badge[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const earnedBadgeIds = userEarnedBadges.get(userId) || new Set();
    
    return ALL_BADGES.map((badge) => ({
      ...badge,
      earnedAt: earnedBadgeIds.has(badge.id) ? new Date().toISOString() : undefined,
    }));
  },

  async awardBadge(userId: string, badgeId: string): Promise<Badge> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const earnedBadges = userEarnedBadges.get(userId) || new Set();
    earnedBadges.add(badgeId);
    userEarnedBadges.set(userId, earnedBadges);
    
    const badge = ALL_BADGES.find((b) => b.id === badgeId);
    if (!badge) throw new Error('Badge not found');
    
    return {
      ...badge,
      earnedAt: new Date().toISOString(),
    };
  },

  // Feed with pagination
  async getFeed(
    userId: string,
    filter?: 'for-you' | 'new',
    cursor?: string,
    limit: number = 10
  ): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    let filtered = [...feedItems].filter((item) => !item.flagged || item.reportCount < 4); // Hide rejected items
    
    if (filter === 'for-you') {
      // Score = likes*2 - reportCount*5 + recencyBoost
      filtered.sort((a, b) => {
        const now = Date.now();
        const aAge = now - new Date(a.createdAt).getTime();
        const bAge = now - new Date(b.createdAt).getTime();
        const aRecencyBoost = Math.max(0, 100 - aAge / (1000 * 60 * 60)); // Hours
        const bRecencyBoost = Math.max(0, 100 - bAge / (1000 * 60 * 60));
        const aScore = a.likes * 2 - a.reportCount * 5 + aRecencyBoost;
        const bScore = b.likes * 2 - b.reportCount * 5 + bRecencyBoost;
        return bScore - aScore;
      });
    } else if (filter === 'new') {
      filtered = filtered.filter((item) => item.reason === 'new' || item.status === 'pending');
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // Pagination
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = filtered.findIndex((item) => item.id === cursor);
      if (cursorIndex >= 0) {
        startIndex = cursorIndex + 1;
      }
    }

    const paginated = filtered.slice(startIndex, startIndex + limit);
    const nextCursor = startIndex + limit < filtered.length ? paginated[paginated.length - 1]?.id || null : null;

    // Update likedByMe and savedByMe, add captions
    const items = paginated.map((item) => {
      const caption = `A rare ${item.labelName.toLowerCase()} discovered by ${item.uploaderName}. ${item.tags?.join(' ') || ''}`;
      return {
        ...item,
        caption,
        likedByMe: feedLikes.get(item.id)?.has(userId) || false,
        savedByMe: feedSaves.get(item.id)?.has(userId) || false,
        likes: feedLikes.get(item.id)?.size || 0,
      };
    });

    return { items, nextCursor };
  },

  async likeFeedItem(feedItemId: string, userId: string): Promise<FeedItem> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const likes = feedLikes.get(feedItemId) || new Set();
    const item = feedItems.find((f) => f.id === feedItemId);
    
    if (!item) throw new Error('Feed item not found');
    
    if (likes.has(userId)) {
      likes.delete(userId);
    } else {
      likes.add(userId);
    }
    feedLikes.set(feedItemId, likes);
    
    return {
      ...item,
      likedByMe: likes.has(userId),
      likes: likes.size,
    };
  },

  async saveFeedItem(feedItemId: string, userId: string): Promise<FeedItem> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const saves = feedSaves.get(feedItemId) || new Set();
    const item = feedItems.find((f) => f.id === feedItemId);
    
    if (!item) throw new Error('Feed item not found');
    
    if (saves.has(userId)) {
      saves.delete(userId);
    } else {
      saves.add(userId);
    }
    feedSaves.set(feedItemId, saves);
    
    return {
      ...item,
      savedByMe: saves.has(userId),
    };
  },

  // Reporting
  async reportSubmission(payload: ReportPayload): Promise<{ submission: Submission; feedItem?: FeedItem }> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    // Check if user already reported
    const reporterSet = submissionReports.get(payload.submissionId) || new Set();
    if (reporterSet.has(payload.reporterId)) {
      throw new Error('You have already reported this submission');
    }
    
    // Add report
    const report: Report = {
      id: `report_${Date.now()}`,
      submissionId: payload.submissionId,
      reporterId: payload.reporterId,
      reason: payload.reason,
      details: payload.details,
      createdAt: new Date().toISOString(),
    };
    reports.push(report);
    reporterSet.add(payload.reporterId);
    submissionReports.set(payload.submissionId, reporterSet);
    
    // Update submission
    const submission = submissions.find((s) => s.id === payload.submissionId);
    if (!submission) throw new Error('Submission not found');
    
    submission.reportCount = reporterSet.size;
    
    // Apply thresholds
    if (submission.reportCount >= 2 && submission.status !== 'flagged' && submission.status !== 'rejected') {
      submission.status = 'flagged';
      
      // Deduct points from uploader if they were awarded
      const uploaderStats = userStats.get(submission.uploaderId);
      if (uploaderStats) {
        uploaderStats.points = Math.max(0, uploaderStats.points - 50);
      }
    }
    
    if (submission.reportCount >= 4) {
      submission.status = 'rejected';
    }
    
    // Update feed item
    const feedItem = feedItems.find((f) => f.submissionId === payload.submissionId);
    if (feedItem) {
      feedItem.reportCount = submission.reportCount;
      feedItem.flagged = submission.reportCount >= 2;
    }
    
    // Award moderator credit if this report caused flagging
    if (submission.reportCount === 2) {
      const reporterStats = userStats.get(payload.reporterId);
      if (reporterStats) {
        reporterStats.points += 5;
      }
    }
    
    return { submission, feedItem };
  },
};
