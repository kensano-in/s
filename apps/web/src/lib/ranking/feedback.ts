/**
 * Verlyn Adaptive Ranking System — Feedback Loop
 *
 * After every user interaction, this module:
 *  1. Logs the raw engagement event to `engagement_logs`
 *  2. Incrementally updates the user's `user_interest_vectors`
 *  3. Updates the post's `post_scores` cache
 *
 * Design principles:
 *  - Fire-and-forget from the client (never blocks UI)
 *  - Idempotent: safe to call multiple times for same event
 *  - Bounded updates: uses exponential moving average to prevent runaway drift
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import type { EngagementAction } from './types';

// ─── Engagement Action Weights ────────────────────────────────────────────────
/**
 * Signed reward per action. Positive = user liked it. Negative = user disliked/ignored it.
 * These are calibrated heuristics — replace with logistic regression coefficients after 30d of data.
 */
const ACTION_REWARD: Record<EngagementAction, number> = {
  impression:   0.01,   // weak positive (saw it)
  click:        0.20,   // moderate (curious)
  like:         0.40,   // strong positive
  unlike:      -0.20,   // correction
  comment:      0.50,   // strong positive (effort signal)
  save:         0.60,   // very strong (bookmark intent)
  unsave:      -0.30,   // correction
  share:        0.55,   // strong positive
  dwell:        0.25,   // positive (read it)
  deep_dwell:   0.45,   // strong positive (absorbed it)
  skip:        -0.15,   // mild negative (disinterested)
  scroll_depth: 0.10,   // mild positive (engaged enough to scroll)
};

/** EMA learning rate — how fast the vector adapts. Lower = more stable. */
const EMA_ALPHA = 0.15;
/** Max entries in creatorWeights before oldest are pruned */
const MAX_CREATOR_ENTRIES = 150;

// ─── Log Engagement Event ─────────────────────────────────────────────────────

export async function logEngagement({
  userId,
  postId,
  action,
  duration,
  scrollPct,
}: {
  userId: string;
  postId: string;
  action: EngagementAction;
  duration?: number;
  scrollPct?: number;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Ignore silently if no active user session
      return;
    }
    const activeUserId = user.id;

    // 1. Insert raw event (append-only log) — column is action_type per v2 schema
    await supabase.from('engagement_logs').insert({
      user_id: activeUserId,
      post_id: postId,
      action_type: action,                     // fixed: was 'action'
      weight: ACTION_REWARD[action] ?? 0.1,    // bake weight at event time
      duration: duration ?? null,
      scroll_pct: scrollPct ?? null,
    });

    // 2. Update user interest vector (async, fire-and-forget from caller's POV)
    // We do NOT await this in a cascading chain — the next request will benefit from it
    updateUserVector({ userId: activeUserId, postId, action, supabase }).catch(err =>
      console.error('[Ranking] updateUserVector failed:', err)
    );

    // 3. Update post score cache
    updatePostScore({ postId, action, supabase }).catch(err =>
      console.error('[Ranking] updatePostScore failed:', err)
    );
  } catch (err) {
    // Never throw — this is a background telemetry call
    console.error('[Ranking] logEngagement failed silently:', err);
  }
}

// ─── Update User Interest Vector ─────────────────────────────────────────────

