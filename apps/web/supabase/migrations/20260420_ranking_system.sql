-- ═══════════════════════════════════════════════════════════════════════════════
-- Verlyn Adaptive Ranking System — Database Migration (v2)
-- Fixes column mismatch: action → action_type, adds weight column
-- Adds user_interests and post_features tables for the updated pipeline
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 0. Drop old tables if they exist from a failed v1 run ───────────────────
DROP TABLE IF EXISTS engagement_logs CASCADE;
DROP TABLE IF EXISTS user_interest_vectors CASCADE;
DROP TABLE IF EXISTS post_scores CASCADE;
DROP TABLE IF EXISTS user_interests CASCADE;
DROP TABLE IF EXISTS post_features CASCADE;

-- ─── 1. Engagement Logs (append-only telemetry) ───────────────────────────────
-- Column is action_type (not action) to match the client tracker
CREATE TABLE engagement_logs (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  post_id      uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  action_type  text NOT NULL CHECK (action_type IN (
    'view','click','like','unlike','comment','save','unsave',
    'share','dwell','deep_dwell','skip','scroll_depth','impression'
  )),
  weight       float NOT NULL DEFAULT 0.1,  -- action reward weight baked at log time
  duration     int,                          -- ms (dwell events)
  scroll_pct   int,                          -- 0–100 (scroll_depth events)
  created_at   timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_el_user_date    ON engagement_logs(user_id, created_at DESC);
CREATE INDEX idx_el_post_action  ON engagement_logs(post_id, action_type);
CREATE INDEX idx_el_view_lookup  ON engagement_logs(user_id, action_type, post_id);

ALTER TABLE engagement_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own engagement logs"
  ON engagement_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own engagement logs"
  ON engagement_logs FOR SELECT
  USING (auth.uid() = user_id);

-- ─── 2. User Interests (category-level affinity — queried by pipeline) ────────
-- Simple category → score map, one row per (user, category) combination
CREATE TABLE user_interests (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  category    text NOT NULL,           -- community_id or tag slug
  score       float DEFAULT 0.0 NOT NULL CHECK (score >= 0 AND score <= 1),
  updated_at  timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, category)
);

CREATE INDEX idx_ui_user ON user_interests(user_id);

ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own interests"
  ON user_interests FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── 3. Post Features Cache (queried by pipeline for velocity + category) ─────
CREATE TABLE post_features (
  post_id     uuid PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  category    text DEFAULT 'general' NOT NULL,  -- community_id or 'general'
  velocity    float DEFAULT 0.0 NOT NULL,         -- engagements/hour (last 6h)
  quality     float DEFAULT 0.0 NOT NULL,         -- like rate proxy
  updated_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE post_features ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read post features (for personalization)
CREATE POLICY "Authenticated users read post features"
  ON post_features FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only service role can write (updated by cron functions)
CREATE POLICY "Service role writes post features"
  ON post_features FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ─── 4. User Interest Vectors (full EMA state — updated by server feedback.ts) ─
-- This is the rich server-side model. user_interests (above) is the pipeline's
-- simplified read-path view.
CREATE TABLE user_interest_vectors (
  user_id           uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  w_image           float DEFAULT 0.5 NOT NULL,
  w_video           float DEFAULT 0.5 NOT NULL,
  w_text            float DEFAULT 0.5 NOT NULL,
  time_affinity     float[] DEFAULT ARRAY_FILL(0.5::float, ARRAY[24]) NOT NULL,
  category_weights  jsonb DEFAULT '{}'::jsonb NOT NULL,
  creator_weights   jsonb DEFAULT '{}'::jsonb NOT NULL,
  last_active       timestamptz DEFAULT now() NOT NULL,
  updated_at        timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE user_interest_vectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own interest vector"
  ON user_interest_vectors FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── 5. Post Scores (ELO-style global score — updated by server feedback.ts) ──
CREATE TABLE post_scores (
  post_id        uuid PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  global_score   float DEFAULT 0.5 NOT NULL,
  velocity       float DEFAULT 0.0 NOT NULL,
  quality_score  float DEFAULT 0.0 NOT NULL,
  updated_at     timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE post_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read post scores"
  ON post_scores FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role manages post scores"
  ON post_scores FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ─── 6. Velocity Refresh (run via pg_cron every 15 min) ──────────────────────
CREATE OR REPLACE FUNCTION refresh_post_velocities()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO post_features (post_id, velocity, updated_at)
  SELECT
    el.post_id,
    COUNT(*)::float / 6.0 AS velocity,
    now()
  FROM engagement_logs el
  WHERE
    el.created_at >= now() - INTERVAL '6 hours'
    AND el.action_type IN ('click','like','comment','save','share','dwell','deep_dwell')
  GROUP BY el.post_id
  ON CONFLICT (post_id) DO UPDATE
    SET velocity   = EXCLUDED.velocity,
        updated_at = now();

  -- Also sync to post_scores for the server-side EMA model
  INSERT INTO post_scores (post_id, velocity, updated_at)
  SELECT post_id, velocity, updated_at FROM post_features
  ON CONFLICT (post_id) DO UPDATE
    SET velocity   = EXCLUDED.velocity,
        updated_at = now();
END;
$$;

-- ─── 7. Sync user_interests from user_interest_vectors (run hourly) ───────────
-- Flattens the jsonb category_weights → user_interests rows for the pipeline
CREATE OR REPLACE FUNCTION sync_user_interests()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_interests (user_id, category, score, updated_at)
  SELECT
    uiv.user_id,
    kv.key   AS category,
    LEAST(1.0, GREATEST(0.0, (kv.value::text)::float)) AS score,
    now()
  FROM user_interest_vectors uiv,
       jsonb_each(uiv.category_weights) AS kv
  ON CONFLICT (user_id, category) DO UPDATE
    SET score      = EXCLUDED.score,
        updated_at = now();
END;
$$;

-- ─── 8. pg_cron schedule (uncomment once pg_cron extension is enabled) ────────
-- SELECT cron.schedule('refresh-velocities', '*/15 * * * *', 'SELECT refresh_post_velocities()');
-- SELECT cron.schedule('sync-interests',     '0 * * * *',    'SELECT sync_user_interests()');

-- ─── 9. Seed post_features for all existing posts ────────────────────────────
INSERT INTO post_features (post_id, category, velocity, quality)
SELECT
  p.id,
  COALESCE(p.community_id::text, 'general'),
  0.0,
  p.like_count::float / GREATEST(1, p.like_count + p.comment_count + 10)
FROM posts p
ON CONFLICT (post_id) DO NOTHING;

-- ─── 10. Seed post_scores for all existing posts ─────────────────────────────
INSERT INTO post_scores (post_id, global_score, velocity, quality_score)
SELECT
  p.id,
  LEAST(1.0,
    (p.like_count::float / GREATEST(1, p.like_count + p.comment_count + 1)) * 0.6
    + GREATEST(0, 1 - (EXTRACT(EPOCH FROM (now() - p.created_at)) / (48 * 3600))) * 0.4
  ),
  0.0,
  p.like_count::float / GREATEST(1, p.like_count + p.comment_count + 10)
FROM posts p
ON CONFLICT (post_id) DO NOTHING;
