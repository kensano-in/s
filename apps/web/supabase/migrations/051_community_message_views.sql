-- Add viewed_by column to community_messages for seen receipts
ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS viewed_by TEXT[] DEFAULT '{}';

-- Index for efficient queries on viewed_by
CREATE INDEX IF NOT EXISTS idx_com_messages_viewed_by ON public.community_messages USING GIN (viewed_by);
