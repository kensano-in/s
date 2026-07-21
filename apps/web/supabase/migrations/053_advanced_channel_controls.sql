-- Migration 053: Advanced Channel Controls

-- 1. Alter community_channels table to support advanced controls
ALTER TABLE public.community_channels 
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'voice')),
  ADD COLUMN IF NOT EXISTS password TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS slow_mode_cooldown INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;

-- 2. Create community_channel_members table to track joined users
CREATE TABLE IF NOT EXISTS public.community_channel_members (
  channel_id UUID NOT NULL REFERENCES public.community_channels(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

-- 3. Create community_channel_approvals table to track request states
CREATE TABLE IF NOT EXISTS public.community_channel_approvals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.community_channels(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED')),
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (channel_id, user_id)
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.community_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_channel_approvals ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies for community_channel_members
DROP POLICY IF EXISTS "Allow members to view channel memberships" ON public.community_channel_members;
CREATE POLICY "Allow members to view channel memberships" ON public.community_channel_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow users to join/unjoin channels" ON public.community_channel_members;
CREATE POLICY "Allow users to join/unjoin channels" ON public.community_channel_members
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow admins to manage all memberships" ON public.community_channel_members;
CREATE POLICY "Allow admins to manage all memberships" ON public.community_channel_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.community_members cm
      JOIN public.community_channels cc ON cc.community_id = cm.community_id
      WHERE cc.id = channel_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'moderator', 'owner')
    )
  );

-- 6. Create RLS Policies for community_channel_approvals
DROP POLICY IF EXISTS "Allow users to view their own approvals" ON public.community_channel_approvals;
CREATE POLICY "Allow users to view their own approvals" ON public.community_channel_approvals
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to submit approval requests" ON public.community_channel_approvals;
CREATE POLICY "Allow users to submit approval requests" ON public.community_channel_approvals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow admins to view/manage approvals" ON public.community_channel_approvals;
CREATE POLICY "Allow admins to view/manage approvals" ON public.community_channel_approvals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.community_members cm
      JOIN public.community_channels cc ON cc.community_id = cm.community_id
      WHERE cc.id = channel_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'moderator', 'owner')
    )
  );

-- 7. Add tables to supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'community_channel_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_channel_members;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'community_channel_approvals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_channel_approvals;
  END IF;
END $$;
