import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('users').select('username').limit(1);
    if (error) {
      return NextResponse.json({ success: false, source: 'database', message: error.message, error });
    }
    return NextResponse.json({ success: true, users: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, source: 'catch', message: err.message, stack: err.stack });
  }
}
