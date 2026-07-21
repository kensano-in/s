import '@/lib/sanitize-env';
/**
 * POST /api/invite/verify-code
 *
 * Stage 1 — Validates a 12-character invitation code.
 * On success: issues a signed session JWT in an HttpOnly cookie (stage: code_verified).
 * On failure: generic error — never reveals which check failed.
 *
 * Security gates (in order):
 *   1. CSRF custom header check
 *   2. Rate limiting: 5 attempts / 10 min / IP → 1h block
 *   3. Strict server-side input validation
 *   4. DB lookup by code_hash (SHA-256) — constant-time
 *   5. Status, expiry, revocation checks
 *   6. Session row created in DB; jti stored before JWT issued
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/coming-soon/supabase';
import { audit } from '@/lib/coming-soon/audit';
import { rateLimit } from '@/lib/coming-soon/rateLimit';
import {
  normalizeInviteCode,
  hashInviteCode,
  hashEmail,
  hashIp,
  hashUa,
  generateJti,
  signInviteJWTWithJti,
  buildCookieHeader,
} from '@/lib/coming-soon/inviteSession';

const CODE_REGEX = /^[A-Z0-9]{12}$/;

function inviteCodeLimiter(ip: string) {
  return rateLimit(`invite_code:${ip}`, {
    limit:    5,
    windowMs: 10 * 60 * 1000,
    blockMs:  60 * 60 * 1000,
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

    // ── 2. Rate limit ────────────────────────────────────────────────────────
    const rl = inviteCodeLimiter(ip);
    if (!rl.allowed) {
      await audit({
        category: 'security', action: 'invite.code.rate_limited',
        actor: hashIp(ip), severity: 'warn', success: false,
      });
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } },
      );
    }

    // ── 3. Parse + validate input ────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body || typeof body.code !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const normalized = normalizeInviteCode(body.code);
    if (!CODE_REGEX.test(normalized)) {
      return genericError();
    }

    // ── 4. DB lookup by code hash ────────────────────────────────────────────
    const codeHash = hashInviteCode(normalized);

    const supabase = createAdminClient();

    const { data: invitation, error: dbError } = await supabase
      .from('invitations')
      .select('id, status, expires_at, email')
      .eq('code_hash', codeHash)
      .single();

    if (dbError || !invitation) {
      await audit({
        category: 'auth', action: 'invite.code.not_found',
        actor: hashIp(ip), severity: 'warn', success: false,
        metadata: { prefix: codeHash.slice(0, 8) },
      });
      await delay(150 + Math.random() * 150); // timing equalization
      return genericError();
    }

    // ── 5. Business rule checks on invitation ─────────────────────────────────
    if (invitation.status !== 'active') {
      await audit({
        category: 'auth', action: 'invite.code.invalid_status',
        actor: hashIp(ip), target: invitation.id,
        severity: 'warn', success: false,
        metadata: { status: invitation.status },
      });
      await delay(100 + Math.random() * 100);
      return genericError();
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await supabase.from('invitations').update({ status: 'expired' }).eq('id', invitation.id);
      await audit({
        category: 'auth', action: 'invite.code.expired',
        actor: hashIp(ip), target: invitation.id,
        severity: 'info', success: false,
      });
      return genericError();
    }

    // ── 6. Create DB session (store jti before issuing JWT) ──────────────────
    const ipHash   = hashIp(ip);
    const uaHash   = hashUa(ua);
    const jti      = generateJti();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const emailHash = hashEmail(invitation.email);

    const { error: sessionError } = await supabase.from('invitation_sessions').insert({
      invitation_id: invitation.id,
      stage:         'code_verified',
      jti,
      ip_hash:       ipHash,
      ua_hash:       uaHash,
      expires_at:    expiresAt,
    });

    if (sessionError) {
      console.error('[invite/verify-code] session insert failed:', sessionError);
      return NextResponse.json({ error: 'Internal error. Please try again.' }, { status: 500 });
    }

    // ── 7. Issue signed JWT ──────────────────────────────────────────────────
    const token = signInviteJWTWithJti({
      inv_id:     invitation.id,
      stage:      'code_verified',
      email_hash: emailHash,
      jti,
    });

    await audit({
      category: 'auth', action: 'invite.code.verified',
      actor: hashIp(ip), target: invitation.id,
      severity: 'info', success: true,
    });

    const res = NextResponse.json({ success: true });
    res.headers.set('Set-Cookie', buildCookieHeader(token));
    return res;

  } catch (err) {
    console.error('[invite/verify-code]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** Generic error — same message for every failure type to prevent enumeration */
function genericError() {
  return NextResponse.json(
    { error: 'Invitation could not be verified' },
    { status: 400 },
  );
}
