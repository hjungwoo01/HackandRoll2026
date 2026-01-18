import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { supabase } from '../lib/supabaseClient';
import { supabaseDex, type DexEntry, type UserDexEntry } from '../lib/supabaseDex';
import { supabaseApi, type Submission } from '../lib/supabaseApi';
import { rarityToSet, getSetColor, sanitizeCopy } from '../utils/sanitizeCopy';
import { Star, Image as ImageIcon, Calendar } from 'lucide-react';
import { formatTimeAgo } from '../utils/formatting';
import { motion } from 'framer-motion';

interface EntryDetailModalProps {
  entry: DexEntry;
  userEntry: UserDexEntry | null;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFeaturedChange?: () => void;
}

export function EntryDetailModal({
  entry,
  userEntry,
  userId,
  open,
  onOpenChange,
  onFeaturedChange,
}: EntryDetailModalProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && entry) {
      loadSubmissions();
    }
  }, [open, entry, userId]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('uploader_id', userId)
        .eq('fine_dex_entry_id', entry.id)
        .in('status', ['active', 'flagged'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error loading submissions:', error);
      // If fine_dex_entry_id doesn't exist yet, try loading by label_id
      try {
        const { data, error: fallbackError } = await supabase
          .from('submissions')
          .select('*')
          .eq('uploader_id', userId)
          .eq('label_id', entry.coarse_label_id)
          .in('status', ['active', 'flagged'])
          .order('created_at', { ascending: false });
        
        if (!fallbackError) {
          setSubmissions(data || []);
        }
      } catch (fallbackErr) {
        console.error('Fallback load error:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetFeatured = async (submissionId: string) => {
    try {
      await supabaseDex.upsertUserDexEntry(userId, entry.id, submissionId);
      if (onFeaturedChange) onFeaturedChange();
      // Refresh submissions
      await loadSubmissions();
    } catch (error) {
      console.error('Error setting featured:', error);
    }
  };


  const isOwned = !!userEntry;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{entry.fine_label}</DialogTitle>
              <DialogDescription className="mt-2">
                {entry.coarse_label_name || 'Unknown Category'}
              </DialogDescription>
            </div>
            <Badge className={getSetColor(entry.rarity)}>
              {rarityToSet(entry.rarity)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Entry Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Entry Details</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Category:</span>{' '}
                  <span className="font-medium">{entry.coarse_label_name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Set:</span>{' '}
                  <span className="font-medium">{rarityToSet(entry.rarity)}</span>
                </div>
                {isOwned && userEntry?.acquired_at && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    Spotted {formatTimeAgo(userEntry.acquired_at)}
                  </div>
                )}
              </div>
            </div>
            {entry.hint && (
              <div>
                <h3 className="font-semibold mb-2">Hint</h3>
                <p className="text-sm text-gray-600 italic">{sanitizeCopy(entry.hint)}</p>
              </div>
            )}
          </div>

          {/* User's Submissions */}
          {isOwned ? (
            <div>
              <h3 className="font-semibold mb-4">Your Submissions</h3>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No submissions yet for this entry.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {submissions.map((submission) => {
                    const imageUrl = supabase.storage
                      .from('submissions')
                      .getPublicUrl(submission.image_path).data.publicUrl;
                    const isFeatured = userEntry?.featured_submission_id === submission.id;

                    return (
                      <motion.div
                        key={submission.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative group"
                      >
                        <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                          <img
                            src={imageUrl}
                            alt="Submission"
                            className="w-full h-full object-cover"
                          />
                          {isFeatured && (
                            <div className="absolute top-2 right-2">
                              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            {!isFeatured && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="opacity-0 group-hover:opacity-100"
                                onClick={() => handleSetFeatured(submission.id)}
                              >
                                <Star className="h-4 w-4 mr-1" />
                                Set Featured
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-center">
                          {formatTimeAgo(submission.created_at)}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
              <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">You haven't acquired this entry yet.</p>
              <p className="text-sm text-gray-500 mt-2">
                Upload a submission matching this entry to add it to your collection!
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
