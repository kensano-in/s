'use server';

import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { isUserRestricted, restrictUserDB, getActiveRestrictions } from '@/lib/spamGuard';
import { recordActivityAndCheckSpam, getDetailedRestrictionsState, submitModerationAppeal, calculateSpamScore } from '@/lib/moderationEngine';
import { analyzeText } from '@/lib/moderation/text-filter';

export async function getAdmin() {
  return createAdminClient();
}

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  return user;
}

const recipientMetaCache = new Map<string, { meta: any; timestamp: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute TTL

async function getCachedUserMetadata(supabaseAdmin: any, userId: string): Promise<any> {
  const cached = recipientMetaCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.meta;
  }
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  const meta = data?.user?.user_metadata || {};
  recipientMetaCache.set(userId, { meta, timestamp: Date.now() });
  return meta;
}

async function checkGroupParticipation(groupId: string, userId: string) {
  const supabaseAdmin = await getAdmin();
  const { data, error } = await supabaseAdmin
    .from('conversation_participants')
    .select('role')
    .match({ conversation_id: groupId, user_id: userId })
    .maybeSingle();
  if (error || !data) {
    throw new Error('Forbidden: You are not a participant of this conversation.');
  }
  return data;
}

async function checkConversationAccess(convId: string, userId: string) {
  const supabaseAdmin = await getAdmin();
  const { data, error } = await supabaseAdmin
    .from('conversation_participants')
    .select('role')
    .match({ conversation_id: convId, user_id: userId })
    .maybeSingle();

  if (error || !data) {
    throw new Error('Forbidden: You are not a participant of this conversation.');
  }
}

/**
 * Resolves a string that is either a conversation UUID or a user UUID into a
 * conversation UUID. NEVER creates data — throws if resolution fails.
 *
 * CE-FIX CE-04: The old version called getOrCreateDMConversationDB as a side
 * effect of reads, silently creating ghost conversations whenever any action
 * was called with a user ID in the URL. That is removed.
 */
async function resolveConversationId(idOrUserId: string, currentUserId: string): Promise<string> {
  const supabaseAdmin = await getAdmin();

  // Fast path: it is already a conversation UUID
  const { data: conv } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('id', idOrUserId)
    .maybeSingle();

  if (conv) return conv.id;

  // Slow path: the caller passed a user UUID — find the existing DM conversation
  // between currentUserId and idOrUserId WITHOUT creating one if it doesn't exist.
  const { data: userCheck } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', idOrUserId)
    .maybeSingle();

  if (userCheck) {
    // Look for an existing DM conversation shared by both users
    const { data: myConvs } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', currentUserId);

    const myConvIds = (myConvs || []).map((c: any) => c.conversation_id);
    if (myConvIds.length > 0) {
      const { data: match } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id, conversations:conversations!inner(is_group)')
        .in('conversation_id', myConvIds)
        .eq('user_id', idOrUserId)
        .eq('conversations.is_group', false)
        .limit(1)
        .maybeSingle();

      if (match) return match.conversation_id;
    }
  }

  // Return as-is and let checkConversationAccess handle the unauthorized case
  return idOrUserId;
}

export async function resolveChatRouteDB(
  routeId: string
): Promise<ActionResult<{
  type: 'existing' | 'pending' | 'invalid';
  conversation?: any;
  user?: any;
}>> {
  try {
    const user = await getAuthUser();
    const myId = user.id;
    const supabaseAdmin = await getAdmin();

    // 1. Check if routeId is an existing conversation ID where I am a participant
    const { data: participation } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('conversation_id', routeId)
      .eq('user_id', myId)
      .maybeSingle();

    if (participation) {
      const convDetails = await getConversationById(routeId);
      if (convDetails.success) {
        return {
          success: true,
          data: {
            type: 'existing',
            conversation: convDetails.data,
          }
        };
      }
    }

    // 2. Check if routeId is a valid user ID
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('id, username, display_name, avatar_url, is_online, invisible_mode')
      .eq('id', routeId)
      .maybeSingle();

    if (targetUser) {
      // Find existing DM
      const { data: myConvs } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', myId);

      const myConvIds = (myConvs || []).map((c: any) => c.conversation_id);
      let existingConvId = null;

      if (myConvIds.length > 0) {
        const { data: match } = await supabaseAdmin
          .from('conversation_participants')
          .select(`
            conversation_id,
            conversations:conversations!inner(is_group)
          `)
          .in('conversation_id', myConvIds)
          .eq('user_id', routeId)
          .eq('conversations.is_group', false)
          .limit(1)
          .maybeSingle();

        if (match) {
          existingConvId = match.conversation_id;
        }
      }

      if (existingConvId) {
        const convDetails = await getConversationById(existingConvId);
        if (convDetails.success) {
          return {
            success: true,
            data: {
              type: 'existing',
              conversation: convDetails.data,
            }
          };
        }
      }

      // No existing conversation, return as pending
      return {
        success: true,
        data: {
          type: 'pending',
          user: {
            id: targetUser.id,
            name: targetUser.display_name ?? targetUser.username ?? 'User',
            username: targetUser.username ?? '',
            avatarUrl: targetUser.avatar_url ?? null,
            isOnline: targetUser.invisible_mode ? false : (targetUser.is_online ?? false),
          }
        }
      };
    }

    return { success: true, data: { type: 'invalid' } };
  } catch (err: any) {
    console.error('[resolveChatRouteDB] error:', err);
    return { success: false, error: err.message || 'Failed to resolve route' };
  }
}


async function checkMessageAccess(messageId: string, userId: string) {
  const supabaseAdmin = await getAdmin();
  const { data: msg, error } = await supabaseAdmin
    .from('messages')
    .select('sender_id, conversation_id, recipient_id')
    .eq('id', messageId)
    .single();
  if (error || !msg) {
    throw new Error('Message not found.');
  }
  if (msg.conversation_id) {
    await checkGroupParticipation(msg.conversation_id, userId);
  } else {
    if (msg.sender_id !== userId && msg.recipient_id !== userId) {
      throw new Error('Forbidden: You do not have access to this message.');
    }
  }
  return msg;
}

// CE-FIX CE-14/CE-dead: _spamBucket was a module-level Map that was declared
// but never written to or read from (replaced by moderationEngine.ts DB-backed
// logic). Removed to prevent accidental future misuse.

// ─── Shared response type ────────────────────────────────────────────────────
type ActionResult<T = null> = { success: boolean; data?: T; error?: string };

// ─── Spam restrictions Actions ────────────────────────────────────────────────
export async function applySpamRestrictionDB(): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    await restrictUserDB(user.id);
    return { success: true };
  } catch (err: any) {
    console.error('[Actions] Failed to apply spam restrictions:', err);
    return { success: false, error: err.message || 'Failed to apply restrictions.' };
  }
}


export async function checkMyDetailedRestrictionsDB(): Promise<ActionResult<any>> {
  try {
    const user = await getAuthUser();
    const state = await getDetailedRestrictionsState(user.id);
    return { success: true, data: state };
  } catch (err: any) {
    console.error('[Actions] Failed to check user restrictions:', err);
    return { success: false, error: err.message || 'Failed to check restrictions.' };
  }
}

export async function submitDetailedAppealDB(reason: string): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    await submitModerationAppeal(user.id, reason);
    return { success: true };
  } catch (err: any) {
    console.error('[Actions] Failed to submit appeal:', err);
    return { success: false, error: err.message || 'Failed to submit appeal.' };
  }
}

// ─── Permission validation ───────────────────────────────────────────────────
export async function validateMessagingPermission(
  _senderId: string,
  recipientId: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const senderId = user.id;

    if (await isUserRestricted(senderId, 'messages')) {
      return { success: false, error: 'You are restricted from sending messages due to spamming.' };
    }

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

/**
 * RT-FIX-01: Resolve the DM partner's userId for a given conversation.
 * Used exclusively by the realtime broadcast routing system when the
 * activePartnerUserId is not yet populated in the store (page-load race).
 * This is a cheap single-row lookup — only called once per conversation open.
 */
export async function getDMPartnerIdDB(
  conversationId: string
): Promise<ActionResult<{ partnerId: string }>> {
  try {
    const user = await getAuthUser();
    const myId = user.id;
    const supabaseAdmin = await getAdmin();

    const { data, error } = await supabaseAdmin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', myId)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return { success: false, error: 'Participant not found' };
    }
    return { success: true, data: { partnerId: data.user_id } };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to resolve partner' };
  }
}

export interface SendMessageArgs {
  recipientId?: string;
  content: string;
  type?: 'text' | 'image' | 'file' | 'voice' | 'video' | 'location';
  mediaUrl?: string;
  fileName?: string;
  mimeType?: string;
  replyToId?: string;
  scheduledAt?: string;
  conversationId?: string;
  clientTempId?: string;
  viewOnce?: boolean;
  mediaGroupId?: string;
  metadata?: any;
}

