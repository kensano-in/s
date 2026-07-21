import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: configs } = await supabase
      .from('global_config')
      .select('key, value')
      .in('key', ['site_announcement', 'maintenance_mode', 'registration_locked']);

    const result = {
      announcement: configs?.find(c => c.key === 'site_announcement')?.value || '',
      maintenance: configs?.find(c => c.key === 'maintenance_mode')?.value === 'true',
      registrationLocked: configs?.find(c => c.key === 'registration_locked')?.value === 'true'
    };

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
