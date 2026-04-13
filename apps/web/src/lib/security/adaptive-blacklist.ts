/**
 * L8 — ADAPTIVE BLACKLIST ENGINE
 * Logs every rejected username attempt to the database.
 * Enables pattern mining and auto-expansion of blocklist over time.
 */

import { createServiceClient } from '@/lib/supabase/service';

export interface RejectionRecord {
  raw: string;
  normalized: string;
  blocked_by: string;
  reason?: string;
  risk_score?: number;
  ip_address?: string;
  fingerprint?: string;
}

/**
 * Persists a rejected username attempt to the adaptive log.
 * Non-blocking — errors are swallowed so rejection is never delayed.
 */
export async function logRejectedUsername(record: RejectionRecord): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from('rejected_usernames').insert({
      raw: record.raw.slice(0, 100),         // cap length
      normalized: record.normalized.slice(0, 100),
      blocked_by: record.blocked_by,
      reason: record.reason?.slice(0, 500),
      risk_score: record.risk_score ?? 0,
      ip_address: record.ip_address,
      fingerprint: record.fingerprint,
    });
  } catch (err) {
    // Silent — never let logging block the response
    console.error('[L8] Failed to log rejected username:', err);
  }
}

/**
 * Checks if a normalized username has been rejected before (adaptive memory).
 * If the same username was previously blocked by AI (L7), hard-blocks immediately.
 */
export async function checkAdaptiveBlacklist(normalized: string): Promise<{ blocked: boolean; reason?: string }> {
  try {
    const supabase = createServiceClient();
    
    // Check if this exact normalized form was previously AI-blocked (highest confidence)
    const { data } = await supabase
      .from('rejected_usernames')
      .select('blocked_by, reason, risk_score')
      .eq('normalized', normalized)
      .gte('risk_score', 60)        // only trust high-confidence past rejections
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      return {
        blocked: true,
        reason: `Adaptive block: previously flagged by ${data.blocked_by} — ${data.reason}`
      };
    }

    return { blocked: false };
  } catch (err) {
    console.error('[L8] Adaptive blacklist check failed:', err);
    return { blocked: false }; // fail open
  }
}
