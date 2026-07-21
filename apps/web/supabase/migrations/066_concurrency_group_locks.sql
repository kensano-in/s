-- Upgrade check_conversation_member_limit trigger function with FOR UPDATE lock on parent conversation.
-- This serializes member addition to the same group under heavy concurrent load.

CREATE OR REPLACE FUNCTION check_conversation_member_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_dummy UUID;
BEGIN
  -- Perform a row-level lock on the parent conversation row.
  -- This will serialize all inserts/updates to conversation_participants for this specific conversation.
  SELECT id INTO v_dummy FROM conversations WHERE id = NEW.conversation_id FOR UPDATE;

  IF (SELECT count(*) FROM conversation_participants WHERE conversation_id = NEW.conversation_id) >= 20 THEN
    RAISE EXCEPTION 'Group member limit reached (max 20)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
