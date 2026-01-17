import { Submission } from '../api/types';
import { formatTimeAgo } from '../utils/formatting';
import { Card } from './Card';
import { VoteButtons } from './VoteButtons';
import { VoteValue } from '../api/types';

interface SubmissionCardProps {
  submission: Submission;
  labels: { id: number; name: string }[];
  onVote: (submissionId: string, vote: VoteValue) => void;
  isLoading?: boolean;
}

export function SubmissionCard({ submission, labels, onVote, isLoading }: SubmissionCardProps) {
  const label = labels.find((l) => l.id === submission.proposedLabelId);

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={submission.imageUrl}
            alt="Submission"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Proposed Label:</span>
            <span className="text-sm font-bold text-primary-700">{label?.name || 'Unknown'}</span>
          </div>
          <div className="text-xs text-gray-500">{formatTimeAgo(submission.createdAt)}</div>
        </div>
        <VoteButtons
          onVote={(vote) => onVote(submission.id, vote)}
          disabled={false}
          isLoading={isLoading}
        />
      </div>
    </Card>
  );
}
