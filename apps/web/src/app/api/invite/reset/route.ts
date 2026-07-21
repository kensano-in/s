import '@/lib/sanitize-env';
/**
 * GET /api/invite/reset
 *
 * Clears the vrl_acc_sess cookie and redirects back to /verify.
 * Used for development testing to reset the verification stage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/coming-soon/supabase';
import {
  verifyInviteJWT,
  extractInviteCookie,
  clearCookieHeader,
} from '@/lib/coming-soon/inviteSession';

export async function GET(req: NextRequest) {
  const token = extractInviteCookie(req.headers.get('cookie'));

  if (token) {
    try {
      const payload = verifyInviteJWT(token);
      if (payload && payload.jti) {
        const supabase = createAdminClient();
        // Delete session from DB
        await supabase.from('invitation_sessions').delete().eq('jti', payload.jti);
      }
    } catch {
      // Ignore if token is already expired or malformed
    }
  }

  // Redirect to verify page
  const referer = req.headers.get('referer') ?? req.url;
  const targetUrl = new URL('/verify', referer);

  const res = NextResponse.redirect(targetUrl);
  // Expire the cookie
  res.headers.set('Set-Cookie', clearCookieHeader());
  return res;
}
