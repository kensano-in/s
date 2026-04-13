-- ══════════════════════════════════════════════════════
-- 022_ken_bot_fix.sql — Ken System Bot (fixed username)
-- Run in: Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════

-- NOTE: The `users` table has a username_length CHECK constraint.
-- We use 'ken_system' to satisfy it, but display_name stays 'Ken'.
-- The UI shows display_name, username is only internal.

-- First: check what column constraints exist on users.username
-- (just informational, won't error)
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.users'::regclass AND conname LIKE '%username%';

-- Insert Ken bot into users table with valid username length
INSERT INTO public.users (
  id,
  username,
  display_name,
  avatar_url,
  bio
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'ken_system',
  'Ken',
  'https://api.dicebear.com/7.x/bottts/svg?seed=ken&backgroundColor=6200EE&scale=90',
  'System assistant. I set the stage.'
) ON CONFLICT (id) DO UPDATE SET
  username     = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  avatar_url   = EXCLUDED.avatar_url;

-- Also upsert into profiles if your app uses a separate profiles table
INSERT INTO public.profiles (
  id,
  username,
  display_name,
  avatar_url,
  bio
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'ken_system',
  'Ken',
  'https://api.dicebear.com/7.x/bottts/svg?seed=ken&backgroundColor=6200EE&scale=90',
  'System assistant. I set the stage.'
) ON CONFLICT (id) DO UPDATE SET
  username     = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  avatar_url   = EXCLUDED.avatar_url;
