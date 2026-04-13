import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      senderId, recipientId, content, type, mediaUrl, fileName, mimeType, 
      replyToId, scheduledAt, conversationId, clientTempId, viewOnce 
    } = body;

    if (!senderId || (!recipientId && !conversationId) || !content) {
      return NextResponse.json({ success: false, error: 'Missing required data' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
    } else {
      payload.recipient_id = recipientId;
    }

    if (scheduledAt) {
      payload.scheduled_at = scheduledAt;
      payload.is_released = false;
    }

    // Insert directly
    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[Edge Messaging] error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const mappedData = data ? {
      ...data,
      sent_at: data.sent_at || data.created_at,
      created_at: data.created_at || data.sent_at,
    } : data;

    // Trigger Notification async (waitUntil not strictly needed for this fast operation, but good practice if available; we'll await it briefly so Edge doesn't kill it)
    if (!scheduledAt && !conversationId) {
      // Not awaiting this fully to stay fast, but Edge might kill it. 
      // Vercel Edge usually allows remaining promises to finish if they are quick.
      void (async () => {
        const { error: notifErr } = await supabaseAdmin.from('notifications').insert({
          user_id: recipientId,
          actor_id: senderId,
          type: 'dm',
          entity_id: data.id,
          entity_type: 'message',
          body: type === 'text' ? content.slice(0, 80) : `Sent a ${type}`,
          is_read: false,
        });
        if (notifErr) console.error('[Edge] Notification err:', notifErr);
      })();
    }

    return NextResponse.json({ success: true, data: mappedData });
  } catch (err: any) {
    console.error('[Edge Messaging] fatal:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
