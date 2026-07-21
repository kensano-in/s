-- ══════════════════════════════════════════════════════════════════════════════
-- 048_community_realtime_replica.sql — Enable REPLICA IDENTITY FULL for Community
-- ══════════════════════════════════════════════════════════════════════════════

-- Set REPLICA IDENTITY FULL on community messages and reactions tables.
-- This ensures that UPDATE and DELETE replication events contain the complete
-- row data, preventing reaction deletes from arriving with undefined values.

ALTER TABLE public.community_messages           REPLICA IDENTITY FULL;
ALTER TABLE public.community_message_reactions REPLICA IDENTITY FULL;
