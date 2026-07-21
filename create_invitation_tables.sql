-- ================================================
-- VERLYN — INVITATION SYSTEM TABLES
-- Run this in your Supabase SQL Editor
-- ================================================

-- 1. invitations
CREATE TABLE IF NOT EXISTS public.invitations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code              TEXT NOT NULL,
    code_hash         TEXT NOT NULL UNIQUE,
    email             TEXT NOT NULL,
    email_hash        TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'active', -- active, used, expired, revoked
    issued_by         TEXT,
    notes             TEXT,
    redeemed_ip_hash  TEXT,
    revoked_at        TIMESTAMP WITH TIME ZONE,
    revoked_by        TEXT,
    redeemed_at       TIMESTAMP WITH TIME ZONE,
    expires_at        TIMESTAMP WITH TIME ZONE NOT NULL,
    issued_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on invitations" ON public.invitations;
CREATE POLICY "Service role full access on invitations" ON public.invitations FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_invitations_code_hash ON public.invitations(code_hash);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);

-- 2. invitation_sessions
CREATE TABLE IF NOT EXISTS public.invitation_sessions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id  UUID REFERENCES public.invitations(id) ON DELETE CASCADE,
    stage          TEXT NOT NULL, -- code_verified, email_verified, otp_verified, agreements_accepted
    jti            TEXT NOT NULL UNIQUE,
    ip_hash        TEXT,
    ua_hash        TEXT,
    advanced_at    TIMESTAMP WITH TIME ZONE,
    expires_at     TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.invitation_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on invitation_sessions" ON public.invitation_sessions;
CREATE POLICY "Service role full access on invitation_sessions" ON public.invitation_sessions FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_invitation_sessions_jti ON public.invitation_sessions(jti);
CREATE INDEX IF NOT EXISTS idx_invitation_sessions_invitation_id ON public.invitation_sessions(invitation_id);

-- 3. agreement_acceptances
CREATE TABLE IF NOT EXISTS public.agreement_acceptances (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id         UUID REFERENCES public.invitation_sessions(id) ON DELETE CASCADE,
    invitation_id      UUID REFERENCES public.invitations(id) ON DELETE CASCADE,
    email              TEXT,
    email_hash         TEXT,
    ip_hash            TEXT,
    user_agent         TEXT,
    country            TEXT,
    region             TEXT,
    agreement_version  TEXT,
    agreement_hash     TEXT,
    signature_hash     TEXT,
    verification_chain JSONB,
    language_accepted  TEXT,
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agreement_acceptances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on agreement_acceptances" ON public.agreement_acceptances;
CREATE POLICY "Service role full access on agreement_acceptances" ON public.agreement_acceptances FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_agreement_acceptances_invitation_id ON public.agreement_acceptances(invitation_id);
