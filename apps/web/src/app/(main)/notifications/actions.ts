'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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

export interface DBNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'dm' | 'community' | 'system' | 'award';
  entity_id: string | null;
  entity_type: string | null;
  body: string;
  is_read: boolean;
  created_at: string;
  actor: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

// Phase 6: Fetch real notifications from DB, joining actor profile
export async function fetchNotifications(userId: string): Promise<DBNotification[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const actualUserId = user.id;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select(`
        id, user_id, actor_id, type, entity_id, entity_type, body, is_read, created_at,
        actor:users!notifications_actor_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('user_id', actualUserId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('fetchNotifications error:', error.message);
      return [];
    }
    return (data || []) as unknown as DBNotification[];
  } catch (err) {
    console.error('fetchNotifications fatal error:', err);
    return [];
  }
}

// Mark a single notification as read
export async function markNotificationRead(notifId: string, userId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    const actualUserId = user.id;

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notifId)
      .eq('user_id', actualUserId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Mark ALL notifications as read for a user
export async function markAllNotificationsRead(userId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    const actualUserId = user.id;

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', actualUserId)
      .eq('is_read', false);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


// Batch fetch comment content for multiple notifications in 2 efficient database calls
export async function batchFetchCommentContentsForNotifications(
  items: Array<{ notifId: string; postId: string; actorId: string }>
): Promise<Record<string, string>> {
  if (!items || items.length === 0) return {};
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const postIds = Array.from(new Set(items.map(i => i.postId)));
    const { data: allowedPosts } = await supabase
      .from('posts')
      .select('id')
      .in('id', postIds);

    if (!allowedPosts || allowedPosts.length === 0) return {};
    const allowedPostIdSet = new Set(allowedPosts.map(p => p.id));

    const validItems = items.filter(i => allowedPostIdSet.has(i.postId));
    if (validItems.length === 0) return {};

    const validPostIds = Array.from(new Set(validItems.map(i => i.postId)));
    const { data: comments } = await supabaseAdmin
      .from('comments')
      .select('post_id, author_id, content, created_at')
      .in('post_id', validPostIds)
      .order('created_at', { ascending: false });

    if (!comments || comments.length === 0) return {};

    const resultMap: Record<string, string> = {};
    for (const item of validItems) {
      const match = comments.find(
        (c: any) => c.post_id === item.postId && c.author_id === item.actorId
      );
      if (match && match.content) {
        resultMap[item.notifId] = (match.content as string).replace(/^\[reply:[^\]]+\]\s*/, '');
      }
    }
    return resultMap;
  } catch (err) {
    console.error('batchFetchCommentContentsForNotifications error:', err);
    return {};
  }
}

// Fetch the actual comment text for a comment/mention notification using admin client (bypasses RLS)
export async function fetchCommentContentForNotification(
  postId: string,
  actorId: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Verify user can read the target post (respects blocks/privacy RLS)
    const { data: post, error: postErr } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .maybeSingle();

    if (postErr || !post) {
      return { success: false, error: 'Access denied to this post' };
    }

    const { data, error } = await supabaseAdmin
      .from('comments')
      .select('content')
      .eq('post_id', postId)
      .eq('author_id', actorId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('fetchCommentContentForNotification error:', error.message);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, error: 'no_comment' };
    }

    let content = data[0].content as string;
    // Strip [reply:xxx] prefix if present
    content = content.replace(/^\[reply:[^\]]+\]\s*/, '');

    return { success: true, content };
  } catch (err: any) {
    console.error('fetchCommentContentForNotification fatal:', err);
    return { success: false, error: err.message };
  }
}

// Submit a quick reply to a post comment inline from notifications
export async function sendInlineNotificationReply(postId: string, replyText: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        content: replyText,
      });

    if (error) {
      console.error('sendInlineNotificationReply error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('sendInlineNotificationReply fatal error:', err);
    return { success: false, error: err.message };
  }
}

// Delete a single notification permanently
export async function deleteNotification(notifId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', notifId)
      .eq('user_id', user.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Delete a batch of notifications permanently
export async function deleteNotifications(notifIds: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .in('id', notifIds)
      .eq('user_id', user.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Delete all read notifications for the current user
export async function clearReadNotifications(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('is_read', true);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

