import { Label } from '../api/types';
import { Submission } from '../api/types';

interface CollectionGridProps {
  labels: Label[];
  userSubmissions: Submission[];
}

export function CollectionGrid({ labels, userSubmissions }: CollectionGridProps) {
  const verifiedLabelIds = new Set(
    userSubmissions.filter((s) => s.status === 'verified').map((s) => s.verifiedLabelId || s.proposedLabelId)
  );

  const collectedCount = labels.filter((label) => verifiedLabelIds.has(label.id)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Your Collection</h3>
        <div className="text-sm text-gray-600">
          {collectedCount} / {labels.length} collected
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {labels.map((label) => {
          const isCollected = verifiedLabelIds.has(label.id);
          return (
            <div
              key={label.id}
              className={`
                aspect-square rounded-lg border-2 p-4 flex flex-col items-center justify-center
                transition-all
                ${
                  isCollected
                    ? 'bg-gradient-to-br from-primary-100 to-primary-200 border-primary-400 shadow-md'
                    : 'bg-gray-50 border-gray-200'
                }
              `}
            >
              {isCollected ? (
                <>
                  <div className="text-4xl mb-2">✓</div>
                  <div className="text-xs font-medium text-center text-primary-800">{label.name}</div>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-2 opacity-30">?</div>
                  <div className="text-xs font-medium text-center text-gray-400">{label.name}</div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
