'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { headers } from 'next/headers';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuditVerificationData {
  username: string;
  email: string;
  displayName: string;
  phoneLast4: string;
  profileGender: string;
  communities: string;
  creationMonth: string;
  creationYear: string;
  lastPassword: string;
  location: string;
  frequentContacts: string;
  linkedOAuth: string[];
  devices: string[];
  userStatement: string;
}

interface CheckResult {
  field: string;
  submitted: string;
  actual: string | null;
  match: boolean | null;
}

function escapeHtml(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Telegram API ─────────────────────────────────────────────────────────────

export async function tgRequest(method: string, body: object) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err) {
    console.error(`Telegram ${method} failed:`, err);
    return null;
  }
}

// ─── IP Intelligence ──────────────────────────────────────────────────────────

async function fetchIPIntelligence(ip: string) {
  if (ip === '0.0.0.0' || ip === '127.0.0.1' || ip.startsWith('::')) {
    return { country: 'Local/Dev', city: '—', isp: '—', proxy: false, mobile: false, hosting: false };
  }
  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,city,isp,org,mobile,proxy,hosting,regionName`,
      { signal: AbortSignal.timeout(3000) }
    );
    const d = await res.json();
    return {
      country: d.country || '—',
      city: `${d.city || '—'}${d.regionName ? ', ' + d.regionName : ''}`,
      isp: d.isp || d.org || '—',
      proxy: !!d.proxy,
      mobile: !!d.mobile,
      hosting: !!d.hosting,
    };
  } catch {
    return { country: '—', city: '—', isp: '—', proxy: false, mobile: false, hosting: false };
  }
}

// ─── DB Cross-Check ───────────────────────────────────────────────────────────

async function crossCheckProfile(
  admin: ReturnType<typeof createAdminClient>,
  targetUserId: string,
  targetEmail: string | null,
  data: AuditVerificationData
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  const { data: profile } = await admin
    .from('users')
    .select('display_name, phone, gender, birth_month, birth_year, location, username, created_at')
    .eq('id', targetUserId)
    .maybeSingle();

  if (data.email) {
    results.push({
      field: 'Registered Email',
      submitted: data.email,
      actual: targetEmail,
      match: targetEmail ? targetEmail.toLowerCase() === data.email.toLowerCase() : false,
    });
  }

  if (data.displayName && profile) {
    results.push({
      field: 'Display Name',
      submitted: data.displayName,
      actual: profile.display_name || null,
      match: profile.display_name
        ? profile.display_name.toLowerCase().trim() === data.displayName.toLowerCase().trim()
        : false,
    });
  }

  if (data.phoneLast4 && profile?.phone) {
    const actualLast4 = String(profile.phone).replace(/\D/g, '').slice(-4);
    results.push({
      field: 'Phone Last 4 Digits',
      submitted: data.phoneLast4,
      actual: `****${actualLast4}`,
      match: actualLast4 === data.phoneLast4,
    });
  }

  if (data.profileGender && profile) {
    results.push({
      field: 'Gender / Profile Type',
      submitted: data.profileGender,
      actual: profile.gender || null,
      match: profile.gender
        ? profile.gender.toLowerCase() === data.profileGender.toLowerCase()
        : false,
    });
  }

  if ((data.creationYear || data.creationMonth) && profile?.created_at) {
    const createdAt = new Date(profile.created_at);
    const actualYear = String(createdAt.getFullYear());
    const actualMonth = String(createdAt.getMonth() + 1).padStart(2, '0');
    results.push({
      field: 'Account Creation Date',
      submitted: [data.creationMonth, data.creationYear].filter(Boolean).join('/') || '—',
      actual: `${actualMonth}/${actualYear}`,
      match:
        (!data.creationYear || actualYear === data.creationYear) &&
        (!data.creationMonth || actualMonth === data.creationMonth),
    });
  }

  if (data.frequentContacts) {
    const names = data.frequentContacts.split(/,\s*/).map(n => n.trim().toLowerCase()).filter(Boolean);
    if (names.length > 0) {
      const { data: contactProfiles } = await admin.from('users').select('username').in('username', names);
      const foundNames = (contactProfiles || []).map((p: any) => p.username.toLowerCase());
      results.push({
        field: 'Frequent Contacts',
        submitted: data.frequentContacts,
        actual: foundNames.length > 0 ? foundNames.join(', ') : 'None found in DB',
        match: names.every(n => foundNames.includes(n)),
      });
    }
  }

  if (data.location && profile?.location) {
    const locMatch =
      profile.location.toLowerCase().includes(data.location.toLowerCase()) ||
      data.location.toLowerCase().includes(profile.location.toLowerCase());
    results.push({
      field: 'Registration Location',
      submitted: data.location,
      actual: profile.location,
      match: locMatch,
    });
  }

  return results;
}

// ─── Deep Account Intelligence ────────────────────────────────────────────────

async function fetchDeepAccountData(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  ip: string
) {
  const [postsRes, followersRes, followingRes, secEventsRes, priorCasesRes, priorCasesIPRes, authRes] =
    await Promise.all([
      admin.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', userId),
      admin.from('followers').select('id', { count: 'exact', head: true }).eq('following_id', userId),
      admin.from('followers').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
      admin.from('security_events').select('event_type, severity, created_at')
        .eq('payload->>email', userId).order('created_at', { ascending: false }).limit(5),
      admin.from('manual_audit_requests').select('id, status, created_at')
        .eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
      admin.from('manual_audit_requests').select('id', { count: 'exact', head: true })
        .eq('ip_address', ip),
      admin.auth.admin.getUserById(userId),
    ]);

  const u = authRes.data?.user;
  const mfaFactors = (u as any)?.factors;
  const has2FA = Array.isArray(mfaFactors) && mfaFactors.length > 0;
  const lastSignIn = u?.last_sign_in_at
    ? new Date(u.last_sign_in_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    : 'Unknown';
  const accountCreated = u?.created_at
    ? new Date(u.created_at).toLocaleDateString('en-IN')
    : '—';
  const emailConfirmed = u?.email_confirmed_at ? '✅ Verified' : '⚠️ Unverified';
  const daysSinceCreation = u?.created_at
    ? Math.floor((Date.now() - new Date(u.created_at).getTime()) / 86400000)
    : 0;

  return {
    postCount: postsRes.count ?? 0,
    followerCount: followersRes.count ?? 0,
    followingCount: followingRes.count ?? 0,
    lastSignIn,
    accountCreated,
    emailConfirmed,
    has2FA,
    daysSinceCreation,
    priorCases: priorCasesRes.data || [],
    priorCasesFromIP: priorCasesIPRes.count ?? 0,
    recentSecEvents: secEventsRes.data || [],
    isBanned: !!(u as any)?.banned_until,
  };
}

// ─── Fraud Signal Engine ──────────────────────────────────────────────────────

function computeFraudSignals(
  checks: CheckResult[],
  ipData: { proxy: boolean; hosting: boolean; mobile: boolean },
  accountData: {
    daysSinceCreation: number;
    emailConfirmed: string;
    has2FA: boolean;
    priorCasesFromIP: number;
    recentSecEvents: any[];
    priorCases: any[];
  }
) {
  const signals: { label: string; risk: 'good' | 'warn' | 'bad' }[] = [];

  signals.push({
    label: accountData.emailConfirmed === '✅ Verified' ? 'Email verified on file' : 'Email NOT verified',
    risk: accountData.emailConfirmed === '✅ Verified' ? 'good' : 'bad',
  });

  signals.push({
    label: accountData.daysSinceCreation > 180
      ? `Account age: ${accountData.daysSinceCreation}d (established)`
      : `Account age: ${accountData.daysSinceCreation}d (new account)`,
    risk: accountData.daysSinceCreation > 180 ? 'good' : 'warn',
  });

  signals.push({
    label: accountData.has2FA ? '2FA / MFA enabled' : '2FA not enabled',
    risk: accountData.has2FA ? 'good' : 'warn',
  });

  signals.push({
    label: ipData.proxy ? 'VPN / Proxy detected on IP' : 'No VPN/Proxy detected',
    risk: ipData.proxy ? 'bad' : 'good',
  });

  signals.push({
    label: ipData.hosting ? 'Datacenter / Hosting IP' : 'Residential / Mobile IP',
    risk: ipData.hosting ? 'bad' : 'good',
  });

  signals.push({
    label: accountData.priorCasesFromIP > 0
      ? `${accountData.priorCasesFromIP} prior case(s) from this IP`
      : 'No prior cases from this IP',
    risk: accountData.priorCasesFromIP > 2 ? 'bad' : accountData.priorCasesFromIP > 0 ? 'warn' : 'good',
  });

  signals.push({
    label: accountData.recentSecEvents.length > 0
      ? `${accountData.recentSecEvents.length} recent security event(s)`
      : 'No recent security events',
    risk: accountData.recentSecEvents.length > 3 ? 'bad' : accountData.recentSecEvents.length > 0 ? 'warn' : 'good',
  });

  signals.push({
    label: accountData.priorCases.length > 0
      ? `${accountData.priorCases.length} prior audit request(s)`
      : 'First-time audit request',
    risk: accountData.priorCases.length > 2 ? 'bad' : accountData.priorCases.length > 0 ? 'warn' : 'good',
  });

  const badCount = signals.filter(s => s.risk === 'bad').length;
  const warnCount = signals.filter(s => s.risk === 'warn').length;
  const goodCount = signals.filter(s => s.risk === 'good').length;

  const checkedCount = checks.filter(c => c.match !== null).length;
  const matchCount = checks.filter(c => c.match === true).length;
  const fieldScore = checkedCount > 0 ? Math.round((matchCount / checkedCount) * 100) : 50;

  const signalScore = Math.max(0, Math.round(((goodCount - badCount * 2 - warnCount) / signals.length) * 100));
  const finalScore = Math.round((fieldScore * 0.6) + (signalScore * 0.4));

  return { signals, finalScore, badCount, warnCount, goodCount };
}

// ─── Security Event Logger ────────────────────────────────────────────────────

async function logSecurityEvent(supabase: any, event: {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  email?: string;
  ip?: string;
  payload?: any;
}) {
  try {
    await supabase.from('security_events').insert({
      event_type: event.type,
      severity: event.severity,
      ip_address: event.ip,
      payload: { email: event.email, ...event.payload },
    });
  } catch {}
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function submitManualAuditRequest(
  identifier: string,
  data: AuditVerificationData
) {
  if (!identifier) return { success: false, error: 'Please specify your username or email.' };
  if (!data.userStatement.trim() || data.userStatement.trim().length < 20)
    return { success: false, error: 'Please provide a statement (minimum 20 characters).' };

  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const cleanIdentifier = identifier.trim().toLowerCase();

    // ── 1. Resolve User ──────────────────────────────────────────────────────
    let targetUserId: string | null = null;
    let targetEmail: string | null = null;

    if (cleanIdentifier.includes('@')) {
      let page = 1;
      while (true) {
        const { data: authData, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !authData.users?.length) break;
        const match = authData.users.find(u => u.email?.toLowerCase() === cleanIdentifier);
        if (match) { targetUserId = match.id; targetEmail = match.email || null; break; }
        if (authData.users.length < 1000) break;
        page++;
      }
    } else {
      const { data: userProfile } = await admin.from('users').select('id').ilike('username', cleanIdentifier).maybeSingle();
      if (userProfile?.id) {
        targetUserId = userProfile.id;
        const { data: authUser } = await admin.auth.admin.getUserById(userProfile.id);
        if (authUser?.user?.email) targetEmail = authUser.user.email;
      }
    }

    const head = await headers();
    const ip = (head.get('x-forwarded-for') || head.get('x-real-ip') || '0.0.0.0').split(',')[0].trim();
    const userAgent = head.get('user-agent') || 'Unknown';
    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // ── 2. Gather All Intelligence in Parallel ───────────────────────────────
    const [checks, ipData, accountData] = await Promise.all([
      targetUserId
        ? crossCheckProfile(admin, targetUserId, targetEmail, data)
        : Promise.resolve([]),
      fetchIPIntelligence(ip),
      targetUserId
        ? fetchDeepAccountData(admin, targetUserId, ip)
        : Promise.resolve({
            postCount: 0, followerCount: 0, followingCount: 0, lastSignIn: 'N/A',
            accountCreated: '—', emailConfirmed: '—', has2FA: false, daysSinceCreation: 0,
            priorCases: [], priorCasesFromIP: 0, recentSecEvents: [], isBanned: false,
          }),
    ]);

    if (targetUserId) {
      await logSecurityEvent(supabase, {
        type: 'manual_audit_requested', severity: 'medium',
        email: targetEmail || undefined, ip,
        payload: { checks_count: checks.length },
      });
    }

    // ── 3. Fraud Signal Engine ───────────────────────────────────────────────
    const { signals, finalScore, badCount, warnCount } = computeFraudSignals(checks, ipData, accountData);

    const riskLevel =
      !targetUserId ? { label: 'UNRESOLVED — Account Not Found', icon: '⬛', bar: '░░░░░░░░░░' }
      : finalScore >= 80 ? { label: 'LOW RISK — Likely Legitimate', icon: '🟢', bar: '██████████' }
      : finalScore >= 55 ? { label: 'MEDIUM RISK — Proceed Carefully', icon: '🟡', bar: '██████░░░░' }
      : finalScore >= 30 ? { label: 'HIGH RISK — Suspicious Activity', icon: '🔴', bar: '███░░░░░░░' }
      : { label: 'CRITICAL — Likely Fraudulent', icon: '⛔', bar: '█░░░░░░░░░' };

    // ── 4. DB Insert ─────────────────────────────────────────────────────────
    const statementForDB = [
      `=== IDENTITY AUDIT CASE ===`,
      `Filed: ${now} IST`,
      `IP: ${ip}  |  Agent: ${userAgent}`,
      ``,
      `Username: ${data.username || '—'}`,
      `Email: ${data.email || '—'}`,
      `Display Name: ${data.displayName || '—'}`,
      `Phone Last 4: ${data.phoneLast4 || '—'}`,
      `Gender: ${data.profileGender || '—'}`,
      `Communities: ${data.communities || '—'}`,
      `Creation: ${[data.creationMonth, data.creationYear].filter(Boolean).join('/') || '—'}`,
      `Last Password: ${data.lastPassword ? '[PROVIDED — HASH NOT STORED]' : '—'}`,
      `Location: ${data.location || '—'}`,
      `Frequent Contacts: ${data.frequentContacts || '—'}`,
      `OAuth: ${data.linkedOAuth.join(', ') || 'None'}`,
      `Devices: ${data.devices.join(', ') || 'None'}`,
      ``,
      `Trust Score: ${finalScore}% — ${riskLevel.label}`,
      `Fraud Signals: ${badCount} high-risk, ${warnCount} warnings`,
      ``,
      `=== USER STATEMENT ===`,
      data.userStatement.trim(),
    ].join('\n');

    const { data: insertedCase, error: insertError } = await admin
      .from('manual_audit_requests')
      .insert({ user_id: targetUserId, statement: statementForDB, ip_address: ip, status: 'PENDING' })
      .select('id').single();

    if (insertError) throw insertError;
    const caseId = insertedCase?.id || 'N/A';

    // ── 5. Build Telegram Message ────────────────────────────────────────────
    const D = '─'.repeat(28);
    const H = '━'.repeat(30);

    // Network block
    const vpnFlag = ipData.proxy ? '⚠️ VPN/PROXY DETECTED' : ipData.hosting ? '⚠️ DATACENTER IP' : '✅ Clean IP';
    const networkBlock = [
      `🌐 <b>IP:</b> <code>${escapeHtml(ip)}</code>  ${vpnFlag}`,
      `🏳 ${escapeHtml(ipData.city)}, ${escapeHtml(ipData.country)}`,
      `📡 ISP: ${escapeHtml(ipData.isp)}  |  ${ipData.mobile ? '📱 Mobile' : '🖥 Broadband'}`,
      `🗂 Prior cases from IP: <b>${accountData.priorCasesFromIP}</b>`,
    ].join('\n');

    // Account block
    const accountBlock = targetUserId ? [
      `✅ <b>ACCOUNT FOUND</b>`,
      `📧 <code>${escapeHtml(targetEmail || cleanIdentifier)}</code>`,
      `🆔 <code>${targetUserId.slice(0, 12)}…</code>`,
      `📅 Joined: <b>${escapeHtml(accountData.accountCreated)}</b>  (${accountData.daysSinceCreation}d ago)`,
      `🕐 Last Active: <b>${escapeHtml(accountData.lastSignIn)}</b>`,
      `🔐 Email: <b>${escapeHtml(accountData.emailConfirmed)}</b>  |  2FA: <b>${accountData.has2FA ? '✅ ON' : '❌ OFF'}</b>`,
      accountData.isBanned ? '⛔ <b>ACCOUNT IS CURRENTLY BANNED</b>' : '✅ Account Status: Active',
    ].join('\n') : `❌ <b>ACCOUNT NOT FOUND</b>\n🔎 Identifier: <code>${escapeHtml(cleanIdentifier)}</code>`;

    // Vitals block
    const vitalsBlock = targetUserId
      ? `📝 Posts: <b>${accountData.postCount}</b>  |  👥 Followers: <b>${accountData.followerCount}</b>  |  Following: <b>${accountData.followingCount}</b>\n📂 Prior Audit Cases: <b>${accountData.priorCases.length}</b>  |  🔔 Security Events: <b>${accountData.recentSecEvents.length}</b>`
      : '—';

    // Checks block
    const checksBlock = checks.length > 0
      ? `${checks.map(c => {
          const icon = c.match === true ? '✅' : c.match === false ? '❌' : '❓';
          return `${icon} <b>${escapeHtml(c.field)}:</b> <code>${escapeHtml(c.submitted)}</code>${c.actual ? ` <i>→ ${escapeHtml(c.actual)}</i>` : ''}`;
        }).join('\n')}\n\n<b>${checks.filter(c => c.match === true).length}/${checks.filter(c => c.match !== null).length} fields matched</b>`
      : '⚠️ No fields could be cross-checked (account not found).';

    // Fraud signals block
    const fraudBlock = signals.map(s => {
      const icon = s.risk === 'good' ? '✅' : s.risk === 'warn' ? '⚠️' : '❌';
      return `${icon} ${escapeHtml(s.label)}`;
    }).join('\n');

    const statementPreview = data.userStatement.length > 200
      ? data.userStatement.slice(0, 200) + '…'
      : data.userStatement;

    const escapedDevices = (data.devices || []).map(escapeHtml).join(', ');
    const escapedOAuth = (data.linkedOAuth || []).map(escapeHtml).join(', ');

    const msgText = [
      `🛡 <b>VERLYN SECURITY — IDENTITY AUDIT REPORT</b>`,
      H,
      ``,
      `🗂 <b>CASE:</b> <code>${escapeHtml(caseId)}</code>`,
      `📅 <b>Filed:</b> ${now} IST`,
      `💻 Devices: ${escapedDevices || '—'}  |  OAuth: ${escapedOAuth || 'None'}`,
      ``,
      D,
      `🌐 <b>NETWORK INTELLIGENCE</b>`,
      networkBlock,
      ``,
      D,
      `👤 <b>ACCOUNT LOOKUP</b>`,
      accountBlock,
      ``,
      D,
      `📊 <b>ACCOUNT VITALS</b>`,
      vitalsBlock,
      ``,
      D,
      `🔎 <b>FIELD VERIFICATION (${checks.length} checks)</b>`,
      checksBlock,
      ``,
      D,
      `🧠 <b>FRAUD SIGNAL ANALYSIS</b>`,
      fraudBlock,
      ``,
      `${riskLevel.icon} <b>TRUST SCORE: ${finalScore}% — ${escapeHtml(riskLevel.label)}</b>`,
      `<code>[${riskLevel.bar}]</code>`,
      ``,
      D,
      `💬 <b>USER STATEMENT:</b>`,
      `<i>${escapeHtml(statementPreview)}</i>`,
    ].join('\n');

    // ── 6. Professional Keyboard — 14 Buttons ───────────────────────────────
    const keyboard = {
      inline_keyboard: [
        [{ text: '✅  APPROVE — Grant Password Reset', callback_data: `approve:${caseId}` }],
        [
          { text: '❌  REJECT', callback_data: `reject:${caseId}` },
          { text: '🔍  ESCALATE', callback_data: `escalate:${caseId}` },
        ],
        [
          { text: '🧊  FREEZE 48h', callback_data: `freeze:${caseId}` },
          { text: '🔒  PERMANENT BAN', callback_data: `ban:${caseId}` },
        ],
        [
          { text: '🚨  FLAG FRAUDULENT', callback_data: `flag:${caseId}` },
          { text: '📵  REVOKE SESSIONS', callback_data: `revoke:${caseId}` },
        ],
        [
          { text: '📋  Full Statement', callback_data: `viewfull:${caseId}` },
          { text: '👤  Deep Profile', callback_data: `accountdetails:${caseId}` },
        ],
        [
          { text: '🌍  IP Intelligence', callback_data: `ipintel:${caseId}` },
          { text: '🔐  Security Log', callback_data: `seclog:${caseId}` },
        ],
        [
          { text: '📧  Email User', callback_data: `emailuser:${caseId}` },
          { text: '🕵️  Similar Cases', callback_data: `similarcases:${caseId}` },
        ],
        [
          { text: '📌  Mark HIGH PRIORITY', callback_data: `priority:${caseId}` },
          { text: '🔄  Under Review', callback_data: `review:${caseId}` },
        ],
        [{ text: '⏳  Request More Info from User', callback_data: `moreinfo:${caseId}` }],
      ],
    };

    await tgRequest('sendMessage', {
      chat_id: process.env.TELEGRAM_ADMIN_CHAT_ID,
      text: msgText,
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });

    return { success: true };
  } catch (err: any) {
    console.error('Manual Audit Error:', err);
    return { success: false, error: 'Failed to register manual audit request.' };
  }
}
