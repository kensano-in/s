import '@/lib/sanitize-env';
/**
 * POST /api/messages/send
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redis, CacheKeys } from '@/lib/redis';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isUserRestricted } from '@/lib/spamGuard';
import { recordActivityAndCheckSpam } from '@/lib/moderationEngine';

export const runtime = 'edge';

function getAdminClient() {
  return createAdminClient() as any;
}

interface SendMessageBody {
  senderId: string;
  recipientId?: string;
  conversationId?: string;
  content: string;
  type?: 'text' | 'image' | 'video' | 'file' | 'voice' | 'sticker';
  mediaUrl?: string;
  fileName?: string;
  mimeType?: string;
  replyToId?: string;
  scheduledAt?: string;
  clientTempId?: string;
  viewOnce?: boolean;
}

export async function POST(req: NextRequest) {
  // ── 1. Authenticate ────────────────────────────────────────────────────────
  const supabaseServer = await createServerClient();
  const { data: { user }, error: authErr } = await supabaseServer.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const senderId = user.id;

  // Check restrictions
  if (await isUserRestricted(senderId, 'messages')) {
    return NextResponse.json(
      { success: false, error: 'You are restricted from sending messages due to spamming.' },
      { status: 403 }
    );
  }

  // ── 2. Parse + validate ────────────────────────────────────────────────────
  let body: SendMessageBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    recipientId,
    conversationId,
    content,
    type = 'text',
    mediaUrl,
    fileName,
    mimeType,
    replyToId,
    scheduledAt,
    clientTempId,
    viewOnce = false,
  } = body;

  const isValidUUID = (uuid: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

  const cleanConversationId = conversationId && isValidUUID(conversationId) ? conversationId : undefined;
  const cleanRecipientId = recipientId && isValidUUID(recipientId) ? recipientId : undefined;

  let resolvedReplyToId = replyToId;
  if (resolvedReplyToId) {
    if (!isValidUUID(resolvedReplyToId)) {
      const admin = getAdminClient();
      const { data: matchedMsg } = await admin
        .from('messages')
        .select('id')
        .eq('client_temp_id', resolvedReplyToId)
        .maybeSingle();
      resolvedReplyToId = matchedMsg?.id || undefined;
    }
  }

  if (!content?.trim()) {
    return NextResponse.json(
      { success: false, error: 'content is required' },
      { status: 400 }
    );
  }

  if (!cleanRecipientId && !cleanConversationId) {
    return NextResponse.json(
      { success: false, error: 'recipientId or conversationId is required' },
      { status: 400 }
    );
  }

  // Check spam score
  const spamResult = await recordActivityAndCheckSpam(
    senderId,
    'send_message',
    content,
    cleanRecipientId || cleanConversationId
  );
  if (spamResult.blocked) {
    return NextResponse.json(
      { success: false, error: spamResult.warning || 'You are restricted from sending messages due to spamming.' },
      { status: 429 }
    );
  }

  // Verify group participation if conversationId is provided
  if (cleanConversationId) {
    const admin = getAdminClient();
    const { data: participant, error: partErr } = await admin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('conversation_id', cleanConversationId)
      .eq('user_id', senderId)
      .maybeSingle();

    if (partErr || !participant) {
      return NextResponse.json(
        { success: false, error: 'Not a participant of this conversation' },
        { status: 403 }
      );
    }
  }

  // ── 2. Build insert payload ────────────────────────────────────────────────
  const payload: any = {
    sender_id: senderId,
    content: type === 'text' ? content : `[${type.toUpperCase()}] ${mediaUrl ?? content}`,
    type,
    media_url:    mediaUrl    ?? null,
    file_name:    fileName    ?? null,
    mime_type:    mimeType    ?? null,
    reply_to_id:  resolvedReplyToId ?? null,
    status:       'sent',
    client_temp_id: clientTempId ?? null,
    view_once:    viewOnce,
  };

  if (cleanConversationId) {
    payload.conversation_id = cleanConversationId;
    payload.recipient_id    = senderId;
    payload.chat_id         = cleanConversationId;
  } else {
    payload.recipient_id = cleanRecipientId;
    const sorted = [senderId, cleanRecipientId!].sort();
    payload.chat_id = `${sorted[0]}_${sorted[1]}`;
  }

  if (scheduledAt) {
    payload.scheduled_at = new Date(scheduledAt).toISOString();
    payload.is_released  = false;
  }

  // ── 3. Insert message ──────────────────────────────────────────────────────
  const supabase = getAdminClient();
  const { data, error } = (await supabase
    .from('messages')
    .insert(payload)
    .select('id, conversation_id, sender_id, recipient_id, chat_id, content, type, media_url, status, sent_at, created_at, client_temp_id')
    .single()) as any;

  if (error) {
    console.error('[POST /messages/send] insert error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 422 });
  }

  // ── 4. Post-response async work (non-blocking) ────────────────────────────
  const threadKey = conversationId
    ? CacheKeys.chatThread(conversationId)
    : CacheKeys.chatThread(payload.chat_id as string);

  const afterResponse = async () => {
    await redis.del(threadKey).catch(() => {});

    if (!scheduledAt && !conversationId && recipientId) {
      try {
        await supabase.from('notifications').insert({
          user_id:     recipientId,
          actor_id:    senderId,
          type:        'dm',
          entity_id:   data.id,
          entity_type: 'message',
          body:        type === 'text' ? content.slice(0, 80) : `Sent a ${type}`,
          is_read:     false,
        } as any);
      } catch (err) {
        // fail silently
      }
    }
  };

  afterResponse();

  return NextResponse.json(
    {
      success: true,
      data: {
        ...data,
        sent_at:    data.sent_at    ?? data.created_at,
        created_at: data.created_at ?? data.sent_at,
      },
    },
    { status: 200 }
  );
}
