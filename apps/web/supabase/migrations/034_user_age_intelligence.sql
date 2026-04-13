-- ═══════════════════════════════════════════════════════════════════════════
-- VERLYN IDENTITY — Migration 034: User Age Intelligence
-- Adds 'birthday' and 'full_name' for high-fidelity content discovery.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add Age/Identity Tracking
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 2. Index birthday for potential age-gated feed logic in the future
CREATE INDEX IF NOT EXISTS idx_users_birthday ON users (birthday);

-- ═══════════════════════════════════════════════════════════════════════════
-- Verify with:
--   SELECT id, username, birthday, full_name FROM users LIMIT 10;
-- ═══════════════════════════════════════════════════════════════════════════
