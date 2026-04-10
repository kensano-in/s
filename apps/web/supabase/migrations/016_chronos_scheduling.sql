-- Migration: Chronos Scheduling
-- Adds temporary deployment columns to messages table

-- 1. Add scheduling columns
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS scheduled_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_released boolean DEFAULT true; -- Default true for normal messages

-- 2. Update existing messages to be 'released'
UPDATE public.messages SET is_released = true WHERE is_released IS NULL;

-- 3. Update RLS policies to restrict scheduled messages
-- Recipients should NOT see messages that are not yet released
DROP POLICY IF EXISTS "Users can read their own messages" ON public.messages;

CREATE POLICY "Users can read their own messages" 
ON public.messages 
FOR SELECT 
USING (
  auth.uid() = sender_id 
  OR (
    auth.uid() = recipient_id 
    AND (is_released = true OR scheduled_at IS NULL OR scheduled_at <= now())
  )
);

-- Index for temporal release checks
CREATE INDEX IF NOT EXISTS idx_messages_scheduled ON public.messages(is_released, scheduled_at) WHERE is_released = false;
