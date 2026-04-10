import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendMessageDB } from '@/app/(main)/messages/actions';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, data: null, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { recipientId, content, type = 'text', mediaUrl, fileName, mimeType } = body;

    if (!recipientId || !content) {
      return NextResponse.json({ success: false, data: null, error: 'Missing required fields' }, { status: 400 });
    }

    const result = await sendMessageDB(user.id, recipientId, content, type, mediaUrl, fileName, mimeType);

    if (!result.success) {
      return NextResponse.json({ success: false, data: null, error: result.error }, { status: 422 });
    }

    return NextResponse.json({ success: true, data: result.data, error: null });
  } catch (err: any) {
    return NextResponse.json({ success: false, data: null, error: err.message }, { status: 500 });
  }
}
