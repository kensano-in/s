-- Migration: Sentinel Identity Escalation
-- 036_sentinel_manual_audit.sql

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_status') THEN
        CREATE TYPE public.audit_status AS ENUM ('PENDING', 'IN_REVIEW', 'GRANTED', 'DENIED');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.manual_audit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL DEFAULT 'IDENTITY_RECOVERY',
    status public.audit_status DEFAULT 'PENDING',
    
    -- User's "Statement of Identity" / Context
    statement TEXT,
    
    -- Technical metadata for compliance evaluation
    metadata JSONB DEFAULT '{}'::jsonb,
    
    ip_address TEXT,
    fingerprint TEXT,
    
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for compliance team dashboarding
CREATE INDEX IF NOT EXISTS idx_audit_requests_user ON public.manual_audit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_requests_status ON public.manual_audit_requests(status);

-- Enable RLS
ALTER TABLE public.manual_audit_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own requests
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'manual_audit_requests' AND policyname = 'Users can view own audit requests'
    ) THEN
        CREATE POLICY "Users can view own audit requests" 
        ON public.manual_audit_requests FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'manual_audit_requests' AND policyname = 'Users can insert own audit requests'
    ) THEN
        CREATE POLICY "Users can insert own audit requests" 
        ON public.manual_audit_requests FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
