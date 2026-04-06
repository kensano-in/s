'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Validates if the username is unique in the sovereign database.
 */
export async function checkUsernameUniqueness(username: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('users').select('id').eq('username', username).limit(1);
  return { isUnique: !data || data.length === 0 };
}

/**
 * Updates comprehensive user profile info and recalculates completeness via trigger.
 */
export async function updateProfileInfo(userId: string, data: {
  display_name?: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
  phone?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('users')
    .update({
      display_name: data.display_name,
      username: data.username,
      bio: data.bio,
      avatar_url: data.avatar_url,
      phone: data.phone,
    })
    .eq('id', userId);

  if (error) {
    if (error.code === '23505') return { error: 'Username already taken' };
    return { error: error.message };
  }

  revalidatePath('/settings');
  revalidatePath('/profile');
  return { success: true };
}

/**
 * Updates enhanced security, privacy, and notification preferences in the 'users' table.
 */
export async function updateUserSettings(userId: string, data: {
  messaging_permission?: 'everyone' | 'followers' | 'none';
  activity_visibility?: boolean;
  is_private?: boolean;
  push_notifs_enabled?: boolean;
  email_digest_enabled?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return { error: 'Unauthorized' };

  const { error } = await supabase
      .from('users')
      .update({
          messaging_permission: data.messaging_permission,
          activity_visibility: data.activity_visibility,
          is_private: data.is_private,
          push_notifs_enabled: data.push_notifs_enabled,
          email_digest_enabled: data.email_digest_enabled
      })
      .eq('id', userId);

  if (error) return { error: error.message };
  revalidatePath('/settings');
  return { success: true };
}

/**
 * Blocking System Logic
 */
export async function blockUser(userId: string, targetId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('blocked_users').insert({ user_id: userId, blocked_user_id: targetId });
    if (error) return { error: error.message };
    return { success: true };
}

export async function unblockUser(userId: string, targetId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('blocked_users').delete().match({ user_id: userId, blocked_user_id: targetId });
    if (error) return { error: error.message };
    return { success: true };
}

export async function getBlockedUsers(userId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('blocked_users')
        .select(`
            blocked_user_id,
            blocked:users!blocked_user_id (id, username, display_name, avatar_url)
        `)
        .eq('user_id', userId);
    
    if (error) return { error: error.message };
    return { success: true, users: data.map((d: any) => d.blocked) };
}

/**
 * MFA Status Check
 */
export async function getMFAStatus(userId: string) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error) return { error: error.message };
    
    const factors = data?.user?.factors || [];
    const activeFactor = factors.find((f: any) => f.status === 'verified');
    
    return { 
        success: true, 
        isActive: !!activeFactor, 
        factorId: activeFactor?.id 
    };
}

/**
 * Session Management
 */
export async function getActiveSessions(userId: string) {
    // For real production sessions, we fetch from a custom logins log or the current auth user
    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authErr) return { error: authErr.message };

    const lastSignIn = authUser.user.last_sign_in_at;
    const deviceInfo = authUser.user.user_metadata?.device || 'Sovereign Node Proxy';

    return { 
        success: true, 
        sessions: [
            { id: 'sess-active', ip: '192.168.1.1', device: deviceInfo, status: 'Active Hub', lastActive: lastSignIn }
        ] 
    };
}

export async function logoutSession(userId: string, sessionId: string) {
    // In Supabase, if we want to logout a specific session, we use admin.signOut(token)
    // or admin.updateUserById(id, { ban_duration: ... }) which is harsh.
    // We'll use signOut to clear the user.
    const { error } = await supabaseAdmin.auth.admin.signOut(userId);
    if (error) return { error: error.message };
    return { success: true };
}

/**
 * Account Deletion Security Flow
 */
export async function deleteAccountPermanently(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return { error: 'Unauthorized' };

  const { error: dbErr } = await supabaseAdmin.from('users').delete().eq('id', userId);
  if (dbErr) return { error: dbErr.message };

  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authErr) return { error: authErr.message };

  return { success: true };
}
