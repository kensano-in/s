-- =======================================================================
-- MIGRATION: Instant DM Notifications Trigger
-- =======================================================================
-- Since we are moving to PURE WebSockets via PostgREST client-inserts
-- we must shift the notification logic from the Node.js API to the Database.
-- This ensures Notifications fire instantly and independently of the client.
-- =======================================================================

CREATE OR REPLACE FUNCTION trigger_message_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for Direct Messages (conversation_id IS NULL)
  -- and if it's not a scheduled message waiting to be released
  IF NEW.conversation_id IS NULL AND (NEW.is_released IS NULL OR NEW.is_released = TRUE) THEN
    INSERT INTO public.notifications (
      user_id,
      actor_id,
      type,
      entity_id,
      entity_type,
      body,
      is_read
    )
    VALUES (
      NEW.recipient_id,
      NEW.sender_id,
      'dm',
      NEW.id,
      'message',
      SUBSTRING(NEW.content, 1, 80),
      FALSE
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to prevent duplicates
DROP TRIGGER IF EXISTS on_message_inserted ON public.messages;

CREATE TRIGGER on_message_inserted
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION trigger_message_notification();
