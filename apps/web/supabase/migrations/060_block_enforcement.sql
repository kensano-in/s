-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 060_block_enforcement.sql
-- Comprehensive fix for block/unblock enforcement
-- Run this in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Fix blocks table RLS policies ────────────────────────────────────────
-- The existing policy (blocker_id = auth.uid()) prevents users from reading
-- blocks WHERE THEY ARE THE BLOCKED PARTY. This means the client-side supabase
-- cannot see "who blocked me" — breaking bidirectional enforcement.

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Drop the broken single-direction policy
DROP POLICY IF EXISTS "Users manage their own blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can read blocks involving them" ON public.blocks;
DROP POLICY IF EXISTS "Users can insert their own blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can delete their own blocks" ON public.blocks;

-- READ: Allow a user to read any block row where THEY are involved (either side)
-- This is needed for client-side feed filtering, RightPanel, etc.
CREATE POLICY "Users can read blocks involving them"
  ON public.blocks FOR SELECT
  USING (
    auth.uid() = blocker_id
    OR auth.uid() = blocked_id
  );

-- INSERT: Only the blocker can create a block
CREATE POLICY "Users can insert their own blocks"
  ON public.blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

-- DELETE (unblock): Only the blocker can remove their own block
CREATE POLICY "Users can delete their own blocks"
  ON public.blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- UPDATE: Not needed for blocks, but allow for future-proofing
-- (no UPDATE policy = UPDATE is denied by default)


-- ─── 2. Ensure indexes exist for block lookups ────────────────────────────────
-- These make the bidirectional OR query fast at scale

CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON public.blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON public.blocks (blocked_id);

-- Composite index for the common bidirectional lookup pattern
CREATE INDEX IF NOT EXISTS idx_blocks_pair ON public.blocks (blocker_id, blocked_id);


-- ─── 3. followers table — ensure status column exists ────────────────────────
-- Needed for the blockUserDB side effect that deletes pending follow requests

ALTER TABLE public.followers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'accepted'
  CHECK (status IN ('pending', 'accepted'));


-- ─── 4. posts table — ensure author_id index exists for fast block filtering ──
-- Without this, the .not('author_id', 'in', ...) filter does a full table scan

CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts (author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts (created_at DESC);

-- Composite: author + time (used by the feed query)
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON public.posts (author_id, created_at DESC);


-- ─── 5. stories table — ensure author_id index for block filtering ────────────
CREATE INDEX IF NOT EXISTS idx_stories_author_id ON public.stories (author_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories (expires_at);


-- ─── 6. RPC helper: get_blocked_ids_for_user ─────────────────────────────────
-- Server-callable function that returns all user IDs invisible to a given user.
-- Used by server actions (explore, feed) that run as service role.
-- Returns both directions: who the user blocked AND who blocked the user.

CREATE OR REPLACE FUNCTION public.get_blocked_ids_for_user(p_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT CASE
      WHEN blocker_id = p_user_id THEN blocked_id
      ELSE blocker_id
    END
    FROM blocks
    WHERE blocker_id = p_user_id OR blocked_id = p_user_id
  );
$$;

-- Grant execute to authenticated users (they can call it via RPC)
GRANT EXECUTE ON FUNCTION public.get_blocked_ids_for_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_blocked_ids_for_user(UUID) TO service_role;


-- ─── 7. Verify blocks table exists and has correct structure ──────────────────
-- (This is a safe no-op if it already exists)

CREATE TABLE IF NOT EXISTS public.blocks (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
