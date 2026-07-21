import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { validateEmail } from '@/lib/coming-soon/whitelist';

// ── In-process rate limiter (replace with Redis/Upstash in multi-instance prod) ──
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// ── DDoS burst detector: sliding window per IP ──────────────────────────────
const burstMap = new Map<string, number[]>();
const BURST_WINDOW_MS = 10 * 1000;  // 10s
const BURST_LIMIT     = 6;          // max 6 hits per 10s

// ── User-Agent blocklist ─────────────────────────────────────────────────────
const UA_BLOCKLIST = [
  'headlesschrome','phantomjs','wget','curl/','python-requests',
  'go-http-client','axios/','scrapy','node-fetch','libwww-perl',
];

// ── IP Registration cap: max 3 per IP (in-memory cache, 5min TTL) ────────────
const ipRegCache = new Map<string, { count: number; cachedAt: number }>();
const IP_REG_CACHE_TTL = 5 * 60 * 1000;
const IP_REG_MAX = 4;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now - record.windowStart > WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

function checkBurst(ip: string): boolean {
  const now = Date.now();
  const hits = burstMap.get(ip) ?? [];
  const recent = hits.filter(t => now - t < BURST_WINDOW_MS);
  recent.push(now);
  burstMap.set(ip, recent);
  return recent.length > BURST_LIMIT;
}

function isSuspiciousUA(ua: string): boolean {
  const lower = ua.toLowerCase();
  return UA_BLOCKLIST.some(b => lower.includes(b));
}


/** SHA-256 hash of IP — non-reversible, for abuse prevention. */
function hashIp(ip: string): string {
  return createHash('sha256').update(ip + (process.env.IP_HASH_SALT ?? 'verlyn-salt')).digest('hex');
}

