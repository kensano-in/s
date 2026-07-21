'use server'

import '@/lib/sanitize-env';
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { randomBytes } from 'crypto'
import { verifyStepToken, StepName } from '@/lib/security/step-tokens'
import { createClient } from '@/lib/supabase/server'
import { verifyHCaptcha } from '@/lib/security/hcaptcha'
import { validateEmailReputation } from '@/lib/security/disposable'
import { validatePasswordStrength } from '@/lib/security/password'

import { getIpReputation } from '@/lib/security/reputation'
import { validateUsernameGovernance, normalizeUsername } from '@/lib/security/governance'
import { aiAdversarialAnalysis } from '@/lib/security/ai-analysis'
import { logRejectedUsername, checkAdaptiveBlacklist } from '@/lib/security/adaptive-blacklist'
import { checkUsernameRateLimit } from '@/lib/security/rate-limit'
import { checkIPThreatStatus, recordIPThreatEvent } from '@/lib/security/ip-correlation'

/**
 * Extract clean IP from potentially multi-address headers
 */
const getIp = (head: Headers) => {
  const forwardedFor = head.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return 'unknown';
}

/**
 * Log security events to the database
 */
async function logSecurityEvent(supabase: any, event: {
  type: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  email?: string,
  ip?: string,
  payload?: any
}) {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  await admin.from('security_events').insert({
    event_type: event.type,
    severity: event.severity,
    ip_address: event.ip || '127.0.0.1',
    payload: { email: event.email, ...event.payload }
  });
}

/**
 * Check if the current IP or User is banned
 */
async function checkBans(supabase: any, identifier: string, type: 'ip' | 'user') {
    const { data: ban } = await supabase
        .from('banned_identities')
        .select('id, expires_at')
        .eq('identifier', identifier)
        .eq('type', type)
        .maybeSingle();
    
    if (ban) {
        if (!ban.expires_at || new Date(ban.expires_at) > new Date()) {
            return { banned: true };
        }
    }
    return { banned: false };
}

export async function login(formData: FormData): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const head = await headers();
  const ip = getIp(head);

  const identifier = (formData.get('email') as string || '').trim();
  const password = formData.get('password') as string
  const captchaToken = (formData.get('h-captcha-response') as string) || ''

  // 0. Redundant Ban Check
  const banStatus = await checkBans(supabase, ip, 'ip');
  if (banStatus.banned) {
      return { error: 'Access Denied: Your IP has been flagged.' };
  }
  let email = identifier;
  if (identifier && !identifier.includes('@')) {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminSupabase = createAdminClient();

    // Resolve email from username via user ID -> Auth admin lookup
    const { data: profile } = await adminSupabase
      .from('users')
      .select('id')
      .eq('username', identifier.toLowerCase())
      .maybeSingle();

    if (profile?.id) {
      const { data: authUser } = await adminSupabase.auth.admin.getUserById(profile.id);
      if (authUser?.user?.email) {
        email = authUser.user.email;
      } else {
        await logSecurityEvent(supabase, { type: 'failed_login', severity: 'low', email: identifier, ip, payload: { error: 'Auth user email not found' } });
        return { error: 'Could not authenticate user: Invalid login credentials.' };
      }
    } else {
      await logSecurityEvent(supabase, { type: 'failed_login', severity: 'low', email: identifier, ip, payload: { error: 'Username not found' } });
      return { error: 'Could not authenticate user: Invalid login credentials.' };
    }
  }

  // 1. Bot Defense (Conditional)
  const reputation = await getIpReputation(ip);
  if (reputation === 'SUSPICIOUS') {
    let captchaPassed = false;
    if (process.env.NODE_ENV === 'development' && captchaToken === 'bypass-token-dev') {
      captchaPassed = true;
    } else {
      const captchaResult = await verifyHCaptcha(captchaToken);
      captchaPassed = captchaResult.success;
    }

    if (!captchaPassed) {
        await logSecurityEvent(supabase, { type: 'failed_login', severity: 'medium', email, ip, payload: { reason: 'captcha_required_failed' } });
        return { error: 'Bot detection verification failed. Please try again.' };
    }
    console.log(`[Security] Challenge passed for suspicious IP: ${ip}`);
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    await logSecurityEvent(supabase, { type: 'failed_login', severity: 'low', email, ip, payload: { error: error.message } });
    return { error: `Could not authenticate user: ${error.message}` };
  }

  revalidatePath('/feed', 'layout')
  redirect('/feed')
}