export async function sendMessageDB(
  args: SendMessageArgs
): Promise<ActionResult<any>> {
  try {
    const {
      recipientId,
      content,
      type = 'text',
      mediaUrl,
      fileName,
      mimeType,
      replyToId,
      scheduledAt,
      conversationId,
      clientTempId,
      viewOnce,
      mediaGroupId,
      metadata,
    } = args;

    const user = await getAuthUser();
    const senderId = user.id;
    const supabaseAdmin = await getAdmin();

    const isValidUUID = (uuid: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

    // 1. Resolve or verify conversation ID
    let finalConversationId = conversationId && isValidUUID(conversationId) ? conversationId : undefined;
    const cleanedRecipientId = recipientId && isValidUUID(recipientId) ? recipientId : undefined;

    let resolvedReplyToId = replyToId;
    if (resolvedReplyToId) {
      if (!isValidUUID(resolvedReplyToId)) {
        const { data: matchedMsg } = await supabaseAdmin
          .from('messages')
          .select('id')
          .eq('client_temp_id', resolvedReplyToId)
          .maybeSingle();
        resolvedReplyToId = matchedMsg?.id || undefined;
      }
    }

    let isNewDM = false;
    if (!finalConversationId && cleanedRecipientId) {
      // Direct lookup for existing DM conversation containing both participants
      const { data: match } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', senderId);

      const myConvIds = (match || []).map((c: any) => c.conversation_id);
      if (myConvIds.length > 0) {
        const { data: shared } = await supabaseAdmin
          .from('conversation_participants')
          .select('conversation_id, conversations:conversations!inner(is_group)')
          .in('conversation_id', myConvIds)
          .eq('user_id', cleanedRecipientId)
          .eq('conversations.is_group', false)
          .limit(1)
          .maybeSingle();

        if (shared) {
          finalConversationId = shared.conversation_id;
        } else {
          isNewDM = true;
        }
      } else {
        isNewDM = true;
      }
    }

    if (!finalConversationId && !isNewDM) {
      return { success: false, error: 'Conversation ID is required.' };
    }

    // ─── Optimized Query Pipeline (CE-09 / Performance) ──────────────────────
    const [modRes, restRes, convRes, partRes, blockRes] = await Promise.all([
      supabaseAdmin
        .from('user_moderation_state')
        .select('needs_manual_review')
        .eq('user_id', senderId)
        .maybeSingle(),
      supabaseAdmin
        .from('user_restrictions')
        .select('id')
        .eq('user_id', senderId)
        .eq('restriction_type', 'messages')
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle(),
      finalConversationId
        ? supabaseAdmin
            .from('conversations')
            .select('is_group')
            .eq('id', finalConversationId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      finalConversationId
        ? supabaseAdmin
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', finalConversationId)
        : Promise.resolve({ data: [], error: null }),
      supabaseAdmin
        .from('blocks')
        .select('blocker_id, blocked_id')
        .or(`blocker_id.eq.${senderId},blocked_id.eq.${senderId}`),
    ]);

    // Validation 1: User Restrictions
    if (modRes.data?.needs_manual_review || restRes.data) {
      return { success: false, error: 'You are restricted from sending messages due to spamming.' };
    }

    // Validation 2: Conversation Access
    if (!isNewDM) {
      const participants = partRes.data || [];
      const isParticipant = participants.some((p: any) => p.user_id === senderId);
      if (!isParticipant) {
        return { success: false, error: 'You do not have access to this conversation.' };
      }
    }

    // Validation 3: Block Status & Recipient Identification
    const conv = convRes.data;
    let actualRecipientId = cleanedRecipientId;
    if (conv && !conv.is_group) {
      const otherPart = (partRes.data || []).find((p: any) => p.user_id !== senderId);
      if (otherPart) {
        actualRecipientId = otherPart.user_id;
      }
    }
    if (actualRecipientId) {
      const isBlocked = (blockRes.data || []).some((b: any) =>
        (b.blocker_id === senderId && b.blocked_id === actualRecipientId) ||
        (b.blocker_id === actualRecipientId && b.blocked_id === senderId)
      );
      if (isBlocked) {
        return { success: false, error: 'You cannot message this user.' };
      }
    }

    // ─── Recipient Privacy Checks (Mute & Restrict) ──────────────────────────
    let isRestrictedByRecipient = false;
    let isMutedByRecipient = false;

    if (actualRecipientId) {
      try {
        const [senderProfile, recipientMeta] = await Promise.all([
          supabaseAdmin
            .from('users')
            .select('username')
            .eq('id', senderId)
            .maybeSingle()
            .then((res: any) => res.data?.username),
          getCachedUserMetadata(supabaseAdmin, actualRecipientId)
        ]);

        const senderUsername = senderProfile;

        if (senderUsername) {
          const restrictedList = recipientMeta.restricted_users || [];
          isRestrictedByRecipient = restrictedList.map((u: string) => u.toLowerCase()).includes(senderUsername.toLowerCase());

          const mutedList = recipientMeta.muted_users || [];
          isMutedByRecipient = mutedList.map((u: string) => u.toLowerCase()).includes(senderUsername.toLowerCase());
        }
      } catch (err) {
        console.error('[sendMessageDB] error checking recipient preferences:', err);
      }
    }

    // Fetch recipient's metadata for custom message controls
    let messageDeliveryFollowers = 'chats';
    let messageDeliveryOthers = 'requests';
    let spamHandling = 'spam';

    if (actualRecipientId) {
      try {
        const recipientMeta = await getCachedUserMetadata(supabaseAdmin, actualRecipientId);
        messageDeliveryFollowers = recipientMeta.message_delivery_followers || 'chats';
        messageDeliveryOthers = recipientMeta.message_delivery_others || 'requests';
        spamHandling = recipientMeta.spam_handling || 'spam';
      } catch (err) {
        console.error('[sendMessageDB] error fetching metadata:', err);
      }
    }

    let initialInboxState: 'CHAT' | 'REQUEST' | 'SPAM' = 'CHAT';

    // A. Check Sender Spam Score
    const senderSpamScore = await calculateSpamScore(senderId);
    if (senderSpamScore >= 81) {
      initialInboxState = 'SPAM';
    }

    // 1. Content-based Spam Classification (Issue 11)
    const textAnalysis = analyzeText(content || '');
    const isSpamContent = textAnalysis.action === 'block' || textAnalysis.action === 'review' || textAnalysis.riskScore >= 40;

    if (isSpamContent && actualRecipientId) {
      if (spamHandling === 'block') {
        return { success: false, error: 'Message blocked by recipient\'s spam filter.' };
      }
      initialInboxState = 'SPAM';
    }

    // 2. Sender-side Spam Restriction for starting DMs (Issue 10)
    if (isNewDM && actualRecipientId) {
      const initSpamResult = await recordActivityAndCheckSpam(senderId, 'initiate_chat', undefined, actualRecipientId);
      if (initSpamResult.blocked) {
        return { success: false, error: 'You are temporarily restricted from starting new conversations due to spamming.' };
      }
    }

    // 3. Recipient Messaging Permission & Private Account Checks (Issue 12)
    if (isNewDM && actualRecipientId) {
      const { data: recipient } = await supabaseAdmin
        .from('users')
        .select('messaging_permission, is_private')
        .eq('id', actualRecipientId)
        .maybeSingle();

      const permission = recipient?.messaging_permission || 'everyone';
      const isPrivate = recipient?.is_private || false;

      if (permission === 'none') {
        return { success: false, error: 'This user does not accept direct messages.' };
      }

      // Check if sender follows recipient
      const { data: followRecord } = await supabaseAdmin
        .from('follows')
        .select('created_at')
        .eq('follower_id', senderId)
        .eq('following_id', actualRecipientId)
        .maybeSingle();
      const isFollowing = !!followRecord;

      let shouldQueueRequest = false;

      if (isFollowing) {
        if (messageDeliveryFollowers === 'requests') {
          shouldQueueRequest = true;
        }
      } else {
        if (messageDeliveryOthers === 'none') {
          return { success: false, error: 'This user does not accept message requests.' };
        }
        if (messageDeliveryOthers === 'requests') {
          shouldQueueRequest = true;
        } else {
          shouldQueueRequest = (permission === 'followers') || isPrivate;
        }
      }

      if (shouldQueueRequest && initialInboxState !== 'SPAM') {
        initialInboxState = 'REQUEST';
      }
    }

    if (!isNewDM && conv && !conv.is_group && actualRecipientId && isRestrictedByRecipient) {
      if (initialInboxState !== 'SPAM') {
        initialInboxState = 'REQUEST';
      }
    }

    // Server-Authoritative Anti-Spam Check
    const spamResult = await recordActivityAndCheckSpam(senderId, 'send_message', content, actualRecipientId || finalConversationId);
    if (spamResult.blocked) {
      if (spamResult.warning) {
        return { success: false, error: `Warning: ${spamResult.warning}` };
      }
      return { success: false, error: 'You are restricted from sending messages due to spamming.' };
    }

    // ─── Atomic Conversation Creation (only when message passes all validation checks) ───
    if (isNewDM && actualRecipientId) {
      const sortedIds = [senderId, actualRecipientId].sort();
      const secureCode = `dm_${sortedIds[0]}_${sortedIds[1]}`;

      const { data: newConv, error: newConvErr } = await supabaseAdmin
        .from('conversations')
        .insert({
          name: 'Direct Message',
          join_code: secureCode,
          is_group: false,
          creator_id: senderId
        })
        .select()
        .single();

      let convId = newConv?.id;

      if (newConvErr || !convId) {
        if (newConvErr?.code === '23505') {
          const { data: existingConv } = await supabaseAdmin
            .from('conversations')
            .select('id')
            .eq('join_code', secureCode)
            .maybeSingle();
          convId = existingConv?.id;
        }
      }

      if (!convId) {
        return { success: false, error: 'Failed to create DM conversation.' };
      }

      finalConversationId = convId;

      const participantsToInsert = [
        { conversation_id: finalConversationId, user_id: senderId, role: 'member', inbox_state: 'CHAT' },
        { conversation_id: finalConversationId, user_id: actualRecipientId, role: 'member', inbox_state: initialInboxState }
      ];
      const { error: partErr } = await supabaseAdmin
        .from('conversation_participants')
        .insert(participantsToInsert);

      if (partErr && partErr.code !== '23505') {
        await supabaseAdmin.from('conversations').delete().eq('id', finalConversationId);
        return { success: false, error: 'Failed to join DM conversation.' };
      }
    }

    // Reset recipient's state to REQUEST or SPAM if they had previously deleted the conversation
    if (actualRecipientId && finalConversationId) {
      const { data: recipientPart } = await supabaseAdmin
        .from('conversation_participants')
        .select('inbox_state')
        .match({ conversation_id: finalConversationId, user_id: actualRecipientId })
        .maybeSingle();
      
      if (recipientPart && recipientPart.inbox_state === 'DELETED') {
        await supabaseAdmin
          .from('conversation_participants')
          .update({ inbox_state: initialInboxState })
          .match({ conversation_id: finalConversationId, user_id: actualRecipientId });
      }
    }

    if (!senderId || (!actualRecipientId && !finalConversationId) || (!content && !mediaUrl)) {
      return { success: false, error: 'Missing required message data.' };
    }

    // ── /shw @username message — Private Whisper Command ──────────────────────
    let whisperToId: string | null = null;
    let finalContent = type === 'text' ? content : `[${type.toUpperCase()}] ${mediaUrl || content}`;

    if (type === 'text' && content.startsWith('/shw ')) {
      const shwMatch = content.match(/^\/shw\s+@([\w.]+)\s+([\s\S]+)$/);
      if (shwMatch) {
        const [, targetUsername, whisperContent] = shwMatch;
        const { data: targetUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('username', targetUsername)
          .maybeSingle();
        if (targetUser) {
          whisperToId = targetUser.id;
          finalContent = whisperContent.trim();
        } else {
          return { success: false, error: `User @${targetUsername} not found.` };
        }
      } else {
        return { success: false, error: 'Invalid /shw syntax. Use: /shw @username message' };
      }
    }

    const payload: any = {
      sender_id: senderId,
      content: finalContent,
      type,
      media_url: mediaUrl || null,
      file_name: fileName || null,
      mime_type: mimeType || null,
      reply_to_id: resolvedReplyToId || null,
      media_group_id: mediaGroupId || null,
      status: 'sent',
      client_temp_id: clientTempId || null,
      whisper_to_id: whisperToId || null,
      conversation_id: finalConversationId,
      recipient_id: actualRecipientId || senderId,
      chat_id: finalConversationId,
      metadata: metadata || null,
    };

    if (viewOnce) {
      payload.view_once = true;
    }

    if (conv && !conv.is_group && actualRecipientId) {
      // Check message request condition for DM
      const { data: priorMsgs } = await supabaseAdmin
        .from('messages')
        .select('id')
        .eq('conversation_id', finalConversationId)
        .limit(1);

      if (!priorMsgs || priorMsgs.length === 0) {
        const { data: existingPendingReq } = await supabaseAdmin
          .from('message_requests')
          .select('id')
          .match({ sender_id: senderId, recipient_id: actualRecipientId, status: 'PENDING' })
          .maybeSingle();

        if (existingPendingReq) {
          return { success: false, error: 'MESSAGE_QUEUED_AS_REQUEST', data: { alreadyQueued: true } };
        }

        const { data: recipient } = await supabaseAdmin
          .from('users')
          .select('messaging_permission')
          .eq('id', actualRecipientId)
          .single();

        if (recipient?.messaging_permission && recipient.messaging_permission !== 'everyone') {
          await supabaseAdmin.from('message_requests').upsert({
            sender_id: senderId,
            recipient_id: actualRecipientId,
            status: 'PENDING',
          }, { onConflict: 'sender_id,recipient_id' });
          return { success: false, error: 'MESSAGE_QUEUED_AS_REQUEST' };
        }
      }
    }

    if (scheduledAt) {
      payload.scheduled_at = scheduledAt;
      payload.is_released = false;
    }

    if (clientTempId) {
      const { data: existing } = await supabaseAdmin
        .from('messages')
        .select()
        .eq('client_temp_id', clientTempId)
        .eq('sender_id', senderId)
        .maybeSingle();

      if (existing) {
        const mappedData = {
          ...existing,
          sent_at: existing.sent_at || existing.created_at,
          created_at: existing.created_at || existing.sent_at,
        };
        return { success: true, data: mappedData };
      }
    }

    // Disappearing messages: timer is set on recipient view inside markAsSeenDB instead of message send

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[sendMessageDB] error:', error);
      return { success: false, error: 'Message failed to send: ' + error.message };
    }

    // Notification (only notify if recipient's inbox_state is CHAT)
    let recipientInboxState = 'CHAT';
    if (actualRecipientId && finalConversationId) {
      const { data: recipientPart } = await supabaseAdmin
        .from('conversation_participants')
        .select('inbox_state')
        .match({ conversation_id: finalConversationId, user_id: actualRecipientId })
        .maybeSingle();
      if (recipientPart) {
        recipientInboxState = recipientPart.inbox_state;
      }
    }

    if (!scheduledAt && actualRecipientId && conv && !conv.is_group && !isMutedByRecipient && recipientInboxState === 'CHAT') {
      const { error: notifErr } = await supabaseAdmin.from('notifications').insert({
        user_id: actualRecipientId,
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
  _senderId: string,
  entityId: string,
  content: string,
  type: string
) {
  try {
    const user = await getAuthUser();
    const senderId = user.id;
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
// ─── Poll for New Messages (Realtime fallback – used when WebSocket is unavailable) ─
export async function getNewMessagesDB(
  _userId: string,
  convId: string,
  isGroup: boolean,
  sinceIso: string
): Promise<ActionResult<any[]>> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    const resolvedId = await resolveConversationId(convId, userId);
    await checkConversationAccess(resolvedId, userId);
    const supabaseAdmin = await getAdmin();

    let query = supabaseAdmin
      .from('messages')
      .select(`
        *,
        sender:users!sender_id(display_name, username, avatar_url),
        message_reactions (emoji, user_id),
        reply_to:reply_to_id (id, content, sender:users (display_name, username))
      `)
      .gt('sent_at', sinceIso)
      .eq('conversation_id', resolvedId)
      .order('sent_at', { ascending: true })
      .limit(50);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const mapped = (data || []).map((m: any) => {
      const rawReactions: { emoji: string; user_id: string }[] = m.message_reactions || [];
      const grouped: Record<string, { emoji: string; count: number; reacted: boolean }> = {};
      for (const r of rawReactions) {
        if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, reacted: false };
        grouped[r.emoji].count++;
        if (r.user_id === userId) grouped[r.emoji].reacted = true;
      }
      return {
        ...m,
        created_at: m.sent_at,
        is_mine: m.sender_id === userId,
        status: m.status ?? 'sent',
        reactions: Object.values(grouped),
      };
    });

    return { success: true, data: mapped };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


// ─── Release Scheduled Messages ──────────────────────────────────────────────
export async function releaseScheduledMessagesDB(
  _userId: string,
  partnerId: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
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

function escapeTelegramHtml(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendTelegramReport(reportId: string, text: string, keyboard: any) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) {
    console.warn('[Telegram Alert] Missing bot token or admin chat ID in environment.');
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: keyboard
      }),
    });
    const d = await res.json();
    if (!res.ok || !d.ok) {
      console.error('[Telegram Alert] Failed to send Telegram alert:', d);
    }
  } catch (err) {
    console.error('[Telegram Alert] Error sending Telegram alert:', err);
  }
}

export async function reportUserDB(args: {
  reporterId: string;
  reportedId: string;
  reason: string;
  conversationId?: string | null;
  evidenceNotes?: string | null;
  consentGranted?: boolean;
}): Promise<ActionResult> {
  try {
    const { reportedId, reason, conversationId, evidenceNotes, consentGranted } = args;
    const user = await getAuthUser();
    const reporterId = user.id;
    const supabaseAdmin = await getAdmin();

    // Fetch reporter and reported profiles for professional presentation
    const { data: reporterProfile } = await supabaseAdmin
      .from('users')
      .select('username, display_name')
      .eq('id', reporterId)
      .maybeSingle();

    const { data: reportedProfile } = await supabaseAdmin
      .from('users')
      .select('username, display_name')
      .eq('id', reportedId)
      .maybeSingle();

    let chatSnapshot: any[] = [];
    
    // Fetch evidence snapshot (past 24 hours) if user grants consent for moderation review
    if (consentGranted && conversationId) {
      const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: messages } = await supabaseAdmin
        .from('messages')
        .select('sender_id, content, type, sent_at')
        .eq('conversation_id', conversationId)
        .gte('sent_at', past24Hours)
        .order('sent_at', { ascending: false })
        .limit(200);
      
      if (messages) {
        chatSnapshot = messages.map((m: any) => {
          const senderLabel = m.sender_id === reporterId
            ? `@${reporterProfile?.username || 'Reporter'}`
            : m.sender_id === reportedId
              ? `@${reportedProfile?.username || 'Reported'}`
              : 'Other';
          
          return {
            sender_id: m.sender_id,
            sender_label: senderLabel,
            content: m.type === 'location' ? '[📍 Location Shared]' : m.content,
            type: m.type,
            sent_at: m.sent_at
          };
        }).reverse();
      }
    }

    const structuredReason = JSON.stringify({
      report_category: reason,
      notes: evidenceNotes || '',
      consent_provided: !!consentGranted,
      snapshot_timestamp: new Date().toISOString(),
      evidence_snapshot: chatSnapshot
    });

    const { data: reportInsert, error } = await supabaseAdmin
      .from('reports')
      .insert({
        reporter_id: reporterId,
        reported_user_id: reportedId,
        reason: structuredReason,
        status: 'PENDING'
      })
      .select('id')
      .single();

    if (error) throw error;
    const reportId = reportInsert.id;

    // Send Alert to Telegram Bot
    let transcriptText = '';
    if (consentGranted && chatSnapshot.length > 0) {
      transcriptText = chatSnapshot.map(m => {
        const timeStr = new Date(m.sent_at).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Kolkata'
        });
        return `[${timeStr}] ${m.sender_label}: ${escapeTelegramHtml(m.content)}`;
      }).join('\n');
      
      if (transcriptText.length > 2500) {
        transcriptText = transcriptText.slice(0, 2500) + '\n... [Truncated due to length]';
      }
    }

    const nowStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const repName = reporterProfile?.display_name || '—';
    const repUser = reporterProfile?.username || '—';
    const redName = reportedProfile?.display_name || '—';
    const redUser = reportedProfile?.username || '—';

    const msgText = [
      `🚨 <b>NEW USER REPORT RECEIVED</b>`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `🗂 <b>REPORT ID:</b> <code>${reportId}</code>`,
      `📅 <b>Filed At:</b> ${nowStr} IST`,
      `⚠️ <b>Category:</b> <code>${reason}</code>`,
      `📝 <b>Notes:</b> <i>${escapeTelegramHtml(evidenceNotes || 'None')}</i>`,
      ``,
      `👤 <b>REPORTER:</b>`,
      `• ID: <code>${reporterId}</code>`,
      `• Name: <b>${escapeTelegramHtml(repName)}</b> (<code>@${escapeTelegramHtml(repUser)}</code>)`,
      ``,
      `👤 <b>REPORTED USER:</b>`,
      `• ID: <code>${reportedId}</code>`,
      `• Name: <b>${escapeTelegramHtml(redName)}</b> (<code>@${escapeTelegramHtml(redUser)}</code>)`,
      ``,
      `🔒 <b>Consent for Message Review:</b> ${consentGranted ? '✅ YES' : '❌ NO'}`,
      consentGranted && transcriptText ? `\n💬 <b>TRANSCRIPT (PAST 24 HOURS):</b>\n<pre>${transcriptText}</pre>` : ''
    ].filter(Boolean).join('\n');

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔍 Review / Pause', callback_data: `rpt_review:${reportId}` },
          { text: '❌ Dismiss', callback_data: `rpt_cancel:${reportId}` },
          { text: '🚨 Fraud', callback_data: `rpt_flag:${reportId}` },
          { text: '⚡ Escalate', callback_data: `rpt_escalate:${reportId}` }
        ],
        [
          { text: '👤 Rep Profile', callback_data: `rpt_intel_profile:${reportId}:reporter` },
          { text: '🌐 Rep IP', callback_data: `rpt_intel_ip:${reportId}:reporter` },
          { text: '🔐 Rep Logs', callback_data: `rpt_intel_seclog:${reportId}:reporter` },
          { text: '📂 Rep Hist', callback_data: `rpt_intel_history:${reportId}:reporter` }
        ],
        [
          { text: '👤 Red Profile', callback_data: `rpt_intel_profile:${reportId}:reported` },
          { text: '🌐 Red IP', callback_data: `rpt_intel_ip:${reportId}:reported` },
          { text: '🔐 Red Logs', callback_data: `rpt_intel_seclog:${reportId}:reported` },
          { text: '📂 Red Hist', callback_data: `rpt_intel_history:${reportId}:reported` }
        ],
        [
          { text: '⚖️ Punish Reported', callback_data: `rpt_menu:${reportId}:reported` },
          { text: '⚖️ Punish Reporter', callback_data: `rpt_menu:${reportId}:reporter` }
        ],
        [
          { text: '⚠️ Warn Reported', callback_data: `rpt_warn:${reportId}:reported` },
          { text: '⚠️ Warn Reporter', callback_data: `rpt_warn:${reportId}:reporter` }
        ],
        [
          { text: '🕊 Pardon Reported', callback_data: `rpt_pardon:${reportId}:reported` },
          { text: '🕊 Pardon Reporter', callback_data: `rpt_pardon:${reportId}:reporter` }
        ]
      ]
    };

    await sendTelegramReport(reportId, msgText, keyboard);

    return { success: true };
  } catch (err: any) {
    console.error('[Actions] Report user failed:', err);
    return { success: false, error: err.message };
  }
}

