import type {
  Submission,
  CreateSubmissionPayload,
  VotePayload,
  UserStats,
  Label,
  VoteValue,
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

// Mock data storage
let submissions: Submission[] = [];
let votes: Map<string, { voterId: string; vote: VoteValue }[]> = new Map();
let userStats: Map<string, UserStats> = new Map();
let firstInClassLabels: Set<number> = new Set();

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
    };
    submissions.push(submission);
    votes.set(submission.id, []);
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
  });
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
    
    const voteSummary = {
      correct: submissionVotes.filter((v) => v.vote === 'correct').length,
      wrong: submissionVotes.filter((v) => v.vote === 'wrong').length,
      unsure: submissionVotes.filter((v) => v.vote === 'unsure').length,
      total: submissionVotes.length,
      confidence: ratio,
    };
    submission.voteSummary = voteSummary;

    // Award points
    awardPointsOnResolution(submission, submissionVotes);
  }

  return submission;
}

function awardPointsOnResolution(
  submission: Submission,
  submissionVotes: { voterId: string; vote: VoteValue }[]
) {
  if (submission.status === 'verified') {
    // Uploader gets points
    const uploaderStats = userStats.get(submission.uploaderId);
    if (uploaderStats) {
      let points = 100;
      
      // First-in-class bonus
      if (!firstInClassLabels.has(submission.proposedLabelId)) {
        points += 200;
        firstInClassLabels.add(submission.proposedLabelId);
      }
      
      uploaderStats.points += points;
      uploaderStats.verifiedUploads += 1;
    }

    // Voters get points if their vote matches
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
    };
    
    submissions.unshift(submission);
    votes.set(submission.id, []);
    
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
};
