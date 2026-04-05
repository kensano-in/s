-- ─── Direct Messages Table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at      TIMESTAMPTZ DEFAULT now()
);

-- Index for insanely fast conversation querying
CREATE INDEX IF NOT EXISTS idx_messages_participants ON messages(sender_id, recipient_id);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow users to read messages they sent or received
CREATE POLICY "Users can read their own messages" ON messages 
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Allow users to insert messages only if they are the sender
CREATE POLICY "Users can send messages" ON messages 
FOR INSERT WITH CHECK (auth.uid() = sender_id);
