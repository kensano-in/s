import '@/lib/sanitize-env';
/**
 * POST /api/invite/send-otp
 *
 * Generates a secure 6-digit OTP, stores it hashed in DB, and delivers it
 * to the invitation's bound email address.
 *
 * Requires: valid vrl_acc_sess cookie at stage 'email_verified'.
 *
 * Security gates:
 *   1. CSRF header
 *   2. JWT verification + jti DB check
 *   3. Stage guard: must be 'email_verified'
 *   4. Rate limit: 3 OTP sends / hour / invitation
 *   5. Invalidate any prior unused OTPs for this invitation
 *   6. Generate OTP via crypto.randomInt, hash with bcrypt (12 rounds)
 *   7. Send via Resend to invitation's email (fetched from DB, not from client)
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/coming-soon/supabase';
import { audit } from '@/lib/coming-soon/audit';
import { rateLimit } from '@/lib/coming-soon/rateLimit';
import {
  verifyInviteJWT,
  extractInviteCookie,
  generateOtp,
  hashOtp,
  hashIp,
} from '@/lib/coming-soon/inviteSession';

// 3 OTP sends per hour per invitation
function otpSendLimiter(invId: string) {
  return rateLimit(`invite_otp_send:${invId}`, {
    limit:    3,
    windowMs: 60 * 60 * 1000,
    blockMs:  60 * 60 * 1000,
  });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          ?? req.headers.get('x-real-ip')
          ?? 'unknown';

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

    // ── 5. Rate limit by invitation ID ──────────────────────────────────────
    const rl = otpSendLimiter(payload.inv_id);
    if (!rl.allowed) {
      await audit({
        category: 'security', action: 'invite.otp.send_rate_limited',
        actor: hashIp(ip), target: payload.inv_id,
        severity: 'warn', success: false,
      });
      return NextResponse.json(
        { error: 'Too many verification code requests. Please wait before requesting another.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 3600) } },
      );
    }

    // ── 6. Fetch invitation email from DB (never from client) ────────────────
    const { data: invitation, error: invErr } = await supabase
      .from('invitations')
      .select('email, status')
      .eq('id', payload.inv_id)
      .single();

    if (invErr || !invitation) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    }

    if (invitation.status !== 'active') {
      return NextResponse.json({ error: 'Invitation is no longer active.' }, { status: 400 });
    }

    // ── 7. Invalidate prior OTPs for this invitation ──────────────────────────
    await supabase
      .from('invitation_otps')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('invitation_id', payload.inv_id)
      .eq('used', false);

    // ── 8. Generate + hash OTP ───────────────────────────────────────────────
    const otp      = generateOtp();
    const otpHash  = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    const { error: otpInsertErr } = await supabase.from('invitation_otps').insert({
      invitation_id: payload.inv_id,
      otp_hash:      otpHash,
      expires_at:    expiresAt,
      ip_hash:       hashIp(ip),
    });

    if (otpInsertErr) {
      console.error('[invite/send-otp] OTP insert failed:', otpInsertErr);
      return NextResponse.json({ error: 'Internal error. Please try again.' }, { status: 500 });
    }

    // ── 9. Send OTP via Resend ───────────────────────────────────────────────
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error: sendErr } = await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL || 'Verlyn <noreply@verlyn.in>',
      to:      [invitation.email],
      subject: 'Your Verlyn Advance Access Verification Code',
      html:    buildOtpEmail(otp),
    });

    if (sendErr) {
      console.error('[invite/send-otp] Resend error:', sendErr);
      // Don't reveal email delivery failure details
      return NextResponse.json({ error: 'Failed to send verification code. Please try again.' }, { status: 500 });
    }

    await audit({
      category: 'auth', action: 'invite.otp.sent',
      actor: hashIp(ip), target: payload.inv_id,
      severity: 'info', success: true,
    });

    // Respond success — never include OTP or email in response
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('[invite/send-otp]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function buildOtpEmail(otp: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verlyn Verification Code</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap');
  </style>
</head>
<body style="margin:0;padding:0;background-color:#030303;font-family:'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#030303;padding:64px 0;">
    <tr>
      <td align="center">
        <!-- Outer Shell -->
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#09090b;border:1px solid rgba(255,255,255,0.06);border-radius:24px;overflow:hidden;max-width:480px;width:100%;box-shadow:0 20px 40px rgba(0,0,0,0.8);position:relative;">
          
          <!-- Top Glowing Accent Line -->
          <tr>
            <td height="4" style="background:linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);"></td>
          </tr>

          <!-- Content Wrapper -->
          <tr>
            <td style="padding:48px 40px 40px;">
              
              <!-- Brand Logo / Identity -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <div style="background:linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.15) 100%);width:48px;height:48px;border-radius:14px;border:1px solid rgba(99,102,241,0.25);display:inline-block;line-height:46px;text-align:center;">
                      <span style="font-family:'Space Grotesk', -apple-system, sans-serif;font-weight:700;font-size:24px;color:#ffffff;letter-spacing:-1px;">V</span>
                    </div>
                    <p style="margin:16px 0 0;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(255,255,255,0.4);font-weight:700;">
                      Verlyn Secure Gateway
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Main Heading -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;line-height:1.2;">
                      Verification Code
                    </h1>
                    <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.5);line-height:1.5;">
                      Enter this single-use code to authenticate your enlistment session.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- OTP Code Display Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center" style="background:rgba(99,102,241,0.02);border:1px solid rgba(99,102,241,0.12);border-radius:20px;padding:36px 24px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.03);">
                    <!-- OTP Text -->
                    <p style="margin:0;font-family:'Space Grotesk', 'Courier New', monospace;font-size:52px;font-weight:700;letter-spacing:0.25em;color:#ffffff;text-indent:0.25em;display:inline-block;text-shadow:0 0 20px rgba(99,102,241,0.35);">
                      ${otp}
                    </p>
                    <!-- Valid Period -->
                    <p style="margin:16px 0 0;font-size:12px;color:rgba(255,255,255,0.35);font-weight:500;">
                      This code is valid for <span style="color:#a855f7;font-weight:600;">10 minutes</span>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Security Notice Banner -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
                <tr>
                  <td style="background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.15);border-radius:12px;padding:16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="top" style="padding-right:12px;font-size:14px;line-height:1;color:#ef4444;">⚠</td>
                        <td style="font-size:12px;color:rgba(255,255,255,0.5);line-height:1.6;font-weight:500;">
                          <strong style="color:#ef4444;font-weight:600;">Security Notice:</strong>
                          Verlyn staff will never ask for this code. If you did not request this verification, please ignore this email.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Divider line -->
              <hr style="border:0;border-top:1px solid rgba(255,255,255,0.06);margin:0 0 28px 0;" />

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="margin:0 0 6px 0;font-size:11px;color:rgba(255,255,255,0.3);line-height:1.6;font-weight:500;">
                      Sent to you as part of the Verlyn Advance Access program.
                    </p>
                    <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.18);line-height:1.6;">
                      © 2026 Verlyn · Secure Digital Infrastructure
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
