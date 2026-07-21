-- Migration 055: Spotify Music Integration
-- 1. Alter post_audio_cards to support advanced Spotify metadata
ALTER TABLE public.post_audio_cards ADD COLUMN IF NOT EXISTS album_name TEXT;
ALTER TABLE public.post_audio_cards ADD COLUMN IF NOT EXISTS playback_start_position INTEGER DEFAULT 0;
ALTER TABLE public.post_audio_cards ADD COLUMN IF NOT EXISTS playback_end_position INTEGER DEFAULT 30;
ALTER TABLE public.post_audio_cards ADD COLUMN IF NOT EXISTS duration_ms INTEGER DEFAULT 0;

-- 2. Create user_spotify_connections table to securely store user credentials
CREATE TABLE IF NOT EXISTS public.user_spotify_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    spotify_user_id TEXT NOT NULL,
    display_name TEXT,
    profile_image TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Configure RLS (Row Level Security) on user_spotify_connections
ALTER TABLE public.user_spotify_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own spotify connection" ON public.user_spotify_connections;
CREATE POLICY "Users can view their own spotify connection" ON public.user_spotify_connections
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own spotify connection" ON public.user_spotify_connections;
CREATE POLICY "Users can delete their own spotify connection" ON public.user_spotify_connections
    FOR DELETE USING (auth.uid() = user_id);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