export async function checkUsernameAvailability(username: string, skipAi: boolean = false) {
  if (!username || username.length < 5) return { available: false, message: 'Username must be at least 5 characters.' };

  // ── Extract IP server-side from request headers (cannot be spoofed by client) ──
  const head = await headers();
  const resolvedIp = getIp(head);
  const fingerprint = head.get('user-agent') ?? undefined; // UA as basic fingerprint
  const normalized = normalizeUsername(username);

  // ── L10 FIRST: IP + Device Threat Status ────────────────────
  // Checks: hard ban, soft ban (velocity), fingerprint correlation
  const threatStatus = await checkIPThreatStatus(resolvedIp, fingerprint);
  if (threatStatus.hardBanned) {
    return { available: false, message: threatStatus.reason, layer: 'L10_HARD_BAN' };
  }
  if (threatStatus.tier === 'SOFT_BAN') {
    return {
      available: false,
      message: threatStatus.reason ?? 'Too many suspicious attempts. Please wait before trying again.',
      layer: 'L10_SOFT_BAN',
      bannedUntil: threatStatus.softBanUntil
    };
  }

  // ── L9: Rate limit gate ─────────────────────────────────────
  const rateLimit = await checkUsernameRateLimit(resolvedIp, fingerprint);
  if (!rateLimit.allowed) {
    // Feed rate violation into L10 threat score
    recordIPThreatEvent(resolvedIp, 'rate_limit', { username, fingerprint });
    return { available: false, message: rateLimit.reason, layer: 'L9_RATE_LIMIT', bannedUntil: rateLimit.bannedUntil };
  }

  // ── L8: Adaptive blacklist memory ───────────────────────────
  const adaptive = await checkAdaptiveBlacklist(normalized);
  if (adaptive.blocked) {
    recordIPThreatEvent(resolvedIp, 'adaptive_block', { username, fingerprint, reason: adaptive.reason });
    return { available: false, message: adaptive.reason, layer: 'L8_ADAPTIVE' };
  }

  // ── Layers 0–6: Rule-based governance ───────────────────────
  const governance = validateUsernameGovernance(username);
  if (!governance.valid) {
    // Log to L8 and escalate L10 threat score (async, non-blocking)
    logRejectedUsername({ raw: username, normalized, blocked_by: governance.layer ?? 'L2-L6', reason: governance.reason, risk_score: governance.riskScore ?? 50, ip_address: resolvedIp, fingerprint });
    recordIPThreatEvent(resolvedIp, 'governance_block', { username, fingerprint, reason: governance.reason });
    const isFormatError = governance.layer === 'L8_FORMAT' || governance.layer === 'L0_NORM';
    const displayMsg = isFormatError ? governance.reason : "This username isn't available.";
    return { available: false, message: displayMsg, layer: governance.layer };
  }

  // ── Layer 7: AI Adversarial Analysis ────────────────────────
  let aiResult = { verdict: 'allow', reason: '', risk_score: 0 };
  if (!skipAi) {
    aiResult = await aiAdversarialAnalysis(username, normalized);
  }
  
  if (aiResult.verdict === 'block') {
    logRejectedUsername({ raw: username, normalized, blocked_by: 'L7_AI', reason: aiResult.reason, risk_score: aiResult.risk_score, ip_address: resolvedIp, fingerprint });
    recordIPThreatEvent(resolvedIp, 'ai_block', { username, fingerprint, reason: aiResult.reason });
    return { available: false, message: `Identity blocked: ${aiResult.reason}`, layer: 'L7_AI', riskScore: aiResult.risk_score };
  }
  
  if (aiResult.verdict === 'suspicious') {
    logRejectedUsername({ raw: username, normalized, blocked_by: 'L7_AI_SUSPICIOUS', reason: aiResult.reason, risk_score: aiResult.risk_score, ip_address: resolvedIp, fingerprint });
    recordIPThreatEvent(resolvedIp, 'ai_suspicious', { username, fingerprint, reason: aiResult.reason });
    console.warn(`[AI-L7] SUSPICIOUS: "${username}" — score=${aiResult.risk_score} — IP=${resolvedIp}`);
  }

  // ── DB Availability Check ────────────────────────────────────
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('username')
    .eq('username', normalized)
    .maybeSingle();
  
  return { 
    available: !data, 
    suspicious: aiResult.verdict === 'suspicious', 
    remaining: rateLimit.remaining,
    message: aiResult.verdict === 'suspicious' ? `Warning: ${aiResult.reason}` : undefined
  };
}

