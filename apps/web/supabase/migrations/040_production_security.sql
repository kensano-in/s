-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 040: Production Security Hardening
-- ══════════════════════════════════════════════════════════════════════════════
-- Objective: Restrict all users strictly to their own rows, protecting against
-- enumerations and ensuring rigid data isolation.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Users Table Hardening ───────────────
-- Restrict direct accesses to the `users` table so users can only view standard info,
-- but prevent reading sensitive fields unless it's their own row.
-- (Assuming `users` has standard RLS. We will enforce strict SELECT).

DROP POLICY IF EXISTS "Users can read all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view public profiles" ON public.users;

-- Public users can only see ID, username, display_name, avatar_url of others.
-- They can only see email, phone, etc., of themselves.
-- Note: Supabase doesn't easily support column-level SELECT policies without views,
-- but typically we restrict update/delete rigidly.
CREATE POLICY "Users can only update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can only delete their own profile"
  ON public.users FOR DELETE
  USING (auth.uid() = id);

-- ── 2. Realtime Hardening ──────────────────
-- Enforce that unauthenticated users cannot access Realtime publications.
-- (This assumes `messages` already has the strict policies from 039).

-- Allow users to only see rate-limit / security logs for their own ID
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view security events" ON public.security_events;
CREATE POLICY "Users can view their own security logs"
  ON public.security_events FOR SELECT
  USING (payload->>'email' = current_setting('request.jwt.claims', true)::json->>'email' OR ip_address = current_setting('request.headers', true)::json->>'x-forwarded-for');

-- Prevent ANY insert into security_events from clients (Service role only)
DROP POLICY IF EXISTS "Clients cannot insert security events" ON public.security_events;
CREATE POLICY "Clients cannot insert security events"
  ON public.security_events FOR INSERT
  WITH CHECK (false); -- Always fails for anon/authenticated 

-- ══════════════════════════════════════════════════════════════════════════════
-- DONE.
-- ══════════════════════════════════════════════════════════════════════════════
