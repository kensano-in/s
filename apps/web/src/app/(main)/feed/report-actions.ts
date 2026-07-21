'use server';
/**
 * ═══════════════════════════════════════════════════════════════
 *  USER REPORT SYSTEM — Server Actions
 *  Users can report posts, messages, users.
 *  System logs, deduplicates, and auto-escalates.
 * ═══════════════════════════════════════════════════════════════
 */

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { applyTrustEvent } from '@/lib/moderation/trust-score';

export type ReportTarget = 'post' | 'message' | 'user' | 'comment';
export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'violence'
  | 'misinformation'
  | 'nsfw'
  | 'impersonation'
  | 'other';

export interface SubmitReportPayload {
  targetType: ReportTarget;
  targetId: string;         // post_id, message_id, or user_id
  reportedUserId: string;   // the user who owns the content
  reason: ReportReason;
  details?: string;         // optional free-text from reporter
}

function getIp(h: Headers): string {
  const ff = h.get('x-forwarded-for');
  return ff ? ff.split(',')[0].trim() : 'unknown';
}

/**
 * Submit a user report
 */
export async function submitReport(payload: SubmitReportPayload): Promise<{
  success: boolean;
  message: string;
  reportId?: string;
}> {
  const supabase = await createClient();
  const head = await headers();
  const ip = getIp(head);

  // Get reporter identity
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'You must be logged in to report.' };

  const reporterId = user.id;

  // Resolve actual reported user ID server-side to prevent parameter spoofing
  let actualReportedUserId = '';
  
  if (payload.targetType === 'user') {
    const { data: targetUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', payload.targetId)
      .maybeSingle();
    if (!targetUser) return { success: false, message: 'Target user not found.' };
    actualReportedUserId = targetUser.id;
  } else if (payload.targetType === 'post') {
    const { data: post } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', payload.targetId)
      .maybeSingle();
    if (!post) return { success: false, message: 'Post not found.' };
    actualReportedUserId = post.author_id;
  } else if (payload.targetType === 'comment') {
    const { data: comment } = await supabase
      .from('comments')
      .select('author_id')
      .eq('id', payload.targetId)
      .maybeSingle();
    if (!comment) return { success: false, message: 'Comment not found.' };
    actualReportedUserId = comment.author_id;
  } else if (payload.targetType === 'message') {
    const { data: message } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('id', payload.targetId)
      .maybeSingle();
    if (!message) {
      // Also try community messages
      const { data: commMessage } = await supabase
        .from('community_messages')
        .select('sender_id')
        .eq('id', payload.targetId)
        .maybeSingle();
      if (!commMessage) return { success: false, message: 'Message not found.' };
      actualReportedUserId = commMessage.sender_id;
    } else {
      actualReportedUserId = message.sender_id;
    }
  } else {
    return { success: false, message: 'Invalid target type.' };
  }

  // ── Anti-Abuse: Prevent reporting your own content ─────────
  if (reporterId === actualReportedUserId) {
    return { success: false, message: 'You cannot report your own content.' };
  }

  // ── Anti-Abuse: Rate limit reports (max 5 per hour per user) ─
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: reportCount } = await supabase
    .from('content_reports')
    .select('*', { count: 'exact', head: true })
    .eq('reporter_id', reporterId)
    .gt('created_at', oneHourAgo);

  if (reportCount && reportCount >= 5) {
    return { success: false, message: 'Report limit reached. Please wait before filing more reports.' };
  }

  // ── Anti-Abuse: Prevent duplicate reports on same target ───
  const { data: existing } = await supabase
    .from('content_reports')
    .select('id')
    .eq('reporter_id', reporterId)
    .eq('target_id', payload.targetId)
    .eq('target_type', payload.targetType)
    .maybeSingle();

  if (existing) {
    return { success: false, message: 'You have already reported this content.' };
  }

  // ── Insert Report ───────────────────────────────────────────
  const { data: report, error } = await supabase
    .from('content_reports')
    .insert({
      reporter_id: reporterId,
      target_type: payload.targetType,
      target_id: payload.targetId,
      reported_user_id: actualReportedUserId,
      reason: payload.reason,
      details: payload.details?.slice(0, 500) || null,
      status: 'pending',
      reporter_ip: ip,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Report System] Insert failed:', error);
    return { success: false, message: 'Failed to submit report. Please try again.' };
  }

  // Send Telegram Admin Notification
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (token && adminChatId) {
      const { data: reporterProfile } = await supabase
        .from('users')
        .select('username')
        .eq('id', reporterId)
        .maybeSingle();

      const { data: reportedUserProfile } = await supabase
        .from('users')
        .select('username')
        .eq('id', actualReportedUserId)
        .maybeSingle();

      const reporterName = reporterProfile?.username ? `@${reporterProfile.username}` : 'Unknown';
      const reportedName = reportedUserProfile?.username ? `@${reportedUserProfile.username}` : 'Unknown';

      const text = `🚨 <b>New Content Report</b>\n\n` +
        `👤 <b>Reporter:</b> ${reporterName} (<code>${reporterId}</code>)\n` +
        `🎯 <b>Target Type:</b> <code>${payload.targetType}</code>\n` +
        `🆔 <b>Target ID:</b> <code>${payload.targetId}</code>\n` +
        `👤 <b>Reported User:</b> ${reportedName} (<code>${actualReportedUserId}</code>)\n` +
        `⚠️ <b>Reason:</b> <code>${payload.reason}</code>\n` +
        `📝 <b>Details:</b> ${payload.details || 'No details provided'}\n` +
        `🌐 <b>IP:</b> <code>${ip}</code>`;

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text,
          parse_mode: 'HTML',
        }),
      });
    }
  } catch (tgErr: any) {
    console.error('[Report System] Telegram send failed:', tgErr.message);
  }

  // ── Auto-Escalation: Check report accumulation thresholds ──
  const resolvedPayload = { ...payload, reportedUserId: actualReportedUserId };
  await autoEscalate(supabase, resolvedPayload);

  return { success: true, message: 'Report submitted. Our team will review it shortly.', reportId: report.id };
}

