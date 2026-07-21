import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const checkAdminAuth = (req: NextRequest): boolean => {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.split(' ')[1];
  const adminPassword = process.env.ADMIN_PASSPHRASE || process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return token === adminPassword;
};


// GET /api/support/ticket?case_id=xyz
export async function GET(req: NextRequest) {
  try {
    if (!checkAdminAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const caseId = req.nextUrl.searchParams.get('case_id');
    if (!caseId) {
      return NextResponse.json({ error: 'Missing case_id' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: ticket, error } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .eq('case_id', caseId)
      .single();

    if (error || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check Shadow Status
    const ipKey = ticket.ip_address ? `shadow_${ticket.ip_address}` : null;
    const emailKey = ticket.email ? `shadow_${ticket.email}` : null;
    
    const { data: shadowData } = await supabaseAdmin
      .from('global_config')
      .select('value')
      .or(`key.eq.${ipKey},key.eq.${emailKey}`)
      .eq('value', 'true')
      .maybeSingle();

    return NextResponse.json({ 
      ticket: { ...ticket, is_shadowed: !!shadowData } 
    }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/support/ticket
export async function PATCH(req: NextRequest) {
  try {
    if (!checkAdminAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id, status } = await req.json();
    if (!case_id || !status) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { error } = await supabaseAdmin
      .from('support_tickets')
      .update({ status })
      .eq('case_id', case_id);

    if (error) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



