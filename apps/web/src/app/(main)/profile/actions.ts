'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { isUserRestricted } from '@/lib/spamGuard';

const supabaseAdmin = new Proxy({}, {
  get(target, prop) {
    const client = createAdminClient();
    const value = Reflect.get(client, prop);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
}) as any;

// ── FOLLOW STATE MACHINE ──────────────────────────────────────────────────────
// Possible states (derived from DB):
//   NOT_FOLLOWING  — no row in followers, no row in follow_requests
//   REQUEST_PENDING — row in follow_requests with status='pending'
//   FOLLOWING       — row in followers with status='accepted'
//   MUTUAL          — both users follow each other (accepted)
//   BLOCKED         — row in blocks table (either direction)
//   SELF            — viewer == target
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Toggle follow for PUBLIC accounts only.
 * For private accounts use sendFollowRequestDB / cancelFollowRequestDB instead.
 * This is an atomic operation via the toggle_follow RPC.
 */
export async function toggleFollowDB(followerId: string, followingId: string, isJoining: boolean) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const actualFollowerId = user.id;

    if (await isUserRestricted(actualFollowerId, 'follows')) {
      return { success: false, error: 'You are restricted from following users due to spamming.' };
    }

    if (isJoining) {
      // Spam guard
      const { recordActivityAndCheckSpam } = await import('@/lib/moderationEngine');
      const spamResult = await recordActivityAndCheckSpam(actualFollowerId, 'follow_user', undefined, followingId);
      if (spamResult.blocked) {
        if (spamResult.warning) return { success: false, error: `Warning: ${spamResult.warning}` };
        return { success: false, error: 'You are restricted from following users due to spamming.' };
      }

      // Safety check: if target is actually private, refuse — caller should use sendFollowRequestDB
      const { data: targetUser } = await supabaseAdmin
        .from('users')
        .select('is_private')
        .eq('id', followingId)
        .maybeSingle();

      if (targetUser?.is_private) {
        // Route to request flow — never create a fake follow
        const reqRes = await sendFollowRequestDB(followingId);
        if (!reqRes.success) throw new Error(reqRes.error || 'Failed to send follow request');
        return { success: true, routedToRequest: true };
      }

      // Public account → atomic follow via RPC
      const { error } = await supabaseAdmin.rpc('toggle_follow', {
        p_follower: actualFollowerId,
        p_following: followingId,
        p_is_following: true,
      });
      if (error) throw error;
    } else {
      // Unfollow — works for both public and private (after acceptance)
      // Always try the RPC first (decrements counts atomically)
      const { error } = await supabaseAdmin.rpc('toggle_follow', {
        p_follower: actualFollowerId,
        p_following: followingId,
        p_is_following: false,
      });
      if (error) throw error;

      // Also clean up any residual follow_requests row
      await supabaseAdmin
        .from('follow_requests')
        .delete()
        .eq('requester_id', actualFollowerId)
        .eq('target_id', followingId);
    }

    return { success: true };
  } catch (err: any) {
    console.error('[toggleFollowDB] Failed to sync follow:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Check if follower is following following with status='accepted'.
 * Only counts confirmed/accepted follows, never pending.
 */
export async function isFollowingDB(followerId: string, followingId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('followers')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .eq('status', 'accepted')
      .maybeSingle();

    if (error) {
      // Fallback: column may not exist in older schema
      const { data: fallback } = await supabaseAdmin
        .from('followers')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .maybeSingle();
      return !!fallback;
    }
    return !!data;
  } catch (err: any) {
    console.error('[isFollowingDB] error:', err.message);
    return false;
  }
}

export async function getFollowingIdsDB(followerId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('followers')
      .select('following_id')
      .eq('follower_id', followerId)
      .eq('status', 'accepted');

    if (error) {
      // Fallback without status filter
      const { data: fallback } = await supabaseAdmin
        .from('followers')
        .select('following_id')
        .eq('follower_id', followerId);
      return (fallback || []).map((row: any) => row.following_id as string);
    }
    return (data || []).map((row: any) => row.following_id as string);
  } catch (err: any) {
    console.error('[getFollowingIdsDB] error:', err.message);
    return [];
  }
}

export interface FollowListUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  is_private: boolean;
}

/**
 * Fetch followers or following list. Enforces privacy: private accounts
 * can only be seen by accepted followers.
 */
