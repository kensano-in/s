-- Run this in your Supabase Dashboard → SQL Editor
-- Ensures chat-files bucket exists, is public, and audio files are playable in browser

-- 1. Create the bucket (safe if already exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-files',
  'chat-files',
  true,
  52428800,  -- 50MB limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'audio/webm', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg',
    'application/pdf', 'text/plain',
    'application/zip', 'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- 2. Storage RLS policies (drop and recreate cleanly)
DROP POLICY IF EXISTS "Authenticated users can upload chat files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read chat files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own chat files" ON storage.objects;

CREATE POLICY "Authenticated users can upload chat files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-files');

CREATE POLICY "Anyone can read chat files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'chat-files');

CREATE POLICY "Users can delete own chat files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);
