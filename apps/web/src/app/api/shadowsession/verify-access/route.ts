import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const COOKIE_NAME = 'vrl_sat';
const ALLOWED_ORIGINS = ['https://verlyn.in', 'https://kensano.in', 'http://localhost:3000', 'http://localhost:3001'];

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function hashToken(raw: string): string {
  return createHash('sha256')
    .update(raw + (process.env.SHADOW_TOKEN_SALT ?? 'vrl-shadow-salt-2025'))
    .digest('hex');
}

export async function GET(req: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';

  // ── Origin check (production only) ─────────────────────────────
  const origin = req.headers.get('origin') ?? req.headers.get('referer') ?? '';
  if (!isDev && !ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
    return NextResponse.json({ authorized: false, reason: 'ORIGIN_BLOCKED' }, { status: 403 });
  }

  const supabase = getSupabase();

  // ── 1. Check httpOnly cookie (primary auth) ─────────────────────
  const rawToken = req.cookies.get(COOKIE_NAME)?.value;
  if (rawToken && rawToken.length >= 64) {
    const tokenHash = hashToken(rawToken);
    const { data } = await supabase
      .from('shadow_access_tokens')
      .select('id, expires_at, revoked')
      .eq('token_hash', tokenHash)
      .single();

    if (data && !data.revoked && new Date(data.expires_at).getTime() > Date.now()) {
      return NextResponse.json({ authorized: true, method: 'cookie' });
    }
  }

  // ── 2. Fallback: check preregistrations table by IP (dev + prod) ─
  // Handles users who registered BEFORE the cookie system was deployed.
  // This is a one-way migration path — once they re-register, they get a cookie.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? '127.0.0.1';
  const ipHash = createHash('sha256')
    .update(ip + (process.env.IP_HASH_SALT ?? 'verlyn-salt'))
    .digest('hex');

  const { count } = await supabase
    .from('preregistrations')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', ipHash);

  if ((count ?? 0) > 0) {
    // Issue a fresh cookie for this legacy user so future requests use the fast path
    const { randomBytes } = await import('crypto');
    const newRawToken = randomBytes(48).toString('hex');
    const newTokenHash = hashToken(newRawToken);
    const emailHashPlaceholder = createHash('sha256').update(ip).digest('hex');
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    try {
      await supabase.from('shadow_access_tokens').insert({
        token_hash: newTokenHash,
        email_hash: emailHashPlaceholder,
        ip_hash: ipHash,
        expires_at: expires.toISOString(),
      });
    } catch { /* non-fatal */ }

    const isProd = process.env.NODE_ENV === 'production';
    const cookie = [
      `vrl_sat=${newRawToken}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Strict',
      isProd ? 'Secure' : '',
      `Max-Age=${30 * 24 * 60 * 60}`,
    ].filter(Boolean).join('; ');

    const res = NextResponse.json({ authorized: true, method: 'legacy_ip', migrated: true });
    res.headers.set('Set-Cookie', cookie);
    return res;
  }

  return NextResponse.json({ authorized: false, reason: 'NOT_REGISTERED' }, { status: 401 });
}

export function POST() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}
