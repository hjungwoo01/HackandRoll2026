import { VoteValue } from '../api/types';

interface VoteButtonsProps {
  onVote: (vote: VoteValue) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function VoteButtons({ onVote, disabled, isLoading }: VoteButtonsProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onVote('correct')}
        disabled={disabled || isLoading}
        className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        ✓ Correct
      </button>
      <button
        onClick={() => onVote('wrong')}
        disabled={disabled || isLoading}
        className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        ✗ Wrong
      </button>
      <button
        onClick={() => onVote('unsure')}
        disabled={disabled || isLoading}
        className="flex-1 px-4 py-2 bg-gray-400 text-white rounded-lg font-medium hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        ? Unsure
      </button>
    </div>
  );
}
