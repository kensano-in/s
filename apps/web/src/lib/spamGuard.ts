import { isActionRestricted, getDetailedRestrictionsState, recordActivityAndCheckSpam, submitModerationAppeal } from './moderationEngine';
import { cookies } from 'next/headers';
import { createAdminClient } from './supabase/admin';

// Helper to get restrictions from cookies (UX only)
async function getRestrictionsFromCookie(): Promise<any[]> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get('user_restrictions');
    if (!cookie?.value) return [];
    const restrictions = JSON.parse(cookie.value);
    if (!Array.isArray(restrictions)) return [];
    
    // Filter out expired restrictions
    const now = Date.now();
    return restrictions.filter((r: any) => new Date(r.expires_at).getTime() > now);
  } catch (err) {
    return [];
  }
}

// Helper to set restrictions in cookies (UX only)
async function setRestrictionsInCookie(restrictions: any[]): Promise<void> {
  try {
    const cookieStore = await cookies();
    let maxExpiry = 0;
    restrictions.forEach((r: any) => {
      const expiry = new Date(r.expires_at).getTime();
      if (expiry > maxExpiry) maxExpiry = expiry;
    });
    
    if (maxExpiry > Date.now()) {
      cookieStore.set('user_restrictions', JSON.stringify(restrictions), {
        expires: new Date(maxExpiry),
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'lax'
      });
    }
  } catch (err) {
    console.warn('[SpamGuard] Failed to write restrictions cookie:', err);
  }
}

/**
 * Checks if a user has an active restriction of a given type.
 * Server-authoritative: always checks the database.
 */
export async function isUserRestricted(userId: string, restrictionType: string): Promise<boolean> {
  if (!userId) return false;
  return await isActionRestricted(userId, restrictionType);
}

/**
 * RESTRICTS a user from all interactive app features.
 * Used as a manual trigger or fallback.
 */
export async function restrictUserDB(userId: string): Promise<void> {
  if (!userId) return;

  const now = new Date();
  const restrictions = [
    { user_id: userId, restriction_type: 'messages', expires_at: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString() },
    { user_id: userId, restriction_type: 'calls', expires_at: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString() },
    { user_id: userId, restriction_type: 'reactions', expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() },
    { user_id: userId, restriction_type: 'comments', expires_at: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString() },
    { user_id: userId, restriction_type: 'posts', expires_at: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString() },
    { user_id: userId, restriction_type: 'stories', expires_at: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString() },
    { user_id: userId, restriction_type: 'group_creation', expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() },
  ];

  await setRestrictionsInCookie(restrictions);

  try {
    const supabase = createAdminClient();
    await supabase.from('user_restrictions').insert(restrictions);
  } catch (err: any) {
    console.warn(`[SpamGuard] DB connection exception storing restrictions:`, err.message);
  }
}

/**
 * Retrieves all currently active restrictions for a user.
 */
export async function getActiveRestrictions(userId: string): Promise<any[]> {
  if (!userId) return [];

  // Read from database
  let dbRestrictions: any[] = [];
  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('user_restrictions')
      .select('restriction_type, expires_at')
      .eq('user_id', userId)
      .gt('expires_at', now);

    if (error) {
      console.warn(`[SpamGuard] DB fetch restrictions warning for user ${userId}:`, error.message);
    } else if (data) {
      dbRestrictions = data;
    }
  } catch (err: any) {
    console.warn(`[SpamGuard] DB connection exception fetching restrictions:`, err.message);
  }

  return dbRestrictions.map(r => ({
    restriction_type: r.restriction_type,
    expires_at: r.expires_at
  }));
}

