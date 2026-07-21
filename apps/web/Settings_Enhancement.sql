-- ─── Blocking System ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocked_users (
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, blocked_user_id)
);
CREATE INDEX IF NOT EXISTS idx_blocked_by ON blocked_users(user_id);

-- ─── Enhanced User Metrics & Permissions ─────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login            TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS messaging_permission  TEXT NOT NULL DEFAULT 'everyone' CHECK (messaging_permission IN ('everyone', 'followers', 'none'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_visibility   BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS security_score        INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completeness  INT NOT NULL DEFAULT 20;

-- Function to calculate profile completeness
CREATE OR REPLACE FUNCTION calculate_profile_completeness()
RETURNS TRIGGER AS $$
DECLARE
  score INT := 20; -- Base score for having an account
BEGIN
  IF NEW.display_name IS NOT NULL AND NEW.display_name != '' THEN score := score + 20; END IF;
  IF NEW.avatar_url IS NOT NULL AND NEW.avatar_url != '' THEN score := score + 20; END IF;
  IF NEW.bio IS NOT NULL AND NEW.bio != '' THEN score := score + 20; END IF;
  IF NEW.username IS NOT NULL AND NEW.username != '' THEN score := score + 20; END IF;
  
  NEW.profile_completeness := score;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profile_completeness ON users;
CREATE TRIGGER trg_profile_completeness
BEFORE INSERT OR UPDATE OF display_name, avatar_url, bio, username ON users
FOR EACH ROW EXECUTE FUNCTION calculate_profile_completeness();

-- Function to calculate security score
CREATE OR REPLACE FUNCTION update_security_score(p_user_id UUID, p_has_2fa BOOLEAN)
RETURNS void AS $$
DECLARE
  score INT := 30; -- Base score for password
BEGIN
  IF p_has_2fa THEN score := score + 50; END IF;
  -- Add more logic based on session counts or login history if needed
  UPDATE users SET security_score = score WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
