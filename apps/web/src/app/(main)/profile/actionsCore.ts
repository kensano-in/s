'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseBio, serializeBio } from '@/lib/profile-metadata';
import { BadgeType } from '@/components/ui/IdentityBadge';

export interface ProfileSyncPayload {
  displayName?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  theme?: string;
  phone?: string;
  pronouns?: string;
  customLink?: string;
  pinnedTrackId?: string | null;
  pinnedTrackName?: string | null;
  pinnedTrackArtist?: string | null;
  pinnedTrackArtwork?: string | null;
  pinnedTrackSource?: string | null;
  quote?: string | null;
  presenceStatus?: string | null;
  presenceDuration?: number | null;
  invisibleMode?: boolean;
  expertiseTags?: string[];
  isPrivate?: boolean;
}

/**
 * Check how many times a user has changed their username this month,
 * and whether the 14-day cooldown has passed.
 *
 * Tracks via two fields on the `users` table:
 *   - username_changed_at      (timestamp of last change)
 *   - username_changes_count   (# of changes in current calendar month)
 *   - username_change_month    (YYYY-MM string of last counted month)
 *
 * If those columns don't exist yet, falls back gracefully (allows change).
 */
export async function checkUsernameChangeEligibility(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  changesThisMonth: number;
  lastChangedAt: string | null;
  daysUntilNext: number | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { allowed: false, reason: 'Unauthorized', changesThisMonth: 0, lastChangedAt: null, daysUntilNext: null };
    }
    const actualUserId = user.id;

    const { data } = await supabase
      .from('users')
      .select('username_changed_at, username_changes_count, username_change_month')
      .eq('id', actualUserId)
      .maybeSingle();

    if (!data) {
      return { allowed: true, changesThisMonth: 0, lastChangedAt: null, daysUntilNext: null };
    }

    const now = new Date();
    const lastChangedAt = data.username_changed_at || null;
    const totalChanges = data.username_changes_count || 0;

    // ── 14-day cooldown from last change ──
    if (lastChangedAt) {
      const lastDate = new Date(lastChangedAt);
      const daysSinceLast = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLast < 14) {
        const daysUntilNext = Math.ceil(14 - daysSinceLast);
        return {
          allowed: false,
          reason: `Username can only be changed every 14 days. ${daysUntilNext} day${daysUntilNext === 1 ? '' : 's'} remaining.`,
          changesThisMonth: totalChanges,
          lastChangedAt,
          daysUntilNext,
        };
      }
    }

    return {
      allowed: true,
      changesThisMonth: totalChanges,
      lastChangedAt,
      daysUntilNext: null,
    };
  } catch {
    return { allowed: true, changesThisMonth: 0, lastChangedAt: null, daysUntilNext: null };
  }
}

/**
 * Lightweight username check — DB lookup + governance rules only.
 * NO AI call. Used for live typing feedback to keep it instant.
 */
export async function quickCheckUsername(username: string): Promise<{
  valid: boolean;
  available?: boolean;
  reason?: string;
}> {
  const clean = username.toLowerCase().trim();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let isDeveloper = false;
  if (user) {
    const { data: dbUser } = await supabase
      .from('users')
      .select('role, username')
      .eq('id', user.id)
      .maybeSingle();
    if (dbUser?.role === 'PRIME' || dbUser?.username?.toLowerCase() === 's' || clean === 's') {
      isDeveloper = true;
    }
  }

  // Governance rules (no AI, instant)
  const { validateUsernameGovernance } = await import('@/lib/security/governance');
  const governance = validateUsernameGovernance(clean);
  if (!governance.valid) {
    return { valid: false, reason: governance.reason };
  }

  // DB availability — skip if it's the user's own username
  if (user) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', clean)
      .maybeSingle();
    if (existing && existing.id !== user.id) {
      return { valid: true, available: false, reason: 'This username is already taken.' };
    }
    if (existing && existing.id === user.id) {
      return { valid: true, available: true, reason: 'Your current handle' };
    }
  }

  return { valid: true, available: true };
}

/**
 * Validate a username against the full governance pipeline (same as signup).
 * Includes AI check. Used only at save time, not during typing.
 */
export async function validateUsernameForProfile(username: string): Promise<{
  valid: boolean;
  available?: boolean;
  reason?: string;
  layer?: string;
}> {
  const supabase = await createClient();
  const clean = username.toLowerCase().trim();

  // Full governance check (all layers including extreme blocklist)
  const { validateUsernameGovernance, normalizeUsername } = await import('@/lib/security/governance');
  const governance = validateUsernameGovernance(clean);
  if (!governance.valid) {
    return { valid: false, reason: governance.reason, layer: governance.layer };
  }

  // AI adversarial check (only runs on actual save)
  const { aiAdversarialAnalysis } = await import('@/lib/security/ai-analysis');
  const normalized = normalizeUsername(clean);
  const aiResult = await aiAdversarialAnalysis(clean, normalized);
  if (aiResult.verdict === 'block') {
    return { valid: false, reason: `Identity rejected by security analysis: ${aiResult.reason}`, layer: 'L7_AI' };
  }

  // DB availability check
  const supabaseAdmin = createAdminClient();
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('username')
    .eq('username', clean)
    .maybeSingle();

  if (existing) {
    return { valid: true, available: false, reason: 'This username is already taken.' };
  }

  return { valid: true, available: true };
}

/**
 * Check display name change eligibility: 1 change per 7 days.
 */
