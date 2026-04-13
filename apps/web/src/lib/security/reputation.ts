import { createAdminClient } from '../supabase/admin';

export type ReputationStatus = 'CLEAN' | 'SUSPICIOUS';

/**
 * Verlyn Silent Security: Reputation Database Intelligence
 * Checks if an IP address has a history of failed login attempts.
 */
export async function getIpReputation(ip: string): Promise<ReputationStatus> {
  const supabase = await createAdminClient();
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  try {
    // Count failed login attempts from this IP in the last 15 minutes
    const { count, error } = await supabase
      .from('security_events')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .eq('event_type', 'failed_login')
      .gt('created_at', fifteenMinutesAgo);

    if (error) {
      console.error('[Security] Reputation check error:', error);
      // Fallback: Default to SUSPICIOUS for unknown state to be safe
      return 'SUSPICIOUS';
    }

    const failedCount = count || 0;
    
    // Threshold: 3 failed attempts in 15 minutes triggers the hCaptcha challenge
    if (failedCount >= 3) {
      console.warn(`[Security] IP ${ip} marked as SUSPICIOUS (${failedCount} failures)`);
      return 'SUSPICIOUS';
    }

    return 'CLEAN';
  } catch (err) {
    console.error('[Security] Unexpected error in reputation engine:', err);
    return 'SUSPICIOUS';
  }
}
