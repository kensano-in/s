-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 061_spam_restrictions.sql
-- Anti-Spam User Restrictions Infrastructure
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_restrictions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  restriction_type  TEXT NOT NULL, -- 'messages', 'comments', 'posts', 'stories', 'calls'
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_restrictions ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own restrictions
DROP POLICY IF EXISTS "Users can read their own restrictions" ON public.user_restrictions;
CREATE POLICY "Users can read their own restrictions"
  ON public.user_restrictions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role (server actions) can manage restrictions
DROP POLICY IF EXISTS "Service role manage restrictions" ON public.user_restrictions;
CREATE POLICY "Service role manage restrictions"
  ON public.user_restrictions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for speedy checks
CREATE INDEX IF NOT EXISTS idx_user_restrictions_user_type_expiry 
  ON public.user_restrictions (user_id, restriction_type, expires_at DESC);
