import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

// We explicitly run this route on Edge to guarantee <50ms response times globally.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { senderId, recipientId, content, type = 'text', mediaUrl, fileName, mimeType, replyToId, scheduledAt, conversationId, clientTempId, viewOnce } = body;

    if (!senderId || !content) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

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
      view_once: viewOnce || false,
    };

    if (conversationId && conversationId !== '') {
      payload.conversation_id = conversationId;
      payload.recipient_id = senderId;
      payload.chat_id = conversationId;
    } else {
      payload.recipient_id = recipientId;
      const sorted = [senderId, recipientId].sort();
      payload.chat_id = `${sorted[0]}_${sorted[1]}`;
    }

    if (scheduledAt) {
      payload.scheduled_at = new Date(scheduledAt).toISOString();
      payload.is_released = false;
    }

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert(payload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 422 });
    }

    if (!scheduledAt && !conversationId) {
      // Fire and forget notification
      supabaseAdmin.from('notifications').insert({
        user_id: recipientId,
        actor_id: senderId,
        type: 'dm',
        entity_id: data.id,
        entity_type: 'message',
        body: type === 'text' ? content.slice(0, 80) : `Sent a ${type}`,
        is_read: false,
      }).then(() => {}, () => {});
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

