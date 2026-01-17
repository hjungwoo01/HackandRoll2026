import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { SubmissionCard } from '../components/SubmissionCard';
import { Card } from '../components/Card';
import { Toast } from '../components/Toast';
import { VoteValue } from '../api/types';
import confetti from 'canvas-confetti';

export function Verify() {
  const { pendingSubmissions, labels, castVote, fetchPendingQueue, isLoading } = useStore();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [votingSubmissionId, setVotingSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingQueue();
  }, [fetchPendingQueue]);

  const handleVote = async (submissionId: string, vote: VoteValue) => {
    setVotingSubmissionId(submissionId);
    try {
      const updatedSubmission = await castVote(submissionId, vote);
      
      // Trigger confetti if submission was verified
      if (updatedSubmission?.status === 'verified') {
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        }, 100);
        setToastMessage('Item verified! 🎉');
      } else {
        setToastMessage('Vote recorded!');
      }
      setShowToast(true);
    } catch (error) {
      setToastMessage('Failed to record vote');
      setShowToast(true);
    } finally {
      setVotingSubmissionId(null);
    }
  };

  if (isLoading && pendingSubmissions.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Verify Items</h1>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading submissions...</p>
        </div>
      </div>
    );
  }

  if (pendingSubmissions.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Verify Items</h1>
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">All caught up!</h2>
          <p className="text-gray-600">There are no pending submissions to verify right now.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Verify Items</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pendingSubmissions.map((submission) => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            labels={labels}
            onVote={handleVote}
            isLoading={votingSubmissionId === submission.id}
          />
        ))}
      </div>

      {showToast && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}
