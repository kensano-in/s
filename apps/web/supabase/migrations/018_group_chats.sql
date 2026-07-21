-- ── Group Chats Migration ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  icon_url    TEXT,
  join_code   TEXT        UNIQUE NOT NULL,
  is_group    BOOLEAN     DEFAULT TRUE,
  creator_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role             TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

-- Member count constraint (max 20)
CREATE OR REPLACE FUNCTION check_conversation_member_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT count(*) FROM conversation_participants WHERE conversation_id = NEW.conversation_id) >= 20 THEN
    RAISE EXCEPTION 'Group member limit reached (max 20)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_conversation_member_limit ON conversation_participants;
CREATE TRIGGER tr_check_conversation_member_limit
BEFORE INSERT ON conversation_participants
FOR EACH ROW EXECUTE FUNCTION check_conversation_member_limit();

-- Update messages table to support groups
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Group access policies
DROP POLICY IF EXISTS "Users can view conversations they are in" ON conversations;
CREATE POLICY "Users can view conversations they are in" ON conversations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = conversations.id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Members can view other participants" ON conversation_participants;
CREATE POLICY "Members can view other participants" ON conversation_participants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = conversation_participants.conversation_id AND user_id = auth.uid())
  );

-- Update message policies for groups
DROP POLICY IF EXISTS "Users can read group messages" ON messages;
CREATE POLICY "Users can read group messages" ON messages
  FOR SELECT USING (
    conversation_id IS NOT NULL AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Members can post to conversations" ON messages;
CREATE POLICY "Members can post to conversations" ON messages
  FOR INSERT WITH CHECK (
    conversation_id IS NOT NULL AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
  );

-- Storage for Group Icons
INSERT INTO storage.buckets (id, name, public)
  VALUES ('group-icons', 'group-icons', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload group icons" ON storage.objects;
CREATE POLICY "Authenticated users can upload group icons"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'group-icons');

DROP POLICY IF EXISTS "Anyone can read group icons" ON storage.objects;
CREATE POLICY "Anyone can read group icons"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'group-icons');
