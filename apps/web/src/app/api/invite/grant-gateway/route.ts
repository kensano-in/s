import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/coming-soon/supabase';
import { audit } from '@/lib/coming-soon/audit';
import {
  verifyInviteJWT,
  extractInviteCookie,
  hashIp,
} from '@/lib/coming-soon/inviteSession';

const encoder = new TextEncoder();
const SECRET_KEY_RAW = process.env.STEP_TOKEN_SECRET || 'fallback-secure-secret-key-199387';

async function getCryptoKey(): Promise<CryptoKey> {
  const keyBuffer = encoder.encode(SECRET_KEY_RAW);
  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function generateSignedToken(exp: number): Promise<string> {
  const payload = `verlyn-pre-access:${exp}`;
  const key = await getCryptoKey();
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${exp}.${signatureHex}`;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          ?? req.headers.get('x-real-ip')
          ?? 'unknown';

  try {
    // 1. CSRF guard
    if (req.headers.get('x-verlyn-request') !== '1') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Extract invite session cookie
    const token = extractInviteCookie(req.headers.get('cookie'));
    if (!token) {
      return NextResponse.json({ error: 'Session not found. Complete verification first.' }, { status: 401 });
    }

    let payload;
    try {
      payload = verifyInviteJWT(token);
    } catch {
      return NextResponse.json({ error: 'Session invalid or expired.' }, { status: 401 });
    }

    // 3. Stage guard: must be otp_verified
    if (payload.stage !== 'otp_verified') {
      return NextResponse.json({ error: 'Invalid session stage. Complete OTP verification first.' }, { status: 400 });
    }

    // 4. Verify in DB
    const supabase = createAdminClient();
    const { data: session, error: sessErr } = await supabase
      .from('invitation_sessions')
      .select('id, expires_at')
      .eq('jti', payload.jti)
      .eq('invitation_id', payload.inv_id)
      .eq('stage', 'otp_verified')
      .single();

    if (sessErr || !session || new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Verification session not found or expired.' }, { status: 401 });
    }

    // 5. Generate signed pre-access gateway token
    const exp = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 days
    const signedToken = await generateSignedToken(exp);

    // 6. Detect domain
    const host = req.headers.get('host') || '';
    let cookieDomain = undefined;
    if (host.includes('verlyn.in')) {
      cookieDomain = '.verlyn.in';
    } else if (host.includes('verlyn.local')) {
      cookieDomain = '.verlyn.local';
    }

    // 7. Audit log the gateway grant
    await audit({
      category: 'auth',
      action: 'gateway.granted',
      actor: hashIp(ip),
      target: payload.inv_id,
      severity: 'info',
      success: true,
    });

    // 8. Build response and set the gateway cookie
    const res = NextResponse.json({ success: true });
    
    res.cookies.set('verlyn_pre_access', signedToken, {
      path: '/',
      domain: cookieDomain,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: false, // Allow client to read/verify presence if needed, but signature remains server-validated
    });

    return res;

  } catch (err) {
    console.error('[grant-gateway]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
