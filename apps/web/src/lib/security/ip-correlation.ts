/**
 * ═══════════════════════════════════════════════════════════════
 *  L10 — IP & DEVICE CORRELATION ENGINE (PRODUCTION GRADE)
 *  Multi-dimensional attacker tracking across IPs and sessions.
 *
 *  CAPABILITIES:
 *  1. Cumulative threat scoring (persistent across sessions)
 *  2. Velocity detection (burst attacks in short windows)
 *  3. Fingerprint correlation (same device = same attacker, diff IPs)
 *  4. Escalation tiers (warn → soft ban → hard ban)
 *  5. Full audit trail to security_events table
 *
 *  THREAT SCORE WEIGHTS:
 *    governance_block  → +5   (simple blocklist hit)
 *    adaptive_block    → +20  (known repeat attacker pattern)
 *    rate_limit        → +10  (flooding the system)
 *    ai_block          → +15  (AI confirmed malicious)
 *    ai_suspicious     → +25  (AI flagged — highest signal)
 *
 *  ESCALATION TIERS:
 *    Score  0–39  → CLEAN
 *    Score 40–69  → ELEVATED (extra logging, no action)
 *    Score 70–99  → SOFT BAN (15-min cooldown on every check)
 *    Score 100+   → HARD BAN (permanent, manual review required)
 *
 *  VELOCITY RULE:
 *    >= 3 block events in 5 minutes from same IP → immediate SOFT BAN
 *    >= 5 block events in 5 minutes → immediate HARD BAN
 * ═══════════════════════════════════════════════════════════════
 */

import { createServiceClient } from '@/lib/supabase/service';

// ─── Types ────────────────────────────────────────────────────

export type ThreatEventType =
  | 'governance_block'   // L2-L6: rule matched
  | 'ai_block'           // L7: AI confirmed block
  | 'ai_suspicious'      // L7: AI suspicious flag (high weight)
  | 'rate_limit'         // L9: flooding detected
  | 'adaptive_block';    // L8: known repeat attacker

export type ThreatTier = 'CLEAN' | 'ELEVATED' | 'SOFT_BAN' | 'HARD_BAN';

export interface ThreatResult {
  hardBanned: boolean;
  tier: ThreatTier;
  threatScore: number;
  reason?: string;
  softBanUntil?: Date;
}

// ─── Configuration ────────────────────────────────────────────

const THREAT_WEIGHTS: Record<ThreatEventType, number> = {
  governance_block: 5,
  rate_limit: 10,
  ai_block: 15,
  adaptive_block: 20,
  ai_suspicious: 25,
};

const TIERS = {
  ELEVATED: 40,
  SOFT_BAN: 70,
  HARD_BAN: 100,
} as const;

// Velocity: block events within last N minutes
const VELOCITY_WINDOW_MINUTES = 5;
const VELOCITY_SOFT_BAN_THRESHOLD = 3;  // 3 blocks in 5 min → soft ban
const VELOCITY_HARD_BAN_THRESHOLD = 5; // 5 blocks in 5 min → instant hard ban
const SOFT_BAN_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function getTier(score: number): ThreatTier {
  if (score >= TIERS.HARD_BAN) return 'HARD_BAN';
  if (score >= TIERS.SOFT_BAN) return 'SOFT_BAN';
  if (score >= TIERS.ELEVATED) return 'ELEVATED';
  return 'CLEAN';
}

function isLocalIp(ip: string): boolean {
  return !ip || ip === 'unknown' || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.');
}

// ─── Main Functions ───────────────────────────────────────────

/**
 * Checks if an IP (or its correlated fingerprint) is banned.
 * Runs FIRST before any other pipeline check — zero wasted cycles.
 */
