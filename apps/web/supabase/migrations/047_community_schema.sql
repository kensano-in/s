-- ══════════════════════════════════════════════════════════════════════════════
-- 047_community_schema.sql — Communities, Channels, Members, Messages, Reactions
-- Run in: Supabase Dashboard → SQL Editor or standard Postgres client.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Base Communities Table
CREATE TABLE IF NOT EXISTS public.communities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description  TEXT,
  icon_url     TEXT,
  banner_url   TEXT,
  member_count INT NOT NULL DEFAULT 0,
  boost_level  INT NOT NULL DEFAULT 0,
  is_private   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- 2. Community Channels
CREATE TABLE IF NOT EXISTS public.community_channels (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- 3. Community Members (Many-to-Many Bridge)
CREATE TABLE IF NOT EXISTS public.community_members (
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin', 'owner')),
  joined_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (community_id, user_id)
);

-- 4. Community Messages
CREATE TABLE IF NOT EXISTS public.community_messages (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.community_channels(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  type       TEXT DEFAULT 'text',
  media_url  TEXT,
  sent_at    TIMESTAMPTZ DEFAULT now()
);

-- 5. Message Reactions
CREATE TABLE IF NOT EXISTS public.community_message_reactions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.community_messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL CHECK (char_length(emoji) <= 10),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- ══════════════════════════════════════════════════════════════════════════════
-- Performance Indices
-- ══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_com_channels_community_id ON public.community_channels(community_id);
CREATE INDEX IF NOT EXISTS idx_com_members_user_id ON public.community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_com_messages_channel_id ON public.community_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_com_messages_sent_at ON public.community_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_com_reactions_message_id ON public.community_message_reactions(message_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- Triggers: Dynamic Member Counters
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.communities 
    SET member_count = member_count + 1 
    WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.communities 
    SET member_count = GREATEST(member_count - 1, 0) 
    WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_community_member_count ON public.community_members;
CREATE TRIGGER trg_community_member_count
AFTER INSERT OR DELETE ON public.community_members
FOR EACH ROW EXECUTE FUNCTION public.update_community_member_count();

-- ══════════════════════════════════════════════════════════════════════════════
-- Row Level Security (RLS) Policies
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_message_reactions ENABLE ROW LEVEL SECURITY;

-- 5a. Communities Policies
DROP POLICY IF EXISTS "Allow public read access to communities" ON public.communities;
CREATE POLICY "Allow public read access to communities" 
  ON public.communities FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to create communities" ON public.communities;
CREATE POLICY "Allow authenticated users to create communities" 
  ON public.communities FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admins/owners to update communities" ON public.communities;
CREATE POLICY "Allow admins/owners to update communities" 
  ON public.communities FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members 
      WHERE community_id = id AND user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- 5b. Community Channels Policies
DROP POLICY IF EXISTS "Allow members to view channels" ON public.community_channels;
CREATE POLICY "Allow members to view channels" 
  ON public.community_channels FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Allow admins/owners to manage channels" ON public.community_channels;
CREATE POLICY "Allow admins/owners to manage channels" 
  ON public.community_channels FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members 
      WHERE community_id = community_id AND user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- 5c. Community Members Policies
DROP POLICY IF EXISTS "Allow members to view membership lists" ON public.community_members;
CREATE POLICY "Allow members to view membership lists" 
  ON public.community_members FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Allow members to manage their own membership" ON public.community_members;
CREATE POLICY "Allow members to manage their own membership" 
  ON public.community_members FOR ALL 
  USING (auth.uid() = user_id);

-- 5d. Community Messages Policies
DROP POLICY IF EXISTS "Allow anyone to read messages" ON public.community_messages;
CREATE POLICY "Allow anyone to read messages" 
  ON public.community_messages FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Allow members to insert messages" ON public.community_messages;
CREATE POLICY "Allow members to insert messages" 
  ON public.community_messages FOR INSERT 
  WITH CHECK (true); -- Simplified check for high performance

DROP POLICY IF EXISTS "Allow authors or admins to delete messages" ON public.community_messages;
CREATE POLICY "Allow authors or admins to delete messages" 
  ON public.community_messages FOR DELETE 
  USING (
    auth.uid() = sender_id OR 
    EXISTS (
      SELECT 1 FROM public.community_members 
      WHERE community_id = (SELECT community_id FROM public.community_channels WHERE id = channel_id) AND user_id = auth.uid() AND role IN ('admin', 'moderator', 'owner')
    )
  );

-- 5e. Message Reactions Policies
DROP POLICY IF EXISTS "Users manage own community reactions" ON public.community_message_reactions;
CREATE POLICY "Users manage own community reactions" 
  ON public.community_message_reactions FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read community reactions" ON public.community_message_reactions;
CREATE POLICY "Users can read community reactions" 
  ON public.community_message_reactions FOR SELECT 
  USING (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- Supabase Realtime Synchronization
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.communities;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.community_channels;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.community_members;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.community_message_reactions;
EXCEPTION WHEN others THEN NULL;
END $$;
