import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { PageHeader } from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { StatCard } from '../components/StatCard';
import { BadgeCard } from '../components/BadgeCard';
import { MissionCard } from '../components/MissionCard';
import { BadgeUnlockModal } from '../components/BadgeUnlockModal';
import { formatTimeAgo } from '../utils/formatting';
import { BookOpen, Target, Upload, CheckCircle2, TrendingUp, Clock, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { ALL_BADGES } from '../api/mock';

export function Collection() {
  const navigate = useNavigate();
  const {
    labels,
    userSubmissions,
    fetchUserSubmissions,
    currentUserId,
    userStats,
    missions,
    earnedBadges,
    fetchMissions,
    fetchBadges,
  } = useStore();
  const [unlockedBadge, setUnlockedBadge] = useState<typeof ALL_BADGES[0] | null>(null);

  useEffect(() => {
    fetchUserSubmissions();
    fetchMissions();
    fetchBadges();
  }, [fetchUserSubmissions, fetchMissions, fetchBadges]);

  // Accepted submissions: not flagged or rejected
  const acceptedSubmissions = userSubmissions.filter(
    (s) => s.status !== 'flagged' && s.status !== 'rejected'
  );
  const acceptedCount = acceptedSubmissions.length;
  const pendingCount = userSubmissions.filter((s) => s.status === 'pending').length;
  const progress = (acceptedCount / labels.length) * 100;

  const acceptedLabelIds = new Set(
    acceptedSubmissions.map((s) => s.verifiedLabelId || s.proposedLabelId)
  );

  const stats = userStats.get(currentUserId);

  // Check for newly unlocked badges
  const [previousEarnedIds, setPreviousEarnedIds] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const currentIds = new Set(earnedBadges.map((b) => b.id));
    const newBadgeIds = Array.from(currentIds).filter((id) => !previousEarnedIds.has(id));
    
    if (newBadgeIds.length > 0) {
      // New badge(s) earned - show the first one
      const newBadge = earnedBadges.find((b) => b.id === newBadgeIds[0]);
      if (newBadge) {
        setUnlockedBadge(newBadge);
      }
      setPreviousEarnedIds(currentIds);
    } else {
      setPreviousEarnedIds(currentIds);
    }
  }, [earnedBadges, previousEarnedIds]);

  const getLabelName = (labelId: number) => {
    return labels.find((l) => l.id === labelId)?.name || 'Unknown';
  };

  const getBadgeForMission = (missionId: string) => {
    const mission = missions.find((m) => m.id === missionId);
    if (!mission) return null;
    return ALL_BADGES.find((b) => b.id === mission.rewardBadgeId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Your RareDex"
        subtitle="Track your collection and achievements"
      />

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={BookOpen}
          label="Collected"
          value={`${acceptedCount} / ${labels.length}`}
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={pendingCount}
          iconColor="text-yellow-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Points"
          value={stats?.points || 0}
          iconColor="text-green-600"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Collection Book */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Collection Book</CardTitle>
                  <CardDescription>
                    Unlock categories by getting items accepted
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  {Math.round(progress)}% complete
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Progress value={progress} className="h-3" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {labels.map((label, index) => {
                  const isCollected = acceptedLabelIds.has(label.id);
                  const userSubmission = acceptedSubmissions.find(
                    (s) => (s.verifiedLabelId || s.proposedLabelId) === label.id
                  );

                  return (
                    <motion.div
                      key={label.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <div
                        className={`
                          aspect-square rounded-2xl border-2 p-4 flex flex-col items-center justify-center
                          transition-all relative overflow-hidden
                          ${
                            isCollected
                              ? 'bg-gradient-to-br from-primary-100 to-primary-200 border-primary-400 shadow-md'
                              : 'bg-gray-50 border-gray-200'
                          }
                        `}
                      >
                        {isCollected ? (
                          <>
                            {userSubmission && (
                              <div className="absolute inset-0 opacity-20">
                                <img
                                  src={userSubmission.imageUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="relative z-10 text-center">
                              <CheckCircle2 className="h-8 w-8 text-primary-700 mb-2 mx-auto" />
                              <div className="text-xs font-semibold text-primary-900 text-center leading-tight">
                                {label.name}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center">
                            <div className="text-3xl mb-2 opacity-30">?</div>
                            <div className="text-xs font-medium text-center text-gray-400 leading-tight">
                              {label.name}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Badge Case */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary-600" />
                Badge Case
              </CardTitle>
              <CardDescription>
                Your Badge Case tracks what you've truly contributed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ALL_BADGES.map((badge) => {
                  const earned = earnedBadges.some((b) => b.id === badge.id);
                  return (
                    <BadgeCard key={badge.id} badge={badge} earned={earned} />
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest submissions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              {userSubmissions.length === 0 ? (
                <EmptyState
                  icon={Upload}
                  title="No submissions yet"
                  description="Start building your collection by adding items to RareDex"
                  action={{
                    label: 'Add to RareDex',
                    onClick: () => navigate('/upload'),
                  }}
                />
              ) : (
                <div className="space-y-3">
                  {userSubmissions.slice(0, 5).map((submission) => (
                    <div
                      key={submission.id}
                      className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <img
                          src={submission.imageUrl}
                          alt="Submission"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 truncate">
                            {getLabelName(submission.proposedLabelId)}
                          </span>
                          <StatusBadge status={submission.status} />
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatTimeAgo(submission.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Missions Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary-600" />
                Missions
              </CardTitle>
              <CardDescription>Complete missions to earn badges</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {missions.map((mission) => {
                const rewardBadge = getBadgeForMission(mission.id);
                return (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    rewardBadgeName={rewardBadge?.name}
                  />
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Badge Unlock Modal */}
      <BadgeUnlockModal
        badge={unlockedBadge}
        open={!!unlockedBadge}
        onClose={() => setUnlockedBadge(null)}
      />
    </div>
  );
}
