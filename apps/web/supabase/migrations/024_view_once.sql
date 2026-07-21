-- ══════════════════════════════════════════════════════════════════
-- 024_view_once.sql — View-Once (Ghost) Messages
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ══════════════════════════════════════════════════════════════════

-- 1. Add view_once flag
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS view_once BOOLEAN DEFAULT FALSE;

-- 2. Track who has viewed it (array of user UUIDs)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS viewed_by UUID[] DEFAULT '{}';

-- 3. Index for fast lookup of unviewed ghost messages
CREATE INDEX IF NOT EXISTS idx_messages_view_once
  ON public.messages (view_once)
  WHERE view_once = TRUE;

-- Verify:
-- SELECT id, view_once, viewed_by FROM public.messages LIMIT 1;
