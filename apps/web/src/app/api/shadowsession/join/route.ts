import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const COOKIE_NAME = 'vrl_sat';
const ALLOWED_ORIGINS = ['https://verlyn.in', 'https://kensano.in', 'http://localhost:3000', 'http://localhost:3001'];
const UA_BLOCKLIST = ['curl/', 'wget', 'python-requests', 'go-http-client', 'axios/', 'node-fetch', 'headlesschrome'];
const CODE_REGEX = /^[A-Z0-9]{5,10}$/;

// Burst limiter for join attempts
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
function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || '127.0.0.1';
}

async function verifyRegistration(req: NextRequest, supabase: ReturnType<typeof getSupabase>): Promise<boolean> {
  const rawToken = req.cookies.get(COOKIE_NAME)?.value;
  if (rawToken && rawToken.length >= 64) {
    const tokenHash = hashToken(rawToken);
    const { data } = await supabase.from('shadow_access_tokens').select('id, expires_at, revoked').eq('token_hash', tokenHash).single();
    if (data && !data.revoked && new Date(data.expires_at).getTime() > Date.now()) return true;
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? '127.0.0.1';
  const ipH = createHash('sha256').update(ip + (process.env.IP_HASH_SALT ?? 'verlyn-salt')).digest('hex');
  const { count } = await supabase.from('preregistrations').select('*', { count: 'exact', head: true }).eq('ip_hash', ipH);
  return (count ?? 0) > 0;
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const ua = req.headers.get('user-agent') ?? '';
  const isDev = process.env.NODE_ENV === 'development';

  // 1. Bot block
  if (!ua || UA_BLOCKLIST.some(b => ua.toLowerCase().includes(b))) {
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }

  // 2. Origin check
  const origin = req.headers.get('origin') ?? '';
  if (!isDev && !ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
    return NextResponse.json({ error: 'Origin blocked.' }, { status: 403 });
  }

  // 3. Burst limit (join spam)
  if (checkBurst(ip, 8, 60_000)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const supabase = getSupabase();

  // 4. REGISTRATION GATE
  const authorized = await verifyRegistration(req, supabase);
  if (!authorized) {
    return NextResponse.json({
      error: 'REGISTRATION_REQUIRED',
      message: 'You must be a registered Verlyn user to join a Shadow Session. Pre-register at verlyn.in.',
    }, { status: 401 });
  }

  // 5. Parse + validate body
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const rawCode = (typeof body.code === 'string' ? body.code : '').toUpperCase().trim();
  if (!rawCode || !CODE_REGEX.test(rawCode)) {
    return NextResponse.json({ error: 'Invalid session code format.' }, { status: 400 });
  }

  const ipHash = hashIP(ip);

  // 6. Join rate limit: max 3 joins per 7 days per IP
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: joinCount } = await supabase
    .from('shadow_cooldowns')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', ipHash).eq('action', 'join').gte('created_at', sevenDaysAgo);

  if ((joinCount ?? 0) >= 3) {
    return NextResponse.json({ error: 'JOIN_LIMIT', message: 'Join limit reached (3 per 7 days).' }, { status: 429 });
  }

  // 7. Fetch session
  const { data: session } = await supabase
    .from('shadow_sessions')
    .select('id, code, status, expires_at, participant_count')
    .eq('code', rawCode)
    .single();

  if (!session) {
    // Generic error — don't leak whether code exists
    await new Promise(r => setTimeout(r, 80 + Math.random() * 80)); // timing safety
    return NextResponse.json({ error: 'SESSION_NOT_FOUND', message: 'This session does not exist or has already expired.' }, { status: 404 });
  }

  if (session.status === 'expired' || session.status === 'destroyed') {
    return NextResponse.json({ error: 'SESSION_EXPIRED', message: 'This session has ended and been permanently destroyed.' }, { status: 410 });
  }
  if (new Date(session.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'SESSION_EXPIRED', message: 'This session has expired.' }, { status: 410 });
  }
  if (session.participant_count >= 2) {
    return NextResponse.json({ error: 'SESSION_FULL', message: 'This session is full. Shadow Sessions allow exactly 2 participants.' }, { status: 409 });
  }

  // 8. Join: update participant count (Atomic check)
  const { error: updateError } = await supabase
    .from('shadow_sessions')
    .update({ 
      participant_count: 2, 
      status: 'active',
      activated_at: new Date().toISOString() // Recording activation for Dead Man Timer logic
    })
    .eq('id', session.id)
    .eq('participant_count', 1); // Crucial: Ensures only one person can join as the 2nd member

  if (updateError) {
    return NextResponse.json({ error: 'JOIN_FAILED', message: 'Failed to establish tunnel connection. Room may be full.' }, { status: 409 });
  }

  // 9. Record cooldown + audit
  await Promise.all([
    supabase.from('shadow_cooldowns').insert({ ip_hash: ipHash, action: 'join', session_code: rawCode }),
    supabase.from('audit_logs').insert({ category: 'SHADOW_SESSION', action: 'SESSION_JOINED', actor: ipHash.substring(0, 8), metadata: { code: rawCode }, severity: 'info' }),
  ]);

  const res = NextResponse.json({ success: true, code: rawCode, sessionId: session.id, expiresAt: session.expires_at, role: 'joiner' });
  
  // 10. Set secure context cookie
  const { setShadowCookie } = await import('@/lib/coming-soon/shadowSecurity');
  setShadowCookie(res, rawCode, session.id, 'joiner');

  return res;
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}
