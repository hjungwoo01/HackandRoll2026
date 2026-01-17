import { supabase } from './supabaseClient';

// ============================================
// TYPES
// ============================================
export interface DexVersion {
  id: string;
  name: string;
  description: string;
  unlock_rule: string;
  sort_order: number;
}

export interface DexEntry {
  id: number;
  dex_version_id: string;
  coarse_label_id: number;
  fine_label: string;
  rarity: 'common' | 'rare' | 'epic';
  hint: string | null;
  sort_order: number;
  silhouette_svg: string | null;
  coarse_label_name?: string; // Joined from labels
}

export interface UserDexEntry {
  user_id: string;
  dex_entry_id: number;
  acquired_at: string;
  featured_submission_id: string | null;
  entry?: DexEntry; // Joined from dex_entries
}

export interface UserUnlock {
  user_id: string;
  dex_version_id: string;
  unlocked_at: string;
}

// ============================================
// API FUNCTIONS
// ============================================
export const supabaseDex = {
  // Get all dex versions
  async getDexVersions(): Promise<DexVersion[]> {
    const { data, error } = await supabase
      .from('dex_versions')
      .select('*')
      .order('sort_order');

    if (error) throw error;
    return data || [];
  },

  // Get dex entries for a version with optional filters
  async getDexEntries(
    versionId: string,
    filters?: {
      coarseLabelId?: number;
      rarity?: 'common' | 'rare' | 'epic'; // Internal: maps to Set A/B/C in UI
      ownedOnly?: boolean;
      userId?: string;
    }
  ): Promise<DexEntry[]> {
    let query = supabase
      .from('dex_entries')
      .select(`
        *,
        labels!coarse_label_id(id, name)
      `)
      .eq('dex_version_id', versionId)
      .order('sort_order');

    if (filters?.coarseLabelId) {
      query = query.eq('coarse_label_id', filters.coarseLabelId);
    }

    if (filters?.rarity) {
      query = query.eq('rarity', filters.rarity);
    }

    const { data, error } = await query;
    if (error) throw error;

    let entries: DexEntry[] = (data || []).map((item: any) => ({
      ...item,
      coarse_label_name: Array.isArray(item.labels) ? item.labels[0]?.name : item.labels?.name,
    }));

    // Filter by owned if requested
    if (filters?.ownedOnly && filters?.userId) {
      const ownedEntries = await this.getUserDexEntries(filters.userId, versionId);
      const ownedIds = new Set(ownedEntries.map((e) => e.dex_entry_id));
      entries = entries.filter((e) => ownedIds.has(e.id));
    }

    return entries;
  },

  // Get user's acquired dex entries for a version
  async getUserDexEntries(userId: string, versionId: string): Promise<UserDexEntry[]> {
    const { data, error } = await supabase
      .from('user_dex_entries')
      .select(`
        *,
        dex_entries!inner(*, labels!coarse_label_id(name))
      `)
      .eq('user_id', userId)
      .eq('dex_entries.dex_version_id', versionId);

    if (error) throw error;

    return (data || []).map((item: any) => ({
      ...item,
      entry: Array.isArray(item.dex_entries) ? item.dex_entries[0] : item.dex_entries,
    }));
  },

  // Upsert user dex entry (acquire or update featured)
  async upsertUserDexEntry(
    userId: string,
    dexEntryId: number,
    featuredSubmissionId?: string | null
  ): Promise<void> {
    const { error } = await supabase
      .from('user_dex_entries')
      .upsert({
        user_id: userId,
        dex_entry_id: dexEntryId,
        featured_submission_id: featuredSubmissionId || null,
      }, {
        onConflict: 'user_id,dex_entry_id',
      });

    if (error) throw error;
  },

  // Get user unlocks
  async getUserUnlocks(userId: string): Promise<UserUnlock[]> {
    const { data, error } = await supabase
      .from('user_unlocks')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  },

  // Unlock a dex version for user
  async unlockDexVersion(userId: string, versionId: string): Promise<void> {
    const { error } = await supabase
      .from('user_unlocks')
      .insert({
        user_id: userId,
        dex_version_id: versionId,
      });

    if (error && error.code !== '23505') { // Ignore duplicate
      throw error;
    }
  },

  // Get coarse categories (labels that are used as coarse categories)
  async getCoarseCategories(): Promise<Array<{ id: number; name: string }>> {
    const { data, error } = await supabase
      .from('labels')
      .select('id, name')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  // Calculate V0 completion percentage for user
  async getV0Completion(userId: string): Promise<number> {
    const [v0Entries, userV0Entries] = await Promise.all([
      this.getDexEntries('v0'),
      this.getUserDexEntries(userId, 'v0'),
    ]);

    if (v0Entries.length === 0) return 0;
    return (userV0Entries.length / v0Entries.length) * 100;
  },

  // Check if user has unlocked a version
  async isVersionUnlocked(userId: string, versionId: string): Promise<boolean> {
    // V0 is always unlocked
    if (versionId === 'v0') return true;

    const { data, error } = await supabase
      .from('user_unlocks')
      .select('*')
      .eq('user_id', userId)
      .eq('dex_version_id', versionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },
};
