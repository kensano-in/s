'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

async function getAdmin() {
  return createAdminClient();
}

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
  clientTempId?: string
): Promise<ActionResult<any>> {
  try {
    if (!senderId || (!recipientId && !conversationId) || !content) {
      return { success: false, error: 'Missing required message data.' };
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

    if (conversationId && conversationId !== '') {
      payload.conversation_id = conversationId;
      payload.recipient_id = senderId; // Bypass strict NOT NULL for Groups
    } else {
      payload.recipient_id = recipientId;
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

    // Notification (only if DM and released)
    if (!scheduledAt && !conversationId) {
      try {
        await supabaseAdmin.from('notifications').insert({
          user_id: recipientId,
          actor_id: senderId,
          type: 'dm',
          entity_id: data.id,
          entity_type: 'message',
          body: type === 'text' ? content.slice(0, 80) : `Sent a ${type}`,
          is_read: false,
        });
      } catch (e) {
        console.error('[sendMessageDB] Notification failed:', e);
      }
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

    // 2. Add creator as Admin
    await supabaseAdmin
      .from('conversation_participants')
      .insert({
        conversation_id: group.id,
        user_id: creatorId,
        role: 'admin'
      });

    // 3. THE SYSTEM BOT HANDSHAKE
    // Ensure gc base user exists via Admin
    const { data: gcUsers } = await supabaseAdmin.from('users').select('id').eq('username', 'gc').limit(1);
    let gcId = gcUsers?.[0]?.id;

    if (!gcId) {
      // Create actual bot account
      const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
        email: 'gc@verlyn.system',
        password: 'quantum_bot_password_1337',
        email_confirm: true,
      });
      if (authUser?.user) {
        gcId = authUser.user.id;
        await supabaseAdmin.from('users').insert({
          id: gcId,
          username: 'gc',
          display_name: 'System Bot',
          avatar_url: 'https://i.pinimg.com/736x/80/7e/4d/807e4d8fb8513d7890ecb18bb3db9cc9.jpg', // Cool AI bot avatar
          role: 'SYSTEM',
        });
      } else {
        gcId = creatorId; // Fallback to creator if auth creation fails
      }
    }

    const t1 = new Date();
    const welcomeMsg = `── WELCOME ──\nIdentity: Verified\nSecurity: Active\n\nWelcome to your new group chat. This space is private and secure.\n\nUse the invite code below to add others:\n[ CODE: ${joinCode} ]\n\nStatus: Secure.\n── END ──`;
    
    // Bot posts welcome message
    const { error: msgErr } = await supabaseAdmin.from('messages').insert({
      sender_id: gcId,
      recipient_id: gcId,  // Mirror sender to satisfy NOT NULL constraint for group messages
      conversation_id: group.id,
      content: welcomeMsg,
      type: 'system',
      status: 'sent',
      sent_at: t1.toISOString()
    });

    if (msgErr) console.error('[GC] Bot broadcast failed:', msgErr);

    // Bot posts leave message 1 second later to ensure chronological order
    const t2 = new Date(t1.getTime() + 1000);
    await supabaseAdmin.from('messages').insert({
      sender_id: gcId,
      recipient_id: gcId,  // Mirror sender to satisfy NOT NULL constraint for group messages
      conversation_id: group.id,
      content: 'The system bot has left the conversation.',
      type: 'system',
      status: 'sent',
      sent_at: t2.toISOString()
    });

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
    
    return { success: true, data: formatted };
  } catch (err: any) {
    return { success: false, error: err.message };
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
  userId: string,
  messageId: string,
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
  userId: string,
  messageId: string,
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
    const { data, error } = await supabaseAdmin
      .from('dm_settings')
      .select('*')
      .match({ user_id: userId, partner_id: partnerId })
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    if (!data) return { success: true, data: null };

    return { 
      success: true, 
      data: {
        ...data,
        their_nickname: data.partner_nickname
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
    const { data: existing, error: findErr } = await supabaseAdmin
      .from('dm_settings')
      .select('id')
      .match({ user_id: userId, partner_id: partnerId })
      .maybeSingle();

    if (findErr) return { success: false, error: findErr.message };

    const finalUpdates: any = { ...updates };
    
    // Only map nickname if it was actually provided in this update batch
    if (updates.nickname || updates.their_nickname) {
      finalUpdates.partner_nickname = updates.nickname || updates.their_nickname;
    }
    
    // Clean up temporary frontend keys before DB sync
    delete finalUpdates.nickname;
    delete finalUpdates.their_nickname;
    delete finalUpdates.my_nickname;

    // IMPORTANT: Remove any undefined/null keys to prevent accidental DB nullification
    Object.keys(finalUpdates).forEach(key => {
      if (finalUpdates[key] === undefined) delete finalUpdates[key];
    });

    let res;
    if (existing) {
      res = await supabaseAdmin
        .from('dm_settings')
        .update(finalUpdates)
        .match({ id: existing.id })
        .select()
        .single();
    } else {
      res = await supabaseAdmin
        .from('dm_settings')
        .insert({ user_id: userId, partner_id: partnerId, ...finalUpdates })
        .select()
        .single();
    }

    if (res.error) return { success: false, error: res.error.message };

    // If updating theme, bubble_style, or disappearing_mode, propagate to the partner's settings.
    const syncableKeys = ['theme_id', 'theme_blur', 'bubble_style', 'disappearing_mode'];
    const syncUpdates: any = {};
    syncableKeys.forEach(k => { if (finalUpdates[k] !== undefined) syncUpdates[k] = finalUpdates[k]; });

    if (Object.keys(syncUpdates).length > 0) {
      try {
        const { data: partnerExisting } = await supabaseAdmin
          .from('dm_settings')
          .select('id')
          .match({ user_id: partnerId, partner_id: userId })
          .maybeSingle();

        if (partnerExisting) {
          await supabaseAdmin.from('dm_settings').update(syncUpdates).eq('id', partnerExisting.id);
        } else {
          await supabaseAdmin.from('dm_settings').insert({ user_id: partnerId, partner_id: userId, ...syncUpdates });
        }
      } catch (echoErr) {
        console.error('[Settings Sync Error] Failed to echo to partner:', echoErr);
      }
    }

    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateGroupSettingsDB(
  groupId: string,
  updates: { theme_id?: string; theme_blur?: number }
): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    const { error } = await supabaseAdmin
      .from('conversations')
      .update(updates)
      .match({ id: groupId, is_group: true });

    if (error) return { success: false, error: error.message };
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
  try {
    const supabaseAdmin = await getAdmin();
    
    // 1. Fetch DMs
    const { data: dms, error: dmErr } = await supabaseAdmin
      .from('messages')
      .select('id, sender_id, recipient_id, content, sent_at, type, status')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('sent_at', { ascending: false });

    if (dmErr) throw dmErr;

    // 2. Fetch Groups via Participants
    const { data: participations, error: pErr } = await supabaseAdmin
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations:conversations(*)
      `)
      .eq('user_id', userId);

    if (pErr) throw pErr;

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
          const { data: lastMsgArr } = await supabaseAdmin
            .from('messages')
            .select('content, sent_at, type')
            .eq('conversation_id', conv.id)
            .order('sent_at', { ascending: false })
            .limit(1);
          const lastMsg = lastMsgArr?.[0];

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
          };
        })
    );

    // Sort all conversations by most recent message
    const all = [...dmThreads, ...groupThreads].sort((a, b) => {
      if (!a.updatedAt) return 1;
      if (!b.updatedAt) return -1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return { success: true, data: all };
  } catch (err: any) {
    console.error('[Actions] getConversationsDB failed:', err);
    return { success: false, error: err.message };
  }
}


// ─── Fetch Messages (Server Side Bypass RLS) ──────────────────────────
export async function getMessagesDB(
  userId: string,
  targetId: string,
  isGroup: boolean,
  limit: number = 50,
  cursor?: string
): Promise<ActionResult<any[]>> {
  try {
    const supabaseAdmin = await getAdmin();
    let query = supabaseAdmin
      .from('messages')
      .select(`
        *,
        sender:users!sender_id (display_name, username, avatar_url)
      `);

    if (isGroup) {
      query = query.eq('conversation_id', targetId);
    } else {
      query = query.or(`and(sender_id.eq.${userId},recipient_id.eq.${targetId}),and(sender_id.eq.${targetId},recipient_id.eq.${userId})`);
    }

    if (cursor) {
      // Postgres schema strictly uses sent_at
      query = query.lt('sent_at', cursor);
    }

    const { data, error } = await query
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    // Polyfill sent_at/created_at duality for UI
    const mappedData = (data || []).map((m: any) => ({
      ...m,
      sent_at: m.sent_at || m.created_at,
      created_at: m.created_at || m.sent_at
    }));

    return { success: true, data: mappedData };
  } catch (err: any) {
    console.error('[Actions] getMessagesDB failure:', err);
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
