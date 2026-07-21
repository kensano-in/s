/**
 * Verlyn Adaptive Ranking System — Feature Engineering
 *
 * Pure functions: no side effects, no DB calls.
 * All inputs are pre-fetched and passed in; outputs are typed feature objects.
 */

import type {
  PostFeatures,
  UserPostFeatures,
  RankingFeatures,
  UserInterestVector,
  PostScoreCache,
} from './types';
import { DEFAULT_USER_VECTOR } from './types';
import type { Post } from '@/lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────
/** Half-life for recency decay: 48h → score = 0.5 */
const RECENCY_HALF_LIFE_MS = 48 * 60 * 60 * 1000;
/** Max velocity for normalization cap (100 eng/hr = "viral") */
const MAX_VELOCITY = 100;

// ─── Post-Level Features (user-agnostic) ─────────────────────────────────────

/**
 * Compute features that depend only on the post + its cached score.
 * Safe to memoize per request.
 */
export function computePostFeatures(
  post: Post,
  scoreCache: PostScoreCache | null
): PostFeatures {
  const nowMs = Date.now();
  const postMs = new Date(post.createdAt).getTime();
  const ageMs = Math.max(0, nowMs - postMs);

  // Exponential decay: f(t) = 2^(-t/halfLife)
  const recencyScore = Math.pow(2, -(ageMs / RECENCY_HALF_LIFE_MS));

  // Velocity from cache (engagements per hour, normalized)
  const rawVelocity = scoreCache?.velocity ?? 0;
  const velocityScore = Math.min(1, rawVelocity / MAX_VELOCITY);

  // Quality = like rate proxy
  const qualityScore = scoreCache?.qualityScore ?? Math.min(
    1,
    post.likeCount / (post.likeCount + post.commentCount + 10)
  );

  // Content type detection
  const hasMedia = Boolean(post.mediaUrls && post.mediaUrls.length > 0);
  const contentType: PostFeatures['contentType'] =
    !hasMedia ? 'text'
    : (post.mediaUrls?.[0]?.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image');

  const postHourUTC = new Date(post.createdAt).getUTCHours();

  return {
    postId: post.id,
    recencyScore,
    velocityScore,
    qualityScore,
    hasMedia,
    contentType,
    postHourUTC,
  };
}

// ─── User × Post Features ─────────────────────────────────────────────────────

/**
 * Compute personalized features for a (user, post) pair.
 * Requires the user's preloaded interest vector.
 */
export function computeUserPostFeatures(
  post: Post,
  postFeatures: PostFeatures,
  userVector: UserInterestVector | null,
  seenPostIds: Set<string>
): UserPostFeatures {
  const vec = userVector ?? { ...DEFAULT_USER_VECTOR, userId: '', lastActive: '', updatedAt: '' };

  // Creator affinity — how much does this user engage with this author?
  const creatorAffinity = clamp(vec.creatorWeights[post.author.id] ?? 0, 0, 1);

  // Category relevance — use post tags if available, else from community
  // For now we use communityId as a proxy for "category"
  const categoryKey = post.communityId ?? '_global';
  const categoryRelevance = clamp(vec.categoryWeights[categoryKey] ?? 0.1, 0, 1);

  // Content type preference
  const contentTypePref =
    postFeatures.contentType === 'image' ? vec.wImage
    : postFeatures.contentType === 'video' ? vec.wVideo
    : vec.wText;

  // Time-of-day affinity: match user's historical engagement hour to post's creation hour
  const currentHour = new Date().getUTCHours();
  const timeOfDayAffinity = clamp(
    (vec.timeAffinity[currentHour] ?? 0.5),
    0, 1
  );

  const alreadySeen = seenPostIds.has(post.id);

  return {
    creatorAffinity,
    categoryRelevance,
    contentTypePref,
    timeOfDayAffinity,
    alreadySeen,
  };
}

// ─── Combined Features ────────────────────────────────────────────────────────

export function computeFullFeatures(
  post: Post,
  scoreCache: PostScoreCache | null,
  userVector: UserInterestVector | null,
  seenPostIds: Set<string>
): RankingFeatures {
  const postFeatures = computePostFeatures(post, scoreCache);
  const userPostFeatures = computeUserPostFeatures(post, postFeatures, userVector, seenPostIds);
  return { ...postFeatures, ...userPostFeatures };
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