async function updateUserVector({
  userId,
  postId,
  action,
  supabase,
}: {
  userId: string;
  postId: string;
  action: EngagementAction;
  supabase: Awaited<ReturnType<typeof createClient>>;
}): Promise<void> {
  const reward = ACTION_REWARD[action] ?? 0;
  if (reward === 0) return;

  // Fetch post metadata for feature extraction
  const { data: post } = await supabase
    .from('posts')
    .select('author_id, community_id, media_urls, created_at')
    .eq('id', postId)
    .single();

  if (!post) return;

  // Fetch existing vector or create default
  const { data: existing } = await supabase
    .from('user_interest_vectors')
    .select('*')
    .eq('user_id', userId)
    .single();

  const vec = existing ?? {
    user_id: userId,
    w_image: 0.5,
    w_video: 0.5,
    w_text: 0.5,
    time_affinity: Array(24).fill(0.5),
    category_weights: {},
    creator_weights: {},
  };

  // Determine content type
  const hasMedia = Array.isArray(post.media_urls) && post.media_urls.length > 0;
  const isVideo = hasMedia && post.media_urls[0]?.match(/\.(mp4|webm|mov)$/i);
  const isImage = hasMedia && !isVideo;

  // EMA update for content type weights
  if (isVideo)       vec.w_video = ema(vec.w_video, reward > 0 ? 1 : 0, EMA_ALPHA);
  else if (isImage)  vec.w_image = ema(vec.w_image, reward > 0 ? 1 : 0, EMA_ALPHA);
  else               vec.w_text  = ema(vec.w_text,  reward > 0 ? 1 : 0, EMA_ALPHA);

  // EMA update for time-of-day affinity
  const postHour = new Date(post.created_at).getUTCHours();
  const timeArr = [...(vec.time_affinity as number[])];
  timeArr[postHour] = ema(timeArr[postHour], reward > 0 ? 1 : 0, EMA_ALPHA * 0.5);
  vec.time_affinity = timeArr;

  // EMA update creator weight
  const creatorKey = post.author_id;
  const creatorWeights = { ...(vec.creator_weights as Record<string, number>) };
  const currentCreatorW = creatorWeights[creatorKey] ?? 0;
  creatorWeights[creatorKey] = clamp(ema(currentCreatorW, reward > 0 ? 1 : 0, EMA_ALPHA), 0, 1);

  // Prune old creator entries if over limit
  const creatorEntries = Object.entries(creatorWeights);
  if (creatorEntries.length > MAX_CREATOR_ENTRIES) {
    const pruned = Object.fromEntries(
      creatorEntries.sort((a, b) => b[1] - a[1]).slice(0, MAX_CREATOR_ENTRIES)
    );
    vec.creator_weights = pruned;
  } else {
    vec.creator_weights = creatorWeights;
  }

  // EMA update category weight
  if (post.community_id) {
    const catWeights = { ...(vec.category_weights as Record<string, number>) };
    const currentCatW = catWeights[post.community_id] ?? 0.1;
    catWeights[post.community_id] = clamp(ema(currentCatW, reward > 0 ? 1 : 0, EMA_ALPHA), 0, 1);
    vec.category_weights = catWeights;
  }

  // Upsert vector
  await supabase.from('user_interest_vectors').upsert({
    ...vec,
    user_id: userId,
    last_active: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

// ─── Update Post Score Cache ──────────────────────────────────────────────────

async function updatePostScore({
  postId,
  action,
  supabase,
}: {
  postId: string;
  action: EngagementAction;
  supabase: Awaited<ReturnType<typeof createClient>>;
}): Promise<void> {
  const reward = ACTION_REWARD[action] ?? 0;
  if (Math.abs(reward) < 0.1) return; // ignore weak signals

  const { data: existing } = await supabase
    .from('post_scores')
    .select('*')
    .eq('post_id', postId)
    .single();

  const current = existing ?? {
    post_id: postId,
    global_score: 0.5,
    velocity: 0,
    quality_score: 0,
  };

  // Bump global score via EMA
  const newGlobalScore = clamp(
    ema(current.global_score, reward > 0 ? 1 : 0, 0.1),
    0, 2 // can exceed 1 for viral posts
  );

  // Velocity: count signficant engagements in last 6h (simplified: just increment)
  // A proper velocity computation runs via a cron job (see migration SQL)
  const newVelocity = current.velocity + (reward > 0.2 ? 1 : 0);

  await supabase.from('post_scores').upsert({
    post_id: postId,
    global_score: newGlobalScore,
    velocity: newVelocity,
    quality_score: current.quality_score,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'post_id' });
}

// ─── Utility ──────────────────────────────────────────────────────────────────
/** Exponential Moving Average */
function ema(prev: number, newVal: number, alpha: number): number {
  return alpha * newVal + (1 - alpha) * prev;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
