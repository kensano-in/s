-- Add reply_to_id column to community_messages to support replies in community channels
ALTER TABLE public.community_messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.community_messages(id) ON DELETE SET NULL;

-- Create an index to optimize reply lookups
CREATE INDEX IF NOT EXISTS idx_com_messages_reply_to_id ON public.community_messages(reply_to_id);
