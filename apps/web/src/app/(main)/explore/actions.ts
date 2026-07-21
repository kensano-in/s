'use server';

import { createClient } from '@/lib/supabase/server';
import { getBlockedIdsArray } from '@/lib/blockUtils';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ─── Time-decay score: higher = fresher + more engaged ───────────────────────
function scorePost(p: { like_count: number; comment_count: number; created_at: string }) {
  const ageHours = (Date.now() - new Date(p.created_at).getTime()) / 3_600_000;
  const engagement = (p.like_count || 0) * 2 + (p.comment_count || 0) * 3;
  // Hacker News-style decay: score / (age + 2)^1.5
  return engagement / Math.pow(ageHours + 2, 1.5);
}

// Simple in-memory cache for searchAll to prevent query queue contention under simulated concurrent requests
interface SearchCacheEntry {
  data: any;
  expiry: number;
}
const searchCache = new Map<string, SearchCacheEntry>();
const CACHE_TTL_MS = 5000; // 5 seconds is perfect for filtering concurrency spikes without stale UI

function cleanCache() {
  const now = Date.now();
  for (const [key, val] of searchCache.entries()) {
    if (val.expiry < now) {
      searchCache.delete(key);
    }
  }
}

// ─── Unified search across users, posts, communities, and tags ───────────────
export async function searchAll(query: string) {
  if (!query || query.trim().length < 2) return { users: [], posts: [], communities: [], tags: [] };

  const cacheKey = query.trim().toLowerCase();
  cleanCache();
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const supabase = await createClient();
  const q = query.trim();

  // Get current user's block list to exclude from results
  const { data: { user } } = await supabase.auth.getUser();
  const blockedIds = user ? await getBlockedIdsArray(supabase, user.id) : null;

  let usersQuery = supabase
    .from('users')
    .select('id, username, display_name, avatar_url, bio, follower_count')
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .order('follower_count', { ascending: false })
    .limit(5);
  if (blockedIds && blockedIds.length > 0) {
    usersQuery = (usersQuery as any).not('id', 'in', `(${blockedIds.join(',')})`);
  }

  let postsQuery = supabase
    .from('posts')
    .select(`
      id, content, like_count, comment_count, created_at, media_urls, author_id, metadata,
      author:users!posts_author_id_fkey(id, username, display_name, avatar_url, is_private)
    `)
    .ilike('content', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(40); // Increased limit to allow private filtering overhead
  if (blockedIds && blockedIds.length > 0) {
    postsQuery = (postsQuery as any).not('author_id', 'in', `(${blockedIds.join(',')})`);
  }

  const [usersRes, postsRes, commRes, followingIds] = await Promise.all([
    usersQuery,
    postsQuery,
    supabase
      .from('communities')
      .select('id, name, display_name, description, icon_url, member_count')
      .or(`name.ilike.%${q}%,display_name.ilike.%${q}%,description.ilike.%${q}%`)
      .order('member_count', { ascending: false })
      .limit(4),
    (async () => {
      if (!user) return [];
      try {
        const { getFollowingIdsDB } = await import('@/app/(main)/profile/actions');
        return await getFollowingIdsDB(user.id);
      } catch (e) {
        return [];
      }
    })()
  ]);

  const followingSet = new Set(followingIds);

  // Filter out private user posts unless followed or owned, and archived posts
  const filteredPosts = (postsRes.data || []).filter((p: any) => {
    if (p.metadata?.is_repost === true) return false;
    const authorId = p.author_id;
    if (user && authorId === user.id) return true;
    const isPrivate = p.author?.is_private || false;
    if (isPrivate && (!user || !followingSet.has(authorId))) return false;
    if (p.content?.includes('[ 🚫 archived ]')) return false;
    return true;
  });

  // Sort posts by engagement score (time-decayed)
  const sortedPosts = filteredPosts
    .sort((a: any, b: any) => scorePost(b) - scorePost(a))
    .slice(0, 5);

  // Extract tag matches from posts
  const tagPattern = new RegExp(`#\\w*${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*`, 'gi');
  const tagCounts = new Map<string, number>();
  (postsRes.data || []).forEach((p: any) => {
    const matches = ((p.content as string) || '').match(tagPattern) || [];
    matches.forEach((t: string) => {
      const normalized = t.toLowerCase();
      tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1);
    });
  });

  const tags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));

  const result = {
    users: (usersRes.data || []).map((u: any) => ({
      ...u,
      follower_count: u.follower_count || 0,
    })),
    posts: sortedPosts.map((p: any) => ({
      ...p,
      mediaUrls: p.media_urls || [],
      preview: ((p.content as string) || '').slice(0, 100) + ((p.content as string || '').length > 100 ? '…' : ''),
      author: {
        id: p.author?.id,
        username: p.author?.username,
        displayName: p.author?.display_name,
        avatar: p.author?.avatar_url,
      },
    })),
    communities: commRes.data || [],
    tags,
  };

  searchCache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL_MS });
  return result;
}


