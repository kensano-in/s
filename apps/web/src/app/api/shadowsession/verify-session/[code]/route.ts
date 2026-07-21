import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { getShadowContext } from '@/lib/coming-soon/shadowSecurity';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * GET /api/shadowsession/verify-session/[code]
 * Hydrates the room UI by verifying the httpOnly session cookie.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = rawCode?.toUpperCase();
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  const ctx = getShadowContext(req, code);
  if (!ctx) {
    return NextResponse.json({ error: 'NO_SESSION_COOKIE', message: 'No active session cookie found for this room.' }, { status: 401 });
  }

  const supabase = getSupabase();

  // Validate the sessionId still exists and is active in DB
  const { data: session, error } = await supabase
    .from('shadow_sessions')
    .select('id, status, expires_at')
    .eq('id', ctx.sid)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: 'SESSION_INVALID', message: 'Session no longer exists.' }, { status: 404 });
  }

  if (session.status === 'expired' || session.status === 'destroyed' || new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ 
      error: 'SESSION_EXPIRED', 
      status: session.status,
      message: 'This session has ended and been destroyed.' 
    }, { status: 410 });
  }

  return NextResponse.json({
    ok: true,
    sessionId: ctx.sid,
    role: ctx.role,
    status: session.status
  });
}
