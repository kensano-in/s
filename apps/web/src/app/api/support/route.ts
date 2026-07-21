import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supportTicketLimiter } from '@/lib/coming-soon/rateLimit';
import { analyzeSpam } from '@/lib/coming-soon/spam';
import { getClientIp, hashIp, securityHeaders, deepSanitize, buildSessionFingerprint, isMaintenanceMode, calculatePriority } from '@/lib/coming-soon/secureComm';
import { auditTicketCreate, auditRateLimit, auditSpamDetect } from '@/lib/coming-soon/audit';

// ── Validation constants ───────────────────────────────────────────────────────
const SUBJECT_MIN_WORDS = 5;
const SUBJECT_MAX_CHARS = 120;
const DESC_MIN_WORDS    = 30;
const DESC_MAX_CHARS    = 1500;
const NAME_MAX_CHARS    = 80;

const wordCount = (str: string) => str.trim().split(/\s+/).filter(Boolean).length;

const VALID_REPORT_TYPES = ['general', 'tech', 'security', 'account', 'billing', 'bug', 'legal', 'partnership', 'suggestion', 'customize', 'emergency', 'registration'];

// ── POST: Submit new ticket ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const headers = securityHeaders();

  try {
    const ip = getClientIp(req);
    const ipHash = hashIp(ip);
    const sessionFp = buildSessionFingerprint(req);

    // ── Global Maintenance Mode Check ─────────────────────────────────────────
    const maintenance = await isMaintenanceMode();
    if (maintenance) {
      return NextResponse.json(
        { error: 'Systems are currently undergoing scheduled maintenance. New requests are temporarily paused.' },
        { status: 503, headers }
      );
    }

    // ── Rate limit ─────────────────────────────────────────────────────────────
    const rl = supportTicketLimiter(ipHash);
    if (!rl.allowed) {
      await auditRateLimit(ipHash, '/api/support');
      return NextResponse.json(
        { error: `Rate limit exceeded. You may submit again in ${rl.retryAfter} seconds.` },
        { status: 429, headers: { ...headers, 'Retry-After': String(rl.retryAfter) } }
      );
    }

    // ── Parse & sanitize body ─────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400, headers });
    }

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers });
    }

    const raw = body as Record<string, unknown>;
    const fullName   = deepSanitize(raw.fullName, NAME_MAX_CHARS);
    const email      = deepSanitize(raw.email, 254).toLowerCase();
    const subject    = deepSanitize(raw.subject, SUBJECT_MAX_CHARS);
    const reportType = deepSanitize(raw.reportType, 50);
    const description = deepSanitize(raw.description, DESC_MAX_CHARS);
    const agreed     = Boolean(raw.agreed);

    // ── Field validation ──────────────────────────────────────────────────────
    if (!fullName || !email || !subject || !reportType || !description || !agreed) {
      return NextResponse.json(
        { error: 'All fields are required and terms must be accepted.' },
        { status: 400, headers }
      );
    }

    if (!VALID_REPORT_TYPES.includes(reportType) && !reportType.startsWith('Custom: ')) {
      return NextResponse.json({ error: 'Invalid report type.' }, { status: 400, headers });
    }

    // ── Database Verification ─────────────────────────────────────────────────
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Enforce Registered User Only Rule (Except Registration Issues)
    if (reportType !== 'registration') {
      // 1. Check if user exists in the registered users table
      const { data: userExists } = await supabaseAdmin
        .from('registered_users')
        .select('id')
        .eq('email', email)
        .single();

      let isRegistered = !!userExists;

      // 2. Check if user exists in preregistrations table as fallback
      if (!isRegistered) {
        const { data: preregExists } = await supabaseAdmin
          .from('preregistrations')
          .select('id')
          .eq('email', email)
          .single();
        if (preregExists) isRegistered = true;
      }

      if (!isRegistered) {
        return NextResponse.json(
          { error: 'Support is only available for registered users. Please use the "Problem in registration" option if you need help signing up.' },
          { status: 403, headers }
        );
      }
    }

    // ── Spam analysis ─────────────────────────────────────────────────────────
    const subjectSpam     = analyzeSpam(subject, 'subject');
    const descriptionSpam = analyzeSpam(description, 'description');
    const nameSpam        = analyzeSpam(fullName, 'name');

    const allSignals = [
      ...subjectSpam.signals.map(s => `subject:${s}`),
      ...descriptionSpam.signals.map(s => `desc:${s}`),
      ...nameSpam.signals.map(s => `name:${s}`),
    ];

    const riskScore = Math.min(
      100,
      Math.round((subjectSpam.score * 0.35) + (descriptionSpam.score * 0.55) + (nameSpam.score * 0.1))
    );

    if (riskScore >= 60) {
      await auditSpamDetect(ipHash, 'all');
      return NextResponse.json(
        { error: 'Your submission was flagged as spam. Please write a genuine, detailed description of your issue.' },
        { status: 400, headers }
      );
    }

    const caseId = `CASE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const priority = calculatePriority(reportType, riskScore);
    const userAgent = req.headers.get('user-agent') ?? 'unknown';

    const { data: insertedTicket, error: dbError } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        case_id:      caseId,
        full_name:    fullName,
        email,
        subject,
        report_type:  reportType,
        description,
        status:       'Received',
        priority:     priority,
        ip_address:   ip,
        user_agent:   userAgent,
      })
      .select('case_id')
      .single();

    if (dbError || !insertedTicket) {
      console.error('[Support API] DB write failed or returned null:', dbError?.message || 'No row returned');
      return NextResponse.json({ error: 'Failed to record ticket in secure database. Please try again.' }, { status: 500, headers });
    }

    await auditTicketCreate(ipHash, caseId);

    // ── Telegram Notification for Emergency & Registration ────────────────────
    if (reportType === 'emergency' || reportType === 'registration') {
      try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID || '7814788493'; // Fallback chat ID if not set
        
        if (botToken) {
          const text = `[ 𝗘𝗡𝗖𝗥𝗬𝗣𝗧𝗘𝗗 𝗗𝗢𝗦𝗦𝗜𝗘𝗥 ]\n` +
                       `𝗜𝗗: \`${caseId}\`\n` +
                       `━━━━━━━━━━━━━━━━━━━\n` +
                       `𝗦𝗧𝗔𝗧𝗨𝗦   :: [ NEW INCOMING ]\n` +
                       `𝗖𝗟𝗜𝗘𝗡𝗧   :: ${fullName.toUpperCase()}\n` +
                       `𝗖𝗢𝗡𝗧𝗔𝗖𝗧  :: \`${email}\`\n` +
                       `𝗣𝗥𝗜𝗢𝗥𝗜𝗧𝗬 :: URGENT\n` +
                       `━━━━━━━━━━━━━━━━━━━\n` +
                       `*SUBJECT:*\n> ${subject}\n\n` +
                       `*PAYLOAD:*\n> ${description.substring(0, 300)}${description.length > 300 ? '...' : ''}\n\n` +
                       `[ 𝗜𝗡𝗧𝗘𝗟: SECURED ]   [ 𝗧𝗜𝗠𝗘: ${new Date().toISOString().split('T')[1].slice(0, 5)} UTC ]\n` +
                       `━━━━━━━━━━━━━━━━━━━`;
          
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '⚡ REPLY', callback_data: `reply_hint_${caseId}` }, { text: '🤖 AI AUTO', callback_data: `ai_reply_${caseId}` }, { text: '🖥️ WEB', web_app: { url: `https://verlyn.in/tg-admin?case_id=${caseId}` } }],
                  [{ text: '🔍 TRACE IP', callback_data: `ip_intel_${caseId}` }, { text: '⚠️ ESCALATE', callback_data: `escalate_${caseId}` }],
                  [{ text: '🛡️ QUARANTINE', callback_data: `quarantine_${caseId}` }, { text: '🗑️ PURGE LOGS', callback_data: `purge_${caseId}` }],
                  [{ text: '✅ RESOLVE', callback_data: `resolve_${caseId}` }, { text: '🚫 PERMA-BAN', callback_data: `ban_${caseId}` }]
                ]
              }
            })
          });
        } else {
          console.warn('[Support API] Telegram bot token not configured in environment variables.');
        }
      } catch (err) {
        console.error('Telegram API error:', err);
      }
    }

    return NextResponse.json({
      success:    true,
      case_id:    caseId,
      status:     'Received',
      date_filed: new Date().toISOString(),
    }, { status: 200, headers });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Support API] Unhandled error:', msg);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers });
  }
}

