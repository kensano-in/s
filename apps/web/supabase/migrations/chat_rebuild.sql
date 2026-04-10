-- ═══════════════════════════════════════════════════════════════════════════
-- VERLYN CHAT — DB MIGRATION
-- Run this ONCE in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- All operations are idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Step 1: Add columns to messages table ───────────────────────────────────
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS type       TEXT    NOT NULL DEFAULT 'text'
    CHECK (type IN ('text', 'image', 'file', 'voice', 'system')),
  ADD COLUMN IF NOT EXISTS status     TEXT    NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sending', 'sent', 'delivered', 'seen', 'error')),
  ADD COLUMN IF NOT EXISTS media_url  TEXT,
  ADD COLUMN IF NOT EXISTS file_name  TEXT,
  ADD COLUMN IF NOT EXISTS mime_type  TEXT;

-- ── Step 2: Add is_online column to users (if missing) ──────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_online          BOOLEAN   DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS messaging_permission TEXT    DEFAULT 'everyone'
    CHECK (messaging_permission IN ('everyone', 'followers', 'none'));

-- ── Step 3: Create blocks table ──────────────────────────────────────────────
-- (Will coexist with blocked_users if that already exists)
CREATE TABLE IF NOT EXISTS blocks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

-- ── Step 4: Performance indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_messages_sent_at
  ON messages (sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient
  ON messages (sender_id, recipient_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_recipient_sender
  ON messages (recipient_id, sender_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker
  ON blocks (blocker_id);

CREATE INDEX IF NOT EXISTS idx_blocks_blocked
  ON blocks (blocked_id);

-- ── Step 5: RLS Policies for messages ───────────────────────────────────────
-- Enable RLS (idempotent)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own messages
DROP POLICY IF EXISTS "Users can read their own messages" ON messages;
CREATE POLICY "Users can read their own messages"
  ON messages FOR SELECT
  USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

-- Allow users to insert messages they send
DROP POLICY IF EXISTS "Users can insert messages they send" ON messages;
CREATE POLICY "Users can insert messages they send"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Allow users to delete their own sent messages
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
CREATE POLICY "Users can delete their own messages"
  ON messages FOR DELETE
  USING (auth.uid() = sender_id);

-- Allow users to update status on messages they received (mark seen)
DROP POLICY IF EXISTS "Recipients can update message status" ON messages;
CREATE POLICY "Recipients can update message status"
  ON messages FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- ── Step 6: RLS for blocks table ────────────────────────────────────────────
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own blocks" ON blocks;
CREATE POLICY "Users manage their own blocks"
  ON blocks FOR ALL
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

-- ── Step 7: Enable Realtime on messages ─────────────────────────────────────
-- Run in the Supabase Dashboard → Database → Replication → Tables
-- Ensure `messages` is in the replication publication.
-- SQL equivalent (may require superuser):
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ── Step 8: Supabase Storage bucket for chat-files ──────────────────────────
-- Run in Dashboard → Storage → Create Bucket (if not exists):
--   Name: chat-files
--   Public: true
-- Then add this storage policy:
INSERT INTO storage.buckets (id, name, public)
  VALUES ('chat-files', 'chat-files', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload chat files" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-files');

DROP POLICY IF EXISTS "Anyone can read chat files" ON storage.objects;
CREATE POLICY "Anyone can read chat files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-files');

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE. Verify with:
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'messages';
-- ═══════════════════════════════════════════════════════════════════════════
