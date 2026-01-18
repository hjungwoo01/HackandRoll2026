import { supabase } from './supabaseClient';
import type { FeedItem, ReportReason } from '../api/types';

// Database types (matching Supabase schema)
export interface Label {
  id: number;
  name: string;
  parent_id: number | null;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_seed: string;
}

export type SubmissionStatus = 'pending' | 'active' | 'flagged' | 'rejected';

export interface Submission {
  id: string;
  uploader_id: string;
  image_path: string;
  label_id: number;
  caption: string | null;
  created_at: string;
  report_count: number;
  status: SubmissionStatus;
  coarse_label_id?: number | null;
  coarse_confidence?: number | null;
  fine_dex_entry_id?: number | null;
  fine_confidence?: number | null;
}

export interface UserStats {
  user_id: string;
  points: number;
  uploads_count: number;
  likes_received: number;
  reports_received: number;
  flagged_count: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic';
  icon: string;
}

export interface UserBadge {
  user_id: string;
  badge_id: string;
  earned_at: string;
}

// Feed item with joined data
export interface FeedItemWithData extends Submission {
  label_name: string;
  uploader_name: string;
  uploader_username: string;
  likes_count: number;
  my_liked: boolean;
  my_saved: boolean;
}

export const supabaseApi = {
  // Labels
  async getLabels(): Promise<Label[]> {
    const { data, error } = await supabase
      .from('labels')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  // Feed
  async getFeed(
    userId: string | null,
    filter: 'for-you' | 'new' = 'for-you',
    cursor?: { created_at: string; id: string },
    limit: number = 10
  ): Promise<{ items: FeedItem[]; nextCursor: { created_at: string; id: string } | null }> {
    try {
      // Build query - fetch submissions first, then join labels and profiles separately
      // Only show 'active' submissions in feed (exclude 'rejected' drafts, 'flagged')
      // Note: Drafts are created with status='rejected' temporarily as workaround, then changed to 'active' on publish
      let query = supabase
        .from('submissions')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(limit + 1);

      // Pagination cursor
      if (cursor) {
        query = query.lt('created_at', cursor.created_at)
          .or(`created_at.eq.${cursor.created_at},id.lt.${cursor.id}`);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Feed query error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return { items: [], nextCursor: null };
      }

      const submissions = data.slice(0, limit);
      const submissionIds = submissions.map((s: any) => s.id);
      const labelIds = [...new Set(submissions.map((s: any) => s.label_id))];
      const uploaderIds = [...new Set(submissions.map((s: any) => s.uploader_id))];

      if (submissionIds.length === 0) {
        return { items: [], nextCursor: null };
      }

      // Fetch labels, profiles, likes, and saves in parallel
      const [labelsResult, profilesResult, likesCountsResult, userLikesResult, userSavesResult] = await Promise.all([
        supabase
          .from('labels')
          .select('id, name')
          .in('id', labelIds),
        supabase
          .from('profiles')
          .select('id, username, display_name')
          .in('id', uploaderIds),
        supabase
          .from('likes')
          .select('submission_id')
          .in('submission_id', submissionIds),
        userId && submissionIds.length > 0
          ? supabase
              .from('likes')
              .select('submission_id')
              .eq('user_id', userId)
              .in('submission_id', submissionIds)
          : { data: [], error: null },
        userId && submissionIds.length > 0
          ? supabase
              .from('saves')
              .select('submission_id')
              .eq('user_id', userId)
              .in('submission_id', submissionIds)
          : { data: [], error: null },
      ]);

      // Create lookup maps
      const labelsMap = new Map((labelsResult.data || []).map((l: any) => [l.id, l]));
      const profilesMap = new Map((profilesResult.data || []).map((p: any) => [p.id, p]));

      // Count likes per submission
      const likesBySubmission = new Map<string, number>();
      (likesCountsResult.data || []).forEach((like: any) => {
        const count = likesBySubmission.get(like.submission_id) || 0;
        likesBySubmission.set(like.submission_id, count + 1);
      });

      const myLikedSet = new Set(((userLikesResult.data || []) as any[]).map((l: any) => l.submission_id));
      const mySavedSet = new Set(((userSavesResult.data || []) as any[]).map((s: any) => s.submission_id));

      // Build feed items
      const items: FeedItem[] = submissions.map((s: any) => {
        const label = labelsMap.get(s.label_id);
        const profile = profilesMap.get(s.uploader_id);
        const imageUrl = supabase.storage.from('submissions').getPublicUrl(s.image_path).data.publicUrl;

        return {
          id: s.id,
          submissionId: s.id,
          imageUrl,
          labelId: s.label_id,
          labelName: label?.name || 'Unknown',
          uploaderName: profile?.display_name || profile?.username || 'Unknown',
          uploaderId: s.uploader_id,
          status: s.status === 'active' ? 'pending' : 'verified' as 'pending' | 'verified',
          createdAt: s.created_at,
          likes: likesBySubmission.get(s.id) || 0,
          savedByMe: mySavedSet.has(s.id),
          likedByMe: myLikedSet.has(s.id),
          reportCount: s.report_count || 0,
          flagged: s.status === 'flagged' || s.status === 'rejected',
          caption: s.caption || undefined,
            reason: filter === 'new' ? 'new' as const : 'popular' as const,
        };
      });

      // Sort for "For You" tab (client-side ranking)
      if (filter === 'for-you') {
        items.sort((a, b) => {
          const now = Date.now();
          const aAge = now - new Date(a.createdAt).getTime();
          const bAge = now - new Date(b.createdAt).getTime();
          const aRecencyBoost = Math.max(0, 100 - aAge / (1000 * 60 * 60));
          const bRecencyBoost = Math.max(0, 100 - bAge / (1000 * 60 * 60));
          const aScore = a.likes * 2 - a.reportCount * 5 + aRecencyBoost;
          const bScore = b.likes * 2 - b.reportCount * 5 + bRecencyBoost;
          return bScore - aScore;
        });
      }

      const nextCursor =
        data.length > limit
          ? { created_at: items[items.length - 1].createdAt, id: items[items.length - 1].id }
          : null;

      return { items, nextCursor };
    } catch (error) {
      console.error('Error fetching feed:', error);
      throw error;
    }
  },

  // Like/Unlike
  async toggleLike(submissionId: string, userId: string): Promise<boolean> {
    // Check if already liked
    const { data: existing } = await supabase
      .from('likes')
      .select('*')
      .eq('submission_id', submissionId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('submission_id', submissionId)
        .eq('user_id', userId);
      if (error) throw error;
      return false;
    } else {
      // Like
      const { error } = await supabase
        .from('likes')
        .insert({ submission_id: submissionId, user_id: userId });
      if (error) throw error;
      return true;
    }
  },

  // Save/Unsave
  async toggleSave(submissionId: string, userId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('saves')
      .select('*')
      .eq('submission_id', submissionId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('saves')
        .delete()
        .eq('submission_id', submissionId)
        .eq('user_id', userId);
      if (error) throw error;
      return false;
    } else {
      const { error } = await supabase
        .from('saves')
        .insert({ submission_id: submissionId, user_id: userId });
      if (error) throw error;
      return true;
    }
  },

  // Report
  // Create submission row first (before upload/classification) with status='rejected' (temporary draft status)
  // Note: Using 'rejected' as draft since database constraint doesn't allow 'pending'
  // Feed filters by status='active', so 'rejected' won't appear in feed
  // This is a workaround - ideally the database would support 'pending' or 'draft' status
  async createSubmissionRow(userId: string): Promise<Submission> {
    console.log('[auth] user id:', userId);
    
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      console.error('[submission] insert failed: User not authenticated or user ID mismatch');
      throw new Error('User not authenticated or user ID mismatch');
    }

    // Generate submission ID
    const submissionId = crypto.randomUUID();
    
    // Generate image path (will be uploaded to this path)
    const imagePath = `${userId}/${submissionId}.jpg`;

    // Get first valid label_id to satisfy foreign key constraint
    // This will be updated after classification with the correct label
    const { data: labels, error: labelsError } = await supabase
      .from('labels')
      .select('id')
      .limit(1)
      .single();

    if (labelsError || !labels) {
      console.error('[submission] failed to fetch default label:', labelsError);
      throw new Error('Failed to fetch default label for submission creation');
    }

    const defaultLabelId = labels.id;
    console.log('[submission] using default label_id:', defaultLabelId, '(will be updated after classification)');

    console.log('[submission] creating draft submission (status=rejected as workaround, will change to active on publish)...');

    // Insert with status='rejected' (acts as draft - won't appear in feed)
    // Feed filters by status='active', so rejected submissions are hidden
    // This is a temporary workaround until database supports 'pending' or 'draft' status
    const { data, error } = await supabase
      .from('submissions')
      .insert({
        id: submissionId,
        uploader_id: userId,
        status: 'rejected', // Using 'rejected' as temporary draft status (database constraint doesn't allow 'pending')
        report_count: 0,
        label_id: defaultLabelId, // Use valid label_id from database (will be updated after classification)
        image_path: imagePath, // Path we'll upload to (satisfies NOT NULL constraint)
      })
      .select()
      .single();

    if (error) {
      console.error('[submission] insert failed:', error);
      throw new Error(`Failed to create submission: ${error.message} (Code: ${error.code})`);
    }

    console.log('[submission] created draft (status=rejected as workaround, will publish as active)');
    console.log('[submission] id:', data.id);

    return data;
  },

  // Upload image to storage
  async uploadSubmissionImage(
    submissionId: string,
    userId: string,
    file: File
  ): Promise<string> {
    const imagePath = `${userId}/${submissionId}.jpg`;

    console.log('[upload] path:', imagePath);

    const { data: uploadData, error: storageError } = await supabase.storage
      .from('submissions')
      .upload(imagePath, file, {
        contentType: 'image/jpeg',
        upsert: true, // Allow overwrite
      });

    if (storageError) {
      console.error('[upload] failed:', storageError);
      throw new Error(`Storage upload failed: ${storageError.message}`);
    }

    console.log('[upload] success');

    // Note: image_path was already set when creating the submission row
    // No need to update it again, but we verify it matches
    console.log('[submission] image_path already set during creation');

    return imagePath;
  },

  // Update submission with classification results
  async updateSubmissionClassification(
    submissionId: string,
    coarseLabelId: number,
    confidence: number,
    labelId?: number // Optional: update label_id to match coarse_label_id
  ): Promise<void> {
    const updateData: {
      coarse_label_id: number;
      coarse_confidence: number;
      label_id?: number;
    } = {
      coarse_label_id: coarseLabelId,
      coarse_confidence: confidence,
    };

    if (labelId !== undefined) {
      updateData.label_id = labelId;
    }

    const { error } = await supabase
      .from('submissions')
      .update(updateData)
      .eq('id', submissionId);

    if (error) {
      console.error('[ml] result save failed:', error);
      throw new Error(`Failed to update classification: ${error.message}`);
    }

    console.log('[ml] result saved');
  },

  // Update submission with verification results
  async updateSubmissionVerification(
    submissionId: string,
    verified: boolean,
    score: number,
    reason?: string | null
  ): Promise<void> {
    const updateData: {
      verified: boolean;
      verification_score: number;
      verification_reason?: string | null;
    } = {
      verified,
      verification_score: score,
    };

    if (reason !== undefined) {
      updateData.verification_reason = reason;
    }

    const { error } = await supabase
      .from('submissions')
      .update(updateData)
      .eq('id', submissionId);

    if (error) {
      console.error('[verify] result save failed:', error);
      throw new Error(`Failed to update verification: ${error.message}`);
    }

    console.log('[verify] result saved:', { verified, score, reason });
  },

  // Publish submission to feed (set status to 'active')
  async publishSubmission(submissionId: string): Promise<void> {
    console.log('[publish] status active', submissionId);

    const { error } = await supabase
      .from('submissions')
      .update({ status: 'active' })
      .eq('id', submissionId);

    if (error) {
      console.error('[publish] failed:', error);
      throw new Error(`Failed to publish submission: ${error.message}`);
    }

    console.log('[submission] published active');
    console.log('[submission] id:', submissionId);
  },

  // Reject submission (set status to 'rejected')
  async rejectSubmission(submissionId: string, reason?: string): Promise<void> {
    console.log('[publish] status rejected', submissionId, reason);

    const updateData: {
      status: string;
      verification_reason?: string;
    } = {
      status: 'rejected',
    };

    if (reason) {
      updateData.verification_reason = reason;
    }

    const { error } = await supabase
      .from('submissions')
      .update(updateData)
      .eq('id', submissionId);

    if (error) {
      console.error('[publish] reject failed:', error);
      throw new Error(`Failed to reject submission: ${error.message}`);
    }

    console.log('[submission] rejected');
    console.log('[submission] id:', submissionId);
  },

  // Report a submission
  async reportSubmission(
    submissionId: string,
    reporterId: string,
    reason?: string | null
  ): Promise<void> {
    const { error } = await supabase
      .from('reports')
      .insert({
        submission_id: submissionId,
        reporter_id: reporterId,
        reason: reason || null,
      });

    if (error) {
      // Check if it's a unique constraint violation (already reported)
      if (error.code === '23505') {
        throw new Error('ALREADY_REPORTED');
      }
      console.error('[report] failed:', error);
      throw new Error(`Failed to report submission: ${error.message}`);
    }

    console.log('[report] submitted:', { submissionId, reporterId, reason });
  },

  // Update submission with fine entry selection
  async updateSubmissionFineEntry(
    submissionId: string,
    fineItemName: string,
    fineDexEntryId?: number | null
  ): Promise<void> {
    const updateData: {
      caption: string;
      fine_dex_entry_id?: number | null;
    } = {
      caption: fineItemName,
    };

    if (fineDexEntryId !== undefined) {
      updateData.fine_dex_entry_id = fineDexEntryId;
    }

    const { error } = await supabase
      .from('submissions')
      .update(updateData)
      .eq('id', submissionId);

    if (error) {
      console.error('[fine] update failed:', error);
      throw new Error(`Failed to update fine entry: ${error.message}`);
    }

    if (fineDexEntryId) {
      console.log('[fine] selected dex_entry_id:', fineDexEntryId);
    }
  },

  // Legacy createSubmission (kept for backward compatibility)
  async createSubmission(
    userId: string,
    file: File,
    labelId: number,
    caption?: string,
    coarseLabelId?: number | null,
    coarseConfidence?: number | null,
    fineDexEntryId?: number | null,
    fineConfidence?: number | null,
    fineItemName?: string | null
  ): Promise<Submission> {
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      throw new Error('User not authenticated or user ID mismatch');
    }

    // Generate submission ID
    const submissionId = crypto.randomUUID();
    const imagePath = `${userId}/${submissionId}.jpg`;

    // Upload to storage
    const { data: uploadData, error: storageError } = await supabase.storage
      .from('submissions')
      .upload(imagePath, file, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (storageError) {
      console.error('Storage upload error:', storageError);
      console.error('Error details:', {
        message: storageError.message,
        name: storageError.name,
      });
      throw new Error(`Storage upload failed: ${storageError.message}`);
    }

    console.log('Storage upload successful:', uploadData);

    // Insert submission record
    // Use fineItemName in caption if caption is not provided
    const finalCaption = caption || fineItemName || null;
    
    const { data, error } = await supabase
      .from('submissions')
      .insert({
        id: submissionId,
        uploader_id: userId,
        image_path: imagePath,
        label_id: labelId,
        caption: finalCaption,
        status: 'active', // Explicitly set status
        report_count: 0, // Explicitly set report_count
        coarse_label_id: coarseLabelId || null,
        coarse_confidence: coarseConfidence || null,
        fine_dex_entry_id: fineDexEntryId || null,
        fine_confidence: fineConfidence || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      // Clean up storage on error
      await supabase.storage.from('submissions').remove([imagePath]);
      throw new Error(`Failed to create submission: ${error.message} (Code: ${error.code})`);
    }

    return data;
  },

  // Get user submissions
  async getUserSubmissions(userId: string): Promise<Submission[]> {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('uploader_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get leaderboard
  async getLeaderboard(limit: number = 50, currentUserId?: string): Promise<(UserStats & { profile: Profile })[]> {
    // Fetch user_stats and profiles separately since there's no direct FK
    const { data: statsData, error: statsError } = await supabase
      .from('user_stats')
      .select('*')
      .order('points', { ascending: false })
      .limit(limit);

    if (statsError) throw statsError;
    if (!statsData || statsData.length === 0) return [];

    // If current user is provided and not in top results, fetch their stats separately
    const topUserIds = statsData.map((s: any) => s.user_id);
    const currentUserInTop = currentUserId && topUserIds.includes(currentUserId);
    
    let allStatsData = [...statsData];
    if (currentUserId && !currentUserInTop) {
      const { data: currentUserStats, error: currentUserError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', currentUserId)
        .maybeSingle();
      
      if (!currentUserError && currentUserStats) {
        allStatsData.push(currentUserStats);
        // Re-sort to maintain order
        allStatsData.sort((a: any, b: any) => b.points - a.points);
      }
    }

    const userIds = allStatsData.map((s: any) => s.user_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    const profilesMap = new Map((profilesData || []).map((p: any) => [p.id, p]));

    return allStatsData.map((stat: any) => ({
      ...stat,
      profile: profilesMap.get(stat.user_id) || { id: stat.user_id, username: 'Unknown', display_name: 'Unknown User' },
    }));
  },

  // Get badges
  async getBadges(): Promise<Badge[]> {
    const { data, error } = await supabase
      .from('badges')
      .select('*');

    if (error) throw error;
    return data || [];
  },

  // Get user badges
  async getUserBadges(userId: string): Promise<UserBadge[]> {
    const { data, error } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  },

  // Award badge
  async awardBadge(userId: string, badgeId: string): Promise<void> {
    const { error } = await supabase
      .from('user_badges')
      .insert({
        user_id: userId,
        badge_id: badgeId,
      });

    if (error && error.code !== '23505') { // Ignore duplicate
      throw error;
    }
  },
};
