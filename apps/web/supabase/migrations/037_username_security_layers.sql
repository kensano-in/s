-- ═══════════════════════════════════════════════════════════════
-- Migration: 037_username_security_layers.sql
-- Implements L8 (Adaptive Blacklist), L9 (Rate Limiter), L10 (IP Correlation)
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- L8: ADAPTIVE REJECTION LOG
-- Every blocked username attempt is stored here.
-- Used to discover new attack patterns and auto-expand blocklist.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rejected_usernames (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw          TEXT NOT NULL,
    normalized   TEXT NOT NULL,
    blocked_by   TEXT NOT NULL,   -- which layer blocked it (L2, L3, L4, L7_AI, etc.)
    reason       TEXT,
    risk_score   INTEGER DEFAULT 0,
    ip_address   TEXT,
    fingerprint  TEXT,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rejected_usernames_normalized ON public.rejected_usernames(normalized);
CREATE INDEX IF NOT EXISTS idx_rejected_usernames_ip ON public.rejected_usernames(ip_address);
CREATE INDEX IF NOT EXISTS idx_rejected_usernames_created ON public.rejected_usernames(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- L9: RATE LIMIT TRACKER
-- Per-IP attempt counter with sliding window (1 minute buckets).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.username_rate_limits (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address   TEXT NOT NULL,
    fingerprint  TEXT,
    attempts     INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    banned_until TIMESTAMP WITH TIME ZONE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limit_ip_window 
  ON public.username_rate_limits(ip_address, window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip ON public.username_rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limit_banned ON public.username_rate_limits(banned_until);

-- ─────────────────────────────────────────────────────────────
-- L10: IP CORRELATION TRACKER
-- Tracks suspicious patterns from same source:
-- multiple high-risk attempts, rotating usernames, etc.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ip_threat_scores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address      TEXT NOT NULL UNIQUE,
    fingerprint     TEXT,
    threat_score    INTEGER DEFAULT 0,       -- accumulates over time
    block_count     INTEGER DEFAULT 0,       -- how many times blocked
    suspicious_count INTEGER DEFAULT 0,     -- AI-flagged suspicious attempts
    last_seen       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    hard_banned     BOOLEAN DEFAULT FALSE,   -- permanent ban flag
    hard_banned_at  TIMESTAMP WITH TIME ZONE,
    ban_reason      TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ip_threat_ip ON public.ip_threat_scores(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_threat_score ON public.ip_threat_scores(threat_score DESC);
CREATE INDEX IF NOT EXISTS idx_ip_threat_banned ON public.ip_threat_scores(hard_banned);

-- ─────────────────────────────────────────────────────────────
-- RLS: All tables are service-role only (no client access)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.rejected_usernames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.username_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_threat_scores ENABLE ROW LEVEL SECURITY;

-- Block all public access — only server-side service role can write
DO $$
BEGIN
    -- rejected_usernames: no public read/write
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'rejected_usernames' AND policyname = 'service_only_rejected'
    ) THEN
        CREATE POLICY "service_only_rejected" ON public.rejected_usernames
            FOR ALL USING (false);
    END IF;

    -- username_rate_limits: no public access
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'username_rate_limits' AND policyname = 'service_only_rate_limits'
    ) THEN
        CREATE POLICY "service_only_rate_limits" ON public.username_rate_limits
            FOR ALL USING (false);
    END IF;

    -- ip_threat_scores: no public access
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'ip_threat_scores' AND policyname = 'service_only_threats'
    ) THEN
        CREATE POLICY "service_only_threats" ON public.ip_threat_scores
            FOR ALL USING (false);
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- Auto-cleanup: purge rate limit entries older than 1 hour
-- (Can be called by a cron job or Edge Function)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM public.username_rate_limits
    WHERE window_start < NOW() - INTERVAL '1 hour'
      AND (banned_until IS NULL OR banned_until < NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
