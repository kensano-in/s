import '@/lib/sanitize-env';
/**
 * POST /api/invite/verify-email
 *
 * Stage 2 — Confirms the email address bound to the invitation.
 *
 * Requires: valid vrl_acc_sess cookie at stage 'code_verified'.
 *
 * Security gates:
 *   1. CSRF header check
 *   2. Cookie extraction + JWT verification
 *   3. jti replay check against DB
 *   4. Stage must be exactly 'code_verified'
 *   5. Rate limit: 5 attempts / 10 min / IP
 *   6. Email format validation (server-side)
 *   7. SHA-256 hash comparison against stored email_hash
 *   8. On success: rotate session (new jti), advance to 'email_verified'
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/coming-soon/supabase';
import { audit } from '@/lib/coming-soon/audit';
import { rateLimit } from '@/lib/coming-soon/rateLimit';
import {
  verifyInviteJWT,
  extractInviteCookie,
  hashEmail,
  hashIp,
  hashUa,
  generateJti,
  signInviteJWTWithJti,
  buildCookieHeader,
} from '@/lib/coming-soon/inviteSession';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function emailVerifyLimiter(ip: string) {
  return rateLimit(`invite_email:${ip}`, {
    limit:    5,
    windowMs: 10 * 60 * 1000,
    blockMs:  30 * 60 * 1000,
  });
}

async function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          ?? req.headers.get('x-real-ip')
          ?? 'unknown';
  const ua = req.headers.get('user-agent') ?? 'unknown';

  try {
    // ── 1. CSRF guard ────────────────────────────────────────────────────────
    if (req.headers.get('x-verlyn-request') !== '1') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── 2. Extract + verify JWT ──────────────────────────────────────────────
    const cookieHeader = req.headers.get('cookie');
    const token        = extractInviteCookie(cookieHeader);

    if (!token) {
      return NextResponse.json({ error: 'Session not found. Please start from the beginning.' }, { status: 401 });
    }

    let payload;
    try {
      payload = verifyInviteJWT(token);
    } catch {
      return NextResponse.json({ error: 'Session invalid or expired. Please start again.' }, { status: 401 });
    }

    // ── 3. Stage guard ───────────────────────────────────────────────────────
    if (payload.stage !== 'agreements_accepted') {
      return NextResponse.json({ error: 'Invalid session stage.' }, { status: 400 });
    }

    // ── 4. jti replay check ──────────────────────────────────────────────────
    const supabase = createAdminClient();
    const { data: session, error: sessErr } = await supabase
      .from('invitation_sessions')
      .select('id, expires_at')
      .eq('jti', payload.jti)
      .eq('invitation_id', payload.inv_id)
      .eq('stage', 'agreements_accepted')
      .single();

    if (sessErr || !session) {
      await audit({
        category: 'security', action: 'invite.email.replay_attempt',
        actor: hashIp(ip), target: payload.inv_id,
        severity: 'critical', success: false,
      });
      return NextResponse.json({ error: 'Session not found. Please start again.' }, { status: 401 });
    }

    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired. Please start again.' }, { status: 401 });
    }

    // ── 5. Rate limit ────────────────────────────────────────────────────────
    const rl = emailVerifyLimiter(ip);
    if (!rl.allowed) {
      await audit({
        category: 'security', action: 'invite.email.rate_limited',
        actor: hashIp(ip), severity: 'warn', success: false,
      });
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } },
      );
    }

    // ── 6. Parse + validate input ────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body || typeof body.email !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const email = body.email.trim();
    if (!EMAIL_REGEX.test(email) || email.length > 320) {
      return emailMismatchError();
    }

    // ── 7. Email hash comparison ─────────────────────────────────────────────
    const submittedHash = hashEmail(email);
    const matches       = submittedHash === payload.email_hash;

    if (!matches) {
      await audit({
        category: 'auth', action: 'invite.email.mismatch',
        actor: hashIp(ip), target: payload.inv_id,
        severity: 'warn', success: false,
      });
      await delay(120 + Math.random() * 100);
      return emailMismatchError();
    }

    // ── 8. Rotate session → email_verified ──────────────────────────────────
    const newJti      = generateJti();
    const newExpiry   = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const ipHash      = hashIp(ip);
    const uaHash      = hashUa(ua);

    // Invalidate old session row; insert new one
    await supabase.from('invitation_sessions').delete().eq('id', session.id);
    await supabase.from('invitation_sessions').insert({
      invitation_id: payload.inv_id,
      stage:         'email_verified',
      jti:           newJti,
      ip_hash:       ipHash,
      ua_hash:       uaHash,
      expires_at:    newExpiry,
      advanced_at:   new Date().toISOString(),
    });

    const newToken = signInviteJWTWithJti({
      inv_id:     payload.inv_id,
      stage:      'email_verified',
      email_hash: payload.email_hash,
      jti:        newJti,
    });

    await audit({
      category: 'auth', action: 'invite.email.verified',
      actor: hashIp(ip), target: payload.inv_id,
      severity: 'info', success: true,
    });

    const res = NextResponse.json({ success: true });
    res.headers.set('Set-Cookie', buildCookieHeader(newToken));
    return res;

  } catch (err) {
    console.error('[invite/verify-email]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function emailMismatchError() {
  return NextResponse.json(
    { error: 'This invitation is not assigned to the email address you entered.' },
    { status: 400 },
  );
}
