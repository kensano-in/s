'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

async function getAdmin() {
  return createAdminClient();
}

// In-memory rate limiter — avoids DB round-trip on every message send
const _spamBucket = new Map<string, number[]>();

// ─── Shared response type ────────────────────────────────────────────────────
type ActionResult<T = null> = { success: boolean; data?: T; error?: string };

// ─── Permission validation ───────────────────────────────────────────────────
export async function validateMessagingPermission(
  senderId: string,
  recipientId: string
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    const { data: recipient, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', recipientId)
      .single();

    if (userErr || !recipient) {
      return { success: false, error: 'User not found or has been deactivated.' };
    }

    const { data: block } = await supabaseAdmin
      .from('blocks')
      .select('id')
      .or(`and(blocker_id.eq.${recipientId},blocked_id.eq.${senderId}),and(blocker_id.eq.${senderId},blocked_id.eq.${recipientId})`)
      .limit(1)
      .maybeSingle();

    if (block) {
      return { success: false, error: 'You cannot message this user.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Actions] Permission validation failed:', err);
    return { success: false, error: 'Messaging validation failed.' };
  }
}

// ─── Send a message ──────────────────────────────────────────────────────────
export async function sendMessageDB(
  senderId: string,
  recipientId: string,
  content: string,
  type: 'text' | 'image' | 'file' | 'voice' = 'text',
  mediaUrl?: string,
  fileName?: string,
  mimeType?: string,
  replyToId?: string,
  scheduledAt?: Date,
  conversationId?: string,
  clientTempId?: string,
  viewOnce?: boolean
): Promise<ActionResult<any>> {
  try {
    // MSG-08: Allow empty text content for media messages (image/file/voice)
    if (!senderId || (!recipientId && !conversationId) || (!content && !mediaUrl)) {
      return { success: false, error: 'Missing required message data.' };
    }


    // ANTI-SPAM: In-memory rate limiter — zero DB round-trips
    // Allows up to 20 messages per 10s per sender
    const now = Date.now();
    const bucket = _spamBucket.get(senderId);
    if (bucket) {
      const windowStart = now - 10_000;
      const recent = bucket.filter(t => t > windowStart);
      if (recent.length >= 20) {
        return { success: false, error: 'You are sending messages too fast. Slow down.' };
      }
      recent.push(now);
      _spamBucket.set(senderId, recent);
    } else {
      _spamBucket.set(senderId, [now]);
    }


    const supabaseAdmin = await getAdmin();

    const payload: any = {
      sender_id: senderId,
      content: type === 'text' ? content : `[${type.toUpperCase()}] ${mediaUrl || content}`,
      type,
      media_url: mediaUrl || null,
      file_name: fileName || null,
      mime_type: mimeType || null,
      reply_to_id: replyToId || null,
      status: 'sent',
      client_temp_id: clientTempId || null,
    };

    if (viewOnce) {
      payload.view_once = true;
    }

    if (conversationId && conversationId !== '') {
      payload.conversation_id = conversationId;
      payload.recipient_id = senderId; // Bypass strict NOT NULL for Groups
      payload.chat_id = conversationId;
    } else {
      payload.recipient_id = recipientId;
      payload.chat_id = [senderId, recipientId].sort().join('_');
    }

    if (scheduledAt) {
      payload.scheduled_at = scheduledAt.toISOString();
      payload.is_released = false;
    }

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[sendMessageDB] error:', error);
      return { success: false, error: 'Message failed to send: ' + error.message };
    }

    // Notification - MUST be awaited. Floating promises cause Vercel Server Actions to hang for 30s+
    if (!scheduledAt && !conversationId) {
      const { error: notifErr } = await supabaseAdmin.from('notifications').insert({
        user_id: recipientId,
        actor_id: senderId,
        type: 'dm',
        entity_id: data.id,
        entity_type: 'message',
        body: type === 'text' ? content.slice(0, 80) : `Sent a ${type}`,
        is_read: false,
      });
      if (notifErr) console.error('[sendMessageDB] notification failed:', notifErr);
    }


    const mappedData = data ? {
      ...data,
      sent_at: data.sent_at || data.created_at,
      created_at: data.created_at || data.sent_at,
    } : data;

    return { success: true, data: mappedData };
  } catch (err: any) {
    console.error('[sendMessageDB] fatal:', err);
    return { success: false, error: err.message || 'Unknown message error' };
  }
}

// ─── Fire and Forget Notification (Client triggers after direct insert) ───
export async function createMessageNotificationDB(
  recipientId: string,
  senderId: string,
  entityId: string,
  content: string,
  type: string
) {
  try {
    const supabaseAdmin = await getAdmin();
    await supabaseAdmin.from('notifications').insert({
      user_id: recipientId,
      actor_id: senderId,
      type: 'dm',
      entity_id: entityId,
      entity_type: 'message',
      body: type === 'text' ? content.slice(0, 80) : `Sent a ${type}`,
      is_read: false,
    });
  } catch (err) {
    console.error('[createMessageNotificationDB] fatal:', err);
  }
}

