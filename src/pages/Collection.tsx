import { useEffect } from 'react';
import { useStore } from '../state/store';
import { CollectionGrid } from '../components/CollectionGrid';
import { Card } from '../components/Card';
import { ProgressBadge } from '../components/ProgressBadge';
import { formatTimeAgo } from '../utils/formatting';
import { SubmissionStatus } from '../api/types';

export function Collection() {
  const { labels, userSubmissions, fetchUserSubmissions } = useStore();

  useEffect(() => {
    fetchUserSubmissions();
  }, [fetchUserSubmissions]);

  const verifiedCount = userSubmissions.filter((s) => s.status === 'verified').length;
  const pendingCount = userSubmissions.filter((s) => s.status === 'pending').length;
  const rejectedCount = userSubmissions.filter((s) => s.status === 'rejected').length;

  const getStatusBadge = (status: SubmissionStatus) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getLabelName = (labelId: number) => {
    return labels.find((l) => l.id === labelId)?.name || 'Unknown';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Collection</h1>
        <ProgressBadge current={verifiedCount} total={labels.length} />
      </div>

      <div className="space-y-8">
        <CollectionGrid labels={labels} userSubmissions={userSubmissions} />

        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Recent Submissions</h2>
          {userSubmissions.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-4xl mb-4">📦</div>
              <p className="text-gray-600">No submissions yet. Start uploading items!</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {userSubmissions.map((submission) => (
                <Card key={submission.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={submission.imageUrl}
                        alt="Submission"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {getLabelName(submission.proposedLabelId)}
                        </span>
                        {getStatusBadge(submission.status)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatTimeAgo(submission.createdAt)}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
