/**
 * ═══════════════════════════════════════════════════════════════
 *  TRUST SCORE ENGINE
 *  Tracks user behavior and modifies trust scoring dynamically.
 *  Trust ranges: 0 (banned) → 100 (fully trusted)
 *  New users start at 50.
 * ═══════════════════════════════════════════════════════════════
 */

import { createClient } from '@/lib/supabase/server';

export type TrustEvent =
  | 'post_approved'
  | 'post_blocked'
  | 'post_removed_by_mod'
  | 'comment_approved'
  | 'comment_blocked'
  | 'report_confirmed'        // A report they filed was valid
  | 'report_false'            // A report they filed was abuse
  | 'received_valid_report'   // Someone reported them and it was upheld
  | 'received_false_report'   // Someone reported them but it was bogus
  | 'account_age_bonus'       // 30 days milestone
  | 'bot_behavior_detected'
  | 'login_from_new_device'
  | 'successful_verification';

const TRUST_DELTA: Record<TrustEvent, number> = {
  post_approved: +2,
  post_blocked: -10,
  post_removed_by_mod: -15,
  comment_approved: +1,
  comment_blocked: -5,
  report_confirmed: +3,
  report_false: -8,
  received_valid_report: -12,
  received_false_report: +1,
  account_age_bonus: +5,
  bot_behavior_detected: -25,
  login_from_new_device: -2,
  successful_verification: +10,
};

/** Thresholds that drive automatic actions */
export const TRUST_THRESHOLDS = {
  SHADOW_BAN: 20,      // < 20: shadow banned
  RESTRICTED: 30,      // < 30: restricted (can post but flagged for review)
  NORMAL: 50,          // 50: default
  TRUSTED: 75,         // >= 75: trusted (reporting privileges, bypasses review)
  PRIME: 90,           // >= 90: prime (shown as verified-quality)
};

export function getTrustTier(score: number): 'banned' | 'shadow_ban' | 'restricted' | 'normal' | 'trusted' | 'prime' {
  if (score <= 0) return 'banned';
  if (score < TRUST_THRESHOLDS.SHADOW_BAN) return 'shadow_ban';
  if (score < TRUST_THRESHOLDS.RESTRICTED) return 'restricted';
  if (score < TRUST_THRESHOLDS.TRUSTED) return 'normal';
  if (score < TRUST_THRESHOLDS.PRIME) return 'trusted';
  return 'prime';
}

/**
 * Apply a trust delta for a user. Clamped to [0, 100].
 * Run server-side only (needs service client ideally).
 */
export async function applyTrustEvent(userId: string, event: TrustEvent): Promise<{ newScore: number; tier: string }> {
  const supabase = await createClient();
  const delta = TRUST_DELTA[event];

  // Fetch current trust
  const { data: user } = await supabase
    .from('users')
    .select('trust_score')
    .eq('id', userId)
    .single();

  const current = user?.trust_score ?? 50;
  const next = Math.min(100, Math.max(0, current + delta));

  await supabase
    .from('users')
    .update({ trust_score: next })
    .eq('id', userId);

  // Log the event
  try {
    await supabase.from('trust_events').insert({
      user_id: userId,
      event_type: event,
      delta,
      score_before: current,
      score_after: next,
    }).throwOnError();
  } catch (err) {
    // Non-fatal if table missing
  }

  return { newScore: next, tier: getTrustTier(next) };
}

/**
 * Get trust score for a user (lightweight, read-only)
 */
export async function getUserTrustScore(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('trust_score')
    .eq('id', userId)
    .single();
  return data?.trust_score ?? 50;
}
