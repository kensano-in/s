-- Migration: Add Reports and Stickers tables

-- 1. Create the `reports` table (skip if exists)
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reported_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED', 'PUNISHED', 'DISMISSED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Service role can do anything (admin server actions use service role key)
CREATE POLICY "Service role full access on reports" ON reports
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. Create the `stickers` table (skip if exists)
CREATE TABLE IF NOT EXISTS stickers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'PRIVATE' CHECK (status IN ('PRIVATE', 'PENDING_REVIEW', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for stickers
ALTER TABLE stickers ENABLE ROW LEVEL SECURITY;

-- Service role can do anything
CREATE POLICY "Service role full access on stickers" ON stickers
  FOR ALL
  USING (true)
  WITH CHECK (true);
