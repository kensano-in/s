import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Whitelist of keys that are safe to expose publicly
const PUBLIC_KEYS = ['maintenance_mode', 'agent_presence', 'site_announcement', 'registration_locked'];

/**
 * GET /api/config/public
 * Returns a small set of non-sensitive configuration values without requiring auth.
 * Used by public-facing components (e.g. SupportCenter maintenance check).
 */
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data } = await supabase
      .from('global_config')
      .select('key, value')
      .in('key', PUBLIC_KEYS);

    const config: Record<string, string> = {};
    if (data) {
      data.forEach(item => { config[item.key] = item.value; });
    }

    return NextResponse.json({
      maintenance: config['maintenance_mode'] === 'true',
      presence: config['agent_presence'] || 'online',
      announcement: config['site_announcement'] || '',
      registration_locked: config['registration_locked'] === 'true',
    });
  } catch {
    // Return safe defaults on error rather than leaking internals
    return NextResponse.json({ maintenance: false, presence: 'online', announcement: '', registration_locked: false });
  }
}
