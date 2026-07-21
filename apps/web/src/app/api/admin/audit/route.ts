import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveRoleFromHeader } from '@/lib/coming-soon/roles';
import { verifyGhostToken } from '@/lib/coming-soon/ghostToken';

function checkAdminAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Ghost ')) {
    const token = authHeader.slice(6);
    return verifyGhostToken(token).valid;
  }
  if (!authHeader?.startsWith('Bearer ')) return false;
  const tokenString = authHeader.slice(7);
  const [password] = tokenString.split(':');
  const adminPassword = process.env.ADMIN_PASSPHRASE || process.env.ADMIN_PASSWORD;
  return !!(adminPassword && password === adminPassword);
}

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ logs });
}
