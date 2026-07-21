import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';

const COOKIE_NAME = 'vrl_sat';
const ALLOWED_ORIGINS = ['https://verlyn.in', 'https://kensano.in', 'http://localhost:3000', 'http://localhost:3001'];
const UA_BLOCKLIST = ['curl/', 'wget', 'python-requests', 'go-http-client', 'axios/', 'node-fetch', 'headlesschrome'];

// ── In-memory burst limiter ──────────────────────────────────────────────────
const burstMap = new Map<string, number[]>();
function checkBurst(ip: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const hits = (burstMap.get(ip) ?? []).filter(t => now - t < windowMs);
  hits.push(now);
  burstMap.set(ip, hits);
  return hits.length > limit;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
function hashIP(ip: string): string {
  return createHash('sha256').update(ip + (process.env.IP_SALT || 'verlyn-shadow')).digest('hex');
}
function hashToken(raw: string): string {
  return createHash('sha256').update(raw + (process.env.SHADOW_TOKEN_SALT ?? 'vrl-shadow-salt-2025')).digest('hex');
}
function hashUA(ua: string): string {
  return createHash('sha256').update(ua).digest('hex').substring(0, 16);
}
function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || '127.0.0.1';
}
function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

// Core auth: cookie check, then IP fallback for pre-cookie legacy users
async function verifyRegistration(req: NextRequest, supabase: ReturnType<typeof getSupabase>): Promise<{ ok: boolean; reason?: string }> {
  const rawToken = req.cookies.get(COOKIE_NAME)?.value;
  if (rawToken && rawToken.length >= 64) {
    const tokenHash = hashToken(rawToken);
    const { data } = await supabase.from('shadow_access_tokens').select('id, expires_at, revoked').eq('token_hash', tokenHash).single();
    if (data && !data.revoked && new Date(data.expires_at).getTime() > Date.now()) return { ok: true };
  }
  // Fallback: IP lookup in preregistrations for legacy users (registered before cookie system)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? '127.0.0.1';
  const ipH = createHash('sha256').update(ip + (process.env.IP_HASH_SALT ?? 'verlyn-salt')).digest('hex');
  const { count } = await supabase.from('preregistrations').select('*', { count: 'exact', head: true }).eq('ip_hash', ipH);
  if ((count ?? 0) > 0) return { ok: true };
  return { ok: false, reason: 'NOT_REGISTERED' };
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const ua = req.headers.get('user-agent') ?? '';
  const isDev = process.env.NODE_ENV === 'development';

  // ── 1. Bot/script block ─────────────────────────────────────────────────────
  if (!ua || UA_BLOCKLIST.some(b => ua.toLowerCase().includes(b))) {
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }

  // ── 2. Origin enforcement ────────────────────────────────────────────────────
  const origin = req.headers.get('origin') ?? '';
  if (!isDev && !ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
    return NextResponse.json({ error: 'Origin blocked.' }, { status: 403 });
  }

  // ── 3. Burst rate limit ──────────────────────────────────────────────────────
  if (checkBurst(ip, 8, 60_000)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  // ── 4. Payload size guard ────────────────────────────────────────────────────
  const cl = req.headers.get('content-length');
  if (cl && parseInt(cl, 10) > 2000) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
  }

  const supabase = getSupabase();

  // ── 5. REGISTRATION GATE: verify httpOnly cookie against DB ─────────────────
  const auth = await verifyRegistration(req, supabase);
  if (!auth.ok) {
    return NextResponse.json({
      error: 'REGISTRATION_REQUIRED',
      message: 'You must be a registered Verlyn user to create a Shadow Session. Pre-register at verlyn.in.',
      reason: auth.reason,
    }, { status: 401 });
  }

  // ── 6. Parse body ────────────────────────────────────────────────────────────
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (!body.agreed) {
    return NextResponse.json({ error: 'TERMS_NOT_ACCEPTED', message: 'You must accept the Terms & Conditions.' }, { status: 400 });
  }

  const ipHash = hashIP(ip);
  const uaHash = hashUA(ua);

  // ── 7. Rate limiting: 3 creates per 7 days (per IP hash) ─────────────────────
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: weekCount } = await supabase
    .from('shadow_cooldowns')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', ipHash).eq('action', 'create').gte('created_at', sevenDaysAgo);

  if ((weekCount ?? 0) >= 3) {
    return NextResponse.json({ error: 'WEEKLY_LIMIT', message: 'Weekly limit: 3 sessions per 7 days. Resets on your oldest session\'s 7-day mark.' }, { status: 429 });
  }

  // ── 8. Monthly cap: 10 per 30 days ───────────────────────────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: monthlyCount } = await supabase
    .from('shadow_cooldowns')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', ipHash).eq('action', 'create').gte('created_at', thirtyDaysAgo);

  if ((monthlyCount ?? 0) >= 10) {
    return NextResponse.json({ error: 'MONTHLY_LIMIT', message: 'Monthly cap reached (10 sessions / 30 days).' }, { status: 429 });
  }

  // ── 9. Generate unique code ───────────────────────────────────────────────────
  let code = '';
  let session = null;
  let attempts = 0;

  while (attempts < 10) {
    code = generateSessionCode();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    const version = body.agreementVersion || 'v1.2';

    const { data, error: insertError } = await supabase
      .from('shadow_sessions')
      .insert({ 
        code, 
        creator_ip_hash: ipHash, 
        expires_at: expiresAt, 
        status: 'waiting', 
        participant_count: 1, 
        agreement_at: now, 
        agreement_version: version 
      })
      .select()
      .single();

    if (!insertError && data) {
      session = data;
      break;
    }

    // If it's a uniqueness violation, try again
    if (insertError?.code === '23505') {
      attempts++;
      continue;
    }

    // Other error
    console.error('Session insert error:', insertError);
    return NextResponse.json({ error: 'Failed to initialize vault.' }, { status: 500 });
  }

  if (!session) {
    return NextResponse.json({ error: 'Entropy exhaustion. Try again later.' }, { status: 500 });
  }

  const expiresAt = session.expires_at;
  const now = session.agreement_at;
  const version = session.agreement_version;

  // ── 11. Store agreement + cooldown + audit ────────────────────────────────────
  await Promise.all([
    supabase.from('shadow_agreements').insert({ ip_hash: ipHash, session_code: code, agreement_version: version, agreed_at: now, user_agent_hash: uaHash }),
    supabase.from('shadow_cooldowns').insert({ ip_hash: ipHash, action: 'create', session_code: code }),
    supabase.from('audit_logs').insert({ category: 'SHADOW_SESSION', action: 'SESSION_CREATED', actor: ipHash.substring(0, 8), metadata: { code, expires_at: expiresAt, version }, severity: 'info' }),
  ]);

  const res = NextResponse.json({ success: true, code, sessionId: session.id, expiresAt, role: 'creator', inviteUrl: `/shadowsession/${code}` });
  
  // ── 12. Set secure context cookie ───────────────────────────────────────────
  const { setShadowCookie } = await import('@/lib/coming-soon/shadowSecurity');
  setShadowCookie(res, code, session.id, 'creator');

  return res;
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}
