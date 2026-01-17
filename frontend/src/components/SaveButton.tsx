import { Bookmark } from 'lucide-react';
import { cn } from '../lib/utils';

interface SaveButtonProps {
  saved: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export function SaveButton({ saved, onClick }: SaveButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-1.5 rounded-lg transition-colors',
        saved
          ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
      )}
    >
      <Bookmark className={cn('h-4 w-4', saved && 'fill-current')} />
    </button>
  );
}
