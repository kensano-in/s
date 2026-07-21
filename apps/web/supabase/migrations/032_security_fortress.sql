-- Migration: Security Fortress Architecture
-- 032_security_fortress.sql

-- 1. Security Event Logging (Audit Trail)
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'rate_limit', 'failed_login', 'disposable_email', 'suspicious_behavior'
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address TEXT,
    fingerprint TEXT,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for rapid pattern analysis
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON public.security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_fingerprint ON public.security_events(fingerprint);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type);

-- 2. Banned Identities (The Blacklist)
CREATE TABLE IF NOT EXISTS public.banned_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT CHECK (type IN ('ip', 'fingerprint', 'user')),
    identifier TEXT NOT NULL, -- IP sub-net, hashed fingerprint, or user UUID
    reason TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_banned_identities_uniq ON public.banned_identities(type, identifier);

-- 3. Rate Limit Tracking (Edge-compatible persistence)
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL, -- hashed IP or UserID
    endpoint TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(identifier, endpoint)
);

-- 4. Enable RLS (Strict Protection)
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banned_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Only service role (admin) can access these
CREATE POLICY "Admin only security_events" ON public.security_events FOR ALL USING (false);
CREATE POLICY "Admin only banned_identities" ON public.banned_identities FOR ALL USING (false);
CREATE POLICY "Admin only rate_limit_logs" ON public.rate_limit_logs FOR ALL USING (false);

-- Helper Function: Check Identity Status
CREATE OR REPLACE FUNCTION public.is_identity_banned(p_ip TEXT, p_fingerprint TEXT, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_banned BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.banned_identities
        WHERE (type = 'ip' AND identifier = p_ip)
           OR (type = 'fingerprint' AND identifier = p_fingerprint)
           OR (type = 'user' AND identifier = p_user_id::TEXT)
        AND (expires_at IS NULL OR expires_at > NOW())
    ) INTO is_banned;
    
    RETURN is_banned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Helper Function: Get Security Violators (for Audit API)
CREATE OR REPLACE FUNCTION public.get_security_violators(p_since TIMESTAMP WITH TIME ZONE)
RETURNS TABLE (
    ip_address TEXT,
    event_type TEXT,
    event_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT se.ip_address, se.event_type, COUNT(*) as event_count
    FROM public.security_events se
    WHERE se.created_at > p_since
    GROUP BY se.ip_address, se.event_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
