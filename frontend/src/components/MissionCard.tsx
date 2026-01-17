import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Mission } from '../api/types';

interface MissionCardProps {
  mission: Mission;
  rewardBadgeName?: string;
}

export function MissionCard({ mission, rewardBadgeName }: MissionCardProps) {
  const progress = Math.min((mission.progress / mission.target) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border-2 transition-all ${
        mission.completed
          ? 'bg-green-50 border-green-200'
          : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`p-2 rounded-lg ${
            mission.completed ? 'bg-green-100' : 'bg-gray-100'
          }`}
        >
          {mission.completed ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <div className="h-5 w-5 rounded-full border-2 border-gray-400" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3
              className={`text-sm font-semibold ${
                mission.completed ? 'text-green-900' : 'text-gray-900'
              }`}
            >
              {mission.title}
            </h3>
            {mission.completed && (
              <Badge variant="success" className="text-xs">
                Complete
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-600 mb-2">{mission.description}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Progress</span>
              <span>
                {mission.progress} / {mission.target}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          {rewardBadgeName && (
            <div className="mt-2 text-xs text-gray-500">
              Reward: <span className="font-medium">{rewardBadgeName}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
