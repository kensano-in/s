-- ============================================================================
-- Migration: messaging_performance
-- Date: 2026-04-20
-- Purpose: Fix BUG-04 — getConversationsDB full table scan on messages table.
--
-- Root Cause:
--   getConversationsDB queries the entire `messages` table filtered on two
--   un-indexed columns (sender_id, recipient_id) with an OR clause. At scale
--   this becomes an O(n) sequential scan causing P99 timeouts.
--
-- Fix:
--   1. Functional composite index on (LEAST, GREATEST) of the two IDs +
--      sent_at DESC for sorted lookup in a single index scan.
--   2. Separate single-column indexes on sender_id + recipient_id for the
--      individual column lookups already being done elsewhere.
--   3. Index on conversation_id for group message queries.
--   4. Index on message_requests for the privacy inbox query.
--
-- NOTE: CONCURRENTLY removed — cannot run inside a transaction block
--       (i.e. the Supabase SQL Editor). These are plain CREATE INDEX.
--       To run truly non-blocking in production via CLI, add CONCURRENTLY back.
-- ============================================================================

-- 1. DM conversation lookup index (the main bottleneck)
--    LEAST/GREATEST normalises ordering so sender↔recipient pairs always map
--    to the same index entry regardless of direction.
CREATE INDEX IF NOT EXISTS idx_messages_dm_pair_sent_at
  ON messages (
    LEAST(sender_id::text, recipient_id::text),
    GREATEST(sender_id::text, recipient_id::text),
    sent_at DESC
  )
  WHERE conversation_id IS NULL;

-- 2. Sender-only index (for user's sent message queries)
CREATE INDEX IF NOT EXISTS idx_messages_sender_sent_at
  ON messages (sender_id, sent_at DESC)
  WHERE conversation_id IS NULL;

-- 3. Recipient-only index (for received message queries)
CREATE INDEX IF NOT EXISTS idx_messages_recipient_sent_at
  ON messages (recipient_id, sent_at DESC)
  WHERE conversation_id IS NULL;

-- 4. Group message lookup index
CREATE INDEX IF NOT EXISTS idx_messages_conversation_sent_at
  ON messages (conversation_id, sent_at ASC)
  WHERE conversation_id IS NOT NULL;

-- 5. Message requests inbox query index
CREATE INDEX IF NOT EXISTS idx_message_requests_recipient_status
  ON message_requests (recipient_id, status)
  WHERE status = 'PENDING';

-- 6. Typing status lookup (used by realtime hook on reconnect)
CREATE INDEX IF NOT EXISTS idx_typing_status_conversation
  ON typing_status (conversation_id, updated_at DESC);

-- 7. Message reads lookup (used by markAsSeenDB and readStatus store)
CREATE INDEX IF NOT EXISTS idx_message_reads_viewer
  ON message_reads (viewer_id, message_id);

-- ============================================================================
-- RPC helpers expected by getConversationsDB (graceful fallback exists)
-- ============================================================================

-- Returns last message per group conversation (batch fetch, avoids N+1)
CREATE OR REPLACE FUNCTION get_groups_last_messages(group_ids UUID[])
RETURNS TABLE (
  conversation_id UUID,
  id UUID,
  content TEXT,
  type TEXT,
  sent_at TIMESTAMPTZ,
  sender_id UUID
)
LANGUAGE sql STABLE AS $$
  SELECT DISTINCT ON (conversation_id)
    conversation_id,
    id,
    content,
    type,
    sent_at,
    sender_id
  FROM messages
  WHERE conversation_id = ANY(group_ids)
  ORDER BY conversation_id, sent_at DESC;
$$;

-- Returns member count per group conversation (batch fetch, avoids N+1)
CREATE OR REPLACE FUNCTION get_group_member_counts(group_ids UUID[])
RETURNS TABLE (
  conversation_id UUID,
  count BIGINT
)
LANGUAGE sql STABLE AS $$
  SELECT conversation_id, COUNT(*) AS count
  FROM conversation_participants
  WHERE conversation_id = ANY(group_ids)
  GROUP BY conversation_id;
$$;

-- ============================================================================
-- Grant execution rights to authenticated role
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_groups_last_messages(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_group_member_counts(UUID[]) TO authenticated;
