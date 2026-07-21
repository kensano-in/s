/**
 * Verlyn Adaptive Ranking System — Diversity & Safety Constraints
 *
 * Applied AFTER scoring, BEFORE returning posts to client.
 * These are hard rules that override the ML score to prevent failure modes.
 */

import type { RankedPost } from './types';
import type { Post } from '@/lib/types';

// ─── Configuration ────────────────────────────────────────────────────────────
/** Max posts from the same author in any single page */
const MAX_POSTS_PER_CREATOR = 2;
/** Min fraction of posts from creators the user doesn't follow */
const MIN_DISCOVERY_FRACTION = 0.15;
/** Score boost for posts from creators the user has never interacted with */
const UNDISCOVERED_BOOST = 0.08;

export interface ConstraintOptions {
  followingCreatorIds: Set<string>;
  seenpostIds: Set<string>;
  pageSize: number;
}

/**
 * Apply diversity constraints to a ranked list.
 * 
 * Steps:
 *  1. Enforce per-creator cap (prevents boosted creators from flooding feed)
 *  2. Enforce minimum discovery ratio (anti-echo-chamber)
 *  3. Boost completely unseen creators for freshness
 */
export function applyConstraints<T extends Post>(
  rankedPosts: RankedPost<T>[],
  options: ConstraintOptions
): RankedPost<T>[] {
  const { followingCreatorIds, pageSize } = options;

  // Step 1: Enforce per-creator limit
  const creatorPostCount = new Map<string, number>();
  const cappedPosts: RankedPost<T>[] = [];
  const overflow: RankedPost<T>[] = [];

  for (const ranked of rankedPosts) {
    const authorId = ranked.post.author.id;
    const count = creatorPostCount.get(authorId) ?? 0;
    if (count < MAX_POSTS_PER_CREATOR) {
      creatorPostCount.set(authorId, count + 1);
      cappedPosts.push(ranked);
    } else {
      overflow.push(ranked);
    }
    if (cappedPosts.length >= pageSize * 2) break; // collect enough candidates
  }

  // Step 2: Ensure minimum discovery ratio
  const minDiscovery = Math.floor(pageSize * MIN_DISCOVERY_FRACTION);
  const discoveryPosts = cappedPosts.filter(r => !followingCreatorIds.has(r.post.author.id));
  const followedPosts = cappedPosts.filter(r => followingCreatorIds.has(r.post.author.id));

  // Interleave: guarantee at least minDiscovery discovery posts in the final slate
  const finalPosts: RankedPost<T>[] = [];
  let discoveryInserted = 0;
  let followedIdx = 0;
  let discoveryIdx = 0;

  while (finalPosts.length < pageSize) {
    const remainingSlots = pageSize - finalPosts.length;
    const remainingDiscoveryNeeded = Math.max(0, minDiscovery - discoveryInserted);
    // If we still need discovery posts and every remaining slot needs one, force insert
    const forceDiscovery = remainingDiscoveryNeeded >= remainingSlots && discoveryIdx < discoveryPosts.length;

    if (forceDiscovery) {
      finalPosts.push(discoveryPosts[discoveryIdx++]);
      discoveryInserted++;
    } else if (followedIdx < followedPosts.length) {
      finalPosts.push(followedPosts[followedIdx++]);
    } else if (discoveryIdx < discoveryPosts.length) {
      finalPosts.push(discoveryPosts[discoveryIdx++]);
      discoveryInserted++;
    } else {
      break; // exhausted all posts
    }
  }

  return finalPosts;
}

/**
 * Pre-scoring: boost score of posts from completely new creators
 * (ones the user has never interacted with). This surfaces quality
 * new voices in the user's feed before the loop can learn them.
 */
export function applyDiscoveryBoost<T extends Post>(
  scoredPosts: Array<{ post: T; score: number }>,
  interactedCreatorIds: Set<string>
): Array<{ post: T; score: number }> {
  return scoredPosts.map(({ post, score }) => ({
    post,
    score: interactedCreatorIds.has(post.author.id)
      ? score
      : Math.min(1, score + UNDISCOVERED_BOOST),
  }));
}
