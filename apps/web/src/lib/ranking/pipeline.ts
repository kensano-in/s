import type { SupabaseClient } from '@supabase/supabase-js';
import type { Post } from '@/lib/types';

interface RankFeedParams {
  posts: Post[];
  userId?: string;
  supabase: SupabaseClient;
  pageSize: number;
}

// Simple deterministic randomness for diversity
function pseudoRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return (Math.abs(h) % 1000) / 1000;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-Level Caching Singletons
// ─────────────────────────────────────────────────────────────────────────────
const userInterestsCache = new Map<string, Promise<any[]>>();
const userSeenPostsCache = new Map<string, Promise<Set<string>>>();
const postFeaturesCache = new Map<string, any>();

async function getCachedUserInterests(supabase: any, userId: string) {
  if (!userInterestsCache.has(userId)) {
    const promise = supabase
      .from('user_interests')
      .select('category, score')
      .eq('user_id', userId)
      .then((res: any) => res.data || [])
      .catch(() => []);
    userInterestsCache.set(userId, promise);
  }
  return userInterestsCache.get(userId)!;
}

async function getCachedSeenPosts(supabase: any, userId: string) {
  if (!userSeenPostsCache.has(userId)) {
    const promise = supabase
      .from('engagement_logs')
      .select('post_id')
      .eq('user_id', userId)
      .eq('action_type', 'view')
      .order('created_at', { ascending: false })
      .limit(100)
      .then((res: any) => new Set<string>(res.data?.map((s: any) => s.post_id) || []))
      .catch(() => new Set<string>());
    userSeenPostsCache.set(userId, promise);
  }
  return userSeenPostsCache.get(userId)!;
}

async function getCachedPostFeatures(supabase: any, postIds: string[]) {
  const missingIds = postIds.filter(id => !postFeaturesCache.has(id));
  if (missingIds.length > 0) {
    try {
      const { data } = await supabase
        .from('post_features')
        .select('*')
        .in('post_id', missingIds);
      if (data) {
        for (const f of data) {
          postFeaturesCache.set(f.post_id, f);
        }
      }
    } catch (e) {
      console.warn('[Rank] Failed to fetch post features:', e);
    }
  }
  return postIds.map(id => postFeaturesCache.get(id)).filter(Boolean);
}

export async function rankFeed({ posts, userId, supabase, pageSize }: RankFeedParams) {
  if (!posts.length) return { posts: [] };

  if (!userId) {
    // Unauthenticated: Sort by basic popularity + recency
    const ranked = posts.sort((a, b) => {
      const aScore = a.likeCount * 1 + a.commentCount * 2;
      const bScore = b.likeCount * 1 + b.commentCount * 2;
      return bScore - aScore;
    });
    return { posts: ranked };
  }

  // 1. Fetch personalization data from cache or parallel promises
  const postIds = posts.map(p => p.id);

  const [userInterests, seenSet, features] = await Promise.all([
    getCachedUserInterests(supabase, userId),
    getCachedSeenPosts(supabase, userId),
    getCachedPostFeatures(supabase, postIds)
  ]);

  const interestMap = new Map(userInterests.map(ui => [ui.category, ui.score]));
  const featureMap = new Map(features.map(f => [f.post_id, f]));

  // 2. Score Candidates
  const scored = posts.map(post => {
    const f = featureMap.get(post.id);
    const category = f?.category || 'general';
    const tagMatch = 0; // Could expand to calculate TF-IDF or dot product of tags

    const interestMatch = interestMap.get(category) || 0;
    
    // Engagement base
    const baseEngagement = (post.likeCount * 1) + (post.commentCount * 2) + (post.shareCount * 3);
    const velocity = f?.velocity || 0;

    // Recency (hours since posted)
    const hoursSince = Math.max(0, (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60));
    // Decay: e^(-lambda * t)
    const recencyDecay = Math.exp(-0.05 * hoursSince); 

    // Score Formula
    let score =
      (interestMatch * 0.4) +         // Personalization
      (baseEngagement * 0.25) +       // Global Quality
      (velocity * 0.15) +             // Momentary Trending
      (recencyDecay * 0.15) +         // Freshness
      (pseudoRandom(post.id) * 0.05); // Noise / Exploration

    // Penalize heavily if already seen recently (Diversity / No repetition)
    if (seenSet.has(post.id)) {
      score *= 0.1;
    }

    return { post, score };
  });

  // 3. Sort by Score
  scored.sort((a, b) => b.score - a.score);

  // 4. Apply Constraints (Diversity Filter: Max 2 consecutive posts by same author)
  const finalPosts: Post[] = [];
  const authorCount = new Map<string, number>();

  for (const item of scored) {
    if (finalPosts.length >= pageSize) break;

    const authorId = item.post.author.id;
    const authorUses = authorCount.get(authorId) || 0;

    // Cap at 2 posts per author per page
    if (authorUses < 2) {
      finalPosts.push(item.post);
      authorCount.set(authorId, authorUses + 1);
    }
  }

  // Fallback: If we stripped too many due to constraints, backfill with remaining
  if (finalPosts.length < pageSize && scored.length > finalPosts.length) {
    const remaining = scored.filter(s => !finalPosts.find(p => p.id === s.post.id));
    for (const item of remaining) {
      if (finalPosts.length >= pageSize) break;
      finalPosts.push(item.post);
    }
  }

  return { posts: finalPosts };
}
