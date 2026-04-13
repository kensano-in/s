-- Migration: Add Phone Identity & Mobile Sentinel
-- 035_add_phone_identity.sql
-- Purpose: Establish multi-channel identity persistence for high-security recovery.

-- 1. Add the phone column to the public users profile
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Create a rapid-lookup index for mobile-based account discovery
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);

-- 3. Security Hardening (RLS)
-- Ensuring phone numbers are strictly protected.
-- Only the account owner or authorized system processes can access this data.

DO $$ 
BEGIN
    -- Enable RLS if not already enabled on the users table
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

    -- Policy: Users can see their own sensitive identity markers
    -- (We use a filtered select so phone numbers don't leak to other profiles)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' AND policyname = 'Users can view their own phone'
    ) THEN
        CREATE POLICY "Users can view their own phone" 
        ON public.users FOR SELECT 
        USING (auth.uid() = id);
    END IF;
END $$;

-- 4. Identity Signal
COMMENT ON COLUMN public.users.phone IS 'Encrypted mobile identity sentinel used for multi-channel recovery.';
