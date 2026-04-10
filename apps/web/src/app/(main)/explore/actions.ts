'use server';

import { createClient } from '@/lib/supabase/server';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ─── Unified search across users, posts, communities, and tags ───────────────
export async function searchAll(query: string) {
  if (!query || query.trim().length < 2) return { users: [], posts: [], communities: [], tags: [] };

  const supabase = await createClient();
  const q = query.trim();

  const [usersRes, postsRes, commRes] = await Promise.all([
    supabase
      .from('users')
      .select('id, username, display_name, avatar_url, bio')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(5),

    supabase
      .from('posts')
      .select('id, content, like_count, comment_count, created_at, author:users!posts_author_id_fkey(id, username, display_name, avatar_url)')
      .ilike('content', `%${q}%`)
      .order('like_count', { ascending: false })
      .limit(4),

    supabase
      .from('communities')
      .select('id, name, display_name, description, icon_url, member_count')
      .or(`name.ilike.%${q}%,display_name.ilike.%${q}%,description.ilike.%${q}%`)
      .order('member_count', { ascending: false })
      .limit(4),
  ]);

  // Extract tag matches from posts (hashtags containing the query)
  const tagPattern = new RegExp(`#\\w*${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*`, 'gi');
  const tagCounts = new Map<string, number>();
  (postsRes.data || []).forEach((p: any) => {
    const matches = (p.content as string).match(tagPattern) || [];
    matches.forEach((t: string) => {
      const normalized = t.toLowerCase();
      tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1);
    });
  });

  const tags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));

  return {
    users: usersRes.data || [],
    posts: (postsRes.data || []).map((p: any) => ({
      ...p,
      preview: (p.content as string).slice(0, 100) + ((p.content as string).length > 100 ? '…' : ''),
    })),
    communities: commRes.data || [],
    tags,
  };
}

// ─── Trending hashtags with real engagement counts ───────────────────────────
export async function getTrendingHashtags() {
  const supabase = await createClient();

  // Try the RPC first (requires a DB function)
  const { data: rpcData, error } = await supabase.rpc('get_trending_tags');

  if (!error && Array.isArray(rpcData)) {
    return rpcData.slice(0, 10).map((row: any, i: number) => ({
      tag: row.tag,
      count: row.count,
      countFmt: fmt(row.count),
      // Simple heuristic: top 3 are rising, next 4 are stable, rest declining
      trend: i < 3 ? 'up' : i < 7 ? 'stable' : 'down',
    }));
  }

  // Fallback: parse hashtags from recent posts
  const { data: posts } = await supabase
    .from('posts')
    .select('content, like_count')
    .order('created_at', { ascending: false })
    .limit(200);

  const tags = new Map<string, number>();
  posts?.forEach((p: any) => {
    const matches = (p.content as string).match(/#\w+/g) || [];
    matches.forEach((t: string) => {
      const key = t.toLowerCase();
      tags.set(key, (tags.get(key) || 0) + 1);
    });
  });

  return Array.from(tags.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count], i) => ({
      tag,
      count,
      countFmt: fmt(count),
      trend: i < 3 ? 'up' : i < 7 ? 'stable' : 'down',
    }));
}

// ─── Top discovery posts ─────────────────────────────────────────────────────
export async function getDiscoveryPosts() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('posts')
    .select(`
      id, content, like_count, comment_count, created_at, media_urls,
      author:users!posts_author_id_fkey(id, username, display_name, avatar_url)
    `)
    .order('like_count', { ascending: false })
    .limit(16);

  if (error) return { success: false as const, posts: [] };

  return {
    success: true as const,
    posts: (data || []).map((p: any) => ({
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

// ─── Suggested people ────────────────────────────────────────────────────────
export async function getSuggestedPeople() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, bio')
    .order('created_at', { ascending: false })
    .limit(8);

  if (error) return [];
  return data || [];
}