export async function getFollowListDB(
  userId: string,
  type: 'followers' | 'following'
): Promise<{ success: boolean; data: FollowListUser[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const requesterId = currentUser?.id || null;

    if (requesterId !== userId) {
      const { data: targetUser } = await supabaseAdmin
        .from('users')
        .select('is_private')
        .eq('id', userId)
        .maybeSingle();

      if (targetUser?.is_private) {
        let isApproved = false;
        if (requesterId) {
          isApproved = await isFollowingDB(requesterId, userId);
        }
        if (!isApproved) {
          return { success: false, data: [], error: 'This profile is private.' };
        }
      }
    }

    const idColumn = type === 'followers' ? 'follower_id' : 'following_id';
    const filterColumn = type === 'followers' ? 'following_id' : 'follower_id';

    let rawData: any[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('followers')
        .select(idColumn)
        .eq(filterColumn, userId)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      rawData = data || [];
    } catch {
      const { data } = await supabaseAdmin
        .from('followers')
        .select(idColumn)
        .eq(filterColumn, userId)
        .order('created_at', { ascending: false })
        .limit(300);
      rawData = data || [];
    }

    const ids = rawData.map((r: any) => r[idColumn]);
    if (ids.length === 0) return { success: true, data: [] };

    const { data: users, error: uErr } = await supabaseAdmin
      .from('users')
      .select('id, username, display_name, avatar_url, is_verified, is_private')
      .in('id', ids);

    if (uErr) throw uErr;
    return { success: true, data: (users || []) as FollowListUser[] };
  } catch (err: any) {
    console.error('[getFollowListDB] error:', err.message);
    return { success: false, data: [], error: err.message };
  }
}

export async function getMutualFollowersDB(
  currentUserId: string,
  targetUserId: string
): Promise<{ success: boolean; data: FollowListUser[]; error?: string }> {
  try {
    if (currentUserId !== targetUserId) {
      const { data: targetUser } = await supabaseAdmin
        .from('users')
        .select('is_private')
        .eq('id', targetUserId)
        .maybeSingle();

      if (targetUser?.is_private) {
        const isApproved = await isFollowingDB(currentUserId, targetUserId);
        if (!isApproved) {
          return { success: false, data: [], error: 'This profile is private.' };
        }
      }
    }

    let targetFollowers: any[] = [];
    let currentUserFollowing: any[] = [];

    try {
      const [res1, res2] = await Promise.all([
        supabaseAdmin.from('followers').select('follower_id').eq('following_id', targetUserId).eq('status', 'accepted'),
        supabaseAdmin.from('followers').select('following_id').eq('follower_id', currentUserId).eq('status', 'accepted'),
      ]);
      if (res1.error) throw res1.error;
      if (res2.error) throw res2.error;
      targetFollowers = res1.data || [];
      currentUserFollowing = res2.data || [];
    } catch {
      const [res1, res2] = await Promise.all([
        supabaseAdmin.from('followers').select('follower_id').eq('following_id', targetUserId),
        supabaseAdmin.from('followers').select('following_id').eq('follower_id', currentUserId),
      ]);
      targetFollowers = res1.data || [];
      currentUserFollowing = res2.data || [];
    }

    const targetFollowerIds = targetFollowers.map((r: any) => r.follower_id);
    if (targetFollowerIds.length === 0) return { success: true, data: [] };

    const currentUserFollowingIds = currentUserFollowing.map((r: any) => r.following_id);
    if (currentUserFollowingIds.length === 0) return { success: true, data: [] };

    const mutualIds = targetFollowerIds.filter((id) => currentUserFollowingIds.includes(id));
    if (mutualIds.length === 0) return { success: true, data: [] };

    const { data: users, error: err3 } = await supabaseAdmin
      .from('users')
      .select('id, username, display_name, avatar_url, is_verified, is_private')
      .in('id', mutualIds);

    if (err3) throw err3;
    return { success: true, data: (users || []) as FollowListUser[] };
  } catch (err: any) {
    console.error('[getMutualFollowersDB] error:', err.message);
    return { success: false, data: [], error: err.message };
  }
}

export async function getPendingFollowRequestsDB() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, data: [], error: 'Unauthorized' };

    const { data, error } = await supabaseAdmin
      .from('follow_requests')
      .select('requester_id, created_at')
      .eq('target_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    const ids = (data || []).map((r: any) => r.requester_id);
    if (ids.length === 0) return { success: true, data: [] };

    const { data: users, error: uErr } = await supabaseAdmin
      .from('users')
      .select('id, username, display_name, avatar_url, is_verified')
      .in('id', ids);

    if (uErr) throw uErr;

    const mapped = (users || []).map((u: any) => {
      const row = data!.find((r: any) => r.requester_id === u.id);
      return { ...u, requestedAt: row ? row.created_at : new Date().toISOString() };
    });

    return { success: true, data: mapped };
  } catch (err: any) {
    console.error('[getPendingFollowRequestsDB] error:', err.message);
    return { success: false, data: [], error: err.message };
  }
}

