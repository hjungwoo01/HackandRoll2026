import { ReactNode } from 'react';
import { cn } from '../lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, rightAction, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between mb-8", className)}>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        {subtitle && <p className="text-gray-600">{subtitle}</p>}
      </div>
      {rightAction && <div>{rightAction}</div>}
    </div>
  );
}
