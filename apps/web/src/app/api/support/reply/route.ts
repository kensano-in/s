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


export async function POST(req: NextRequest) {
  try {
    const auth = checkAdminAuth(req);
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.isGhost) {
      return NextResponse.json({ error: 'Shadow sessions are read-only' }, { status: 403 });
    }

    const body = await req.json();
    const { case_id, message, is_internal } = body;

    if (!case_id || !message?.trim()) {
      return NextResponse.json({ error: 'Missing case_id or message' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Resolve ticket_id from case_id
    const { data: ticket, error: ticketErr } = await supabase
      .from('support_tickets')
      .select('id, full_name, email')
      .eq('case_id', case_id)
      .single();

    if (ticketErr || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // 2. Insert into support_messages
    const { data: msg, error: msgErr } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticket.id,
        sender_type: 'agent',
        content: message.trim(),
        agent_name: 'Verlyn Admin',
        is_internal: !!is_internal
      })
      .select()
      .single();

    if (msgErr) {
      throw msgErr;
    }

    // 3. Update ticket status if it's a client-facing reply
    if (!is_internal) {
      await supabase
        .from('support_tickets')
        .update({
          status: 'In progress',
          admin_reply: message.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', ticket.id);
    }

    return NextResponse.json({ success: true, message: msg }, { status: 201 });
  } catch (err: any) {
    console.error('[Support Reply API] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


