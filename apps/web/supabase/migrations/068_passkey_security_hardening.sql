-- ================================================================
-- Migration 068_passkey_security_hardening.sql
-- Hardens the WebAuthn/Passkey system against bypasses and attacks
-- ================================================================

-- 1. Server-side WebAuthn challenge store (prevents client-forged challenges)
CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NULL,
    type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_challenge ON public.webauthn_challenges(challenge);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires ON public.webauthn_challenges(expires_at);

CREATE OR REPLACE FUNCTION public.cleanup_expired_challenges()
RETURNS void AS $$
BEGIN
    DELETE FROM public.webauthn_challenges WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add security columns to passkeys table
ALTER TABLE public.passkeys
    ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS aaguid TEXT,
    ADD COLUMN IF NOT EXISTS sign_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS transports TEXT[];

-- 3. Tighten passkeys RLS - read only for users, all writes via admin client only
DROP POLICY IF EXISTS "Users can read own passkeys" ON public.passkeys;
DROP POLICY IF EXISTS "passkeys_select_own" ON public.passkeys;
CREATE POLICY "passkeys_select_own" ON public.passkeys
    FOR SELECT USING (auth.uid() = user_id);

-- 4. RLS on webauthn_challenges - deny all direct access
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "challenges_deny_all" ON public.webauthn_challenges;
CREATE POLICY "challenges_deny_all" ON public.webauthn_challenges
    FOR ALL USING (false);

-- 5. Rate limiting table for passkey auth attempts
CREATE TABLE IF NOT EXISTS public.passkey_auth_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_passkey_attempts_ip ON public.passkey_auth_attempts(ip_address, attempt_at);
ALTER TABLE public.passkey_auth_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attempts_deny_all" ON public.passkey_auth_attempts;
CREATE POLICY "attempts_deny_all" ON public.passkey_auth_attempts FOR ALL USING (false);
