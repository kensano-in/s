import '@/lib/sanitize-env';
/**
 * GET /api/invite/status
 *
 * Returns the current verification stage from the session cookie.
 * Used by the /verify page on mount to determine which step to render.
 *
 * Response shape: { stage: 'none' | 'code_verified' | 'agreements_accepted' | 'email_verified' | 'otp_verified' }
 *
 * Never returns sensitive data. Never trusts the client for stage determination.
 * The stage is read from the DB (via jti lookup), not from the JWT alone.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/coming-soon/supabase';
import {
  verifyInviteJWT,
  extractInviteCookie,
  clearCookieHeader,
} from '@/lib/coming-soon/inviteSession';

export async function GET(req: NextRequest) {
  try {
    const token = extractInviteCookie(req.headers.get('cookie'));
    if (!token) {
      return NextResponse.json({ stage: 'none' });
    }

    let payload;
    try {
      payload = verifyInviteJWT(token);
    } catch {
      // Expired or invalid — treat as no session and clear cookie
      const res = NextResponse.json({ stage: 'none' });
      res.headers.set('Set-Cookie', clearCookieHeader());
      return res;
    }

    // Verify jti against DB (single source of truth)
    const supabase = createAdminClient();
    let query = supabase
      .from('invitation_sessions')
      .select('stage, expires_at')
      .eq('jti', payload.jti);

    if (payload.inv_id) {
      query = query.eq('invitation_id', payload.inv_id);
    } else {
      query = query.is('invitation_id', null);
    }

    const { data: session } = await query.single();

    if (!session || new Date(session.expires_at) < new Date()) {
      const res = NextResponse.json({ stage: 'none' });
      res.headers.set('Set-Cookie', clearCookieHeader());
      return res;
    }

    // Return only the stage — no other data exposed to client
    return NextResponse.json({ stage: session.stage });

  } catch (err) {
    console.error('[invite/status]', err);
    const res = NextResponse.json({ stage: 'none' });
    res.headers.set('Set-Cookie', clearCookieHeader());
    return res;
  }
}
