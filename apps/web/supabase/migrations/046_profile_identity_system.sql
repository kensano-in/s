-- Migration: Profile Identity System Enhancements
-- Title: Add Quote, Presence, Milestones, Visitor Insights, and Reputation Tags

-- 1. Alter Users Table to add Quote, Presence, Invisible Mode, and Reputation Tags
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS quote VARCHAR(120);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS quote_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS presence_status TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS presence_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS invisible_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS expertise_tags TEXT[] DEFAULT '{}';

-- 2. Alter Followers Table to add status column for follow request validation
ALTER TABLE public.followers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted'));

-- 3. Create Profile Visitor Insights Table
CREATE TABLE IF NOT EXISTS public.profile_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    visitor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    visited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT unique_profile_visitor UNIQUE (profile_id, visitor_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_visits_profile_id ON public.profile_visits(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_visits_visited_at ON public.profile_visits(visited_at DESC);

-- 4. Create Profile Milestones (Timeline) Table
CREATE TABLE IF NOT EXISTS public.profile_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'system' or 'custom'
    title TEXT NOT NULL,
    description TEXT,
    milestone_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_milestones_user_id ON public.profile_milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_milestones_date ON public.profile_milestones(milestone_date DESC);
