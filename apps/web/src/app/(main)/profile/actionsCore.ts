'use server';

import { createClient } from '@/lib/supabase/server';

export interface ProfileSyncPayload {
  displayName?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  theme?: string;
}

export async function submitProfileUpdateDB(userId: string, updates: ProfileSyncPayload) {
  try {
    const dbPayload: Record<string, unknown> = {};
    if (updates.displayName !== undefined) dbPayload.display_name = updates.displayName;
    if (updates.username !== undefined) dbPayload.username = updates.username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (updates.bio !== undefined) dbPayload.bio = updates.bio;
    if (updates.avatarUrl !== undefined) dbPayload.avatar_url = updates.avatarUrl;
    if (updates.theme !== undefined) dbPayload.theme = updates.theme;

    if (Object.keys(dbPayload).length === 0) return { success: true };

    const supabase = await createClient();
    const { error } = await supabase
      .from('users')
      .update(dbPayload)
      .eq('id', userId);

    if (error) {
      console.error('[Supabase Update Error]:', error);
      throw error;
    }
    
    return { success: true };
  } catch (err: any) {
    console.error('Core sync failure on Supabase Tunnel:', err.message);
    return { success: false, error: err.message };
  }
}

export async function getDatabaseProfile(userId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await (await supabase)
      .from('users')
      .select('avatar_url, display_name, username, bio')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