export async function checkIPThreatStatus(ip: string, fingerprint?: string): Promise<ThreatResult> {
  if (isLocalIp(ip)) return { hardBanned: false, tier: 'CLEAN', threatScore: 0 };

  try {
    const supabase = createServiceClient();

    // Primary: Check by IP
    const { data: byIp } = await supabase
      .from('ip_threat_scores')
      .select('threat_score, hard_banned, soft_ban_until, ban_reason')
      .eq('ip_address', ip)
      .maybeSingle();

    // Secondary: Check by fingerprint (catches VPN hopping)
    let byFingerprint: any = null;
    if (fingerprint) {
      const { data } = await supabase
        .from('ip_threat_scores')
        .select('threat_score, hard_banned, soft_ban_until, ban_reason, ip_address')
        .eq('fingerprint', fingerprint)
        .eq('hard_banned', true)
        .neq('ip_address', ip) // different IP, same device
        .limit(1)
        .maybeSingle();
      byFingerprint = data;
    }

    // Hard ban — IP or device fingerprint
    if (byIp?.hard_banned || byFingerprint?.hard_banned) {
      return {
        hardBanned: true,
        tier: 'HARD_BAN',
        threatScore: byIp?.threat_score ?? 999,
        reason: 'Your access has been permanently suspended due to repeated security violations.'
      };
    }

    // Soft ban — check if still in cooldown window
    if (byIp?.soft_ban_until && new Date(byIp.soft_ban_until) > new Date()) {
      return {
        hardBanned: false,
        tier: 'SOFT_BAN',
        threatScore: byIp.threat_score,
        softBanUntil: new Date(byIp.soft_ban_until),
        reason: `Too many suspicious attempts. Try again after ${new Date(byIp.soft_ban_until).toLocaleTimeString()}.`
      };
    }

    const score = byIp?.threat_score ?? 0;
    return { hardBanned: false, tier: getTier(score), threatScore: score };

  } catch (err) {
    console.error('[L10] Threat status check failed:', err);
    return { hardBanned: false, tier: 'CLEAN', threatScore: 0 }; // fail open
  }
}

/**
 * Records a threat event and applies escalation logic.
 * Also runs velocity detection to catch burst attacks.
 */
