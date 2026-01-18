import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { EntryDetailModal } from '../components/EntryDetailModal';
import { supabaseDex, type DexVersion, type DexEntry, type UserDexEntry } from '../lib/supabaseDex';
import { supabase } from '../lib/supabaseClient';
import { rarityToSet, getSetColor } from '../utils/sanitizeCopy';
import { BookOpen, Search, Lock, Grid, List, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

export function Collection() {
  const { user } = useAuth();
  const [versions, setVersions] = useState<DexVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('v0');
  const [entries, setEntries] = useState<DexEntry[]>([]);
  const [userEntries, setUserEntries] = useState<UserDexEntry[]>([]);
  const [unlockedVersions, setUnlockedVersions] = useState<Set<string>>(new Set(['v0']));
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSet, setSelectedSet] = useState<'common' | 'rare' | 'epic' | null>(null);
  const [showOwnedOnly, setShowOwnedOnly] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<DexEntry | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [v0Completion, setV0Completion] = useState(0);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  // Load data
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedVersion]);

  const loadData = async () => {
    setLoading(true);
    // Clear featured images when loading new data
    setFeaturedImageUrls(new Map());
    try {
      const [versionsData, entriesData, userEntriesData, unlocksData, completion] = await Promise.all([
        supabaseDex.getDexVersions(),
        supabaseDex.getDexEntries(selectedVersion),
        user ? supabaseDex.getUserDexEntries(user.id, selectedVersion) : Promise.resolve([]),
        user ? supabaseDex.getUserUnlocks(user.id) : Promise.resolve([]),
        user ? supabaseDex.getV0Completion(user.id) : Promise.resolve(0),
      ]);

      setVersions(versionsData);
      setEntries(entriesData);
      setUserEntries(userEntriesData);
      setV0Completion(completion);

      const unlocked = new Set(['v0', ...unlocksData.map((u) => u.dex_version_id)]);
      setUnlockedVersions(unlocked);

      // Check if V1 should be unlocked
      if (completion >= 30 && !unlocked.has('v1') && user) {
        await supabaseDex.unlockDexVersion(user.id, 'v1');
        setUnlockedVersions(new Set(['v0', 'v1']));
        setShowUnlockModal(true);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (error) {
      console.error('Error loading collection:', error);
      toast.error('Failed to load collection');
    } finally {
      setLoading(false);
    }
  };

  // Filter entries
  const filteredEntries = useMemo(() => {
    let filtered = entries;

    // Search
    if (searchQuery) {
      filtered = filtered.filter((e) =>
        e.fine_label.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category
    if (selectedCategory) {
      filtered = filtered.filter((e) => e.coarse_label_id === selectedCategory);
    }

    // Set filter
    if (selectedSet) {
      filtered = filtered.filter((e) => e.rarity === selectedSet);
    }

    // Owned only
    if (showOwnedOnly && user) {
      const ownedIds = new Set(userEntries.map((ue) => ue.dex_entry_id));
      filtered = filtered.filter((e) => ownedIds.has(e.id));
    }

    return filtered;
  }, [entries, searchQuery, selectedCategory, selectedSet, showOwnedOnly, userEntries]);

  // Get categories
  const categories = useMemo(() => {
    const categoryMap = new Map<number, string>();
    entries.forEach((e) => {
      if (e.coarse_label_id && e.coarse_label_name) {
        categoryMap.set(e.coarse_label_id, e.coarse_label_name);
      }
    });
    return Array.from(categoryMap.entries()).map(([id, name]) => ({ id, name }));
  }, [entries]);

  // Get completion stats
  const completionStats = useMemo(() => {
    const ownedIds = new Set(userEntries.map((ue) => ue.dex_entry_id));
    const owned = entries.filter((e) => ownedIds.has(e.id)).length;
    const total = entries.length;
    const percentage = total > 0 ? Math.round((owned / total) * 100) : 0;

    return { owned, total, percentage };
  }, [entries, userEntries]);

  // Get user entry for a dex entry
  const getUserEntry = (entryId: number): UserDexEntry | null => {
    return userEntries.find((ue) => ue.dex_entry_id === entryId) || null;
  };

  // Get featured image URL from submission
  const getFeaturedImageUrl = (entry: DexEntry): string | null => {
    const userEntry = getUserEntry(entry.id);
    if (!userEntry?.featured_submission_id) return null;
    
    // Construct public URL from submission path
    // The image_path in submissions is like: {userId}/{submissionId}.jpg
    // We need to get the full submission to access image_path
    // For now, we'll fetch it when needed, but store it in state
    return null; // Will be loaded via useEffect below
  };

  // State for featured image URLs
  const [featuredImageUrls, setFeaturedImageUrls] = useState<Map<number, string>>(new Map());

  // Load featured images for owned entries
  useEffect(() => {
    if (!user || userEntries.length === 0) {
      setFeaturedImageUrls(new Map());
      return;
    }

    const loadFeaturedImages = async () => {
      const imageMap = new Map<number, string>();
      
      // Get all featured submission IDs
      const featuredSubmissionIds = userEntries
        .filter(ue => ue.featured_submission_id)
        .map(ue => ue.featured_submission_id!);

      console.log('Loading featured images for', featuredSubmissionIds.length, 'submissions');
      console.log('User entries:', userEntries.map(ue => ({ 
        dex_entry_id: ue.dex_entry_id, 
        featured_submission_id: ue.featured_submission_id 
      })));

      if (featuredSubmissionIds.length === 0) {
        // Fallback: try to load images from user's submissions for these entries
        console.log('No featured submissions found, trying fallback...');
        const dexEntryIds = userEntries.map(ue => ue.dex_entry_id);
        
        const { data: fallbackSubmissions, error: fallbackError } = await supabase
          .from('submissions')
          .select('id, image_path, fine_dex_entry_id')
          .eq('uploader_id', user.id)
          .in('fine_dex_entry_id', dexEntryIds)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (!fallbackError && fallbackSubmissions) {
          // Group by dex_entry_id and take the most recent one
          const submissionsByEntry = new Map<number, typeof fallbackSubmissions[0]>();
          fallbackSubmissions.forEach(sub => {
            if (sub.fine_dex_entry_id && !submissionsByEntry.has(sub.fine_dex_entry_id)) {
              submissionsByEntry.set(sub.fine_dex_entry_id, sub);
            }
          });

          submissionsByEntry.forEach((submission, dexEntryId) => {
            if (submission.image_path) {
              const { data } = supabase.storage
                .from('submissions')
                .getPublicUrl(submission.image_path);
              imageMap.set(dexEntryId, data.publicUrl);
            }
          });
        }
        
        setFeaturedImageUrls(imageMap);
        return;
      }

      // Fetch submissions to get image_path
      const { data: submissions, error } = await supabase
        .from('submissions')
        .select('id, image_path, fine_dex_entry_id')
        .in('id', featuredSubmissionIds);

      if (error) {
        console.error('Error loading featured images:', error);
        setFeaturedImageUrls(new Map());
        return;
      }

      console.log('Loaded', submissions?.length || 0, 'submissions');

      // Map submission IDs to dex entry IDs and construct URLs
      submissions?.forEach(submission => {
        const userEntry = userEntries.find(ue => ue.featured_submission_id === submission.id);
        if (userEntry && submission.image_path) {
          const { data } = supabase.storage
            .from('submissions')
            .getPublicUrl(submission.image_path);
          console.log(`Setting image for entry ${userEntry.dex_entry_id}: ${data.publicUrl}`);
          imageMap.set(userEntry.dex_entry_id, data.publicUrl);
        } else {
          console.log('Missing userEntry or image_path for submission', submission.id, {
            userEntry: !!userEntry,
            image_path: !!submission.image_path
          });
        }
      });

      console.log('Final image map size:', imageMap.size);
      setFeaturedImageUrls(imageMap);
    };

    loadFeaturedImages();
  }, [user, userEntries, selectedVersion]);

  const isVersionLocked = (versionId: string) => {
    return !unlockedVersions.has(versionId);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader title="Your RareDex" subtitle="Track your collection and achievements" />
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading your collection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <PageHeader title="Your RareDex" subtitle="Track your collection and achievements" />
        
        {/* Version Selector */}
        <div className="mt-4">
          <Tabs value={selectedVersion} onValueChange={setSelectedVersion}>
            <TabsList>
              {versions.map((version) => {
                const locked = isVersionLocked(version.id);
                return (
                  <TabsTrigger
                    key={version.id}
                    value={version.id}
                    disabled={locked}
                    className="flex items-center gap-2"
                  >
                    {locked && <Lock className="h-4 w-4" />}
                    {version.name}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* Stats and Filters */}
        <div className="mt-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{completionStats.owned}</span> /{' '}
              {completionStats.total} • {completionStats.percentage}%
            </div>
            <Progress value={completionStats.percentage} className="w-32 h-2" />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <select
              value={selectedSet || ''}
              onChange={(e) =>
                setSelectedSet(
                  e.target.value ? (e.target.value as 'common' | 'rare' | 'epic') : null
                )
              }
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">All Sets</option>
              <option value="common">Set A</option>
              <option value="rare">Set B</option>
              <option value="epic">Set C</option>
            </select>
            <Button
              variant={showOwnedOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowOwnedOnly(!showOwnedOnly)}
            >
              Owned Only
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* V1 Unlock Progress */}
      {selectedVersion === 'v0' && v0Completion < 30 && (
        <Card className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="h-5 w-5 text-purple-600" />
                  <span className="font-semibold text-gray-900">New Pages open at 30% completion</span>
                </div>
                <p className="text-sm text-gray-600">
                  Complete {Math.ceil(((30 - v0Completion) / 100) * entries.length)} more entries to
                  unlock new pages
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-600">{Math.round(v0Completion)}%</div>
                <Progress value={v0Completion} max={30} className="w-32 h-2 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entries Grid */}
      {filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">No entries found. Try clearing filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
              : 'space-y-2'
          }
        >
          <AnimatePresence>
            {filteredEntries.map((entry, index) => {
              const userEntry = getUserEntry(entry.id);
              const isOwned = !!userEntry;

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card
                    className={`cursor-pointer hover:shadow-lg transition-all ${
                      isOwned ? getSetColor(entry.rarity) : 'border-gray-200 bg-gray-50'
                    }`}
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <CardContent className="p-4 aspect-square flex flex-col items-center justify-center relative overflow-hidden">
                      {isOwned ? (
                        <>
                          {featuredImageUrls.get(entry.id) ? (
                            <img
                              src={featuredImageUrls.get(entry.id)!}
                              alt={entry.fine_label}
                              className="w-full h-full object-cover rounded-lg"
                              onError={(e) => {
                                // Fallback to placeholder if image fails to load
                                e.currentTarget.style.display = 'none';
                                const placeholder = e.currentTarget.parentElement?.querySelector('.placeholder');
                                if (placeholder) (placeholder as HTMLElement).style.display = 'flex';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center placeholder">
                              <BookOpen className="h-12 w-12 text-primary-600" />
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 right-2 space-y-1 bg-black/60 backdrop-blur-sm rounded px-2 py-1">
                            <Badge variant="secondary" className="w-full justify-center text-xs truncate bg-white/90">
                              {entry.fine_label}
                            </Badge>
                            {userEntry?.acquired_at && (
                              <p className="text-xs text-white text-center">
                                Spotted {new Date(userEntry.acquired_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-4xl mb-2 opacity-30">???</div>
                          <Badge variant="outline" className="text-xs">
                            {rarityToSet(entry.rarity)}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-2">Not yet spotted</p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Entry Detail Modal */}
      {selectedEntry && user && (
        <EntryDetailModal
          entry={selectedEntry}
          userEntry={getUserEntry(selectedEntry.id)}
          userId={user.id}
          open={!!selectedEntry}
          onOpenChange={(open) => !open && setSelectedEntry(null)}
          onFeaturedChange={loadData}
        />
      )}

      {/* V1 Unlock Modal */}
      {showUnlockModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowUnlockModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center"
          >
            <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-2">New Pages Unlocked!</h2>
            <p className="text-gray-600 mb-6">
              You've completed 30% of V0. New items await!
            </p>
            <Button onClick={() => setShowUnlockModal(false)}>Explore V1</Button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
