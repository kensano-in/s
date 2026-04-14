-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 041: Finalize Realtime RLS — remove recursive subquery re-introduced
-- by migration 040.
-- ══════════════════════════════════════════════════════════════════════════════
-- PROBLEM:
--   Migration 040 dropped the safe "msg_select" policy (which used the
--   SECURITY DEFINER function) and replaced it with "msg_select_direct" which
--   does:  EXISTS (SELECT 1 FROM conversation_participants WHERE ...)
--   This re-introduces the self-referential RLS path that migration 039 fixed.
--   Supabase Realtime evaluates RLS to decide which clients get events.
--   When the SELECT policy recurses → Realtime crashes silently → no events.
--
-- FIX:
--   Drop the broken 040 policy. Re-apply the 039 approach using the
--   SECURITY DEFINER is_member_of_conversation() function.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Ensure messages has REPLICA IDENTITY FULL ─────────────────────────────────
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- ── Ensure messages is in the realtime publication ────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END$$;

-- ── Drop all SELECT policies on messages (clean slate) ────────────────────────
DROP POLICY IF EXISTS "msg_select"        ON public.messages;
DROP POLICY IF EXISTS "msg_select_direct" ON public.messages;

-- ── Recreate SELECT policy using SECURITY DEFINER function (no recursion) ─────
-- DM:    sender or recipient
-- Group: SECURITY DEFINER membership check (bypasses RLS → no recursion)
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

-- ══════════════════════════════════════════════════════════════════════════════
-- Verify the SECURITY DEFINER function still exists (created in 039).
-- If for any reason it was dropped, recreate it here.
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_member_of_conversation(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result BOOLEAN;
BEGIN
  -- SET LOCAL row_security = off bypasses all RLS for this function body.
  -- This is what prevents infinite recursion.
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

GRANT EXECUTE ON FUNCTION public.is_member_of_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_conversation(uuid) TO anon;

-- ══════════════════════════════════════════════════════════════════════════════
-- DONE. Summary:
--   ✅ msg_select_direct (040, recursive) → removed
--   ✅ msg_select (039 approach, SECURITY DEFINER) → restored
--   ✅ REPLICA IDENTITY FULL confirmed
--   ✅ supabase_realtime publication confirmed
--   ✅ is_member_of_conversation() SECURITY DEFINER confirmed
-- ══════════════════════════════════════════════════════════════════════════════
