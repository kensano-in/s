import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyGhostToken } from '@/lib/coming-soon/ghostToken';

function checkAdminAuth(req: NextRequest): { ok: boolean; isGhost: boolean } {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Ghost ')) {
    const token = authHeader.slice(6);
    const result = verifyGhostToken(token);
    return { ok: result.valid, isGhost: result.valid };
  }
  if (!authHeader?.startsWith('Bearer ')) return { ok: false, isGhost: false };
  const tokenString = authHeader.slice(7);
  const [password] = tokenString.split(':');
  const adminPassword = process.env.ADMIN_PASSPHRASE || process.env.ADMIN_PASSWORD;
  return {
    ok: !!(adminPassword && password === adminPassword),
    isGhost: false
  };
}


export async function GET(req: NextRequest) {
  const auth = checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data } = await supabase.from('global_config').select('*');
  
  const config: Record<string, any> = {};
  if (data) {
    data.forEach(item => {
      config[item.key] = item.value;
    });
  }

  // Ensure legacy boolean / integer mappings are set with defaults
  config.maintenance = config['maintenance_mode'] === 'true';
  config.presence = config['agent_presence'] || 'online';
  config.agent_name = config['agent_display_name'] || 'Verlyn Command';
  config.registration_locked = config['registration_locked'] === 'true';
  config.pow_difficulty = parseInt(config['pow_difficulty'] || '4', 10);
  config.otp_expiry_mins = parseInt(config['otp_expiry_mins'] || '10', 10);

  return NextResponse.json({ config });
}

export async function POST(req: NextRequest) {
  const auth = checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (auth.isGhost) return NextResponse.json({ error: 'Ghost sessions are read-only' }, { status: 403 });

  const { key, value } = await req.json();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  await supabase.from('global_config').upsert({ key, value: String(value) }, { onConflict: 'key' });
  return NextResponse.json({ ok: true });
}
