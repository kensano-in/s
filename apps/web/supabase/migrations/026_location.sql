-- ══════════════════════════════════════════════════════════════════
-- 026_location.sql — Live Location Sharing
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ══════════════════════════════════════════════════════════════════

-- 1. Location columns on messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS location_lat  DOUBLE PRECISION;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS location_lng  DOUBLE PRECISION;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS location_address TEXT;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS location_live BOOLEAN DEFAULT FALSE;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS location_expires_at TIMESTAMPTZ;

-- 2. Index for finding active live-location messages efficiently
CREATE INDEX IF NOT EXISTS idx_messages_location_live
  ON public.messages (location_live, location_expires_at)
  WHERE location_live = TRUE;

-- Verify:
-- SELECT id, location_lat, location_lng, location_live FROM public.messages WHERE location_lat IS NOT NULL LIMIT 1;
