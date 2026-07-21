/**
 * L9 — RATE LIMIT ENGINE
 * Sliding-window rate limiter for username availability checks.
 * Max 5 attempts per IP per minute. Exceeding = temp ban (15 min).
 * Repeated violations escalate to L10 threat scoring.
 */

import { createServiceClient } from '@/lib/supabase/service';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000;          // 1 minute window
const BAN_DURATION_MS = 15 * 60 * 1000; // 15 min temp ban on exceed

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: Date;
  bannedUntil?: Date;
  reason?: string;
}

/**
 * Checks and increments the rate limit for a given IP.
 * Returns whether the request is allowed and remaining quota.
 */
export async function checkUsernameRateLimit(ip: string, fingerprint?: string): Promise<RateLimitResult> {
  // Skip rate limiting for unknown IPs (avoid false bans in dev)
  if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip === '::1') {
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  try {
    const supabase = createServiceClient();
    const now = new Date();
    const windowStart = new Date(Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS);

    // 1. Check for active ban first
    const { data: bannedRow } = await supabase
      .from('username_rate_limits')
      .select('banned_until')
      .eq('ip_address', ip)
      .not('banned_until', 'is', null)
      .gte('banned_until', now.toISOString())
      .order('banned_until', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bannedRow?.banned_until) {
      return {
        allowed: false,
        remaining: 0,
        bannedUntil: new Date(bannedRow.banned_until),
        reason: `Too many attempts. Try again after ${new Date(bannedRow.banned_until).toLocaleTimeString()}.`
      };
    }

    // 2. Get or create the current window bucket
    const { data: existing } = await supabase
      .from('username_rate_limits')
      .select('id, attempts')
      .eq('ip_address', ip)
      .eq('window_start', windowStart.toISOString())
      .maybeSingle();

    if (!existing) {
      // First attempt in this window
      await supabase.from('username_rate_limits').insert({
        ip_address: ip,
        fingerprint,
        attempts: 1,
        window_start: windowStart.toISOString(),
      });
      return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
    }

    const newAttempts = existing.attempts + 1;

    if (newAttempts > MAX_ATTEMPTS) {
      // Exceeded — apply temp ban
      const bannedUntil = new Date(now.getTime() + BAN_DURATION_MS);
      await supabase
        .from('username_rate_limits')
        .update({ attempts: newAttempts, banned_until: bannedUntil.toISOString(), updated_at: now.toISOString() })
        .eq('id', existing.id);

      console.warn(`[L9] Rate limit EXCEEDED for IP ${ip} — banned until ${bannedUntil.toISOString()}`);

      return {
        allowed: false,
        remaining: 0,
        bannedUntil,
        reason: `Rate limit exceeded. Banned for 15 minutes.`
      };
    }

    // Increment the counter
    await supabase
      .from('username_rate_limits')
      .update({ attempts: newAttempts, updated_at: now.toISOString() })
      .eq('id', existing.id);

    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - newAttempts,
      resetAt: new Date(windowStart.getTime() + WINDOW_MS)
    };

  } catch (err) {
    console.error('[L9] Rate limit check failed:', err);
    return { allowed: true, remaining: MAX_ATTEMPTS }; // fail open
  }
}