export async function checkDisplayNameEligibility(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  daysUntilNext: number | null;
}> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('users')
      .select('display_name_changed_at')
      .eq('id', userId)
      .maybeSingle();

    if (!data?.display_name_changed_at) {
      return { allowed: true, daysUntilNext: null };
    }

    const lastChanged = new Date(data.display_name_changed_at);
    const daysSince = (Date.now() - lastChanged.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince < 7) {
      const daysUntilNext = Math.ceil(7 - daysSince);
      return {
        allowed: false,
        reason: `Display name can only be changed once a week. Wait ${daysUntilNext} more day${daysUntilNext === 1 ? '' : 's'}.`,
        daysUntilNext,
      };
    }

    return { allowed: true, daysUntilNext: null };
  } catch {
    return { allowed: true, daysUntilNext: null };
  }
}

import { checkIdentityContent } from '@/lib/security/identity-moderation';

export async function submitProfileUpdateDB(userId: string, updates: ProfileSyncPayload) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }
    const actualUserId = user.id;

    const dbPayload: Record<string, unknown> = {};
    if (updates.displayName !== undefined) dbPayload.display_name = updates.displayName;
    if (updates.phone !== undefined) dbPayload.phone = updates.phone;
    if (updates.pronouns !== undefined) dbPayload.pronouns = updates.pronouns;
    if (updates.customLink !== undefined) dbPayload.custom_link = updates.customLink;
    if (updates.pinnedTrackId !== undefined) dbPayload.pinned_track_id = updates.pinnedTrackId;
    if (updates.pinnedTrackName !== undefined) dbPayload.pinned_track_name = updates.pinnedTrackName;
    if (updates.pinnedTrackArtist !== undefined) dbPayload.pinned_track_artist = updates.pinnedTrackArtist;
    if (updates.pinnedTrackArtwork !== undefined) dbPayload.pinned_track_artwork = updates.pinnedTrackArtwork;
    if (updates.pinnedTrackSource !== undefined) dbPayload.pinned_track_source = updates.pinnedTrackSource;
    if (updates.bannerUrl !== undefined) dbPayload.banner_url = updates.bannerUrl;

    // Quote validations
    if (updates.quote !== undefined) {
      if (updates.quote && updates.quote.length > 120) {
        return { success: false, error: 'Quote cannot exceed 120 characters.' };
      }
      dbPayload.quote = updates.quote;
      dbPayload.quote_expires_at = updates.quote ? new Date(Date.now() + 24 * 3600 * 1000).toISOString() : null;
    }

    // Presence validations
    if (updates.presenceStatus !== undefined) {
      if (updates.presenceStatus && updates.presenceDuration && ![2, 4, 8, 24].includes(updates.presenceDuration)) {
        return { success: false, error: 'Invalid presence duration.' };
      }
      dbPayload.presence_status = updates.presenceStatus;
      if (updates.presenceStatus && updates.presenceDuration) {
        dbPayload.presence_expires_at = new Date(Date.now() + updates.presenceDuration * 3600 * 1000).toISOString();
      } else {
        dbPayload.presence_expires_at = null;
      }
    }

    // Invisible mode & expertise tags & profile privacy
    if (updates.invisibleMode !== undefined) dbPayload.invisible_mode = updates.invisibleMode;
    if (updates.expertiseTags !== undefined) dbPayload.expertise_tags = updates.expertiseTags;

    if (updates.isPrivate !== undefined) {
      dbPayload.is_private = updates.isPrivate;

      // Case: Private → Public — auto-approve all pending follow requests
      if (updates.isPrivate === false) {
        try {
          const supabaseAdminForApprove = createAdminClient();

          // Fetch all pending requests targeting this user
          const { data: pendingRequests } = await supabaseAdminForApprove
            .from('follow_requests')
            .select('requester_id')
            .eq('target_id', actualUserId)
            .eq('status', 'pending');

          if (pendingRequests && pendingRequests.length > 0) {
            const requesterIds = pendingRequests.map((r: any) => r.requester_id);

            // Mark all as accepted in follow_requests (batch)
            await supabaseAdminForApprove
              .from('follow_requests')
              .update({ status: 'accepted' })
              .eq('target_id', actualUserId)
              .eq('status', 'pending');

            // Use toggle_follow RPC per requester — each call is atomic:
            // INSERT INTO followers ON CONFLICT DO NOTHING + increment both counts in one TX.
            // Run concurrently (not serially) for performance.
            await Promise.allSettled(
              requesterIds.map((rid: string) =>
                supabaseAdminForApprove.rpc('toggle_follow', {
                  p_follower: rid,
                  p_following: actualUserId,
                  p_is_following: true,
                })
              )
            );

            // Update status='accepted' on the newly inserted followers rows (batch)
            await supabaseAdminForApprove
              .from('followers')
              .update({ status: 'accepted' })
              .eq('following_id', actualUserId)
              .in('follower_id', requesterIds);

            // Send accepted notifications (batch, non-fatal)
            try {
              const notifications = requesterIds.map((rid: string) => ({
                user_id: rid,
                actor_id: actualUserId,
                type: 'follow_accepted',
                title: 'Follow Request Accepted',
                body: 'accepted your follow request.',
                is_read: false,
              }));
              await supabaseAdminForApprove
                .from('notifications')
                .insert(notifications);
            } catch {
              // Non-fatal
            }
          }
        } catch (approveErr: any) {
          console.warn('[isPrivate→public] Auto-approve failed (non-fatal):', approveErr.message);
        }
      }
      // Case: Public → Private — existing accepted followers keep their access (no action needed)
    }

    // ── Apply Real-Time Moderation Engine ──
    const fieldsToModerate = [
      updates.displayName,
      updates.pronouns,
      updates.customLink,
      updates.bio,
      updates.quote,
      updates.presenceStatus
    ];
    
    for (const field of fieldsToModerate) {
      if (typeof field === 'string') {
        const mod = checkIdentityContent(field);
        if (mod.blocked) {
          return { success: false, error: `Identity Guidelines Violation: The term "${mod.flaggedWord}" is not permitted in professional identity fields.` };
        }
      }
    }

    let isUsernameChange = false;

    if (updates.username !== undefined) {
      let sanitized = updates.username.toLowerCase().trim();

      // ── DB Uniqueness & Unchanged Check ──
      const { data: currentUser } = await supabase
        .from('users')
        .select('username, role')
        .eq('id', actualUserId)
        .maybeSingle();

      const isUnchanged = currentUser?.username?.toLowerCase() === sanitized;
      const isDevUser = currentUser?.role === 'PRIME' || currentUser?.username?.toLowerCase() === 's' || sanitized === 's';

      if (!isUnchanged) {
        // ── Full Governance Gate ──
        const { validateUsernameGovernance, normalizeUsername } = await import('@/lib/security/governance');
        const governance = validateUsernameGovernance(sanitized, isDevUser);
        if (!governance.valid) {
          return { success: false, error: governance.reason ?? 'This username is not permitted.' };
        }

        // ── AI Layer ──
        const { aiAdversarialAnalysis } = await import('@/lib/security/ai-analysis');
        const normalized = normalizeUsername(sanitized);
        const aiResult = await aiAdversarialAnalysis(sanitized, normalized);
        if (aiResult.verdict === 'block') {
          return { success: false, error: `Identity rejected by security analysis: ${aiResult.reason}` };
        }

        // ── Rate Limit Check (server-side) ──
        const eligibility = await checkUsernameChangeEligibility(actualUserId);
        if (!eligibility.allowed) {
          return { success: false, error: eligibility.reason };
        }

        const supabaseAdmin = createAdminClient();
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('username')
          .eq('username', sanitized)
          .neq('id', actualUserId)
          .maybeSingle();
        if (existingUser) {
          return { success: false, error: 'This username is already taken.' };
        }
        isUsernameChange = true;
      }

      dbPayload.username = sanitized;
    }

    if (updates.bio !== undefined) dbPayload.bio = updates.bio;
    if (updates.avatarUrl !== undefined) dbPayload.avatar_url = updates.avatarUrl;
    if (updates.theme !== undefined) dbPayload.theme = updates.theme;

    // Append rate limit tracking fields if username is changing
    if (isUsernameChange) {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Fetch existing count/month to properly increment
      const { data: userData } = await supabase
        .from('users')
        .select('username_changes_count, username_change_month')
        .eq('id', actualUserId)
        .maybeSingle();

      const storedMonth = userData?.username_change_month || null;
      const storedCount = userData?.username_changes_count || 0;
      const changesThisMonth = storedMonth === currentMonth ? storedCount : 0;

      dbPayload.username_changed_at = now.toISOString();
      dbPayload.username_changes_count = changesThisMonth + 1;
      dbPayload.username_change_month = currentMonth;
    }

    if (Object.keys(dbPayload).length === 0) return { success: true };

    const supabaseAdmin = createAdminClient();

    // Clean up old avatar image from storage
    if (updates.avatarUrl !== undefined) {
      try {
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('avatar_url')
          .eq('id', actualUserId)
          .maybeSingle();

        const oldAvatarUrl = userData?.avatar_url;
        if (oldAvatarUrl && oldAvatarUrl !== updates.avatarUrl) {
          const { deleteMediaFile } = await import('@/lib/storage');
          await deleteMediaFile(oldAvatarUrl);
        }
      } catch (err: any) {
        console.warn('[Avatar Cleanup] Failed to delete old avatar:', err.message);
      }
    }

    // Clean up old banner image from storage
    if (updates.bannerUrl !== undefined) {
      try {
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('banner_url')
          .eq('id', actualUserId)
          .maybeSingle();

        const oldBannerUrl = userData?.banner_url;
        if (oldBannerUrl && oldBannerUrl !== updates.bannerUrl) {
          const { deleteMediaFile } = await import('@/lib/storage');
          await deleteMediaFile(oldBannerUrl);
        }
      } catch (err: any) {
        console.warn('[Banner Cleanup] Failed to delete old banner:', err.message);
      }
    }

    // Force write to the public users table
    let { error } = await supabaseAdmin
      .from('users')
      .update(dbPayload)
      .eq('id', actualUserId);

    if (error && (error.message.includes('column') || error.code === '42703')) {
      console.warn('[SERVER DEBUG] Update failed due to missing column. Falling back to non-extended columns...');
      const fallbackPayload = { ...dbPayload };
      delete fallbackPayload.banner_url;
      delete fallbackPayload.quote;
      delete fallbackPayload.quote_expires_at;
      delete fallbackPayload.presence_status;
      delete fallbackPayload.presence_expires_at;
      delete fallbackPayload.invisible_mode;
      delete fallbackPayload.expertise_tags;

      const retryRes = await supabaseAdmin
        .from('users')
        .update(fallbackPayload)
        .eq('id', actualUserId);
      error = retryRes.error;

      // Fallback: If banner_url was present, store it in user auth metadata so it's not lost
      if (!error && updates.bannerUrl) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(actualUserId);
        const existingMeta = userData.user?.user_metadata || {};
        await supabaseAdmin.auth.admin.updateUserById(actualUserId, {
          user_metadata: { ...existingMeta, banner_url: updates.bannerUrl }
        });
      }
    }

    if (error) throw error;

    // Force write to user metadata (avatar/display_name sync)
    if (updates.avatarUrl !== undefined || updates.displayName !== undefined) {
      const metaUpdates: any = {};
      if (updates.avatarUrl !== undefined) metaUpdates.avatar_url = updates.avatarUrl;
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(actualUserId);
      const existingMeta = userData.user?.user_metadata || {};

      await supabaseAdmin.auth.admin.updateUserById(actualUserId, {
        user_metadata: { ...existingMeta, ...metaUpdates }
      });
    }

    // Write profile updates to profile_milestones table
    const milestoneDate = new Date().toISOString();
    if (updates.displayName !== undefined) {
      await supabaseAdmin.from('profile_milestones').insert({
        user_id: actualUserId,
        type: 'custom',
        title: 'Display Name Updated',
        description: `Changed display name to "${updates.displayName}".`,
        milestone_date: milestoneDate
      });
    }
    if (isUsernameChange && updates.username) {
      await supabaseAdmin.from('profile_milestones').insert({
        user_id: actualUserId,
        type: 'custom',
        title: 'Username Changed',
        description: `Changed username to @${updates.username}.`,
        milestone_date: milestoneDate
      });
    }
    if (updates.bio !== undefined) {
      await supabaseAdmin.from('profile_milestones').insert({
        user_id: actualUserId,
        type: 'custom',
        title: 'Biography Updated',
        description: 'Updated profile biography details.',
        milestone_date: milestoneDate
      });
    }
    if (updates.avatarUrl !== undefined) {
      await supabaseAdmin.from('profile_milestones').insert({
        user_id: actualUserId,
        type: 'custom',
        title: 'Avatar Updated',
        description: 'Uploaded a new identity avatar.',
        milestone_date: milestoneDate
      });
    }
    if (updates.bannerUrl !== undefined) {
      await supabaseAdmin.from('profile_milestones').insert({
        user_id: actualUserId,
        type: 'custom',
        title: 'Profile Banner Updated',
        description: 'Uploaded a new profile banner.',
        milestone_date: milestoneDate
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


export async function getDatabaseProfile(userId: string) {
  try {
    console.log('[SERVER DEBUG] getDatabaseProfile called for userId:', userId);
    const supabaseAdmin = createAdminClient();

    let isExtendedFallback = false;
    let isBannerFallback = false;

    // Fetch profile + real-time follower/following counts in parallel
    let profileResult = await supabaseAdmin
      .from('users')
      .select('avatar_url, display_name, username, bio, security_score, profile_completeness, role, is_verified, karma_score, pronouns, custom_link, pinned_track_id, pinned_track_name, pinned_track_artist, pinned_track_artwork, pinned_track_source, banner_url, is_private, follower_count, following_count, quote, quote_expires_at, presence_status, presence_expires_at, invisible_mode, expertise_tags')
      .eq('id', userId)
      .maybeSingle();

    if (profileResult.error && (profileResult.error.message.includes('column') || profileResult.error.code === '42703')) {
      console.warn('[SERVER DEBUG] Extended columns missing, falling back to banner_url select');
      isExtendedFallback = true;
      profileResult = await supabaseAdmin
        .from('users')
        .select('avatar_url, display_name, username, bio, security_score, profile_completeness, role, is_verified, karma_score, pronouns, custom_link, pinned_track_id, pinned_track_name, pinned_track_artist, pinned_track_artwork, pinned_track_source, banner_url, is_private, follower_count, following_count')
        .eq('id', userId)
        .maybeSingle();

      if (profileResult.error && (profileResult.error.message.includes('column') || profileResult.error.code === '42703')) {
        console.warn('[SERVER DEBUG] banner_url column missing, falling back to basic select');
        isBannerFallback = true;
        profileResult = await supabaseAdmin
          .from('users')
          .select('avatar_url, display_name, username, bio, security_score, profile_completeness, role, is_verified, karma_score, pronouns, custom_link, pinned_track_id, pinned_track_name, pinned_track_artist, pinned_track_artwork, pinned_track_source, is_private, follower_count, following_count')
          .eq('id', userId)
          .maybeSingle();
      }
    }

    if (profileResult.error) {
      console.error('[SERVER DEBUG] profileResult error:', profileResult.error);
      throw profileResult.error;
    }

    const profileData = profileResult.data;
    if (!profileData) {
      throw new Error('User profile not found in database');
    }

    // Try counting followers with status filter (accepted follows only). Fallback if column missing.
    let followerCount = null;
    let followingCount = null;
    try {
      const [followerRes, followingRes] = await Promise.all([
        supabaseAdmin
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId)
          .eq('status', 'accepted'),
        supabaseAdmin
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', userId)
          .eq('status', 'accepted'),
      ]);
      
      if (followerRes.error || followingRes.error) {
        throw new Error('Status column missing or query failed');
      }
      
      followerCount = followerRes.count;
      followingCount = followingRes.count;
    } catch (countErr) {
      console.warn('[SERVER DEBUG] Failed to count with status filter, falling back to simple counts:', countErr);
      const [followerRes, followingRes] = await Promise.all([
        supabaseAdmin
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId),
        supabaseAdmin
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', userId),
      ]);
      followerCount = followerRes.count;
      followingCount = followingRes.count;
    }

    // Heal columns in database if out of sync
    if (
      (followerCount !== null && followerCount !== (profileData as any).follower_count) ||
      (followingCount !== null && followingCount !== (profileData as any).following_count)
    ) {
      console.log(`[SERVER HEALING] Healing follow counts for user ${userId}. db_followers=${followerCount}, db_following=${followingCount}`);
      supabaseAdmin
        .from('users')
        .update({
          follower_count: followerCount,
          following_count: followingCount
        })
        .eq('id', userId)
        .then(({ error }) => {
          if (error) console.error('[SERVER HEALING] Failed to update user counts:', error);
        });
    }

    // Self-healing / cleanup of expired quotes or presences on read
    const now = new Date();
    let quote = (profileData as any).quote || null;
    let quoteExpiresAt = (profileData as any).quote_expires_at || null;
    let presenceStatus = (profileData as any).presence_status || null;
    let presenceExpiresAt = (profileData as any).presence_expires_at || null;
    const invisibleMode = (profileData as any).invisible_mode || false;
    const expertiseTags = (profileData as any).expertise_tags || [];

    let needsDbUpdate = false;
    const dbUpdates: any = {};

    if (quote && quoteExpiresAt && new Date(quoteExpiresAt) < now) {
      quote = null;
      quoteExpiresAt = null;
      dbUpdates.quote = null;
      dbUpdates.quote_expires_at = null;
      needsDbUpdate = true;
    }

    if (presenceStatus && presenceExpiresAt && new Date(presenceExpiresAt) < now) {
      presenceStatus = null;
      presenceExpiresAt = null;
      dbUpdates.presence_status = null;
      dbUpdates.presence_expires_at = null;
      needsDbUpdate = true;
    }

    if (needsDbUpdate && !isExtendedFallback) {
      // Fire-and-forget background update to clean up database
      supabaseAdmin
        .from('users')
        .update(dbUpdates)
        .eq('id', userId)
        .then(({ error }) => {
          if (error) console.error('[SERVER CLEANUP] Expiry cleanup failed:', error);
        });
    }

    // Resolve banner_url from auth user metadata if missing/fallback is active
    let bannerUrl = null;
    if (isBannerFallback) {
      try {
        const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
        bannerUrl = authUserData.user?.user_metadata?.banner_url || null;
      } catch (authErr) {
        console.warn('[SERVER DEBUG] Failed to fetch user metadata for banner_url fallback:', authErr);
      }
    } else {
      bannerUrl = (profileData as any).banner_url || null;
    }

    // Verify viewer authorization to read full profile details (if private)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const viewerId = user?.id || null;

    const isPrivate = profileData.is_private === true;
    let isAuthorized = !isPrivate || viewerId === userId;

    if (isPrivate && viewerId && viewerId !== userId) {
      const { data: followRecord } = await supabaseAdmin
        .from('followers')
        .select('status')
        .eq('follower_id', viewerId)
        .eq('following_id', userId)
        .eq('status', 'accepted')
        .maybeSingle();
      if (followRecord) {
        isAuthorized = true;
      }
    }

    const finalData = {
      ...profileData,
      banner_url: bannerUrl,
      follower_count: followerCount ?? (profileData as any).follower_count ?? 0,
      following_count: followingCount ?? (profileData as any).following_count ?? 0,
      quote,
      quote_expires_at: quoteExpiresAt,
      presence_status: presenceStatus,
      presence_expires_at: presenceExpiresAt,
      invisible_mode: invisibleMode,
      expertise_tags: expertiseTags,
    };

    if (!isAuthorized) {
      // Redact sensitive details for private profiles
      finalData.bio = null;
      finalData.pronouns = null;
      finalData.custom_link = null;
      finalData.banner_url = null;
      finalData.quote = null;
      finalData.quote_expires_at = null;
      finalData.presence_status = null;
      finalData.presence_expires_at = null;
      finalData.expertise_tags = [];
      finalData.pinned_track_id = null;
      finalData.pinned_track_name = null;
      finalData.pinned_track_artist = null;
      finalData.pinned_track_artwork = null;
      finalData.pinned_track_source = null;
    }

    console.log('[SERVER DEBUG] getDatabaseProfile success. display_name:', profileData.display_name, 'username:', profileData.username);
    return {
      success: true,
      data: finalData
    };
  } catch (err: any) {
    console.error('[SERVER DEBUG] getDatabaseProfile error:', err);
    return { success: false, error: err.message };
  }
}

export async function generateAIBioAction(params: {
  occupation?: string;
  education?: string;
  location?: string;
  currentBio?: string;
  tone: 'professional' | 'genz' | 'minimalist' | 'creative';
}): Promise<{ success: boolean; bio?: string; error?: string }> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'GEMINI_API_KEY is not configured on the server.' };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        maxOutputTokens: 120,
        temperature: 0.7,
      }
    });

    const { occupation, education, location, currentBio, tone } = params;

    let systemPrompt = `You are an elite, modern profile bio architect for a premium Gen Z x Professional digital identity platform called Verlyn.
Your goal is to write or enhance a user bio based on their details.

CRITICAL DIRECTIVES:
1. The bio MUST be strictly UNDER 160 characters total. Output must be short and direct.
2. Output ONLY the final bio content. Do NOT include quotes, introduction, explanation, notes, or meta comments.
3. Keep it aesthetic, authentic, human, and professional. Avoid corporate buzzwords/clichés (like "driven to succeed", "passionate", "motivated professional", "innovative solutions").
4. Emoji usage:
   - For 'professional' or 'minimalist': NO emojis.
   - For 'genz' or 'creative': Max 1-2 relevant/sleek emojis at most, keep them professional, absolutely no spam.

TONE SPECIFICS:
`;

    if (tone === 'professional') {
      systemPrompt += `- Tone: Sleek Professional. Sharp, high-impact value statement. Highlights core focus/craft.\n`;
    } else if (tone === 'genz') {
      systemPrompt += `- Tone: Gen-Z / Witty. Punchy, lowercase-friendly, casual yet smart tagline, self-aware and memorable.\n`;
    } else if (tone === 'minimalist') {
      systemPrompt += `- Tone: Minimalist & Clean. Ultra-short phrase or pipeline segments (e.g. "Software | Design | London"). Spacious and refined.\n`;
    } else if (tone === 'creative') {
      systemPrompt += `- Tone: Creative & Bold. Dynamic positioning, storytelling hook, engaging or intriguing phrase.\n`;
    }

    let userMessage = `Create a bio for my profile:\n`;
    if (occupation) userMessage += `- Occupation: ${occupation}\n`;
    if (education) userMessage += `- Education/Academic background: ${education}\n`;
    if (location) userMessage += `- Location: ${location}\n`;
    if (currentBio) userMessage += `- Current raw Bio to enhance/improve: "${currentBio}"\n`;

    userMessage += `\nGenerate a bio matching the requested tone. Under 160 characters.`;

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: userMessage }
    ]);

    let bio = result.response.text().trim();
    
    // Clean outer quotes
    if (bio.startsWith('"') && bio.endsWith('"')) {
      bio = bio.slice(1, -1);
    }
    if (bio.startsWith("'") && bio.endsWith("'")) {
      bio = bio.slice(1, -1);
    }
    bio = bio.trim();

    // Enforce hard character limit
    if (bio.length > 160) {
      bio = bio.slice(0, 157) + '...';
    }

    // Moderation check before sending to client
    const modCheck = checkIdentityContent(bio);
    if (modCheck.blocked) {
      return { 
        success: false, 
        error: `AI generated content violated identity moderation policy. Try changing the input fields or tone.` 
      };
    }

    return { success: true, bio };
  } catch (err: any) {
    console.error('[SERVER DEBUG] generateAIBioAction error:', err);
    return { success: false, error: err?.message || 'Gemini API transaction failed.' };
  }
}

