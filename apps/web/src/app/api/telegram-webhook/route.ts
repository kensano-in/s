import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { tgRequest } from '@/app/login/audit-actions';
import { invalidateBanCache } from '@/lib/security/ban-cache';
import { applyTrustEvent } from '@/lib/moderation/trust-score';

const CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID!;
const RESEND_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Verlyn <noreply@verlyn.in>';

function escapeHtml(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function answer(id: string, text: string, alert = false) {
  await tgRequest('answerCallbackQuery', { callback_query_id: id, text, show_alert: alert });
}

async function sendMsg(text: string, extra: object = {}) {
  await tgRequest('sendMessage', { chat_id: CHAT_ID, text, parse_mode: 'HTML', ...extra });
}

async function editKeyboard(msgId: number, keyboard: object) {
  await tgRequest('editMessageReplyMarkup', {
    chat_id: CHAT_ID, message_id: msgId, reply_markup: keyboard,
  });
}

async function closeCaseMessage(msgId: number, originalText: string, badge: string, color: string, actor: string, caseId: string) {
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  await tgRequest('editMessageText', {
    chat_id: CHAT_ID,
    message_id: msgId,
    text: originalText + `\n\n${'━'.repeat(30)}\n${color} <b>DECISION: ${badge}</b>\n👤 By: ${actor}  |  🕐 ${now} IST`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: `${badge} — Case Closed`, callback_data: `noop:${caseId}` }]],
    },
  });
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_KEY) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    return res.ok;
  } catch { return false; }
}

