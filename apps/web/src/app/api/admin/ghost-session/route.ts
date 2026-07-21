import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { issueGhostToken } from '@/lib/coming-soon/ghostToken';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
    const weekKey = `ghost_trial_${ipHash}_${new Date().getFullYear()}_W${getWeekNumber(new Date())}`;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // 1. Check current week's usage
    const { data: config } = await supabase
      .from('global_config')
      .select('value')
      .eq('key', weekKey)
      .maybeSingle();

    const count = config ? parseInt(config.value, 10) : 0;

    if (count >= 2) {
      return NextResponse.json({ 
        error: 'TRIAL_LIMIT_REACHED', 
        message: 'You have reached your limit of 2 shadow sessions per week.' 
      }, { status: 429 });
    }

    // 2. Increment count
    await supabase.from('global_config').upsert({ 
      key: weekKey, 
      value: (count + 1).toString() 
    }, { onConflict: 'key' });

    // 3. Log the event
    await supabase.from('audit_logs').insert({
      category: 'SECURITY',
      action: 'GHOST_SESSION_START',
      actor: ipHash.substring(0, 8),
      metadata: { week_count: count + 1 },
      severity: 'info'
    });

    // 4. Issue a real HMAC-signed ghost token — NOT a static string
    const token = issueGhostToken();
    const expiresAt = new Date(Date.now() + 30 * 60000).toISOString();

    return NextResponse.json({ 
      success: true, 
      token,
      expires_at: expiresAt
    });

  } catch (err: any) {
    console.error('[Ghost Session] Error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

function getWeekNumber(d: Date) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}