export async function checkUsernameExists(username: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('users')
      .select('id')
      .ilike('username', username.trim().toLowerCase())
      .maybeSingle();
    return !!data;
  } catch (e) {
    console.error('[SERVER DEBUG] checkUsernameExists error:', e);
    return false;
  }
}

export async function logProfileVisit(profileId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id === profileId) {
      return { success: false }; // Anonymous or visiting own profile
    }
    const visitorId = user.id;

    // Check if the visitor has invisible_mode enabled
    const { data: visitorProfile } = await supabase
      .from('users')
      .select('invisible_mode')
      .eq('id', visitorId)
      .maybeSingle();

    if (visitorProfile?.invisible_mode) {
      return { success: true, skipped: true }; // Skipped due to invisible mode
    }

    const supabaseAdmin = createAdminClient();

    // Upsert the visit
    const { error } = await supabaseAdmin
      .from('profile_visits')
      .upsert({
        profile_id: profileId,
        visitor_id: visitorId,
        visited_at: new Date().toISOString()
      }, { onConflict: 'profile_id,visitor_id' });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.warn('[logProfileVisit] Failed to log profile visit:', err.message);
    return { success: false, error: err.message };
  }
}

export async function getProfileVisitors(userId: string) {
  try {
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from('profile_visits')
      .select(`
        visited_at,
        visitor:users!profile_visits_visitor_id_fkey(id, username, display_name, avatar_url, is_verified, role)
      `)
      .eq('profile_id', userId)
      .order('visited_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return {
      success: true,
      data: (data || []).map((row: any) => ({
        visitedAt: row.visited_at,
        visitor: row.visitor
      }))
    };
  } catch (err: any) {
    console.warn('[getProfileVisitors] Failed to get profile visitors:', err.message);
    return { success: false, data: [], error: err.message };
  }
}