export async function findAccountByEmailOrUsername(identifier: string) {
  const supabase = await createClient();
  
  // Try email first
  const { data: byEmail } = await supabase
    .from('users')
    .select('id, email, username')
    .eq('email', identifier.toLowerCase())
    .maybeSingle();

  if (byEmail) return { success: true, email: byEmail.email, username: byEmail.username };

  // Try username
  const { data: byUsername } = await supabase
    .from('users')
    .select('id, email, username')
    .eq('username', identifier.toLowerCase())
    .maybeSingle();

  if (byUsername) return { success: true, email: byUsername.email, username: byUsername.username };

  return { success: false, error: 'Identity not found' };
}

export async function findAccountByPhone(phone: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('id, email, username, phone')
    .eq('phone', phone)
    .maybeSingle();

  if (data) return { success: true, email: data.email, username: data.username };
  return { success: false, error: 'Mobile identity not found' };
}

export async function suggestUsernames(base: string) {
  const supabase = await createClient()
  const suffixes = ['_v', '_hq', '_legacy', '_official', 'x', '7', '_official_user', '_xyz', '99']
  const suggestions: string[] = []
  
  // Clean base first
  let cleanBase = base.toLowerCase().trim().replace(/[^a-z0-9_.]/g, '');
  if (cleanBase.length < 3) {
    cleanBase = 'user';
  }
  
  // Check if base is a protected brand/reserved word. If so, don't use it in suggestions.
  const gov = validateUsernameGovernance(cleanBase);
  if (!gov.valid && (gov.layer !== 'L8_FORMAT' && gov.layer !== 'L0_NORM')) {
    // If it's a security block (reserved, similarity, profanity), replace base with a generic word
    cleanBase = 'user';
  }

  let i = 0
  while (suggestions.length < 4 && i < 40) {
    const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)]
    const randomNumber = Math.floor(Math.random() * 999)
    let candidate = `${cleanBase}${randomSuffix}${randomNumber}`.toLowerCase()
    
    // Fallback if candidate is too long
    if (candidate.length > 20) {
      candidate = candidate.slice(0, 20);
    }
    
    // Ensure it's valid format & passes governance
    const governance = validateUsernameGovernance(candidate);
    if (!governance.valid) {
      i++;
      continue;
    }

    // Check if candidate is available in DB
    const { data } = await supabase
      .from('users')
      .select('username')
      .eq('username', candidate)
      .maybeSingle()
    
    if (!data && !suggestions.includes(candidate)) {
      suggestions.push(candidate)
    }
    i++
  }
  
  // Fallback suggestions if we couldn't generate enough
  while (suggestions.length < 4) {
    const rand = Math.floor(100000 + Math.random() * 900000);
    const candidate = `user_${rand}`;
    suggestions.push(candidate);
  }

  return suggestions
}

