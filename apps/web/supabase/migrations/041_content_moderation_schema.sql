-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 041: Content Moderation Database Schema
-- ══════════════════════════════════════════════════════════════════════════════
-- Creates:
--   1. trust_score column on users (default 50)
--   2. content_reports table with RLS
--   3. trust_events audit table
--   4. moderation_status columns on posts + comments
--   5. moderation_queue view for admin
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Trust Score on users ────────────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS trust_score INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS is_shadow_banned BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for fast trust lookups
CREATE INDEX IF NOT EXISTS idx_users_trust_score ON public.users(trust_score);

-- ── 2. Moderation Status on posts ──────────────────────────────────────────────
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'clean',
  ADD COLUMN IF NOT EXISTS flag_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;

-- ── 3. Moderation Status on comments ──────────────────────────────────────────
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'clean',
  ADD COLUMN IF NOT EXISTS flag_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;

-- ── 4. content_reports table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'message', 'user', 'comment')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  reporter_ip TEXT,
  admin_note TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Reporters can see their own reports
CREATE POLICY "reporters_can_view_own"
  ON public.content_reports FOR SELECT
  USING (reporter_id = auth.uid());

-- Reporters can insert (enforced by server action logic)
CREATE POLICY "authenticated_can_report"
  ON public.content_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid() AND auth.uid() != reported_user_id);

-- Only admins can update (resolve/dismiss)
CREATE POLICY "admins_can_resolve"
  ON public.content_reports FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Index for fast auto-escalation queries
CREATE INDEX IF NOT EXISTS idx_reports_target ON public.content_reports(target_id, target_type, status);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON public.content_reports(reported_user_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.content_reports(reporter_id, created_at);

-- ── 5. trust_events audit table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trust_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  delta INTEGER NOT NULL,
  score_before INTEGER NOT NULL,
  score_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.trust_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own trust history
CREATE POLICY "users_view_own_trust"
  ON public.trust_events FOR SELECT
  USING (user_id = auth.uid());

-- Only server role can insert (service key / security definer)
CREATE POLICY "no_client_trust_inserts"
  ON public.trust_events FOR INSERT
  WITH CHECK (false);

-- ── 6. Admin moderation view ──────────────────────────────────────────────────
-- Exposes flagged content for admin dashboard
CREATE OR REPLACE VIEW public.moderation_queue AS
SELECT
  'post' AS content_type,
  p.id AS content_id,
  p.content AS text_snippet,
  p.moderation_status,
  p.flag_reason,
  p.risk_score,
  p.user_id AS author_id,
  u.username AS author_username,
  u.trust_score AS author_trust,
  p.created_at
FROM public.posts p
JOIN public.users u ON u.id = p.user_id
WHERE p.moderation_status IN ('flagged', 'removed', 'shadow')

UNION ALL

SELECT
  'comment' AS content_type,
  c.id AS content_id,
  c.content AS text_snippet,
  c.moderation_status,
  c.flag_reason,
  c.risk_score,
  c.user_id AS author_id,
  u.username AS author_username,
  u.trust_score AS author_trust,
  c.created_at
FROM public.comments c
JOIN public.users u ON u.id = c.user_id
WHERE c.moderation_status IN ('flagged', 'removed', 'shadow')

ORDER BY created_at DESC;

-- ══════════════════════════════════════════════════════════════════════════════
-- DONE.
-- New columns: users.trust_score, users.role, users.is_shadow_banned
-- New tables: content_reports, trust_events
-- New view: moderation_queue
-- ══════════════════════════════════════════════════════════════════════════════
