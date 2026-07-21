import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    const adminPassword = process.env.ADMIN_PASSPHRASE || process.env.ADMIN_PASSWORD;
    if (!adminPassword || auth !== `Bearer ${adminPassword}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message } = await req.json();
    if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: tickets } = await supabase
      .from('support_tickets')
      .select('case_id')
      .eq('status', 'In progress');

    if (!tickets || tickets.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const messages = tickets.map(t => ({
      case_id: t.case_id,
      sender_type: 'agent',
      content: message,
      agent_name: 'Verlyn Overwatch',
      is_internal: false
    }));

    const { error } = await supabase.from('support_messages').insert(messages);
    if (error) throw error;

    // Log to audit
    await supabase.from('audit_logs').insert({
      action: 'GLOBAL_CLIENT_BROADCAST',
      metadata: { message, target_count: tickets.length }
    });

    return NextResponse.json({ success: true, count: tickets.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

