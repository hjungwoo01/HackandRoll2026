export type Label = {
  id: number;
  name: string;
  parentId?: number | null;
};

export type SubmissionStatus = 'pending' | 'flagged' | 'rejected' | 'verified';

export type VoteValue = 'correct' | 'wrong' | 'unsure';

export type ReportReason = 'incorrect_label' | 'spam' | 'low_quality' | 'other';

export type Report = {
  id: string;
  submissionId: string;
  reporterId: string;
  reason: ReportReason;
  details?: string;
  createdAt: string;
};

export type Submission = {
  id: string;
  uploaderId: string;
  imageUrl: string;
  imagePath?: string;
  proposedLabelId: number;
  status: SubmissionStatus;
  createdAt: string;
  verifiedLabelId?: number | null;
  reportCount: number;
  labelConfidence?: number;
};

export type UserStats = {
  userId: string;
  points: number;
  percentile: number;
  verifiedUploads: number;
  correctVotes: number;
  totalVotes: number;
};

export type CreateSubmissionPayload = {
  uploaderId: string;
  imageUrl: string;
  imagePath?: string;
  proposedLabelId: number;
};


export type MissionId = string;

export type Mission = {
  id: MissionId;
  title: string;
  description: string;
  target: number;
  progress: number;
  rewardBadgeId: string;
  completed: boolean;
};

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  rarity: 'common' | 'rare' | 'epic';
  earnedAt?: string;
};

export type FeedItem = {
  id: string;
  submissionId: string;
  imageUrl: string;
  labelId: number;
  labelName: string;
  uploaderName: string;
  uploaderId: string;
  status: 'verified' | 'pending';
  createdAt: string;
  likes: number;
  savedByMe: boolean;
  likedByMe: boolean;
  tags?: string[];
  reason?: 'trending' | 'new' | 'near-you' | 'similar-to-you' | 'rare-find';
  caption?: string;
  reportCount: number;
  flagged: boolean;
};

export type ReportPayload = {
  submissionId: string;
  reporterId: string;
  reason: ReportReason;
  details?: string;
};
