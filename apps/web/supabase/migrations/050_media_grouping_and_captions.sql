-- Add file_name, mime_type, and media_group_id to community_messages
ALTER TABLE public.community_messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.community_messages ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE public.community_messages ADD COLUMN IF NOT EXISTS media_group_id TEXT;

-- Add media_group_id to private messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_group_id TEXT;
