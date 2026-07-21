'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const ADMIN_PASSPHRASE = process.env.ADMIN_PASSPHRASE;

async function verifyAdminRole(): Promise<boolean> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    return profile?.role?.toLowerCase() === 'admin';
  } catch (err) {
    console.error('Error verifying admin role:', err);
    return false;
  }
}

export async function verifyAdminPassphrase(formData: FormData) {
  const input = formData.get('passphrase') as string;
  if (input !== ADMIN_PASSPHRASE) {
    return { success: false, error: 'ACCESS DENIED: Invalid passphrase.' };
  }
  const isAdmin = await verifyAdminRole();
  if (!isAdmin) {
    return { success: false, error: 'ACCESS DENIED: You are not authorized as an administrator.' };
  }
  return { success: true };
}

export async function escalateUserToPrime(formData: FormData) {
  const passphrase = formData.get('passphrase') as string;
  if (passphrase !== ADMIN_PASSPHRASE) return { error: 'Unauthorized.' };
  
  const isAdmin = await verifyAdminRole();
  if (!isAdmin) return { error: 'Forbidden.' };

  const username = (formData.get('username') as string)?.toLowerCase().trim();
  if (!username) return { error: 'Username is required.' };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('users')
    .update({ role: 'PRIME' })
    .eq('username', username)
    .select('username, role');

  if (error) return { error: `DB Error: ${error.message}` };
  if (!data || data.length === 0) return { error: `User @${username} not found in the user database.` };

  return { success: true, user: data[0] };
}

export async function demoteUserToPublic(formData: FormData) {
  const passphrase = formData.get('passphrase') as string;
  if (passphrase !== ADMIN_PASSPHRASE) return { error: 'Unauthorized.' };

  const isAdmin = await verifyAdminRole();
  if (!isAdmin) return { error: 'Forbidden.' };

  const username = (formData.get('username') as string)?.toLowerCase().trim();
  if (!username) return { error: 'Username is required.' };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('users')
    .update({ role: 'PUBLIC' })
    .eq('username', username)
    .select('username, role');

  if (error) return { error: `DB Error: ${error.message}` };
  if (!data || data.length === 0) return { error: `User @${username} not found in the user database.` };

  return { success: true, user: data[0] };
}

export async function getAllUsers() {
  const isAdmin = await verifyAdminRole();
  if (!isAdmin) return { error: 'Forbidden.' };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('users')
    .select('id, username, display_name, role, created_at, karma_score')
    .order('created_at', { ascending: false });
  
  if (error) return { error: error.message };
  return { users: data };
}

// ─── Get all reports ──────────────────────────────────────────────────────────
export async function getReports() {
  const isAdmin = await verifyAdminRole();
  if (!isAdmin) return { error: 'Forbidden.' };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('reports')
    .select('*, reporter:reporter_id(username, display_name), reported_user:reported_user_id(username, display_name)')
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { reports: data };
}

// ─── Update report status ─────────────────────────────────────────────────────
export async function updateReportStatus(reportId: string, status: string) {
  const isAdmin = await verifyAdminRole();
  if (!isAdmin) return { error: 'Forbidden.' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('reports')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', reportId);

  if (error) return { error: error.message };
  return { success: true };
}

// ─── Ban / Unban a user ───────────────────────────────────────────────────────
export async function setBanStatus(userId: string, isBanned: boolean) {
  const isAdmin = await verifyAdminRole();
  if (!isAdmin) return { error: 'Forbidden.' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('users')
    .update({ is_banned: isBanned })
    .eq('id', userId);

  if (error) return { error: error.message };
  return { success: true };
}

// ─── Get pending stickers ─────────────────────────────────────────────────────
export async function getPendingStickers() {
  const isAdmin = await verifyAdminRole();
  if (!isAdmin) return { error: 'Forbidden.' };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('stickers')
    .select('*, uploader:uploader_id(username, display_name)')
    .eq('status', 'PENDING_REVIEW')
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { stickers: data };
}

// ─── Approve or reject sticker ────────────────────────────────────────────────
export async function updateStickerStatus(stickerId: string, status: 'APPROVED' | 'REJECTED') {
  const isAdmin = await verifyAdminRole();
  if (!isAdmin) return { error: 'Forbidden.' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('stickers')
    .update({ status, is_public: status === 'APPROVED' })
    .eq('id', stickerId);

  if (error) return { error: error.message };
  return { success: true };
}
