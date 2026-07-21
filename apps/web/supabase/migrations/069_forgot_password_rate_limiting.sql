-- ================================================================
-- Migration 069_forgot_password_rate_limiting.sql
-- Rate limiting infrastructure for password recovery / reset
-- ================================================================

CREATE TABLE IF NOT EXISTS public.password_reset_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast rate-limiting queries by IP and time range
CREATE INDEX IF NOT EXISTS idx_reset_attempts_ip ON public.password_reset_attempts(ip_address, attempt_at);

-- Tighten security: Disable direct client access, writes via server admin client only
ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attempts_deny_all" ON public.password_reset_attempts;
CREATE POLICY "attempts_deny_all" ON public.password_reset_attempts 
    FOR ALL USING (false);
