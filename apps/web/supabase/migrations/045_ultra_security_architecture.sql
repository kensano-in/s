-- Migration: Zero-Trust Ultra Security Architecture
-- 045_ultra_security_architecture.sql

-- 1. Create trusted_devices table
CREATE TABLE IF NOT EXISTS public.trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,
    os_name TEXT NOT NULL,
    browser_name TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    quarantined_until TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
    trust_score INTEGER DEFAULT 10 CHECK (trust_score BETWEEN 0 AND 100),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_fingerprint ON public.trusted_devices(user_id, device_fingerprint);

-- 2. Create user_sessions table mapping JWT active tokens with risk classifications
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token_hash TEXT NOT NULL UNIQUE,
    device_fingerprint TEXT NOT NULL,
    ip_address TEXT,
    location_city TEXT DEFAULT 'Unknown',
    location_country TEXT DEFAULT 'Unknown',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    risk_level TEXT DEFAULT 'Normal' CHECK (risk_level IN ('Trusted', 'Normal', 'Suspicious', 'Restricted', 'Critical')),
    is_active BOOLEAN DEFAULT true,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_hash ON public.user_sessions(session_token_hash);

-- 3. Create login_history table
CREATE TABLE IF NOT EXISTS public.login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address TEXT,
    user_agent TEXT,
    device_fingerprint TEXT,
    location_city TEXT DEFAULT 'Unknown',
    location_country TEXT DEFAULT 'Unknown',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status TEXT NOT NULL, -- 'success', 'failed_password', 'failed_2fa', 'quarantined'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_history_user ON public.login_history(user_id);

-- 4. Create recovery_attempts table
CREATE TABLE IF NOT EXISTS public.recovery_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    attempt_type TEXT NOT NULL, -- 'password_reset', 'email_change', 'phone_change', '2fa_disable'
    ip_address TEXT,
    status TEXT NOT NULL, -- 'sent', 'verified', 'failed', 'blocked'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create passkeys table (WebAuthn metadata credentials)
CREATE TABLE IF NOT EXISTS public.passkeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter INTEGER DEFAULT 0,
    device_type TEXT,
    nickname TEXT DEFAULT 'Biometrics Passkey',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passkeys_user ON public.passkeys(user_id);

-- 6. Create account_freezes table
CREATE TABLE IF NOT EXISTS public.account_freezes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    frozen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    frozen_by_ip TEXT,
    is_active BOOLEAN DEFAULT true
);

-- 7. Create security_cooldowns table
CREATE TABLE IF NOT EXISTS public.security_cooldowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    locked_until TIMESTAMP WITH TIME ZONE NOT NULL,
    locked_by_action TEXT NOT NULL, -- 'password_update', 'recovery_change', 'phone_change'
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_cooldowns_user ON public.security_cooldowns(user_id, locked_until);

-- 8. Create risk_assessments table containing internal trust scores and logs
CREATE TABLE IF NOT EXISTS public.risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    current_trust_score INTEGER DEFAULT 80 CHECK (current_trust_score BETWEEN 0 AND 100),
    location_anomaly_rate DOUBLE PRECISION DEFAULT 0.0,
    travel_velocity_max DOUBLE PRECISION DEFAULT 0.0, -- km/h
    last_evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Enable RLS (Row Level Security) on all new tables
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passkeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_freezes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_cooldowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;

-- 10. RLS Access Policies (Strict Zero-Trust isolation)
CREATE POLICY "Users can read own trusted_devices" ON public.trusted_devices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can read own user_sessions" ON public.user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can read own login_history" ON public.login_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can read own recovery_attempts" ON public.recovery_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can read own passkeys" ON public.passkeys FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can read own account_freezes" ON public.account_freezes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can read own security_cooldowns" ON public.security_cooldowns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can read own risk_assessments" ON public.risk_assessments FOR SELECT USING (auth.uid() = user_id);

-- 11. Trigger to preserve audit logs immutability (security_events cannot be updated or deleted)
CREATE OR REPLACE FUNCTION public.prevent_security_event_modifications()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security audit log records are immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_immutable_security_events
BEFORE UPDATE OR DELETE ON public.security_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_security_event_modifications();

-- 12. Helper Function: Travel Impossibility / Geo Velocity Detector
CREATE OR REPLACE FUNCTION public.check_impossible_travel(
    p_user_id UUID,
    p_new_lat DOUBLE PRECISION,
    p_new_lng DOUBLE PRECISION,
    p_new_time TIMESTAMP WITH TIME ZONE
)
RETURNS JSONB AS $$
DECLARE
    last_lat DOUBLE PRECISION;
    last_lng DOUBLE PRECISION;
    last_time TIMESTAMP WITH TIME ZONE;
    distance_km DOUBLE PRECISION;
    time_diff_hours DOUBLE PRECISION;
    speed_kmh DOUBLE PRECISION;
    anomaly_detected BOOLEAN := false;
    payload JSONB := '{}'::jsonb;
BEGIN
    -- Retrieve last successful session/login location
    SELECT latitude, longitude, created_at
    INTO last_lat, last_lng, last_time
    FROM public.login_history
    WHERE user_id = p_user_id AND status = 'success' AND latitude IS NOT NULL AND longitude IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND AND last_lat IS NOT NULL AND last_lng IS NOT NULL THEN
        -- Calculate distance using spherical haversine formula
        distance_km := 6371 * acos(
            cos(radians(last_lat)) * cos(radians(p_new_lat)) * 
            cos(radians(p_new_lng) - radians(last_lng)) + 
            sin(radians(last_lat)) * sin(radians(p_new_lat))
        );
        
        -- Time delta in hours
        time_diff_hours := EXTRACT(EPOCH FROM (p_new_time - last_time)) / 3600.0;

        IF time_diff_hours > 0.001 THEN
            speed_kmh := distance_km / time_diff_hours;
            -- Anomaly limit: speed exceeds 900 km/h (speed of a commercial aircraft)
            IF speed_kmh > 900.0 THEN
                anomaly_detected := true;
            END IF;
            payload := jsonb_build_object(
                'distance_km', round(distance_km::numeric, 2),
                'speed_kmh', round(speed_kmh::numeric, 2),
                'hours_elapsed', round(time_diff_hours::numeric, 2),
                'anomaly', anomaly_detected
            );
        END IF;
    END IF;

    RETURN payload;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
