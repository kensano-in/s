import '@/lib/sanitize-env';
/**
 * POST /api/invite/accept-agreements
 *
 * Agreement Gateway Endpoint:
 * - Validates legal acceptance of terms, privacy, security notices.
 * - Requires a session in the 'code_verified' stage.
 * - Stores immutable audit log in database table `agreement_acceptances`.
 * - Sets the updated HttpOnly cookie with `stage: 'agreements_accepted'`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/coming-soon/supabase';
import { audit } from '@/lib/coming-soon/audit';
import { rateLimit } from '@/lib/coming-soon/rateLimit';
import { moderateText } from '@/lib/coming-soon/moderation';
import {
  generateJti,
  signInviteJWTWithJti,
  buildCookieHeader,
  hashIp,
  hashUa,
  verifyInviteJWT,
  extractInviteCookie,
  LEGAL_VERSION,
  LEGAL_HASH,
} from '@/lib/coming-soon/inviteSession';
import { createHash } from 'crypto';

function ipLimiter(ip: string) {
  return rateLimit(`invite_agreements:${ip}`, {
    limit:    5,
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

    // ── 2. Rate limiting ─────────────────────────────────────────────────────
    const rl = ipLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } }
      );
    }

    // ── 3. Verify Existing Code Session ──────────────────────────────────────
    const token = extractInviteCookie(req.headers.get('cookie'));
    if (!token) {
      return NextResponse.json({ error: 'Invitation session not found.' }, { status: 403 });
    }

    let payload;
    try {
      payload = verifyInviteJWT(token);
    } catch {
      return NextResponse.json({ error: 'Session invalid or expired.' }, { status: 403 });
    }

    if (payload.stage !== 'code_verified') {
      return NextResponse.json({ error: 'Please verify your invitation code first.' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Verify session jti and invitation status
    const { data: dbSession, error: dbSessErr } = await supabase
      .from('invitation_sessions')
      .select('id, invitation_id, expires_at, invitations(email)')
      .eq('jti', payload.jti)
      .eq('stage', 'code_verified')
      .single();

    if (dbSessErr || !dbSession || new Date(dbSession.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired. Please enter code again.' }, { status: 403 });
    }

    // ── 4. Parse and validate input ──────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body || !body.accepted) {
      return NextResponse.json({ error: 'You must accept the agreements to proceed.' }, { status: 400 });
    }

    const { signatureName, language = 'en' } = body;
    if (!signatureName || typeof signatureName !== 'string' || signatureName.trim().length < 2) {
      return NextResponse.json({ error: 'A valid electronic signature name is required.' }, { status: 400 });
    }

    // ── 4b. Moderation check on signature ────────────────────────────────────
    const moderation = await moderateText(signatureName);
    if (moderation.isAbusive) {
      return NextResponse.json({ error: 'Inappropriate or abusive name signature detected.' }, { status: 400 });
    }

    // ── 5. Log Legal Acceptance ──────────────────────────────────────────────
    const ipHash = hashIp(ip);
    const uaHash = hashUa(ua);

    // Cryptographic signature hash
    const signatureSalt = process.env.INVITE_SCRYPT_SALT ?? 'vrl-signature-salt';
    const signatureHash = createHash('sha256')
      .update(signatureName.trim().toLowerCase() + signatureSalt)
      .digest('hex');

    // Create verification chain object (immutable proof)
    const verificationChain = {
      ip_hash: ipHash,
      ua_hash: uaHash,
      signature_name_hash: signatureHash,
      legal_version: LEGAL_VERSION,
      legal_hash: LEGAL_HASH,
      server_timestamp: new Date().toISOString(),
      country: req.headers.get('x-vercel-ip-country') ?? 'unknown',
      region: req.headers.get('x-vercel-ip-region') ?? 'unknown',
    };

    // Store agreement acceptance
    const email = (dbSession.invitations as any)?.email ?? '';
    const emailHash = payload.email_hash;

    const { error: acceptErr } = await supabase
      .from('agreement_acceptances')
      .insert({
        session_id:         dbSession.id,
        invitation_id:      dbSession.invitation_id,
        email:              email,
        email_hash:         emailHash,
        ip_hash:            ipHash,
        user_agent:         ua.slice(0, 512),
        country:            verificationChain.country,
        region:             verificationChain.region,
        agreement_version:  LEGAL_VERSION,
        agreement_hash:     LEGAL_HASH,
        signature_hash:     signatureHash,
        verification_chain: verificationChain,
        language_accepted:  language.slice(0, 5),
      });

    if (acceptErr) {
      console.error('[invite/accept-agreements] acceptance insertion error:', acceptErr);
      return NextResponse.json({ error: 'Failed to record legal acceptance. Please try again.' }, { status: 500 });
    }

    // ── 6. Update Session Stage and Rotate JTI ───────────────────────────────
    const newJti = generateJti();
    const sessionExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min for email step

    const { error: updateErr } = await supabase
      .from('invitation_sessions')
      .update({
        stage:      'agreements_accepted',
        jti:        newJti,
        expires_at: sessionExpiry.toISOString(),
      })
      .eq('id', dbSession.id);

    if (updateErr) {
      console.error('[invite/accept-agreements] session update error:', updateErr);
      return NextResponse.json({ error: 'Failed to update session stage. Please try again.' }, { status: 500 });
    }

    // ── 7. Issue signed JWT session cookie ──────────────────────────────────
    const tokenPayload = {
      stage:      'agreements_accepted' as const,
      jti:        newJti,
      email_hash: emailHash,
      inv_id:     dbSession.invitation_id,
    };
    const newToken = signInviteJWTWithJti(tokenPayload);

    await audit({
      category: 'auth', action: 'invite.agreements.accepted',
      actor: ipHash, target: dbSession.id,
      severity: 'info', success: true,
      metadata: { signature_hash: signatureHash, agreement_version: LEGAL_VERSION }
    });

    const res = NextResponse.json({ success: true, stage: 'agreements_accepted' });
    res.headers.set('Set-Cookie', buildCookieHeader(newToken));
    return res;

  } catch (err) {
    console.error('[invite/accept-agreements]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
