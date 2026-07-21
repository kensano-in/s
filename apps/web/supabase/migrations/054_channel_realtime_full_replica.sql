-- ══════════════════════════════════════════════════════════════════════════════
-- 054_channel_realtime_full_replica.sql
-- Enable REPLICA IDENTITY FULL on community_channels so that DELETE events
-- carry the complete old row (id, name, etc.) for instant realtime sync.
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.community_channels REPLICA IDENTITY FULL;

-- Also add community_channels to the realtime publication if not already there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'community_channels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_channels;
  END IF;
END $$;
