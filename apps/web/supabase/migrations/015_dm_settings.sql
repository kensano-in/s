-- Migration: DM Settings
-- This table stores unique chat settings pair-wise per conversation

CREATE TABLE IF NOT EXISTS public.dm_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  theme_id text DEFAULT 'midnight',
  theme_blur integer DEFAULT 0,
  disappearing_mode text DEFAULT 'off',
  partner_nickname text DEFAULT NULL,
  read_receipts boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Create unique constraint so each user only has one setting config per partner
  CONSTRAINT dm_settings_user_partner_key UNIQUE (user_id, partner_id)
);

-- RLS
ALTER TABLE public.dm_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own dm settings"
  ON public.dm_settings FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "Users can insert their own dm settings"
  ON public.dm_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "Users can update their own dm settings"
  ON public.dm_settings FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = partner_id);

-- Create storage bucket for theme pictures if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-themes', 'chat-themes', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for chat-themes bucket
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-themes');

CREATE POLICY "Authenticated users can upload themes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-themes' 
    AND auth.role() = 'authenticated'
  );
