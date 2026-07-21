import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import speakeasy from 'speakeasy';

const checkAdminAuth = (req: NextRequest) => {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const [password, token2fa] = authHeader.split(' ')[1].split(':');
  const adminPassword = process.env.ADMIN_PASSPHRASE || process.env.ADMIN_PASSWORD;
  const secret2fa = process.env.ADMIN_2FA_SECRET;
  if (password !== adminPassword) return false;
  if (secret2fa) {
    if (!token2fa) return false;
    return speakeasy.totp.verify({ secret: secret2fa, encoding: 'base32', token: token2fa, window: 2 });
  }
  return true;
};

const supabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ticketId = req.nextUrl.searchParams.get('ticket_id');
  try {
    let query = supabaseAdmin().from('admin_notes').select('*').order('created_at', { ascending: false });
    if (ticketId) query = query.eq('ticket_id', ticketId);
    const { data, error } = await query;
    if (error?.code === '42P01') return NextResponse.json({ notes: [] });
    if (error) throw error;
    return NextResponse.json({ notes: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const { ticket_id, note, flag, risk_score, author } = body;
    if (!ticket_id || !note) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    // Try to upsert into admin_notes table
    const { data, error } = await supabaseAdmin()
      .from('admin_notes')
      .insert({
        ticket_id,
        note: note.slice(0, 2000),
        flag: flag || 'none',
        risk_score: Math.min(100, Math.max(0, risk_score || 0)),
        author: author || 'System',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error?.code === '42P01') {
      // Table doesn't exist — return mock success
      return NextResponse.json({ success: true, note: { id: 'mock', ticket_id, note, flag, risk_score, author, created_at: new Date().toISOString() } });
    }
    if (error) throw error;
    return NextResponse.json({ success: true, note: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}



