import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Clock, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatTimeAgo } from '../utils/formatting';
import { LikeButton } from './LikeButton';
import { SaveButton } from './SaveButton';
import { ReasonPill } from './ReasonPill';
import type { FeedItem } from '../api/types';

interface FeedCardProps {
  item: FeedItem;
  onLike: () => void;
  onSave: () => void;
  onClick: () => void;
}

export function FeedCard({ item, onLike, onSave, onClick }: FeedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
        <div className="relative aspect-video bg-gray-100">
          <img
            src={item.imageUrl}
            alt={item.labelName}
            className="w-full h-full object-cover"
          />
          {item.reason && (
            <div className="absolute top-2 right-2">
              <ReasonPill reason={item.reason} />
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <Badge variant="secondary" className="mb-2">
                {item.labelName}
              </Badge>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{item.uploaderName}</span>
                <span>•</span>
                <Clock className="h-4 w-4" />
                <span>{formatTimeAgo(item.createdAt)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <LikeButton
                  liked={item.likedByMe}
                  count={item.likes}
                  onClick={(e) => {
                    e.stopPropagation();
                    onLike();
                  }}
                />
                <SaveButton
                  saved={item.savedByMe}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSave();
                  }}
                />
              </div>
              {item.status === 'verified' && (
                <Badge variant="success" className="text-xs">
                  Verified
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
