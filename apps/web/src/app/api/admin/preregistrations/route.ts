import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyGhostToken } from '@/lib/coming-soon/ghostToken';

const checkAdminAuth = (req: NextRequest): { ok: boolean; isGhost: boolean } => {
  const authHeader = req.headers.get('authorization');
  
  if (authHeader?.startsWith('Ghost ')) {
    const token = authHeader.slice(6);
    if (verifyGhostToken(token).valid) return { ok: true, isGhost: true };
  }

  if (!authHeader?.startsWith('Bearer ')) return { ok: false, isGhost: false };
  const token = authHeader.split(' ')[1];
  const password = token.split(':')[0];
  const adminPassword = process.env.ADMIN_PASSPHRASE || process.env.ADMIN_PASSWORD;
  return { ok: password === adminPassword, isGhost: false };
};


export async function GET(req: NextRequest) {
  const auth = checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin
      .from('preregistrations')
      .select('id, full_name, email, gender, ip_address, created_at, status')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ registrations: [] }, { status: 200 });
      throw error;
    }

    return NextResponse.json({ registrations: data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}



