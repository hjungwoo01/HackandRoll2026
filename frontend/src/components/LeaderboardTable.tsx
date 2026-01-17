import { UserStats } from '../api/types';
import { formatScore } from '../utils/formatting';
import { PercentileBadge } from './PercentileBadge';
import { Card } from './Card';

interface LeaderboardTableProps {
  leaderboard: UserStats[];
  currentUserId: string;
}

export function LeaderboardTable({ leaderboard, currentUserId }: LeaderboardTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Points
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Verified Uploads
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Correct Votes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Percentile
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leaderboard.map((user, index) => {
              const isCurrentUser = user.userId === currentUserId;
              return (
                <tr
                  key={user.userId}
                  className={isCurrentUser ? 'bg-primary-50 font-medium' : ''}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    #{index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {isCurrentUser ? 'You' : `User ${user.userId.slice(-4)}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {formatScore(user.points)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.verifiedUploads}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.correctVotes} / {user.totalVotes}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <PercentileBadge percentile={user.percentile} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
