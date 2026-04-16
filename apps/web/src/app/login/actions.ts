'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { verifyHCaptcha } from '@/lib/security/hcaptcha'
import { validateEmailReputation } from '@/lib/security/disposable'

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
  await supabase.from('security_events').insert({
    event_type: event.type,
    severity: event.severity,
    ip_address: event.ip,
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

export async function login(formData: FormData) {
  const supabase = await createClient()
  const head = await headers();
  const ip = getIp(head);

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const captchaToken = (formData.get('h-captcha-response') as string) || ''

  // 0. Redundant Ban Check
  const banStatus = await checkBans(supabase, ip, 'ip');
  if (banStatus.banned) {
      return redirect('/login?message=Access Denied: Your IP has been flagged.')
  }

  // 1. Bot Defense (Conditional)
  const reputation = await getIpReputation(ip);
  if (reputation === 'SUSPICIOUS') {
    const captcha = await verifyHCaptcha(captchaToken);
    if (!captcha.success) {
        await logSecurityEvent(supabase, { type: 'failed_login', severity: 'medium', email, ip, payload: { reason: 'captcha_required_failed' } });
        return redirect(`/login?message=${captcha.error}`)
    }
    console.log(`[Security] Challenge passed for suspicious IP: ${ip}`);
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    await logSecurityEvent(supabase, { type: 'failed_login', severity: 'low', email, ip, payload: { error: error.message } });
    return redirect(`/login?message=Could not authenticate user: ${error.message}`)
  }

  revalidatePath('/feed', 'layout')
  redirect('/feed')
}

export async function checkUsernameAvailability(username: string) {
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
    return { available: false, message: governance.reason, layer: governance.layer };
  }

  // ── Layer 7: AI Adversarial Analysis ────────────────────────
  const aiResult = await aiAdversarialAnalysis(username, normalized);
  
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
  const suffixes = ['_v', '_hq', '_legacy', '_official', 'x', '7']
  const suggestions: string[] = []
  
  let i = 0
  while (suggestions.length < 4 && i < 20) {
    const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)]
    const randomNumber = Math.floor(Math.random() * 99)
    const candidate = `${base}${randomSuffix}${randomNumber}`.toLowerCase()
    
    // Check if candidate is available
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
  
  return suggestions
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
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
    return redirect('/login?message=All fields, including Birthday and Mobile Number, are required.')
  }

  // 1. Strict Username Intelligence
  const usernameRegex = /^[a-z0-9_.]+$/;
  if (!usernameRegex.test(username)) {
    return redirect('/login?message=Username can only contain letters, numbers, underscores, and periods.')
  }

  if (username.endsWith('.')) {
    return redirect('/login?message=Username cannot end with a period.')
  }

  if (username.length < 5) {
    return redirect('/login?message=Username must be at least 5 characters.')
  }

  // ── Layers 0–6: Governance Gate ────────────────────────────
  const governance = validateUsernameGovernance(username);
  if (!governance.valid) {
    return redirect(`/login?message=${governance.reason ?? 'This username is not permitted.'}`)
  }

  // ── Layer 7: AI Final Judge (hard block on signup) ──────────
  const normalizedForAI = normalizeUsername(username);
  const aiResult = await aiAdversarialAnalysis(username, normalizedForAI);
  if (aiResult.verdict === 'block') {
    return redirect(`/login?message=Identity rejected by security analysis: ${aiResult.reason}`)
  }
  // 'suspicious' → allow through but log it (don't block real users)

  // Check unique username again at submission
  const { data: existingUser } = await supabase.from('users').select('username').eq('username', username).maybeSingle();
  if (existingUser) {
    return redirect('/login?message=This username is already taken.')
  }

  // 2. Age Validation (13+)
  const birthDate = new Date(`${birthYear}-${birthMonth}-${birthDay}`);
  const ageDiffMs = Date.now() - birthDate.getTime();
  const ageDate = new Date(ageDiffMs);
  const age = Math.abs(ageDate.getUTCFullYear() - 1970);

  if (age < 13) {
    return redirect('/login?message=You must be at least 13 years old to join Verlyn.')
  }

  // 0. Redundant Ban Check
  const banStatus = await checkBans(supabase, ip, 'ip');
  if (banStatus.banned) return redirect('/login?message=Access Denied.')

  // 3. Bot Defense (Conditional)
  const reputation = await getIpReputation(ip);
  if (reputation === 'SUSPICIOUS') {
    const captcha = await verifyHCaptcha(captchaToken);
    if (!captcha.success) {
      return redirect(`/login?message=${captcha.error}`)
    }
  }

  // 4. Email Reputation (Anti-Fake)
  const emailRep = validateEmailReputation(email);
  if (!emailRep.valid) {
    await logSecurityEvent(supabase, { type: 'disposable_email', severity: 'medium', email, ip });
    return redirect(`/login?message=${emailRep.error ?? 'This email address is not accepted.'}`)
  }

  // 5. Frequency Limits (Anti-Spam)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('security_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'signup_success')
    .eq('ip_address', ip)
    .gt('created_at', oneHourAgo);

  if (count && count >= 3) {
    await logSecurityEvent(supabase, { type: 'signup_blocked', severity: 'high', email, ip, payload: { reason: 'rate_limit_ip' } });
    return redirect('/login?message=Too many signing attempts from this IP. Please try later.')
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({ 
    email, 
    password,
    options: {
      data: {
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
    }
  })

  if (authError) {
    await logSecurityEvent(supabase, { type: 'failed_signup', severity: 'low', email, ip, payload: { error: authError.message } });
    return redirect(`/login?message=Could not sign up user: ${authError.message}`)
  }

  if (authData.user) {
    await logSecurityEvent(supabase, { type: 'signup_success', severity: 'low', email, ip });

    const avatars = {
      male: [
        '/avatars/m_hoodie.png',
        '/avatars/m_sunglasses.png',
        '/avatars/m_sparkles.png',
        '/avatars/m_suit.png',
      ],
      female: [
        '/avatars/f_hoodie.png',
        '/avatars/f_sunglasses.png',
        '/avatars/f_sparkles.png',
        '/avatars/f_office.png',
      ],
      other: [
        '/avatars/m_hoodie.png',
        '/avatars/f_hoodie.png',
        '/avatars/m_sunglasses.png',
        '/avatars/f_sunglasses.png',
      ]
    };
    const group = avatars[gender as keyof typeof avatars] || avatars.other;
    const selectedAvatar = group[Math.floor(Math.random() * group.length)];

    const { error: dbError } = await supabase.from('users').insert({
      id: authData.user.id,
      email: email,
      username: username,
      display_name: fullName,
      phone: phone,
      avatar_url: selectedAvatar
    })

    if (dbError) {
      console.error('Failed to seed public profile:', dbError)
      return redirect('/login?message=Profile creation failed. Please try again.')
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

  if (error) return redirect(`/login/reset?message=${error.message}`);
  
  return redirect('/login/reset?success=true');
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get('password') as string;

  if (!password) return redirect('/login/update-password?message=Password is required.');

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
