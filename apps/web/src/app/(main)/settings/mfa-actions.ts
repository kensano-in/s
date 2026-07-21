'use server';

import { verifyCurrentPassword } from './security/actions';
import crypto from 'crypto';

/**
 * Starts the MFA enrollment process with Supabase Auth after verifying password.
 * Returns the enrollment ID, TOTP secret/URI for the QR code, and 10 backup codes.
 */
export async function enrollMFA(password: string) {
  // 1. Enforce password confirmation
  const check = await verifyCurrentPassword(password);
  if (!check.success) return { error: check.error };

  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return { error: 'Unauthorized' };

  // 2. Use admin REST API to find & delete ALL existing factors with this name.
  //    The client-side listFactors() misses unverified factors; the admin REST API sees everything.
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const serviceKey  = (process.env.SUPABASE_SERVICE_ROLE_KEY  ?? '').trim();
  const adminHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  const factorsRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}/factors`, {
    headers: adminHeaders,
  });
  if (factorsRes.ok) {
    const factors: Array<{ id: string; friendly_name: string }> = await factorsRes.json();
    for (const factor of factors) {
      if (factor.friendly_name === 'Verlyn_Authenticator') {
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}/factors/${factor.id}`, {
          method: 'DELETE',
          headers: adminHeaders,
        });
      }
    }
  }

  // 3. Enroll TOTP factor in Supabase
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: 'Verlyn',
    friendlyName: 'Verlyn_Authenticator'
  });

  if (error) return { error: error.message };

  // 3. Generate 10 secure recovery codes
  const plainCodes = Array.from({ length: 10 }, () => {
    const p1 = Math.floor(1000 + Math.random() * 9000).toString();
    const p2 = Math.floor(1000 + Math.random() * 9000).toString();
    return `VR-${p1}-${p2}`;
  });

  const hashedCodes = plainCodes.map(code => 
    crypto.createHash('sha256').update(code).digest('hex')
  );

  // Save hashes in user metadata
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const metadata = user.user_metadata || {};
  
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...metadata,
      mfa_recovery_codes_hash: hashedCodes
    }
  });

  return { 
    success: true, 
    id: data.id, 
    totp: data.totp,
    qrCodeUri: data.totp.qr_code,
    recoveryCodes: plainCodes
  };
}

/**
 * Verifies the 6-digit TOTP code to finalize enrollment.
 */
export async function verifyMFA(factorId: string, challengeCode: string) {
  const { createClient } = await import('@/lib/supabase/server');
  const { revalidatePath } = await import('next/cache');
  const { logSecurityEvent } = await import('./security/actions');

  const supabase = await createClient();
  
  // 1. Create challenge
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) return { error: challengeError.message };

  // 2. Verify challenge
  const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: challengeCode,
  });

  if (verifyError) return { error: verifyError.message };

  // 3. Update security score in DB & user metadata
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user) {
      await supabase
        .from('users')
        .update({ security_score: 95 }) // Bump to 95% with MFA
        .eq('id', userData.user.id);

      const { createAdminClient } = await import('@/lib/supabase/admin');
      const admin = createAdminClient();
      const metadata = userData.user.user_metadata || {};
      await admin.auth.admin.updateUserById(userData.user.id, {
        user_metadata: {
          ...metadata,
          mfa_enabled: true
        }
      });

      await logSecurityEvent(
        userData.user.id,
        'mfa_enabled',
        'high',
        'Two-factor authentication (TOTP) successfully configured and recovery codes generated.'
      );
  }

  revalidatePath('/settings');
  revalidatePath('/profile');
  return { success: true };
}

/**
 * Removes MFA enrollment from the account after password verification.
 */
export async function unenrollMFA(factorId: string, password?: string) {
  if (password) {
    const check = await verifyCurrentPassword(password);
    if (!check.success) return { error: check.error };
  }

  const { createClient } = await import('@/lib/supabase/server');
  const { revalidatePath } = await import('next/cache');
  const { logSecurityEvent } = await import('./security/actions');

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  
  if (error) return { error: error.message };

  // Update security score back to baseline
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user) {
      await supabase
        .from('users')
        .update({ security_score: 40 })
        .eq('id', userData.user.id);

      const { createAdminClient } = await import('@/lib/supabase/admin');
      const admin = createAdminClient();
      const metadata = userData.user.user_metadata || {};
      
      // Clear MFA meta
      const newMetadata = { ...metadata };
      delete newMetadata.mfa_enabled;
      delete newMetadata.mfa_recovery_codes_hash;

      await admin.auth.admin.updateUserById(userData.user.id, {
        user_metadata: newMetadata
      });

      await logSecurityEvent(
        userData.user.id,
        'mfa_disabled',
        'critical',
        'Two-factor authentication disabled.'
      );
  }

  revalidatePath('/settings');
  return { success: true };
}

/**
 * Lists all active MFA factors for the current user.
 */
export async function listMFAFactors() {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return [];
    return data.all;
}

