import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const createAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

const MAX_CONTENT = 4000;
const PAGE_SIZE   = 50;

// ── GET: Load paginated history ───────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const caseId  = searchParams.get('case_id');
    const before  = searchParams.get('before'); // ISO timestamp cursor

    if (!caseId) {
      return NextResponse.json({ error: 'case_id required' }, { status: 400 });
    }

    const admin = createAdmin();
    let query = admin
      .from('chat_messages')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === '42P01') {
        // Table not created yet — return empty
        return NextResponse.json({ messages: [], has_more: false });
      }
      throw error;
    }

    const messages = (data ?? []).reverse();
    return NextResponse.json({
      messages,
      has_more: (data ?? []).length === PAGE_SIZE,
    });
  } catch (err: any) {
    console.error('[Chat API GET]', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ── POST: Send a message (server-side validated) ──────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { case_id, content, message_type = 'text', media_url, media_name, media_size, reply_to_id, idempotency_key } = body;

    if (!case_id || !content?.trim()) {
      return NextResponse.json({ error: 'case_id and content required' }, { status: 400 });
    }

    if (content.length > MAX_CONTENT) {
      return NextResponse.json({ error: `Message too long. Max ${MAX_CONTENT} characters.` }, { status: 400 });
    }

    const VALID_TYPES = ['text', 'image', 'video', 'audio', 'document', 'system'];
    if (!VALID_TYPES.includes(message_type)) {
      return NextResponse.json({ error: 'Invalid message_type' }, { status: 400 });
    }

    const admin = createAdmin();

    // Verify the ticket exists and is not Completed
    const { data: ticket } = await admin
      .from('support_tickets')
      .select('status')
      .eq('case_id', case_id)
      .single();

    if (ticket?.status === 'Completed') {
      return NextResponse.json({ error: 'Cannot reply to a completed ticket' }, { status: 400 });
    }

    const key = idempotency_key ?? `${case_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const { data: msg, error } = await admin
      .from('chat_messages')
      .insert({
        case_id,
        sender:          'user',
        content:         content.trim(),
        message_type,
        media_url:       media_url ?? null,
        media_name:      media_name ?? null,
        media_size:      media_size ?? null,
        reply_to_id:     reply_to_id ?? null,
        reactions:       {},
        idempotency_key: key,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Idempotency key conflict — return 200 (already delivered)
        const { data: existing } = await admin
          .from('chat_messages')
          .select('*')
          .eq('idempotency_key', key)
          .single();
        return NextResponse.json({ message: existing, duplicate: true });
      }
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Chat system not set up. Run the SQL migration first.' }, { status: 503 });
      }
      throw error;
    }

    // Update ticket status to In progress
    await admin
      .from('support_tickets')
      .update({ status: 'In progress' })
      .eq('case_id', case_id)
      .neq('status', 'Completed');

    return NextResponse.json({ message: msg });
  } catch (err: any) {
    console.error('[Chat API POST]', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ── PATCH: React to a message ─────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const { message_id, emoji, sender } = await req.json();

    if (!message_id || !emoji || !sender) {
      return NextResponse.json({ error: 'message_id, emoji, sender required' }, { status: 400 });
    }

    const admin = createAdmin();

    // Fetch current reactions
    const { data: msg, error: fetchErr } = await admin
      .from('chat_messages')
      .select('reactions')
      .eq('id', message_id)
      .single();

    if (fetchErr || !msg) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const reactions = (msg.reactions ?? {}) as Record<string, string[]>;
    const reactors  = reactions[emoji] ?? [];
    
    // Toggle reaction
    const newReactors = reactors.includes(sender)
      ? reactors.filter((s) => s !== sender)
      : [...reactors, sender];

    if (newReactors.length === 0) {
      delete reactions[emoji];
    } else {
      reactions[emoji] = newReactors;
    }

    const { error: updateErr } = await admin
      .from('chat_messages')
      .update({ reactions })
      .eq('id', message_id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ reactions });
  } catch (err: any) {
    console.error('[Chat API PATCH]', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