/**
 * Accept a follow request (legacy — kept for backwards compat).
 */
export async function acceptFollowRequestDB(followerId: string): Promise<{ success: boolean; error?: string }> {
  return acceptFollowRequestNewDB(followerId);
}

// ── PRIVATE ACCOUNT FOLLOW REQUEST SYSTEM ────────────────────────────────────

/**
 * Send a follow request to a private account.
 * Writes ONLY to follow_requests — never to followers until accepted.
 * Idempotent: upserts so re-requesting after rejection resets to pending.
 */
export async function sendFollowRequestDB(targetId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const requesterId = user.id;
    if (requesterId === targetId) return { success: false, error: 'Cannot follow yourself' };

    // Guard: if already an accepted follower, return success (no duplicate)
    const alreadyFollowing = await isFollowingDB(requesterId, targetId);
    if (alreadyFollowing) return { success: true };

    // Upsert into follow_requests (resets rejected→pending if retrying)
    const { error } = await supabaseAdmin
      .from('follow_requests')
      .upsert(
        { requester_id: requesterId, target_id: targetId, status: 'pending' },
        { onConflict: 'requester_id,target_id' }
      );

    if (error) throw error;

    // Notification for target user (deduplicated: delete old, insert fresh)
    await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', targetId)
      .eq('actor_id', requesterId)
      .eq('type', 'follow_request');

    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: targetId,
        actor_id: requesterId,
        type: 'follow_request',
        title: 'Follow Request',
        body: 'wants to follow you.',
        is_read: false,
      });

    return { success: true };
  } catch (err: any) {
    console.error('[sendFollowRequestDB] error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Cancel a pending follow request (by the requester).
 * Returns relationship to NOT_FOLLOWING.
 */
export async function cancelFollowRequestDB(targetId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const requesterId = user.id;

    const { error } = await supabaseAdmin
      .from('follow_requests')
      .delete()
      .eq('requester_id', requesterId)
      .eq('target_id', targetId);

    if (error) throw error;

    // Clean up notification
    await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', targetId)
      .eq('actor_id', requesterId)
      .eq('type', 'follow_request');

    return { success: true };
  } catch (err: any) {
    console.error('[cancelFollowRequestDB] error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Accept a follow request (by the target/profile owner).
 * Atomically:
 *   1. Marks follow_requests row as accepted
 *   2. Inserts into followers with status='accepted'
 *   3. Increments follower/following counts via RPC
 *   4. Sends acceptance notification to requester
 */
export async function acceptFollowRequestNewDB(requesterId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const targetId = user.id;

    // 1. Mark request as accepted in follow_requests
    const { error: updateError } = await supabaseAdmin
      .from('follow_requests')
      .update({ status: 'accepted' })
      .eq('requester_id', requesterId)
      .eq('target_id', targetId)
      .eq('status', 'pending');

    if (updateError) throw updateError;

    // 2. Use toggle_follow RPC atomically — INSERT followers row + increment counts in one TX.
    //    ON CONFLICT DO NOTHING means it's safe to call even if somehow a row already exists.
    const { error: rpcError } = await supabaseAdmin.rpc('toggle_follow', {
      p_follower: requesterId,
      p_following: targetId,
      p_is_following: true,
    });
    if (rpcError) throw rpcError;

    // 3. Update status to 'accepted' on the followers row the RPC just inserted.
    //    The RPC inserts without a status column value, so we set it explicitly.
    await supabaseAdmin
      .from('followers')
      .update({ status: 'accepted' })
      .eq('follower_id', requesterId)
      .eq('following_id', targetId);

    // 4. Cleanup follow_request notification, send accepted notification
    await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', targetId)
      .eq('actor_id', requesterId)
      .eq('type', 'follow_request');

    try {
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: requesterId,
          actor_id: targetId,
          type: 'follow_accepted',
          title: 'Follow Request Accepted',
          body: 'accepted your follow request.',
          is_read: false,
        });
    } catch {
      // Non-fatal
    }

    return { success: true };
  } catch (err: any) {
    console.error('[acceptFollowRequestNewDB] error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Reject a follow request (by the target/profile owner).
 * Relationship returns to NOT_FOLLOWING for requester.
 */
export async function rejectFollowRequestDB(requesterId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Delete the request entirely (cleaner than marking rejected — avoids ghost rows)
    const { error } = await supabaseAdmin
      .from('follow_requests')
      .delete()
      .eq('requester_id', requesterId)
      .eq('target_id', user.id);

    if (error) throw error;

    // Clean up notification
    await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('actor_id', requesterId)
      .eq('type', 'follow_request');

    return { success: true };
  } catch (err: any) {
    console.error('[rejectFollowRequestDB] error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Bulk accept pending follow requests for the current user.
 */
export async function bulkAcceptFollowRequestsDB(requesterIds: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    await Promise.allSettled(
      requesterIds.map((rid) => acceptFollowRequestNewDB(rid))
    );

    return { success: true };
  } catch (err: any) {
    console.error('[bulkAcceptFollowRequestsDB] error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Bulk reject all pending follow requests for the current user.
 */
export async function bulkRejectFollowRequestsDB(requesterIds: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    await Promise.allSettled(
      requesterIds.map((rid) => rejectFollowRequestDB(rid))
    );

    return { success: true };
  } catch (err: any) {
    console.error('[bulkRejectFollowRequestsDB] error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get the current follow request status from the current user → target.
 * Returns: 'none' | 'pending' | 'accepted' | 'rejected'
 */
export async function getFollowRequestStatusDB(
  targetId: string
): Promise<{ status: 'none' | 'pending' | 'accepted' | 'rejected'; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { status: 'none' };

    const { data, error } = await supabaseAdmin
      .from('follow_requests')
      .select('status')
      .eq('requester_id', user.id)
      .eq('target_id', targetId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { status: 'none' };

    return { status: data.status as 'pending' | 'accepted' | 'rejected' };
  } catch (err: any) {
    console.error('[getFollowRequestStatusDB] error:', err.message);
    return { status: 'none', error: err.message };
  }
}

/**
 * Get all incoming pending follow requests for the current user.
 */
export async function getIncomingFollowRequestsDB(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data, error } = await supabaseAdmin
      .from('follow_requests')
      .select('id, requester_id, created_at')
      .eq('target_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return { success: true, data: [] };

    const requesterIds = data.map((d: any) => d.requester_id);
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, username, display_name, avatar_url, is_verified')
      .in('id', requesterIds);

    if (usersError) throw usersError;

    const enriched = data.map((d: any) => {
      const u = usersData?.find((x: any) => x.id === d.requester_id);
      return {
        id: d.id,
        createdAt: d.created_at,
        requester: u || { id: d.requester_id, username: 'user', display_name: 'User', avatar_url: null },
      };
    });

    return { success: true, data: enriched };
  } catch (err: any) {
    console.error('[getIncomingFollowRequestsDB] error:', err.message);
    return { success: false, error: err.message };
  }
}

export async function getProfilePostsDB(
  targetUserId: string
): Promise<{ success: boolean; posts?: any[]; isPrivateLocked?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const requesterId = currentUser?.id || null;

    // 1. Fetch target user's is_private status
    const { data: targetUser, error: uErr } = await supabaseAdmin
      .from('users')
      .select('id, is_private')
      .eq('id', targetUserId)
      .maybeSingle();

    if (uErr) throw uErr;
    if (!targetUser) return { success: false, error: 'User not found' };

    // 2. Enforce privacy: must be an ACCEPTED follower (not pending)
    if (targetUser.is_private && requesterId !== targetUserId) {
      const isApproved = requesterId ? await isFollowingDB(requesterId, targetUserId) : false;
      if (!isApproved) {
        return { success: true, posts: [], isPrivateLocked: true };
      }
    }

    // 3. Fetch posts
    const { data, error } = await supabaseAdmin
      .from('posts')
      .select('*, author:users!posts_author_id_fkey(*)')
      .eq('author_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch saves
    let savedPostIds = new Set<string>();
    if (requesterId) {
      const { data: saves } = await supabaseAdmin
        .from('saves')
        .select('post_id')
        .eq('user_id', requesterId);
      if (saves) savedPostIds = new Set(saves.map((s: any) => s.post_id));
    }

    const posts = (data || []).map((p: any) => ({
      ...p,
      mediaUrls: p.media_urls || [],
      likeCount: p.like_count || 0,
      commentCount: p.comment_count || 0,
      isPinned: p.is_pinned || false,
      isSaved: savedPostIds.has(p.id),
      author: {
        id: p.author?.id,
        username: p.author?.username,
        displayName: p.author?.display_name,
        avatar: p.author?.avatar_url,
        securityScore: p.author?.security_score || 0,
      },
    })).filter((p: any) => {
      if (p.metadata?.is_repost === true) return false;
      const isArchived = p.content?.includes('[ 🚫 archived ]');
      if (!isArchived) return true;
      return p.author_id === requesterId;
    });

    return { success: true, posts };
  } catch (err: any) {
    console.error('[getProfilePostsDB] error:', err.message);
    return { success: false, error: err.message };
  }
}

export async function getProfileRepostsDB(
  targetUserId: string
): Promise<{ success: boolean; posts?: any[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const requesterId = currentUser?.id || null;

    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('is_private')
      .eq('id', targetUserId)
      .maybeSingle();

    if (targetUser?.is_private && requesterId !== targetUserId) {
      const isApproved = requesterId ? await isFollowingDB(requesterId, targetUserId) : false;
      if (!isApproved) return { success: true, posts: [] };
    }

    const { data, error } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('author_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const repostRows = (data || []).filter((p: any) => p.metadata?.is_repost === true);
    if (repostRows.length === 0) return { success: true, posts: [] };

    const originalPostIds = repostRows.map((r: any) => r.metadata.original_post_id);
    const { data: originalPostsData, error: origError } = await supabaseAdmin
      .from('posts')
      .select('*, author:users!posts_author_id_fkey(*)')
      .in('id', originalPostIds);

    if (origError) throw origError;

    const originalPostsMap = new Map(originalPostsData.map((p: any) => [p.id, p]));

    let savedPostIds = new Set<string>();
    if (requesterId) {
      const { data: saves } = await supabaseAdmin
        .from('saves')
        .select('post_id')
        .eq('user_id', requesterId);
      if (saves) savedPostIds = new Set(saves.map((s: any) => s.post_id));
    }

    const posts = repostRows.map((row: any) => {
      const orig = originalPostsMap.get(row.metadata.original_post_id) as any;
      if (!orig) return null;
      const isArchived = orig.content?.includes('[ 🚫 archived ]');
      if (isArchived && orig.author_id !== requesterId) return null;
      return {
        ...orig,
        mediaUrls: orig.media_urls || [],
        likeCount: orig.like_count || 0,
        commentCount: orig.comment_count || 0,
        isSaved: savedPostIds.has(orig.id),
        author: {
          id: orig.author?.id,
          username: orig.author?.username,
          displayName: orig.author?.display_name,
          avatar: orig.author?.avatar_url,
          securityScore: orig.author?.security_score || 0,
        },
      };
    }).filter(Boolean);

    return { success: true, posts };
  } catch (err: any) {
    console.error('[getProfileRepostsDB] error:', err.message);
    return { success: false, error: err.message };
  }
}

export async function getSavedPostsDB(): Promise<{ success: boolean; posts?: any[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const requesterId = user.id;
    const followingIds = new Set(await getFollowingIdsDB(requesterId));

    const { data: blocks } = await supabaseAdmin
      .from('blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${requesterId},blocked_id.eq.${requesterId}`);

    const blockedUserIds = new Set<string>();
    if (blocks) {
      for (const b of blocks) {
        blockedUserIds.add(b.blocker_id === requesterId ? b.blocked_id : b.blocker_id);
      }
    }

    const { data, error } = await supabaseAdmin
      .from('saves')
      .select('post_id, posts(*, author:users!posts_author_id_fkey(*))')
      .eq('user_id', user.id);

    if (error) throw error;
    if (!data) return { success: true, posts: [] };

    const posts = data
      .filter((s: any) => s.posts && s.posts.author)
      .map((s: any) => ({
        ...s.posts,
        mediaUrls: s.posts.media_urls || [],
        likeCount: s.posts.like_count || 0,
        commentCount: s.posts.comment_count || 0,
        isPinned: s.posts.is_pinned || false,
        isSaved: true,
        isAuthorPrivate: s.posts.author?.is_private || false,
        author: {
          id: s.posts.author.id,
          username: s.posts.author.username,
          displayName: s.posts.author.display_name,
          avatar: s.posts.author.avatar_url,
          securityScore: s.posts.author.security_score || 0,
        },
      }))
      .filter((p: any) => {
        const authorId = p.author_id;
        if (authorId === requesterId) return true;
        if (blockedUserIds.has(authorId)) return false;
        if (p.isAuthorPrivate && !followingIds.has(authorId)) return false;
        const isArchived = p.content?.includes('[ 🚫 archived ]');
        if (isArchived) return false;
        return true;
      });

    return { success: true, posts };
  } catch (err: any) {
    console.error('[getSavedPostsDB] error:', err.message);
    return { success: false, error: err.message };
  }
}
