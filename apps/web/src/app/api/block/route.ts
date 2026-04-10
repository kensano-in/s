import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { blockUserDB, unblockUserDB } from '@/app/(main)/messages/actions';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, data: null, error: 'Unauthorized' }, { status: 401 });
    }

    const { targetUserId, action } = await req.json();

    if (!targetUserId || !['block', 'unblock'].includes(action)) {
      return NextResponse.json({ success: false, data: null, error: 'Invalid request' }, { status: 400 });
    }

    const result = action === 'block'
      ? await blockUserDB(user.id, targetUserId)
      : await unblockUserDB(user.id, targetUserId);

    if (!result.success) {
      return NextResponse.json({ success: false, data: null, error: result.error }, { status: 422 });
    }

    return NextResponse.json({ success: true, data: { action, targetUserId }, error: null });
  } catch (err: any) {
    return NextResponse.json({ success: false, data: null, error: err.message }, { status: 500 });
  }
}
