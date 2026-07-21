-- ============================================================
-- VERLYN MESSAGING CONVERSATION STATE MACHINE MIGRATION
-- Run this to update conversation participants inbox states
-- ============================================================

-- 1. Add inbox_state column to conversation_participants
ALTER TABLE public.conversation_participants 
ADD COLUMN IF NOT EXISTS inbox_state TEXT NOT NULL DEFAULT 'CHAT' 
CHECK (inbox_state IN ('CHAT', 'REQUEST', 'SPAM', 'ARCHIVED', 'BLOCKED', 'DELETED'));

-- 2. Migrate existing PENDING requests
UPDATE public.conversation_participants cp
SET inbox_state = 'REQUEST'
FROM public.message_requests mr, public.conversation_participants cp2
WHERE mr.status = 'PENDING'
  AND mr.recipient_id = cp.user_id
  AND mr.sender_id = cp2.user_id
  AND cp.conversation_id = cp2.conversation_id;

-- 3. Migrate existing SPAM requests
UPDATE public.conversation_participants cp
SET inbox_state = 'SPAM'
FROM public.message_requests mr, public.conversation_participants cp2
WHERE mr.status = 'SPAM'
  AND mr.recipient_id = cp.user_id
  AND mr.sender_id = cp2.user_id
  AND cp.conversation_id = cp2.conversation_id;

-- 4. Migrate existing BLOCKED users
UPDATE public.conversation_participants cp
SET inbox_state = 'BLOCKED'
FROM public.blocks b, public.conversation_participants cp2
WHERE cp.user_id = b.blocker_id
  AND cp2.user_id = b.blocked_id
  AND cp.conversation_id = cp2.conversation_id;
