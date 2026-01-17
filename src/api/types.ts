export type Label = {
  id: number;
  name: string;
  parentId?: number | null;
};

export type SubmissionStatus = 'pending' | 'verified' | 'rejected';

export type VoteValue = 'correct' | 'wrong' | 'unsure';

export type VoteSummary = {
  correct: number;
  wrong: number;
  unsure: number;
  total: number;
  confidence: number;
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
  voteSummary?: VoteSummary;
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

export type VotePayload = {
  submissionId: string;
  voterId: string;
  vote: VoteValue;
};
