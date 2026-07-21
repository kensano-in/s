-- ═══════════════════════════════════════════════════════════════════════════
-- VERLYN MESSAGING — Migration 020: client_temp_id reconciliation column
-- Run ONCE in Supabase Dashboard → SQL Editor → New Query
-- All operations are idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- Add client_temp_id: the FE-generated temp ID that lets us match
-- an optimistic message to its persisted server record without fuzzy matching.
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS client_temp_id TEXT;

-- Partial index: only index rows where client_temp_id IS NOT NULL
-- (recent messages only; avoids bloating index for historical data)
CREATE INDEX IF NOT EXISTS idx_messages_client_temp_id
  ON messages (client_temp_id)
  WHERE client_temp_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- Verify with:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'messages' AND column_name = 'client_temp_id';
-- ═══════════════════════════════════════════════════════════════════════════