// ─── Trending hashtags with time-decayed velocity scoring ────────────────────
export async function getTrendingHashtags() {
  const supabase = await createClient();

  // Try the RPC first (requires a DB function)
  const { data: rpcData, error } = await supabase.rpc('get_trending_tags');

  if (!error && Array.isArray(rpcData) && rpcData.length > 0) {
    return rpcData.slice(0, 10).map((row: any, i: number) => ({
      tag: row.tag,
      count: row.count,
      countFmt: fmt(row.count),
      trend: i < 3 ? 'up' as const : i < 7 ? 'stable' as const : 'down' as const,
    }));
  }

  // Fallback: parse hashtags from recent posts with time-decay weighting
  // Pull posts from last 7 days, weight recent posts more heavily
  const { data: posts } = await supabase
    .from('posts')
    .select('content, like_count, comment_count, created_at')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(500);

  const tagScores = new Map<string, { count: number; score: number }>();
  posts?.forEach((p: any) => {
    const matches = ((p.content as string) || '').match(/#\w+/g) || [];
    const postScore = scorePost(p);
    matches.forEach((t: string) => {
      const key = t.toLowerCase();
      const existing = tagScores.get(key) || { count: 0, score: 0 };
      tagScores.set(key, { count: existing.count + 1, score: existing.score + postScore });
    });
  });

  const sorted = Array.from(tagScores.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 10);

  return sorted.map(([tag, { count }], i) => ({
    tag,
    count,
    countFmt: fmt(count),
    trend: i < 3 ? 'up' as const : i < 7 ? 'stable' as const : 'down' as const,
  }));
}

// ─── Discovery posts — time-decayed, diverse, engaging ───────────────────────
export async function getDiscoveryPosts() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const blockedIds = user ? await getBlockedIdsArray(supabase, user.id) : null;

  let query = supabase
    .from('posts')
    .select(`
      id, content, like_count, comment_count, created_at, media_urls, author_id, metadata,
      author:users!posts_author_id_fkey(id, username, display_name, avatar_url, is_private)
    `)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(150); // Increased limit to allow private filtering overhead

  if (blockedIds && blockedIds.length > 0) {
    query = (query as any).not('author_id', 'in', `(${blockedIds.join(',')})`);
  }

  const [res, followingIds] = await Promise.all([
    query,
    (async () => {
      if (!user) return [];
      try {
        const { getFollowingIdsDB } = await import('@/app/(main)/profile/actions');
        return await getFollowingIdsDB(user.id);
      } catch (e) {
        return [];
      }
    })()
  ]);

  const { data, error } = res;
  if (error) return { success: false as const, posts: [] };

  const followingSet = new Set(followingIds);

  // Filter out private user posts unless followed or owned, and archived posts
  const filteredData = (data || []).filter((p: any) => {
    if (p.metadata?.is_repost === true) return false;
    const authorId = p.author_id;
    if (user && authorId === user.id) return true;
    const isPrivate = p.author?.is_private || false;
    if (isPrivate && (!user || !followingSet.has(authorId))) return false;
    if (p.content?.includes('[ 🚫 archived ]')) return false;
    return true;
  });

  // Sort by time-decayed engagement score for "alive" discovery feel
  const scored = filteredData
    .map((p: any) => ({ ...p, _score: scorePost(p) }))
    .sort((a: any, b: any) => b._score - a._score)
    .slice(0, 24);

  return {
    success: true as const,
    posts: scored.map((p: any) => ({
      ...p,
      mediaUrls: p.media_urls || [],
      author: {
        id: p.author?.id,
        username: p.author?.username,
        displayName: p.author?.display_name,
        avatar: p.author?.avatar_url,
      },
    })),
  };
}

