/**
 * Verlyn Adaptive Ranking System — Core Types
 *
 * These types form the contract between the ranking pipeline stages.
 * Never couple DB row shapes directly to these types; always transform at the boundary.
 */

// ─── Engagement Actions ───────────────────────────────────────────────────────
export type EngagementAction =
  | 'impression'   // post entered viewport
  | 'click'        // post tapped/opened
  | 'like'         // liked
  | 'unlike'       // un-liked
  | 'comment'      // commented
  | 'save'         // saved
  | 'unsave'       // un-saved
  | 'share'        // shared
  | 'dwell'        // stayed on post ≥ 3s
  | 'deep_dwell'   // stayed ≥ 10s (strong positive signal)
  | 'skip'         // scrolled past quickly (<1.5s)
  | 'scroll_depth'; // scrolled to % of content

// ─── User Interest Vector ─────────────────────────────────────────────────────
export interface UserInterestVector {
  userId: string;
  /** Per media type preference weights [0, 1] */
  wImage: number;
  wVideo: number;
  wText: number;
  /** Hour-of-day affinity (length 24). Index = hour (0-23 UTC). */
  timeAffinity: number[];
  /** Category slug → affinity weight [0, 1] */
  categoryWeights: Record<string, number>;
  /** creator_id → engagement weight [0, 1] */
  creatorWeights: Record<string, number>;
  lastActive: string;
  updatedAt: string;
}

/** Default neutral vector for new users (cold start) */
export const DEFAULT_USER_VECTOR: Omit<UserInterestVector, 'userId' | 'lastActive' | 'updatedAt'> = {
  wImage: 0.5,
  wVideo: 0.5,
  wText: 0.5,
  timeAffinity: Array(24).fill(0.5),
  categoryWeights: {},
  creatorWeights: {},
};

// ─── Post Score Cache ─────────────────────────────────────────────────────────
export interface PostScoreCache {
  postId: string;
  globalScore: number;   // ELO-style aggregated score [0, ∞) 
  velocity: number;      // engagements/hour in last 6h [0, ∞)
  qualityScore: number;  // CTR proxy: likes / (impressions + 1) [0, 1]
  updatedAt: string;
}

// ─── Feature Vectors ─────────────────────────────────────────────────────────
/** Features derived purely from the post itself (user-agnostic) */
export interface PostFeatures {
  postId: string;
  /** Exponential decay: 1.0 = just posted, 0.0 = very old */
  recencyScore: number;
  /** Normalized engagement velocity (engagements/hr, capped at 1.0) */
  velocityScore: number;
  /** Like rate proxy: likes / (impressions + 10) */
  qualityScore: number;
  /** Whether the post has media */
  hasMedia: boolean;
  /** Detected content type */
  contentType: 'text' | 'image' | 'video';
  /** Hour post was created (0-23) */
  postHourUTC: number;
}

/** Features that require knowledge of both the user AND the post */
export interface UserPostFeatures {
  /** Weight of the post's author in the user's creator_weights */
  creatorAffinity: number;
  /** Dot-product-like category match */
  categoryRelevance: number;
  /** User's historical preference for this content type */
  contentTypePref: number;
  /** User's affinity for this hour-of-day */
  timeOfDayAffinity: number;
  /** Whether user has already seen / interacted with this post */
  alreadySeen: boolean;
}

/** Combined feature set used by the scorer */
export interface RankingFeatures extends PostFeatures, UserPostFeatures {}

// ─── Ranked Post ─────────────────────────────────────────────────────────────
export interface RankedPost<T = unknown> {
  post: T;
  score: number;
  isExploration: boolean;  // true = part of the 20% exploration bucket
}

// ─── Ranking Weights (easy to tune) ──────────────────────────────────────────
export interface RankingWeights {
  recency: number;
  velocity: number;
  quality: number;
  creatorAffinity: number;
  categoryRelevance: number;
  contentTypePref: number;
  timeOfDayAffinity: number;
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  recency:          0.25,
  velocity:         0.20,
  quality:          0.15,
  creatorAffinity:  0.20,
  categoryRelevance: 0.10,
  contentTypePref:  0.05,
  timeOfDayAffinity: 0.05,
};
