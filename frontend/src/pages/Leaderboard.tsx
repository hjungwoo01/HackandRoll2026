import { useEffect } from 'react';
import { useStore } from '../state/store';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { PercentileBadge } from '../components/PercentileBadge';
import { EmptyState } from '../components/EmptyState';
import { Trophy, Medal, HelpCircle } from 'lucide-react';
import { formatScore, formatPercentile } from '../utils/formatting';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';

export function Leaderboard() {
  const { user } = useAuth();
  const { leaderboard, fetchLeaderboard } = useStore();

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  if (leaderboard.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader title="Leaderboard" subtitle="See how you rank against other collectors" />
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  const currentUserRank = user ? leaderboard.findIndex((u) => u.user_id === user.id) + 1 : 0;
  const currentUserStats = user ? leaderboard.find((u) => u.user_id === user.id) : null;
  
  // Calculate percentile (simplified for demo)
  const totalUsers = leaderboard.length;
  const percentile = currentUserRank > 0 ? Math.round(((totalUsers - currentUserRank) / totalUsers) * 100) : 0;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Medal className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />;
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Leaderboard"
        subtitle="See how you rank against other collectors"
        rightAction={
          <Dialog>
            <DialogTrigger asChild>
              <button className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
                <HelpCircle className="h-4 w-4" />
                How it works
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>How Percentile Works</DialogTitle>
                <DialogDescription>
                  Your percentile rank shows how you compare to all users. A higher percentile means you're performing better than more users.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Top 1%: You're in the top 1% of all users</p>
                <p>• Top 10%: You're performing better than 90% of users</p>
                <p>• 50th percentile: You're performing better than 50% of users</p>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Hero Section - Current User */}
      {currentUserStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-br from-primary-600 to-primary-800 text-white border-0 shadow-xl">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-4 gap-6">
                <div className="md:col-span-2">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                      <Trophy className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-sm opacity-90 mb-1">Your Rank</div>
                      <div className="text-4xl font-bold">#{currentUserRank}</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold mb-2">
                    {formatPercentile(percentile)}
                  </div>
                  <p className="text-sm opacity-90">
                    You're performing better than {percentile}% of collectors
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="text-xs opacity-90 mb-1">Points</div>
                    <div className="text-2xl font-bold">{formatScore(currentUserStats.points)}</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="text-xs opacity-90 mb-1">Uploads</div>
                    <div className="text-2xl font-bold">{currentUserStats.uploads_count || 0}</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="text-xs opacity-90 mb-1">Likes Received</div>
                    <div className="text-2xl font-bold">{currentUserStats.likes_received || 0}</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="text-xs opacity-90 mb-1">Percentile</div>
                    <div className="text-2xl font-bold">{percentile}%</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Collectors</CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No rankings yet"
              description="Be the first to start collecting and appear on the leaderboard!"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Rank</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">User</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Points</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Accepted</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Accuracy</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Percentile</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => {
                    const isCurrentUser = entry.user_id === (user?.id || '');
                    const rank = index + 1;
                    const displayName = entry.profile?.display_name || `User ${entry.user_id.slice(-4)}`;

                    return (
                      <motion.tr
                        key={entry.user_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`
                          border-b border-gray-100 transition-colors
                          ${isCurrentUser ? 'bg-primary-50 font-medium' : 'hover:bg-gray-50'}
                        `}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {getRankIcon(rank)}
                            <span className="text-gray-900">#{rank}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-gray-900">
                            {isCurrentUser ? 'You' : displayName}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-bold text-gray-900">{formatScore(entry.points)}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-gray-600">{entry.uploads_count}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-gray-600">{entry.likes_received}</span>
                        </td>
                        <td className="py-4 px-4">
                          <PercentileBadge percentile={Math.round(((totalUsers - rank) / totalUsers) * 100)} />
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
