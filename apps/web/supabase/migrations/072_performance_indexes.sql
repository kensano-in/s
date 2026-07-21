-- ============================================================================
-- Migration: 072_performance_indexes
-- Date: 2026-07-19
-- Purpose: Add performance-critical composite indexes for Feed rendering,
--          Community messages, Following queries, and Post likes checks.
-- ============================================================================

-- 1. Optimize feed filtering by author and keyset cursor ordering
CREATE INDEX IF NOT EXISTS idx_posts_author_created_at
  ON posts (author_id, created_at DESC, id DESC);

-- 2. Optimize feed filtering by community and keyset cursor ordering
CREATE INDEX IF NOT EXISTS idx_posts_community_created_at
  ON posts (community_id, created_at DESC, id DESC);

-- 3. Optimize global/algorithm feed queries sorted chronologically
CREATE INDEX IF NOT EXISTS idx_posts_created_at_id
  ON posts (created_at DESC, id DESC);

-- 4. Optimize post like check (is_liked query) and engagement join
CREATE INDEX IF NOT EXISTS idx_post_likes_user_post
  ON post_likes (user_id, post_id);

-- 5. Optimize follows lookup (resolving follower list for following feed)
CREATE INDEX IF NOT EXISTS idx_followers_follower
  ON followers (follower_id, following_id);

-- 6. Optimize community message rendering inside channels (chronological cursor retrieval)
CREATE INDEX IF NOT EXISTS idx_com_messages_channel_sent_at
  ON community_messages (channel_id, sent_at DESC, id DESC);

-- 7. Optimize community membership joins
CREATE INDEX IF NOT EXISTS idx_community_members_user_comm
  ON community_members (user_id, community_id);