// ─── Discovery media posts — images + video only ─────────────────────────────
export async function getDiscoveryMediaPosts() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const blockedIds = user ? await getBlockedIdsArray(supabase, user.id) : null;

  let query = supabase
    .from('posts')
    .select(`
      id, content, like_count, comment_count, created_at, media_urls, author_id, metadata,
      author:users!posts_author_id_fkey(id, username, display_name, avatar_url, is_private)
    `)
    .not('media_urls', 'is', null)
    .gte('created_at', new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(180); // Increased limit to allow private filtering overhead

  if (blockedIds && blockedIds.length > 0) {
    query = (query as any).not('author_id', 'in', `(${blockedIds.join(',')})`);
  }

  const [res, followingIds] = await Promise.all([
    query,
    (async () => {
      if (!user) return [];
      try {
        const { getFollowingIdsDB } = await import('@/app/(main)/profile/actions');
        return await getFollowingIdsDB(user.id);
      } catch (e) {
        return [];
      }
    })()
  ]);

  const { data, error } = res;
  if (error) return [];

  const followingSet = new Set(followingIds);

  // Filter to only posts that actually have media, aren't private (unless followed), and aren't archived
  const filteredData = (data || []).filter((p: any) => {
    if (p.metadata?.is_repost === true) return false;
    const authorId = p.author_id;
    if (user && authorId === user.id) return true;
    const isPrivate = p.author?.is_private || false;
    if (isPrivate && (!user || !followingSet.has(authorId))) return false;
    if (p.content?.includes('[ 🚫 archived ]')) return false;
    return true;
  });

  return filteredData
    .filter((p: any) => Array.isArray(p.media_urls) && p.media_urls.length > 0)
    .map((p: any) => ({ ...p, _score: scorePost(p) }))
    .sort((a: any, b: any) => b._score - a._score)
    .slice(0, 30)
    .map((p: any) => ({
      ...p,
      mediaUrls: p.media_urls || [],
      author: {
        id: p.author?.id,
        username: p.author?.username,
        displayName: p.author?.display_name,
        avatar: p.author?.avatar_url,
      },
    }));
}

// ─── Suggested people — ranked by social proof ───────────────────────────────
export async function getSuggestedPeople() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const blockedIds = user ? await getBlockedIdsArray(supabase, user.id) : null;

  let query = supabase
    .from('users')
    .select('id, username, display_name, avatar_url, bio, follower_count')
    .order('follower_count', { ascending: false });

  if (user) {
    query = (query as any).neq('id', user.id);
  }

  if (blockedIds && blockedIds.length > 0) {
    query = (query as any).not('id', 'in', `(${blockedIds.join(',')})`);
  }

  query = (query as any).limit(12);

  const { data, error } = await query;
  if (error || !data?.length) {
    // Fallback: just return recent users (still filter blocked & self)
    let fbQuery = supabase
      .from('users')
      .select('id, username, display_name, avatar_url, bio')
      .order('created_at', { ascending: false });

    if (user) {
      fbQuery = (fbQuery as any).neq('id', user.id);
    }
    if (blockedIds && blockedIds.length > 0) {
      fbQuery = (fbQuery as any).not('id', 'in', `(${blockedIds.join(',')})`);
    }
    fbQuery = (fbQuery as any).limit(12);

    const { data: fallback } = await fbQuery;
    return fallback || [];
  }

  return data;
}

// ─── Rising creators — high recent engagement ────────────────────────────────
export async function getRisingCreators() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const blockedIds = user ? await getBlockedIdsArray(supabase, user.id) : null;

  let query = supabase
    .from('posts')
    .select(`
      like_count, comment_count, created_at, author_id, metadata,
      author:users!posts_author_id_fkey(id, username, display_name, avatar_url, bio, follower_count, is_private)
    `)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
    .order('like_count', { ascending: false })
    .limit(100); // Increased limit to allow private filtering overhead

  if (blockedIds && blockedIds.length > 0) {
    query = (query as any).not('author_id', 'in', `(${blockedIds.join(',')})`);
  }

  const [res, followingIds] = await Promise.all([
    query,
    (async () => {
      if (!user) return [];
      try {
        const { getFollowingIdsDB } = await import('@/app/(main)/profile/actions');
        return await getFollowingIdsDB(user.id);
      } catch (e) {
        return [];
      }
    })()
  ]);

  const { data } = res;
  if (!data) return [];

  const followingSet = new Set(followingIds);

  // Filter out private user posts unless followed or owned
  const filteredData = data.filter((p: any) => {
    if (p.metadata?.is_repost === true) return false;
    const authorId = p.author_id;
    if (user && authorId === user.id) return true;
    const isPrivate = p.author?.is_private || false;
    if (isPrivate && (!user || !followingSet.has(authorId))) return false;
    return true;
  });

  // Aggregate by author
  const creatorMap = new Map<string, { user: any; score: number; posts: number }>();
  filteredData.forEach((p: any) => {
    if (!p.author?.id) return;
    const existing = creatorMap.get(p.author.id) || { user: p.author, score: 0, posts: 0 };
    creatorMap.set(p.author.id, {
      user: p.author,
      score: existing.score + scorePost(p),
      posts: existing.posts + 1,
    });
  });

  return Array.from(creatorMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ user, posts }) => ({ ...user, recentPosts: posts }));
}
