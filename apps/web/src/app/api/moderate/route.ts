import '@/lib/sanitize-env';
import { NextResponse } from 'next/server';
import { moderateText } from '@/lib/coming-soon/moderation';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Invalid text' }, { status: 400 });
    }

    const moderationResult = await moderateText(text);
    return NextResponse.json(moderationResult);
  } catch (error) {
    console.error('Moderation API Error:', error);
    return NextResponse.json({ isAbusive: false, error: 'Moderation failed' });
  }
}
