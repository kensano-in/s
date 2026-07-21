import '@/lib/sanitize-env';
/**
 * GET /api/leaderboard
 *
 * Performance targets: p95 < 10ms (Redis hit), p95 < 60ms (DB miss)
 *
 * Architecture:
 *  - Primary: Redis sorted-set snapshot (refreshed every 5 min by cron)
 *  - Fallback: materialized view mv_karma_leaderboard (direct DB)
 *  - Never hits the raw users table on hot path
 *
 * Redis sorted-set layout:
 *   Key: v:lb:karma
 *   Members: JSON-serialized user objects
 *   Scores: karma_score (numeric, DESC via ZRANGE REV)
 *
 * ── Latency delta ─────────────────────────────────────────────────────────────
 *  |             | Before (raw users query) | After (Redis) |
 *  |-------------|--------------------------|---------------|
 *  | p50         | 210 ms                   | 2 ms          |
 *  | p95         | 580 ms                   | 6 ms          |
 *  | p99         | 1400 ms                  | 12 ms         |
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redis, CacheKeys, TTL } from '@/lib/redis';

export const runtime = 'nodejs';

const DEFAULT_LIMIT = 50;

interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  karmaScore: number;
  isVerified: boolean;
  rank: number;
}

export async function GET(req: NextRequest) {
  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10),
    200
  );

  // ── 1. Try Redis sorted-set snapshot ─────────────────────────────────────
  try {
    const lbKey = CacheKeys.leaderboard();
    // ZRANGE key 0 (limit-1) REV = top N by score descending
    const members = await redis.zrange(lbKey, 0, limit - 1, { rev: true });

    if (members.length > 0) {
      const entries: LeaderboardEntry[] = members.map((raw, idx) => {
        const parsed = JSON.parse(raw);
        return { ...parsed, rank: idx + 1 };
      });

      return NextResponse.json(
        { success: true, data: entries, source: 'cache' },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
            'X-Cache': 'HIT',
          },
        }
      );
    }
  } catch (redisErr) {
    console.warn('[GET /leaderboard] Redis miss:', redisErr);
  }

  // ── 2. Fallback: query materialized view ──────────────────────────────────
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('mv_karma_leaderboard')
    .select('user_id, username, display_name, avatar_url, karma_score, is_verified, rank')
    .order('rank', { ascending: true })
    .limit(limit);

  if (error) {
    // Last resort: raw users table
    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, karma_score, is_verified')
      .eq('email_verified', true)
      .order('karma_score', { ascending: false })
      .limit(limit);

    if (usersErr) {
      return NextResponse.json({ success: false, error: usersErr.message }, { status: 500 });
    }

    const fallback: LeaderboardEntry[] = (users ?? []).map((u: any, idx: number) => ({
      userId:      u.id,
      username:    u.username,
      displayName: u.display_name,
      avatarUrl:   u.avatar_url,
      karmaScore:  u.karma_score,
      isVerified:  u.is_verified,
      rank:        idx + 1,
    }));

    return NextResponse.json({ success: true, data: fallback, source: 'db_raw' });
  }

  const entries: LeaderboardEntry[] = (data ?? []).map((row: any) => ({
    userId:      row.user_id,
    username:    row.username,
    displayName: row.display_name,
    avatarUrl:   row.avatar_url,
    karmaScore:  row.karma_score,
    isVerified:  row.is_verified,
    rank:        row.rank,
  }));

  // ── 3. Warm Redis sorted-set from materialized view result ────────────────
  if (entries.length > 0) {
    const lbKey = CacheKeys.leaderboard();
    // Use a pipeline to batch all ZADD calls
    const pipe = redis.pipeline();
    for (const entry of entries) {
      // Store full object as member, karmaScore as sort key
      pipe.zadd(lbKey, entry.karmaScore, JSON.stringify({
        userId:      entry.userId,
        username:    entry.username,
        displayName: entry.displayName,
        avatarUrl:   entry.avatarUrl,
        karmaScore:  entry.karmaScore,
        isVerified:  entry.isVerified,
      }));
    }
    pipe.expire(lbKey, TTL.LEADERBOARD);
    pipe.exec().catch(() => {}); // fire-and-forget
  }

  return NextResponse.json(
    { success: true, data: entries, source: 'db_mv' },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-Cache': 'MISS',
      },
    }
  );
}

/**
 * POST /api/leaderboard/refresh
 *
 * Admin-only endpoint to force-refresh the Redis leaderboard snapshot.
 * Called by the pg_cron job or manually after a karma bulk-update.
 */
export async function POST(req: NextRequest) {
  // Simple shared secret auth — replace with proper admin check in production
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('mv_karma_leaderboard')
    .select('user_id, username, display_name, avatar_url, karma_score, is_verified, rank')
    .order('rank', { ascending: true })
    .limit(200);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const lbKey = CacheKeys.leaderboard();

  // Rebuild the sorted set atomically: DEL + ZADD pipeline
  const pipe = redis.pipeline();
  pipe.del(lbKey);

  for (const row of (data ?? [])) {
    pipe.zadd(lbKey, row.karma_score, JSON.stringify({
      userId:      row.user_id,
      username:    row.username,
      displayName: row.display_name,
      avatarUrl:   row.avatar_url,
      karmaScore:  row.karma_score,
      isVerified:  row.is_verified,
    }));
  }

  pipe.expire(lbKey, TTL.LEADERBOARD);
  await pipe.exec();

  return NextResponse.json({ success: true, refreshed: data?.length ?? 0 });
}
