-- Fix: messages table already exists but is missing ticket_id column
-- Run this in Supabase SQL Editor

-- Add ticket_id column if it doesn't exist
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sender_type TEXT NOT NULL DEFAULT 'user';

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS agent_name TEXT;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Create index now that column exists
CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON public.messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