// ─── Poll for New Messages (Realtime fallback – used when WebSocket is unavailable) ─
export async function getNewMessagesDB(
  userId: string,
  convId: string,
  isGroup: boolean,
  sinceIso: string
): Promise<ActionResult<any[]>> {
  try {
    const supabaseAdmin = await getAdmin();

    let query = supabaseAdmin
      .from('messages')
      .select(`
        id, sender_id, recipient_id, conversation_id, content, type,
        media_url, file_name, mime_type, reply_to_id, status, sent_at,
        client_temp_id, chat_id,
        sender:users!sender_id(display_name, username, avatar_url)
      `)
      .gt('sent_at', sinceIso)
      .order('sent_at', { ascending: true })
      .limit(50);

    if (isGroup) {
      query = query.eq('conversation_id', convId);
    } else {
      query = query.or(`and(sender_id.eq.${userId},recipient_id.eq.${convId}),and(sender_id.eq.${convId},recipient_id.eq.${userId})`);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const mapped = (data || []).map((m: any) => ({
      ...m,
      created_at: m.sent_at, // alias for UI compatibility
      is_mine: m.sender_id === userId,
      status: m.status ?? 'sent',
      reactions: [],
    }));

    return { success: true, data: mapped };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


// ─── Release Scheduled Messages ──────────────────────────────────────────────
export async function releaseScheduledMessagesDB(
  userId: string,
  partnerId: string
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    const { error } = await supabaseAdmin
      .from('messages')
      .update({ is_released: true })
      .match({ sender_id: userId, recipient_id: partnerId, is_released: false })
      .lte('scheduled_at', new Date().toISOString());

    if (error) console.error('[Actions] Release failed:', error);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function reportUserDB(
  reporterId: string,
  reportedId: string,
  reason: string
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    const { error } = await supabaseAdmin
      .from('reports')
      .insert({
        reporter_id: reporterId,
        reported_id: reportedId,
        reason: reason,
        status: 'pending'
      });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('[Actions] Report user failed:', err);
    return { success: false, error: err.message };
  }
}

export async function getOrCreateDMConversationDB(
  myId: string,
  otherUserId: string
): Promise<ActionResult<{ conversationId: string, user?: any }>> {
  try {
    const supabaseAdmin = await getAdmin();

    // DMs in this architecture don't use 'conversations' table.
    // The conversation ID is simply the partner's user_id.
    // We just need to verify the user exists and return their profile
    // so the UI can construct a temporary sidebar entry if needed.

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, username, display_name, avatar_url, is_online')
      .eq('id', otherUserId)
      .single();

    if (error || !user) {
      return { success: false, error: 'User not found.' };
    }

    return { 
      success: true, 
      data: { 
        conversationId: user.id,
        user: {
          id: user.id,
          name: user.display_name || user.username,
          username: user.username,
          avatarUrl: user.avatar_url,
          isOnline: user.is_online,
          isGroup: false
        }
      } 
    };
  } catch (err: any) {
    console.error('[getOrCreateDMConversationDB]', err);
    return { success: false, error: err.message };
  }
}

// ─── Mark Messages Status (Delivered/Seen) ───────────────────────────────────
export async function markMessagesStatusDB(
  userId: string,
  messageIds: string[],
  status: 'delivered' | 'seen'
): Promise<ActionResult> {
  try {
    if (!messageIds || messageIds.length === 0) return { success: true };
    const supabaseAdmin = await getAdmin();
    const { error } = await supabaseAdmin
      .from('messages')
      .update({ status })
      .in('id', messageIds)
      .neq('sender_id', userId) // don't update your own messages
      .neq('status', 'seen'); // don't downgrade a seen message to delivered

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('[Actions] Mark status failed:', err);
    return { success: false, error: err.message };
  }
}


// ─── Delete a message ────────────────────────────────────────────────────────


export async function deleteMessageDB(
  userId: string,
  messageId: string
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    const { error } = await supabaseAdmin
      .from('messages')
      .delete()
      .match({ id: messageId, sender_id: userId });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Block a user ────────────────────────────────────────────────────────────
export async function blockUserDB(
  blockerId: string,
  blockedId: string
): Promise<ActionResult> {
  try {
    if (blockerId === blockedId) return { success: false, error: 'Cannot block yourself.' };
    const supabaseAdmin = await getAdmin();
    const { error } = await supabaseAdmin
      .from('blocks')
      .upsert({ blocker_id: blockerId, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id' });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Unblock a user ──────────────────────────────────────────────────────────
export async function unblockUserDB(
  blockerId: string,
  blockedId: string
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    const { error } = await supabaseAdmin
      .from('blocks')
      .delete()
      .match({ blocker_id: blockerId, blocked_id: blockedId });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Clear chat ────────────────────────────────────────────────────────────
export async function clearChatDB(
  userId: string,
  otherUserId: string
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    const { error } = await supabaseAdmin
      .from('messages')
      .delete()
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Group Chat Operations ──────────────────────────────────────────────────
export async function updateGroupAvatarDB(
  groupId: string,
  iconUrl: string
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    const { error } = await supabaseAdmin
      .from('conversations')
      .update({ icon_url: iconUrl })
      .match({ id: groupId, is_group: true });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createGroupDB(
  creatorId: string,
  name: string,
  joinCode: string,
  iconUrl?: string
): Promise<ActionResult<any>> {
  try {
    const supabaseAdmin = await getAdmin();
    
    // 1. Insert Group
    const { data: group, error: grpErr } = await supabaseAdmin
      .from('conversations')
      .insert({
        name,
        join_code: joinCode,
        creator_id: creatorId,
        icon_url: iconUrl,
        is_group: true
      })
      .select()
      .single();

    if (grpErr || !group) {
      console.error('[createGroupDB] group insert failed:', grpErr);
      return { success: false, error: grpErr?.message || 'Failed to initialize group.' };
    }

    // 2. Add creator as Admin
    const { error: partErr } = await supabaseAdmin
      .from('conversation_participants')
      .insert({
        conversation_id: group.id,
        user_id: creatorId,
        role: 'admin'
      });

    if (partErr) {
      console.error('[createGroupDB] admin participant insert failed:', partErr);
      return { success: false, error: 'Failed to join group as admin.' };
    }

    // 3. KEN BOT — system welcome handshake
    try {
      const KEN_BOT_ID = '00000000-0000-0000-0000-000000000001';
      const t1 = new Date();
      const welcomeMsg = `Welcome to ${name} ✦\nYour space is now active.\n\nGC Code: ${joinCode}\n\nRespect. Build. Connect.`;

      await supabaseAdmin.from('messages').insert({
        sender_id: KEN_BOT_ID,
        recipient_id: KEN_BOT_ID,
        conversation_id: group.id,
        content: welcomeMsg,
        type: 'system',
        status: 'sent',
        sent_at: t1.toISOString()
      });
    } catch (botErr) {
      console.error('[createGroupDB] Ken bot message failed (non-fatal):', botErr);
    }

    return { success: true, data: group };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function joinGroupByCodeDB(
  userId: string,
  joinCode: string
): Promise<ActionResult<any>> {
  try {
    const supabaseAdmin = await getAdmin();

    // 1. Find group
    const { data: group, error: grpErr } = await supabaseAdmin
      .from('conversations')
      .select('id, name')
      .eq('join_code', joinCode.toUpperCase())
      .single();

    if (grpErr || !group) return { success: false, error: 'Invalid group code.' };

    // 2. Add member (trigger will check limit)
    const { error: memErr } = await supabaseAdmin
      .from('conversation_participants')
      .insert({
        conversation_id: group.id,
        user_id: userId,
        role: 'member'
      });

    if (memErr) {
      if (memErr.message.includes('Group member limit reached')) return { success: false, error: 'Group is full (Max 20 members).' };
      if (memErr.code === '23505') return { success: false, error: 'You are already in this group.' };
      return { success: false, error: memErr.message };
    }

    return { success: true, data: group };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Get Group Info by Join Code ─────────────────────────────────────────────
export async function getGroupByJoinCodeDB(code: string): Promise<ActionResult<any>> {
  try {
    const supabaseAdmin = await getAdmin();
    const { data: group, error } = await supabaseAdmin
      .from('conversations')
      .select('id, name, icon_url, is_group, creator_id')
      .eq('join_code', code.toUpperCase())
      .single();

    if (error || !group || !group.is_group) return { success: false, error: 'Invalid or expired group code.' };

    return { success: true, data: group };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}



// ─── Fetch Group Members ─────────────────────────────────────────────────────
export async function getGroupMembersDB(groupId: string): Promise<ActionResult<any[]>> {
  try {
    const supabaseAdmin = await getAdmin();
    const { data, error } = await supabaseAdmin
      .from('conversation_participants')
      .select(`
        role,
        joined_at,
        users (id, username, display_name, avatar_url)
      `)
      .eq('conversation_id', groupId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    
    const formatted = data.map((row: any) => ({
      id: row.users?.id,
      username: row.users?.username,
      displayName: row.users?.display_name,
      avatarUrl: row.users?.avatar_url,
      role: row.role,
      joinedAt: row.joined_at
    }));
    
    console.log(`[getConversationsDB] DONE in ${Date.now() - start}ms. Total distinct conversations:`, conversations.length);
    return { success: true, data: conversations };
  } catch (err: any) {
    console.error('[getConversationsDB] FATAL:', err);
    return { success: false, error: err.message || 'Failed to load conversations' };
  }
}

// ─── Add Multiple Users to Group ──────────────────────────────────────────────
export async function addUsersToGroupDB(groupId: string, userIds: string[]): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    
    // Insert all
    const inserts = userIds.map(uid => ({
      conversation_id: groupId,
      user_id: uid,
      role: 'member'
    }));
    
    const { error } = await supabaseAdmin
      .from('conversation_participants')
      .insert(inserts);

    if (error) {
      if (error.code === '23505') return { success: false, error: 'Some users are already in the group.' };
      throw error;
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Update Member Role (Admin/Moderator only) ────────────────────────────
export async function updateMemberRoleDB(
  groupId: string,
  requesterId: string,
  targetUserId: string,
  newRole: 'admin' | 'moderator' | 'member'
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();

    // Verify requester is admin
    const { data: requester } = await supabaseAdmin
      .from('conversation_participants')
      .select('role')
      .match({ conversation_id: groupId, user_id: requesterId })
      .single();

    if (!requester || requester.role !== 'admin') {
      return { success: false, error: 'Only admins can change member roles.' };
    }

    const { error } = await supabaseAdmin
      .from('conversation_participants')
      .update({ role: newRole })
      .match({ conversation_id: groupId, user_id: targetUserId });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Get All Users (For Invite Picker) ───────────────────────────────────────
export async function getAllUsersForInviteDB(excludeIds: string[] = []): Promise<ActionResult<any[]>> {
  try {
    const supabaseAdmin = await getAdmin();
    let query = supabaseAdmin
      .from('users')
      .select('id, username, display_name, avatar_url, role');

    const { data, error } = await query;
    if (error) throw error;

    const filtered = data.filter(u => !excludeIds.includes(u.id));
    return { success: true, data: filtered };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Mark messages as seen ───────────────────────────────────────────────────
export async function markMessagesSeenDB(
  viewerId: string,
  senderId: string
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    const { error } = await supabaseAdmin
      .from('messages')
      .update({ status: 'seen' })
      .match({ sender_id: senderId, recipient_id: viewerId })
      .neq('status', 'seen');

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Edit a message ──────────────────────────────────────────────────────────
export async function editMessageDB(
  userId: string,
  messageId: string,
  newContent: string
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    const { error } = await supabaseAdmin
      .from('messages')
      .update({ content: newContent, edited_at: new Date().toISOString() })
      .match({ id: messageId, sender_id: userId });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Add Reaction ────────────────────────────────────────────────────────────
export async function addReactionDB(
  messageId: string,
  userId: string,
  emoji: string
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    const { error } = await supabaseAdmin
      .from('message_reactions')
      .upsert({ user_id: userId, message_id: messageId, emoji }, { onConflict: 'message_id,user_id,emoji' });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Remove Reaction ─────────────────────────────────────────────────────────
export async function removeReactionDB(
  messageId: string,
  userId: string,
  emoji: string
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    const { error } = await supabaseAdmin
      .from('message_reactions')
      .delete()
      .match({ user_id: userId, message_id: messageId, emoji });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getDMSettingsDB(
  userId: string,
  partnerId: string
): Promise<ActionResult<any>> {
  try {
    const supabaseAdmin = await getAdmin();
    const chatId = [userId, partnerId].sort().join('_');

    // Fetch personal settings, shared theme, and shared nicknames in parallel
    const [personalRes, themeRes, nickRes] = await Promise.all([
      supabaseAdmin.from('dm_settings').select('*').match({ user_id: userId, partner_id: partnerId }).maybeSingle(),
      supabaseAdmin.from('chat_theme').select('*').eq('chat_id', chatId).maybeSingle(),
      supabaseAdmin.from('chat_nicknames').select('nickname').match({ chat_id: chatId, user_id: partnerId }).maybeSingle()
    ]);

    const data = personalRes.data || {};
    const theme = themeRes.data;
    const nick = nickRes.data;

    return { 
      success: true, 
      data: {
        ...data,
        theme_id: theme?.theme_id || data.theme_id,
        theme_blur: theme?.theme_blur ?? data.theme_blur,
        bubble_style: theme?.bubble_style || data.bubble_style,
        their_nickname: nick?.nickname || data.partner_nickname
      } 
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateDMSettingsDB(
  userId: string,
  partnerId: string,
  updates: any
): Promise<ActionResult<any>> {
  try {
    const supabaseAdmin = await getAdmin();
    const chatId = [userId, partnerId].sort().join('_');
    
    const finalUpdates: any = { ...updates };
    const nickname = updates.nickname || updates.their_nickname;
    
    // 1. Update personal settings (muted, disappearing_mode, etc)
    const personalKeys = ['muted', 'disappearing_mode', 'last_seen_hidden'];
    const personalUpdates: any = {};
    personalKeys.forEach(k => { if (finalUpdates[k] !== undefined) personalUpdates[k] = finalUpdates[k]; });

    if (Object.keys(personalUpdates).length > 0) {
      const { data: existing } = await supabaseAdmin.from('dm_settings').select('id').match({ user_id: userId, partner_id: partnerId }).maybeSingle();
      if (existing) {
        await supabaseAdmin.from('dm_settings').update(personalUpdates).eq('id', existing.id);
      } else {
        await supabaseAdmin.from('dm_settings').insert({ user_id: userId, partner_id: partnerId, ...personalUpdates });
      }
    }

    // 2. Update Shared Theme
    const themeKeys = ['theme_id', 'theme_blur', 'bubble_style'];
    const themeUpdates: any = { updated_at: new Date().toISOString() };
    themeKeys.forEach(k => { if (finalUpdates[k] !== undefined) themeUpdates[k] = finalUpdates[k]; });

    if (Object.keys(themeUpdates).length > 1) {
      await supabaseAdmin.from('chat_theme').upsert({ chat_id: chatId, ...themeUpdates });
    }

    // 3. Update Nickname for partner
    if (nickname) {
      await supabaseAdmin.from('chat_nicknames').upsert({ chat_id: chatId, user_id: partnerId, nickname }, { onConflict: 'chat_id,user_id' });
    }

    // Return the combined state
    return getDMSettingsDB(userId, partnerId);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateGroupSettingsDB(
  groupId: string,
  updates: any
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    const themeKeys = ['theme_id', 'theme_blur', 'bubble_style'];
    const themeUpdates: any = { updated_at: new Date().toISOString() };
    themeKeys.forEach(k => { if (updates[k] !== undefined) themeUpdates[k] = updates[k]; });

    if (Object.keys(themeUpdates).length > 1) {
      await supabaseAdmin.from('chat_theme').upsert({ chat_id: groupId, ...themeUpdates });
    }

    // Also update the conversation name/icon if provided
    const convUpdates: any = {};
    if (updates.name) convUpdates.name = updates.name;
    if (updates.icon_url) convUpdates.icon_url = updates.icon_url;

    if (Object.keys(convUpdates).length > 0) {
      await supabaseAdmin.from('conversations').update(convUpdates).eq('id', groupId);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Report a message ────────────────────────────────────────────────────────
export async function reportMessageDB(
  reporterId: string,
  messageId: string,
  reportedUserId: string,
  reason: string
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    const { error } = await supabaseAdmin
      .from('reports')
      .insert({
        reporter_id: reporterId,
        reported_message_id: messageId,
        reported_user_id: reportedUserId,
        reason,
        status: 'PENDING',
      });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Pin a message ───────────────────────────────────────────────────────────
export async function pinMessageDB(
  messageId: string,
  pinned: boolean
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    const { error } = await supabaseAdmin
      .from('messages')
      .update({ is_pinned: pinned })
      .eq('id', messageId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Translation ─────────────────────────────────────────────────────────────
export async function translateMessageDB(
  text: string,
  targetLang: string = 'en'
): Promise<ActionResult<string>> {
  try {
    const encoded = encodeURIComponent(text);
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encoded}&langpair=auto|${targetLang}`);
    const json = await res.json();
    const translated = json?.responseData?.translatedText;
    if (!translated) return { success: false, error: 'Translation failed.' };
    return { success: true, data: translated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Stickers ─────────────────────────────────────────────────────────────
export async function uploadStickerDB(
  uploaderId: string,
  imageUrl: string,
  isPublic: boolean
): Promise<ActionResult<any>> {
  try {
    const supabaseAdmin = await getAdmin();
    const status = isPublic ? 'PENDING_REVIEW' : 'PRIVATE';
    const { data, error } = await supabaseAdmin
      .from('stickers')
      .insert({ uploader_id: uploaderId, image_url: imageUrl, is_public: isPublic, status })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    if (isPublic) {
      try {
        await supabaseAdmin.from('notifications').insert({
          user_id: uploaderId,
          actor_id: uploaderId,
          type: 'sticker_review',
          entity_id: data.id,
          entity_type: 'sticker',
          body: 'A new sticker has been submitted for review.',
          is_read: false,
        });
      } catch {}
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getStickersDB(
  userId: string
): Promise<ActionResult<any[]>> {
  try {
    const supabaseAdmin = await getAdmin();
    const { data, error } = await supabaseAdmin
      .from('stickers')
      .select('*')
      .or(`uploader_id.eq.${userId},status.eq.APPROVED`)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Bulk DM Settings ─────────────────────────────────────────────────────────
export async function getBulkDMSettingsDB(
  userId: string
): Promise<ActionResult<any[]>> {
  try {
    const supabaseAdmin = await getAdmin();
    const { data, error } = await supabaseAdmin
      .from('dm_settings')
      .select('*')
      .eq('user_id', userId);

    if (error) return { success: false, error: error.message };
    const processed = (data || []).map(row => ({ ...row, their_nickname: row.partner_nickname }));
    return { success: true, data: processed };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Disappearing Messages Cleanup ───────────────────────────────────────────
export async function cleanupDisappearingMessagesDB(
  userId: string,
  partnerId: string,
  mode: string
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    if (!mode || mode === 'off') return { success: true };
    let cutoff: Date;
    const now = new Date();
    switch (mode) {
      case '24h': cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
      case '7d':  cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      default: return { success: true };
    }
    const { error } = await supabaseAdmin
      .from('messages')
      .delete()
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${userId})`)
      .lt('sent_at', cutoff.toISOString());

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Fetch Conversations (Server Side Bypass RLS) ──────────────────────────
export async function getConversationsDB(userId: string): Promise<ActionResult<any[]>> {
  console.log('[getConversationsDB] CALL:', { userId });
  const start = Date.now();
  try {
    const supabaseAdmin = await getAdmin();
    
    // 1. Fetch DMs
    const { data: dms, error: dmErr } = await supabaseAdmin
      .from('messages')
      .select('id, sender_id, recipient_id, content, sent_at, type, status')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('sent_at', { ascending: false })
      .limit(100); // Limit to 100 recent to prevent timeout

    if (dmErr) {
      console.error('[getConversationsDB] DM Error:', dmErr);
      throw dmErr;
    }
    console.log('[getConversationsDB] Found DMs:', dms?.length || 0);

    // 2. Fetch Groups via Participants
    const { data: participations, error: pErr } = await supabaseAdmin
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations:conversations(*)
      `)
      .eq('user_id', userId);

    if (pErr) {
      console.error('[getConversationsDB] Participations Error:', pErr);
      throw pErr;
    }
    console.log('[getConversationsDB] Found Participations:', participations?.length || 0);

    // 3. Transform DMs into unique conversation threads
    const threads: Map<string, any> = new Map();
    for (const m of (dms || [])) {
      const pid = m.sender_id === userId ? m.recipient_id : m.sender_id;
      if (!pid || pid === userId) continue;
      if (!threads.has(pid)) {
        threads.set(pid, {
          id: pid,
          isGroup: false,
          lastMessage: m,
          unreadCount: 0
        });
      }
    }

    // 4. Hydrate DMs with user profiles in BULK
    const dmUserIds = Array.from(threads.keys());
    const { data: dmUsers } = await supabaseAdmin
      .from('users')
      .select('id, username, display_name, avatar_url, is_online')
      .in('id', dmUserIds);

    const userMap: Record<string, any> = {};
    (dmUsers || []).forEach(u => { userMap[u.id] = u; });

    const dmThreads = Array.from(threads.values()).map(t => {
      const user = userMap[t.id];
      const lastMsg = t.lastMessage;
      let lastMessagePreview = '';
      if (lastMsg) {
        if (lastMsg.type === 'image') lastMessagePreview = '📷 Image';
        else if (lastMsg.type === 'voice') lastMessagePreview = '🎤 Voice note';
        else if (lastMsg.type === 'file') lastMessagePreview = '📎 File';
        else lastMessagePreview = lastMsg.content || '';
      }

      return {
        ...t,
        name: user?.display_name || user?.username || 'Unknown User',
        username: user?.username || '',
        avatarUrl: user?.avatar_url,
        isOnline: user?.is_online || false,
        lastMessage: lastMessagePreview,
        updatedAt: lastMsg?.sent_at || '',
        unread: 0,
      };
    });

    // 5. Transform Groups with last message
    const groupThreads = await Promise.all(
      (participations || [])
        .filter((p: any) => p.conversations?.id)
        .map(async (p: any) => {
          const conv = p.conversations;
          
          // Fetch last message and member count in parallel for speed
          const [lastMsgRes, countRes] = await Promise.all([
            supabaseAdmin.from('messages').select('content, sent_at, type').eq('conversation_id', conv.id).order('sent_at', { ascending: false }).limit(1),
            supabaseAdmin.from('conversation_participants').select('id', { count: 'exact', head: true }).eq('conversation_id', conv.id)
          ]);

          const lastMsg = lastMsgRes.data?.[0];
          const memberCount = countRes.count || 0;

          let lastMessagePreview = '';
          if (lastMsg) {
            if (lastMsg.type === 'image') lastMessagePreview = '📷 Image';
            else if (lastMsg.type === 'voice') lastMessagePreview = '🎤 Voice note';
            else if (lastMsg.type === 'file') lastMessagePreview = '📎 File';
            else lastMessagePreview = lastMsg.content || '';
          }

          return {
            id: conv.id,
            name: conv.name,
            username: conv.name?.toLowerCase().replace(/\s+/g, '_') || '',
            avatarUrl: conv.icon_url,
            joinCode: conv.join_code,
            isGroup: true,
            lastMessage: lastMessagePreview,
            updatedAt: lastMsg?.sent_at || conv.created_at || '',
            unread: 0,
            theme_id: conv.theme_id,
            theme_blur: conv.theme_blur,
            member_count: memberCount,
          };
        })
    );

    // Final transformation to match UI expectations
    const conversations = [...dmThreads, ...groupThreads].map((conv) => ({
      id: conv.id,
      name: conv.name,
      username: conv.username,
      avatarUrl: conv.avatarUrl,
      lastMessage: conv.lastMessage,
      updatedAt: conv.updatedAt,
      isGroup: conv.isGroup,
      isOnline: conv.isOnline,
      joinCode: conv.joinCode,
      unread: conv.unread,
      theme_id: conv.theme_id,
      theme_blur: conv.theme_blur,
      member_count: conv.member_count
    }));

    console.log(`[getConversationsDB] DONE in ${Date.now() - start}ms. Total distinct conversations:`, conversations.length);
    return { success: true, data: conversations };
  } catch (err: any) {
    console.error('[getConversationsDB] FATAL:', err);
    return { success: false, error: err.message || 'Failed to load conversations' };
  }
}

export async function getConversationById(id: string): Promise<ActionResult<any>> {
  try {
    const supabaseAdmin = await getAdmin();
    const { data: conv, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !conv) return { success: false, error: 'Conversation not found' };

    return {
      success: true,
      data: {
        id: conv.id,
        name: conv.name,
        isGroup: true, // Assuming group since individual DMs use participant IDs
        avatarUrl: conv.icon_url,
        joinCode: conv.join_code,
        theme_id: conv.theme_id,
        theme_blur: conv.theme_blur,
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


// ─── Fetch Messages (Server Side Bypass RLS) ──────────────────────────
export async function getMessagesDB(
  userId: string,
  targetId: string,
  isGroup: boolean,
  limit: number = 50,
  cursorSentAt?: string // ISO timestamp of oldest visible message — for cursor pagination
): Promise<ActionResult<any[]>> {
  console.log('[getMessagesDB] CALL:', { userId, targetId, isGroup, limit, cursorSentAt });
  try {
    const supabaseAdmin = await getAdmin();
    
    let query = supabaseAdmin
      .from('messages')
      .select(`
        *,
        sender:users (display_name, username, avatar_url),
        message_reactions (emoji, user_id),
        reply_to:reply_to_id (id, content, sender:users (display_name, username))
      `);

    if (isGroup) {
      query = query.eq('conversation_id', targetId);
    } else {
      query = query.or(`and(sender_id.eq.${userId},recipient_id.eq.${targetId}),and(sender_id.eq.${targetId},recipient_id.eq.${userId})`);
    }

    // Only show root-level messages in the main conversation
    query = query.is('thread_root_id', null);

    if (cursorSentAt) {
      query = query.lt('sent_at', cursorSentAt);
    }

    const { data, error } = await query
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[getMessagesDB] Query Error:', error);
      throw error;
    }

    console.log(`[getMessagesDB] SUCCESS: Found ${data?.length || 0} messages`);

    // Aggregate reactions into [{emoji, count, reacted}] shape expected by MessageItem
    const mappedData = (data || []).map((m: any) => {
      const rawReactions: { emoji: string; user_id: string }[] = m.message_reactions || [];
      const grouped: Record<string, { emoji: string; count: number; reacted: boolean }> = {};
      for (const r of rawReactions) {
        if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, reacted: false };
        grouped[r.emoji].count++;
        if (r.user_id === userId) grouped[r.emoji].reacted = true;
      }
      return {
        ...m,
        sent_at: m.sent_at,
        created_at: m.sent_at, // Fallback since created_at column is missing
        reactions: Object.values(grouped),
      };
    });

    return { success: true, data: mappedData };
  } catch (err: any) {
    console.error('[getMessagesDB] CRITICAL FAILURE:', err);
    return { success: false, error: err.message };
  }
}


// ─── Hidden Chats Override ───────────────────────────────────────────────────
export async function hideChatDB(
  userId: string,
  conversationId: string,
  secretCode: string
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    // Fetch current user metadata
    const { data: { user }, error: fetchErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (fetchErr || !user) throw new Error('Could not fetch user metadata');

    const meta = user.user_metadata || {};
    const hiddenChats = meta.hiddenChats || {};

    hiddenChats[conversationId] = secretCode;

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { ...meta, hiddenChats }
    });

    if (updateErr) throw updateErr;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function unhideChatDB(
  userId: string,
  conversationId: string
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    const { data: { user }, error: fetchErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (fetchErr || !user) throw new Error('Could not fetch user metadata');

    const meta = user.user_metadata || {};
    const hiddenChats = meta.hiddenChats || {};

    delete hiddenChats[conversationId];

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { ...meta, hiddenChats }
    });

    if (updateErr) throw updateErr;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Leave Group ─────────────────────────────────────────────────────────────
export async function leaveGroupDB(
  userId: string,
  groupId: string
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    const { error } = await supabaseAdmin
      .from('conversation_participants')
      .delete()
      .match({ conversation_id: groupId, user_id: userId });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── GROUP ADMIN CONTROL PANEL ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Promote or demote a group member.
 * Only the group creator/admin can call this.
 */
export async function setMemberRoleDB(
  actorId: string,
  groupId: string,
  targetUserId: string,
  role: 'admin' | 'moderator' | 'member'
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();

    // Verify actor is admin
    const { data: actor } = await supabaseAdmin
      .from('conversation_participants')
      .select('role')
      .match({ conversation_id: groupId, user_id: actorId })
      .single();
    if (!actor || actor.role !== 'admin') {
      return { success: false, error: 'Only admins can change roles.' };
    }

    const { error } = await supabaseAdmin
      .from('conversation_participants')
      .update({ role })
      .match({ conversation_id: groupId, user_id: targetUserId });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Mute a member for a specified duration in milliseconds.
 * Admin/moderator only.
 */
export async function muteMemberDB(
  actorId: string,
  groupId: string,
  targetUserId: string,
  durationMs: number
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();

    // Verify actor is admin or moderator
    const { data: actor } = await supabaseAdmin
      .from('conversation_participants')
      .select('role')
      .match({ conversation_id: groupId, user_id: actorId })
      .single();
    if (!actor || (actor.role !== 'admin' && actor.role !== 'moderator')) {
      return { success: false, error: 'Only admins or moderators can mute members.' };
    }

    const muteUntil = new Date(Date.now() + durationMs).toISOString();

    const { error } = await supabaseAdmin
      .from('conversation_participants')
      .update({ muted_until: muteUntil })
      .match({ conversation_id: groupId, user_id: targetUserId });

    if (error) throw error;
    return { success: true as const, data: { muted_until: muteUntil } as any };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Unmute a member.
 */
export async function unmuteMemberDB(
  actorId: string,
  groupId: string,
  targetUserId: string
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();

    const { data: actor } = await supabaseAdmin
      .from('conversation_participants')
      .select('role')
      .match({ conversation_id: groupId, user_id: actorId })
      .single();
    if (!actor || (actor.role !== 'admin' && actor.role !== 'moderator')) {
      return { success: false, error: 'Only admins or moderators can unmute members.' };
    }

    const { error } = await supabaseAdmin
      .from('conversation_participants')
      .update({ muted_until: null })
      .match({ conversation_id: groupId, user_id: targetUserId });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Remove a member from a group.
 * Admin/moderator only.
 */
export async function removeMemberDB(
  actorId: string,
  groupId: string,
  targetUserId: string
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();

    // Verify actor is admin or moderator
    const { data: actor } = await supabaseAdmin
      .from('conversation_participants')
      .select('role')
      .match({ conversation_id: groupId, user_id: actorId })
      .single();
    if (!actor || (actor.role !== 'admin' && actor.role !== 'moderator')) {
      return { success: false, error: 'Only admins or moderators can remove members.' };
    }

    const { error } = await supabaseAdmin
      .from('conversation_participants')
      .delete()
      .match({ conversation_id: groupId, user_id: targetUserId });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get current user's mute status in a group.
 */
export async function getMyMuteStatusDB(
  userId: string,
  groupId: string
): Promise<ActionResult<{ isMuted: boolean; muteUntil: string | null }>> {
  try {
    const supabaseAdmin = await getAdmin();
    const { data, error } = await supabaseAdmin
      .from('conversation_participants')
      .select('muted_until, role')
      .match({ conversation_id: groupId, user_id: userId })
      .single();

    if (error) throw error;

    const isMuted = data?.muted_until
      ? new Date(data.muted_until) > new Date()
      : false;

    return { success: true, data: { isMuted, muteUntil: data?.muted_until || null } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE: View-Once (Ghost) Messages
// ═══════════════════════════════════════════════════════════════════════════

export async function markViewedDB(
  messageId: string,
  userId: string
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    // Atomically append userId to viewed_by array
    const { error } = await supabaseAdmin.rpc('append_viewer', {
      msg_id: messageId,
      viewer_id: userId,
    });
    if (error) {
      // Fallback: manual append if RPC not created yet
      const { data: msg } = await supabaseAdmin
        .from('messages')
        .select('viewed_by')
        .eq('id', messageId)
        .single();
      const current: string[] = (msg as any)?.viewed_by || [];
      if (!current.includes(userId)) {
        await supabaseAdmin
          .from('messages')
          .update({ viewed_by: [...current, userId] })
          .eq('id', messageId);
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE: Media & Link Vault
// ═══════════════════════════════════════════════════════════════════════════

export async function getMediaVaultDB(
  userId: string,
  convId: string,
  isGroup: boolean
): Promise<ActionResult<any[]>> {
  try {
    const supabaseAdmin = await getAdmin();
    let query = supabaseAdmin
      .from('messages')
      .select('id, type, content, media_url, file_name, mime_type, sent_at, sender:users!sender_id(display_name, username)')
      .or("type.eq.image,type.eq.file,and(type.eq.text,content.ilike.%http%)");

    if (isGroup) {
      query = query.eq('conversation_id', convId);
    } else {
      query = query.or(`and(sender_id.eq.${userId},recipient_id.eq.${convId}),and(sender_id.eq.${convId},recipient_id.eq.${userId})`);
    }

    const { data, error } = await query
      .order('sent_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE: Reply Threads
// ═══════════════════════════════════════════════════════════════════════════

export async function getThreadMessagesDB(
  threadRootId: string
): Promise<ActionResult<any[]>> {
  try {
    const supabaseAdmin = await getAdmin();
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*, sender:users!sender_id(display_name, username, avatar_url)')
      .eq('thread_root_id', threadRootId)
      .order('sent_at', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendThreadReplyDB(
  senderId: string,
  threadRootId: string,
  content: string,
  conversationId?: string,
  recipientId?: string
): Promise<ActionResult<any>> {
  try {
    const supabaseAdmin = await getAdmin();
    const payload: any = {
      sender_id: senderId,
      content,
      type: 'text',
      status: 'sent',
      thread_root_id: threadRootId,
    };
    if (conversationId) {
      payload.conversation_id = conversationId;
      payload.recipient_id = senderId;
    } else if (recipientId) {
      payload.recipient_id = recipientId;
    }

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert(payload)
      .select('*, sender:users!sender_id(display_name, username, avatar_url)')
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE: Live Location Sharing
// ═══════════════════════════════════════════════════════════════════════════

export async function sendLocationDB(
  senderId: string,
  convId: string,
  isGroup: boolean,
  lat: number,
  lng: number,
  address: string | null,
  isLive: boolean,
  liveDurationHours: number = 1
): Promise<ActionResult<any>> {
  try {
    const supabaseAdmin = await getAdmin();
    const expiresAt = isLive
      ? new Date(Date.now() + liveDurationHours * 60 * 60 * 1000).toISOString()
      : null;

    const payload: any = {
      sender_id: senderId,
      content: address || `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      type: 'location',
      status: 'sent',
      location_lat: lat,
      location_lng: lng,
      location_address: address,
      location_live: isLive,
      location_expires_at: expiresAt,
    };

    if (isGroup) {
      payload.conversation_id = convId;
      payload.recipient_id = senderId;
    } else {
      payload.recipient_id = convId;
    }

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateLocationDB(
  messageId: string,
  lat: number,
  lng: number
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    const { error } = await supabaseAdmin
      .from('messages')
      .update({ location_lat: lat, location_lng: lng })
      .eq('id', messageId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

