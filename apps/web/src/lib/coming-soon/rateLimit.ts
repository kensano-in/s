/**
 * VERLYN — Production Rate Limiter
 * Sliding-window algorithm. Thread-safe for single-process Next.js servers.
 * For multi-process / edge deployments, replace the Map with Redis.
 */

interface WindowEntry {
  hits:      number[];   // unix timestamps in ms
  blocked:   boolean;
  blockUntil?: number;
}

const store = new Map<string, WindowEntry>();

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      const stale = entry.hits.every(h => now - h > 60 * 60 * 1000); // 1h old
      if (stale && (!entry.blocked || (entry.blockUntil && now > entry.blockUntil))) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  /** Max requests in the window */
  limit:      number;
  /** Window duration in milliseconds */
  windowMs:   number;
  /** If exceeded, block for this many ms (0 = no extra block) */
  blockMs?:   number;
}

export interface RateLimitResult {
  allowed:    boolean;
  remaining:  number;
  resetAt:    number;  // unix ms when window resets
  retryAfter?: number; // seconds to wait if blocked
}

/**
 * Sliding-window rate limiter.
 * @param key   Unique key (e.g. `ip:endpoint` or `email:action`)
 * @param cfg   Rate limit configuration
 */
export function rateLimit(key: string, cfg: RateLimitConfig): RateLimitResult {
  // Bypass rate limits completely during local development to prevent restriction
  if (process.env.NODE_ENV !== 'production') {
    return {
      allowed:    true,
      remaining:  cfg.limit,
      resetAt:    Date.now() + cfg.windowMs,
    };
  }

  const now = Date.now();
  const { limit, windowMs, blockMs = 0 } = cfg;
  const windowStart = now - windowMs;

  let entry = store.get(key);

  // If currently hard-blocked
  if (entry?.blocked && entry.blockUntil && now < entry.blockUntil) {
    return {
      allowed:    false,
      remaining:  0,
      resetAt:    entry.blockUntil,
      retryAfter: Math.ceil((entry.blockUntil - now) / 1000),
    };
  }

  if (!entry) {
    entry = { hits: [], blocked: false };
    store.set(key, entry);
  }

  // Unblock if block expired
  if (entry.blocked && entry.blockUntil && now >= entry.blockUntil) {
    entry.blocked = false;
    entry.blockUntil = undefined;
    entry.hits = [];
  }

  // Prune hits outside the window
  entry.hits = entry.hits.filter(h => h > windowStart);

  // Check limit
  if (entry.hits.length >= limit) {
    if (blockMs > 0 && !entry.blocked) {
      entry.blocked = true;
      entry.blockUntil = now + blockMs;
    }
    const resetAt = entry.blockUntil ?? (entry.hits[0] + windowMs);
    return {
      allowed:    false,
      remaining:  0,
      resetAt,
      retryAfter: Math.ceil((resetAt - now) / 1000),
    };
  }

  // Allow and record hit
  entry.hits.push(now);
  const oldest = entry.hits[0];
  return {
    allowed:   true,
    remaining: limit - entry.hits.length,
    resetAt:   oldest + windowMs,
  };
}

// ── Pre-configured limiters ──────────────────────────────────────────────────

/** Support ticket submission: 3 per 24h per IP */
export const supportTicketLimiter = (ip: string) =>
  rateLimit(`support:${ip}`, { limit: 3, windowMs: 24 * 60 * 60 * 1000, blockMs: 24 * 60 * 60 * 1000 });

/** Pre-registration: 3 attempts per 10m per IP */
export const preRegisterLimiter = (ip: string) =>
  rateLimit(`prereg:${ip}`, { limit: 3, windowMs: 10 * 60 * 1000, blockMs: 30 * 60 * 1000 });

/** OTP send: 5 per 15m per email */
export const otpLimiter = (email: string) =>
  rateLimit(`otp:${email}`, { limit: 5, windowMs: 15 * 60 * 1000, blockMs: 60 * 60 * 1000 });

/** Admin API: 60 per min per IP */
export const adminApiLimiter = (ip: string) =>
  rateLimit(`admin:${ip}`, { limit: 60, windowMs: 60 * 1000 });

/** Global brute-force protection: 200 req/min per IP */
export const globalLimiter = (ip: string) =>
  rateLimit(`global:${ip}`, { limit: 200, windowMs: 60 * 1000, blockMs: 15 * 60 * 1000 });
