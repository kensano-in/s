'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Starts the MFA enrollment process with Supabase Auth.
 * Returns the enrollment ID and the TOTP secret/URI for the QR code.
 */
export async function enrollMFA() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: 'Verlyn Sovereign',
    friendlyName: 'Node_Authenticator'
  });

  if (error) return { error: error.message };
  return { 
    success: true, 
    id: data.id, 
    totp: data.totp,
    qrCodeUri: data.totp.qr_code
  };
}

/**
 * Verifies the 6-digit TOTP code to finalize enrollment.
 */
export async function verifyMFA(factorId: string, challengeCode: string) {
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

  // 3. Update security score in DB if available
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user) {
      await supabase
        .from('users')
        .update({ security_score: 80 }) // Bump to 80% with MFA
        .eq('id', userData.user.id);
  }

  revalidatePath('/settings');
  revalidatePath('/profile');
  return { success: true };
}

/**
 * Removes MFA enrollment from the account.
 */
export async function unenrollMFA(factorId: string) {
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
  }

  revalidatePath('/settings');
  return { success: true };
}

/**
 * Lists all active MFA factors for the current user.
 */
export async function listMFAFactors() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return [];
    return data.all;
}
