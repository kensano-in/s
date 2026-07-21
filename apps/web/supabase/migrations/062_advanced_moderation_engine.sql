-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 062_advanced_moderation_engine.sql
-- Server-Authoritative Anti-Spam & Moderation System Tables
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Drop existing user_restrictions to start fresh and clean
DROP TABLE IF EXISTS public.user_restrictions CASCADE;

CREATE TABLE public.user_restrictions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  restriction_type  TEXT NOT NULL, -- 'messages', 'comments', 'posts', 'stories', 'calls', 'reactions', 'group_creation', 'communities', 'limited_profile'
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_restrictions ENABLE ROW LEVEL SECURITY;

-- Select policy: users can read their own restrictions
DROP POLICY IF EXISTS "Users can read their own restrictions" ON public.user_restrictions;
CREATE POLICY "Users can read their own restrictions"
  ON public.user_restrictions FOR SELECT
  USING (auth.uid() = user_id);

-- All policy for service role
DROP POLICY IF EXISTS "Service role manage restrictions" ON public.user_restrictions;
CREATE POLICY "Service role manage restrictions"
  ON public.user_restrictions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for speed
CREATE INDEX IF NOT EXISTS idx_user_restrictions_user_type_expiry 
  ON public.user_restrictions (user_id, restriction_type, expires_at DESC);


-- 2. User Moderation State table
CREATE TABLE IF NOT EXISTS public.user_moderation_state (
  user_id             UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  warned_at           TIMESTAMPTZ,
  offense_count       INTEGER NOT NULL DEFAULT 0,
  needs_manual_review BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_moderation_state ENABLE ROW LEVEL SECURITY;

-- Select policy: users can read their own moderation state
DROP POLICY IF EXISTS "Users can read their own moderation state" ON public.user_moderation_state;
CREATE POLICY "Users can read their own moderation state"
  ON public.user_moderation_state FOR SELECT
  USING (auth.uid() = user_id);

-- All policy for service role
DROP POLICY IF EXISTS "Service role manage moderation state" ON public.user_moderation_state;
CREATE POLICY "Service role manage moderation state"
  ON public.user_moderation_state FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- 3. User Moderation Actions (Audit log)
CREATE TABLE IF NOT EXISTS public.user_moderation_actions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type    TEXT NOT NULL, -- 'warning', 'restriction', 'appeal_submitted', 'appeal_resolved'
  offense_level  INTEGER NOT NULL DEFAULT 0,
  reason         TEXT NOT NULL,
  details        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_moderation_actions ENABLE ROW LEVEL SECURITY;

-- Select policy: users can read their own moderation actions
DROP POLICY IF EXISTS "Users can read their own moderation actions" ON public.user_moderation_actions;
CREATE POLICY "Users can read their own moderation actions"
  ON public.user_moderation_actions FOR SELECT
  USING (user_id = auth.uid());

-- All policy for service role
DROP POLICY IF EXISTS "Service role manage moderation actions" ON public.user_moderation_actions;
CREATE POLICY "Service role manage moderation actions"
  ON public.user_moderation_actions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_moderation_actions_user 
  ON public.user_moderation_actions(user_id, created_at DESC);


-- 4. User Activity Logs
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action       TEXT NOT NULL, -- 'send_message', 'add_comment', 'create_post', 'add_reaction', 'create_group', 'invite_member'
  content_hash TEXT,
  recipient_id TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- All policy for service role (Users should not read/modify logs)
DROP POLICY IF EXISTS "Service role manage activity logs" ON public.user_activity_logs;
CREATE POLICY "Service role manage activity logs"
  ON public.user_activity_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_time 
  ON public.user_activity_logs(user_id, created_at DESC);
