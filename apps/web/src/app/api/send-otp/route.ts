import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { validateEmail } from '@/lib/coming-soon/whitelist';
import { generateChallenge, verifyWork } from '@/lib/coming-soon/pow';
import { createHash } from 'crypto';

// Resend client is instantiated inside the handler (not at module level)
// to prevent build-time errors when RESEND_API_KEY is only available at runtime.

/* ══════════════════════════════════════════════════════════════════════
   LAYER 1 — In-Memory Rate Stores (replaced by Redis in multi-instance prod)
══════════════════════════════════════════════════════════════════════ */

// OTP requests per IP: max 3 per 15min window
const ipOtpMap = new Map<string, { count: number; firstAt: number; lastAt: number }>();

// Email-level cooldown: 90s between sends
const EMAIL_OTP_MAP = new Map<string, number>();

// IP registration cap: max 3 successful registrations per IP (checked against DB)
// This in-memory cache avoids a DB hit on every request
const ipRegCache = new Map<string, { count: number; cachedAt: number }>();
const IP_REG_CACHE_TTL = 5 * 60 * 1000; // 5 min cache

// DDoS burst detector: tracks request timestamps per IP in a sliding window
const burstMap = new Map<string, number[]>();
const BURST_WINDOW_MS = 10 * 1000;   // 10s window
const BURST_LIMIT     = 8;           // max 8 requests per 10s before hard block

// Suspicious UA blocklist (headless browsers, known scrapers)
const UA_BLOCKLIST = [
  'headlesschrome', 'phantomjs', 'wget', 'curl/', 'python-requests',
  'go-http-client', 'axios/', 'scrapy', 'node-fetch', 'libwww-perl',
];

const OTP_PER_IP_WINDOW  = 15 * 60 * 1000;
const OTP_PER_IP_MAX     = 3;
const OTP_EMAIL_COOLDOWN = 90 * 1000;
const IP_REG_MAX         = 3; // Max 3 registrations per IP

/* ── Helper: SHA-256 hash of IP ─────────────────────────────────────── */
function hashIp(ip: string): string {
  return createHash('sha256').update(ip + (process.env.IP_HASH_SALT ?? 'verlyn-salt')).digest('hex');
}

/* ── Helper: DDoS burst check ───────────────────────────────────────── */
function checkBurst(ip: string): boolean {
  const now = Date.now();
  const hits = burstMap.get(ip) ?? [];
  const recent = hits.filter(t => now - t < BURST_WINDOW_MS);
  recent.push(now);
  burstMap.set(ip, recent);
  return recent.length > BURST_LIMIT;
}

/* ── Helper: UA suspicious check ────────────────────────────────────── */
function isSuspiciousUA(ua: string): boolean {
  const lower = ua.toLowerCase();
  return UA_BLOCKLIST.some(blocked => lower.includes(blocked));
}

