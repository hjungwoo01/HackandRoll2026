import { Card, CardContent, CardHeader } from './ui/card';

export function FeedSkeleton() {
  return (
    <Card className="mb-4 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </CardHeader>
      <div className="w-full aspect-square bg-gray-200 animate-pulse" />
      <CardContent className="pt-4">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
          </div>
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
