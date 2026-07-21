import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getShadowContext } from '@/lib/coming-soon/shadowSecurity';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/shadowsession/message — Send encrypted message
export async function POST(req: NextRequest) {
  try {
    const { code, ciphertext, iv } = await req.json();

    if (!code || !ciphertext || !iv) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const ctx = getShadowContext(req, code);
    if (!ctx) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const { sid: sessionId, role: senderRole } = ctx;

    const supabase = getSupabase();

    // Validate session is still active
    const { data: session } = await supabase
      .from('shadow_sessions')
      .select('status,expires_at')
      .eq('id', sessionId)
      .single();

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Session is not active', code: session.status }, { status: 409 });
    }
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 410 });
    }

    const { data: message, error } = await supabase
      .from('shadow_messages')
      .insert({ session_id: sessionId, sender_role: senderRole, ciphertext, iv })
      .select('id,created_at')
      .single();

    if (error) {
      console.error('Message insert error:', error);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: message.id, createdAt: message.created_at });

  } catch (err) {
    console.error('Message send error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/shadowsession/message?code=...&after=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const after = searchParams.get('after');

    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

    const ctx = getShadowContext(req, code);
    if (!ctx) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const { sid: sessionId } = ctx;

    const supabase = getSupabase();

    // Validate session
    const { data: session } = await supabase
      .from('shadow_sessions')
      .select('status,expires_at')
      .eq('id', sessionId)
      .single();

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    let query = supabase
      .from('shadow_messages')
      .select('id,sender_role,ciphertext,iv,created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (after) {
      query = query.gt('created_at', after);
    }

    const { data: messages, error } = await query;

    if (error) return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });

    return NextResponse.json({ messages: messages || [] });

  } catch (err) {
    console.error('Message fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
