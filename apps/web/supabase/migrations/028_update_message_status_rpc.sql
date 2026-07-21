-- ==============================================================================
-- MIGRATION: Instant Delivery & Read Receipts (WhatsApp/Signal latency fix)
-- ==============================================================================
-- Problem: RLS policies prevented group chat participants from updating a 
-- message's status to 'delivered' or 'seen'.
--
-- Solution: Create a SECURITY DEFINER RPC function that allows any authenticated
-- user to mark messages as 'delivered' or 'seen', provided they are either the 
-- direct recipient OR a verified member of the group chat where the message exists.
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_message_status(p_message_ids UUID[], p_status TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate status
  IF p_status NOT IN ('delivered', 'seen') THEN
    RAISE EXCEPTION 'Invalid status. Must be delivered or seen.';
  END IF;

  UPDATE public.messages m
  SET status = p_status
  WHERE m.id = ANY(p_message_ids)
    AND m.sender_id != auth.uid() -- Never mark your own messages
    AND m.status != 'seen' -- Don't downgrade a seen message back to delivered
    AND (
      -- Condition 1: User is the direct recipient
      m.recipient_id = auth.uid()
      OR
      -- Condition 2: User is a member of the group chat
      EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = m.conversation_id
          AND cp.user_id = auth.uid()
      )
    );
END;
$$;
