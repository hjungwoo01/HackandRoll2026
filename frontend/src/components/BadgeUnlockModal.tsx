import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Star, Shield, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import { rarityToSet, getSetColor } from '../utils/sanitizeCopy';
import type { Badge as BadgeType } from '../api/types';

interface BadgeUnlockModalProps {
  badge: BadgeType | null;
  open: boolean;
  onClose: () => void;
}

const iconMap: Record<string, typeof Star> = {
  Star,
  Shield,
  Crown,
};

const setThemeColors = {
  common: { bg: 'bg-gray-200', text: 'text-gray-700', border: 'border-gray-300' },
  rare: { bg: 'bg-blue-200', text: 'text-blue-700', border: 'border-blue-300' },
  epic: { bg: 'bg-purple-200', text: 'text-purple-700', border: 'border-purple-300' },
};

export function BadgeUnlockModal({ badge, open, onClose }: BadgeUnlockModalProps) {
  useEffect(() => {
    if (open && badge) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [open, badge]);

  if (!badge) return null;

  const Icon = iconMap[badge.icon] || Star;
  const colors = setThemeColors[badge.rarity];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Badge Unlocked! 🎉</DialogTitle>
          <DialogDescription className="text-center">
            You've earned a new badge
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 py-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className={`p-6 rounded-full ${colors.bg} border-4 ${colors.border}`}
          >
            <Icon className={`h-12 w-12 ${colors.text}`} />
          </motion.div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-gray-900">{badge.name}</h3>
            <p className="text-sm text-gray-600">{badge.description}</p>
            <Badge
              variant={
                badge.rarity === 'common'
                  ? 'secondary'
                  : badge.rarity === 'rare'
                  ? 'default'
                  : 'destructive'
              }
            >
              {rarityToSet(badge.rarity)}
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
