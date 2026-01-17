import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { StatCard } from '../components/StatCard';
import { BadgeCard } from '../components/BadgeCard';
import { BadgeUnlockModal } from '../components/BadgeUnlockModal';
import { formatTimeAgo } from '../utils/formatting';
import { BookOpen, Target, Upload, CheckCircle2, TrendingUp, Clock, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

export function Collection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    labels,
    userSubmissions,
    fetchUserSubmissions,
    badges,
    earnedBadges,
    fetchLabels,
    fetchBadges,
    fetchUserBadges,
  } = useStore();
  const [unlockedBadge, setUnlockedBadge] = useState<any | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const loadData = async () => {
        setLoading(true);
        try {
          await Promise.all([
            fetchLabels(),
            fetchUserSubmissions(user.id),
            fetchBadges(),
            fetchUserBadges(user.id),
          ]);
          
          // Fetch user stats
          const { data, error } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (error) {
            console.error('Error fetching user stats:', error);
            // Set default stats if not found
            setStats({ points: 0, uploads_count: 0, likes_received: 0 });
          } else {
            setStats(data || { points: 0, uploads_count: 0, likes_received: 0 });
          }
        } catch (error) {
          console.error('Error loading collection data:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadData();
    }
  }, [user?.id]); // Only depend on user.id to avoid infinite loops

  // Accepted submissions: not flagged or rejected
  const acceptedSubmissions = userSubmissions.filter(
    (s) => s.status !== 'flagged' && s.status !== 'rejected'
  );
  const acceptedCount = acceptedSubmissions.length;
  const pendingCount = userSubmissions.filter((s) => s.status === 'active').length;
  const progress = labels.length > 0 ? (acceptedCount / labels.length) * 100 : 0;

  const acceptedLabelIds = new Set(
    acceptedSubmissions.map((s) => s.label_id)
  );

  // Stats loaded from user_stats table

  // Check for newly unlocked badges
  const previousEarnedIdsRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    const currentIds = new Set(earnedBadges.map((b) => b.id));
    const currentIdsArray = Array.from(currentIds).sort();
    const previousIdsArray = Array.from(previousEarnedIdsRef.current).sort();
    
    // Only check if the arrays are different (avoid infinite loop)
    const idsChanged = currentIdsArray.length !== previousIdsArray.length || 
        currentIdsArray.some((id, idx) => id !== previousIdsArray[idx]);
    
    if (idsChanged) {
      const newBadgeIds = currentIdsArray.filter((id) => !previousEarnedIdsRef.current.has(id));
      
      if (newBadgeIds.length > 0) {
        // New badge(s) earned - show the first one
        const newBadge = earnedBadges.find((b) => b.id === newBadgeIds[0]);
        if (newBadge) {
          setUnlockedBadge(newBadge);
        }
      }
      previousEarnedIdsRef.current = currentIds;
    }
  }, [earnedBadges]);

  const getLabelName = (labelId: number) => {
    return labels.find((l) => l.id === labelId)?.name || 'Unknown';
  };

  // Missions simplified for now

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Your RareDex"
          subtitle="Track your collection and achievements"
        />
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading your collection...</p>
        </div>
      </div>
    );
  }

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
                    (s) => s.label_id === label.id
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
                                  src={supabase.storage.from('submissions').getPublicUrl(userSubmission.image_path).data.publicUrl}
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
                {badges.map((badge) => {
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
                          src={supabase.storage.from('submissions').getPublicUrl(submission.image_path).data.publicUrl}
                          alt="Submission"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 truncate">
                            {getLabelName(submission.label_id)}
                          </span>
                          <StatusBadge status={submission.status as any} />
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatTimeAgo(submission.created_at)}
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
              <p className="text-sm text-gray-500">Missions coming soon!</p>
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
