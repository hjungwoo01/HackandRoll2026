import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Loader2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

interface AutoClassifyCardProps {
  status: 'idle' | 'running' | 'success' | 'failed';
  predictedCategory?: {
    id: number;
    name: string;
  } | null;
  confidence?: number | null;
  suggestedEntries?: Array<{
    dex_entry_id: number;
    fine_label: string;
    rarity?: 'common' | 'rare' | 'epic';
  }>;
  onClassify: () => void;
  onOverride?: () => void;
  disabled?: boolean;
}

export function AutoClassifyCard({
  status,
  predictedCategory,
  confidence,
  suggestedEntries = [],
  onClassify,
  onOverride,
  disabled,
}: AutoClassifyCardProps) {
  const confidencePercent = confidence ? Math.round(confidence * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary-600" />
          Auto-Classify
        </CardTitle>
        <CardDescription>
          AI analyzes your photo to suggest the category automatically
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'idle' && (
          <div className="text-center py-6">
            <Button onClick={onClassify} disabled={disabled} size="lg" className="w-full">
              <Sparkles className="h-4 w-4 mr-2" />
              Start Classification
            </Button>
          </div>
        )}

        {status === 'running' && (
          <div className="text-center py-6 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto" />
            <div className="text-sm text-gray-600">Analyzing image...</div>
            <div className="text-xs text-gray-500">This may take a few seconds</div>
          </div>
        )}

        {status === 'failed' && (
          <div className="text-center py-6 space-y-3">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="text-sm text-red-600">Classification failed</div>
            <Button onClick={onClassify} variant="outline" size="sm" disabled={disabled}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}

        {status === 'success' && predictedCategory && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Predicted Category</span>
                <Badge variant="success" className="text-xs">
                  {confidencePercent}% confidence
                </Badge>
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {predictedCategory.name}
              </div>
            </div>

            {suggestedEntries.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Suggested Items</div>
                <div className="flex flex-wrap gap-2">
                  {suggestedEntries.slice(0, 5).map((entry, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="text-xs"
                    >
                      {entry.fine_label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={onClassify}
                variant="outline"
                size="sm"
                disabled={disabled}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-run
              </Button>
              {onOverride && (
                <Button
                  onClick={onOverride}
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  className="flex-1"
                >
                  Change Category
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
