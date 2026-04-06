'use server';

import { createClient } from '@/lib/supabase/server';

import { createClient as createAdminClient } from '@supabase/supabase-js';

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

    // Use Admin Client to permanently write to identity and bypass table RLS
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // 1. Force write to the public users table first
    const { error } = await supabaseAdmin
      .from('users')
      .update(dbPayload)
      .eq('id', userId);

    if (error) {
      console.error('[Supabase Update Error]:', error);
      throw error;
    }
    
    // 2. Force write to the user metadata so hydration doesn't overwrite it on refresh
    if (updates.avatarUrl !== undefined || updates.displayName !== undefined) {
      const metaUpdates: any = {};
      if (updates.avatarUrl !== undefined) metaUpdates.avatar_url = updates.avatarUrl;
      if (updates.displayName !== undefined) metaUpdates.full_name = updates.displayName;
      
      await supabaseAdmin.auth.admin.updateUserById(userId, { user_metadata: metaUpdates });
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
