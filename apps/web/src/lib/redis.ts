/**
 * ─── Verlyn Redis Client ───────────────────────────────────────────────────────
 *
 * Usage:
 *   import { redis, CacheKeys, TTL } from '@/lib/redis';
 *
 * Keys are namespaced to avoid collisions between environments.
 * All operations are typed with explicit TTLs so nothing lives forever.
 *
 * Redis is opt-in: if REDIS_URL is not set (dev, CI) every call silently no-ops
 * so the app stays functional without a Redis instance.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { ex?: number; nx?: boolean }): Promise<'OK' | null>;
  del(...keys: string[]): Promise<number>;
  zadd(key: string, score: number, member: string): Promise<number>;
  zrange(key: string, start: number, stop: number, options?: { rev?: boolean }): Promise<string[]>;
  zincrby(key: string, increment: number, member: string): Promise<string>;
  expire(key: string, seconds: number): Promise<number>;
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<number>;
  hgetall(key: string): Promise<Record<string, string> | null>;
  incr(key: string): Promise<number>;
  pipeline(): RedisPipeline;
}

interface RedisPipeline {
  get(key: string): RedisPipeline;
  set(key: string, value: string, options?: { ex?: number }): RedisPipeline;
  del(...keys: string[]): RedisPipeline;
  zadd(key: string, score: number, member: string): RedisPipeline;
  expire(key: string, seconds: number): RedisPipeline;
  exec(): Promise<unknown[]>;
}

// ── No-op stub (dev fallback) ─────────────────────────────────────────────────

class NoOpRedis implements RedisClient {
  async get() { return null; }
  async set() { return 'OK' as const; }
  async del() { return 0; }
  async zadd() { return 0; }
  async zrange() { return []; }
  async zincrby() { return '0'; }
  async expire() { return 0; }
  async hget() { return null; }
  async hset() { return 0; }
  async hgetall() { return null; }
  async incr() { return 0; }
  pipeline(): RedisPipeline {
    const noop: RedisPipeline = {
      get: () => noop,
      set: () => noop,
      del: () => noop,
      zadd: () => noop,
      expire: () => noop,
      async exec() { return []; },
    };
    return noop;
  }
}

// ── Real Upstash-compatible client ────────────────────────────────────────────

let _redis: RedisClient;

function buildClient(): RedisClient {
  const url = process.env.REDIS_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.REDIS_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url) {
    return new NoOpRedis();
  }

  // Dynamic import so the bundle doesn't break if @upstash/redis isn't installed
  // We'll implement a thin HTTP wrapper for Upstash REST API as a zero-dep option
  return new UpstashHttpRedis(url, token ?? '');
}

// ── Upstash REST API thin client ──────────────────────────────────────────────

class UpstashHttpRedis implements RedisClient {
  constructor(private readonly url: string, private readonly token: string) {}

  private async exec<T>(command: unknown[]): Promise<T> {
    const res = await fetch(`${this.url}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
      // Edge runtime compatible
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`[Redis] HTTP ${res.status}: ${await res.text()}`);
    const json = await res.json();
    return json.result as T;
  }

  async get(key: string) {
    return this.exec<string | null>(['GET', key]);
  }

  async set(key: string, value: string, options: { ex?: number; nx?: boolean } = {}) {
    const args: unknown[] = ['SET', key, value];
    if (options.ex) args.push('EX', options.ex);
    if (options.nx) args.push('NX');
    return this.exec<'OK' | null>(args);
  }

  async del(...keys: string[]) {
    return this.exec<number>(['DEL', ...keys]);
  }

  async zadd(key: string, score: number, member: string) {
    return this.exec<number>(['ZADD', key, score, member]);
  }

  async zrange(key: string, start: number, stop: number, options: { rev?: boolean } = {}) {
    const args: unknown[] = options.rev
      ? ['ZRANGE', key, stop, start, 'BYSCORE', 'REV']
      : ['ZRANGE', key, start, stop];
    return this.exec<string[]>(args);
  }

  async zincrby(key: string, increment: number, member: string) {
    return this.exec<string>(['ZINCRBY', key, increment, member]);
  }

  async expire(key: string, seconds: number) {
    return this.exec<number>(['EXPIRE', key, seconds]);
  }

  async hget(key: string, field: string) {
    return this.exec<string | null>(['HGET', key, field]);
  }

  async hset(key: string, field: string, value: string) {
    return this.exec<number>(['HSET', key, field, value]);
  }

  async hgetall(key: string) {
    const result = await this.exec<Record<string, string> | null>(['HGETALL', key]);
    return result;
  }

  async incr(key: string) {
    return this.exec<number>(['INCR', key]);
  }

  pipeline(): RedisPipeline {
    const commands: unknown[][] = [];
    const self = this;
    const pipe: RedisPipeline = {
      get(key) { commands.push(['GET', key]); return pipe; },
      set(key, value, opts = {}) {
        const args: unknown[] = ['SET', key, value];
        if (opts.ex) args.push('EX', opts.ex);
        commands.push(args);
        return pipe;
      },
      del(...keys) { commands.push(['DEL', ...keys]); return pipe; },
      zadd(key, score, member) { commands.push(['ZADD', key, score, member]); return pipe; },
      expire(key, seconds) { commands.push(['EXPIRE', key, seconds]); return pipe; },
      async exec() {
        const res = await fetch(self.url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${self.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(commands),
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`[Redis pipeline] HTTP ${res.status}`);
        const json = await res.json();
        return (json as Array<{ result: unknown }>).map(r => r.result);
      },
    };
    return pipe;
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export function getRedis(): RedisClient {
  if (!_redis) _redis = buildClient();
  return _redis;
}

export const redis = new Proxy({} as RedisClient, {
  get(_target, prop) {
    return (getRedis() as any)[prop].bind(getRedis());
  },
});

// ── Key Namespaces ────────────────────────────────────────────────────────────

export const CacheKeys = {
  /** Session token → userId (avoids DB on every request) */
  session: (token: string) => `v:sess:${token}`,

  /** User profile snapshot */
  userProfile: (userId: string) => `v:user:${userId}:profile`,

  /** Hot chat thread — last N messages in a conversation */
  chatThread: (convId: string) => `v:chat:${convId}:hot`,

  /** Conversation metadata (isGroup, participants) */
  convMeta: (convId: string) => `v:chat:${convId}:meta`,

  /** Unread count per user per conversation */
  unreadCount: (userId: string, convId: string) => `v:unread:${userId}:${convId}`,

  /** Leaderboard snapshot for karma rankings */
  leaderboard: () => `v:lb:karma`,

  /** Feed page cache for a given (userId, tab, cursor) */
  feedPage: (userId: string, tab: string, cursor: string) =>
    `v:feed:${userId}:${tab}:${cursor || 'first'}`,

  /** Notification unread badge count */
  notifCount: (userId: string) => `v:notif:${userId}:unread`,

  /** Rate limit counter */
  rateLimit: (userId: string, action: string) => `v:rl:${userId}:${action}`,
} as const;

// ── TTL Constants (seconds) ───────────────────────────────────────────────────

export const TTL = {
  SESSION: 60 * 60 * 24 * 7,    // 7 days
  USER_PROFILE: 60 * 5,          // 5 minutes
  CHAT_THREAD: 60 * 2,           // 2 minutes (high churn)
  CONV_META: 60 * 60,            // 1 hour
  FEED_PAGE: 60,                 // 1 minute
  LEADERBOARD: 60 * 5,           // 5 minutes
  NOTIF_COUNT: 60 * 5,           // 5 minutes
} as const;
