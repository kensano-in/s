import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const case_id = req.nextUrl.searchParams.get('case_id');
  const email = req.nextUrl.searchParams.get('email');

  if (!case_id) return NextResponse.json({ error: 'Missing case_id' }, { status: 400 });
  if (!email) return NextResponse.json({ error: 'Access denied: Email address required for handshake verification' }, { status: 400 });

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('support_tickets')
      .select('status, admin_reply, email')
      .eq('case_id', case_id)
      .single();

    if (error || !data) {
      console.warn(`[Support Status API] Ticket not found: ${case_id}`);
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (data.email.toLowerCase().trim() !== email.toLowerCase().trim()) {
      console.error(`[Support Status API] Email mismatch for case ${case_id}. Expected: ${data.email}, Got: ${email}`);
      return NextResponse.json({ error: 'Access Denied: Ticket ownership verification failed' }, { status: 403 });
    }

    return NextResponse.json({ status: data.status, admin_reply: data.admin_reply || null });
  } catch (err: any) {
    console.error('[Support Status API] Server error:', err.message);
    return NextResponse.json({ error: 'Server error during status validation' }, { status: 500 });
  }
}
