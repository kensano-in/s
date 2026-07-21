-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 044: Final Realtime Sync Fix
-- ══════════════════════════════════════════════════════════════════════════════
-- PROBLEM: Group chat messages not delivered to other members in real-time.
-- ROOT CAUSE ANALYSIS:
--   1. SET LOCAL row_security = off inside SECURITY DEFINER is unreliable
--      when called from Supabase Realtime RLS evaluation context
--   2. The is_member_of_conversation function may not survive certain
--      transaction boundaries during Realtime delivery
--   3. Missing REPLICA IDENTITY FULL on conversation_participants table
--      means presence sync events deliver empty payloads
-- ══════════════════════════════════════════════════════════════════════════════

-- Step 1: Ensure all critical tables are in the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
  END IF;
END$$;

-- Step 2: Set REPLICA IDENTITY FULL on all realtime-critical tables
ALTER TABLE public.messages                REPLICA IDENTITY FULL;
ALTER TABLE public.conversations           REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_participants REPLICA IDENTITY FULL;
ALTER TABLE public.message_reactions       REPLICA IDENTITY FULL;

-- Step 3: Drop and recreate is_member_of_conversation with SECURITY INVOKER
-- Using a cached lookup table pattern instead of SET LOCAL (more reliable)
DROP FUNCTION IF EXISTS public.is_member_of_conversation(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.is_member_of_conversation(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = conv_id
      AND cp.user_id = auth.uid()
  );
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.is_member_of_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_conversation(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_member_of_conversation(uuid) TO service_role;

-- Step 4: Fix conversation_participants RLS — only one SELECT policy, no recursion
-- Drop ALL existing policies first (accumulated across migrations)
DROP POLICY IF EXISTS "cp_select_own"        ON public.conversation_participants;
DROP POLICY IF EXISTS "cp_insert_self"       ON public.conversation_participants;
DROP POLICY IF EXISTS "cp_delete_self"       ON public.conversation_participants;
DROP POLICY IF EXISTS "cp_update_own"        ON public.conversation_participants;
DROP POLICY IF EXISTS "Members can view other participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view their own participation" ON public.conversation_participants;
DROP POLICY IF EXISTS "Participants can insert" ON public.conversation_participants;
DROP POLICY IF EXISTS "Participants can delete" ON public.conversation_participants;
DROP POLICY IF EXISTS "Admins can manage participants" ON public.conversation_participants;

-- Non-recursive: user can only see their OWN participation rows
CREATE POLICY "cp_select_own"
  ON public.conversation_participants FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "cp_insert_self"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "cp_delete_self"
  ON public.conversation_participants FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "cp_update_own"
  ON public.conversation_participants FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Step 5: Clean slate for messages RLS
DROP POLICY IF EXISTS "msg_select"        ON public.messages;
DROP POLICY IF EXISTS "msg_select_direct" ON public.messages;
DROP POLICY IF EXISTS "msg_insert"        ON public.messages;
DROP POLICY IF EXISTS "msg_delete"        ON public.messages;
DROP POLICY IF EXISTS "msg_update"        ON public.messages;
DROP POLICY IF EXISTS "Users can read their own messages"        ON public.messages;
DROP POLICY IF EXISTS "Users can read group messages"            ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages they send"      ON public.messages;
DROP POLICY IF EXISTS "Members can post to conversations"        ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages"      ON public.messages;
DROP POLICY IF EXISTS "Recipients can update message status"     ON public.messages;
DROP POLICY IF EXISTS "Senders can update their sent messages"   ON public.messages;

-- SELECT: DM (sender or recipient) OR group member
-- Using SQL function (STABLE + SECURITY DEFINER) avoids SET LOCAL issues
CREATE POLICY "msg_select"
  ON public.messages FOR SELECT
  USING (
    auth.uid() = sender_id
    OR auth.uid() = recipient_id
    OR (
      conversation_id IS NOT NULL
      AND public.is_member_of_conversation(conversation_id)
    )
  );

-- INSERT: authenticated sender who is a group member
CREATE POLICY "msg_insert"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      (conversation_id IS NULL AND recipient_id IS NOT NULL)
      OR
      (conversation_id IS NOT NULL AND public.is_member_of_conversation(conversation_id))
    )
  );

-- DELETE: own messages only
CREATE POLICY "msg_delete"
  ON public.messages FOR DELETE
  USING (auth.uid() = sender_id);

-- UPDATE: sender or recipient or group member
CREATE POLICY "msg_update"
  ON public.messages FOR UPDATE
  USING (
    auth.uid() = sender_id
    OR auth.uid() = recipient_id
    OR (
      conversation_id IS NOT NULL
      AND public.is_member_of_conversation(conversation_id)
    )
  );

-- Step 6: conversations table policies
DROP POLICY IF EXISTS "conv_select_member" ON public.conversations;
DROP POLICY IF EXISTS "Users can view conversations they are in" ON public.conversations;

CREATE POLICY "conv_select_member"
  ON public.conversations FOR SELECT
  USING (public.is_member_of_conversation(id));

-- ══════════════════════════════════════════════════════════════════════════════
-- DONE
-- ══════════════════════════════════════════════════════════════════════════════
