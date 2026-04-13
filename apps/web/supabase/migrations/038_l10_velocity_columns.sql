-- ═══════════════════════════════════════════════════════════════
-- Migration: 038_l10_velocity_columns.sql
-- Adds velocity tracking and soft-ban columns to ip_threat_scores
-- ═══════════════════════════════════════════════════════════════

-- Add velocity_events: stores timestamps of recent block events as JSONB array
ALTER TABLE public.ip_threat_scores
  ADD COLUMN IF NOT EXISTS velocity_events JSONB DEFAULT '[]'::jsonb;

-- Add soft_ban_until: temporary ban expiry (below hard ban threshold)
ALTER TABLE public.ip_threat_scores
  ADD COLUMN IF NOT EXISTS soft_ban_until TIMESTAMP WITH TIME ZONE;

-- Index for soft ban lookups (find active soft bans quickly)
CREATE INDEX IF NOT EXISTS idx_ip_threat_soft_ban
  ON public.ip_threat_scores(soft_ban_until)
  WHERE soft_ban_until IS NOT NULL;

-- Index for fingerprint correlation lookups (VPN hop detection)
CREATE INDEX IF NOT EXISTS idx_ip_threat_fingerprint
  ON public.ip_threat_scores(fingerprint)
  WHERE fingerprint IS NOT NULL;
