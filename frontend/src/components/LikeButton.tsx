import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface LikeButtonProps {
  liked: boolean;
  count: number;
  onClick: (e: React.MouseEvent) => void;
}

export function LikeButton({ liked, count, onClick }: LikeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors',
        liked
          ? 'bg-red-50 text-red-600 hover:bg-red-100'
          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
      )}
    >
      <motion.div
        animate={{ scale: liked ? [1, 1.2, 1] : 1 }}
        transition={{ duration: 0.3 }}
      >
        <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
      </motion.div>
      <span className="text-sm font-medium">{count}</span>
    </button>
  );
}
