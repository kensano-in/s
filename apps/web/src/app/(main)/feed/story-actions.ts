'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getBlockedIdsArray } from '@/lib/blockUtils';
import { isUserRestricted } from '@/lib/spamGuard';
import { recordActivityAndCheckSpam } from '@/lib/moderationEngine';

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

// Phase 7: Create a new story
export async function createStory(userId: string, mediaUrl: string, mediaType: 'image' | 'video') {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    const actualUserId = user.id;

    if (await isUserRestricted(actualUserId, 'stories')) {
      return { success: false, error: 'You are restricted from posting stories due to spamming.' };
    }

    const spamResult = await recordActivityAndCheckSpam(actualUserId, 'create_post', mediaUrl);
    if (spamResult.blocked) {
      if (spamResult.warning) {
        return { success: false, error: `Warning: ${spamResult.warning}` };
      }
      return { success: false, error: 'You are restricted from posting stories due to spamming.' };
    }

    const { data, error } = await supabaseAdmin
      .from('stories')
      .insert({
        author_id: actualUserId,
        media_url: mediaUrl,
        media_type: mediaType,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;
    revalidatePath('/feed');
    return { success: true, storyId: data.id };
  } catch (err: any) {
    console.error('createStory error:', err.message);
    return { success: false, error: err.message };
  }
}

// Record that a user has viewed a story
export async function markStoryViewed(storyId: string, userId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    const actualUserId = user.id;

    // Upsert — safe to call multiple times
    await supabaseAdmin
      .from('story_views')
      .upsert({ story_id: storyId, user_id: actualUserId }, { onConflict: 'story_id,user_id' });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Cleanup expired stories
export async function cleanExpiredStories() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { error } = await supabaseAdmin
      .from('stories')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
    revalidatePath('/feed');
    return { success: true };
  } catch (err: any) {
    console.error('cleanExpiredStories error:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Fetch active stories, excluding blocked/blocking users ──────────────────
export async function fetchStoriesDB() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get current user's block list (both directions)
    const blockedIds = user ? await getBlockedIdsArray(supabase, user.id) : null;

    let excludeAuthorIds = blockedIds ? [...blockedIds] : [];
    if (user) {
      try {
        const mutedUsernames = user.user_metadata?.muted_users || [];
        const restrictedUsernames = user.user_metadata?.restricted_users || [];
        const combinedUsernames = [...new Set([...mutedUsernames, ...restrictedUsernames])];

        if (combinedUsernames.length > 0) {
          const { data: usersToExclude } = await supabaseAdmin
            .from('users')
            .select('id')
            .in('username', combinedUsernames);
          if (usersToExclude && usersToExclude.length > 0) {
            const excludedIds = usersToExclude.map((u: any) => u.id);
            excludeAuthorIds = [...new Set([...excludeAuthorIds, ...excludedIds])];
          }
        }
      } catch (err: any) {
        console.error('[fetchStoriesDB] Failed to resolve muted/restricted user IDs:', err.message);
      }
    }

    let query = supabaseAdmin
      .from('stories')
      .select('id, author_id, media_url, media_type, view_count, expires_at, created_at, author:users!stories_author_id_fkey(id, username, display_name, avatar_url, security_score), music:story_music(id, track_id, track_name, artist_name, artwork_url, preview_url, source, start_time, duration)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(60);

    // Enforce block, mute & restrict: hide stories from blocked, muted or restricted users
    if (excludeAuthorIds.length > 0) {
      query = (query as any).not('author_id', 'in', `(${excludeAuthorIds.join(',')})`);
    }

    const { data, error } = await query;
    if (error) return { success: false as const, data: [] };

    let filteredStories = data || [];
    if (user && filteredStories.length > 0) {
      // Get unique author IDs
      const authorIds = [...new Set(filteredStories.map((s: any) => s.author_id).filter(Boolean))];
      
      const { data: privateUsers } = await supabaseAdmin
        .from('users')
        .select('id')
        .in('id', authorIds)
        .eq('is_private', true);

      const privateAuthorIds = (privateUsers || []).map((u: any) => u.id);

      if (privateAuthorIds.length > 0) {
        // Find which private users the current user follows
        const { data: followRecords } = await supabaseAdmin
          .from('followers')
          .select('following_id')
          .eq('follower_id', user.id)
          .in('following_id', privateAuthorIds);

        const followedPrivateIds = (followRecords || []).map((f: any) => f.following_id);

        filteredStories = filteredStories.filter((s: any) => {
          if (privateAuthorIds.includes(s.author_id)) {
            return s.author_id === user.id || followedPrivateIds.includes(s.author_id);
          }
          return true;
        });
      }
    } else if (!user && filteredStories.length > 0) {
      // Anonymous users cannot see stories from private accounts
      const authorIds = [...new Set(filteredStories.map((s: any) => s.author_id).filter(Boolean))];
      const { data: privateUsers } = await supabaseAdmin
        .from('users')
        .select('id')
        .in('id', authorIds)
        .eq('is_private', true);

      const privateAuthorIds = (privateUsers || []).map((u: any) => u.id);

      if (privateAuthorIds.length > 0) {
        filteredStories = filteredStories.filter((s: any) => !privateAuthorIds.includes(s.author_id));
      }
    }

    return { success: true as const, data: filteredStories };
  } catch (err: any) {
    console.error('fetchStoriesDB error:', err.message);
    return { success: false as const, data: [] };
  }
}

export async function attachMusicToStory(
  storyId: string,
  track: {
    id: string;
    name: string;
    artist: string;
    albumArtUrl?: string;
    previewUrl?: string;
  },
  startTime: number = 0,
  duration: number = 15
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Verify ownership of the story
    const { data: story } = await supabaseAdmin
      .from('stories')
      .select('author_id')
      .eq('id', storyId)
      .maybeSingle();

    if (!story) return { success: false, error: 'Story not found.' };
    if (story.author_id !== user.id) return { success: false, error: 'Unauthorized: You do not own this story.' };

    const { error } = await supabaseAdmin
      .from('story_music')
      .insert({
        story_id: storyId,
        track_id: track.id,
        track_name: track.name,
        artist_name: track.artist,
        artwork_url: track.albumArtUrl || null,
        preview_url: track.previewUrl || null,
        source: 'spotify',
        start_time: startTime,
        duration: duration,
      });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('attachMusicToStory error:', err.message);
    return { success: false, error: err.message };
  }
}
