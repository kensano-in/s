import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const adminPassword = process.env.ADMIN_PASSPHRASE || process.env.ADMIN_PASSWORD;
    if (!adminPassword || authHeader !== `Bearer ${adminPassword}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const target = searchParams.get('target');

    if (!target) {
      return NextResponse.json({ error: 'Target identifier required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Intelligence gathering
    const [regRes, blackRes, tixRes] = await Promise.all([
      supabase.from('preregistrations').select('*').or(`email.eq.${target},raw_ip.eq.${target}`).maybeSingle(),
      supabase.from('spam_blacklist').select('*').eq('ip_address', target).maybeSingle(),
      supabase.from('support_tickets').select('case_id, status, subject, created_at').or(`email.eq.${target},ip_address.eq.${target}`).order('created_at', { ascending: false }).limit(10)
    ]);

    return NextResponse.json({
      reg: regRes.data,
      black: blackRes.data,
      tix: tixRes.data
    });

  } catch (err: any) {
    console.error('[Admin Lookup] Error:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
