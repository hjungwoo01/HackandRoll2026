import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Star, Shield, Crown, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import type { Badge as BadgeType } from '../api/types';

interface BadgeCardProps {
  badge: BadgeType;
  earned: boolean;
  className?: string;
}

const iconMap: Record<string, typeof Star> = {
  Star,
  Shield,
  Crown,
};

const rarityStyles = {
  common: 'border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100',
  rare: 'border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100',
  epic: 'border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100',
};

const rarityGlow = {
  common: '',
  rare: 'shadow-blue-200',
  epic: 'shadow-purple-200',
};

export function BadgeCard({ badge, earned, className }: BadgeCardProps) {
  const Icon = iconMap[badge.icon] || Star;
  const isLocked = !earned;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('', className)}
    >
      <Card
        className={cn(
          'relative overflow-hidden transition-all',
          isLocked
            ? 'opacity-50 grayscale'
            : `border-2 ${rarityStyles[badge.rarity]} ${rarityGlow[badge.rarity]}`,
          earned && 'shadow-lg'
        )}
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-3">
            {isLocked ? (
              <>
                <div className="p-4 rounded-full bg-gray-200">
                  <Lock className="h-8 w-8 text-gray-400" />
                </div>
                <div className="text-2xl opacity-30">???</div>
              </>
            ) : (
              <>
                <div
                  className={cn(
                    'p-4 rounded-full',
                    badge.rarity === 'common' && 'bg-gray-200',
                    badge.rarity === 'rare' && 'bg-blue-200',
                    badge.rarity === 'epic' && 'bg-purple-200'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-8 w-8',
                      badge.rarity === 'common' && 'text-gray-700',
                      badge.rarity === 'rare' && 'text-blue-700',
                      badge.rarity === 'epic' && 'text-purple-700'
                    )}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{badge.name}</h3>
                  <p className="text-xs text-gray-600">{badge.description}</p>
                </div>
                <Badge
                  variant={
                    badge.rarity === 'common'
                      ? 'secondary'
                      : badge.rarity === 'rare'
                      ? 'default'
                      : 'destructive'
                  }
                  className="text-xs"
                >
                  {badge.rarity}
                </Badge>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