export interface Milestone {
  id: string;
  type: 'system' | 'custom';
  title: string;
  description?: string;
  date: string;
}

export async function getProfileMilestones(userId: string) {
  try {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    const supabaseAdmin = createAdminClient();

    // ── Enforce Privacy Boundary ──
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('id, is_private')
      .eq('id', userId)
      .maybeSingle();

    if (targetUser?.is_private && currentUser?.id !== userId) {
      let isApproved = false;
      if (currentUser?.id) {
        const { data: follow } = await supabaseAdmin
          .from('followers')
          .select('id')
          .eq('follower_id', currentUser.id)
          .eq('following_id', userId)
          .maybeSingle();
        if (follow) isApproved = true;
      }
      if (!isApproved) {
        return { success: true, data: [] }; // Return empty milestones for locked private accounts
      }
    }

    const milestones: Milestone[] = [];

    // 1. Fetch custom milestones (including profile updates logged here)
    try {
      const { data: dbMilestones } = await supabaseAdmin
        .from('profile_milestones')
        .select('*')
        .eq('user_id', userId)
        .order('milestone_date', { ascending: false });

      if (dbMilestones) {
        dbMilestones.forEach((m: any) => {
          milestones.push({
            id: m.id,
            type: 'custom',
            title: m.title,
            description: m.description || '',
            date: m.milestone_date
          });
        });
      }
    } catch (err) {
      console.warn('[getProfileMilestones] profile_milestones table fetch skipped:', (err as any).message);
    }

    // 2. Fetch user profile for dynamic system milestones
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('created_at, follower_count, is_verified, role, security_score')
      .eq('id', userId)
      .maybeSingle();

    if (user) {
      // "Joined Verlyn"
      milestones.push({
        id: 'joined_verlyn',
        type: 'system',
        title: 'Joined Verlyn',
        description: 'Initiated digital identity node.',
        date: user.created_at
      });

      // "Reached 100 Followers"
      if ((user.follower_count || 0) >= 100) {
        milestones.push({
          id: 'reached_100_followers',
          type: 'system',
          title: 'Reached 100 Followers',
          description: 'Established a network of 100 trusted connections.',
          date: new Date().toISOString()
        });
      }

      // "Identity Verified"
      if (user.is_verified || user.role === 'PRIME') {
        milestones.push({
          id: 'verified_account',
          type: 'system',
          title: 'Identity Verified',
          description: 'Obtained verified trust status certificate.',
          date: user.created_at
        });
      }

      // Prime Badge unlock
      if (user.role === 'PRIME') {
        milestones.push({
          id: 'badge_prime',
          type: 'system',
          title: 'Prime Badge Unlocked',
          description: 'Recognized as a certified Prime user.',
          date: user.created_at
        });
      }

      // High Security Badge unlock
      if ((user.security_score || 0) >= 80) {
        milestones.push({
          id: 'badge_high_security',
          type: 'system',
          title: 'High Security Badge Unlocked',
          description: `Secured identity score to ${user.security_score}% or higher.`,
          date: user.created_at
        });
      }
    }

    // 3. Fetch owned communities
    try {
      const { data: communities } = await supabaseAdmin
        .from('communities')
        .select('name, created_at')
        .eq('owner_id', userId);

      if (communities) {
        communities.forEach((c: any) => {
          milestones.push({
            id: `community_${c.name}`,
            type: 'system',
            title: `Created Community: ${c.name}`,
            description: `Established a new group node inside Verlyn.`,
            date: c.created_at
          });
        });
      }
    } catch (err) {
      console.warn('[getProfileMilestones] communities table fetch skipped:', (err as any).message);
    }

    // 4. Fetch joined communities
    try {
      const { data: joinedComms } = await supabaseAdmin
        .from('community_members')
        .select('created_at, communities(name, owner_id)')
        .eq('user_id', userId);

      if (joinedComms) {
        joinedComms.forEach((jc: any) => {
          const comm = jc.communities;
          if (comm && comm.owner_id !== userId) {
            milestones.push({
              id: `joined_community_${comm.name}`,
              type: 'system',
              title: `Joined Community: ${comm.name}`,
              description: `Registered as a member in community node.`,
              date: jc.created_at || new Date().toISOString()
            });
          }
        });
      }
    } catch (err) {
      console.warn('[getProfileMilestones] joined communities fetch skipped:', (err as any).message);
    }

    // 5. Fetch posts count milestone
    try {
      const { count } = await supabaseAdmin
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', userId);

      const totalPosts = count || 0;
      if (totalPosts >= 100) {
        milestones.push({
          id: 'milestone_posts_100',
          type: 'system',
          title: 'Century Creator',
          description: 'Published over 100 posts to the network.',
          date: new Date().toISOString()
        });
      } else if (totalPosts >= 50) {
        milestones.push({
          id: 'milestone_posts_50',
          type: 'system',
          title: 'Active Broadcaster',
          description: 'Published over 50 posts to the network.',
          date: new Date().toISOString()
        });
      } else if (totalPosts >= 10) {
        milestones.push({
          id: 'milestone_posts_10',
          type: 'system',
          title: 'First Decade',
          description: 'Published over 10 posts to the network.',
          date: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('[getProfileMilestones] posts count check skipped:', (err as any).message);
    }

    // Sort all by date descending
    milestones.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { success: true, data: milestones };
  } catch (err: any) {
    console.error('[getProfileMilestones] error:', err.message);
    return { success: false, data: [] };
  }
}

export async function addCustomMilestone(title: string, description: string, date: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from('profile_milestones')
      .insert({
        user_id: user.id,
        type: 'custom',
        title,
        description,
        milestone_date: date
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteCustomMilestone(id: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
      .from('profile_milestones')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchPublicProfileSafe(currentUserId: string | undefined, targetUsername: string) {
  try {
    const supabaseAdmin = createAdminClient();

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, username, display_name, avatar_url, bio, role, is_verified, karma_score, created_at, pronouns, custom_link, pinned_track_id, pinned_track_name, pinned_track_artist, pinned_track_artwork, pinned_track_source, banner_url, is_private, follower_count, following_count, quote, presence_status, expertise_tags')
      .ilike('username', targetUsername)
      .maybeSingle();

    if (userError) throw userError;
    if (!user) return { success: false, error: 'User not found' };

    // Check for Limited Profile Visibility restriction
    const { isUserRestricted } = await import('@/lib/spamGuard');
    if (await isUserRestricted(user.id, 'limited_profile')) {
      return {
        success: true,
        isBlockedByMe: false,
        hasBlockedMe: false,
        isLimitedVisibility: true,
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          bio: 'Profile visibility limited due to community guideline violations.',
          is_verified: false,
          is_private: true,
          role: user.role,
          karma_score: user.karma_score,
          created_at: user.created_at,
          pronouns: null,
          custom_link: null,
          pinned_track_id: null,
          pinned_track_name: null,
          pinned_track_artist: null,
          pinned_track_artwork: null,
          pinned_track_source: null,
          banner_url: null,
          follower_count: 0,
          following_count: 0,
          quote: null,
          presence_status: null,
          expertise_tags: []
        } as any
      };
    }

    if (currentUserId) {
      const { data: block } = await supabaseAdmin
        .from('blocks')
        .select('*')
        .or(`and(blocker_id.eq.${currentUserId},blocked_id.eq.${user.id}),and(blocker_id.eq.${user.id},blocked_id.eq.${currentUserId})`)
        .maybeSingle();

      if (block) {
        if (block.blocker_id === currentUserId) {
          return {
            success: true,
            isBlockedByMe: true,
            hasBlockedMe: false,
            user: {
              id: user.id,
              username: user.username,
              display_name: user.display_name,
              avatar_url: user.avatar_url,
              bio: '',
              is_verified: false,
              is_private: true,
              role: 'PUBLIC',
              karma_score: 0,
              created_at: user.created_at,
              pronouns: null,
              custom_link: null,
              pinned_track_id: null,
              pinned_track_name: null,
              pinned_track_artist: null,
              pinned_track_artwork: null,
              pinned_track_source: null,
              banner_url: null,
              follower_count: 0,
              following_count: 0,
              quote: null,
              presence_status: null,
              expertise_tags: []
            } as any
          };
        } else {
          return {
            success: true,
            isBlockedByMe: false,
            hasBlockedMe: true,
            user: null
          };
        }
      }
    }

    return {
      success: true,
      isBlockedByMe: false,
      hasBlockedMe: false,
      user
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function calculateUserBadges(user: any): Promise<BadgeType[]> {
  if (!user) return [];
  const badges: BadgeType[] = [];
  const isS = user.username?.toLowerCase() === 's';

  // ── SINGULARITY ───────────────────────────────────────
  if (isS) badges.push('white_heart');

  // ── VERIFICATION ──────────────────────────────────────
  if (!isS && (user.is_verified || user.role === 'PRIME')) badges.push('sovereign');
  if (!isS && (user.role === 'ADMIN' || user.role === 'DEVELOPER')) badges.push('architect');
  if (!isS && ((user.security_score && user.security_score > 80))) badges.push('guardian');
  if (!isS && (user.created_at && new Date(user.created_at).getFullYear() <= 2025)) badges.push('founding');

  // ── STREAK ────────────────────────────────────────────
  let metadata: any = {};
  if (typeof user.bio === 'string') {
    metadata = parseBio(user.bio).metadata;
  } else if (user.metadata) {
    metadata = user.metadata;
  }
  const streak = metadata.streak ?? metadata.loginStreak ?? user.streak_count ?? 0;
  if (streak >= 365) badges.push('streak_365');
  else if (streak >= 100) badges.push('streak_100');
  else if (streak >= 30)  badges.push('streak_30');
  else if (streak >= 7)   badges.push('streak_7');
  else if (streak >= 3)   badges.push('streak_3');

  // ── FOLLOWERS ─────────────────────────────────────────
  const fc = user.follower_count ?? 0;
  if (fc >= 1000) badges.push('legend');
  else if (fc >= 500) badges.push('influencer');
  else if (fc >= 100) badges.push('popular');
  else if (fc >= 10)  badges.push('connected');
  else if (fc >= 1)   badges.push('first_follower');

  // ── PROFILE ───────────────────────────────────────────
  if (user.avatar_url) badges.push('avatar_set');
  const hasBio = (user.bio && parseBio(user.bio).visibleBio?.trim().length > 0);
  if (hasBio) badges.push('bio_written');
  if (user.banner_url) badges.push('banner_hero');
  const profileComplete = user.avatar_url && hasBio && user.banner_url
    && user.location && user.website;
  if (profileComplete) badges.push('complete_profile');

  // ── COMMUNITY ─────────────────────────────────────────
  const joinedAt = user.created_at ? new Date(user.created_at) : null;
  const now = new Date();
  if (joinedAt && (now.getTime() - joinedAt.getTime()) > 365 * 24 * 60 * 60 * 1000)
    badges.push('veteran');
  if (joinedAt && joinedAt <= new Date('2025-02-01')) badges.push('early_adopter');
  if (!user.violation_count || user.violation_count === 0) badges.push('peacekeeper');

  // ── CONTENT ───────────────────────────────────────────
  const postCount = user.post_count ?? 0;
  if (postCount >= 100) badges.push('post_100');
  else if (postCount >= 50) badges.push('post_50');
  else if (postCount >= 10) badges.push('post_10');
  else if (postCount >= 1) badges.push('first_post');

  return badges;
}

export async function checkAndNotifyAwardedBadges(userId: string) {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    // 1. Fetch user profile
    const { data: dbUser, error: fetchErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (fetchErr || !dbUser) {
      return { success: false, error: 'User profile not found.' };
    }

    // 2. Parse bio & metadata
    const { visibleBio, metadata } = parseBio(dbUser.bio);
    const notifiedBadges: string[] = metadata.notifiedBadges || [];

    // 3. Calculate current badges
    const currentBadges = await calculateUserBadges(dbUser);

    // 4. Find new badges not yet notified
    const newBadges = currentBadges.filter(b => !notifiedBadges.includes(b));

    if (newBadges.length === 0) {
      return { success: true, newBadges: [] };
    }

    // 5. Create notifications in DB for each new badge
    const badgeConfigs = await import('@/components/ui/IdentityBadge');
    const configMap = badgeConfigs.BADGE_CONFIG;

    for (const badge of newBadges) {
      const config = configMap[badge as BadgeType];
      const badgeLabel = config ? config.label : badge;
      
      await supabaseAdmin.from('notifications').insert({
        user_id: userId,
        actor_id: null,
        type: 'award',
        body: `Congratulations! You unlocked the "${badgeLabel}" credential badge.`,
        is_read: false,
      });
    }

    // 6. Update user's metadata.notifiedBadges
    const updatedNotified = [...notifiedBadges, ...newBadges];
    const updatedBio = serializeBio(visibleBio || '', {
      ...metadata,
      notifiedBadges: updatedNotified,
    });

    const { error: updateErr } = await supabaseAdmin
      .from('users')
      .update({ bio: updatedBio })
      .eq('id', userId);

    if (updateErr) {
      return { success: false, error: `Failed to update bio: ${updateErr.message}` };
    }

    return { success: true, newBadges };
  } catch (err: any) {
    console.error('[checkAndNotifyAwardedBadges] Error:', err.message);
    return { success: false, error: err.message };
  }
}