// ── PATCH: User reply to existing ticket ─────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const headers = securityHeaders();

  try {
    const ip = getClientIp(req);
    const ipHash = hashIp(ip);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400, headers });
    }

    const raw = body as Record<string, unknown>;
    const case_id = deepSanitize(raw.case_id, 32);
    const message = deepSanitize(raw.message, 1000);

    if (!case_id || !message) {
      return NextResponse.json({ error: 'Missing case_id or message.' }, { status: 400, headers });
    }

    const spamCheck = analyzeSpam(message, 'description');
    if (spamCheck.isSpam) {
      return NextResponse.json({ error: 'Reply rejected by spam filter.' }, { status: 400, headers });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: ticket, error: fetchErr } = await supabaseAdmin
      .from('support_tickets')
      .select('description, status')
      .eq('case_id', case_id)
      .single();

    if (fetchErr || !ticket) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404, headers });
    }

    if (['Completed', 'Closed'].includes(ticket.status)) {
      return NextResponse.json({ error: 'Cannot reply to a closed ticket.' }, { status: 400, headers });
    }

    const newDescription = `${ticket.description}\n\n[USER_REPLY — ${new Date().toISOString()}]\n${message}`;

    const { error: updateErr } = await supabaseAdmin
      .from('support_tickets')
      .update({ description: newDescription, status: 'In progress', admin_reply: null })
      .eq('case_id', case_id);

    if (updateErr) throw updateErr;

    // ── Notify Telegram ──────────────────────────────────────────────────────
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID || '7814788493';
      if (botToken) {
          const text = `[ 𝗨𝗣𝗗𝗔𝗧𝗘𝗗 𝗗𝗢𝗦𝗦𝗜𝗘𝗥 ]\n` +
                       `𝗜𝗗: \`${case_id}\`\n` +
                       `━━━━━━━━━━━━━━━━━━━\n` +
                       `𝗦𝗧𝗔𝗧𝗨𝗦   :: [ USER REPLIED ]\n` +
                       `━━━━━━━━━━━━━━━━━━━\n` +
                       `*NEW PAYLOAD:*\n> ${message.substring(0, 300)}${message.length > 300 ? '...' : ''}\n\n` +
                       `[ 𝗜𝗡𝗧𝗘𝗟: SECURED ]   [ 𝗧𝗜𝗠𝗘: ${new Date().toISOString().split('T')[1].slice(0, 5)} UTC ]\n` +
                       `━━━━━━━━━━━━━━━━━━━`;
          
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '⚡ QUICK REPLY', callback_data: `reply_hint_${case_id}` }, { text: '🖥️ WEB CONSOLE', web_app: { url: `https://verlyn.in/tg-admin?case_id=${case_id}` } }],
                  [{ text: '🔍 TRACE IP', callback_data: `ip_intel_${case_id}` }, { text: '⚠️ ESCALATE', callback_data: `escalate_${case_id}` }],
                  [{ text: '✅ RESOLVE', callback_data: `resolve_${case_id}` }, { text: '🚫 PERMA-BAN', callback_data: `ban_${case_id}` }]
                ]
              }
            })
          });
      }
    } catch (e) { console.error('TG Notification error:', e); }

    return NextResponse.json({ success: true }, { status: 200, headers });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Support API PATCH]', msg);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers });
  }
}