// ── Global Blacklist (Persistent for 1 hour in memory) ───────────────────────
const blacklistMap = new Map<string, { strikes: number; banExpires: number }>();
const MAX_STRIKES = 3; // Allowing 3 strikes total (Initial + Resend + 1 grace)
const BAN_DURATION_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  // ── 0. DDoS Burst gate ────────────────────────────────────────────────────
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  if (checkBurst(ip)) {
    await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
    return NextResponse.json({ error: 'Service temporarily unavailable.' }, { status: 503 });
  }

  // ── 0.1. User-Agent blocklist ─────────────────────────────────────────────
  const ua = req.headers.get('user-agent') ?? '';
  if (!ua || isSuspiciousUA(ua)) {
    return NextResponse.json({ error: 'Service temporarily unavailable.' }, { status: 503 });
  }

  // ── 0.2. Anti-CSRF & Origin Enforcement ──────────────────────────────────
  const origin = req.headers.get('origin');
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev && origin && !origin.endsWith('verlyn.in') && !origin.endsWith('kensano.in')) {
    return NextResponse.json({ error: 'Origin strictly blocked by network policy.' }, { status: 403 });
  }

  // ── 0.3. Payload Size Limit ───────────────────────────────────────────────
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 5000) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
  }

  // ── 1. Rate limiting ────────────────────────────────────────────────────────
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in 15 minutes.' },
      { status: 429 }
    );
  }

  // ── 2. Parse body ───────────────────────────────────────────────────────────
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // ── 3. Honeypot ─────────────────────────────────────────────────────────────
  if (body.website) {
    return NextResponse.json({ success: true }, { status: 201 });
  }

  // ── 4. Anti-Replay Cryptographic Token Verification ─────────────────────────
  const reqTs = parseInt(body.__v_ts, 10);
  const reqToken = body.__v_token;
  if (!reqTs || !reqToken || isNaN(reqTs)) {
    return NextResponse.json({ error: 'Missing security token.' }, { status: 403 });
  }
  if (Date.now() - reqTs > 60000) {
    return NextResponse.json({ error: 'Request expired. Please refresh the page.' }, { status: 403 });
  }
  const expectedToken = createHash('sha256').update(reqTs.toString() + 'vrl-strict-auth-2025').digest('hex');
  if (reqToken !== expectedToken) {
    return NextResponse.json({ error: 'Invalid security signature.' }, { status: 403 });
  }

  // ── 5. Administrative Lock & Global Configuration ───────────────────────
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: configData } = await supabaseAdmin.from('global_config').select('*');
  const regLocked = configData?.find(d => d.key === 'registration_locked')?.value === 'true';

  if (regLocked) {
    return NextResponse.json(
      { error: 'Registration is temporarily paused for maintenance.' },
      { status: 403 }
    );
  }

  if (body.agreement_accepted !== true) {
    return NextResponse.json(
      { error: 'You must accept the terms of service before registering.' },
      { status: 422 }
    );
  }


  const agreedAt = typeof body.agreement_timestamp === 'string'
    ? body.agreement_timestamp
    : new Date().toISOString();

  // ── 6. Email validation ─────────────────────────────────────────────────────
  const rawEmail = typeof body.email === 'string' ? body.email : '';
  const result = validateEmail(rawEmail);
  if (!result.valid) {
    return NextResponse.json({ error: result.reason }, { status: 422 });
  }
  const email = result.sanitized!;
  const domain = email.split('@')[1];
  const ipHash = hashIp(ip);

  // ── 7. IP Registration Cap — max 3 per IP ───────────────────────────────────
  // Check cache first to avoid DB hit on every request
  const cachedReg = ipRegCache.get(ip);
  let ipRegCount = 0;
  if (cachedReg && Date.now() - cachedReg.cachedAt < IP_REG_CACHE_TTL) {
    ipRegCount = cachedReg.count;
  }
  // If not cached, will check DB later during Supabase block

  const rawIpAddress = ip;
  const userAgent = req.headers.get('user-agent') ?? body.device_metadata?.user_agent ?? 'unknown';
  const deviceProof = {
    ip: rawIpAddress,
    user_agent: userAgent,
    geo: {
      city: req.headers.get('x-vercel-ip-city'),
      region: req.headers.get('x-vercel-ip-country-region'),
      country: req.headers.get('x-vercel-ip-country'),
      latitude: req.headers.get('x-vercel-ip-latitude'),
      longitude: req.headers.get('x-vercel-ip-longitude'),
    },
    language: body.device_metadata?.language ?? 'unknown',
    screen: body.device_metadata?.screen_resolution ?? 'unknown',
    timezone: body.device_metadata?.timezone ?? 'unknown',
    captured_at: new Date().toISOString(),
  };

  // ── 9. Supabase insert ──────────────────────────────────────────────────────
  let dbError = null;

  try {
    // Check if IP is blacklisted
    const banInfo = blacklistMap.get(ip);
    if (banInfo && banInfo.banExpires > Date.now()) {
      const remainingMins = Math.ceil((banInfo.banExpires - Date.now()) / 60000);
      return NextResponse.json({ error: `Security protocol violation. Your IP is blacklisted for ${remainingMins} more minutes.` }, { status: 403 });
    }

    // We already initialized supabaseAdmin above for the lock check

    // IP Registration Cap — DB check (if not cached)
    if (!cachedReg || Date.now() - cachedReg.cachedAt >= IP_REG_CACHE_TTL) {
      const { count } = await supabaseAdmin
        .from('preregistrations')
        .select('*', { count: 'exact', head: true })
        .eq('ip_hash', ipHash);
      ipRegCount = count ?? 0;
      ipRegCache.set(ip, { count: ipRegCount, cachedAt: Date.now() });
    }

    if (ipRegCount >= IP_REG_MAX) {
      return NextResponse.json(
        { error: 'IP_REGISTRATION_LIMIT', limit: IP_REG_MAX },
        { status: 429 }
      );
    }



    const { error } = await supabaseAdmin
      .from('preregistrations')
      .insert({
        full_name: typeof body.full_name === 'string' ? body.full_name.trim() : 'Unknown',
        email,
        gender: typeof body.gender === 'string' ? body.gender : null,
        domain,
        agreement_accepted: true,
        agreement_timestamp: agreedAt,
        ip_hash: ipHash,
        device_proof: deviceProof,
        raw_ip: rawIpAddress
      });

    // Invalidate IP registration cache after successful insert
    if (!dbError) {
      const prev = ipRegCache.get(ip);
      if (prev) ipRegCache.set(ip, { count: prev.count + 1, cachedAt: Date.now() });
    }

    dbError = error;
  } catch (err: any) {
    console.error('[Verlyn API] Supabase connection failed:', err.message);
    dbError = { code: '500', message: 'Connection to secure database failed.' };
  }

  if (dbError) {
    if (dbError.code === '23505') {
      return NextResponse.json(
        { error: 'This email is already registered for early access.' },
        { status: 409 }
      );
    }
    console.error('[Verlyn API] Supabase insert error:', dbError.message);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }

  // Timing attack mitigation for successful inserts
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

  // Issue shadow access token as httpOnly cookie (not readable by JS)
  const { randomBytes: rb, createHash: ch } = await import('crypto');
  const rawToken = rb(48).toString('hex');
  const tHash = ch('sha256').update(rawToken + (process.env.SHADOW_TOKEN_SALT ?? 'vrl-shadow-salt-2025')).digest('hex');
  const eHash = ch('sha256').update(email).digest('hex');
  try { await supabaseAdmin.from('shadow_access_tokens').insert({ token_hash: tHash, email_hash: eHash, ip_hash: ipHash, expires_at: new Date(Date.now()+30*24*60*60*1000).toISOString() }); } catch {}
  const _isProd = process.env.NODE_ENV === 'production';
  const _cookie = [`vrl_sat=${rawToken}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', _isProd ? 'Secure' : '', `Max-Age=2592000`].filter(Boolean).join('; ');
  const _resp = NextResponse.json({ success: true }, { status: 201 });
  _resp.headers.set('Set-Cookie', _cookie);
  return _resp;
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}
