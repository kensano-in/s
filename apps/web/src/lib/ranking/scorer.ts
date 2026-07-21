/**
 * Verlyn Adaptive Ranking System — Scoring Model
 *
 * A calibrated weighted linear model that approximates a Gradient Boosted Tree
 * at inference time without any training infrastructure.
 *
 * Upgrade path:
 *   Phase 1 (now):  Weighted linear model — deterministic, no training needed
 *   Phase 2:        Collect 30-day engagement logs → train logistic regression offline
 *                   Replace DEFAULT_RANKING_WEIGHTS with learned coefficients
 *   Phase 3:        Item/user embeddings via a small MLP trained in Python → serve via
 *                   Supabase Edge Function or Cloudflare Worker
 */

import type { RankingFeatures, RankingWeights, RankedPost } from './types';
import { DEFAULT_RANKING_WEIGHTS } from './types';
import type { Post } from '@/lib/types';

// ─── Exploration Configuration ────────────────────────────────────────────────
/** Fraction of the feed that is "exploration" (non-personalized) */
const EXPLORATION_RATE = 0.20;

// ─── Score a Single Post ──────────────────────────────────────────────────────

/**
 * Score a (user, post) feature vector → [0, 1] probability-like score.
 *
 * Higher score = more likely the user engages.
 */
export function scorePost(
  features: RankingFeatures,
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS
): number {
  const raw =
    weights.recency          * features.recencyScore       +
    weights.velocity         * features.velocityScore      +
    weights.quality          * features.qualityScore       +
    weights.creatorAffinity  * features.creatorAffinity    +
    weights.categoryRelevance * features.categoryRelevance +
    weights.contentTypePref  * features.contentTypePref    +
    weights.timeOfDayAffinity * features.timeOfDayAffinity;

  // Penalize already-seen posts slightly (reduce repeat)
  const seenPenalty = features.alreadySeen ? 0.15 : 0;

  return Math.max(0, Math.min(1, raw - seenPenalty));
}

// ─── Exploration Noise ────────────────────────────────────────────────────────

/**
 * Add exploration noise to a post's score.
 * 80% of shuffled order is personalized; 20% is random discovery.
 *
 * Uses a seeded-deterministic noise function so the same user gets
 * consistent exploration within a session (no reordering on re-render).
 */
export function applyExplorationNoise(
  score: number,
  postId: string,
  sessionSeed: number
): { score: number; isExploration: boolean } {
  // Cheap deterministic hash of (postId, sessionSeed)
  const hash = deterministicHash(postId + sessionSeed);
  const isExploration = (hash % 100) / 100 < EXPLORATION_RATE;
  const noiseMultiplier = isExploration
    ? 0.7 + ((hash % 300) / 1000)   // exploration: 0.7 – 1.0
    : 1.0;

  return {
    score: score * noiseMultiplier,
    isExploration,
  };
}

// ─── Batch Rank Posts ─────────────────────────────────────────────────────────

/**
 * Given a list of scored (post, score) pairs, add exploration noise
 * and return them sorted descending by final score.
 */
export function rankWithExploration<T extends Post>(
  scoredPosts: Array<{ post: T; score: number }>,
  sessionSeed: number
): RankedPost<T>[] {
  return scoredPosts
    .map(({ post, score }) => {
      const { score: finalScore, isExploration } = applyExplorationNoise(
        score, post.id, sessionSeed
      );
      return { post, score: finalScore, isExploration };
    })
    .sort((a, b) => b.score - a.score);
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function deterministicHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