export async function recordIPThreatEvent(
  ip: string,
  eventType: ThreatEventType,
  details?: { fingerprint?: string; username?: string; reason?: string }
): Promise<ThreatResult> {
  if (isLocalIp(ip)) return { hardBanned: false, tier: 'CLEAN', threatScore: 0 };

  try {
    const supabase = createServiceClient();
    const weight = THREAT_WEIGHTS[eventType];
    const now = new Date();
    const nowIso = now.toISOString();

    // ── 1. Get or create threat record ──────────────────────────
    const { data: existing } = await supabase
      .from('ip_threat_scores')
      .select('id, threat_score, block_count, suspicious_count, hard_banned, soft_ban_until, velocity_events, fingerprint')
      .eq('ip_address', ip)
      .maybeSingle();

    // Already hard-banned — short circuit
    if (existing?.hard_banned) {
      return { hardBanned: true, tier: 'HARD_BAN', threatScore: existing.threat_score, reason: 'IP permanently banned.' };
    }

    // ── 2. Calculate new base score ──────────────────────────────
    const currentScore = existing?.threat_score ?? 0;
    const newScore = currentScore + weight;

    // ── 3. Velocity Detection ────────────────────────────────────
    // velocity_events = JSON array of timestamps of recent block events
    const isBlockEvent = ['governance_block', 'ai_block', 'adaptive_block', 'rate_limit'].includes(eventType);
    const velocityWindow = new Date(now.getTime() - VELOCITY_WINDOW_MINUTES * 60 * 1000);
    
    let velocityEvents: string[] = existing?.velocity_events ?? [];
    if (isBlockEvent) {
      // Add current event and prune old ones outside window
      velocityEvents = [...velocityEvents, nowIso].filter(ts => new Date(ts) > velocityWindow);
    }

    const recentBlocks = velocityEvents.length;
    const velocityHardBan = recentBlocks >= VELOCITY_HARD_BAN_THRESHOLD;
    const velocitySoftBan = recentBlocks >= VELOCITY_SOFT_BAN_THRESHOLD;

    // ── 4. Determine escalation ──────────────────────────────────
    const scoreHardBan = newScore >= TIERS.HARD_BAN;
    const scoreSoftBan = newScore >= TIERS.SOFT_BAN;

    const shouldHardBan = scoreHardBan || velocityHardBan;
    const softBanUntil = (velocitySoftBan || scoreSoftBan) && !shouldHardBan
      ? new Date(now.getTime() + SOFT_BAN_DURATION_MS)
      : null;

    const banReason = shouldHardBan
      ? velocityHardBan
        ? `Velocity hard ban: ${recentBlocks} blocks in ${VELOCITY_WINDOW_MINUTES}min (event: ${eventType}, username: "${details?.username}")`
        : `Score hard ban: ${newScore}pts from ${eventType} — "${details?.username}"`
      : null;

    const newBlockCount = (existing?.block_count ?? 0) + (isBlockEvent ? 1 : 0);
    const newSuspiciousCount = (existing?.suspicious_count ?? 0) + (eventType === 'ai_suspicious' ? 1 : 0);

    // ── 5. Upsert the record ─────────────────────────────────────
    if (existing) {
      await supabase.from('ip_threat_scores').update({
        threat_score: newScore,
        block_count: newBlockCount,
        suspicious_count: newSuspiciousCount,
        fingerprint: details?.fingerprint ?? existing.fingerprint ?? null,
        last_seen: nowIso,
        velocity_events: velocityEvents,
        hard_banned: shouldHardBan,
        hard_banned_at: shouldHardBan ? nowIso : null,
        soft_ban_until: softBanUntil?.toISOString() ?? null,
        ban_reason: banReason,
      }).eq('id', existing.id);
    } else {
      await supabase.from('ip_threat_scores').insert({
        ip_address: ip,
        fingerprint: details?.fingerprint,
        threat_score: newScore,
        block_count: newBlockCount,
        suspicious_count: newSuspiciousCount,
        last_seen: nowIso,
        velocity_events: velocityEvents,
        hard_banned: shouldHardBan,
        hard_banned_at: shouldHardBan ? nowIso : null,
        soft_ban_until: softBanUntil?.toISOString() ?? null,
        ban_reason: banReason,
      });
    }

    // ── 6. Log critical escalations to security_events ──────────
    if (shouldHardBan || velocitySoftBan) {
      const severity = shouldHardBan ? 'critical' : 'high';
      try {
        await supabase.from('security_events').insert({
          event_type: shouldHardBan ? 'ip_hard_banned' : 'ip_soft_banned_velocity',
          severity,
          ip_address: ip,
          payload: {
            threat_score: newScore,
            velocity_events: recentBlocks,
            trigger_event: eventType,
            username: details?.username,
            reason: banReason,
            fingerprint: details?.fingerprint,
          }
        });
      } catch { /* non-blocking */ }
    }

    if (shouldHardBan) {
      console.error(`[L10] 🚨 HARD BAN: IP=${ip} score=${newScore} velocity=${recentBlocks} event=${eventType} username="${details?.username}"`);
    } else if (velocitySoftBan) {
      console.warn(`[L10] ⚠️ SOFT BAN: IP=${ip} velocity=${recentBlocks} blocks in ${VELOCITY_WINDOW_MINUTES}min`);
    }

    const tier = getTier(newScore);
    return {
      hardBanned: shouldHardBan,
      tier: shouldHardBan ? 'HARD_BAN' : softBanUntil ? 'SOFT_BAN' : tier,
      threatScore: newScore,
      softBanUntil: softBanUntil ?? undefined,
    };

  } catch (err) {
    console.error('[L10] Threat recording failed:', err);
    return { hardBanned: false, tier: 'CLEAN', threatScore: 0 };
  }
}

// Backwards compatible alias used in actions.ts
export { checkIPThreatStatus as checkIPHardBan };
