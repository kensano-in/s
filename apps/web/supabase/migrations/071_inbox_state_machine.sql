-- ============================================================
-- 071: CONVERSATION INBOX STATE MACHINE
-- Adds inbox_state to conversation_participants.
-- Replaces the old message_requests status-based routing.
-- One conversation = One state per participant. Always.
-- ============================================================

-- 1. Add inbox_state column (idempotent)
ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS inbox_state TEXT NOT NULL DEFAULT 'CHAT'
  CHECK (inbox_state IN ('CHAT', 'REQUEST', 'SPAM', 'ARCHIVED', 'BLOCKED', 'DELETED'));

-- 2. Backfill PENDING → REQUEST from legacy message_requests table
UPDATE public.conversation_participants cp
SET inbox_state = 'REQUEST'
FROM public.message_requests mr,
     public.conversation_participants cp2
WHERE mr.status = 'PENDING'
  AND mr.recipient_id = cp.user_id
  AND cp2.conversation_id = cp.conversation_id
  AND cp2.user_id = mr.sender_id
  AND cp.inbox_state = 'CHAT';

-- 3. Backfill SPAM from legacy message_requests table
UPDATE public.conversation_participants cp
SET inbox_state = 'SPAM'
FROM public.message_requests mr,
     public.conversation_participants cp2
WHERE mr.status = 'SPAM'
  AND mr.recipient_id = cp.user_id
  AND cp2.conversation_id = cp.conversation_id
  AND cp2.user_id = mr.sender_id
  AND cp.inbox_state = 'CHAT';

-- 4. Backfill BLOCKED from blocks table
UPDATE public.conversation_participants cp
SET inbox_state = 'BLOCKED'
FROM public.blocks b,
     public.conversation_participants cp2
WHERE b.blocker_id = cp.user_id
  AND cp2.conversation_id = cp.conversation_id
  AND cp2.user_id = b.blocked_id
  AND cp.inbox_state = 'CHAT';

-- 5. Index for fast per-user inbox tab queries
CREATE INDEX IF NOT EXISTS idx_cp_user_inbox_state
  ON public.conversation_participants(user_id, inbox_state);

-- 6. Index for fast per-conversation state lookups
CREATE INDEX IF NOT EXISTS idx_cp_conversation_inbox_state
  ON public.conversation_participants(conversation_id, inbox_state);
