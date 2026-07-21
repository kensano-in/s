-- Add view_once column to community_messages to support view-once voice notes and media
ALTER TABLE public.community_messages ADD COLUMN IF NOT EXISTS view_once BOOLEAN DEFAULT FALSE;

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
