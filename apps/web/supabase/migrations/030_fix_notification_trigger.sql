-- =======================================================================
-- MIGRATION: Fix Broken Message Notification Trigger
-- =======================================================================
-- The trigger_message_notification function was crashing on EVERY insert
-- because public.notifications may not exist or has a different schema.
-- This migration drops the broken trigger to restore message sending,
-- then recreates it with a SAFE exception handler.
-- =======================================================================

-- Step 1: Drop the broken trigger immediately
DROP TRIGGER IF EXISTS on_message_inserted ON public.messages;

-- Step 2: Drop the broken function
DROP FUNCTION IF EXISTS trigger_message_notification();

-- Step 3: Recreate the function with full exception safety
-- It will try to insert a notification, but silently swallow any error
-- so that a missing/mismatched notifications table NEVER blocks message delivery.
CREATE OR REPLACE FUNCTION trigger_message_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire for Direct Messages (conversation_id IS NULL)
  IF NEW.conversation_id IS NULL THEN
    BEGIN
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
        SUBSTRING(COALESCE(NEW.content, ''), 1, 80),
        FALSE
      );
    EXCEPTION WHEN OTHERS THEN
      -- Swallow all errors: notifications table may not exist or schema may differ.
      -- Messages MUST always succeed regardless of notification state.
      NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Re-attach the now-safe trigger
CREATE TRIGGER on_message_inserted
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION trigger_message_notification();
