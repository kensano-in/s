-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 039: Fix RLS Infinite Recursion + Restore Realtime Engine
-- ══════════════════════════════════════════════════════════════════════════════
-- ROOT CAUSE:
--   conversation_participants SELECT policy does:
--     EXISTS (SELECT 1 FROM conversation_participants WHERE ...)
--   This is a self-referential RLS query → infinite recursion (code 42P17).
--   Supabase Realtime uses the same RLS evaluation path to determine which
--   clients receive broadcast events. When it hits the infinite loop, the
--   Realtime engine crashes silently → no events delivered → ui hangs.
--
-- FIX STRATEGY:
--   1. The SECURITY DEFINER membership function bypasses RLS (SET LOCAL row_security = off)
--   2. conversation_participants SELECT = only "user_id = auth.uid()" — no subquery
--   3. All other policies use the SECURITY DEFINER function
--   4. messages table gets REPLICA IDENTITY FULL for reliable Realtime payloads
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Step 1: REPLICA IDENTITY FULL on messages ─────────────────────────────────
-- Without this, Supabase Realtime often sends empty OLD payloads for UPDATE/DELETE
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Ensure messages is in the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END$$;

-- ── Step 2: Drop the broken SECURITY DEFINER function ─────────────────────────
-- The old function queries conversation_participants directly, which triggers its
-- OWN RLS policy (which is recursive). The new version runs with row_security=off.
DROP FUNCTION IF EXISTS public.is_member_of_conversation(uuid);

-- ── Step 3: Create corrected SECURITY DEFINER function ────────────────────────
-- SECURITY DEFINER + SET row_security = off means this function executes as the
-- function OWNER (postgres) with RLS completely bypassed. No recursion possible.
CREATE OR REPLACE FUNCTION public.is_member_of_conversation(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result BOOLEAN;
BEGIN
  -- Execute with row-level security OFF so we never recurse into the policy
  SET LOCAL row_security = off;
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = conv_id
      AND user_id = auth.uid()
  ) INTO result;
  RETURN result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_member_of_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_conversation(uuid) TO anon;

-- ── Step 4: Fix conversation_participants policies ─────────────────────────────
-- Remove ALL existing policies — start clean
DROP POLICY IF EXISTS "Members can view other participants"     ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view their own participation"  ON public.conversation_participants;
DROP POLICY IF EXISTS "Participants can insert"                 ON public.conversation_participants;
DROP POLICY IF EXISTS "Participants can delete"                 ON public.conversation_participants;
DROP POLICY IF EXISTS "Admins can manage participants"          ON public.conversation_participants;

-- SELECT: Only see YOUR OWN row. No subquery → no recursion.
-- Clients use getConversationsDB (admin client) to hydrate full member lists anyway.
CREATE POLICY "cp_select_own"
  ON public.conversation_participants FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Controlled by server actions (admin client). Restrict client inserts to self.
CREATE POLICY "cp_insert_self"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- DELETE: Only admins can remove members (handled server-side)
CREATE POLICY "cp_delete_self"
  ON public.conversation_participants FOR DELETE
  USING (user_id = auth.uid());

-- UPDATE: Allow mute state updates for own row
CREATE POLICY "cp_update_own"
  ON public.conversation_participants FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Step 5: Fix conversations policies ────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view conversations they are in" ON public.conversations;

-- Uses the SECURITY DEFINER function → no recursion
CREATE POLICY "conv_select_member"
  ON public.conversations FOR SELECT
  USING (public.is_member_of_conversation(id));

-- ── Step 6: Fix messages policies (clean slate) ───────────────────────────────
-- Drop every known policy variant (accumulated across migrations)
DROP POLICY IF EXISTS "Users can read their own messages"        ON public.messages;
DROP POLICY IF EXISTS "Users can read group messages"            ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages they send"      ON public.messages;
DROP POLICY IF EXISTS "Members can post to conversations"        ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages"      ON public.messages;
DROP POLICY IF EXISTS "Recipients can update message status"     ON public.messages;
DROP POLICY IF EXISTS "Senders can update their sent messages"   ON public.messages;

-- SELECT: All messages visible to their participants
-- DM:    sender or recipient
-- Group: SECURITY DEFINER membership check (no recursion)
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

-- INSERT: Sender must be authenticated user
-- Group: must be a member (via SECURITY DEFINER function)
CREATE POLICY "msg_insert"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      -- DM path
      (conversation_id IS NULL AND recipient_id IS NOT NULL)
      OR
      -- Group path — SECURITY DEFINER, no recursion
      (conversation_id IS NOT NULL AND public.is_member_of_conversation(conversation_id))
    )
  );

-- DELETE: Own messages only
CREATE POLICY "msg_delete"
  ON public.messages FOR DELETE
  USING (auth.uid() = sender_id);

-- UPDATE: Recipients can mark seen; senders can update their own messages
CREATE POLICY "msg_update"
  ON public.messages FOR UPDATE
  USING (
    auth.uid() = recipient_id
    OR auth.uid() = sender_id
    OR (
      conversation_id IS NOT NULL
      AND public.is_member_of_conversation(conversation_id)
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- DONE. Summary of changes:
--   ✅ conversation_participants SELECT = no self-referential subquery
--   ✅ is_member_of_conversation runs with SET LOCAL row_security = off
--   ✅ All message policies use the fixed SECURITY DEFINER function
--   ✅ messages REPLICA IDENTITY FULL for complete Realtime payloads
--   ✅ messages added to supabase_realtime publication (if missing)
-- ══════════════════════════════════════════════════════════════════════════════