// ─── Webhook Handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cq = body.callback_query;
    if (!cq) return NextResponse.json({ ok: true });

    const { id: cbId, data: cbData, message, from } = cq;

    if (!cbData || cbData.startsWith('noop:')) {
      await answer(cbId, '✋ This case is already closed or actioned.');
      return NextResponse.json({ ok: true });
    }

    const parts = (cbData as string).split(':');
    const action = parts[0];
    const caseId = parts[1];
    const msgId: number = message.message_id;
    const originalText: string = message.text || '';
    const actor = escapeHtml(from?.first_name || from?.username || 'Admin');
    const admin = createAdminClient();
    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // ─── USER REPORTS WEBHOOK CALLBACK HANDLER ───────────────────────────────
    if (action.startsWith('rpt_')) {
      const reportId = parts[1];

      // Helper: fetch report detail
      async function resolveReport() {
        const { data } = await admin.from('reports')
          .select('reporter_id, reported_user_id, reason, status')
          .eq('id', reportId)
          .maybeSingle();
        return data;
      }

      // Helper: get target user ID
      async function getTargetUserId(targetType: string) {
        const report = await resolveReport();
        if (!report) return null;
        return targetType === 'reported' ? report.reported_user_id : report.reporter_id;
      }

      // Helper: get target user labels
      async function getTargetLabels(targetUserId: string) {
        const { data: p } = await admin.from('users')
          .select('username, display_name')
          .eq('id', targetUserId)
          .maybeSingle();
        return p || { username: 'unknown', display_name: 'Unknown User' };
      }

      // Helper: calculate expiration date
      function parseDuration(duration: string): Date | null {
        const nowMs = Date.now();
        if (duration === '1h') return new Date(nowMs + 60 * 60 * 1000);
        if (duration === '3h') return new Date(nowMs + 3 * 60 * 60 * 1000);
        if (duration === '6h') return new Date(nowMs + 6 * 60 * 60 * 1000);
        if (duration === '12h') return new Date(nowMs + 12 * 60 * 60 * 1000);
        if (duration === '1d') return new Date(nowMs + 24 * 60 * 60 * 1000);
        if (duration === '48h') return new Date(nowMs + 48 * 60 * 60 * 1000);
        if (duration === '3d') return new Date(nowMs + 3 * 24 * 60 * 60 * 1000);
        if (duration === '7d') return new Date(nowMs + 7 * 24 * 60 * 60 * 1000);
        if (duration === '30d') return new Date(nowMs + 30 * 24 * 60 * 60 * 1000);
        if (duration === 'perm') return new Date(nowMs + 100 * 365 * 24 * 60 * 60 * 1000); // 100 years
        return null;
      }

      // Helper: send DM from @report bot
      async function sendReportBotMessage(recipientId: string, content: string) {
        const REPORT_BOT_ID = '00000000-0000-0000-0000-000000000009';
        try {
          // 1. Ensure report bot exists in users & profiles
          await admin.from('users').upsert({
            id: REPORT_BOT_ID,
            username: 'report',
            display_name: 'Report',
            bio: 'System Report Bot. Notifies users of moderation decisions.'
          });


          // 2. Build chat ID
          const sorted = [REPORT_BOT_ID, recipientId].sort();
          const chatId = `${sorted[0]}_${sorted[1]}`;

          // 3. Insert DM message
          await admin.from('messages').insert({
            sender_id: REPORT_BOT_ID,
            recipient_id: recipientId,
            chat_id: chatId,
            content: content,
            status: 'sent',
            type: 'text',
            sent_at: new Date().toISOString()
          });
        } catch (err) {
          console.error('[sendReportBotMessage] Error:', err);
        }
      }

      // 1. Mark report status as Under Review (REVIEWED)
      if (action === 'rpt_review') {
        await admin.from('reports').update({ status: 'REVIEWED', updated_at: new Date().toISOString() }).eq('id', reportId);
        
        await editKeyboard(msgId, {
          inline_keyboard: [
            [
              { text: '⚖️ Punish Reported User', callback_data: `rpt_menu:${reportId}:reported` },
              { text: '⚖️ Punish Reporter', callback_data: `rpt_menu:${reportId}:reporter` }
            ],
            [
              { text: '⚠️ Warn Reported User', callback_data: `rpt_warn:${reportId}:reported` },
              { text: '⚠️ Warn Reporter', callback_data: `rpt_warn:${reportId}:reporter` }
            ],
            [
              { text: '❌ Cancel / Dismiss', callback_data: `rpt_cancel:${reportId}` }
            ]
          ]
        });

        await answer(cbId, '🔍 Marked report as Under Review.');
        return NextResponse.json({ ok: true });
      }

      // 2. Dismiss/Ignore Report (DISMISSED)
      if (action === 'rpt_cancel') {
        const report = await resolveReport();
        await admin.from('reports').update({ status: 'DISMISSED', updated_at: new Date().toISOString() }).eq('id', reportId);

        if (report?.reporter_id) {
          const content = `📝 <b>REPORT RESOLVED</b>\n\nYour report in Case <code>${reportId}</code> has been reviewed and dismissed. No community policy violation was found.\n\nThank you for keeping the community safe!`;
          await sendReportBotMessage(report.reporter_id, content);
        }

        await tgRequest('editMessageText', {
          chat_id: CHAT_ID,
          message_id: msgId,
          text: originalText + `\n\n${'━'.repeat(30)}\n🟢 <b>DECISION: REPORT DISMISSED</b>\n👤 By: ${actor}  |  🕐 ${now} IST`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: `Report Dismissed — Case Closed`, callback_data: `noop:${reportId}` }]],
          },
        });

        await answer(cbId, '🟢 Report dismissed.');
        return NextResponse.json({ ok: true });
      }

      // 3. Flag Report as Fraud (DISMISSED)
      if (action === 'rpt_flag') {
        const report = await resolveReport();
        if (report?.reporter_id) {
          // Apply trust score penalty to reporter (Medium warning / -15 points)
          const { data: userRow } = await admin.from('users').select('trust_score').eq('id', report.reporter_id).maybeSingle();
          const currentScore = userRow?.trust_score ?? 50;
          const newScore = Math.max(0, currentScore - 15);
          const updateData: any = { trust_score: newScore };
          if (newScore < 20) updateData.is_shadow_banned = true;
          await admin.from('users').update(updateData).eq('id', report.reporter_id);

          const content = `🚨 <b>FRAUDULENT REPORT PENALTY</b>\n\nYour report in Case <code>${reportId}</code> has been reviewed and flagged as fraudulent / false reporting.\n\nDetails:\n• Penalty: Trust Score Deducted (-15 points)\n\nAbusing the report system is against community guidelines and will lead to account restrictions.`;
          await sendReportBotMessage(report.reporter_id, content);
        }

        await admin.from('reports').update({ status: 'DISMISSED', updated_at: new Date().toISOString() }).eq('id', reportId);

        await tgRequest('editMessageText', {
          chat_id: CHAT_ID,
          message_id: msgId,
          text: originalText + `\n\n${'━'.repeat(30)}\n🚨 <b>DECISION: FLAGGED AS FRAUDULENT</b>\n⚠️ Reporter penalised for false reporting.\n👤 By: ${actor}  |  🕐 ${now} IST`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: `Report Flagged Fraud — Case Closed`, callback_data: `noop:${reportId}` }]],
          },
        });

        await answer(cbId, '🚨 Case closed: Fraudulent report.');
        return NextResponse.json({ ok: true });
      }

      // 4. Escalate Case (REVIEWED)
      if (action === 'rpt_escalate') {
        await admin.from('reports').update({ status: 'REVIEWED', updated_at: new Date().toISOString() }).eq('id', reportId);

        await tgRequest('editMessageText', {
          chat_id: CHAT_ID,
          message_id: msgId,
          text: originalText + `\n\n${'━'.repeat(30)}\n⚡ <b>CASE ESCALATED</b>\n📌 Status: <b>Under Senior Review</b>\n👤 Escalated By: ${actor}  |  🕐 ${now} IST`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: `Escalated — Case Under Review`, callback_data: `noop:${reportId}` }]],
          },
        });

        await answer(cbId, '⚡ Case escalated to senior review.');
        return NextResponse.json({ ok: true });
      }

      // 5. Return to main menu
      if (action === 'rpt_back') {
        await editKeyboard(msgId, {
          inline_keyboard: [
            [
              { text: '🔍 Review / Pause', callback_data: `rpt_review:${reportId}` },
              { text: '❌ Dismiss', callback_data: `rpt_cancel:${reportId}` },
              { text: '🚨 Fraud', callback_data: `rpt_flag:${reportId}` },
              { text: '⚡ Escalate', callback_data: `rpt_escalate:${reportId}` }
            ],
            [
              { text: '👤 Rep Profile', callback_data: `rpt_intel_profile:${reportId}:reporter` },
              { text: '🌐 Rep IP', callback_data: `rpt_intel_ip:${reportId}:reporter` },
              { text: '🔐 Rep Logs', callback_data: `rpt_intel_seclog:${reportId}:reporter` },
              { text: '📂 Rep Hist', callback_data: `rpt_intel_history:${reportId}:reporter` }
            ],
            [
              { text: '👤 Red Profile', callback_data: `rpt_intel_profile:${reportId}:reported` },
              { text: '🌐 Red IP', callback_data: `rpt_intel_ip:${reportId}:reported` },
              { text: '🔐 Red Logs', callback_data: `rpt_intel_seclog:${reportId}:reported` },
              { text: '📂 Red Hist', callback_data: `rpt_intel_history:${reportId}:reported` }
            ],
            [
              { text: '⚖️ Punish Reported', callback_data: `rpt_menu:${reportId}:reported` },
              { text: '⚖️ Punish Reporter', callback_data: `rpt_menu:${reportId}:reporter` }
            ],
            [
              { text: '⚠️ Warn Reported', callback_data: `rpt_warn:${reportId}:reported` },
              { text: '⚠️ Warn Reporter', callback_data: `rpt_warn:${reportId}:reporter` }
            ],
            [
              { text: '🕊 Pardon Reported', callback_data: `rpt_pardon:${reportId}:reported` },
              { text: '🕊 Pardon Reporter', callback_data: `rpt_pardon:${reportId}:reporter` }
            ]
          ]
        });

        await answer(cbId, '🔙 Returned to main moderation panel.');
        return NextResponse.json({ ok: true });
      }

      // 6. User Warning Severity Sub-menu
      if (action === 'rpt_warn') {
        const targetType = parts[2];
        const targetLabel = targetType === 'reported' ? 'Reported User' : 'Reporter';

        await editKeyboard(msgId, {
          inline_keyboard: [
            [
              { text: '⚠️ Light Warning (-5 Trust)', callback_data: `rpt_warn_apply:${reportId}:${targetType}:light` },
              { text: '⚠️ Medium Warning (-15 Trust)', callback_data: `rpt_warn_apply:${reportId}:${targetType}:medium` }
            ],
            [
              { text: '⚠️ Severe Warning (-30 Trust)', callback_data: `rpt_warn_apply:${reportId}:${targetType}:severe` }
            ],
            [
              { text: '🔙 Back', callback_data: `rpt_back:${reportId}` }
            ]
          ]
        });

        await answer(cbId, `⚠️ Select warning severity for ${targetLabel}`);
        return NextResponse.json({ ok: true });
      }

      // 7. Apply User Warning Severity
      if (action === 'rpt_warn_apply') {
        const targetType = parts[2];
        const severity = parts[3];

        const targetUserId = await getTargetUserId(targetType);
        if (!targetUserId) {
          await answer(cbId, '⚠️ User not found.', true);
          return NextResponse.json({ ok: true });
        }

        const labels = await getTargetLabels(targetUserId);
        const delta = severity === 'light' ? 5 : severity === 'medium' ? 15 : 30;

        const { data: userRow } = await admin.from('users').select('trust_score').eq('id', targetUserId).maybeSingle();
        const currentScore = userRow?.trust_score ?? 50;
        const newScore = Math.max(0, currentScore - delta);
        
        const updateData: any = { trust_score: newScore };
        if (newScore < 20) {
          updateData.is_shadow_banned = true;
        }
        await admin.from('users').update(updateData).eq('id', targetUserId);

        await admin.from('reports').update({ status: 'PUNISHED', updated_at: new Date().toISOString() }).eq('id', reportId);

        // Notify reported/warned user
        const warnContent = `⚠️ <b>FORMAL WARNING ISSUED</b>\n\nYour account has received a formal warning due to community policy violations.\n\nDetails:\n• Case ID: <code>${reportId}</code>\n• Severity: ${severity.toUpperCase()} Warning (-${delta} trust points)\n• Current Trust Score: <b>${newScore}</b>\n\nPlease adhere to community guidelines. Further violations will result in account restrictions.`;
        await sendReportBotMessage(targetUserId, warnContent);

        // Notify reporter (anonymously)
        const report = await resolveReport();
        if (report?.reporter_id) {
          const reporterContent = `📝 <b>REPORT RESOLVED</b>\n\nThe user you reported in Case <code>${reportId}</code> has been investigated.\n\nResult: Action Taken (Formal Warning Issued).\n\nThank you for keeping the community safe!`;
          await sendReportBotMessage(report.reporter_id, reporterContent);
        }

        await tgRequest('editMessageText', {
          chat_id: CHAT_ID,
          message_id: msgId,
          text: originalText + `\n\n${'━'.repeat(30)}\n⚠️ <b>DECISION: CASE CLOSED (${severity.toUpperCase()} WARNING)</b>\n👤 Target: ${targetType === 'reported' ? 'Reported User' : 'Reporter'} (@${labels.username})\n⚡ Trust Penalty: -${delta} (Score: <b>${newScore}</b>)\n👤 By: ${actor}  |  🕐 ${now} IST`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: `Warned (${severity}: @${labels.username}) — Case Closed`, callback_data: `noop:${reportId}` }]],
          },
        });

        await answer(cbId, `⚠️ ${severity} warning applied to @${labels.username}.`);
        return NextResponse.json({ ok: true });
      }

      // 8. Pardon User (Lift Bans/Mutes)
      if (action === 'rpt_pardon') {
        const targetType = parts[2];
        const targetUserId = await getTargetUserId(targetType);
        if (!targetUserId) {
          await answer(cbId, '⚠️ User not found.', true);
          return NextResponse.json({ ok: true });
        }

        const labels = await getTargetLabels(targetUserId);

        // Remove from banned_identities
        await admin.from('banned_identities').delete().eq('type', 'user').eq('identifier', targetUserId);
        
        // Remove from user_restrictions
        await admin.from('user_restrictions').delete().eq('user_id', targetUserId);

        // Reset user trust score and shadow ban flag
        await admin.from('users').update({ is_shadow_banned: false, trust_score: 50 }).eq('id', targetUserId);

        // Invalidate Redis ban cache
        await invalidateBanCache(targetUserId, 'user');

        // Mark report as DISMISSED
        await admin.from('reports').update({ status: 'DISMISSED', updated_at: new Date().toISOString() }).eq('id', reportId);

        // Notify pardoned user
        const pardonContent = `🕊 <b>ACCOUNT PARDONED / RESTORED</b>\n\nFollowing a senior review, all active restrictions, mutes, and bans on your account have been lifted.\n\nYour trust score has been restored to <b>50</b>.\n\nWelcome back!`;
        await sendReportBotMessage(targetUserId, pardonContent);

        // Notify reporter
        const report = await resolveReport();
        if (report?.reporter_id) {
          const reporterContent = `📝 <b>CASE UPDATED</b>\n\nCase <code>${reportId}</code> has been re-evaluated. The reported user has been pardoned and active restrictions have been lifted.`;
          await sendReportBotMessage(report.reporter_id, reporterContent);
        }

        await tgRequest('editMessageText', {
          chat_id: CHAT_ID,
          message_id: msgId,
          text: originalText + `\n\n${'━'.repeat(30)}\n🕊 <b>DECISION: USER PARDONED / RESTORED</b>\n🎯 Target: ${targetType === 'reported' ? 'Reported User' : 'Reporter'} (@${labels.username})\n⚡ Action: Lifted all mutes, bans, and restored trust score to 50.\n👤 By: ${actor}  |  🕐 ${now} IST`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: `Pardoned (@${labels.username}) — Case Closed`, callback_data: `noop:${reportId}` }]],
          },
        });

        await answer(cbId, `🕊 @${labels.username} pardoned. All bans & mutes lifted.`);
        return NextResponse.json({ ok: true });
      }

      // 9. User Profile Intelligence
      if (action === 'rpt_intel_profile') {
        const targetType = parts[2];
        const targetUserId = await getTargetUserId(targetType);
        if (!targetUserId) {
          await answer(cbId, '⚠️ User not found.', true);
          return NextResponse.json({ ok: true });
        }

        const [profileRes, authRes, postsRes, followersRes, followingRes] = await Promise.all([
          admin.from('users').select('username, display_name, gender, phone, location, created_at, bio').eq('id', targetUserId).maybeSingle(),
          admin.auth.admin.getUserById(targetUserId),
          admin.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', targetUserId),
          admin.from('followers').select('id', { count: 'exact', head: true }).eq('following_id', targetUserId),
          admin.from('followers').select('id', { count: 'exact', head: true }).eq('follower_id', targetUserId),
        ]);

        const p = profileRes.data;
        const u = authRes.data?.user;
        const joined = p?.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : '—';
        const lastLogin = u?.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—';
        const has2FA = Array.isArray((u as any)?.factors) && (u as any).factors.length > 0;

        await sendMsg([
          `👤 <b>INTEL: DEEP PROFILE REPORT (${targetType.toUpperCase()})</b>`,
          `🗂 Case: <code>${reportId}</code>`,
          `${'─'.repeat(25)}`,
          `🆔 UID: <code>${targetUserId}</code>`,
          `👤 Username: <code>@${escapeHtml(p?.username || '—')}</code>`,
          `✨ Name: <b>${escapeHtml(p?.display_name || '—')}</b>`,
          `📧 Email: <code>${escapeHtml(u?.email || '—')}</code>`,
          `   Verified: ${u?.email_confirmed_at ? '✅' : '❌'}  |  2FA: ${has2FA ? '✅ ON' : '❌ OFF'}`,
          `📱 Phone: ${escapeHtml(p?.phone || '—')}`,
          `⚧ Gender: ${escapeHtml(p?.gender || '—')}`,
          `📍 Location: ${escapeHtml(p?.location || '—')}`,
          `📝 Bio: ${p?.bio ? escapeHtml(p.bio.slice(0, 80)) : '—'}`,
          `${'─'.repeat(25)}`,
          `📅 Joined: <b>${joined}</b>`,
          `🕐 Last Login: <b>${lastLogin}</b>`,
          `${'─'.repeat(25)}`,
          `📝 Posts: <b>${postsRes.count ?? 0}</b>`,
          `👥 Followers: <b>${followersRes.count ?? 0}</b>  |  Following: <b>${followingRes.count ?? 0}</b>`,
          `⚡ Status: ${(u as any)?.banned_until ? '⛔ BANNED' : '✅ Active'}`,
        ].join('\n'));

        await answer(cbId, '👤 Deep profile report sent.');
        return NextResponse.json({ ok: true });
      }

      // 10. IP Intelligence
      if (action === 'rpt_intel_ip') {
        const targetType = parts[2];
        const targetUserId = await getTargetUserId(targetType);
        if (!targetUserId) {
          await answer(cbId, '⚠️ User not found.', true);
          return NextResponse.json({ ok: true });
        }

        const { data: lastSecEvent } = await admin
          .from('security_events')
          .select('ip_address')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const targetIp = lastSecEvent?.ip_address || '127.0.0.1';
        const geoRes = await fetch(`http://ip-api.com/json/${targetIp}?fields=status,country,city,regionName,isp,org,mobile,proxy,hosting,lat,lon,timezone`)
          .then(r => r.json())
          .catch(() => ({}));

        await sendMsg([
          `🌍 <b>INTEL: IP GEOLOCATION REPORT (${targetType.toUpperCase()})</b>`,
          `🗂 Case: <code>${reportId}</code>`,
          `${'─'.repeat(25)}`,
          `🌐 Resolved IP: <code>${targetIp}</code>`,
          `🏳 Country: <b>${geoRes.country || '—'}</b>`,
          `🏙 City: ${geoRes.city || '—'}${geoRes.regionName ? ', ' + geoRes.regionName : ''}`,
          `🕐 Timezone: ${geoRes.timezone || '—'}`,
          `📡 ISP: ${geoRes.isp || '—'}`,
          `🏢 Org: ${geoRes.org || '—'}`,
          `🔒 VPN / Proxy: ${geoRes.proxy ? '⚠️ YES — SUSPICIOUS' : '✅ No'}`,
          `🏗 Datacenter / Hosting: ${geoRes.hosting ? '⚠️ YES' : '✅ No'}`,
          `📱 Mobile: ${geoRes.mobile ? 'Yes' : 'No'}`,
        ].join('\n'));

        await answer(cbId, '🌍 Geolocation report sent.');
        return NextResponse.json({ ok: true });
      }

      // 11. Security Events Log
      if (action === 'rpt_intel_seclog') {
        const targetType = parts[2];
        const targetUserId = await getTargetUserId(targetType);
        if (!targetUserId) {
          await answer(cbId, '⚠️ User not found.', true);
          return NextResponse.json({ ok: true });
        }

        const { data: secEvents } = await admin
          .from('security_events')
          .select('event_type, severity, ip_address, created_at')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(15);

        const eventsText = (secEvents || []).length > 0
          ? (secEvents || []).map((e: any) => {
              const sev = e.severity === 'critical' ? '🔴' : e.severity === 'high' ? 'orange' : e.severity === 'medium' ? '🟡' : '🟢';
              return `${sev} <code>${e.event_type}</code> — IP: <code>${e.ip_address || '—'}</code> — ${new Date(e.created_at).toLocaleDateString('en-IN')}`;
            }).join('\n')
          : '  ✅ No security violations logged.';

        await sendMsg([
          `🔐 <b>INTEL: SECURITY LOG REPORT (${targetType.toUpperCase()})</b>`,
          `🗂 Case: <code>${reportId}</code>`,
          `${'─'.repeat(25)}`,
          eventsText,
        ].join('\n'));

        await answer(cbId, '🔐 Security events sent.');
        return NextResponse.json({ ok: true });
      }

      // 12. Report History
      if (action === 'rpt_intel_history') {
        const targetType = parts[2];
        const targetUserId = await getTargetUserId(targetType);
        if (!targetUserId) {
          await answer(cbId, '⚠️ User not found.', true);
          return NextResponse.json({ ok: true });
        }

        const [filedByTarget, filedAgainstTarget] = await Promise.all([
          admin.from('reports').select('id, status, created_at').eq('reporter_id', targetUserId).order('created_at', { ascending: false }),
          admin.from('reports').select('id, status, created_at').eq('reported_user_id', targetUserId).order('created_at', { ascending: false })
        ]);

        const byText = (filedByTarget.data && filedByTarget.data.length > 0)
          ? (filedByTarget.data || []).map((r: any) => `  • <code>${r.id.slice(0,8)}</code> [${r.status}]`).join('\n')
          : '  • None';

        const againstText = (filedAgainstTarget.data || []).length > 0
          ? (filedAgainstTarget.data || []).map((r: any) => `  • <code>${r.id.slice(0,8)}</code> [${r.status}]`).join('\n')
          : '  • None';

        await sendMsg([
          `📂 <b>INTEL: REPORT HISTORY (${targetType.toUpperCase()})</b>`,
          `🗂 Case: <code>${reportId}</code>`,
          `${'─'.repeat(25)}`,
          `📈 <b>Reports Filed By User:</b>`,
          byText,
          ``,
          `📉 <b>Reports Filed Against User:</b>`,
          againstText,
        ].join('\n'));

        await answer(cbId, '📂 Report history sent.');
        return NextResponse.json({ ok: true });
      }

      // 13. Open Target Punishment Sub-menu
      if (action === 'rpt_menu') {
        const targetType = parts[2];
        const targetLabel = targetType === 'reported' ? 'Reported User' : 'Reporter';

        await editKeyboard(msgId, {
          inline_keyboard: [
            [
              { text: `🚫 Ban 1h`, callback_data: `rpt_ban:${reportId}:${targetType}:1h` },
              { text: `🚫 Ban 3h`, callback_data: `rpt_ban:${reportId}:${targetType}:3h` },
              { text: `🚫 Ban 6h`, callback_data: `rpt_ban:${reportId}:${targetType}:6h` },
              { text: `🚫 Ban 12h`, callback_data: `rpt_ban:${reportId}:${targetType}:12h` }
            ],
            [
              { text: `🚫 Ban 1d`, callback_data: `rpt_ban:${reportId}:${targetType}:1d` },
              { text: `🚫 Ban 3d`, callback_data: `rpt_ban:${reportId}:${targetType}:3d` },
              { text: `🚫 Ban 7d`, callback_data: `rpt_ban:${reportId}:${targetType}:7d` },
              { text: `🚫 Ban 30d`, callback_data: `rpt_ban:${reportId}:${targetType}:30d` }
            ],
            [
              { text: `♾ Permanent Ban`, callback_data: `rpt_ban:${reportId}:${targetType}:perm` },
              { text: `🔇 Shadow Ban`, callback_data: `rpt_ban:${reportId}:${targetType}:shadow` },
              { text: `🧊 Freeze 48h`, callback_data: `rpt_ban:${reportId}:${targetType}:48h` }
            ],
            [
              { text: `💬 Mute Messages`, callback_data: `rpt_resmenu:${reportId}:${targetType}:messages` },
              { text: `📝 Mute Posts`, callback_data: `rpt_resmenu:${reportId}:${targetType}:posts` }
            ],
            [
              { text: `💬 Mute Comments`, callback_data: `rpt_resmenu:${reportId}:${targetType}:comments` },
              { text: `👍 Mute Reactions`, callback_data: `rpt_resmenu:${reportId}:${targetType}:reactions` }
            ],
            [
              { text: `📞 Mute Calling`, callback_data: `rpt_resmenu:${reportId}:${targetType}:calls` },
              { text: `⚠️ Mute All Features`, callback_data: `rpt_resmenu:${reportId}:${targetType}:all` }
            ],
            [
              { text: `🔙 Back to Main`, callback_data: `rpt_back:${reportId}` }
            ]
          ]
        });

        await answer(cbId, `⚖️ Punishment console for ${targetLabel}`);
        return NextResponse.json({ ok: true });
      }

      // 14. Restriction Duration Sub-menu
      if (action === 'rpt_resmenu') {
        const targetType = parts[2];
        const feature = parts[3];
        const targetLabel = targetType === 'reported' ? 'Reported User' : 'Reporter';

        await editKeyboard(msgId, {
          inline_keyboard: [
            [
              { text: `⏳ Mute 1h`, callback_data: `rpt_res:${reportId}:${targetType}:${feature}:1h` },
              { text: `⏳ Mute 3h`, callback_data: `rpt_res:${reportId}:${targetType}:${feature}:3h` },
              { text: `⏳ Mute 6h`, callback_data: `rpt_res:${reportId}:${targetType}:${feature}:6h` },
              { text: `⏳ Mute 12h`, callback_data: `rpt_res:${reportId}:${targetType}:${feature}:12h` }
            ],
            [
              { text: `⏳ Mute 1d`, callback_data: `rpt_res:${reportId}:${targetType}:${feature}:1d` },
              { text: `⏳ Mute 3d`, callback_data: `rpt_res:${reportId}:${targetType}:${feature}:3d` },
              { text: `⏳ Mute 7d`, callback_data: `rpt_res:${reportId}:${targetType}:${feature}:7d` },
              { text: `⏳ Mute 30d`, callback_data: `rpt_res:${reportId}:${targetType}:${feature}:30d` }
            ],
            [
              { text: `♾ Permanent Mute`, callback_data: `rpt_res:${reportId}:${targetType}:${feature}:perm` }
            ],
            [
              { text: `🔙 Back`, callback_data: `rpt_menu:${reportId}:${targetType}` }
            ]
          ]
        });

        await answer(cbId, `⏳ Set restriction duration for ${feature}`);
        return NextResponse.json({ ok: true });
      }

      // 15. Apply Restrict Action (PUNISHED)
      if (action === 'rpt_res') {
        const targetType = parts[2];
        const feature = parts[3];
        const duration = parts[4];

        const targetUserId = await getTargetUserId(targetType);
        if (!targetUserId) {
          await answer(cbId, '⚠️ User not found.', true);
          return NextResponse.json({ ok: true });
        }

        const labels = await getTargetLabels(targetUserId);
        const expiresAt = parseDuration(duration);
        if (!expiresAt) {
          await answer(cbId, '❌ Invalid duration.', true);
          return NextResponse.json({ ok: true });
        }

        const rTypes = feature === 'all'
          ? ['messages', 'calls', 'reactions', 'comments', 'posts', 'stories', 'group_creation']
          : [feature];

        const rows = rTypes.map(rt => ({
          user_id: targetUserId,
          restriction_type: rt,
          expires_at: expiresAt.toISOString()
        }));

        const { error: insErr } = await admin.from('user_restrictions').insert(rows);
        if (insErr) {
          console.error('[Webhook Restriction] Failed to insert restrictions:', insErr);
          await answer(cbId, '❌ Failed to apply restrictions in database.', true);
          return NextResponse.json({ ok: true });
        }

        await admin.from('reports').update({ status: 'PUNISHED', updated_at: new Date().toISOString() }).eq('id', reportId);

        const targetLabel = targetType === 'reported' ? 'Reported User' : 'Reporter';
        const actionLabel = feature === 'all' ? 'Muted from All App Features' : `Muted from ${feature}`;

        // Notify reported/restricted user
        const muteContent = `🔇 <b>ACCOUNT RESTRICTED</b>\n\nYour account has been restricted / muted from performing certain actions due to community policy violations.\n\nDetails:\n• Case ID: <code>${reportId}</code>\n• Restriction: <b>${actionLabel}</b>\n• Duration: <b>${duration}</b>\n\nYou will not be able to perform these actions until the restriction expires.`;
        await sendReportBotMessage(targetUserId, muteContent);

        // Notify reporter
        const report = await resolveReport();
        if (report?.reporter_id) {
          const reporterContent = `📝 <b>REPORT RESOLVED</b>\n\nThe user you reported in Case <code>${reportId}</code> has been investigated.\n\nResult: Action Taken (User Muted / Restricted).\n\nThank you for keeping the community safe!`;
          await sendReportBotMessage(report.reporter_id, reporterContent);
        }

        await tgRequest('editMessageText', {
          chat_id: CHAT_ID,
          message_id: msgId,
          text: originalText + `\n\n${'━'.repeat(30)}\n⛔ <b>DECISION: CASE CLOSED (RESTRICTED)</b>\n🎯 Target: ${targetLabel} (@${labels.username})\n⚡ Action: <b>${actionLabel} (${duration})</b>\n👤 By: ${actor}  |  🕐 ${now} IST`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: `Restricted (@${labels.username}) — Case Closed`, callback_data: `noop:${reportId}` }]],
          },
        });

        await answer(cbId, `🔇 ${targetLabel} has been ${actionLabel.toLowerCase()} (${duration}).`);
        return NextResponse.json({ ok: true });
      }

      // 16. Apply Platform Ban (PUNISHED)
      if (action === 'rpt_ban') {
        const targetType = parts[2];
        const duration = parts[3];

        const targetUserId = await getTargetUserId(targetType);
        if (!targetUserId) {
          await answer(cbId, '⚠️ User not found.', true);
          return NextResponse.json({ ok: true });
        }

        const labels = await getTargetLabels(targetUserId);
        let detailsLabel = '';

        if (duration === 'shadow') {
          const { error: updateErr } = await admin
            .from('users')
            .update({
              is_shadow_banned: true,
              trust_score: 10
            })
            .eq('id', targetUserId);

          if (updateErr) {
            console.error('[Webhook Report Ban] Shadow ban update failed:', updateErr);
            await answer(cbId, '❌ Failed to apply shadow ban.', true);
            return NextResponse.json({ ok: true });
          }
          detailsLabel = 'Shadow Banned (Chat Ban)';
        } else {
          const expiresAt = parseDuration(duration);

          const { error: banErr } = await admin
            .from('banned_identities')
            .upsert({
              type: 'user',
              identifier: targetUserId,
              reason: `Moderator Action: User Report ${reportId} (${targetType} banned)`,
              expires_at: expiresAt ? expiresAt.toISOString() : null
            }, { onConflict: 'type,identifier' });

          if (banErr) {
            console.error('[Webhook Report Ban] Platform ban failed:', banErr);
            await answer(cbId, '❌ Failed to apply platform ban.', true);
            return NextResponse.json({ ok: true });
          }

          await invalidateBanCache(targetUserId, 'user');
          detailsLabel = duration === 'perm' ? 'Permanently Banned' : duration === '48h' ? 'Frozen for 48h' : `Banned for ${duration}`;
        }

        await admin.from('reports').update({ status: 'PUNISHED', updated_at: new Date().toISOString() }).eq('id', reportId);

        // Notify reported/banned user
        const banContent = `⛔ <b>ACCOUNT BANNED</b>\n\nYour account has been banned due to community policy violations.\n\nDetails:\n• Case ID: <code>${reportId}</code>\n• Status: <b>${detailsLabel}</b>\n\nYou will not be able to log in or use the platform until the ban expires.`;
        await sendReportBotMessage(targetUserId, banContent);

        // Notify reporter
        const report = await resolveReport();
        if (report?.reporter_id) {
          const reporterContent = `📝 <b>REPORT RESOLVED</b>\n\nThe user you reported in Case <code>${reportId}</code> has been investigated.\n\nResult: Action Taken (User Banned).\n\nThank you for keeping the community safe!`;
          await sendReportBotMessage(report.reporter_id, reporterContent);
        }

        const targetLabel = targetType === 'reported' ? 'Reported User' : 'Reporter';

        await tgRequest('editMessageText', {
          chat_id: CHAT_ID,
          message_id: msgId,
          text: originalText + `\n\n${'━'.repeat(30)}\n⛔ <b>DECISION: CASE CLOSED (BANNED)</b>\n🎯 Target: ${targetLabel} (@${labels.username})\n⚡ Action: <b>${detailsLabel}</b>\n👤 By: ${actor}  |  🕐 ${now} IST`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: `Banned (@${labels.username}) — Case Closed`, callback_data: `noop:${reportId}` }]],
          },
        });

        await answer(cbId, `⛔ ${targetLabel} has been ${detailsLabel}.`);
        return NextResponse.json({ ok: true });
      }
    }

    // Helper: fetch case + linked user email
    async function resolveCase() {
      const { data } = await admin.from('manual_audit_requests')
        .select('user_id, ip_address, statement, status').eq('id', caseId).maybeSingle();
      if (!data) return null;
      let email: string | null = null;
      if (data.user_id) {
        const { data: authUser } = await admin.auth.admin.getUserById(data.user_id);
        email = authUser?.user?.email || null;
      }
      return { ...data, email };
    }

    // ── NOOP ─────────────────────────────────────────────────────────────────
    if (action === 'noop') {
      await answer(cbId, '✋ Already actioned.');
      return NextResponse.json({ ok: true });
    }

    // ── VIEW FULL STATEMENT ──────────────────────────────────────────────────
    if (action === 'viewfull') {
      const c = await resolveCase();
      if (!c) { await answer(cbId, '⚠️ Case not found.', true); return NextResponse.json({ ok: true }); }
      await sendMsg(`📋 <b>FULL STATEMENT</b>\n🗂 Case: <code>${escapeHtml(caseId)}</code>\n📌 Status: <b>${escapeHtml(c.status)}</b>\n\n<pre>${escapeHtml(c.statement.slice(0, 3500))}</pre>`);
      await answer(cbId, '📋 Full statement sent above.');
      return NextResponse.json({ ok: true });
    }

    // ── DEEP PROFILE ─────────────────────────────────────────────────────────
    if (action === 'accountdetails') {
      const c = await resolveCase();
      if (!c?.user_id) { await answer(cbId, '⚠️ No linked account.', true); return NextResponse.json({ ok: true }); }

      const [profileRes, authRes, postsRes, followersRes, followingRes, sessRes] = await Promise.all([
        admin.from('users').select('username, display_name, gender, phone, location, created_at, bio').eq('id', c.user_id).maybeSingle(),
        admin.auth.admin.getUserById(c.user_id),
        admin.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', c.user_id),
        admin.from('followers').select('id', { count: 'exact', head: true }).eq('following_id', c.user_id),
        admin.from('followers').select('id', { count: 'exact', head: true }).eq('follower_id', c.user_id),
        admin.auth.admin.listUsers({ page: 1, perPage: 1 }),
      ]);

      const p = profileRes.data;
      const u = authRes.data?.user;
      const joined = p?.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : '—';
      const lastLogin = u?.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—';
      const mfaFactors = (u as any)?.factors;
      const has2FA = Array.isArray(mfaFactors) && mfaFactors.length > 0;
      const providers = u?.app_metadata?.providers?.join(', ') || 'email';

      await sendMsg([
        `👤 <b>DEEP PROFILE REPORT</b>`,
        `🗂 Case: <code>${escapeHtml(caseId)}</code>`,
        `${'─'.repeat(25)}`,
        `🆔 UID: <code>${escapeHtml(c.user_id)}</code>`,
        `👤 Username: <code>@${escapeHtml(p?.username || '—')}</code>`,
        `✨ Display Name: <b>${escapeHtml(p?.display_name || '—')}</b>`,
        `📧 Email: <code>${escapeHtml(u?.email || '—')}</code>`,
        `   Verified: ${u?.email_confirmed_at ? '✅' : '❌'}  |  2FA: ${has2FA ? '✅ Enabled' : '❌ Disabled'}`,
        `📱 Phone: ${escapeHtml(p?.phone || '—')}`,
        `⚧ Gender: ${escapeHtml(p?.gender || '—')}`,
        `📍 Location: ${escapeHtml(p?.location || '—')}`,
        `📝 Bio: ${p?.bio ? escapeHtml(p.bio.slice(0, 80)) : '—'}`,
        `${'─'.repeat(25)}`,
        `📅 Account Created: <b>${joined}</b>`,
        `🕐 Last Login: <b>${lastLogin}</b>`,
        `🔗 Auth Providers: ${escapeHtml(providers)}`,
        `${'─'.repeat(25)}`,
        `📝 Posts: <b>${postsRes.count ?? 0}</b>`,
        `👥 Followers: <b>${followersRes.count ?? 0}</b>  |  Following: <b>${followingRes.count ?? 0}</b>`,
        `${'─'.repeat(25)}`,
        `🌐 Case IP: <code>${escapeHtml(c.ip_address)}</code>`,
        `⚡ Account Status: ${(u as any)?.banned_until ? '⛔ BANNED' : '✅ Active'}`,
      ].join('\n'));
      await answer(cbId, '👤 Deep profile sent.');
      return NextResponse.json({ ok: true });
    }

    // ── IP INTELLIGENCE ──────────────────────────────────────────────────────
    if (action === 'ipintel') {
      const c = await resolveCase();
      if (!c) { await answer(cbId, '⚠️ Case not found.', true); return NextResponse.json({ ok: true }); }

      const ip = c.ip_address || '0.0.0.0';
      const [geoRes, ipCasesRes] = await Promise.all([
        fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,regionName,isp,org,mobile,proxy,hosting,lat,lon,timezone`).then(r => r.json()).catch(() => ({})),
        admin.from('manual_audit_requests').select('id, status, created_at').eq('ip_address', ip).order('created_at', { ascending: false }).limit(10),
      ]);

      const priorFromIP = (ipCasesRes.data || []).filter((c: any) => c.id !== caseId);

      await sendMsg([
        `🌍 <b>IP INTELLIGENCE REPORT</b>`,
        `🗂 Case: <code>${caseId}</code>`,
        `${'─'.repeat(25)}`,
        `🌐 IP Address: <code>${ip}</code>`,
        `🏳 Country: <b>${geoRes.country || '—'}</b>`,
        `🏙 City: ${geoRes.city || '—'}${geoRes.regionName ? ', ' + geoRes.regionName : ''}`,
        `🕐 Timezone: ${geoRes.timezone || '—'}`,
        `📡 ISP: ${geoRes.isp || '—'}`,
        `🏢 Org: ${geoRes.org || '—'}`,
        `${'─'.repeat(25)}`,
        `🔒 VPN / Proxy: ${geoRes.proxy ? '⚠️ YES — SUSPICIOUS' : '✅ No'}`,
        `🏗 Datacenter / Hosting: ${geoRes.hosting ? '⚠️ YES' : '✅ No'}`,
        `📱 Mobile Network: ${geoRes.mobile ? 'Yes' : 'No'}`,
        `${'─'.repeat(25)}`,
        `📂 Prior cases from this IP: <b>${priorFromIP.length}</b>`,
        priorFromIP.length > 0
          ? priorFromIP.map((c: any) => `  • <code>${c.id}</code> — ${c.status} (${new Date(c.created_at).toLocaleDateString('en-IN')})`).join('\n')
          : '  • No prior cases from this IP',
        `${'─'.repeat(25)}`,
        geoRes.lat ? `📍 Coordinates: ${geoRes.lat}, ${geoRes.lon}` : '',
      ].filter(Boolean).join('\n'));
      await answer(cbId, '🌍 IP report sent.');
      return NextResponse.json({ ok: true });
    }

    // ── SECURITY LOG ─────────────────────────────────────────────────────────
    if (action === 'seclog') {
      const c = await resolveCase();
      if (!c?.user_id) { await answer(cbId, '⚠️ No linked account.', true); return NextResponse.json({ ok: true }); }

      const [secEvents, auditCases] = await Promise.all([
        admin.from('security_events').select('event_type, severity, ip_address, created_at, payload')
          .or(`ip_address.eq.${c.ip_address},payload->>email.eq.${c.email || ''}`)
          .order('created_at', { ascending: false }).limit(15),
        admin.from('manual_audit_requests').select('id, status, created_at, ip_address')
          .eq('user_id', c.user_id).order('created_at', { ascending: false }),
      ]);

      const eventsText = (secEvents.data || []).length > 0
        ? (secEvents.data || []).map((e: any) => {
            const sev = e.severity === 'critical' ? '🔴' : e.severity === 'high' ? '🟠' : e.severity === 'medium' ? '🟡' : '🟢';
            return `${sev} <code>${e.event_type}</code> — ${new Date(e.created_at).toLocaleDateString('en-IN')} — IP: <code>${e.ip_address || '—'}</code>`;
          }).join('\n')
        : '  ✅ No security events on record.';

      const casesText = (auditCases.data || []).length > 0
        ? (auditCases.data || []).map((c: any) =>
            `  • <code>${c.id}</code> [${c.status}] — ${new Date(c.created_at).toLocaleDateString('en-IN')}`
          ).join('\n')
        : '  • This is the first audit case.';

      await sendMsg([
        `🔐 <b>SECURITY LOG</b>`,
        `🗂 Case: <code>${caseId}</code>`,
        `${'─'.repeat(25)}`,
        `📋 <b>Security Events (last 15):</b>`,
        eventsText,
        ``,
        `${'─'.repeat(25)}`,
        `📂 <b>All Audit Cases for this Account:</b>`,
        casesText,
      ].join('\n'));
      await answer(cbId, '🔐 Security log sent.');
      return NextResponse.json({ ok: true });
    }

    // ── SIMILAR CASES ────────────────────────────────────────────────────────
    if (action === 'similarcases') {
      const c = await resolveCase();
      if (!c) { await answer(cbId, '⚠️ Case not found.', true); return NextResponse.json({ ok: true }); }

      const ipCases = await admin.from('manual_audit_requests')
        .select('id, user_id, status, created_at').eq('ip_address', c.ip_address)
        .neq('id', caseId).order('created_at', { ascending: false }).limit(10);

      const sameCases = await admin.from('manual_audit_requests')
        .select('id, status, created_at').eq('user_id', c.user_id || '')
        .neq('id', caseId).order('created_at', { ascending: false }).limit(5);

      const ipText = (ipCases.data || []).length > 0
        ? (ipCases.data || []).map((c: any) => `  • <code>${c.id}</code> [${c.status}] — ${new Date(c.created_at).toLocaleDateString('en-IN')}`).join('\n')
        : '  • None from this IP.';

      const sameText = (sameCases.data || []).length > 0
        ? (sameCases.data || []).map((c: any) => `  • <code>${c.id}</code> [${c.status}] — ${new Date(c.created_at).toLocaleDateString('en-IN')}`).join('\n')
        : '  • No other cases for this account.';

      await sendMsg([
        `🕵️ <b>SIMILAR CASES REPORT</b>`,
        `🗂 Case: <code>${caseId}</code>`,
        `${'─'.repeat(25)}`,
        `🌐 <b>Cases from same IP (<code>${c.ip_address}</code>):</b>`,
        ipText,
        ``,
        `${'─'.repeat(25)}`,
        `👤 <b>Other cases for same account:</b>`,
        sameText,
      ].join('\n'));
      await answer(cbId, '🕵️ Similar cases sent.');
      return NextResponse.json({ ok: true });
    }

    // ── EMAIL USER ───────────────────────────────────────────────────────────
    if (action === 'emailuser') {
      const c = await resolveCase();
      if (!c?.email) { await answer(cbId, '⚠️ No email on file for this account.', true); return NextResponse.json({ ok: true }); }

      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#0a0a0d;color:#e4e4e7;padding:32px;border-radius:12px;border:1px solid #27272a">
          <h2 style="color:#3b82f6;margin-bottom:4px">Verlyn Security</h2>
          <p style="color:#71717a;font-size:12px;margin-top:0">Identity Verification Division</p>
          <hr style="border-color:#27272a">
          <p>Dear Account Holder,</p>
          <p>We have received your identity audit request. Our compliance team is currently reviewing your submission.</p>
          <p>Your <strong>Case Reference ID</strong> is:</p>
          <div style="background:#18181b;border:1px solid #3b82f6;border-radius:8px;padding:12px;text-align:center;font-family:monospace;font-size:14px;letter-spacing:2px;color:#60a5fa">
            ${caseId}
          </div>
          <p>Please keep this reference ID safe. Our team typically responds within <strong>12–24 hours</strong>.</p>
          <p>If you did not initiate this request, please contact us immediately at <a href="mailto:security@verlyn.in" style="color:#3b82f6">security@verlyn.in</a>.</p>
          <hr style="border-color:#27272a">
          <p style="color:#71717a;font-size:11px">— Verlyn Security Compliance Team<br>This is an automated message. Do not reply directly.</p>
        </div>`;

      const sent = await sendEmail(c.email, `Your Audit Case Is Under Review — Ref: ${caseId}`, html);
      await sendMsg(sent
        ? `📧 <b>Email sent</b> to <code>${c.email}</code>\n🗂 Case: <code>${caseId}</code>\n🕐 ${now} IST`
        : `❌ <b>Email failed</b> to send to <code>${c.email}</code>. Check Resend config.`);
      await answer(cbId, sent ? `📧 Email sent to ${c.email}` : '❌ Email failed.', !sent);
      return NextResponse.json({ ok: true });
    }

    // ── REVOKE ALL SESSIONS ──────────────────────────────────────────────────
    if (action === 'revoke') {
      const c = await resolveCase();
      if (!c?.user_id) { await answer(cbId, '⚠️ No linked account.', true); return NextResponse.json({ ok: true }); }
      await admin.auth.admin.signOut(c.user_id);
      await admin.from('manual_audit_requests').update({ status: 'SESSIONS_REVOKED' }).eq('id', caseId);
      await sendMsg(`📵 <b>ALL SESSIONS REVOKED</b>\n🗂 Case: <code>${caseId}</code>\n🆔 User: <code>${c.user_id}</code>\n👤 By: ${actor}\n🕐 ${now} IST`);
      await answer(cbId, '📵 All active sessions terminated.', true);
      return NextResponse.json({ ok: true });
    }

    // ── FREEZE 48h ───────────────────────────────────────────────────────────
    if (action === 'freeze') {
      const c = await resolveCase();
      if (!c?.user_id) { await answer(cbId, '⚠️ No linked account.', true); return NextResponse.json({ ok: true }); }
      await admin.auth.admin.updateUserById(c.user_id, { ban_duration: '48h' });
      await admin.from('manual_audit_requests').update({ status: 'FROZEN' }).eq('id', caseId);
      await closeCaseMessage(msgId, originalText, '🧊 FROZEN — 48h Suspension', '🔵', actor, caseId);
      await sendMsg(`🧊 <b>ACCOUNT FROZEN — 48 HOURS</b>\n🗂 Case: <code>${caseId}</code>\n🆔 User: <code>${c.user_id}</code>\nAccount will auto-unfreeze after 48 hours.\n👤 By: ${actor}`);
      await answer(cbId, '🧊 Account frozen for 48 hours.', true);
      return NextResponse.json({ ok: true });
    }

    // ── PERMANENT BAN ────────────────────────────────────────────────────────
    if (action === 'ban') {
      const c = await resolveCase();
      if (!c?.user_id) { await answer(cbId, '⚠️ No linked account.', true); return NextResponse.json({ ok: true }); }
      await admin.auth.admin.updateUserById(c.user_id, { ban_duration: '87600h' });
      await admin.from('manual_audit_requests').update({ status: 'BANNED' }).eq('id', caseId);
      await closeCaseMessage(msgId, originalText, '🔒 PERMANENTLY BANNED', '⛔', actor, caseId);
      await sendMsg(`⛔ <b>ACCOUNT PERMANENTLY BANNED</b>\n🗂 Case: <code>${caseId}</code>\n🆔 User: <code>${c.user_id}</code>\n⚠️ 10-year ban applied. User cannot sign in.\n👤 By: ${actor}`);
      await answer(cbId, '🔒 Account permanently banned.', true);
      return NextResponse.json({ ok: true });
    }

    // ── FLAG FRAUDULENT ──────────────────────────────────────────────────────
    if (action === 'flag') {
      await admin.from('manual_audit_requests').update({ status: 'FLAGGED' }).eq('id', caseId);
      await closeCaseMessage(msgId, originalText, '🚨 FLAGGED AS FRAUDULENT', '🟠', actor, caseId);
      await sendMsg(`🚨 <b>CASE FLAGGED — FRAUD SUSPECTED</b>\n🗂 Case: <code>${caseId}</code>\n👤 By: ${actor}\n🕐 ${now} IST\n\n⚡ Recommended Actions:\n• Cross-reference IP with prior cases\n• Check for account farming patterns\n• Consider permanent ban if confirmed`);
      await answer(cbId, '🚨 Case flagged as fraudulent.', true);
      return NextResponse.json({ ok: true });
    }

    // ── HIGH PRIORITY ────────────────────────────────────────────────────────
    if (action === 'priority') {
      await admin.from('manual_audit_requests').update({ status: 'HIGH_PRIORITY' }).eq('id', caseId);
      await editKeyboard(msgId, {
        inline_keyboard: [
          [{ text: '📌 HIGH PRIORITY — Marked', callback_data: `noop:${caseId}` }],
          [{ text: '✅ APPROVE', callback_data: `approve:${caseId}` }, { text: '❌ REJECT', callback_data: `reject:${caseId}` }],
          [{ text: '🔒 BAN', callback_data: `ban:${caseId}` }, { text: '🚨 FLAG', callback_data: `flag:${caseId}` }],
          [{ text: '📋 Statement', callback_data: `viewfull:${caseId}` }, { text: '👤 Profile', callback_data: `accountdetails:${caseId}` }],
        ],
      });
      await sendMsg(`📌 <b>CASE MARKED HIGH PRIORITY</b>\n🗂 Case: <code>${caseId}</code>\n👤 By: ${actor} | 🕐 ${now} IST\n\n⚡ This case requires immediate attention.`);
      await answer(cbId, '📌 Marked as High Priority.');
      return NextResponse.json({ ok: true });
    }

    // ── UNDER REVIEW ─────────────────────────────────────────────────────────
    if (action === 'review') {
      await admin.from('manual_audit_requests').update({ status: 'UNDER_REVIEW' }).eq('id', caseId);
      await editKeyboard(msgId, {
        inline_keyboard: [
          [{ text: '🔄 UNDER REVIEW — Active Investigation', callback_data: `noop:${caseId}` }],
          [{ text: '✅ APPROVE', callback_data: `approve:${caseId}` }, { text: '❌ REJECT', callback_data: `reject:${caseId}` }],
          [{ text: '🚨 FLAG', callback_data: `flag:${caseId}` }, { text: '🔒 BAN', callback_data: `ban:${caseId}` }],
          [{ text: '📋 Statement', callback_data: `viewfull:${caseId}` }, { text: '🌍 IP Intel', callback_data: `ipintel:${caseId}` }],
          [{ text: '📧 Email User', callback_data: `emailuser:${caseId}` }],
        ],
      });
      await answer(cbId, '🔄 Case moved to Under Review.');
      return NextResponse.json({ ok: true });
    }

    // ── MORE INFO NEEDED ─────────────────────────────────────────────────────
    if (action === 'moreinfo') {
      const c = await resolveCase();
      await admin.from('manual_audit_requests').update({ status: 'PENDING_INFO' }).eq('id', caseId);

      if (c?.email) {
        const html = `
          <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#0a0a0d;color:#e4e4e7;padding:32px;border-radius:12px;border:1px solid #27272a">
            <h2 style="color:#f59e0b;margin-bottom:4px">Action Required</h2>
            <p style="color:#71717a;font-size:12px;margin-top:0">Verlyn Security — Case Reference: ${caseId}</p>
            <hr style="border-color:#27272a">
            <p>Dear Account Holder,</p>
            <p>We have reviewed your identity audit submission and require <strong>additional information</strong> to proceed.</p>
            <p>Please reply to <a href="mailto:security@verlyn.in" style="color:#f59e0b">security@verlyn.in</a> with:</p>
            <ul>
              <li>Your account username</li>
              <li>Any additional proof of ownership</li>
              <li>Your Case Reference ID: <strong>${caseId}</strong></li>
            </ul>
            <p>Failure to respond within <strong>72 hours</strong> may result in your case being closed.</p>
            <hr style="border-color:#27272a">
            <p style="color:#71717a;font-size:11px">— Verlyn Security Compliance Team</p>
          </div>`;
        await sendEmail(c.email, `Additional Information Required — Case ${caseId}`, html);
      }

      await editKeyboard(msgId, {
        inline_keyboard: [
          [{ text: '⏳ PENDING MORE INFO — Email Sent', callback_data: `noop:${caseId}` }],
          [{ text: '✅ APPROVE', callback_data: `approve:${caseId}` }, { text: '❌ REJECT', callback_data: `reject:${caseId}` }],
          [{ text: '📋 Full Statement', callback_data: `viewfull:${caseId}` }],
        ],
      });
      await sendMsg(`⏳ <b>MORE INFO REQUESTED</b>\n🗂 Case: <code>${caseId}</code>\n${c?.email ? `📧 Email sent to <code>${c.email}</code>` : '⚠️ No email on file — could not notify user.'}\n👤 By: ${actor} | 🕐 ${now} IST`);
      await answer(cbId, c?.email ? '⏳ More info requested — email sent to user.' : '⏳ Status updated. No email found to notify user.', true);
      return NextResponse.json({ ok: true });
    }

    // ── APPROVE / REJECT / ESCALATE ──────────────────────────────────────────
    const statusMap: Record<string, string> = { approve: 'APPROVED', reject: 'REJECTED', escalate: 'ESCALATED' };
    const newStatus = statusMap[action];
    if (!newStatus) return NextResponse.json({ ok: true });

    const c = await resolveCase();
    await admin.from('manual_audit_requests').update({ status: newStatus }).eq('id', caseId);

    const badgeMap: Record<string, [string, string]> = {
      APPROVED:  ['✅ APPROVED — Access Granted', '🟢'],
      REJECTED:  ['❌ REJECTED — Request Denied', '🔴'],
      ESCALATED: ['🔍 ESCALATED — Senior Review', '🟡'],
    };
    const [badge, color] = badgeMap[newStatus];
    await closeCaseMessage(msgId, originalText, badge, color, actor, caseId);

    if (newStatus === 'APPROVED' && c?.email) {
      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#0a0a0d;color:#e4e4e7;padding:32px;border-radius:12px;border:1px solid #27272a">
          <h2 style="color:#22c55e">Identity Verified ✅</h2>
          <p style="color:#71717a;font-size:12px;margin-top:0">Verlyn Security — Case: ${caseId}</p>
          <hr style="border-color:#27272a">
          <p>Dear Account Holder,</p>
          <p>Your identity has been <strong style="color:#22c55e">verified</strong> by our Security Compliance Team.</p>
          <p>A password reset link has been sent to this email address. Please check your inbox.</p>
          <p>If you did not request this, contact us immediately at <a href="mailto:security@verlyn.in" style="color:#22c55e">security@verlyn.in</a>.</p>
          <hr style="border-color:#27272a">
          <p style="color:#71717a;font-size:11px">— Verlyn Security Compliance Team</p>
        </div>`;
      await sendEmail(c.email, '✅ Identity Verified — Account Access Restored', html);
    }

    if (newStatus === 'REJECTED' && c?.email) {
      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#0a0a0d;color:#e4e4e7;padding:32px;border-radius:12px;border:1px solid #27272a">
          <h2 style="color:#ef4444">Request Declined ❌</h2>
          <p style="color:#71717a;font-size:12px;margin-top:0">Verlyn Security — Case: ${caseId}</p>
          <hr style="border-color:#27272a">
          <p>Dear Applicant,</p>
          <p>After careful review, we were <strong style="color:#ef4444">unable to verify</strong> sufficient ownership of the requested account.</p>
          <p>If you believe this is an error, you may re-apply after <strong>72 hours</strong> at <a href="https://verlyn.in/forgot" style="color:#3b82f6">verlyn.in/forgot</a>.</p>
          <p>For further assistance, contact <a href="mailto:security@verlyn.in" style="color:#3b82f6">security@verlyn.in</a>.</p>
          <hr style="border-color:#27272a">
          <p style="color:#71717a;font-size:11px">— Verlyn Security Compliance Team</p>
        </div>`;
      await sendEmail(c.email, '❌ Identity Audit — Request Declined', html);
    }

    const followUp: Record<string, string> = {
      APPROVED:  `✅ <b>ACCESS GRANTED</b>\n🗂 <code>${caseId}</code>\n${c?.email ? `📧 Approval email sent to <code>${c.email}</code>` : '⚠️ No email on file'}\n👤 ${actor} | 🕐 ${now} IST`,
      REJECTED:  `❌ <b>REQUEST DENIED</b>\n🗂 <code>${caseId}</code>\n${c?.email ? `📧 Rejection email sent to <code>${c.email}</code>` : '⚠️ No email on file'}\n⏳ User may re-appeal after 72 hours.\n👤 ${actor} | 🕐 ${now} IST`,
      ESCALATED: `🔍 <b>CASE ESCALATED</b>\n🗂 <code>${caseId}</code>\n📌 Assign to senior compliance officer immediately.\n👤 ${actor} | 🕐 ${now} IST`,
    };
    await sendMsg(followUp[newStatus]);
    await answer(cbId, badge);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook error:', err);
    return NextResponse.json({ ok: true });
  }
}
