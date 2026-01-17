import { SubmissionStatus } from '../api/types';
import { Badge } from './ui/badge';
import { CheckCircle2, Clock, XCircle, Flag } from 'lucide-react';

interface StatusBadgeProps {
  status: SubmissionStatus | 'active'; // Allow 'active' from database
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Map database status 'active' to 'pending' for display
  const displayStatus: SubmissionStatus = status === 'active' ? 'pending' : status;
  
  const config: Record<SubmissionStatus, { variant: 'warning' | 'success' | 'destructive' | 'outline'; icon: typeof Clock; label: string }> = {
    pending: {
      variant: 'warning',
      icon: Clock,
      label: 'Active',
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

  // Handle unknown status gracefully
  if (!config[displayStatus]) {
    console.warn(`Unknown status: ${status}, defaulting to pending`);
    const { variant, icon: Icon, label } = config.pending;
    return (
      <Badge variant={variant} className={className}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  }

  const { variant, icon: Icon, label } = config[displayStatus];

  return (
    <Badge variant={variant} className={className}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}
