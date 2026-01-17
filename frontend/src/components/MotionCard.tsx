import { motion } from 'framer-motion';
import { Card } from './ui/card';
import { ReactNode } from 'react';
import { cn } from '../lib/utils';

interface MotionCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function MotionCard({ children, className, delay = 0 }: MotionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className={cn("", className)}>{children}</Card>
    </motion.div>
  );
}
