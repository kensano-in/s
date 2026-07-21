/**
 * ═══════════════════════════════════════════════════════════════
 *  BOT BEHAVIOR DETECTOR
 *  Detects rapid actions, unnatural patterns, scripted behavior.
 *  Uses in-memory sliding window per IP + userId.
 * ═══════════════════════════════════════════════════════════════
 */

interface ActionLog {
  timestamps: number[];
  contentHashes: string[];
}

// In-memory store (resets on cold start — acceptable for edge bot detection)
const actionStore = new Map<string, ActionLog>();

/**
 * Simple string hash for deduplication
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash.toString(36);
}

/**
 * Record an action and evaluate for bot behavior.
 * Returns bot probability (0–100).
 */
export function evaluateBotRisk(params: {
  actorId: string; // userId or IP
  actionType: 'post' | 'comment' | 'like' | 'follow' | 'message' | 'report';
  contentSnippet?: string;
}): { riskScore: number; signals: string[]; isBot: boolean } {
  const key = `${params.actorId}:${params.actionType}`;
  const now = Date.now();
  const signals: string[] = [];
  let riskScore = 0;

  // Get or init log
  const log = actionStore.get(key) ?? { timestamps: [], contentHashes: [] };

  // Prune entries older than 60 seconds
  log.timestamps = log.timestamps.filter(t => now - t < 60_000);
  log.contentHashes = log.contentHashes.slice(-20); // Keep last 20

  // Record this action
  log.timestamps.push(now);
  if (params.contentSnippet) {
    log.contentHashes.push(simpleHash(params.contentSnippet));
  }
  actionStore.set(key, log);

  // ── Signal 1: Velocity (actions per minute) ────────────────
  const actionsPerMin = log.timestamps.length;
  const limits: Record<string, number> = {
    post: 5, comment: 10, like: 30, follow: 15, message: 20, report: 3
  };
  const limit = limits[params.actionType] || 10;
  if (actionsPerMin > limit) {
    const excess = actionsPerMin - limit;
    const velocityScore = Math.min(60, excess * 10);
    riskScore += velocityScore;
    signals.push(`velocity:${actionsPerMin}_per_min_exceeds_${limit}`);
  }

  // ── Signal 2: Duplicate content detection ──────────────────
  if (params.contentSnippet && log.contentHashes.length > 1) {
    const lastHash = log.contentHashes[log.contentHashes.length - 1];
    const duplicates = log.contentHashes.slice(0, -1).filter(h => h === lastHash).length;
    if (duplicates >= 2) {
      riskScore += Math.min(40, duplicates * 15);
      signals.push(`duplicate_content:${duplicates}_repeats`);
    }
  }

  // ── Signal 3: Sub-second burst ─────────────────────────────
  if (log.timestamps.length >= 3) {
    const last3 = log.timestamps.slice(-3);
    const span = last3[last3.length - 1] - last3[0];
    if (span < 1000) {
      riskScore += 30;
      signals.push('burst:3_actions_under_1s');
    }
  }

  // ── Signal 4: Perfectly uniform intervals (bot pacing) ────
  if (log.timestamps.length >= 5) {
    const intervals = [];
    for (let i = 1; i < log.timestamps.length; i++) {
      intervals.push(log.timestamps[i] - log.timestamps[i - 1]);
    }
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    // Coefficient of variation < 0.05 → nearly robotic regularity
    if (mean > 0 && stdDev / mean < 0.05) {
      riskScore += 25;
      signals.push('timing:robotic_regularity');
    }
  }

  const capped = Math.min(100, riskScore);
  return { riskScore: capped, signals, isBot: capped >= 70 };
}

/**
 * Reset a user's action log (call after successful human verification)
 */
export function resetBotLog(actorId: string): void {
  for (const key of actionStore.keys()) {
    if (key.startsWith(`${actorId}:`)) actionStore.delete(key);
  }
}
