'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';

const ADMIN_PASSPHRASE = process.env.ADMIN_PASSPHRASE || 'VERLYN_PRIME_2026';

export async function verifyAdminPassphrase(formData: FormData) {
  const input = formData.get('passphrase') as string;
  if (input !== ADMIN_PASSPHRASE) {
    return { success: false, error: 'ACCESS DENIED: Invalid passphrase.' };
  }
  return { success: true };
}

export async function escalateUserToPrime(formData: FormData) {
  const passphrase = formData.get('passphrase') as string;
  if (passphrase !== ADMIN_PASSPHRASE) return { error: 'Unauthorized.' };

  const username = (formData.get('username') as string)?.toLowerCase().trim();
  if (!username) return { error: 'Username is required.' };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('users')
    .update({ role: 'PRIME' })
    .eq('username', username)
    .select('username, role');

  if (error) return { error: `DB Error: ${error.message}` };
  if (!data || data.length === 0) return { error: `User @${username} not found in the sovereign registry.` };

  return { success: true, user: data[0] };
}

export async function demoteUserToPublic(formData: FormData) {
  const passphrase = formData.get('passphrase') as string;
  if (passphrase !== ADMIN_PASSPHRASE) return { error: 'Unauthorized.' };

  const username = (formData.get('username') as string)?.toLowerCase().trim();
  if (!username) return { error: 'Username is required.' };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('users')
    .update({ role: 'PUBLIC' })
    .eq('username', username)
    .select('username, role');

  if (error) return { error: `DB Error: ${error.message}` };
  if (!data || data.length === 0) return { error: `User @${username} not found in the sovereign registry.` };

  return { success: true, user: data[0] };
}

export async function getAllUsers() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('users')
    .select('id, username, display_name, role, created_at, karma_score')
    .order('created_at', { ascending: false });
  
  if (error) return { error: error.message };
  return { users: data };
}
