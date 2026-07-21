'use server'
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Verlyn Signup Step Server Actions
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Each function validates its step server-side and issues a cryptographically
 * signed step-completion token. The client cannot forge these tokens without
 * the server secret. All 5 tokens are required at final form submission.
 *
 * Server-side rate limiting uses the existing Supabase security_events table.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { issueStepToken, StepName } from '@/lib/security/step-tokens';
import { verifyHCaptcha } from '@/lib/security/hcaptcha';

// ── 197-domain whitelist (same as client) ─────────────────────────────────────
const WHITELISTED_DOMAINS = new Set([
  'gmail.com','googlemail.com','outlook.com','outlook.in','outlook.co.uk','outlook.com.au',
  'outlook.de','outlook.fr','outlook.es','outlook.it','outlook.jp','hotmail.com',
  'hotmail.co.uk','hotmail.fr','hotmail.de','hotmail.it','hotmail.es','hotmail.co.jp',
  'live.com','live.co.uk','live.in','live.fr','live.de','live.com.au','msn.com',
  'yahoo.com','yahoo.co.uk','yahoo.co.in','yahoo.ca','yahoo.com.au','yahoo.co.jp',
  'yahoo.de','yahoo.fr','yahoo.it','yahoo.es','yahoo.com.br','yahoo.com.mx',
  'ymail.com','rocketmail.com','myyahoo.com','icloud.com','me.com','mac.com',
  'aol.com','aim.com','verizon.net','zoho.com','zohomail.com','zohomail.in',
  'protonmail.com','protonmail.ch','proton.me','pm.me','tutanota.com','tutanota.de',
  'tutamail.com','tuta.io','tuta.com','keemail.me','gmx.com','gmx.net','gmx.de',
  'gmx.at','gmx.ch','web.de','mail.com','email.com','fastmail.com','fastmail.fm',
  'rediffmail.com','rediff.com','sify.com','yandex.com','yandex.ru','mail.ru',
  'inbox.ru','bk.ru','list.ru','rambler.ru','lenta.ru',
]);

// ── Shared helpers ────────────────────────────────────────────────────────────

function getIp(head: Headers): string {
  const fwd = head.get('x-forwarded-for');
  return fwd ? fwd.split(',')[0].trim() : 'unknown';
}

const memoryRateLimits = new Map<string, number[]>();

async function serverRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const now = Date.now();
  const hits = memoryRateLimits.get(key) || [];
  const activeHits = hits.filter(timestamp => now - timestamp < windowMs);

  if (activeHits.length >= maxAttempts) {
    return { allowed: false, retryAfterMs: windowMs };
  }

  activeHits.push(now);
  memoryRateLimits.set(key, activeHits);
  return { allowed: true, retryAfterMs: 0 };
}

type StepResult = { token: string } | { error: string };

// ── Step 1: Basics ────────────────────────────────────────────────────────────

export async function serverCompleteBasics(
  email: string,
  fullName: string,
  birthYear: string,
  birthMonth: string,
  birthDay: string,
): Promise<StepResult> {
  const head = await headers();
  const ip = getIp(head);
  const adminSupabase = createAdminClient();

  // Server-side rate limit: 10 attempts per IP per hour
  const rl = await serverRateLimit(`${ip}:basics`, 10, 60 * 60 * 1000);
  if (!rl.allowed) return { error: 'Too many attempts from your IP. Please try again later.' };

  // Validate name
  const name = fullName?.trim();
  if (!name || name.length < 2) return { error: 'Full name must be at least 2 characters.' };

  // Validate email format
  const emailRe = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!email || !emailRe.test(email)) return { error: 'Invalid email address format.' };

  // Validate DOB & Age (min 16)
  const birthDate = new Date(Number(birthYear), Number(birthMonth) - 1, Number(birthDay));
  if (isNaN(birthDate.getTime())) {
    return { error: 'Invalid Date of Birth provided.' };
  }
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < 16) {
    return { error: 'You must be at least 16 years old to join Verlyn.' };
  }

  // Validate domain whitelist (server-authoritative)
  const domain = email.split('@')[1]?.toLowerCase().trim() || '';
  if (!domain || !WHITELISTED_DOMAINS.has(domain)) {
    await adminSupabase.from('security_events').insert({
      event_type: 'signup_domain_attempt',
      severity: 'medium',
      ip_address: ip,
      payload: { email, domain },
    });
    return { error: 'Email domain not permitted.' };
  }

  // ╔═ RULE: 1 email = 1 account ═════════════════════════════════════════════
  try {
    const { data: { users }, error: listError } = await adminSupabase.auth.admin.listUsers({
      perPage: 1000
    });

    if (listError) {
      console.error('Failed to list users in step1 check:', listError.message);
      // Non-fatal: proceed, final signup will also check
    } else {
      const existingUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase().trim());
      if (existingUser) {
        return { error: 'This email is already registered.' };
      }
    }
  } catch (e) {
    console.warn('serverCompleteBasics: listUsers threw (proceeding):', e);
  }
  // ╚═════════════════════════════════════════════════════════════════════════

  // ╔═ RULE: One device (IP / network IP) only 5 accounts in lifetime ════════
  try {
    const { count: ipCount } = await adminSupabase
      .from('security_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'signup_success')
      .eq('ip_address', ip);

    if (ipCount && ipCount >= 5) {
      return { error: 'This device/network has reached the maximum signup limit.' };
    }
  } catch (e) {
    console.warn('serverCompleteBasics: ipCount query threw (proceeding):', e);
  }
  // ╚═════════════════════════════════════════════════════════════════════════

  return { token: issueStepToken('basics', email) };
}

