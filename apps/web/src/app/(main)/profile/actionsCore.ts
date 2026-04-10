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
    if (updates.username !== undefined) {
      // 1. Force lowercase
      let sanitized = updates.username.toLowerCase();
      // 2. Allow letters, numbers, underscores, and periods only
      sanitized = sanitized.replace(/[^a-z0-9_.]/g, '');
      
      // 3. Validation: Cannot end with a period
      if (sanitized.endsWith('.')) {
        return { success: false, error: "You can't end your username with a period." };
      }
      
      dbPayload.username = sanitized;
    }
    if (updates.bio !== undefined) dbPayload.bio = updates.bio;
    if (updates.avatarUrl !== undefined) dbPayload.avatar_url = updates.avatarUrl;
    if (updates.theme !== undefined) dbPayload.theme = updates.theme;

    if (Object.keys(dbPayload).length === 0) return { success: true };

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // 1. Force write to the public users table
    const { error } = await supabaseAdmin
      .from('users')
      .update(dbPayload)
      .eq('id', userId);

    if (error) throw error;
    
    // 2. Force write to the user metadata
    if (updates.avatarUrl !== undefined || updates.displayName !== undefined) {
      const metaUpdates: any = {};
      if (updates.avatarUrl !== undefined) metaUpdates.avatar_url = updates.avatarUrl;
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
      const existingMeta = userData.user?.user_metadata || {};
      
      await supabaseAdmin.auth.admin.updateUserById(userId, { 
        user_metadata: { ...existingMeta, ...metaUpdates } 
      });
    }
    
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getDatabaseProfile(userId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('users')
      .select('avatar_url, display_name, username, bio, security_score, profile_completeness, role, is_verified, karma_score, follower_count, following_count')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
