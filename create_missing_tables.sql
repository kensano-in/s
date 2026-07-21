-- ==========================================
-- VERLYN — MISSING TABLES FOR ADMIN GATEWAY
-- Run this in your Supabase SQL Editor
-- ==========================================

-- ------------------------------------------
-- support_tickets
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id       TEXT NOT NULL UNIQUE,
    full_name     TEXT NOT NULL,
    email         TEXT NOT NULL,
    subject       TEXT NOT NULL,
    report_type   TEXT NOT NULL DEFAULT 'general',
    description   TEXT NOT NULL DEFAULT '',
    status        TEXT NOT NULL DEFAULT 'Received',
    priority      TEXT NOT NULL DEFAULT 'medium',
    ip_address    TEXT,
    user_agent    TEXT,
    admin_reply   TEXT,
    is_spam       BOOLEAN NOT NULL DEFAULT false,
    assigned_to   TEXT,
    internal_notes TEXT,
    device_proof  TEXT,
    browser_info  JSONB,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (admin API uses service role key)
CREATE POLICY "Service role full access on support_tickets"
    ON public.support_tickets
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_support_tickets_case_id ON public.support_tickets(case_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status  ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_email   ON public.support_tickets(email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON public.support_tickets(created_at DESC);

-- ------------------------------------------
-- audit_logs
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category   TEXT NOT NULL,
    action     TEXT NOT NULL,
    actor      TEXT,
    target     TEXT,
    metadata   JSONB,
    severity   TEXT NOT NULL DEFAULT 'info',
    success    BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on audit_logs"
    ON public.audit_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_logs_category   ON public.audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ------------------------------------------
-- global_config  (used by ghost-session rate limiting)
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.global_config (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.global_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on global_config"
    ON public.global_config
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------
-- preregistrations
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.preregistrations (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name  TEXT,
    email      TEXT NOT NULL UNIQUE,
    domain     TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.preregistrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on preregistrations"
    ON public.preregistrations
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_preregistrations_email ON public.preregistrations(email);

-- ------------------------------------------
-- messages  (support chat messages)
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    sender_type TEXT NOT NULL DEFAULT 'user',
    agent_name  TEXT,
    is_internal BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on messages"
    ON public.messages
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON public.messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
