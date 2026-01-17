import { formatPercentile } from '../utils/formatting';

interface PercentileBadgeProps {
  percentile: number;
}

export function PercentileBadge({ percentile }: PercentileBadgeProps) {
  const getBadgeColor = () => {
    if (percentile >= 90) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (percentile >= 75) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (percentile >= 50) return 'bg-green-100 text-green-800 border-green-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeColor()}`}
    >
      {formatPercentile(percentile)}
    </span>
  );
}
