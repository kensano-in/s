import { NextRequest, NextResponse } from 'next/server';

/**
 * VERLYN — Shadow Session Security Utilities
 * Handles httpOnly session context for ephemeral chat rooms.
 */

export const SHADOW_COOKIE_PREFIX = 'vrl_shd_';

/**
 * Sets a secure, httpOnly cookie for a specific shadow session.
 * @param res NextResponse to attach the cookie to
 * @param code The unique session code (e.g., NZJBQX9)
 * @param sessionId The UUID of the session in Supabase
 * @param role The user's role ('creator' or 'joiner')
 */
export function setShadowCookie(res: NextResponse, code: string, sessionId: string, role: string) {
  const cookieName = `${SHADOW_COOKIE_PREFIX}${code.toUpperCase()}`;
  const payload = JSON.stringify({ sid: sessionId, role });

  res.cookies.set(cookieName, payload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60, // 1 hour (matches session duration)
    path: '/',
  });
}

/**
 * Retrieves the session context from httpOnly cookies.
 * @param req NextRequest to extract from
 * @param code The unique session code
 */
export function getShadowContext(req: NextRequest, code: string): { sid: string; role: string } | null {
  const cookieName = `${SHADOW_COOKIE_PREFIX}${code.toUpperCase()}`;
  const cookie = req.cookies.get(cookieName);

  if (!cookie?.value) return null;

  try {
    const data = JSON.parse(cookie.value);
    if (!data.sid || !data.role) return null;
    return data as { sid: string; role: string };
  } catch (e) {
    console.error('Shadow cookie parse error:', e);
    return null;
  }
}

/**
 * Clears the shadow session cookie.
 */
export function clearShadowCookie(res: NextResponse, code: string) {
  res.cookies.delete(`${SHADOW_COOKIE_PREFIX}${code.toUpperCase()}`);
}
