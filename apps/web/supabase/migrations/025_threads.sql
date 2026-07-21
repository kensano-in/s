-- ══════════════════════════════════════════════════════════════════
-- 025_threads.sql — Reply Threads (Discord-style)
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ══════════════════════════════════════════════════════════════════

-- 1. Thread root reference
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS thread_root_id UUID REFERENCES public.messages(id) ON DELETE CASCADE;

-- 2. Cached reply count for performance (updated by trigger)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_count INT DEFAULT 0;

-- 3. Index for fetching all replies in a thread
CREATE INDEX IF NOT EXISTS idx_messages_thread_root_id
  ON public.messages (thread_root_id)
  WHERE thread_root_id IS NOT NULL;

-- 4. Trigger to auto-increment reply_count on root message
CREATE OR REPLACE FUNCTION increment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.thread_root_id IS NOT NULL THEN
    UPDATE public.messages
    SET reply_count = reply_count + 1
    WHERE id = NEW.thread_root_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_increment_reply_count ON public.messages;
CREATE TRIGGER trg_increment_reply_count
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION increment_reply_count();

-- 5. Trigger to decrement on delete
CREATE OR REPLACE FUNCTION decrement_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.thread_root_id IS NOT NULL THEN
    UPDATE public.messages
    SET reply_count = GREATEST(0, reply_count - 1)
    WHERE id = OLD.thread_root_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_decrement_reply_count ON public.messages;
CREATE TRIGGER trg_decrement_reply_count
  AFTER DELETE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION decrement_reply_count();

-- Verify:
-- SELECT id, thread_root_id, reply_count FROM public.messages LIMIT 3;