export async function POST(req: NextRequest) {
  try {
    /* ── 0. DDoS burst protection (fastest gate — no parsing needed) ─── */
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'unknown';
    const ua = req.headers.get('user-agent');
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    if (checkBurst(ip)) {
      // Silently delay + reject — don't reveal we detected them
      await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
      return NextResponse.json({ error: 'Service temporarily unavailable.' }, { status: 503 });
    }

    /* ── 1. User-Agent fingerprint gate ─────────────────────────────── */
    if (!ua || isSuspiciousUA(ua)) {
      return NextResponse.json({ error: 'Service temporarily unavailable.' }, { status: 503 });
    }

    /* ── 1.5 Shadow Protocol (Perimeter) ────────────────────────────── */
    const { data: shadowConfigs } = await supabaseAdmin.from('global_config').select('key, value').ilike('key', 'shadow_%');
    const isShadowedIp = shadowConfigs?.some(c => c.key === `shadow_${ip}` && c.value === 'true');
    
    if (isShadowedIp) {
      // Return a 200 Success but do nothing — mirroring the "Shadow Ban" effect
      return NextResponse.json({ success: true }, { status: 200 });
    }

    /* ── 2. Payload size guard ───────────────────────────────────────── */
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 8000) {
      return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
    }

    const body = await req.json();
    const rawEmail = typeof body.email === 'string' ? body.email : '';
    const result = validateEmail(rawEmail);
    if (!result.valid) {
      return NextResponse.json({ error: result.reason }, { status: 422 });
    }
    const email = result.sanitized!;

    /* ── 3. Dynamic Config & Proof-of-Work gate ─────────────────────── */
    const { data: configData } = await supabaseAdmin.from('global_config').select('key, value');
    const isMaintenance = configData?.find(d => d.key === 'maintenance_mode')?.value === 'true';
    const isRegLocked   = configData?.find(d => d.key === 'registration_locked')?.value === 'true';
    const diff          = parseInt(configData?.find(d => d.key === 'pow_difficulty')?.value || '4', 10);
    const otpExpMins    = parseInt(configData?.find(d => d.key === 'otp_expiry_mins')?.value || '10', 10);

    if (isMaintenance || isRegLocked) {
      return NextResponse.json({ 
        error: isMaintenance ? 'System undergoing maintenance.' : 'Registrations are temporarily paused.' 
      }, { status: 503 });
    }

    if (!body.pow_nonce || !body.pow_challenge) {
      const challenge = generateChallenge();
      return NextResponse.json({ challenge, difficulty: diff }, { status: 401 });
    }
    if (!verifyWork(body.pow_challenge, body.pow_nonce)) {
      return NextResponse.json({ error: 'Security proof failed.' }, { status: 403 });
    }

    /* ── 3.5 Blacklist Enforcement ──────────────────────────────────── */
    const { data: blacklistEntry } = await supabaseAdmin
      .from('spam_blacklist')
      .select('*')
      .or(`ip_address.eq.${ip},ip_address.eq.email:${email}`)
      .maybeSingle();

    if (blacklistEntry) {
      return NextResponse.json({ error: 'Access denied. Your identifier is blacklisted.' }, { status: 403 });
    }

    /* ── 4. IP-level OTP rate limit ─────────────────────────────────── */
    const now = Date.now();
    const ipRecord = ipOtpMap.get(ip);
    if (ipRecord && now - ipRecord.firstAt < OTP_PER_IP_WINDOW) {
      if (ipRecord.count >= OTP_PER_IP_MAX) {
        const remaining = Math.ceil((OTP_PER_IP_WINDOW - (now - ipRecord.firstAt)) / 60000);
        return NextResponse.json(
          { error: `Too many verification requests. Please wait ${remaining} minute${remaining > 1 ? 's' : ''}.` },
          { status: 429 }
        );
      }
      ipRecord.count++;
      ipRecord.lastAt = now;
    } else {
      ipOtpMap.set(ip, { count: 1, firstAt: now, lastAt: now });
    }

    /* ── 5. Email-level cooldown ─────────────────────────────────────── */
    const lastEmailOtp = EMAIL_OTP_MAP.get(email);
    if (lastEmailOtp && now - lastEmailOtp < OTP_EMAIL_COOLDOWN) {
      const secondsLeft = Math.ceil((OTP_EMAIL_COOLDOWN - (now - lastEmailOtp)) / 1000);
      return NextResponse.json(
        { error: `A code was already sent. Please wait ${secondsLeft}s before requesting another.` },
        { status: 429 }
      );
    }

    /* ── 6 & 7. Supabase checks — Parallelize existing check and IP cap ─── */


    const ipHash = hashIp(ip);
    const cached = ipRegCache.get(ip);
    const isCacheValid = cached && now - cached.cachedAt < IP_REG_CACHE_TTL;

    const [existingRes, ipCountRes] = await Promise.all([
      supabaseAdmin.from('preregistrations').select('email').eq('email', email).maybeSingle(),
      isCacheValid ? Promise.resolve({ count: cached.count, error: null }) : 
        supabaseAdmin.from('preregistrations').select('*', { count: 'exact', head: true }).eq('ip_hash', ipHash)
    ]);

    if (existingRes.data) {
      return NextResponse.json({ error: 'This email is already registered.' }, { status: 409 });
    }

    const ipRegCount = isCacheValid ? cached.count : (ipCountRes.count ?? 0);
    if (!isCacheValid) {
      ipRegCache.set(ip, { count: ipRegCount, cachedAt: now });
    }

    if (ipRegCount >= IP_REG_MAX) {
      return NextResponse.json({ error: 'IP_REGISTRATION_LIMIT', limit: IP_REG_MAX }, { status: 429 });
    }

    /* ── 8. Bot timing check ─────────────────────────────────────────── */
    const interactionTime = Number(body.interaction_time) || 0;
    const shadowBan = interactionTime > 0 && interactionTime < 1500;

    /* ── 9. Atomic OTP Operation — use upsert to save one DB round-trip ── */
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(now + otpExpMins * 60_000).toISOString();

    // Parallelize OTP storage and metadata preparation
    const [dbResult] = await Promise.all([
      supabaseAdmin
        .from('otp_codes')
        .upsert({ email, code, expires_at: expiresAt }, { onConflict: 'email' }),
      // Pre-fetching metadata from headers is synchronous, no need to await
    ]);

    if (dbResult.error) {
      console.error('[Verlyn OTP] Atomic upsert failed:', dbResult.error.message);
      return NextResponse.json({ error: 'Verification service temporarily unavailable.' }, { status: 503 });
    }

    EMAIL_OTP_MAP.set(email, now);

    /* ── 10. Build email metadata ────────────────────────────────────── */
    const city    = req.headers.get('x-vercel-ip-city')    || 'Unknown';
    const country = req.headers.get('x-vercel-ip-country') || 'Unknown';
    const location = `${city}, ${country}`;
    const rawUA    = req.headers.get('user-agent') || '';
    let device = 'Secure Device';
    if (/windows/i.test(rawUA))          device = 'Windows Desktop';
    else if (/mac os x/i.test(rawUA))    device = 'macOS Desktop';
    else if (/iphone|ipad/i.test(rawUA)) device = 'iOS Device';
    else if (/android/i.test(rawUA))     device = 'Android Device';
    const requestTime = new Intl.DateTimeFormat('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'Asia/Kolkata',
    }).format(new Date());

    /* ── 11. Send verification email ─────────────────────────────────── */
    const isShadowedEmail = shadowConfigs?.some(c => c.key === `shadow_${email}` && c.value === 'true');

    if (!shadowBan && !isShadowedEmail) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      // Constructing HTML string is expensive but synchronous, we've already parallelized the DB work
      const emailResult = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Verlyn <noreply@verlyn.in>',
        replyTo: 'support@verlyn.in',
        to: email,
        subject: `${code} — Verlyn Verification Code`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#fff;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#000;padding:80px 20px;">
              <tr><td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:500px;width:100%;background:#050505;border:1px solid #1a1a1a;border-radius:12px;overflow:hidden;">
                  <tr>
                    <td align="center" style="padding:50px 40px 30px 40px;">
                      <div style="font-size:22px;font-weight:300;letter-spacing:0.8em;color:#fff;text-transform:uppercase;">VERLYN</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 50px 40px 50px;text-align:center;">
                      <h2 style="font-size:24px;font-weight:500;margin:0 0 12px;color:#fff;">Verify your identity</h2>
                      <p style="font-size:15px;line-height:1.6;color:#777;margin:0 0 35px;">Enter the following code to authorize your access request.</p>
                      <div style="background:#000;border:1px solid #222;border-radius:8px;padding:35px;text-align:center;margin-bottom:40px;">
                        <span style="font-size:42px;font-weight:700;letter-spacing:0.4em;color:#fff;font-family:monospace;">${code}</span>
                      </div>
                      <p style="font-size:13px;color:#555;margin:0 0 24px;line-height:1.6;">This code expires in <strong style="color:#888;">10 minutes</strong>. Do not share it with anyone.</p>
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top:1px solid #111;padding-top:30px;text-align:left;">
                        <tr><td>
                          <p style="font-size:11px;font-weight:700;color:#444;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 15px;">Security Audit Log</p>
                          <table width="100%" border="0" cellspacing="0" cellpadding="3" style="font-size:12px;color:#666;">
                            <tr><td width="35%" style="color:#333;">Timestamp</td><td style="color:#eee;font-family:monospace;">${requestTime}</td></tr>
                            <tr><td style="color:#333;">IP Address</td><td style="color:#eee;font-family:monospace;">${ip}</td></tr>
                            <tr><td style="color:#333;">Location</td><td style="color:#eee;">${location}</td></tr>
                            <tr><td style="color:#333;">Device</td><td style="color:#eee;">${device}</td></tr>
                          </table>
                        </td></tr>
                      </table>
                      <p style="font-size:12px;color:#333;margin:40px 0 0;line-height:1.6;">If you didn't request this, someone may be using your email. You can safely ignore this message.</p>
                    </td>
                  </tr>
                </table>
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:500px;width:100%;margin-top:30px;">
                  <tr><td align="center"><p style="margin:0;font-size:11px;color:#222;text-transform:uppercase;letter-spacing:0.05em;">Verlyn &copy; 2026</p></td></tr>
                </table>
              </td></tr>
            </table>
          </body>
          </html>
        `,
      });

      if (emailResult.error) {
        // Log the error but don't block the user — email delivery is non-critical
        // The OTP code is already stored in DB; user can retry via resend
        console.error('[Verlyn OTP] Email dispatch failed (non-fatal):', emailResult.error);
        // Don't delete the OTP or reset the cooldown — let user request resend if needed
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: any) {
    console.error('[Verlyn OTP] Fatal transmission error:', err?.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
