-- ── Atomic Group Creation RPC Transaction ──

CREATE OR REPLACE FUNCTION create_group_with_members(
  p_creator_id UUID,
  p_name TEXT,
  p_join_code TEXT,
  p_icon_url TEXT,
  p_description TEXT,
  p_requires_join_approval BOOLEAN,
  p_initial_member_ids UUID[]
)
RETURNS JSONB AS $$
DECLARE
  v_group_id UUID;
  v_member_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Insert Conversation
  INSERT INTO conversations (
    name,
    join_code,
    creator_id,
    icon_url,
    is_group,
    requires_join_approval,
    description
  ) VALUES (
    p_name,
    p_join_code,
    p_creator_id,
    p_icon_url,
    true,
    p_requires_join_approval,
    p_description
  )
  RETURNING id INTO v_group_id;

  -- 2. Add creator as admin
  INSERT INTO conversation_participants (
    conversation_id,
    user_id,
    role
  ) VALUES (
    v_group_id,
    p_creator_id,
    'admin'
  );

  -- 3. Add initial members
  IF p_initial_member_ids IS NOT NULL AND array_length(p_initial_member_ids, 1) > 0 THEN
    FOREACH v_member_id IN ARRAY p_initial_member_ids LOOP
      IF v_member_id <> p_creator_id THEN
        INSERT INTO conversation_participants (
          conversation_id,
          user_id,
          role
        ) VALUES (
          v_group_id,
          v_member_id,
          'member'
        ) ON CONFLICT (conversation_id, user_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- 4. Send Ken Bot welcome message
  INSERT INTO messages (
    sender_id,
    recipient_id,
    conversation_id,
    content,
    type,
    status
  ) VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    v_group_id,
    'Welcome to ' || p_name || ' ✦' || CHR(10) || 'Your space is now active.' || CHR(10) || CHR(10) || 'Invite Code: ' || p_join_code || CHR(10) || CHR(10) || 'Respect. Build. Connect.',
    'system',
    'sent'
  );

  -- Retrieve built group metadata
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'join_code', join_code,
    'creator_id', creator_id,
    'icon_url', icon_url,
    'requires_join_approval', requires_join_approval,
    'description', description
  ) INTO v_result
  FROM conversations
  WHERE id = v_group_id;

  RETURN jsonb_build_object('success', true, 'data', v_result);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
