-- ═══════════════════════════════════════════════════════════════
-- RT-FIX: Realtime message delivery reliability
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ═══════════════════════════════════════════════════════════════
-- This fixes the 20-30s message delivery delay for:
--   1. Group messages (RLS blocks CDC for non-sender/non-recipient)
--   2. Reliable REPLICA IDENTITY for DELETE events
--   3. Ensures messages table is in the realtime publication

-- ── Step 1: Ensure messages table has REPLICA IDENTITY FULL ────
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- ── Step 2: Fix messages RLS so all conversation participants ──
-- can receive Realtime CDC events (postgres_changes INSERT).
-- Drop exact existing SELECT policies discovered in database:
DROP POLICY IF EXISTS "Users can read own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can read their own messages" ON public.messages;
DROP POLICY IF EXISTS "message_read" ON public.messages;
DROP POLICY IF EXISTS "msg_select" ON public.messages;
DROP POLICY IF EXISTS "msg_select_v3" ON public.messages;
DROP POLICY IF EXISTS "read_own_messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can read their messages" ON public.messages;
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
DROP POLICY IF EXISTS "Allow users to read messages in their conversations" ON public.messages;

-- Create unified, participant-aware SELECT policy for Realtime CDC
CREATE POLICY "rt_messages_select" ON public.messages
  FOR SELECT
  USING (
    auth.uid() = sender_id
    OR auth.uid() = recipient_id
    OR (
      conversation_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = messages.conversation_id
          AND cp.user_id = auth.uid()
      )
    )
  );

-- ── Step 3: Enable Realtime on the messages table ──────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── Step 4: Ensure conversation_participants is also in Realtime ─
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── Step 5: Index for fast RLS policy evaluation ───────────────
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv_user
  ON public.conversation_participants (conversation_id, user_id);
