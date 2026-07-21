-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 063_moderation_tables_ensure.sql
-- Ensures all moderation tables exist (idempotent, safe to re-run)
-- Run this in the Supabase Dashboard → SQL Editor if migrations 061/062 were not applied.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. user_restrictions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_restrictions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  restriction_type  TEXT NOT NULL,
  -- values: 'messages','comments','posts','stories','calls','reactions','group_creation','communities','limited_profile'
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_restrictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own restrictions" ON public.user_restrictions;
CREATE POLICY "Users can read their own restrictions"
  ON public.user_restrictions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manage restrictions" ON public.user_restrictions;
CREATE POLICY "Service role manage restrictions"
  ON public.user_restrictions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_user_restrictions_user_type_expiry
  ON public.user_restrictions (user_id, restriction_type, expires_at DESC);


-- ─── 2. user_moderation_state ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_moderation_state (
  user_id             UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  warned_at           TIMESTAMPTZ,
  offense_count       INTEGER NOT NULL DEFAULT 0,
  needs_manual_review BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_moderation_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own moderation state" ON public.user_moderation_state;
CREATE POLICY "Users can read their own moderation state"
  ON public.user_moderation_state FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manage moderation state" ON public.user_moderation_state;
CREATE POLICY "Service role manage moderation state"
  ON public.user_moderation_state FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ─── 3. user_moderation_actions (audit log) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_moderation_actions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type    TEXT NOT NULL,
  -- values: 'warning','restriction','appeal_submitted','appeal_resolved','suspension'
  offense_level  INTEGER NOT NULL DEFAULT 0,
  reason         TEXT NOT NULL,
  details        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_moderation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own moderation actions" ON public.user_moderation_actions;
CREATE POLICY "Users can read their own moderation actions"
  ON public.user_moderation_actions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role manage moderation actions" ON public.user_moderation_actions;
CREATE POLICY "Service role manage moderation actions"
  ON public.user_moderation_actions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_user
  ON public.user_moderation_actions(user_id, created_at DESC);


-- ─── 4. user_activity_logs ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  -- values: 'send_message','add_comment','create_post','add_reaction','create_story','create_group','upload_media'
  content_hash TEXT,
  recipient_id TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Users cannot read or modify their own activity logs — service role only
DROP POLICY IF EXISTS "Service role manage activity logs" ON public.user_activity_logs;
CREATE POLICY "Service role manage activity logs"
  ON public.user_activity_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Composite index for the sliding-window spam query
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_time
  ON public.user_activity_logs(user_id, created_at DESC);

-- ─── 5. Auto-cleanup function: prune logs older than 24h ─────────────────────
-- Keeps the activity_logs table lean by dropping rows beyond the detection window.
CREATE OR REPLACE FUNCTION public.prune_old_activity_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.user_activity_logs
  WHERE created_at < now() - INTERVAL '24 hours';
END;
$$;

-- Schedule cleanup via pg_cron if available (non-fatal if not installed)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('prune-activity-logs', '0 * * * *', 'SELECT public.prune_old_activity_logs()');
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- pg_cron not available, cleanup will run on-demand
  NULL;
END;
$$;
