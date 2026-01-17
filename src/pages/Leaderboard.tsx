import { useEffect } from 'react';
import { useStore } from '../state/store';
import { LeaderboardTable } from '../components/LeaderboardTable';
import { Card } from '../components/Card';

export function Leaderboard() {
  const { leaderboard, fetchLeaderboard, currentUserId, isLoading } = useStore();

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  if (isLoading && leaderboard.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Leaderboard</h1>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  const currentUserRank = leaderboard.findIndex((u) => u.userId === currentUserId) + 1;
  const currentUserStats = leaderboard.find((u) => u.userId === currentUserId);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Leaderboard</h1>

      {currentUserStats && (
        <Card className="p-6 mb-6 bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Your Rank</div>
              <div className="text-2xl font-bold text-primary-900">#{currentUserRank}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Your Points</div>
              <div className="text-2xl font-bold text-primary-900">{currentUserStats.points}</div>
            </div>
          </div>
        </Card>
      )}

      <LeaderboardTable leaderboard={leaderboard} currentUserId={currentUserId} />
    </div>
  );
}
