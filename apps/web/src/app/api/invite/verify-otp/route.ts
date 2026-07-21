import '@/lib/sanitize-env';
/**
 * POST /api/invite/verify-otp
 *
 * Stage 3 — Validates the 6-digit OTP.
 *
 * Requires: valid vrl_acc_sess cookie at stage 'email_verified'.
 *
 * Security gates:
 *   1. CSRF header
 *   2. JWT verification + jti DB check
 *   3. Stage guard: must be 'email_verified'
 *   4. Rate limit: 5 attempts / 15 min / IP → 1h block
 *   5. OTP format validation (6 digits, server-side)
 *   6. Fetch active OTP record; check expiry and attempt count
 *   7. bcrypt compare — increment attempt_count regardless of outcome
 *   8. If attempts >= 5: invalidate OTP, require resend
 *   9. On success: mark OTP used, mark invitation used, advance session to 'otp_verified'
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/coming-soon/supabase';
import { audit } from '@/lib/coming-soon/audit';
import { rateLimit } from '@/lib/coming-soon/rateLimit';
import {
  verifyInviteJWT,
  extractInviteCookie,
  verifyOtp,
  hashIp,
  hashUa,
  generateJti,
  signInviteJWTWithJti,
  buildCookieHeader,
} from '@/lib/coming-soon/inviteSession';

const OTP_REGEX      = /^\d{6}$/;
const MAX_OTP_TRIES  = 5;

function otpVerifyLimiter(ip: string) {
  return rateLimit(`invite_otp_verify:${ip}`, {
    limit:    10,
    windowMs: 15 * 60 * 1000,
    blockMs:  60 * 60 * 1000,
  });
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

    // ── 2. JWT verification ──────────────────────────────────────────────────
    const token = extractInviteCookie(req.headers.get('cookie'));
    if (!token) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 401 });
    }

    let payload;
    try {
      payload = verifyInviteJWT(token);
    } catch {
      return NextResponse.json({ error: 'Session invalid or expired.' }, { status: 401 });
    }

    // ── 3. Stage guard ───────────────────────────────────────────────────────
    if (payload.stage !== 'email_verified') {
      return NextResponse.json({ error: 'Invalid session stage.' }, { status: 400 });
    }

    // ── 4. jti DB check ──────────────────────────────────────────────────────
    const supabase = createAdminClient();
    const { data: session, error: sessErr } = await supabase
      .from('invitation_sessions')
      .select('id, expires_at')
      .eq('jti', payload.jti)
      .eq('invitation_id', payload.inv_id)
      .eq('stage', 'email_verified')
      .single();

    if (sessErr || !session || new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session not found or expired.' }, { status: 401 });
    }

    // ── 5. Rate limit ────────────────────────────────────────────────────────
    const rl = otpVerifyLimiter(ip);
    if (!rl.allowed) {
      await audit({
        category: 'security', action: 'invite.otp.rate_limited',
        actor: hashIp(ip), target: payload.inv_id,
        severity: 'warn', success: false,
      });
      return NextResponse.json(
        { error: 'Too many attempts. Please wait before trying again.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } },
      );
    }

    // ── 6. Parse + validate input ────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body || typeof body.otp !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const submittedOtp = body.otp.replace(/\s/g, '');
    if (!OTP_REGEX.test(submittedOtp)) {
      return otpError();
    }

    // ── 7. Fetch active OTP record ───────────────────────────────────────────
    const { data: otpRecord, error: otpErr } = await supabase
      .from('invitation_otps')
      .select('id, otp_hash, expires_at, attempt_count, used')
      .eq('invitation_id', payload.inv_id)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpErr || !otpRecord) {
      return NextResponse.json(
        { error: 'No active verification code found. Please request a new one.' },
        { status: 400 },
      );
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      await supabase.from('invitation_otps').update({ used: true }).eq('id', otpRecord.id);
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new one.' },
        { status: 400 },
      );
    }

    if (otpRecord.attempt_count >= MAX_OTP_TRIES) {
      // Invalidate — already at limit
      await supabase.from('invitation_otps').update({ used: true }).eq('id', otpRecord.id);
      await audit({
        category: 'security', action: 'invite.otp.max_attempts',
        actor: hashIp(ip), target: payload.inv_id,
        severity: 'critical', success: false,
      });
      return NextResponse.json(
        { error: 'Maximum attempts reached. Please request a new verification code.' },
        { status: 400 },
      );
    }

    // ── 8. bcrypt compare — increment attempt count first ────────────────────
    const newAttemptCount = otpRecord.attempt_count + 1;
    await supabase
      .from('invitation_otps')
      .update({ attempt_count: newAttemptCount })
      .eq('id', otpRecord.id);

    const isValid = await verifyOtp(submittedOtp, otpRecord.otp_hash);

    if (!isValid) {
      if (newAttemptCount >= MAX_OTP_TRIES) {
        // Invalidate after final failed attempt
        await supabase.from('invitation_otps').update({ used: true }).eq('id', otpRecord.id);
        await audit({
          category: 'security', action: 'invite.otp.exhausted',
          actor: hashIp(ip), target: payload.inv_id,
          severity: 'critical', success: false,
          metadata: { attempts: newAttemptCount },
        });
        return NextResponse.json(
          { error: 'Maximum attempts reached. Please request a new verification code.' },
          { status: 400 },
        );
      }

      await audit({
        category: 'auth', action: 'invite.otp.invalid',
        actor: hashIp(ip), target: payload.inv_id,
        severity: 'warn', success: false,
        metadata: { attempt: newAttemptCount, remaining: MAX_OTP_TRIES - newAttemptCount },
      });
      return otpError();
    }

    // ── 9. Success: mark OTP used, mark invitation used, advance session ──────
    const now = new Date().toISOString();
    const ipHash = hashIp(ip);

    // Mark OTP used
    await supabase.from('invitation_otps').update({
      used:    true,
      used_at: now,
    }).eq('id', otpRecord.id);

    // Mark invitation redeemed
    await supabase.from('invitations').update({
      status:          'used',
      redeemed_at:     now,
      redeemed_ip_hash: ipHash,
    }).eq('id', payload.inv_id);

    // Rotate session → otp_verified
    const newJti    = generateJti();
    const newExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min for next phase
    const uaHash    = hashUa(ua);

    await supabase.from('invitation_sessions').delete().eq('id', session.id);
    await supabase.from('invitation_sessions').insert({
      invitation_id: payload.inv_id,
      stage:         'otp_verified',
      jti:           newJti,
      ip_hash:       ipHash,
      ua_hash:       uaHash,
      expires_at:    newExpiry,
      advanced_at:   now,
    });

    const finalToken = signInviteJWTWithJti({
      inv_id:     payload.inv_id,
      stage:      'otp_verified',
      email_hash: payload.email_hash,
      jti:        newJti,
    });

    await audit({
      category: 'auth', action: 'invite.otp.verified',
      actor: hashIp(ip), target: payload.inv_id,
      severity: 'info', success: true,
    });

    const res = NextResponse.json({ success: true });
    res.headers.set('Set-Cookie', buildCookieHeader(finalToken));
    return res;

  } catch (err) {
    console.error('[invite/verify-otp]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function otpError() {
  return NextResponse.json(
    { error: 'Incorrect verification code. Please check and try again.' },
    { status: 400 },
  );
}
