-- ─── Post Likes ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_likes (
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_post_like_count ON post_likes;
CREATE TRIGGER trg_post_like_count
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

-- ─── Notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN ('like','comment','follow','mention','dm','community','system','award')),
  entity_id   TEXT,
  entity_type TEXT,
  body        TEXT NOT NULL DEFAULT '',
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(user_id, created_at DESC);

-- Trigger: notify on follow
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.follower_id = NEW.following_id THEN RETURN NEW; END IF;
  INSERT INTO notifications(user_id, actor_id, type, body)
  VALUES (NEW.following_id, NEW.follower_id, 'follow', 'started following you');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_follow ON follows;
CREATE TRIGGER trg_notify_follow
AFTER INSERT ON follows
FOR EACH ROW EXECUTE FUNCTION notify_on_follow();

-- Trigger: notify on comment
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE post_author_id UUID;
BEGIN
  SELECT author_id INTO post_author_id FROM posts WHERE id = NEW.post_id;
  IF post_author_id IS NULL OR post_author_id = NEW.author_id THEN RETURN NEW; END IF;
  INSERT INTO notifications(user_id, actor_id, type, entity_id, entity_type, body)
  VALUES (post_author_id, NEW.author_id, 'comment', NEW.post_id::TEXT, 'post', 'commented on your post');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_comment ON comments;
CREATE TRIGGER trg_notify_comment
AFTER INSERT ON comments
FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

-- Trigger: notify on like (throttled: once per hour per user-post)
CREATE OR REPLACE FUNCTION notify_on_like()
RETURNS TRIGGER AS $$
DECLARE post_author_id UUID;
BEGIN
  SELECT author_id INTO post_author_id FROM posts WHERE id = NEW.post_id;
  IF post_author_id IS NULL OR post_author_id = NEW.user_id THEN RETURN NEW; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM notifications
    WHERE user_id = post_author_id AND actor_id = NEW.user_id
      AND entity_id = NEW.post_id::TEXT AND created_at > now() - INTERVAL '1 hour'
  ) THEN
    INSERT INTO notifications(user_id, actor_id, type, entity_id, entity_type, body)
    VALUES (post_author_id, NEW.user_id, 'like', NEW.post_id::TEXT, 'post', 'liked your post');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_like ON post_likes;
CREATE TRIGGER trg_notify_like
AFTER INSERT ON post_likes
FOR EACH ROW EXECUTE FUNCTION notify_on_like();

-- ─── Base Tables: Communities & Follows ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS communities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description  TEXT,
  icon_url     TEXT,
  banner_url   TEXT,
  member_count INT NOT NULL DEFAULT 1,
  boost_level  INT NOT NULL DEFAULT 0,
  is_private   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_members (
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
  joined_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (community_id, user_id)
);

CREATE TABLE IF NOT EXISTS follows (
  follower_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

-- ─── Community member count ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_community_member_count ON community_members;
CREATE TRIGGER trg_community_member_count
AFTER INSERT OR DELETE ON community_members
FOR EACH ROW EXECUTE FUNCTION update_community_member_count();

-- ─── Atomic follow toggle (replaces race-condition read-then-write) ───────────
CREATE OR REPLACE FUNCTION toggle_follow(p_follower UUID, p_following UUID, p_is_following BOOLEAN)
RETURNS void AS $$
BEGIN
  IF p_is_following THEN
    INSERT INTO follows(follower_id, following_id) VALUES (p_follower, p_following) ON CONFLICT DO NOTHING;
    UPDATE users SET following_count = following_count + 1 WHERE id = p_follower;
    UPDATE users SET follower_count  = follower_count  + 1 WHERE id = p_following;
  ELSE
    DELETE FROM follows WHERE follower_id = p_follower AND following_id = p_following;
    UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = p_follower;
    UPDATE users SET follower_count  = GREATEST(follower_count  - 1, 0) WHERE id = p_following;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Stories ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_url  TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video')),
  view_count INT  NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);

CREATE TABLE IF NOT EXISTS story_views (
  story_id  UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (story_id, user_id)
);

CREATE OR REPLACE FUNCTION update_story_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stories SET view_count = view_count + 1 WHERE id = NEW.story_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_story_view_count ON story_views;
CREATE TRIGGER trg_story_view_count
AFTER INSERT ON story_views FOR EACH ROW EXECUTE FUNCTION update_story_view_count();

-- ─── RLS Policies ─────────────────────────────────────────────────────────────
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert_own_like"  ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_like"  ON post_likes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "read_likes"       ON post_likes FOR SELECT USING (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_own_notifs"   ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "update_own_notifs" ON notifications FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_live_stories"  ON stories FOR SELECT USING (expires_at > now());
CREATE POLICY "insert_own_story"   ON stories FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "delete_own_story"   ON stories FOR DELETE USING (auth.uid() = author_id);

ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert_own_view" ON story_views FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "read_views"      ON story_views FOR SELECT USING (true);
