import { Badge } from './ui/badge';
import { TrendingUp, Sparkles, MapPin, Users, Gem } from 'lucide-react';
import type { FeedItem } from '../api/types';

interface ReasonPillProps {
  reason: FeedItem['reason'];
}

const reasonConfig: Record<
  NonNullable<FeedItem['reason']>,
  { label: string; icon: typeof TrendingUp; variant: 'default' | 'secondary' | 'destructive' }
> = {
  popular: { label: 'Popular', icon: TrendingUp, variant: 'default' },
  new: { label: 'New', icon: Sparkles, variant: 'secondary' },
  'near-you': { label: 'Near You', icon: MapPin, variant: 'secondary' },
  'similar-to-you': { label: 'For You', icon: Users, variant: 'default' },
  suggested: { label: 'Suggested', icon: Gem, variant: 'secondary' },
};

export function ReasonPill({ reason }: ReasonPillProps) {
  if (!reason) return null;
  const config = reasonConfig[reason];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="text-xs flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