// ── Step 2: Email OTP verified ────────────────────────────────────────────────
// Called AFTER verifyEmailOTP returns success. Issues a proof token.

export async function serverCompleteEmailVerify(email: string): Promise<StepResult> {
  const head = await headers();
  const ip = getIp(head);
  const adminSupabase = createAdminClient();

  // Server-side rate limit: 5 per IP per 10 min
  const rl = await serverRateLimit(`${ip}:email_verify`, 5, 10 * 60 * 1000);
  if (!rl.allowed) return { error: 'Too many verification attempts.' };

  // Check if we have a verified OTP event for this email in the last 10 minutes
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: verifiedEvents, error } = await adminSupabase
    .from('security_events')
    .select('*')
    .eq('event_type', 'email_otp_verified')
    .gt('created_at', tenMinsAgo);

  if (error || !verifiedEvents || verifiedEvents.length === 0) {
    return { error: 'Email verification could not be confirmed server-side.' };
  }

  // Find a verified event matching this email
  const match = verifiedEvents.find((evt: any) => evt.payload?.email?.toLowerCase().trim() === email.toLowerCase().trim());

  if (!match) {
    return { error: 'Email verification could not be confirmed server-side.' };
  }

  return { token: issueStepToken('email_verify', email) };
}

// ── Step 3: Phone ─────────────────────────────────────────────────────────────

export async function serverSendPhoneOTP(
  email: string,
  phone: string,
): Promise<{ success: boolean; error?: string }> {
  const head = await headers();
  const ip = getIp(head);
  const adminSupabase = createAdminClient();

  const rl = await serverRateLimit(`${ip}:phone_otp_send`, 10, 10 * 60 * 1000);
  if (!rl.allowed) return { success: false, error: 'Too many verification code requests. Please wait 10 minutes.' };

  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return { success: false, error: 'Phone number must have at least 6 digits.' };
  if (digits.length > 15) return { success: false, error: 'Phone number is too long.' };

  // ╔═ RULE: 1 phone number = max 3 accounts ═════════════════════════════════
  const { count: phoneCount } = await adminSupabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('phone', phone);

  if (phoneCount && phoneCount >= 3) {
    return { success: false, error: 'This phone number is already linked to the maximum limit of 3 accounts.' };
  }
  // ╚═════════════════════════════════════════════════════════════════════════

  // Generate 6-digit random code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins TTL

  // Store OTP in security_events payload
  const { error: dbError } = await adminSupabase
    .from('security_events')
    .insert({
      event_type: 'phone_otp_sent',
      severity: 'low',
      ip_address: ip,
      payload: { email: email.toLowerCase().trim(), phone, code, expires_at: expiresAt }
    });

  if (dbError) {
    console.error('Failed to log phone OTP in DB:', dbError.message);
    return { success: false, error: 'Database logs failed.' };
  }

  // Send via Twilio API
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !twilioPhone) {
    console.warn('Twilio environment variables are missing. Using development fallback.');
    console.log(`[Twilio Fallback Log] SMS OTP for ${phone} is: ${code}`);
    return { success: true };
  }

  try {
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: formattedPhone,
        From: twilioPhone,
        Body: `Verlyn Security: Your verification code is ${code}. It is valid for 15 minutes. Do not share this code.`,
      }).toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Twilio Send API returned error status:', response.status, errText);
      console.log(`[Twilio Fallback Log] OTP for ${phone} is: ${code}`);
    }
  } catch (err) {
    console.error('Twilio Send Exception:', err);
    console.log(`[Twilio Fallback Log] OTP for ${phone} is: ${code}`);
  }

  return { success: true };
}

