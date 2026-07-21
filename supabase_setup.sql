-- ==========================================
-- VERLYN SECURITY CENTER DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- ==========================================

-- Enable pgcrypto extension for gen_random_uuid() if not enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------
-- 1. Table: trusted_devices
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,
    os_name TEXT NOT NULL,
    browser_name TEXT NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    quarantined_until TIMESTAMP WITH TIME ZONE,
    trust_score INTEGER NOT NULL DEFAULT 15,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- 2. Table: public.security_cooldowns
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_cooldowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    locked_until TIMESTAMP WITH TIME ZONE NOT NULL,
    locked_by_action TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.security_cooldowns ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- 3. Table: public.account_freezes
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_freezes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_frozen BOOLEAN NOT NULL DEFAULT false,
    frozen_at TIMESTAMP WITH TIME ZONE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.account_freezes ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- 4. Table: public.risk_assessments
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    trust_score INTEGER NOT NULL DEFAULT 85,
    anomaly_rate NUMERIC(4,3) NOT NULL DEFAULT 0.050,
    max_velocity NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- 5. Table: public.security_events
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    ip_address TEXT NOT NULL DEFAULT '127.0.0.1',
    country TEXT,
    browser TEXT,
    os_name TEXT,
    payload JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- 6. Table: public.passkeys
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.passkeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    nickname TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.passkeys ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- 7. Table: public.user_sessions
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token_hash TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    location_city TEXT,
    location_country TEXT,
    risk_level TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    device_fingerprint TEXT,
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Users should only access their own records
-- ==========================================

-- trusted_devices
DROP POLICY IF EXISTS "Users can view own trusted devices" ON public.trusted_devices;
CREATE POLICY "Users can view own trusted devices" ON public.trusted_devices
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own trusted devices" ON public.trusted_devices;
CREATE POLICY "Users can insert own trusted devices" ON public.trusted_devices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own trusted devices" ON public.trusted_devices;
CREATE POLICY "Users can update own trusted devices" ON public.trusted_devices
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own trusted devices" ON public.trusted_devices;
CREATE POLICY "Users can delete own trusted devices" ON public.trusted_devices
    FOR DELETE USING (auth.uid() = user_id);

-- security_cooldowns
DROP POLICY IF EXISTS "Users can view own security cooldowns" ON public.security_cooldowns;
CREATE POLICY "Users can view own security cooldowns" ON public.security_cooldowns
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own security cooldowns" ON public.security_cooldowns;
CREATE POLICY "Users can insert own security cooldowns" ON public.security_cooldowns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- account_freezes
DROP POLICY IF EXISTS "Users can view own account freezes" ON public.account_freezes;
CREATE POLICY "Users can view own account freezes" ON public.account_freezes
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own account freezes" ON public.account_freezes;
CREATE POLICY "Users can insert own account freezes" ON public.account_freezes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- risk_assessments
DROP POLICY IF EXISTS "Users can view own risk assessments" ON public.risk_assessments;
CREATE POLICY "Users can view own risk assessments" ON public.risk_assessments
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own risk assessments" ON public.risk_assessments;
CREATE POLICY "Users can insert own risk assessments" ON public.risk_assessments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- security_events
DROP POLICY IF EXISTS "Users can view own security events" ON public.security_events;
CREATE POLICY "Users can view own security events" ON public.security_events
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own security events" ON public.security_events;
CREATE POLICY "Users can insert own security events" ON public.security_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- passkeys
DROP POLICY IF EXISTS "Users can view own passkeys" ON public.passkeys;
CREATE POLICY "Users can view own passkeys" ON public.passkeys
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own passkeys" ON public.passkeys;
CREATE POLICY "Users can insert own passkeys" ON public.passkeys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own passkeys" ON public.passkeys;
CREATE POLICY "Users can delete own passkeys" ON public.passkeys
    FOR DELETE USING (auth.uid() = user_id);

-- user_sessions
DROP POLICY IF EXISTS "Users can view own user sessions" ON public.user_sessions;
CREATE POLICY "Users can view own user sessions" ON public.user_sessions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own user sessions" ON public.user_sessions;
CREATE POLICY "Users can insert own user sessions" ON public.user_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own user sessions" ON public.user_sessions;
CREATE POLICY "Users can delete own user sessions" ON public.user_sessions
    FOR DELETE USING (auth.uid() = user_id);


-- ==========================================
-- PERFORMANCE INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON public.trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_fingerprint ON public.trusted_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_security_cooldowns_user_id ON public.security_cooldowns(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_passkeys_user_id ON public.passkeys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON public.user_sessions(session_token_hash);
