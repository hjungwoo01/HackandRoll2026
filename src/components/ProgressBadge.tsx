interface ProgressBadgeProps {
  current: number;
  total: number;
}

export function ProgressBadge({ current, total }: ProgressBadgeProps) {
  const percentage = Math.round((current / total) * 100);
  
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm font-medium">
      <span className="font-bold">{current}</span>
      <span className="text-primary-500">/</span>
      <span>{total}</span>
      <span className="text-primary-500">({percentage}%)</span>
    </div>
  );
}