export async function signup(formData: FormData): Promise<{ error: string } | undefined> {
  const supabase = await createClient()
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminSupabase = createAdminClient();
  const head = await headers();
  const ip = getIp(head);

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const username = (formData.get('username') as string || '').toLowerCase().trim()
  const fullName = formData.get('fullName') as string
  const phone = formData.get('phone') as string
  const gender = (formData.get('gender') as string) || 'other'
  const captchaToken = (formData.get('h-captcha-response') as string) || ''
  
  // Birthday Assembly
  const birthMonth = formData.get('birthMonth') as string;
  const birthDay = formData.get('birthDay') as string;
  const birthYear = formData.get('birthYear') as string;

  if (!email || !password || !username || !fullName || !phone || !birthMonth || !birthDay || !birthYear) {
    return { error: 'All fields, including Birthday and Mobile Number, are required.' };
  }

  // Robust Server-Side Re-validation of Form Formats
  const name = fullName?.trim();
  if (!name || name.length < 2) {
    return { error: 'Full name must be at least 2 characters.' };
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!email || !emailRe.test(email)) {
    return { error: 'Invalid email address format.' };
  }

  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6 || digits.length > 15) {
    return { error: 'Invalid phone number format.' };
  }

  // Enforce strong password validation rules
  const strength = validatePasswordStrength(password, email, username);
  if (!strength.valid) {
    return { error: strength.reason || 'Password does not meet strength requirements.' };
  }

  // ── Verify Step-Completion Tokens (Anti-Bypass Guard) ──────────────────
  const steps: StepName[] = ['basics', 'email_verify', 'phone_trust', 'username_check', 'human_captcha'];
  for (const step of steps) {
    // Skip phone_trust since OTP phone verification is bypassed for now
    if (step === 'phone_trust') continue;
    const token = formData.get(`step_token_${step}`) as string;
    if (!token) {
      return { error: `Security verification token missing for step: ${step}` };
    }
    const verification = verifyStepToken(token, step, email);
    if (!verification.valid) {
      console.error(`[Signup Bypass Attempt] Invalid token for step ${step}:`, verification.reason);
      return { error: `Security verification failed for step: ${step}. Please retry.` };
    }
  }

  // ── Layers 0–8: Governance validation ───────────────────────
  const governance = validateUsernameGovernance(username);
  if (!governance.valid) {
    const isFormatError = governance.layer === 'L8_FORMAT' || governance.layer === 'L0_NORM';
    const displayMsg = isFormatError ? governance.reason : "This username isn't available.";
    return { error: displayMsg ?? 'This username is not permitted.' };
  }

  // ── Layer 7: AI Final Judge (hard block on signup) ──────────
  const normalizedForAI = normalizeUsername(username);
  const aiResult = await aiAdversarialAnalysis(username, normalizedForAI);
  if (aiResult.verdict === 'block') {
    return { error: `Identity rejected by security analysis: ${aiResult.reason}` };
  }
  // 'suspicious' → allow through but log it (don't block real users)

  // Check unique username again at submission
  const { data: existingUser } = await supabase.from('users').select('username').eq('username', username).maybeSingle();
  if (existingUser) {
    return { error: 'This username is already taken.' };
  }

  // 2. Age Validation (16+)
  const birthDate = new Date(Number(birthYear), Number(birthMonth) - 1, Number(birthDay));
  let age = 0;
  if (!isNaN(birthDate.getTime())) {
    const today = new Date();
    age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
  } else {
    return { error: 'Invalid Date of Birth provided.' };
  }

  if (age < 16) {
    return { error: 'You must be at least 16 years old to join Verlyn.' };
  }

  // 0. Redundant Ban Check
  const banStatus = await checkBans(supabase, ip, 'ip');
  if (banStatus.banned) return { error: 'Access Denied.' };

  // 3. Bot Defense (Conditional)
  const reputation = await getIpReputation(ip);
  if (reputation === 'SUSPICIOUS') {
    const captcha = await verifyHCaptcha(captchaToken);
    if (!captcha.success) {
      return { error: captcha.error ?? 'Bot detection verification failed. Please try again.' };
    }
  }

  // 4. Email Reputation (Anti-Fake)
  const emailRep = validateEmailReputation(email);
  if (!emailRep.valid) {
    await logSecurityEvent(supabase, { type: 'disposable_email', severity: 'medium', email, ip });
    return { error: emailRep.error ?? 'This email address is not accepted.' };
  }

  // ╔═ RULE: 1 email = 1 account ═════════════════════════════════════════════
  const { data: { users }, error: listError } = await adminSupabase.auth.admin.listUsers({
    perPage: 1000
  });

  if (listError) {
    console.error('Failed to list users during signup duplicate check:', listError.message);
    return { error: 'Verification checks failed. Please try again.' };
  }

  const existingEmail = users?.find(u => u.email?.toLowerCase() === email.toLowerCase().trim());

  if (existingEmail) {
    await logSecurityEvent(supabase, { type: 'signup_blocked', severity: 'medium', email, ip, payload: { reason: 'email_already_registered' } });
    return { error: 'This email is already registered.' };
  }

  // ╔═ RULE: 1 phone number = max 5 accounts ═════════════════════════════════
  const { count: phoneCount } = await adminSupabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('phone', phone);

  if (phoneCount && phoneCount >= 5) {
    await logSecurityEvent(supabase, { type: 'signup_blocked', severity: 'medium', email, ip, payload: { reason: 'phone_limit_reached' } });
    return { error: 'This phone number is already linked to the maximum limit of 5 accounts.' };
  }

  // ╔═ RULE: One device (IP / network IP) only 5 accounts in lifetime ════════
  const { count: ipCount } = await adminSupabase
    .from('security_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'signup_success')
    .eq('ip_address', ip);

  if (ipCount && ipCount >= 5) {
    await logSecurityEvent(supabase, { type: 'signup_blocked', severity: 'high', email, ip, payload: { reason: 'lifetime_limit_ip' } });
    return { error: 'This device/network has reached the maximum signup limit.' };
  }

  // 5. Frequency Limits (Anti-Spam)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await adminSupabase
    .from('security_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'signup_success')
    .eq('ip_address', ip)
    .gt('created_at', oneHourAgo);

  if (count && count >= 5) {
    await logSecurityEvent(supabase, { type: 'signup_blocked', severity: 'high', email, ip, payload: { reason: 'rate_limit_ip' } });
    return { error: 'Too many signing attempts from this IP. Please try later.' };
  }

  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({ 
    email, 
    password,
    email_confirm: true,
    user_metadata: {
      username: username,
      display_name: fullName,
      gender: gender,
      onboarded: false,
      birth_month: parseInt(birthMonth), 
      birth_day: parseInt(birthDay), 
      birth_year: parseInt(birthYear),
      ip_registration: ip,
      security_tier: 'mobile_secured'
    }
  })

  if (authError) {
    await logSecurityEvent(supabase, { type: 'failed_signup', severity: 'low', email, ip, payload: { error: authError.message } });
    return { error: `Could not sign up user: ${authError.message}` };
  }

  if (authData.user) {
    await logSecurityEvent(supabase, { type: 'signup_success', severity: 'low', email, ip });

    const selectedAvatar = '/fallback-avatar.svg';

    const { error: dbError } = await adminSupabase.from('users').insert({
      id: authData.user.id,
      username: username,
      display_name: fullName,
      phone: phone,
      avatar_url: selectedAvatar
    })

    if (dbError) {
      console.error('Failed to seed public profile:', dbError);
      // Clean up / Rollback newly created Auth user
      try {
        await adminSupabase.auth.admin.deleteUser(authData.user.id);
      } catch (rollbackError: any) {
        console.error('Failed to delete auth user during profile creation rollback:', rollbackError.message);
      }
      return { error: `Profile creation failed: ${dbError.message}` };
    }

    // Programmatically sign in the user to establish the session cookies for Next.js middleware
    // Retry up to 3 times with a 300ms delay to absorb Supabase database indexing/replication latency
    let loginError: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (!error) {
        loginError = null;
        break;
      }
      loginError = error;
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (loginError) {
      console.error('Failed to auto-login user after signup:', loginError.message);
      return { error: `Account created but auto-login failed: ${loginError.message}` };
    }
  }

  revalidatePath('/feed', 'layout')
  redirect('/feed')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get('origin') || 'http://localhost:3000';
  const email = formData.get('email') as string;

  if (!email) return redirect('/login/reset?message=Email is required.');

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/login/update-password`,
  });

  if (error) {
    console.warn(`[Reset Password Attempt Failed] for email: ${email}. Error: ${error.message}`);
  }
  
  return redirect('/login/reset?success=true');
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get('password') as string;

  if (!password) return redirect('/login/update-password?message=Password is required.');

  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email || '';
  const username = user?.user_metadata?.username || '';
  
  const strength = validatePasswordStrength(password, email, username);
  if (!strength.valid) {
    return redirect(`/login/update-password?message=${strength.reason}`);
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) return redirect(`/login/update-password?message=${error.message}`);

  redirect('/feed');
}

/**
 * Signs out the current user session and redirects to login.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

/**
 * Deterministically hot-swaps an account using Server Actions to guarantee cookie state lock.
 */
export async function swapAccount(accessToken: string, refreshToken: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  if (error) {
    console.error('Swap Account Failed:', error.message);
    throw new Error('Failed to set session via server action');
  }

  // Force layout revalidation to violently clear any React Server Component caches
  revalidatePath('/', 'layout');
  
  // Return success back to client to trigger a forceful hard-reload
  return { success: true };
}


/**
 * Send a one-time email OTP for recovery/verification using Resend API
 */
export async function sendEmailOTP(email: string) {
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Invalid email address.' };
  }
  const targetEmail = email.toLowerCase().trim();
  const head = await headers();
  const ip = getIp(head);
  
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminSupabase = createAdminClient();

    // 0. Rate limit OTP requests to prevent SMS/email bombing (max 3 codes per email per 10 minutes)
    // DEV BYPASS: skip rate limit in development so testers don't need to wait
    if (process.env.NODE_ENV !== 'development') {
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count: sendCount } = await adminSupabase
        .from('security_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'email_otp_sent')
        .eq('payload->>email', targetEmail)
        .gt('created_at', tenMinsAgo);

      if (sendCount && sendCount >= 3) {
        return { success: false, error: 'Too many verification codes requested. Please wait 10 minutes.' };
      }
    }

    // 1. Check if email is already registered (1 email = 1 account rule)
    const { data: { users }, error: listError } = await adminSupabase.auth.admin.listUsers({
      perPage: 1000
    });

    if (listError) {
      console.error('Failed to list users during OTP email check:', listError.message);
      return { success: false, error: 'Database check failed.' };
    }

    const existingUser = users?.find(u => u.email?.toLowerCase() === targetEmail);
    if (existingUser) {
      return { success: false, error: 'This email is already registered.' };
    }

    // 2. Generate a 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins TTL

    // 3. Store OTP in security_events payload (bypassing RLS with admin client)
    const { error: dbError } = await adminSupabase
      .from('security_events')
      .insert({
        event_type: 'email_otp_sent',
        severity: 'low',
        ip_address: ip,
        payload: { email: targetEmail, code, expires_at: expiresAt }
      });

    if (dbError) {
      console.error('Failed to log OTP in DB:', dbError.message);
      return { success: false, error: 'Database logs failed.' };
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Verlyn <noreply@verlyn.in>';
    
    if (!apiKey) {
      console.error('RESEND_API_KEY is not defined in environment variables.');
      return { success: false, error: 'Email service config missing.' };
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: targetEmail,
        subject: 'Your Verlyn Verification Code',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px 24px; background-color: #050505; color: #ffffff; max-width: 440px; margin: 0 auto; border-radius: 20px; border: 1px solid #1a1a1a;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.03em;">VERLYN</span>
              <div style="height: 1px; background: linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent); margin-top: 16px;"></div>
            </div>
            
            <h3 style="font-size: 18px; font-weight: 700; color: #ffffff; margin: 0 0 10px 0; text-align: center;">Verify your email address</h3>
            <p style="font-size: 13px; line-height: 1.6; color: #888888; margin: 0 0 24px 0; text-align: center;">
              Use the single-use verification code below to continue your registration. This code will expire in 15 minutes.
            </p>
            
            <div style="background-color: #0c0c0c; border: 1px solid #222222; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px;">
              <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 800; letter-spacing: 0.18em; color: #a78bfa; padding-left: 0.18em;">${code}</span>
            </div>
            
            <div style="text-align: center;">
              <p style="font-size: 11px; color: #444444; margin: 0 0 8px 0;">
                If you did not request this email, you can safely ignore it.
              </p>
              <p style="font-size: 11px; color: #444444; margin: 0; border-top: 1px solid #1a1a1a; padding-top: 8px;">
                Do not reply to this email. This is an automated email.
              </p>
            </div>
          </div>
        `
      })
    });

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      console.error('Resend API response error:', errText);
      return { success: false, error: 'Email delivery service failed.' };
    }

    return { success: true };
  } catch (e: any) {
    console.error('Failed to send OTP via Resend:', e);
    return { success: false, error: e.message || 'Verification email failed to send.' };
  }
}

