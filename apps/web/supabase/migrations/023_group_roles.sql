-- ═══════════════════════════════════════════════════════════════════════════
-- VERLYN — Migration 023: Group Roles Enhancement
-- Adds 'moderator' role + muted_until column to conversation_participants
-- Run ONCE in Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Drop existing role constraint and recreate with moderator
ALTER TABLE conversation_participants 
  DROP CONSTRAINT IF EXISTS conversation_participants_role_check;

ALTER TABLE conversation_participants 
  ADD CONSTRAINT conversation_participants_role_check 
  CHECK (role IN ('admin', 'moderator', 'member'));

-- 2. Add muted_until for per-user mute timers
ALTER TABLE conversation_participants
  ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ;

-- 3. Index for fast mute lookups
CREATE INDEX IF NOT EXISTS idx_cp_muted_until 
  ON conversation_participants (muted_until) 
  WHERE muted_until IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- Verify:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'conversation_participants';
-- ═══════════════════════════════════════════════════════════════════════════
