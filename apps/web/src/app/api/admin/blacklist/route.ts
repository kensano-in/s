import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function checkAdminAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return false;
  const [password] = authHeader.slice(7).split(':');
  const adminPassword = process.env.ADMIN_PASSPHRASE || process.env.ADMIN_PASSWORD;
  return !!(adminPassword && password === adminPassword);
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { ip, reason = 'Administrative Ban' } = await req.json();
    if (!ip) return NextResponse.json({ error: 'IP is required' }, { status: 400 });
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    
    const { error } = await supabase
      .from('spam_blacklist')
      .upsert({ ip_address: ip, reason }, { onConflict: 'ip_address' });
      
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Admin Blacklist POST]', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