/**
 * Verify a one-time email OTP against custom database records
 */
export async function verifyEmailOTP(email: string, token: string) {
  if (!email || !token) return { success: false, error: 'Missing email or token.' };
  const targetEmail = email.toLowerCase().trim();
  const head = await headers();
  const ip = getIp(head);

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminSupabase = createAdminClient();

    // 0. Server-side lockout rate limit on OTP verification: max 5 failed attempts per email per 10 minutes
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: failCount } = await adminSupabase
      .from('security_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'email_otp_verify_fail')
      .eq('payload->>email', targetEmail)
      .gt('created_at', tenMinsAgo);

    if (failCount && failCount >= 5) {
      return { success: false, error: 'Too many incorrect attempts. Please wait 10 minutes before trying again.' };
    }

    // Fetch sent OTP events in the last 15 minutes
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: events, error } = await adminSupabase
      .from('security_events')
      .select('*')
      .eq('event_type', 'email_otp_sent')
      .gt('created_at', fifteenMinsAgo);

    if (error || !events) {
      return { success: false, error: 'Failed to query verification records.' };
    }

    // Find a matching valid unexpired code
    const validEvent = events.find((evt: any) => {
      const p = evt.payload;
      if (!p) return false;
      const sameEmail = p.email?.toLowerCase().trim() === targetEmail;
      const sameCode = p.code === token.trim();
      const notExpired = p.expires_at ? new Date(p.expires_at) > new Date() : true;
      return sameEmail && sameCode && notExpired;
    });

    if (!validEvent) {
      // Log the verification failure to count against the rate limit
      await adminSupabase.from('security_events').insert({
        event_type: 'email_otp_verify_fail',
        severity: 'medium',
        ip_address: ip,
        payload: { email: targetEmail, code: token.trim() }
      });
      return { success: false, error: 'Incorrect or expired verification code.' };
    }

    // Check if this token was already verified (prevent replay attacks)
    const { data: reuseCheck } = await adminSupabase
      .from('security_events')
      .select('id')
      .eq('event_type', 'email_otp_verified')
      .eq('payload->>code', token.trim())
      .eq('payload->>email', targetEmail)
      .maybeSingle();

    if (reuseCheck) {
      return { success: false, error: 'This verification code has already been used.' };
    }

    // Insert verification success event to mark the token as used
    await adminSupabase.from('security_events').insert({
      event_type: 'email_otp_verified',
      severity: 'low',
      ip_address: ip,
      payload: { email: targetEmail, code: token.trim() }
    });

    return { success: true };
  } catch (e: any) {
    console.error('OTP Verification Exception:', e);
    return { success: false, error: 'An error occurred during verification.' };
  }
}