export async function getOrCreateDMConversationDB(
  _myId: string,
  otherUserId: string
): Promise<ActionResult<{ conversationId: string, user?: any }>> {
  try {
    const user = await getAuthUser();
    const myId = user.id;
    const supabaseAdmin = await getAdmin();
    const { data: block } = await supabaseAdmin
      .from('blocks')
      .select('id')
      .or(`and(blocker_id.eq.${otherUserId},blocked_id.eq.${myId}),and(blocker_id.eq.${myId},blocked_id.eq.${otherUserId})`)
      .limit(1)
      .maybeSingle();
    if (block) {
      return { success: false, error: 'You cannot message this user.' };
    }

    const { data: otherDbUser, error } = await supabaseAdmin
      .from('users')
      .select('id, username, display_name, avatar_url, is_online, invisible_mode')
      .eq('id', otherUserId)
      .single();

    if (error || !otherDbUser) {
      return { success: false, error: 'User not found.' };
    }

    // Look for existing DM conversation (is_group = false containing both myId and otherUserId as participants)
    const { data: myConvs } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', myId);

    const myConvIds = (myConvs || []).map((c: any) => c.conversation_id);
    let existingConvId = null;

    if (myConvIds.length > 0) {
      const { data: match } = await supabaseAdmin
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations:conversations!inner(is_group)
        `)
        .in('conversation_id', myConvIds)
        .eq('user_id', otherUserId)
        .eq('conversations.is_group', false)
        .limit(1)
        .maybeSingle();

      if (match) {
        existingConvId = match.conversation_id;
      }
    }

    if (existingConvId) {
      // Auto-accept any pending/spam message requests from otherUserId to myId
      await supabaseAdmin
        .from('message_requests')
        .update({ status: 'ACCEPTED' })
        .match({ sender_id: otherUserId, recipient_id: myId })
        .in('status', ['PENDING', 'SPAM']);

      return {
        success: true,
        data: {
          conversationId: existingConvId,
          user: {
            id: otherDbUser.id,
            name: otherDbUser.display_name ?? otherDbUser.username ?? null,
            username: otherDbUser.username ?? null,
            avatarUrl: otherDbUser.avatar_url ?? null,
            isOnline: otherDbUser.invisible_mode ? false : (otherDbUser.is_online ?? false),
            invisibleMode: otherDbUser.invisible_mode ?? false,
            isGroup: false
          }
        }
      };
    }

    // CE-FIX CE-10: Use a deterministic join_code based on sorted participant IDs.
    // This allows the DB-level UNIQUE constraint on join_code to act as a lock,
    // resolving the TOCTOU race condition between concurrent calls.
    const sortedIds = [myId, otherUserId].sort();
    const secureCode = `dm_${sortedIds[0]}_${sortedIds[1]}`;

    const { data: newConv, error: newConvErr } = await supabaseAdmin
      .from('conversations')
      .insert({
        name: 'Direct Message',
        join_code: secureCode,
        is_group: false,
        creator_id: myId
      })
      .select()
      .single();

    if (newConvErr || !newConv) {
      if (newConvErr?.code === '23505') {
        // Fetch the existing conversation concurrently created
        const { data: existingConv } = await supabaseAdmin
          .from('conversations')
          .select('id')
          .eq('join_code', secureCode)
          .maybeSingle();

        if (existingConv) {
          return {
            success: true,
            data: {
              conversationId: existingConv.id,
              user: {
                id: otherDbUser.id,
                name: otherDbUser.display_name ?? otherDbUser.username ?? null,
                username: otherDbUser.username ?? null,
                avatarUrl: otherDbUser.avatar_url ?? null,
                isOnline: otherDbUser.invisible_mode ? false : (otherDbUser.is_online ?? false),
                invisibleMode: otherDbUser.invisible_mode ?? false,
                isGroup: false
              }
            }
          };
        }
      }
      console.error('[getOrCreateDMConversationDB] failed to create conversation:', newConvErr);
      return { success: false, error: 'Failed to create DM conversation.' };
    }

    const participants = [
      { conversation_id: newConv.id, user_id: myId, role: 'member' },
      { conversation_id: newConv.id, user_id: otherUserId, role: 'member' }
    ];
    const { error: partErr } = await supabaseAdmin
      .from('conversation_participants')
      .insert(participants);

    if (partErr) {
      // If we failed to insert participants, clean up the conversation row to avoid a ghost conversation
      await supabaseAdmin.from('conversations').delete().eq('id', newConv.id);
      console.error('[getOrCreateDMConversationDB] failed to create participants:', partErr);
      return { success: false, error: 'Failed to join DM conversation.' };
    }

    // Auto-accept any pending/spam message requests from otherUserId to myId
    await supabaseAdmin
      .from('message_requests')
      .update({ status: 'ACCEPTED' })
      .match({ sender_id: otherUserId, recipient_id: myId })
      .in('status', ['PENDING', 'SPAM']);

    return {
      success: true,
      data: {
        conversationId: newConv.id,
        user: {
          id: otherDbUser.id,
          name: otherDbUser.display_name ?? otherDbUser.username ?? null,
          username: otherDbUser.username ?? null,
          avatarUrl: otherDbUser.avatar_url ?? null,
          isOnline: otherDbUser.invisible_mode ? false : (otherDbUser.is_online ?? false),
          invisibleMode: otherDbUser.invisible_mode ?? false,
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
  _userId: string,
  messageIds: string[],
  status: 'delivered' | 'seen'
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    if (messageIds && messageIds.length > 0) {
      await checkMessageAccess(messageIds[0], userId);
    }
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
  _userId: string,
  messageId: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    const supabaseAdmin = await getAdmin();

    // 1. Fetch the message first to check for media_url
    const { data: msg, error: fetchError } = await supabaseAdmin
      .from('messages')
      .select('media_url, sender_id')
      .eq('id', messageId)
      .maybeSingle();

    if (fetchError) return { success: false, error: fetchError.message };
    if (!msg) return { success: false, error: 'Message not found.' };
    if (msg.sender_id !== userId) return { success: false, error: 'Unauthorized.' };

    // 2. If message contains media, delete it from storage (in background for speed)
    if (msg.media_url) {
      try {
        const { deleteMediaFile } = await import('@/lib/storage');
        void deleteMediaFile(msg.media_url);
      } catch (err: any) {
        console.warn('[deleteMessageDB] Failed to remove file from storage:', err.message);
      }
    }

    // 3. Delete database record
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

export async function deleteMessageForMeDB(
  _userId: string,
  messageId: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const userId = user.id;

    // Verify access/authorization to the message
    await checkMessageAccess(messageId, userId);

    const supabaseAdmin = await getAdmin();

    // 1. Fetch current message metadata
    const { data: msg, error: fetchError } = await supabaseAdmin
      .from('messages')
      .select('metadata')
      .eq('id', messageId)
      .maybeSingle();

    if (fetchError) return { success: false, error: fetchError.message };
    if (!msg) return { success: false, error: 'Message not found.' };

    const metadata = msg.metadata || {};
    const deletedFor = Array.isArray(metadata.deleted_for_users)
      ? [...metadata.deleted_for_users]
      : [];

    if (!deletedFor.includes(userId)) {
      deletedFor.push(userId);
    }

    const updatedMetadata = {
      ...metadata,
      deleted_for_users: deletedFor
    };

    // 2. Update metadata
    const { error } = await supabaseAdmin
      .from('messages')
      .update({ metadata: updatedMetadata })
      .eq('id', messageId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    console.error('[deleteMessageForMeDB] Error:', err);
    return { success: false, error: err?.message || 'Unknown error occurred.' };
  }
}

// ─── Block a user ────────────────────────────────────────────────────────────
export async function blockUserDB(
  _blockerId: string,
  blockedId: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const blockerId = user.id;
    if (blockerId === blockedId) return { success: false, error: 'Cannot block yourself.' };
    const supabaseAdmin = await getAdmin();

    // 1. Insert/upsert the block record
    const { error: blockError } = await supabaseAdmin
      .from('blocks')
      .upsert({ blocker_id: blockerId, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id' });

    if (blockError) return { success: false, error: blockError.message };

    // 2. Remove follows in BOTH directions (mutual unfollow)
    await Promise.allSettled([
      // blocker -> blocked
      supabaseAdmin
        .from('followers')
        .delete()
        .eq('follower_id', blockerId)
        .eq('following_id', blockedId),
      // blocked -> blocker
      supabaseAdmin
        .from('followers')
        .delete()
        .eq('follower_id', blockedId)
        .eq('following_id', blockerId),
    ]);

    // 3. Remove any pending follow requests in both directions
    await Promise.allSettled([
      supabaseAdmin
        .from('followers')
        .delete()
        .eq('follower_id', blockerId)
        .eq('following_id', blockedId)
        .eq('status', 'pending'),
      supabaseAdmin
        .from('followers')
        .delete()
        .eq('follower_id', blockedId)
        .eq('following_id', blockerId)
        .eq('status', 'pending'),
    ]);

    // 4. Update DM conversation participant states to BLOCKED
    const { data: convParticipants } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', blockerId);

    const blockerConvIds = (convParticipants || []).map((cp: any) => cp.conversation_id);
    if (blockerConvIds.length > 0) {
      const { data: sharedPart } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id')
        .in('conversation_id', blockerConvIds)
        .eq('user_id', blockedId)
        .maybeSingle();

      if (sharedPart) {
        const convId = sharedPart.conversation_id;
        await supabaseAdmin
          .from('conversation_participants')
          .update({ inbox_state: 'BLOCKED' })
          .eq('conversation_id', convId);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Unblock a user ──────────────────────────────────────────────────────────
export async function unblockUserDB(
  _blockerId: string,
  blockedId: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const blockerId = user.id;
    const supabaseAdmin = await getAdmin();
    const { error } = await supabaseAdmin
      .from('blocks')
      .delete()
      .match({ blocker_id: blockerId, blocked_id: blockedId });

    if (error) return { success: false, error: error.message };

    // Reset DM conversation participant states to CHAT
    const { data: convParticipants } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', blockerId);

    const blockerConvIds = (convParticipants || []).map((cp: any) => cp.conversation_id);
    if (blockerConvIds.length > 0) {
      const { data: sharedPart } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id')
        .in('conversation_id', blockerConvIds)
        .eq('user_id', blockedId)
        .maybeSingle();

      if (sharedPart) {
        const convId = sharedPart.conversation_id;
        await supabaseAdmin
          .from('conversation_participants')
          .update({ inbox_state: 'CHAT' })
          .eq('conversation_id', convId);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Get blocked users list ────────────────────────────────────────────────
export async function getBlockedUsersDB(): Promise<{
  success: boolean;
  data?: { id: string; name: string; username: string; avatarUrl: string | null }[];
  error?: string;
}> {
  try {
    const user = await getAuthUser();
    const supabaseAdmin = await getAdmin();

    // Step 1: Get all blocked_id values for the current user
    const { data: blockRows, error: blockErr } = await supabaseAdmin
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false });

    if (blockErr) {
      console.error('[getBlockedUsersDB] Failed to fetch blocks:', blockErr.message);
      return { success: false, error: blockErr.message };
    }

    if (!blockRows || blockRows.length === 0) {
      return { success: true, data: [] };
    }

    const blockedIds = blockRows.map((r: any) => r.blocked_id);

    // Step 2: Fetch user data for each blocked user from the users table
    const { data: users, error: usersErr } = await supabaseAdmin
      .from('users')
      .select('id, display_name, username, avatar_url')
      .in('id', blockedIds);

    if (usersErr) {
      console.error('[getBlockedUsersDB] Failed to fetch user data:', usersErr.message);
      return { success: false, error: usersErr.message };
    }

    // Preserve block order (most recently blocked first)
    const userMap = new Map((users || []).map((u: any) => [u.id, u]));
    const list = blockedIds.map((bid: string) => {
      const u: any = userMap.get(bid);
      return {
        id: bid,
        name: u?.display_name || u?.username || 'Unknown User',
        username: u?.username || '',
        avatarUrl: u?.avatar_url || null,
      };
    });

    return { success: true, data: list };
  } catch (err: any) {
    console.error('[getBlockedUsersDB] Unexpected error:', err.message);
    return { success: false, error: err.message };
  }
}




// ─── Clear chat ────────────────────────────────────────────────────────────
export async function clearChatDB(
  _userId: string,
  otherUserId: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    const supabaseAdmin = await getAdmin();

    // 1. Try to find conversation by ID directly (group or DM)
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('id, is_group')
      .eq('id', otherUserId)
      .maybeSingle();

    let chatId = conv?.id;
    const isGroup = conv ? conv.is_group : false;

    // 2. If not found by ID, otherUserId is likely the partner's user ID -> find DM conversation ID between them
    if (!chatId) {
      const { data: participants } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (participants && participants.length > 0) {
        const convIds = participants.map(p => p.conversation_id);
        const { data: partnerParticipant } = await supabaseAdmin
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', otherUserId)
          .in('conversation_id', convIds)
          .maybeSingle();
        
        if (partnerParticipant) {
          chatId = partnerParticipant.conversation_id;
        }
      }
    }

    if (!chatId) {
      return { success: false, error: 'Conversation not found.' };
    }

    // 3. Fetch messages with media first
    const { data: messages, error: fetchError } = await supabaseAdmin
      .from('messages')
      .select('id, media_url')
      .eq('conversation_id', chatId);

    if (fetchError) return { success: false, error: fetchError.message };

    // 4. Extract and delete storage files
    if (messages) {
      const urlsToDelete = messages.map(m => m.media_url).filter(Boolean) as string[];
      if (urlsToDelete.length > 0) {
        try {
          const { deleteMultipleMediaFiles } = await import('@/lib/storage');
          void deleteMultipleMediaFiles(urlsToDelete);
        } catch (err: any) {
          console.warn('[clearChatDB] Failed to remove some files from storage:', err.message);
        }
      }
    }

    // 5. Delete messages (will cascade delete reactions & replies)
    const { error: msgDeleteError } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('conversation_id', chatId);

    if (msgDeleteError) return { success: false, error: msgDeleteError.message };

    // 6. Delete conversation metadata in dm_settings if it's a DM
    if (!isGroup) {
      const { error: settingsDeleteError } = await supabaseAdmin
        .from('dm_settings')
        .delete()
        .eq('conversation_id', chatId);

      if (settingsDeleteError) {
        console.warn('[clearChatDB] Failed to delete dm_settings:', settingsDeleteError.message);
      }
    }

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
    const user = await getAuthUser();
    const requester = await checkGroupParticipation(groupId, user.id);
    if (requester.role !== 'admin' && requester.role !== 'moderator') {
      return { success: false, error: 'Only admins or moderators can update group avatar.' };
    }
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

// ── Secure 8-character base-58 join code generator ──────────────────────────
function generateSecureJoinCode(length = 8): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // base-58 style (no ambiguous o,O,0,1,I,l)
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function createGroupDB(
  _creatorId: string,
  name: string,
  joinCode?: string, // Legacy param — now auto-generated if not provided
  iconUrl?: string,
  description?: string,
  requiresApproval?: boolean,
  initialMemberIds?: string[]
): Promise<ActionResult<any>> {
  try {
    const user = await getAuthUser();
    const creatorId = user.id;
    if (await isUserRestricted(creatorId, 'group_creation')) {
      return { success: false, error: 'You are restricted from creating groups due to spamming.' };
    }

    // Server-Authoritative Anti-Spam Check
    const spamResult = await recordActivityAndCheckSpam(creatorId, 'create_group');
    if (spamResult.blocked) {
      if (spamResult.warning) {
        return { success: false, error: `Warning: ${spamResult.warning}` };
      }
      return { success: false, error: 'You are restricted from creating groups due to spamming.' };
    }
    const supabaseAdmin = await getAdmin();
    
    // Always generate a secure 12-char code for new groups
    const secureCode = generateSecureJoinCode();

    // 1. Try atomic database transaction RPC
    try {
      const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('create_group_with_members', {
        p_creator_id: creatorId,
        p_name: name,
        p_join_code: secureCode,
        p_icon_url: iconUrl || null,
        p_description: description || null,
        p_requires_join_approval: requiresApproval ?? false,
        p_initial_member_ids: initialMemberIds || []
      });

      if (!rpcErr && rpcRes && rpcRes.success) {
        return { success: true, data: rpcRes.data };
      }
      if (rpcErr && !rpcErr.message.includes('function') && !rpcErr.message.includes('does not exist')) {
        return { success: false, error: rpcErr.message };
      }
    } catch (rpcCatch) {
      console.warn('[createGroupDB] RPC failed, falling back to JS transactional rollback:', rpcCatch);
    }

    // 2. Fallback JS-based rollback transaction
    const insertPayload: any = {
      name,
      join_code: secureCode,
      creator_id: creatorId,
      icon_url: iconUrl || null,
      is_group: true,
      requires_join_approval: requiresApproval ?? false,
    };
    if (description) insertPayload.description = description;

    const { data: group, error: grpErr } = await supabaseAdmin
      .from('conversations')
      .insert(insertPayload)
      .select()
      .single();

    if (grpErr || !group) {
      console.error('[createGroupDB] group insert failed:', grpErr);
      return { success: false, error: grpErr?.message || 'Failed to initialize group.' };
    }

    // Add creator as Admin
    const { error: partErr } = await supabaseAdmin
      .from('conversation_participants')
      .insert({
        conversation_id: group.id,
        user_id: creatorId,
        role: 'admin'
      });

    if (partErr) {
      console.error('[createGroupDB] admin participant insert failed:', partErr);
      // ROLLBACK: Delete the conversation
      await supabaseAdmin.from('conversations').delete().eq('id', group.id);
      return { success: false, error: 'Failed to join group as admin.' };
    }

    // Add initial members (if provided)
    if (initialMemberIds && initialMemberIds.length > 0) {
      const uniqueMemberIds = Array.from(new Set(initialMemberIds));
      const memberInserts = uniqueMemberIds
        .filter(id => id !== creatorId)
        .map(uid => ({ conversation_id: group.id, user_id: uid, role: 'member' }));
      if (memberInserts.length > 0) {
        const { error: membersErr } = await supabaseAdmin.from('conversation_participants').insert(memberInserts);
        if (membersErr) {
          console.error('[createGroupDB] initial members insert failed:', membersErr);
          // ROLLBACK: Delete the conversation (cascades to participants)
          await supabaseAdmin.from('conversations').delete().eq('id', group.id);
          return { success: false, error: 'Failed to add initial members to group.' };
        }
      }
    }

    // KEN BOT — system welcome handshake
    try {
      const KEN_BOT_ID = '00000000-0000-0000-0000-000000000001';
      const welcomeMsg = `Welcome to ${name} ✦\nYour space is now active.\n\nInvite Code: ${secureCode}\n\nRespect. Build. Connect.`;

      await supabaseAdmin.from('messages').insert({
        sender_id: KEN_BOT_ID,
        recipient_id: KEN_BOT_ID,
        conversation_id: group.id,
        content: welcomeMsg,
        type: 'system',
        status: 'sent',
        sent_at: new Date().toISOString()
      });
    } catch (botErr) {
      console.error('[createGroupDB] Ken bot message failed (non-fatal):', botErr);
    }

    return { success: true, data: { ...group, join_code: secureCode } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function joinGroupByCodeDB(
  _userId: string,
  joinCode: string
): Promise<ActionResult<any>> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    if (await isUserRestricted(userId, 'group_creation')) {
      return { success: false, error: 'You are restricted from joining groups due to spamming.' };
    }

    const spamResult = await recordActivityAndCheckSpam(userId, 'create_group', joinCode);
    if (spamResult.blocked) {
      if (spamResult.warning) return { success: false, error: `Warning: ${spamResult.warning}` };
      return { success: false, error: 'You are restricted from joining groups due to spamming.' };
    }

    const supabaseAdmin = await getAdmin();

    // Support both hyphenated (XXXX-XXXX-XXXX) and plain codes
    const normalizedCode = joinCode.replace(/-/g, '').toUpperCase();

    // 1. Find group by exact match (or case-insensitive/normalized fallback for legacy codes)
    const { data: group, error: grpErr } = await supabaseAdmin
      .from('conversations')
      .select('id, name, requires_join_approval, is_group')
      .or(`join_code.eq.${joinCode},join_code.eq.${joinCode.toUpperCase()},join_code.eq.${joinCode.toLowerCase()},join_code.eq.${normalizedCode}`)
      .eq('is_group', true)
      .maybeSingle();

    if (grpErr || !group) return { success: false, error: 'Invalid or expired group code.' };

    // 2. Check if already a member
    const { data: existing } = await supabaseAdmin
      .from('conversation_participants')
      .select('user_id')
      .match({ conversation_id: group.id, user_id: userId })
      .maybeSingle();
    if (existing) return { success: false, error: 'You are already in this group.' };

    // 3. If admin approval required — create a join request instead
    if (group.requires_join_approval) {
      const { error: reqErr } = await supabaseAdmin
        .from('group_join_requests')
        .upsert(
          { group_id: group.id, user_id: userId, status: 'pending', invite_code: joinCode },
          { onConflict: 'group_id,user_id' }
        );
      if (reqErr) return { success: false, error: reqErr.message };
      return { success: true, data: { ...group, pending_approval: true } };
    }

    // 4. Direct join (no approval required)
    const { error: memErr } = await supabaseAdmin
      .from('conversation_participants')
      .insert({
        conversation_id: group.id,
        user_id: userId,
        role: 'member'
      });

    if (memErr) {
      if (memErr.code === '23505' || memErr.message?.includes('duplicate key') || memErr.message?.includes('already exists')) {
        return { success: true, data: { ...group, pending_approval: false } };
      }
      if (memErr.message?.includes('Group member limit reached')) return { success: false, error: 'Group is full (Max 20 members).' };
      return { success: false, error: memErr.message };
    }

    return { success: true, data: { ...group, pending_approval: false } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Get Group Info by Join Code ─────────────────────────────────────────────
export async function getGroupByJoinCodeDB(code: string): Promise<ActionResult<any>> {
  try {
    const supabaseAdmin = await getAdmin();
    const normalizedCode = code.replace(/-/g, '').toUpperCase();
    const { data: group, error } = await supabaseAdmin
      .from('conversations')
      .select('id, name, icon_url, is_group, creator_id, requires_join_approval')
      .or(`join_code.eq.${code},join_code.eq.${code.toUpperCase()},join_code.eq.${code.toLowerCase()},join_code.eq.${normalizedCode}`)
      .eq('is_group', true)
      .maybeSingle();

    if (error || !group) return { success: false, error: 'Invalid or expired group code.' };

    return { success: true, data: group };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}



// ─── Fetch Group Members ─────────────────────────────────────────────────────
export async function getGroupMembersDB(groupId: string): Promise<ActionResult<any[]>> {
  try {
    const user = await getAuthUser();
    await checkGroupParticipation(groupId, user.id);
    const supabaseAdmin = await getAdmin();
    
    const [participantsRes, nicknamesRes] = await Promise.all([
      supabaseAdmin
        .from('conversation_participants')
        .select(`
          role,
          joined_at,
          users (id, username, display_name, avatar_url)
        `)
        .eq('conversation_id', groupId)
        .order('joined_at', { ascending: true }),
      supabaseAdmin
        .from('chat_nicknames')
        .select('user_id, nickname')
        .eq('chat_id', groupId)
    ]);

    if (participantsRes.error) throw participantsRes.error;
    
    const nicknamesMap: Record<string, string> = {};
    (nicknamesRes.data || []).forEach((n: any) => {
      if (n.user_id && n.nickname) nicknamesMap[n.user_id] = n.nickname;
    });

    const formatted = (participantsRes.data || []).map((row: any) => ({
      id: row.users?.id,
      username: row.users?.username,
      displayName: row.users?.display_name,
      avatarUrl: row.users?.avatar_url,
      role: row.role,
      joinedAt: row.joined_at,
      nickname: nicknamesMap[row.users?.id] ?? null
    }));
    
    return { success: true, data: formatted };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Add Multiple Users to Group ──────────────────────────────────────────────
export async function addUsersToGroupDB(groupId: string, userIds: string[]): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    if (await isUserRestricted(user.id, 'group_creation')) {
      return { success: false, error: 'You are restricted from adding users to groups due to spamming.' };
    }

    const spamResult = await recordActivityAndCheckSpam(user.id, 'create_group', userIds.join(','));
    if (spamResult.blocked) {
      if (spamResult.warning) return { success: false, error: `Warning: ${spamResult.warning}` };
      return { success: false, error: 'You are restricted from adding users to groups due to spamming.' };
    }

    const requester = await checkGroupParticipation(groupId, user.id);
    if (requester.role !== 'admin' && requester.role !== 'moderator') {
      return { success: false, error: 'Only admins or moderators can add users to the group.' };
    }
    const supabaseAdmin = await getAdmin();
    
    const uniqueUserIds = Array.from(new Set(userIds));
    
    const { data: existingMembers } = await supabaseAdmin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', groupId)
      .in('user_id', uniqueUserIds);

    const existingSet = new Set((existingMembers || []).map((m: any) => m.user_id));
    const newMembersToInsert = uniqueUserIds.filter(uid => !existingSet.has(uid));

    if (newMembersToInsert.length === 0) {
      return { success: true };
    }

    const inserts = newMembersToInsert.map(uid => ({
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
  _requesterId: string,
  targetUserId: string,
  newRole: 'admin' | 'moderator' | 'member'
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const requesterId = user.id;
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
    const user = await getAuthUser();
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
  _viewerId: string,
  senderId: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const viewerId = user.id;
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
  _userId: string,
  messageId: string,
  newContent: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    if (await isUserRestricted(userId, 'messages')) {
      return { success: false, error: 'You are restricted from editing messages due to spamming.' };
    }

    const spamResult = await recordActivityAndCheckSpam(userId, 'send_message', newContent);
    if (spamResult.blocked) {
      if (spamResult.warning) return { success: false, error: `Warning: ${spamResult.warning}` };
      return { success: false, error: 'You are restricted from editing messages due to spamming.' };
    }

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
  _userId: string,
  emoji: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    if (await isUserRestricted(userId, 'reactions')) {
      return { success: false, error: 'You are restricted from reacting to messages due to spamming.' };
    }

    const spamResult = await recordActivityAndCheckSpam(userId, 'add_reaction', emoji, messageId);
    if (spamResult.blocked) {
      if (spamResult.warning) return { success: false, error: `Warning: ${spamResult.warning}` };
      return { success: false, error: 'You are restricted from reacting to messages due to spamming.' };
    }

    await checkMessageAccess(messageId, userId);
    const supabaseAdmin = await getAdmin();
    // Delete any other reactions for this user on this message
    await supabaseAdmin
      .from('message_reactions')
      .delete()
      .match({ user_id: userId, message_id: messageId });

    const { error } = await supabaseAdmin
      .from('message_reactions')
      .insert({ user_id: userId, message_id: messageId, emoji });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Remove Reaction ─────────────────────────────────────────────────────────
export async function removeReactionDB(
  messageId: string,
  _userId: string,
  emoji: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    if (await isUserRestricted(userId, 'reactions')) {
      return { success: false, error: 'You are restricted from reacting to messages due to spamming.' };
    }
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
  _userId: string,
  partnerId: string
): Promise<ActionResult<any>> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    const supabaseAdmin = await getAdmin();

    let actualPartnerId = partnerId;
    let chatId = [userId, partnerId].sort().join('_');
    const { data: convCheck } = await supabaseAdmin
      .from('conversations')
      .select('is_group')
      .eq('id', partnerId)
      .maybeSingle();

    if (convCheck) {
      if (convCheck.is_group) {
        return { success: false, error: 'Not a DM conversation.' };
      }
      const { data: otherPart } = await supabaseAdmin
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', partnerId)
        .neq('user_id', userId)
        .maybeSingle();
      if (otherPart) {
        actualPartnerId = otherPart.user_id;
      }
      chatId = partnerId;
    } else {
      // partnerId is a user ID. Find the canonical conversation UUID between userId and partnerId.
      const { data: partnerConvs } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', partnerId);
        
      if (partnerConvs && partnerConvs.length > 0) {
        const convIds = partnerConvs.map(c => c.conversation_id);
        const { data: shared } = await supabaseAdmin
          .from('conversation_participants')
          .select('conversation_id, conversations!inner(is_group)')
          .eq('user_id', userId)
          .in('conversation_id', convIds)
          .eq('conversations.is_group', false)
          .limit(1)
          .maybeSingle();
          
        if (shared) {
          chatId = shared.conversation_id;
        }
      }
    }

    // Fetch personal settings (includes personal bubble_style), shared theme, and nicknames in parallel
    const [personalRes, partnerSettingsRes, themeRes, nickRes, myNickRes] = await Promise.all([
      supabaseAdmin.from('dm_settings').select('*').match({ user_id: userId, partner_id: actualPartnerId }).maybeSingle(),
      supabaseAdmin.from('dm_settings').select('*').match({ user_id: actualPartnerId, partner_id: userId }).maybeSingle(),
      supabaseAdmin.from('chat_theme').select('theme_id, theme_blur, updated_at').eq('chat_id', chatId).maybeSingle(),
      supabaseAdmin.from('chat_nicknames').select('nickname').match({ chat_id: chatId, user_id: actualPartnerId }).maybeSingle(),
      supabaseAdmin.from('chat_nicknames').select('nickname').match({ chat_id: chatId, user_id: userId }).maybeSingle()
    ]);

    const data = personalRes.data || {};
    const partnerData = partnerSettingsRes.data || {};
    let theme = themeRes.data;
    let nick = nickRes.data;
    let myNick = myNickRes.data;

    // Backward compatibility & dynamic migration for legacy themes
    if (!theme && chatId !== actualPartnerId) {
      const legacyChatId = [userId, actualPartnerId].sort().join('_');
      const { data: legacyTheme } = await supabaseAdmin
        .from('chat_theme')
        .select('*')
        .eq('chat_id', legacyChatId)
        .maybeSingle();

      if (legacyTheme) {
        const { data: migratedTheme } = await supabaseAdmin
          .from('chat_theme')
          .upsert({
            chat_id: chatId,
            theme_id: legacyTheme.theme_id,
            theme_blur: legacyTheme.theme_blur,
            updated_at: new Date().toISOString()
          })
          .select()
          .maybeSingle();
        theme = migratedTheme || legacyTheme;
      }
    }

    // Backward compatibility & dynamic migration for legacy nicknames
    if (!nick && chatId !== actualPartnerId) {
      const legacyChatId = [userId, actualPartnerId].sort().join('_');
      const { data: legacyNick } = await supabaseAdmin
        .from('chat_nicknames')
        .select('*')
        .match({ chat_id: legacyChatId, user_id: actualPartnerId })
        .maybeSingle();

      if (legacyNick) {
        const { data: migratedNick } = await supabaseAdmin
          .from('chat_nicknames')
          .upsert({
            chat_id: chatId,
            user_id: actualPartnerId,
            nickname: legacyNick.nickname
          })
          .select()
          .maybeSingle();
        nick = migratedNick || legacyNick;
      }
    }

    return { 
      success: true, 
      data: {
        ...data,
        theme_id: theme?.theme_id ?? data.theme_id ?? null,
        theme_blur: theme?.theme_blur ?? data.theme_blur ?? null,
        typing_indicator: 'dots',
        updated_at: theme?.updated_at ?? null,
        bubble_style: data.bubble_style ?? null,
        their_nickname: nick?.nickname ?? data.partner_nickname ?? null,
        my_nickname: myNick?.nickname ?? null,
        partner_nickname: nick?.nickname ?? data.partner_nickname ?? null,
        nickname_edit_permission: data.nickname_edit_permission ?? 'everyone',
        partner_nickname_edit_permission: partnerData.nickname_edit_permission ?? 'everyone'
      } 
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateDMSettingsDB(
  _userId: string,
  partnerId: string,
  updates: any
): Promise<ActionResult<any>> {
  try {
    const user = (await getAuthUser()) as any;
    const userId = user.id;
    const supabaseAdmin = await getAdmin();

    let actualPartnerId = partnerId;
    let chatId = [userId, partnerId].sort().join('_');
    const { data: convCheck } = await supabaseAdmin
      .from('conversations')
      .select('is_group')
      .eq('id', partnerId)
      .maybeSingle();

    if (convCheck) {
      if (convCheck.is_group) {
        return { success: false, error: 'Not a DM conversation.' };
      }
      const { data: otherPart } = await supabaseAdmin
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', partnerId)
        .neq('user_id', userId)
        .maybeSingle();
      if (otherPart) {
        actualPartnerId = otherPart.user_id;
      }
      chatId = partnerId;
    } else {
      // partnerId is a user ID. Find the canonical conversation UUID between userId and partnerId.
      const { data: partnerConvs } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', partnerId);
        
      if (partnerConvs && partnerConvs.length > 0) {
        const convIds = partnerConvs.map(c => c.conversation_id);
        const { data: shared } = await supabaseAdmin
          .from('conversation_participants')
          .select('conversation_id, conversations!inner(is_group)')
          .eq('user_id', userId)
          .in('conversation_id', convIds)
          .eq('conversations.is_group', false)
          .limit(1)
          .maybeSingle();
          
        if (shared) {
          chatId = shared.conversation_id;
        }
      }
    }

    // Check block status before allowing updates
    const { data: block } = await supabaseAdmin
      .from('blocks')
      .select('id')
      .or(`and(blocker_id.eq.${userId},blocked_id.eq.${actualPartnerId}),and(blocker_id.eq.${actualPartnerId},blocked_id.eq.${userId})`)
      .limit(1)
      .maybeSingle();

    if (block) {
      return { success: false, error: 'Theme customization and chat settings are disabled while messaging is restricted.' };
    }
    
    const finalUpdates: any = { ...updates };

    // 1. Update personal settings (muted, disappearing_mode, bubble_style — PERSONAL preferences)
    const personalKeys = ['muted', 'disappearing_mode', 'last_seen_hidden', 'bubble_style', 'partner_nickname', 'nickname_edit_permission'];
    const personalUpdates: any = {};
    personalKeys.forEach(k => { if (finalUpdates[k] !== undefined) personalUpdates[k] = finalUpdates[k]; });

    if (Object.keys(personalUpdates).length > 0) {
      const { data: existing } = await supabaseAdmin.from('dm_settings').select('id').match({ user_id: userId, partner_id: actualPartnerId }).maybeSingle();
      try {
        if (existing) {
          await supabaseAdmin.from('dm_settings').update(personalUpdates).eq('id', existing.id);
        } else {
          await supabaseAdmin.from('dm_settings').insert({ user_id: userId, partner_id: actualPartnerId, ...personalUpdates });
        }
      } catch (err: any) {
        console.warn('[updateDMSettingsDB] failed to update dm_settings with full payload:', err.message);
        if (personalUpdates.nickname_edit_permission !== undefined) {
          const { nickname_edit_permission, ...fallbackUpdates } = personalUpdates;
          if (Object.keys(fallbackUpdates).length > 0) {
            if (existing) {
              await supabaseAdmin.from('dm_settings').update(fallbackUpdates).eq('id', existing.id);
            } else {
              await supabaseAdmin.from('dm_settings').insert({ user_id: userId, partner_id: actualPartnerId, ...fallbackUpdates });
            }
          }
        } else {
          throw err;
        }
      }

      if (personalUpdates.disappearing_mode !== undefined) {
        const { data: partnerExisting } = await supabaseAdmin.from('dm_settings').select('id').match({ user_id: actualPartnerId, partner_id: userId }).maybeSingle();
        if (partnerExisting) {
          await supabaseAdmin.from('dm_settings').update({ disappearing_mode: personalUpdates.disappearing_mode }).eq('id', partnerExisting.id);
        } else {
          await supabaseAdmin.from('dm_settings').insert({ user_id: actualPartnerId, partner_id: userId, disappearing_mode: personalUpdates.disappearing_mode });
        }

        // Insert System Message for disappearing mode change
        const dmMode = personalUpdates.disappearing_mode;
        const text = dmMode !== 'off'
          ? `You enabled disappearing messages. New messages will disappear ${dmMode === '24h' ? '24 hours' : dmMode === '7d' ? '7 days' : dmMode === '30d' ? '30 days' : '90 days'} after they've been seen.`
          : `You disabled disappearing messages.`;

        await supabaseAdmin.from('messages').insert({
          sender_id: userId,
          recipient_id: actualPartnerId,
          conversation_id: chatId,
          content: text,
          type: 'system',
          status: 'sent',
          sent_at: new Date().toISOString()
        });
      }
    }

    // 2. Update Shared Theme
    const themeKeys = ['theme_id', 'theme_blur'];
    const themeUpdates: any = { updated_at: new Date().toISOString() };
    themeKeys.forEach(k => { if (finalUpdates[k] !== undefined) themeUpdates[k] = finalUpdates[k]; });

    if (finalUpdates.theme_id !== undefined) {
      const displayName = (user as any).display_name || (user as any).username || 'System';
      themeUpdates.theme_id = `${finalUpdates.theme_id}|${user.id}|${displayName}`;
    }

    if (Object.keys(themeUpdates).length > 1) {
      await supabaseAdmin.from('chat_theme').upsert({ chat_id: chatId, ...themeUpdates });
    }

    // 3. Update Nickname (Instagram style: can set both partner's and self's nickname)
    if (finalUpdates.their_nickname !== undefined) {
      const partnerNick = finalUpdates.their_nickname;
      const partnerUserRes = await supabaseAdmin.from('users').select('display_name, username').eq('id', actualPartnerId).single();
      const partnerNameStr = partnerUserRes.data?.display_name || partnerUserRes.data?.username || 'user';
      
      if (partnerNick === null || partnerNick.trim() === '') {
        await supabaseAdmin.from('chat_nicknames').delete().match({ chat_id: chatId, user_id: actualPartnerId });
        await supabaseAdmin.from('messages').insert({
          sender_id: userId,
          recipient_id: actualPartnerId,
          conversation_id: chatId,
          content: `You cleared the nickname for ${partnerNameStr}.`,
          type: 'system',
          status: 'sent',
          sent_at: new Date().toISOString()
        });
      } else {
        await supabaseAdmin.from('chat_nicknames').upsert({ chat_id: chatId, user_id: actualPartnerId, nickname: partnerNick.trim() }, { onConflict: 'chat_id,user_id' });
        await supabaseAdmin.from('messages').insert({
          sender_id: userId,
          recipient_id: actualPartnerId,
          conversation_id: chatId,
          content: `You set the nickname for ${partnerNameStr} to ${partnerNick.trim()}. Update`,
          type: 'system',
          status: 'sent',
          sent_at: new Date().toISOString()
        });
      }
    }

    if (finalUpdates.my_nickname !== undefined) {
      const myNickVal = finalUpdates.my_nickname;
      
      if (myNickVal === null || myNickVal.trim() === '') {
        await supabaseAdmin.from('chat_nicknames').delete().match({ chat_id: chatId, user_id: userId });
        await supabaseAdmin.from('messages').insert({
          sender_id: userId,
          recipient_id: actualPartnerId,
          conversation_id: chatId,
          content: `You cleared your nickname.`,
          type: 'system',
          status: 'sent',
          sent_at: new Date().toISOString()
        });
      } else {
        await supabaseAdmin.from('chat_nicknames').upsert({ chat_id: chatId, user_id: userId, nickname: myNickVal.trim() }, { onConflict: 'chat_id,user_id' });
        await supabaseAdmin.from('messages').insert({
          sender_id: userId,
          recipient_id: actualPartnerId,
          conversation_id: chatId,
          content: `You set your own nickname to ${myNickVal.trim()}. Update`,
          type: 'system',
          status: 'sent',
          sent_at: new Date().toISOString()
        });
      }
    }

    return getDMSettingsDB(userId, partnerId);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getGroupSettingsDB(
  groupId: string
): Promise<ActionResult<any>> {
  try {
    const user = await getAuthUser();
    const participation = await checkGroupParticipation(groupId, user.id);
    const supabaseAdmin = await getAdmin();
    // For groups: shared theme (theme_id, theme_blur) from chat_theme
    // bubble_style for groups is purely LOCAL (localStorage) — not stored in DB
    const [themeRes, convRes, mySettingsRes] = await Promise.all([
      supabaseAdmin.from('chat_theme').select('theme_id, theme_blur, updated_at').eq('chat_id', groupId).maybeSingle(),
      supabaseAdmin.from('conversations').select('name, icon_url, requires_join_approval, join_code').eq('id', groupId).maybeSingle(),
      supabaseAdmin.from('dm_settings').select('bubble_style').match({ user_id: user.id, partner_id: groupId }).maybeSingle(),
    ]);

    const theme = themeRes.data;
    const conv = convRes.data;
    const mySettings = mySettingsRes.data;

    return {
      success: true,
      data: {
        name: conv?.name ?? null,
        icon_url: conv?.icon_url ?? null,
        join_code: conv?.join_code ?? null,
        requires_join_approval: conv?.requires_join_approval ?? false,
        theme_id: theme?.theme_id ?? null,
        theme_blur: theme?.theme_blur ?? null,
        typing_indicator: 'dots',
        updated_at: theme?.updated_at ?? null,
        // FIX-8: bubble_style is personal — read from caller's dm_settings
        bubble_style: mySettings?.bubble_style ?? null,
        my_role: participation.role,
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateGroupSettingsDB(
  groupId: string,
  updates: any
): Promise<ActionResult> {
  try {
    const user = (await getAuthUser()) as any;
    const requester = await checkGroupParticipation(groupId, user.id);
    const supabaseAdmin = await getAdmin();

    // FIX-8: bubble_style is PERSONAL for groups too — stored in dm_settings, not chat_theme
    if (updates.bubble_style !== undefined) {
      const { data: existingPersonal } = await supabaseAdmin
        .from('dm_settings').select('id').match({ user_id: user.id, partner_id: groupId }).maybeSingle();
      if (existingPersonal) {
        await supabaseAdmin.from('dm_settings').update({ bubble_style: updates.bubble_style }).eq('id', existingPersonal.id);
      } else {
        await supabaseAdmin.from('dm_settings').insert({ user_id: user.id, partner_id: groupId, bubble_style: updates.bubble_style });
      }
    }

    // Only admins/mods can update shared group settings
    if (requester.role !== 'admin' && requester.role !== 'moderator') {
      // Personal bubble style was already saved above — shared settings require admin
      if (Object.keys(updates).every(k => k === 'bubble_style')) return { success: true };
      return { success: false, error: 'Only admins or moderators can update group settings.' };
    }

    // Shared theme (NOT bubble_style)
    const themeKeys = ['theme_id', 'theme_blur'];
    const themeUpdates: any = { updated_at: new Date().toISOString() };
    themeKeys.forEach(k => { if (updates[k] !== undefined) themeUpdates[k] = updates[k]; });

    if (updates.theme_id !== undefined) {
      const displayName = user.display_name || user.username || 'System';
      themeUpdates.theme_id = `${updates.theme_id}|${user.id}|${displayName}`;
    }

    if (Object.keys(themeUpdates).length > 1) {
      await supabaseAdmin.from('chat_theme').upsert({ chat_id: groupId, ...themeUpdates });
    }

    // Conversation metadata updates
    const convUpdates: any = {};
    if (updates.name) convUpdates.name = updates.name;
    if (updates.icon_url) convUpdates.icon_url = updates.icon_url;
    if (updates.requires_join_approval !== undefined) convUpdates.requires_join_approval = updates.requires_join_approval;

    if (Object.keys(convUpdates).length > 0) {
      await supabaseAdmin.from('conversations').update(convUpdates).eq('id', groupId);
    }

    const finalSettings = await getGroupSettingsDB(groupId);
    return finalSettings;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function setGroupMemberNicknameDB(
  groupId: string,
  memberId: string,
  nickname: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    if (user.id !== memberId) {
      const requester = await checkGroupParticipation(groupId, user.id);
      if (requester.role !== 'admin' && requester.role !== 'moderator') {
        return { success: false, error: 'Forbidden: Cannot set nickname for another member.' };
      }
    } else {
      await checkGroupParticipation(groupId, user.id);
    }
    const supabaseAdmin = await getAdmin();
    if (!nickname || nickname.trim() === '') {
      await supabaseAdmin.from('chat_nicknames').delete().match({ chat_id: groupId, user_id: memberId });
    } else {
      await supabaseAdmin.from('chat_nicknames').upsert(
        { chat_id: groupId, user_id: memberId, nickname: nickname.trim() },
        { onConflict: 'chat_id,user_id' }
      );
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Report a message ────────────────────────────────────────────────────────
export async function reportMessageDB(
  _reporterId: string,
  messageId: string,
  reportedUserId: string,
  reason: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const reporterId = user.id;
    await checkMessageAccess(messageId, reporterId);
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
    const user = await getAuthUser();
    const msg = await checkMessageAccess(messageId, user.id);
    const supabaseAdmin = await getAdmin();

    if (msg.conversation_id) {
      const { data: conv } = await supabaseAdmin
        .from('conversations')
        .select('is_group')
        .eq('id', msg.conversation_id)
        .single();
      
      if (conv?.is_group) {
        const requester = await checkGroupParticipation(msg.conversation_id, user.id);
        if (requester.role !== 'admin' && requester.role !== 'moderator') {
          return { success: false, error: 'Only group admins and moderators can pin messages.' };
        }
      }
    }

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

// ─── Star a message ───────────────────────────────────────────────────────────
export async function starMessageDB(
  messageId: string,
  starred: boolean
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    await checkMessageAccess(messageId, user.id);
    const supabaseAdmin = await getAdmin();
    
    if (starred) {
      const { error } = await supabaseAdmin
        .from('starred_messages')
        .upsert(
          { user_id: user.id, message_id: messageId },
          { onConflict: 'user_id,message_id' }
        );
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabaseAdmin
        .from('starred_messages')
        .delete()
        .eq('user_id', user.id)
        .eq('message_id', messageId);
      if (error) return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getStarredMessagesDB(
  conversationId: string
): Promise<ActionResult<any[]>> {
  try {
    const user = await getAuthUser();
    const resolvedId = await resolveConversationId(conversationId, user.id);
    await checkConversationAccess(resolvedId, user.id);
    const supabaseAdmin = await getAdmin();
    
    const { data, error } = await supabaseAdmin
      .from('starred_messages')
      .select(`
        messages!inner (
          *,
          sender:users!messages_sender_id_fkey (display_name, username, avatar_url),
          message_reactions (emoji, user_id),
          reply_to:reply_to_id (id, content, sender:users!messages_sender_id_fkey (display_name, username))
        )
      `)
      .eq('user_id', user.id)
      .eq('messages.conversation_id', resolvedId);
      
    if (error) return { success: false, error: error.message };
    
    const mapped = (data || []).map((d: any) => {
      const m = d.messages;
      if (!m) return null;
      const rawReactions = m.message_reactions || [];
      const grouped: any = {};
      for (const r of rawReactions) {
        if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, reacted: false };
        grouped[r.emoji].count++;
        if (r.user_id === user.id) grouped[r.emoji].reacted = true;
      }
      return {
        ...m,
        is_starred: true,
        reactions: Object.values(grouped),
        sent_at: m.sent_at,
        created_at: m.sent_at,
      };
    }).filter(Boolean);
    
    return { success: true, data: mapped };
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
    const user = await getAuthUser();
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
  _uploaderId: string,
  imageUrl: string,
  isPublic: boolean
): Promise<ActionResult<any>> {
  try {
    const user = await getAuthUser();
    const uploaderId = user.id;
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
  _userId: string
): Promise<ActionResult<any[]>> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    const supabaseAdmin = await getAdmin();
    const { data, error } = await supabaseAdmin
      .from('stickers')
      .select('*')
      .or(`uploader_id.eq.${userId},status.eq.APPROVED`)
      .order('created_at', { ascending: false });

    return { success: true, data: data || undefined };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Bulk DM Settings ─────────────────────────────────────────────────────────
export async function getBulkDMSettingsDB(
  _userId: string
): Promise<ActionResult<any[]>> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
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
  _userId: string,
  partnerId: string,
  mode: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
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

    // Resolve conversation ID if partnerId is conversation UUID
    let targetConvId = partnerId;
    const { data: convCheck } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('id', partnerId)
      .maybeSingle();

    if (!convCheck) {
      // Find the DM conversation
      const { data: match } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId)
        .limit(100);
      const myConvIds = (match || []).map(m => m.conversation_id);
      if (myConvIds.length > 0) {
        const { data: pMatch } = await supabaseAdmin
          .from('conversation_participants')
          .select('conversation_id, conversations!inner(is_group)')
          .in('conversation_id', myConvIds)
          .eq('user_id', partnerId)
          .eq('conversations.is_group', false)
          .maybeSingle();
        if (pMatch) targetConvId = pMatch.conversation_id;
      }
    }

    const { error } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('conversation_id', targetConvId)
      .lt('sent_at', cutoff.toISOString());

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteMessagesDB(
  partnerId: string,
  mode: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
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

    // Resolve conversation ID if partnerId is conversation UUID
    let targetConvId = partnerId;
    const { data: convCheck } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('id', partnerId)
      .maybeSingle();

    if (!convCheck) {
      // Find the DM conversation
      const { data: match } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId)
        .limit(100);
      const myConvIds = (match || []).map(m => m.conversation_id);
      if (myConvIds.length > 0) {
        const { data: pMatch } = await supabaseAdmin
          .from('conversation_participants')
          .select('conversation_id, conversations!inner(is_group)')
          .in('conversation_id', myConvIds)
          .eq('user_id', partnerId)
          .eq('conversations.is_group', false)
          .maybeSingle();
        if (pMatch) targetConvId = pMatch.conversation_id;
      }
    }

    const { error } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('conversation_id', targetConvId)
      .lt('sent_at', cutoff.toISOString());

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
async function fetchConversationsByState(userId: string, inboxStates: string[]): Promise<ActionResult<any[]>> {
  try {
    const supabaseAdmin = await getAdmin();
    
    // Fetch blocks to filter out DMs with blocked users (unless querying blocked inbox)
    const { data: blocks } = await supabaseAdmin
      .from('blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
    
    const blockedUserIds = new Set<string>();
    (blocks || []).forEach((b: any) => {
      blockedUserIds.add(b.blocker_id);
      blockedUserIds.add(b.blocked_id);
    });

    // 1. Fetch conversations via conversation_participants filtering by inbox_state
    const { data: participations, error: partErr } = await supabaseAdmin
      .from('conversation_participants')
      .select(`
        conversation_id,
        inbox_state,
        conversations:conversations(*)
      `)
      .eq('user_id', userId)
      .in('inbox_state', inboxStates);

    if (partErr) throw partErr;

    const convs = (participations || [])
      .map((p: any) => ({
        ...p.conversations,
        inbox_state: p.inbox_state
      }))
      .filter(Boolean);
    const convIds = convs.map(c => c.id);

    if (convIds.length === 0) return { success: true, data: [] };

    const dmConvIds = convs.filter((c: any) => !c.is_group).map((c: any) => c.id);
    const groupIds = convs.filter((c: any) => c.is_group).map((c: any) => c.id);

    const [lastMsgsRes, dmPartnersRes, groupCountsRes, nicknamesRes, themesRes] = await Promise.all([
      supabaseAdmin
        .from('messages')
        .select('conversation_id, id, sender_id, content, sent_at, type, status')
        .in('conversation_id', convIds)
        .order('sent_at', { ascending: false })
        .limit(convIds.length * 2),
      dmConvIds.length > 0
        ? supabaseAdmin
            .from('conversation_participants')
            .select('conversation_id, user_id, users:users(id, username, display_name, avatar_url, is_online, presence_expires_at, invisible_mode, is_verified, created_at, bio)')
            .in('conversation_id', dmConvIds)
            .neq('user_id', userId)
        : Promise.resolve({ data: [], error: null }),
      groupIds.length > 0
        ? supabaseAdmin
            .from('conversation_participants')
            .select('conversation_id')
            .in('conversation_id', groupIds)
        : Promise.resolve({ data: [], error: null }),
      dmConvIds.length > 0
        ? supabaseAdmin
            .from('chat_nicknames')
            .select('chat_id, user_id, nickname')
            .in('chat_id', dmConvIds)
        : Promise.resolve({ data: [], error: null }),
      convIds.length > 0
        ? supabaseAdmin
            .from('chat_theme')
            .select('chat_id, theme_id, theme_blur')
            .in('chat_id', convIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Build last message map (DESC order — first match per conv = most recent)
    const lastMessagesMap: Record<string, any> = {};
    for (const m of (lastMsgsRes.data || [])) {
      if (!lastMessagesMap[m.conversation_id]) {
        lastMessagesMap[m.conversation_id] = m;
      }
    }

    const dmPartners: Record<string, any> = {};
    for (const p of ((dmPartnersRes.data as any[]) || [])) {
      if (p.users) dmPartners[p.conversation_id] = p.users;
    }

    const partnerIds = Object.values(dmPartners).map((u: any) => u.id).filter(Boolean);
    const { data: myFollows } = partnerIds.length > 0
      ? await supabaseAdmin
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId)
          .in('following_id', partnerIds)
      : { data: [] };
    const myFollowedIds = new Set((myFollows || []).map((f: any) => f.following_id));

    const memberCounts: Record<string, number> = {};
    for (const c of (groupCountsRes.data || [])) {
      memberCounts[c.conversation_id] = (memberCounts[c.conversation_id] || 0) + 1;
    }

    const nicknamesMap: Record<string, string> = {};
    for (const n of (nicknamesRes?.data || [])) {
      if (n.user_id !== userId) {
        nicknamesMap[n.chat_id] = n.nickname;
      }
    }

    const themesMap: Record<string, any> = {};
    for (const t of (themesRes?.data || [])) {
      themesMap[t.chat_id] = t;
    }

    function formatPreview(m: any) {
      if (!m) return '';
      if (m.type === 'image') return '📷 Image';
      if (m.type === 'voice') return '🎤 Voice note';
      if (m.type === 'file') return '📎 File';
      if (m.type === 'video') return '🎦 Video';
      return m.content || '';
    }

    const threads = convs
      .map((conv: any) => {
        const lastMsg = lastMessagesMap[conv.id];

        if (conv.is_group) {
          const theme = themesMap[conv.id] || null;
          return {
            id: conv.id,
            name: conv.name,
            username: conv.name?.toLowerCase().replace(/\s+/g, '_') || '',
            avatarUrl: conv.icon_url,
            joinCode: conv.join_code,
            isGroup: true,
            lastMessage: formatPreview(lastMsg),
            updatedAt: lastMsg?.sent_at || conv.created_at || '',
            unread: 0,
            theme_id: theme?.theme_id || conv.theme_id || null,
            theme_blur: theme?.theme_blur || conv.theme_blur || null,
            member_count: memberCounts[conv.id] || 0,
            nickname: null,
            inbox_state: conv.inbox_state,
          };
        }

        const partner = dmPartners[conv.id];
        // Skip DMs where the partner is blocked (unless we are explicitly fetching blocked list)
        if (!inboxStates.includes('BLOCKED')) {
          if (partner?.id && partner.id !== userId && blockedUserIds.has(partner.id)) {
            return null;
          }
        }

        const nickname = nicknamesMap[conv.id] || null;
        const theme = themesMap[conv.id] || null;

        return {
          id: conv.id,
          name: partner?.display_name || partner?.username || 'Unknown User',
          username: partner?.username || '',
          avatarUrl: partner?.avatar_url,
          isOnline: partner?.invisible_mode ? false : (partner?.is_online || false),
          invisibleMode: partner?.invisible_mode || false,
          presenceExpiresAt: partner?.presence_expires_at || null,
          isGroup: false,
          lastMessage: formatPreview(lastMsg),
          updatedAt: lastMsg?.sent_at || conv.created_at || '',
          unread: 0,
          partnerId: partner?.id,
          nickname: nickname,
          theme_id: theme?.theme_id || null,
          theme_blur: theme?.theme_blur || null,
          inbox_state: conv.inbox_state,
          is_mutual: partner?.id ? myFollowedIds.has(partner.id) : false,
          // Compatibility fields for page.tsx requests rendering
          sender_id: partner?.id,
          recipient_id: userId,
          status: conv.inbox_state === 'REQUEST' ? 'PENDING' : (conv.inbox_state === 'SPAM' ? 'SPAM' : 'ACCEPTED'),
          created_at: conv.created_at,
          initial_message: lastMsg ? formatPreview(lastMsg) : '',
          sender: partner ? {
            display_name: partner.display_name,
            username: partner.username,
            avatar_url: partner.avatar_url,
            bio: partner.bio,
            is_verified: partner.is_verified,
            created_at: partner.created_at,
          } : null,
        };
      })
      .filter(Boolean);

    const sorted = threads.sort((a: any, b: any) => 
      new Date(b?.updatedAt || 0).getTime() - new Date(a?.updatedAt || 0).getTime()
    );

    return { success: true, data: sorted };
  } catch (err: any) {
    console.error('[fetchConversationsByState] FATAL:', err);
    return { success: false, error: err.message || 'Failed to load conversations' };
  }
}

export async function getConversationsDB(_userId: string): Promise<ActionResult<any[]>> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    return await fetchConversationsByState(userId, ['CHAT']);
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to load conversations' };
  }
}

export async function getConversationById(id: string): Promise<ActionResult<any>> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    const resolvedId = await resolveConversationId(id, userId);
    await checkConversationAccess(resolvedId, userId);
    const supabaseAdmin = await getAdmin();
    
    const { data: conv, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', resolvedId)
      .maybeSingle();

    if (conv) {
      if (conv.is_group) {
        return {
          success: true,
          data: {
            id: conv.id ?? null,
            name: conv.name ?? null,
            isGroup: true,
            avatarUrl: conv.icon_url ?? null,
            joinCode: conv.join_code ?? null,
            theme_id: conv.theme_id ?? null,
            theme_blur: conv.theme_blur ?? null,
          }
        };
      } else {
        const [partnerRes, nicknameRes, themeRes] = await Promise.all([
          supabaseAdmin
            .from('conversation_participants')
            .select(`
              user_id,
              users:users(id, username, display_name, avatar_url, is_online, presence_expires_at)
            `)
            .eq('conversation_id', conv.id)
            .neq('user_id', userId)
            .maybeSingle(),
          supabaseAdmin
            .from('chat_nicknames')
            .select('nickname')
            .eq('chat_id', conv.id)
            .neq('user_id', userId)
            .maybeSingle(),
          supabaseAdmin
            .from('chat_theme')
            .select('theme_id, theme_blur')
            .eq('chat_id', conv.id)
            .maybeSingle()
        ]);

        const dmUser = (partnerRes.data as any)?.users;
        return {
          success: true,
          data: {
            id: conv.id,
            name: dmUser?.display_name ?? dmUser?.username ?? 'Unknown User',
            username: dmUser?.username ?? null,
            avatarUrl: dmUser?.avatar_url ?? null,
            isGroup: false,
            isOnline: dmUser?.is_online ?? false,
            presenceExpiresAt: dmUser?.presence_expires_at ?? null,
            partnerId: dmUser?.id ?? null,
            nickname: nicknameRes.data?.nickname ?? null,
            theme_id: themeRes.data?.theme_id ?? null,
            theme_blur: themeRes.data?.theme_blur ?? null,
          }
        };
      }
    }

    return { success: false, error: 'Conversation not found' };

  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
// ─── Fetch Messages (Server Side Bypass RLS) ──────────────────────────
export async function getMessagesDB(
  _userId: string,
  targetId: string,
  isGroup: boolean,
  limit: number = 50,
  cursorSentAt?: string
): Promise<ActionResult<any[]>> {
  try {
    const userId = _userId || (await getAuthUser()).id;
    const supabaseAdmin = await getAdmin();

    // Fast path: if targetId is a valid UUID string, use it directly without 4 extra DB/Auth roundtrips
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
    let resolvedId = targetId;
    if (!isUuid) {
      resolvedId = await resolveConversationId(targetId, userId);
    }
    
    let query = supabaseAdmin
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey (display_name, username, avatar_url),
        message_reactions (emoji, user_id),
        reply_to:reply_to_id (id, content, sender:users!messages_sender_id_fkey (display_name, username)),
        starred_messages!left (user_id)
      `)
      .eq('conversation_id', resolvedId);

    // Only show root-level messages in the main conversation
    query = query.is('thread_root_id', null);

    // FIX-14: Filter out whisper messages not meant for the current user
    // A whisper is hidden from everyone except: the sender AND the whisper_to_id recipient
    query = query.or(
      `whisper_to_id.is.null,whisper_to_id.eq.${userId},sender_id.eq.${userId}`
    );

    // Rebuild disappearing messages logic: filter out expired messages
    query = query.or(`location_expires_at.is.null,location_expires_at.gt.${new Date().toISOString()}`);

    // Background prune of expired messages in this chat (including storage file cleanup)
    if (!cursorSentAt) {
      void (async () => {
        try {
          const { data: expired } = await supabaseAdmin
            .from('messages')
            .select('id, media_url')
            .eq('conversation_id', resolvedId)
            .lt('location_expires_at', new Date().toISOString());

          if (expired && expired.length > 0) {
            const expiredIds = expired.map(e => e.id);
            const urls = expired.map(e => e.media_url).filter(Boolean) as string[];
            if (urls.length > 0) {
              const { deleteMultipleMediaFiles } = await import('@/lib/storage');
              await deleteMultipleMediaFiles(urls);
            }
            await supabaseAdmin.from('messages').delete().in('id', expiredIds);
          }
        } catch (err: any) {
          console.warn('[getMessagesDB] Background media prune failed:', err.message);
        }
      })();
    }

    if (cursorSentAt) {
      query = query.lt('sent_at', cursorSentAt);
    }

    const { data, error } = await query
      // Fetch newest messages first, we'll reverse in UI if needed (wait, UI doesn't reverse yet? I need to check UI)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[getMessagesDB] Query Error:', error);
      throw error;
    }

    // Aggregate reactions into [{emoji, count, reacted}] shape expected by MessageItem
    const mappedData = (data || []).map((m: any) => {
      const rawReactions: { emoji: string; user_id: string }[] = m.message_reactions || [];
      const grouped: Record<string, { emoji: string; count: number; reacted: boolean }> = {};
      for (const r of rawReactions) {
        if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, reacted: false };
        grouped[r.emoji].count++;
        if (r.user_id === userId) grouped[r.emoji].reacted = true;
      }

      const isOpened = m.view_once && (m.viewed_by || []).length > 0;
      const isStarred = Array.isArray(m.starred_messages) && m.starred_messages.some((s: any) => s.user_id === userId);

      return {
        ...m,
        content: isOpened ? "Opened" : m.content,
        media_url: isOpened ? null : m.media_url,
        sent_at: m.sent_at,
        created_at: m.sent_at, // Fallback since created_at column is missing
        reactions: Object.values(grouped),
        is_starred: isStarred,
      };
    });

    // Filter out messages that the user has marked as deleted for themselves
    const filteredMappedData = mappedData.filter((m: any) => {
      const deletedFor = m.metadata?.deleted_for_users;
      if (Array.isArray(deletedFor) && deletedFor.includes(userId)) {
        return false;
      }
      return true;
    });

    // ── Server-authoritative live location expiry enforcement ──
    // Strip actual coordinates from expired live location messages so that
    // no client-side bypass can reveal the location data after expiry.
    const now = new Date();
    const enforcedData = filteredMappedData.map((m: any) => {
      if (m.type === 'location' && m.location_live && m.location_expires_at) {
        const expiresAt = new Date(m.location_expires_at);
        if (now >= expiresAt) {
          // Overwrite location coordinates with nulls — location is expired
          return {
            ...m,
            location_lat: null,
            location_lng: null,
            location_address: null,
          };
        }
      }
      return m;
    });

    return { success: true, data: enforcedData };
  } catch (err: any) {
    console.error('[getMessagesDB] CRITICAL FAILURE:', err);
    return { success: false, error: err.message };
  }
}


// ─── Hidden Chats Override ───────────────────────────────────────────────────
export async function hideChatDB(
  _userId: string,
  conversationId: string,
  secretCode: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    const supabaseAdmin = await getAdmin();
    // Fetch current user metadata
    const { data: { user: authUser }, error: fetchErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (fetchErr || !authUser) throw new Error('Could not fetch user metadata');

    const meta = authUser.user_metadata || {};
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
  _userId: string,
  conversationId: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    const supabaseAdmin = await getAdmin();
    const { data: { user: authUser }, error: fetchErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (fetchErr || !authUser) throw new Error('Could not fetch user metadata');

    const meta = authUser.user_metadata || {};
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
  _userId: string,
  groupId: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    const supabaseAdmin = await getAdmin();

    const { data: leavingMember } = await supabaseAdmin
      .from('conversation_participants')
      .select('role')
      .match({ conversation_id: groupId, user_id: userId })
      .maybeSingle();

    if (!leavingMember) {
      return { success: false, error: 'You are not a participant of this group.' };
    }

    const { data: remainingMembers } = await supabaseAdmin
      .from('conversation_participants')
      .select('user_id, role, joined_at')
      .eq('conversation_id', groupId)
      .neq('user_id', userId)
      .order('joined_at', { ascending: true });

    if (!remainingMembers || remainingMembers.length === 0) {
      const { error: delErr } = await supabaseAdmin
        .from('conversations')
        .delete()
        .eq('id', groupId);
      if (delErr) throw delErr;
      return { success: true };
    }

    const { error: leaveErr } = await supabaseAdmin
      .from('conversation_participants')
      .delete()
      .match({ conversation_id: groupId, user_id: userId });

    if (leaveErr) throw leaveErr;

    if (leavingMember.role === 'admin') {
      const otherAdminsExist = remainingMembers.some(m => m.role === 'admin');
      if (!otherAdminsExist) {
        const nextAdmin = remainingMembers[0];
        await supabaseAdmin
          .from('conversation_participants')
          .update({ role: 'admin' })
          .match({ conversation_id: groupId, user_id: nextAdmin.user_id });
      }
    }

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
  _actorId: string,
  groupId: string,
  targetUserId: string,
  role: 'admin' | 'moderator' | 'member'
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const actorId = user.id;
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

    // Verify target is not the last admin
    if (role !== 'admin') {
      const { data: targetMember } = await supabaseAdmin
        .from('conversation_participants')
        .select('role')
        .match({ conversation_id: groupId, user_id: targetUserId })
        .maybeSingle();

      if (targetMember && targetMember.role === 'admin') {
        const { count } = await supabaseAdmin
          .from('conversation_participants')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', groupId)
          .eq('role', 'admin');

        if (count === 1) {
          return { success: false, error: 'Cannot demote the last admin of the group.' };
        }
      }
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
  _actorId: string,
  groupId: string,
  targetUserId: string,
  durationMs: number
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const actorId = user.id;
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
  _actorId: string,
  groupId: string,
  targetUserId: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const actorId = user.id;
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
  _actorId: string,
  groupId: string,
  targetUserId: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const actorId = user.id;
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
  _userId: string,
  groupId: string
): Promise<ActionResult<{ isMuted: boolean; muteUntil: string | null }>> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
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

// ─── Seen Receipts ──────────────────────────────────────────────────────────
export async function markAsSeenDB(
  _userId: string,
  messageIds: string[]
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    if (messageIds && messageIds.length > 0) {
      await checkMessageAccess(messageIds[0], userId);
    }
    const supabaseAdmin = await getAdmin();
    const rows = messageIds.map(id => ({
      message_id: id,
      user_id: userId
    }));

    const { error } = await supabaseAdmin
      .from('message_reads')
      .upsert(rows, { onConflict: 'message_id,user_id' });

    if (error) throw error;

    // Start disappearing message timer on recipient view
    if (messageIds && messageIds.length > 0) {
      const { data: dbMsgs } = await supabaseAdmin
        .from('messages')
        .select('id, sender_id, conversation_id, location_expires_at')
        .in('id', messageIds);

      if (dbMsgs && dbMsgs.length > 0) {
        for (const msg of dbMsgs) {
          // Timer starts when the recipient views (msg.sender_id !== userId) and timer is not set yet
          if (msg.sender_id !== userId && !msg.location_expires_at) {
            const { data: conv } = await supabaseAdmin
              .from('conversations')
              .select('id, is_group')
              .eq('id', msg.conversation_id)
              .maybeSingle();

            if (conv) {
              let durationStr: string | null = null;
              if (!conv.is_group) {
                // DM Settings Check
                const { data: settings } = await supabaseAdmin
                  .from('dm_settings')
                  .select('disappearing_mode')
                  .eq('conversation_id', conv.id)
                  .maybeSingle();

                if (settings?.disappearing_mode && settings.disappearing_mode !== 'off') {
                  durationStr = settings.disappearing_mode;
                }
              }

              if (durationStr) {
                const expiresAt = new Date();
                if (durationStr === '24h') expiresAt.setHours(expiresAt.getHours() + 24);
                else if (durationStr === '7d') expiresAt.setDate(expiresAt.getDate() + 7);
                else if (durationStr === '30d') expiresAt.setDate(expiresAt.getDate() + 30);
                else if (durationStr === '90d') expiresAt.setDate(expiresAt.getDate() + 90);

                await supabaseAdmin
                  .from('messages')
                  .update({ location_expires_at: expiresAt.toISOString() })
                  .eq('id', msg.id);
              }
            }
          }
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}



// ═══════════════════════════════════════════════════════════════════════════
// FEATURE: View-Once (Ghost) Messages
// ═══════════════════════════════════════════════════════════════════════════

export async function markViewedDB(
  messageId: string,
  _userId: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    await checkMessageAccess(messageId, userId);
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
  _userId: string,
  convId: string,
  isGroup: boolean
): Promise<ActionResult<any[]>> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    const resolvedId = await resolveConversationId(convId, userId);
    await checkConversationAccess(resolvedId, userId);
    const supabaseAdmin = await getAdmin();
    let query = supabaseAdmin
      .from('messages')
      .select('id, type, content, media_url, file_name, mime_type, sent_at, sender:users!messages_sender_id_fkey(display_name, username)')
      .or("type.eq.image,type.eq.file,and(type.eq.text,content.ilike.%http%)")
      .eq('conversation_id', resolvedId);

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
    const user = await getAuthUser();
    await checkMessageAccess(threadRootId, user.id);
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
  _senderId: string,
  threadRootId: string,
  content: string,
  conversationId?: string,
  recipientId?: string
): Promise<ActionResult<any>> {
  try {
    const user = await getAuthUser();
    const senderId = user.id;
    await checkMessageAccess(threadRootId, senderId);
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

function getTimezoneOffset(tzString: string): number {
  try {
    const date = new Date();
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: tzString }));
    const localDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    return (tzDate.getTime() - localDate.getTime()) / 60000; // Offset in minutes
  } catch (e) {
    return 0;
  }
}

function isPrivateIp(ip: string): boolean {
  let cleanIp = ip.trim();
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.slice(7);
  }
  return (
    cleanIp === '127.0.0.1' ||
    cleanIp === '::1' ||
    cleanIp.startsWith('10.') ||
    cleanIp.startsWith('192.168.') ||
    cleanIp.startsWith('169.254.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(cleanIp)
  );
}

function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export async function sendLocationDB(
  _senderId: string,
  convId: string,
  isGroup: boolean,
  lat: number,
  lng: number,
  address: string | null,
  isLive: boolean,
  liveDurationHours: number = 1,
  clientTimezone?: string,
  exact: boolean = false,
  clientTempId?: string
): Promise<ActionResult<any>> {
  try {
    const user = await getAuthUser();
    const senderId = user.id;
    if (await isUserRestricted(senderId, 'messages')) {
      return { success: false, error: 'You are restricted from sending messages due to spamming.' };
    }

    const spamResult = await recordActivityAndCheckSpam(senderId, 'send_message', address || 'location', convId);
    if (spamResult.blocked) {
      if (spamResult.warning) return { success: false, error: `Warning: ${spamResult.warning}` };
      return { success: false, error: 'You are restricted from sending messages due to spamming.' };
    }

    await checkConversationAccess(convId, senderId);

    const supabaseAdmin = await getAdmin();

    // ─── Geo-Spoofing & Travel Speed Verification ───
    // Query last sent location to check if user traveled at an impossible speed
    const { data: lastLocation } = await supabaseAdmin
      .from('messages')
      .select('created_at, location_lat, location_lng')
      .eq('sender_id', senderId)
      .eq('type', 'location')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastLocation && lastLocation.location_lat != null && lastLocation.location_lng != null) {
      const lastTime = new Date(lastLocation.created_at).getTime();
      const now = Date.now();
      const diffSeconds = (now - lastTime) / 1000;
      if (diffSeconds > 0 && diffSeconds < 3600) { // Check travel within last 1 hour
        const dist = getHaversineDistance(
          lat, lng,
          lastLocation.location_lat, lastLocation.location_lng
        ); // in km
        const speedKmh = (dist / (diffSeconds / 3600));
        // Max realistic speed: 250 km/h
        if (dist > 0.5 && speedKmh > 250) {
          console.warn(`[Location Block] Geo-spoofing detected! Impossible speed: ${speedKmh.toFixed(2)} km/h over ${dist.toFixed(2)} km in ${diffSeconds.toFixed(1)}s`);
          return { success: false, error: 'LOCATION_MANIPULATION_DETECTED' };
        }
      }
    }

    // 1. VPN / Proxy / Timezone Security Checks
    const headersList = await headers();
    
    // Check request proxy headers directly (100% positive proxy matches)
    const proxyHeaders = [
      'via',
      'forwarded',
      'x-proxy-id',
      'proxy-connection',
      'proxy-authorization',
      'x-forwarded-for-original',
    ];
    for (const h of proxyHeaders) {
      if (headersList.get(h)) {
        console.warn(`[VPN Block] Proxy header detected: ${h}=${headersList.get(h)}`);
        return { success: false, error: 'VPN_OR_PROXY_DETECTED' };
      }
    }

    const rawIp = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || '127.0.0.1';
    const ip = rawIp.split(',')[0].trim();

    if (!isPrivateIp(ip)) {
      try {
        const urls = [
          `http://ip-api.com/json/${ip}?fields=status,message,country,timezone,isp,proxy,hosting`,
          `https://ipinfo.io/${ip}/json`
        ];

        // Fetch in parallel to avoid slowing down request
        const results = await Promise.allSettled(urls.map(url => fetch(url).then(r => r.json())));
        let isVpn = false;
        let geoTimezone: string | null = null;

        // Check ip-api.com results
        const ipApiRes = results[0];
        if (ipApiRes.status === 'fulfilled' && ipApiRes.value.status === 'success') {
          const data = ipApiRes.value;
          if (data.proxy === true || data.hosting === true) {
            console.warn(`[VPN Block] ip-api flagged proxy/hosting: ip=${ip}, proxy=${data.proxy}, hosting=${data.hosting}`);
            isVpn = true;
          }
          if (data.timezone) {
            geoTimezone = data.timezone;
          }
        }

        // Check ipinfo.io results (threat intelligence keyword screening)
        const ipinfoRes = results[1];
        if (ipinfoRes.status === 'fulfilled' && ipinfoRes.value && !ipinfoRes.value.error) {
          const data = ipinfoRes.value;
          const org = (data.org || '').toLowerCase();
          const hostname = (data.hostname || '').toLowerCase();
          
          const vpnKeywords = [
            'vpn', 'proxy', 'tor', 'mullvad', 'nordvpn', 'expressvpn', 'surfshark', 'tunnelbear',
            'digitalocean', 'linode', 'ovh', 'choopa', 'datacamp', 'packethost', 'vultr', 'aws',
            'amazon', 'google', 'hosting', 'datacenter', 'server', 'cloud', 'leaseweb', 'hetzner'
          ];

          for (const kw of vpnKeywords) {
            if (org.includes(kw) || hostname.includes(kw)) {
              console.warn(`[VPN Block] ipinfo flagged keyword "${kw}": org="${data.org}", hostname="${data.hostname}"`);
              isVpn = true;
              break;
            }
          }

          if (data.timezone && !geoTimezone) {
            geoTimezone = data.timezone;
          }
        }

        if (isVpn) {
          return { success: false, error: 'VPN_OR_PROXY_DETECTED' };
        }

        // Cross-verify client system timezone offset with IP timezone offset
        if (clientTimezone && geoTimezone) {
          const clientOffset = getTimezoneOffset(clientTimezone);
          const ipOffset = getTimezoneOffset(geoTimezone);
          const diffMinutes = Math.abs(clientOffset - ipOffset);
          
          if (diffMinutes > 60) {
            console.warn(`[VPN Block] Timezone spoofing mismatch: ip=${ip}, geoTimezone=${geoTimezone} (offset=${ipOffset}), clientTimezone=${clientTimezone} (offset=${clientOffset})`);
            return { success: false, error: 'VPN_OR_PROXY_DETECTED' };
          }
        }
      } catch (err: any) {
        console.error("[sendLocationDB] IP security check failed to execute:", err);
      }
    }

    // Resolve conversation participants to find recipient
    const { data: participants, error: partError } = await supabaseAdmin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', convId);

    if (partError) throw partError;

    let recipientId = senderId; // Default to senderId for groups
    if (!isGroup) {
      const otherPart = participants?.find((p: any) => p.user_id !== senderId);
      if (otherPart) {
        recipientId = otherPart.user_id;
      }
    }

    // We are forcing exact=true now as the user requested to disable the nearby/approximate location concept.
    const forceExact = true;
    let storedLat: number;
    let storedLng: number;
    let storedAddress: string | null;
    let contentLabel: string;

    if (forceExact) {
      // Precise GPS coordinates and address details
      storedLat = lat;
      storedLng = lng;
      storedAddress = address;
      contentLabel = address ? `📍 ${address}` : `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } else {
      // Fallback (unused for now)
      const FUZZ_DEGREES = 0.002;
      storedLat = lat + (Math.random() - 0.5) * 2 * FUZZ_DEGREES;
      storedLng = lng + (Math.random() - 0.5) * 2 * FUZZ_DEGREES;
      storedAddress = address ? address.split(',').slice(-3).join(',').trim() : null;
      contentLabel = storedAddress ? `📍 ${storedAddress}` : '📍 Location shared (nearby)';
    }


    const expiresAt = isLive
      ? new Date(Date.now() + liveDurationHours * 60 * 60 * 1000).toISOString()
      : null;

    const payload: any = {
      sender_id: senderId,
      conversation_id: convId,
      recipient_id: recipientId,
      content: contentLabel,
      type: 'location',
      status: 'sent',
      location_lat: storedLat,
      location_lng: storedLng,
      location_address: storedAddress,
      location_live: isLive,
      location_expires_at: expiresAt,
      client_temp_id: clientTempId || null,
      metadata: { location_exact: exact },
    };



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
    const user = await getAuthUser();
    const msg = await checkMessageAccess(messageId, user.id);
    if (msg.sender_id !== user.id) {
      return { success: false, error: 'Forbidden: You cannot update another user location.' };
    }
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

// ─── Message Requests (Privacy) ─────────────────────────────────────────────
export async function getMessageRequestsDB(
  _userId: string
): Promise<ActionResult<any[]>> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    return await fetchConversationsByState(userId, ['REQUEST']);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getSpamRequestsDB(
  _userId: string
): Promise<ActionResult<any[]>> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    
    // Background cleanup of expired spam (expired after 30 days)
    const supabaseAdmin = await getAdmin();
    const expiryDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // For participants in SPAM state, we transition them to DELETED if they have expired
    const { data: expiredSpamParts } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)
      .eq('inbox_state', 'SPAM')
      .lt('joined_at', expiryDate);
      
    if (expiredSpamParts && expiredSpamParts.length > 0) {
      const expiredConvIds = expiredSpamParts.map((p: any) => p.conversation_id);
      await supabaseAdmin
        .from('conversation_participants')
        .update({ inbox_state: 'DELETED' })
        .eq('user_id', userId)
        .in('conversation_id', expiredConvIds);
    }

    return await fetchConversationsByState(userId, ['SPAM']);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function acceptMessageRequestDB(
  requestId: string,
  _userId: string,
  senderId: string
): Promise<ActionResult<any>> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    const supabaseAdmin = await getAdmin();
    
    // Accept by transitioning the participant row to CHAT
    const { error } = await supabaseAdmin
      .from('conversation_participants')
      .update({ inbox_state: 'CHAT' })
      .match({ conversation_id: requestId, user_id: userId });
      
    if (error) throw error;

    return { success: true, data: { conversationId: requestId } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function declineMessageRequestDB(
  requestId: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const supabaseAdmin = await getAdmin();
    
    // Double check recipient is the current user
    const { data: part } = await supabaseAdmin
      .from('conversation_participants')
      .select('id')
      .match({ conversation_id: requestId, user_id: user.id })
      .maybeSingle();
      
    if (!part) {
      return { success: false, error: 'Forbidden: You cannot decline this request.' };
    }
    
    // Decline deletes the conversation entirely
    await supabaseAdmin.from('conversation_participants').delete().eq('conversation_id', requestId);
    await supabaseAdmin.from('messages').delete().eq('conversation_id', requestId);
    await supabaseAdmin.from('conversations').delete().eq('id', requestId);
    
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getArchivedConversationsDB(
  _userId: string
): Promise<ActionResult<any[]>> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    return await fetchConversationsByState(userId, ['ARCHIVED']);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getBlockedConversationsDB(
  _userId: string
): Promise<ActionResult<any[]>> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    return await fetchConversationsByState(userId, ['BLOCKED']);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function archiveConversationDB(
  conversationId: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    const supabaseAdmin = await getAdmin();
    
    const { error } = await supabaseAdmin
      .from('conversation_participants')
      .update({ inbox_state: 'ARCHIVED' })
      .match({ conversation_id: conversationId, user_id: userId });
      
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function unarchiveConversationDB(
  conversationId: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    const supabaseAdmin = await getAdmin();
    
    const { error } = await supabaseAdmin
      .from('conversation_participants')
      .update({ inbox_state: 'CHAT' })
      .match({ conversation_id: conversationId, user_id: userId });
      
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteConversationDB(
  conversationId: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    const supabaseAdmin = await getAdmin();
    
    // Set to DELETED state for the current user (hides it from all lists)
    const { error } = await supabaseAdmin
      .from('conversation_participants')
      .update({ inbox_state: 'DELETED' })
      .match({ conversation_id: conversationId, user_id: userId });
      
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE: Group Join Requests (Admin Approval Flow)
// ═══════════════════════════════════════════════════════════════════════════


export async function getGroupJoinRequestsDB(
  groupId: string
): Promise<ActionResult<any[]>> {
  try {
    const user = await getAuthUser();
    const requester = await checkGroupParticipation(groupId, user.id);
    if (requester.role !== 'admin' && requester.role !== 'moderator') {
      return { success: false, error: 'Only admins or moderators can view join requests.' };
    }
    const supabaseAdmin = await getAdmin();
    const { data, error } = await supabaseAdmin
      .from('group_join_requests')
      .select('*, users:user_id(id, username, display_name, avatar_url, bio)')
      .eq('group_id', groupId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function approveGroupJoinRequestDB(
  groupId: string,
  requestId: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const requester = await checkGroupParticipation(groupId, user.id);
    if (requester.role !== 'admin' && requester.role !== 'moderator') {
      return { success: false, error: 'Only admins or moderators can approve join requests.' };
    }
    const supabaseAdmin = await getAdmin();

    // Get the request
    const { data: req, error: reqErr } = await supabaseAdmin
      .from('group_join_requests')
      .select('user_id, group_id')
      .eq('id', requestId)
      .eq('group_id', groupId)
      .eq('status', 'pending')
      .single();

    if (reqErr || !req) return { success: false, error: 'Join request not found.' };

    // Add user to the group
    const { error: partErr } = await supabaseAdmin
      .from('conversation_participants')
      .insert({ conversation_id: groupId, user_id: req.user_id, role: 'member' });

    if (partErr && partErr.code !== '23505') return { success: false, error: partErr.message };

    // Mark request as approved
    await supabaseAdmin
      .from('group_join_requests')
      .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
      .eq('id', requestId);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function rejectGroupJoinRequestDB(
  groupId: string,
  requestId: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const requester = await checkGroupParticipation(groupId, user.id);
    if (requester.role !== 'admin' && requester.role !== 'moderator') {
      return { success: false, error: 'Only admins or moderators can reject join requests.' };
    }
    const supabaseAdmin = await getAdmin();
    const { error } = await supabaseAdmin
      .from('group_join_requests')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
      .eq('id', requestId)
      .eq('group_id', groupId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Check if the current user has a pending join request for a group
export async function getMyJoinRequestStatusDB(
  groupId: string
): Promise<ActionResult<{ status: string | null }>> {
  try {
    const user = await getAuthUser();
    const supabaseAdmin = await getAdmin();
    const { data } = await supabaseAdmin
      .from('group_join_requests')
      .select('status')
      .match({ group_id: groupId, user_id: user.id })
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return { success: true, data: { status: data?.status ?? null } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function registerCallActivityDB(
  recipientId: string
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const userId = user.id;
    if (await isUserRestricted(userId, 'calls')) {
      return { success: false, error: 'You are restricted from placing calls due to spamming.' };
    }
    const spamResult = await recordActivityAndCheckSpam(userId, 'start_call', undefined, recipientId);
    if (spamResult.blocked) {
      if (spamResult.warning) return { success: false, error: `Warning: ${spamResult.warning}` };
      return { success: false, error: 'You are restricted from placing calls due to spamming.' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function logCallDB(
  recipientId: string,
  callType: 'audio' | 'video',
  durationSec: number | null,
  wasConnected: boolean
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const senderId = user.id;
    const supabaseAdmin = await getAdmin();

    const chatId = [senderId, recipientId].sort().join('_');
    
    let content = '';
    if (!wasConnected) {
      content = `Missed ${callType} call`;
    } else {
      const minutes = Math.floor((durationSec || 0) / 60);
      const seconds = (durationSec || 0) % 60;
      const durationStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
      content = `${callType === 'video' ? 'Video' : 'Voice'} call · ${durationStr}`;
    }

    const { data: msgData, error: msgErr } = await supabaseAdmin
      .from('messages')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        chat_id: chatId,
        content: content,
        type: 'call_log',
        status: 'sent',
      })
      .select()
      .single();

    if (msgErr) {
      console.error('[logCallDB] insert message error:', msgErr);
      return { success: false, error: msgErr.message };
    }

    // Insert notification
    await supabaseAdmin.from('notifications').insert({
      user_id: recipientId,
      actor_id: senderId,
      type: 'dm',
      entity_id: msgData.id,
      entity_type: 'message',
      body: content,
      is_read: false,
    });

    return { success: true };
  } catch (err: any) {
    console.error('[logCallDB] fatal:', err);
    return { success: false, error: err.message };
  }
}

export async function checkBlockStatusDB(
  targetId: string
): Promise<ActionResult<{ isBlockedByMe: boolean; hasBlockedMe: boolean; isLastSeenVisible?: boolean }>> {
  try {
    const user = await getAuthUser();
    const myId = user.id;
    const supabaseAdmin = await getAdmin();
    
    const [blocksRes, partnerMeta, myProfile] = await Promise.all([
      supabaseAdmin
        .from('blocks')
        .select('blocker_id')
        .or(`and(blocker_id.eq.${targetId},blocked_id.eq.${myId}),and(blocker_id.eq.${myId},blocked_id.eq.${targetId})`),
      getCachedUserMetadata(supabaseAdmin, targetId),
      supabaseAdmin
        .from('users')
        .select('username')
        .eq('id', myId)
        .maybeSingle()
    ]);

    if (blocksRes.error) return { success: false, error: blocksRes.error.message };

    const isBlockedByMe = (blocksRes.data || []).some((b: any) => b.blocker_id === myId);
    const hasBlockedMe = (blocksRes.data || []).some((b: any) => b.blocker_id === targetId);
    const lastSeenSetting = partnerMeta.last_seen || 'everyone';
    const whitelist = partnerMeta.last_seen_whitelist || [];
    const myUsername = myProfile.data?.username || '';

    let isLastSeenVisible = true;
    if (lastSeenSetting === 'none') {
      isLastSeenVisible = false;
    } else if (lastSeenSetting === 'specific') {
      isLastSeenVisible = whitelist.map((u: string) => u.toLowerCase()).includes(myUsername.toLowerCase());
    }

    return {
      success: true,
      data: {
        isBlockedByMe,
        hasBlockedMe,
        isLastSeenVisible
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteGhostMediaDB(urls: string[]): Promise<ActionResult> {
  try {
    const supabaseAdmin = await getAdmin();
    if (urls && urls.length > 0) {
      try {
        const { deleteMultipleMediaFiles } = await import('@/lib/storage');
        await deleteMultipleMediaFiles(urls);
      } catch (err: any) {
        console.warn('[deleteGhostMediaDB] Failed to remove files from storage:', err.message);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('[deleteGhostMediaDB] fatal:', err);
    return { success: false, error: err.message };
  }
}



