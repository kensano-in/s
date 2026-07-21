-- ═══════════════════════════════════════════════════════════════
-- NAVIGATION PERFORMANCE INDEXES
-- Eliminates sequential table scans across all primary application routes
-- ═══════════════════════════════════════════════════════════════

-- 1. Feed & Posts Indexes (O(log N) sorting & filtering)
CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON public.posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower_following ON public.follows(follower_id, following_id);

-- 2. Community & Channel Indexes
CREATE INDEX IF NOT EXISTS idx_communities_name ON public.communities(name);
CREATE INDEX IF NOT EXISTS idx_communities_member_count ON public.communities(member_count DESC);
CREATE INDEX IF NOT EXISTS idx_channels_community_id ON public.community_channels(community_id);

-- 3. Notifications & Activity Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

-- 4. Messaging & Participant Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user_conv ON public.conversation_participants(user_id, conversation_id);
