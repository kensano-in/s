-- ═══════════════════════════════════════════════════════════════════════════════
-- Realtime Synchronization & Replication Repair
-- Run this in the Supabase SQL Editor to resolve CHANNEL_ERROR overlays.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Create or Force Refresh 'supabase_realtime' Publication ──────────────
-- Re-initializing the publication ensures all tables are correctly registered.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- ── 2. Enable Realtime for Core Tables ────────────────────────────────────────
-- Any table subscribed to via 'postgres_changes' MUST be added to the publication.
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE dm_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_theme;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_nicknames;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE engagement_logs; -- Support live analytics debug

-- Note: If tables were already added, the above might error; use this safe block if needed:
/*
ALTER PUBLICATION supabase_realtime SET TABLE 
  messages, 
  conversations, 
  conversation_participants, 
  dm_settings, 
  chat_theme, 
  chat_nicknames, 
  message_reactions, 
  engagement_logs;
*/

-- ── 3. Optimized Replica Identity ──────────────────────────────────────────────
-- 'FULL' ensures that DELETE and UPDATE events contain the old row data, 
-- which is required for many of our UI state reconciliation triggers.
ALTER TABLE messages SET REPLICA IDENTITY FULL;
ALTER TABLE conversations SET REPLICA IDENTITY FULL;
ALTER TABLE conversation_participants SET REPLICA IDENTITY FULL;

-- ── 4. Fix RLS Presence Conflict ──────────────────────────────────────────────
-- Ensure authenticated users can always read their own presence data.
-- This prevents the 'CHANNEL_ERROR' on .track() calls.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can see own presence'
  ) THEN
    CREATE POLICY "Users can see own presence" ON users
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

-- ── 5. Grant Replication Privileges ───────────────────────────────────────────
-- Ensures the 'authenticated' role has permission to listen to the replication slot.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
