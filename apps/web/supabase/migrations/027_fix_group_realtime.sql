-- ==============================================================================
-- MIGRATION: Fix Group Chat Real-Time Delivery (RLS Policy Update)
-- ==============================================================================
-- Problem: The original messages SELECT policy only allowed the sender OR 
-- the direct recipient to read/receive messages. Group chats don't use 
-- recipient_id, meaning Supabase Realtime completely blocked the WebSocket 
-- delivery to other group members for security reasons.
--
-- Solution: Expand the SELECT policy to legally allow anyone who is an 
-- authenticated participant in the conversation to receive the message push.
-- ==============================================================================

DROP POLICY IF EXISTS "Users can read their own messages" ON messages;

CREATE POLICY "Users can read their own messages"
  ON messages FOR SELECT
  USING (
    -- Condition 1: You sent it
    auth.uid() = sender_id 
    
    -- Condition 2: It was a direct message to you
    OR auth.uid() = recipient_id
    
    -- Condition 3: You are a participant in the group chat it was sent to
    OR (
      conversation_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM conversation_participants cp 
        WHERE cp.conversation_id = messages.conversation_id 
        AND cp.user_id = auth.uid()
      )
    )
  );
