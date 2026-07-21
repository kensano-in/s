-- 1. Add shared theme settings to conversations table
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS theme_id TEXT DEFAULT 'midnight',
  ADD COLUMN IF NOT EXISTS theme_blur INTEGER DEFAULT 0;

-- 2. Add bubble_style to dm_settings (Critical for DM Sync)
ALTER TABLE public.dm_settings
  ADD COLUMN IF NOT EXISTS bubble_style TEXT DEFAULT 'glass';

-- 3. Ensure tables are in the Realtime Publication (Critical for Zero Latency)
-- This allows Supabase to broadcast changes to the frontend instantly.
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'dm_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE dm_settings;
  END IF;
END $$;
