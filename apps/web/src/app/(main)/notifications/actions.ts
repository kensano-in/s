'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select(`
      id, user_id, actor_id, type, entity_id, entity_type, body, is_read, created_at,
      actor:users!notifications_actor_id_fkey(id, username, display_name, avatar_url)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('fetchNotifications error:', error.message);
    return [];
  }
  return (data || []) as unknown as DBNotification[];
}

// Mark a single notification as read
export async function markNotificationRead(notifId: string, userId: string) {
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notifId)
    .eq('user_id', userId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Mark ALL notifications as read for a user
export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