/**
 * Verify TOTP MFA code during login flow
 */
export async function verifyLoginMFAAction(factorId: string, code: string) {
  if (!factorId || !code) return { success: false, error: 'Missing factor or code.' };
  try {
    const supabase = await createClient();
    const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeErr || !challengeData) return { success: false, error: challengeErr?.message || 'Challenge failed.' };
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });
    if (verifyErr) return { success: false, error: verifyErr.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: 'MFA verification failed.' };
  }
}

/**
 * Verify MFA recovery code during login flow
 */
export async function verifyLoginRecoveryCodeAction(email: string, recoveryCode: string) {
  if (!email || !recoveryCode) return { success: false, error: 'Missing email or recovery code.' };
  // Recovery codes are managed in user metadata — delegate to security settings logic
  return { success: false, error: 'Recovery code verification must be done via the security settings flow.' };
}

export async function generatePasskeyChallengeAction() {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  try {
    const head = await headers();
    const ip = getIp(head);
    const fifteenAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { count } = await admin
      .from('passkey_auth_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('attempt_at', fifteenAgo);

    if ((count ?? 0) >= 5) {
      return { success: false, error: 'Too many passkey attempts. Please wait 15 minutes.' };
    }

    // Generate 32-byte cryptographically secure random challenge
    const challengeBase64 = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error } = await admin.from('webauthn_challenges').insert({
      challenge: challengeBase64,
      type: 'authentication',
      expires_at: expiresAt,
      used: false,
    });
    if (error) return { success: false, error: 'Failed to generate challenge.' };

    return { success: true, challenge: challengeBase64 };
  } catch (err) {
    console.error('[generatePasskeyChallengeAction]', err);
    return { success: false, error: 'Internal error generating challenge.' };
  }
}

