-- Migration 017: Add ghost_mode_active to dm_settings
-- This allows the 'Phantom' state to persist across refreshes per conversation

ALTER TABLE public.dm_settings
  ADD COLUMN IF NOT EXISTS ghost_mode_active boolean DEFAULT false;
