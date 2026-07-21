import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createAdminClient();
}

// GET /api/shadowsession/status/[code] — Poll session state
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const supabase = getSupabase();

    const { data: session, error } = await supabase
      .from('shadow_sessions')
      .select('id,code,status,participant_count,expires_at,created_at')
      .eq('code', code.toUpperCase())
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 });
    }

    // Auto-expire if time has passed
    if (new Date(session.expires_at) < new Date() && session.status !== 'expired' && session.status !== 'destroyed') {
      await supabase
        .from('shadow_sessions')
        .update({ status: 'expired', destroyed_at: new Date().toISOString() })
        .eq('id', session.id);
      // Cascade delete messages
      await supabase.from('shadow_messages').delete().eq('session_id', session.id);
      return NextResponse.json({ status: 'expired', code });
    }

    const now = Date.now();
    const expiresMs = new Date(session.expires_at).getTime();
    const remainingMs = Math.max(0, expiresMs - now);
    const remainingSeconds = Math.floor(remainingMs / 1000);

    // Auto-fix: if 2 participants present but status still 'waiting', activate now
    let finalStatus = session.status;
    if (session.participant_count >= 2 && session.status === 'waiting') {
      await supabase.from('shadow_sessions').update({ status: 'active' }).eq('id', session.id);
      finalStatus = 'active';
    }

    return NextResponse.json({
      status: finalStatus,
      sessionId: session.id,
      participantCount: session.participant_count,
      remainingSeconds,
      expiresAt: session.expires_at,
      code: session.code
    });

  } catch (err) {
    console.error('Status error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/shadowsession/status/[code] — Destroy session
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const supabase = getSupabase();

    const { data: session } = await supabase
      .from('shadow_sessions')
      .select('id')
      .eq('code', code.toUpperCase())
      .single();

    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Destroy all messages first
    await supabase.from('shadow_messages').delete().eq('session_id', session.id);

    // Mark session destroyed
    await supabase
      .from('shadow_sessions')
      .update({ status: 'destroyed', destroyed_at: new Date().toISOString() })
      .eq('id', session.id);

    await supabase.from('audit_logs').insert({
      category: 'SHADOW_SESSION',
      action: 'SESSION_DESTROYED',
      metadata: { code: code.toUpperCase() },
      severity: 'info'
    });

    return NextResponse.json({ success: true, message: 'Session permanently destroyed.' });

  } catch (err) {
    console.error('Destroy error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
