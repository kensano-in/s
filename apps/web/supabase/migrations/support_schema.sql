-- Support Schema Recovery Migration
-- Re-creates missing tables, indices, and RLS policies

CREATE TABLE IF NOT EXISTS public.support_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    sender_type TEXT NOT NULL DEFAULT 'user',
    agent_name  TEXT,
    is_internal BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on support_messages" ON public.support_messages;
CREATE POLICY "Service role full access on support_messages" ON public.support_messages FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON public.support_messages(created_at DESC);


CREATE TABLE IF NOT EXISTS public.audit_log (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action     TEXT NOT NULL,
    ip_address TEXT,
    metadata   JSONB,
    admin_id   TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on audit_log" ON public.audit_log;
CREATE POLICY "Service role full access on audit_log" ON public.audit_log FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_ip ON public.audit_log(ip_address);


CREATE TABLE IF NOT EXISTS public.spam_blacklist (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address  TEXT NOT NULL UNIQUE,
    reason      TEXT,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.spam_blacklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on spam_blacklist" ON public.spam_blacklist;
CREATE POLICY "Service role full access on spam_blacklist" ON public.spam_blacklist FOR ALL USING (true) WITH CHECK (true);

-- Ensure public.audit_logs has the optional admin_id column
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS admin_id TEXT;

-- Create registered_users view to lookup auth users by email in public schema
CREATE OR REPLACE VIEW public.registered_users AS
SELECT id, email FROM auth.users;
