-- ══════════════════════════════════════════════════════
-- 021_reactions_fix.sql — Message Reactions (idempotent)
-- Run in: Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════

-- Create table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (char_length(emoji) <= 10),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe re-run)
DROP POLICY IF EXISTS "Users manage own reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can read reactions"   ON public.message_reactions;

-- Recreate policies cleanly
CREATE POLICY "Users manage own reactions"
  ON public.message_reactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read reactions"
  ON public.message_reactions FOR SELECT
  USING (true);

-- Performance index (safe re-run)
CREATE INDEX IF NOT EXISTS idx_reactions_message_id
  ON public.message_reactions (message_id);

-- Realtime sync (ignore error if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
EXCEPTION WHEN others THEN NULL;
END $$;