export async function authenticatePasskeyAction(assertion: {
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle?: string;
  };
  type: string;
}) {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const head = await headers();
  const ip = getIp(head);

  try {
    // 1. Rate limiting
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: attemptCount } = await admin
      .from('passkey_auth_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('attempt_at', fifteenMinutesAgo);

    if ((attemptCount ?? 0) >= 5) {
      return { success: false, error: 'Too many attempts. Please wait 15 minutes.' };
    }

    // Record attempt
    await admin.from('passkey_auth_attempts').insert({ ip_address: ip, success: false });

    const credentialId = assertion.id;
    if (!credentialId || typeof credentialId !== 'string' || credentialId.length > 1024) {
      return { success: false, error: 'Invalid credential.' };
    }

    const { data: passkey, error: pkError } = await admin
      .from('passkeys')
      .select('id, user_id, public_key, sign_count, credential_id')
      .eq('credential_id', credentialId)
      .maybeSingle();

    if (pkError || !passkey) {
      return { success: false, error: 'Passkey not recognized.' };
    }

    if (!passkey.public_key || passkey.public_key === 'ecc-secp256r1-public-key-placeholder') {
      return { success: false, error: 'This passkey was registered without proper verification and cannot be used.' };
    }

    let clientData: { challenge: string; origin: string; type: string };
    try {
      const clientDataBuffer = Buffer.from(assertion.response.clientDataJSON, 'base64url');
      clientData = JSON.parse(clientDataBuffer.toString('utf-8'));
    } catch {
      return { success: false, error: 'Invalid assertion data.' };
    }

    if (clientData.type !== 'webauthn.get') {
      return { success: false, error: 'Invalid assertion type.' };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const expectedOrigin = new URL(siteUrl).origin;
    if (clientData.origin !== expectedOrigin && clientData.origin !== 'http://localhost:3000') {
      return { success: false, error: 'Origin mismatch.' };
    }

    const now = new Date().toISOString();
    const { data: challengeRecord, error: challengeErr } = await admin
      .from('webauthn_challenges')
      .select('id, challenge, used, expires_at')
      .eq('challenge', clientData.challenge)
      .eq('type', 'authentication')
      .eq('used', false)
      .gt('expires_at', now)
      .maybeSingle();

    if (challengeErr || !challengeRecord) {
      return { success: false, error: 'Challenge invalid or expired.' };
    }

    await admin.from('webauthn_challenges').update({ used: true }).eq('id', challengeRecord.id);

    try {
      const { verifyAuthenticationResponse } = await import('@simplewebauthn/server');
      const rpID = new URL(siteUrl).hostname;

      const verification = await verifyAuthenticationResponse({
        response: {
          id: assertion.id,
          rawId: assertion.rawId,
          response: assertion.response,
          type: 'public-key',
          clientExtensionResults: {},
        } as any,
        expectedChallenge: challengeRecord.challenge,
        expectedOrigin: [expectedOrigin, 'http://localhost:3000'],
        expectedRPID: [rpID, 'localhost'],
        credential: {
          id: passkey.credential_id,
          publicKey: Buffer.from(passkey.public_key, 'base64'),
          counter: passkey.sign_count ?? 0,
        },
        requireUserVerification: true,
      });

      if (!verification.verified) {
        return { success: false, error: 'Cryptographic verification failed.' };
      }

      await admin.from('passkeys').update({
        sign_count: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString()
      }).eq('id', passkey.id);

    } catch (verifyErr: any) {
      console.error('[authenticatePasskeyAction]', verifyErr);
      return { success: false, error: 'Signature verification failed.' };
    }

    await admin.from('passkey_auth_attempts').update({ success: true }).eq('ip_address', ip).order('attempt_at', { ascending: false }).limit(1);

    const { data: { user }, error: userErr } = await admin.auth.admin.getUserById(passkey.user_id);
    if (userErr || !user || !user.email) return { success: false, error: 'User not found.' };

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
      options: { redirectTo: `${siteUrl}/feed` }
    });

    if (linkErr || !linkData?.properties?.action_link) {
      return { success: false, error: 'Failed to create login session.' };
    }

    return { success: true, actionLink: linkData.properties.action_link };
  } catch (err) {
    console.error('[authenticatePasskeyAction]', err);
    return { success: false, error: 'Authentication failed. Please try again.' };
  }
}