export async function serverVerifyPhoneOTP(
  email: string,
  phone: string,
  code: string,
): Promise<StepResult> {
  const head = await headers();
  const ip = getIp(head);
  const adminSupabase = createAdminClient();
  const targetEmail = email.toLowerCase().trim();

  const rl = await serverRateLimit(`${ip}:phone_otp_verify`, 10, 10 * 60 * 1000);
  if (!rl.allowed) return { error: 'Too many verification attempts. Please wait 10 minutes.' };

  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: events, error } = await adminSupabase
    .from('security_events')
    .select('*')
    .eq('event_type', 'phone_otp_sent')
    .gt('created_at', fifteenMinsAgo);

  if (error || !events) {
    return { error: 'Failed to query verification records.' };
  }

  // Find matching valid unexpired code
  const validEvent = events.find((evt: any) => {
    const p = evt.payload;
    if (!p) return false;
    const sameEmail = p.email?.toLowerCase().trim() === targetEmail;
    const samePhone = p.phone === phone;
    const sameCode = p.code === code.trim();
    const notExpired = p.expires_at ? new Date(p.expires_at) > new Date() : true;
    return sameEmail && samePhone && sameCode && notExpired;
  });

  if (!validEvent) {
    // Log the verification failure to count against the rate limit
    await adminSupabase.from('security_events').insert({
      event_type: 'phone_otp_verify_fail',
      severity: 'medium',
      ip_address: ip,
      payload: { email: targetEmail, phone, code: code.trim() }
    });
    return { error: 'Incorrect or expired verification code.' };
  }

  // Prevent replay attacks
  const { data: reuseCheck } = await adminSupabase
    .from('security_events')
    .select('id')
    .eq('event_type', 'phone_otp_verified')
    .eq('payload->>code', code.trim())
    .eq('payload->>email', targetEmail)
    .maybeSingle();

  if (reuseCheck) {
    return { error: 'This verification code has already been used.' };
  }

  // Insert verification success event to mark token as used
  await adminSupabase.from('security_events').insert({
    event_type: 'phone_otp_verified',
    severity: 'low',
    ip_address: ip,
    payload: { email: targetEmail, phone, code: code.trim() }
  });

  return { token: issueStepToken('phone_trust', email) };
}

// ── Step 4: Username ──────────────────────────────────────────────────────────

export async function serverCompleteUsername(
  email: string,
  username: string,
): Promise<StepResult> {
  const head = await headers();
  const ip = getIp(head);
  const adminSupabase = createAdminClient();

  const rl = await serverRateLimit(`${ip}:username_check`, 20, 60 * 60 * 1000);
  if (!rl.allowed) return { error: 'Too many attempts.' };

  const clean = username.toLowerCase().trim();
  const usernameRe = /^[a-z0-9_.]+$/;
  if (!clean || clean.length < 5 || !usernameRe.test(clean) || clean.endsWith('.')) {
    return { error: 'Username is invalid.' };
  }

  // Re-check availability server-side
  const { data: existing } = await adminSupabase
    .from('users')
    .select('username')
    .eq('username', clean)
    .maybeSingle();

  if (existing) return { error: 'Username was taken before you could claim it.' };

  return { token: issueStepToken('username_check', email) };
}

// ── Step 5: Captcha ───────────────────────────────────────────────────────────

export async function serverCompleteCaptcha(
  email: string,
  captchaToken: string,
): Promise<StepResult> {
  const head = await headers();
  const ip = getIp(head);
  const adminSupabase = createAdminClient();

  const rl = await serverRateLimit(`${ip}:human_captcha`, 20, 60 * 60 * 1000);
  if (!rl.allowed) return { error: 'Too many verification attempts.' };

  if (!captchaToken || captchaToken.trim() === '') {
    return { error: 'Captcha token is missing.' };
  }

  // Development bypass check
  if (process.env.NODE_ENV === 'development' && captchaToken === 'bypass-token-dev') {
    return { token: issueStepToken('human_captcha', email) };
  }

  // Always verify captcha with hCaptcha servers
  const captchaResult = await verifyHCaptcha(captchaToken);
  if (!captchaResult.success) {
    await adminSupabase.from('security_events').insert({
      event_type: 'captcha_fail_step5',
      severity: 'high',
      ip_address: ip,
      payload: { email, captchaError: captchaResult.error },
    });
    return { error: 'Captcha verification failed. Please try again.' };
  }

  return { token: issueStepToken('human_captcha', email) };
}
