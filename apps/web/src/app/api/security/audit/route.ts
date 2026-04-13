import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

/**
 * Security Audit API
 * Automatically bans identities with high-risk behavior
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.INTERNAL_AUTH_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createAdminClient();
  const banThresholds = {
    failed_login: 10,
    signup_blocked: 3,
    spam_burst: 5,
    disposable_email: 5,
  };

  try {
    const results = [];
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Analyze IPs with high violation counts
    const { data: violators } = await supabase.rpc('get_security_violators', {
      p_since: oneDayAgo
    }) || { data: [] };

    for (const v of violators) {
      const threshold = banThresholds[v.event_type as keyof typeof banThresholds] || 10;

      if (v.event_count >= threshold) {
        // Ban for 24 hours
        const { error } = await supabase.from('banned_identities').upsert({
          type: 'ip',
          identifier: v.ip_address,
          reason: `Automated ban: High frequency of ${v.event_type} (${v.event_count} events)`,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }, { onConflict: 'type,identifier' });

        if (!error) results.push({ ip: v.ip_address, type: v.event_type });
      }
    }

    return NextResponse.json({ success: true, bans_issued: results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
