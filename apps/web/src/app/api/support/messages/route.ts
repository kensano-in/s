import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyGhostToken } from '@/lib/coming-soon/ghostToken';

const checkAdminAuth = (req: NextRequest): { ok: boolean; isGhost: boolean } => {
  const authHeader = req.headers.get('authorization');
  
  if (authHeader?.startsWith('Ghost ')) {
    const token = authHeader.slice(6);
    const result = verifyGhostToken(token);
    return { ok: result.valid, isGhost: result.valid };
  }

  if (!authHeader?.startsWith('Bearer ')) return { ok: false, isGhost: false };
  const token = authHeader.split(' ')[1];
  const adminPassword = process.env.ADMIN_PASSPHRASE || process.env.ADMIN_PASSWORD;
  if (!adminPassword) return { ok: false, isGhost: false };
  return { ok: token === adminPassword, isGhost: false };
};


function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/support/messages?ticket_id=xxx — Get all messages for a ticket
// GET /api/support/messages?case_id=xxx — Public: get user-visible messages for a case
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ticketId = searchParams.get('ticket_id');
  const caseId = searchParams.get('case_id');

  if (!ticketId && !caseId) {
    return NextResponse.json({ error: 'Missing ticket_id or case_id' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();
    let query = supabase
      .from('support_messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (ticketId) {
      // Admin access — show all messages including internal
      const auth = checkAdminAuth(req);
      if (!auth.ok) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      query = query.eq('ticket_id', ticketId);
    } else {
      // Public access — only show non-internal messages, resolve ticket_id from case_id
      const email = searchParams.get('email');
      if (!email) {
        return NextResponse.json({ error: 'Access denied: Email address required for handshake verification' }, { status: 400 });
      }

      const { data: ticket } = await supabase
        .from('support_tickets')
        .select('id, email')
        .eq('case_id', caseId!)
        .single();

      if (!ticket) return NextResponse.json({ messages: [] });

      if (ticket.email.toLowerCase().trim() !== email.toLowerCase().trim()) {
        console.error(`[Support Messages GET] Email mismatch for case ${caseId}. Expected: ${ticket.email}, Got: ${email}`);
        return NextResponse.json({ error: 'Access Denied: Ticket ownership verification failed' }, { status: 403 });
      }

      query = query.eq('ticket_id', ticket.id).eq('is_internal', false);
    }

    const { data, error } = await query;
    if (error && error.code !== '42P01') throw error;

    return NextResponse.json({ messages: data || [] });
  } catch (err: any) {
    console.error('[Support Messages GET] Error:', err.message);
    return NextResponse.json({ error: 'Internal server error while retrieving messages' }, { status: 500 });
  }
}

// POST /api/support/messages — Send a message (user or admin)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticket_id, case_id, email, content, sender_type, agent_name, agent_role, is_internal } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    let resolvedTicketId = ticket_id;

    // Admin validation for agent messages
    const auth = checkAdminAuth(req);
    const isAgent = sender_type === 'agent';

    if (isAgent) {
      if (!auth.ok || auth.isGhost) {
        return NextResponse.json({ error: auth.isGhost ? 'Shadow sessions are read-only' : 'Unauthorized' }, { status: auth.isGhost ? 403 : 401 });
      }
    } else {
      if (!case_id) {
        return NextResponse.json({ error: 'case_id is required' }, { status: 400 });
      }
      if (!email) {
        return NextResponse.json({ error: 'Access denied: Email address required for handshake verification' }, { status: 400 });
      }

      const { data: ticket } = await supabase
        .from('support_tickets')
        .select('id, status, email')
        .eq('case_id', case_id)
        .single();

      if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      if (ticket.status === 'Resolved') return NextResponse.json({ error: 'Cannot message on a resolved ticket' }, { status: 400 });

      if (ticket.email.toLowerCase().trim() !== email.toLowerCase().trim()) {
        console.error(`[Support Messages POST] Email mismatch for case ${case_id}. Expected: ${ticket.email}, Got: ${email}`);
        return NextResponse.json({ error: 'Access Denied: Ticket ownership verification failed' }, { status: 403 });
      }

      resolvedTicketId = ticket.id;
    }

    const { data, error } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: resolvedTicketId,
        sender_type: sender_type || 'user',
        content: content.trim(),
        agent_name: agent_name || null,
        is_internal: is_internal || false,
      })
      .select()
      .single();

    if (error) {
      console.error('[Support Messages POST] Database Insert Error:', error.message);
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Support database schema error. Please run migration.' }, { status: 503 });
      }
      return NextResponse.json({ error: 'Database connection error during transmission' }, { status: 500 });
    }

    // If agent sent a visible reply, update ticket status and admin_reply field
    if (sender_type === 'agent' && !is_internal) {
      await supabase
        .from('support_tickets')
        .update({ status: 'In progress', admin_reply: content.trim(), updated_at: new Date().toISOString() })
        .eq('id', resolvedTicketId);
    }

    // If user sent a reply, update status to In progress (don't null admin_reply)
    if (sender_type === 'user') {
      // ── Shadow Session Check ──
      const { data: ticketFull } = await supabase.from('support_tickets').select('case_id, ip_address, email').eq('id', resolvedTicketId).single();
      const ipKey = ticketFull?.ip_address ? `shadow_${ticketFull.ip_address}` : null;
      const emailKey = ticketFull?.email ? `shadow_${ticketFull.email}` : null;
      
      const { data: shadowStatus } = await supabase.from('global_config')
        .select('value')
        .or(`key.eq.${ipKey},key.eq.${emailKey}`)
        .eq('value', 'true')
        .maybeSingle();

      const isShadowed = !!shadowStatus;

      await supabase
        .from('support_tickets')
        .update({ status: 'In progress', updated_at: new Date().toISOString() })
        .eq('id', resolvedTicketId);

      // ── Notify Telegram ──
      try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID || '7814788493';
        if (botToken && ticketFull) {
          const header = isShadowed ? `[ 𝗦𝗛𝗔𝗗𝗢𝗪 𝗠𝗢𝗡𝗜𝗧𝗢𝗥 ]` : `[ 𝗨𝗣𝗗𝗔𝗧𝗘𝗗 𝗗𝗢𝗦𝗦𝗜𝗘𝗥 ]`;
          const status = isShadowed ? `𝗦𝗧𝗔𝗧𝗨𝗦   :: [ STEALTH CAPTURE ]` : `𝗦𝗧𝗔𝗧𝗨𝗦   :: [ USER CHAT REPLY ]`;

          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `${header}\n` +
                    `𝗜𝗗: \`${ticketFull.case_id}\`\n` +
                    `━━━━━━━━━━━━━━━━━━━\n` +
                    `${status}\n` +
                    `━━━━━━━━━━━━━━━━━━━\n` +
                    `*NEW PAYLOAD:*\n> ${content.substring(0, 300)}${content.length > 300 ? '...' : ''}\n\n` +
                    `[ 𝗜𝗡𝗧𝗘𝗟: ${isShadowed ? 'STEALTH' : 'SECURED'} ]   [ 𝗧𝗜𝗠𝗘: ${new Date().toISOString().split('T')[1].slice(0, 5)} UTC ]\n` +
                    `━━━━━━━━━━━━━━━━━━━`,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: isShadowed ? '👻 GHOST REPLY' : '⚡ REPLY', callback_data: `reply_hint_${ticketFull.case_id}` }, { text: '🤖 AI AUTO', callback_data: `ai_reply_${ticketFull.case_id}` }, { text: '🖥️ WEB', web_app: { url: `https://verlyn.in/tg-admin?case_id=${ticketFull.case_id}` } }],
                  [{ text: '🔍 TRACE IP', callback_data: `ip_intel_${ticketFull.case_id}` }, { text: '⚠️ ESCALATE', callback_data: `escalate_${ticketFull.case_id}` }],
                  [{ text: '✅ RESOLVE', callback_data: `resolve_${ticketFull.case_id}` }, { text: '🚫 PERMA-BAN', callback_data: `ban_${ticketFull.case_id}` }]
                ]
              }
            })
          });
        }
      } catch (e) { console.error('TG Notification error:', e); }
    }

    return NextResponse.json({ message: data }, { status: 201 });
  } catch (err: any) {
    console.error('[Support Messages POST] Unhandled Error:', err.message);
    return NextResponse.json({ error: 'Internal server error while transmitting message' }, { status: 500 });
  }
}



