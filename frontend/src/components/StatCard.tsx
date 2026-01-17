import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { cn } from '../lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  className?: string;
  iconColor?: string;
}

export function StatCard({ icon: Icon, label, value, className, iconColor = "text-primary-600" }: StatCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={cn("p-3 rounded-xl bg-primary-50", iconColor)}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
