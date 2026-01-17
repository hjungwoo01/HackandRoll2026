import { SubmissionStatus } from '../api/types';
import { Badge } from './ui/badge';
import { CheckCircle2, Clock, XCircle, Flag } from 'lucide-react';

interface StatusBadgeProps {
  status: SubmissionStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config: Record<SubmissionStatus, { variant: 'warning' | 'success' | 'destructive' | 'outline'; icon: typeof Clock; label: string }> = {
    pending: {
      variant: 'warning',
      icon: Clock,
      label: 'Pending',
    },
    verified: {
      variant: 'success',
      icon: CheckCircle2,
      label: 'Verified',
    },
    rejected: {
      variant: 'destructive',
      icon: XCircle,
      label: 'Rejected',
    },
    flagged: {
      variant: 'warning',
      icon: Flag,
      label: 'Flagged',
    },
  };

  const { variant, icon: Icon, label } = config[status];

  return (
    <Badge variant={variant} className={className}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}
