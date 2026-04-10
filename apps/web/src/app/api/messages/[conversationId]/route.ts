import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, data: null, error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId: otherUserId } = await params;
    const cursor = req.nextUrl.searchParams.get('cursor');
    const limit = 50;

    let query = supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),` +
        `and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`
      )
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('sent_at', cursor);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, data: null, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: (data || []).reverse(),
      error: null,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, data: null, error: err.message }, { status: 500 });
  }
}