/**
 * Auto-escalate if thresholds are crossed:
 *   5+ unique reporters on same content → auto-flag for removal queue
 *   10+ unique reporters on same user → auto-restrict user
 */
async function autoEscalate(supabase: any, payload: SubmitReportPayload): Promise<void> {
  const { count: uniqueReporters } = await supabase
    .from('content_reports')
    .select('reporter_id', { count: 'exact', head: true })
    .eq('target_id', payload.targetId)
    .eq('target_type', payload.targetType)
    .eq('status', 'pending');

  // 5+ reports on content → flag the content item
  if (uniqueReporters && uniqueReporters >= 5) {
    if (payload.targetType === 'post') {
      await supabase
        .from('posts')
        .update({ moderation_status: 'flagged', flag_reason: 'auto_escalate_reports' })
        .eq('id', payload.targetId);
    }
    if (payload.targetType === 'comment') {
      await supabase
        .from('comments')
        .update({ moderation_status: 'flagged', flag_reason: 'auto_escalate_reports' })
        .eq('id', payload.targetId);
    }
  }

  // 10+ reports on a user → apply trust penalty + restrict
  const { count: userReports } = await supabase
    .from('content_reports')
    .select('id', { count: 'exact', head: true })
    .eq('reported_user_id', payload.reportedUserId)
    .eq('status', 'pending');

  if (userReports && userReports >= 10) {
    await applyTrustEvent(payload.reportedUserId, 'received_valid_report');
    // Log the restriction
    await supabase.from('security_events').insert({
      event_type: 'auto_user_restricted',
      severity: 'high',
      payload: { user_id: payload.reportedUserId, trigger: 'accumulated_reports', count: userReports },
    }).catch(() => {});
  }
}

/**
 * Get all pending reports for admin review
 */
export async function getAdminReports(status: 'pending' | 'resolved' | 'dismissed' = 'pending') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Admin check — relies on app_metadata.role
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { error: 'Forbidden' };

  const { data, error } = await supabase
    .from('content_reports')
    .select(`
      id, target_type, target_id, reason, details, status, created_at,
      reporter:reporter_id(id, username, display_name, trust_score),
      reported_user:reported_user_id(id, username, display_name, trust_score)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100);

  return { data, error };
}

/**
 * Resolve a report (admin action)
 */
export async function resolveReport(reportId: string, resolution: 'upheld' | 'dismissed', adminNote?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { error: 'Forbidden' };

  // Fetch the report
  const { data: report } = await supabase
    .from('content_reports')
    .select('reporter_id, reported_user_id')
    .eq('id', reportId)
    .single();

  if (!report) return { error: 'Report not found' };

  await supabase
    .from('content_reports')
    .update({ status: resolution === 'upheld' ? 'resolved' : 'dismissed', admin_note: adminNote, resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq('id', reportId);

  // Apply trust consequences
  if (resolution === 'upheld') {
    await applyTrustEvent(report.reported_user_id, 'received_valid_report');
    await applyTrustEvent(report.reporter_id, 'report_confirmed');
  } else {
    await applyTrustEvent(report.reporter_id, 'report_false');
  }

  return { success: true };
}
