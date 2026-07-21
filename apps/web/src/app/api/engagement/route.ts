import '@/lib/sanitize-env';
/**
 * POST /api/engagement
 *
 * Non-blocking engagement logging endpoint.
 * Called via navigator.sendBeacon() / fetch from the client — never awaited.
 * This avoids blocking Server Actions and keeps the UI snappy.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logEngagement } from '@/lib/ranking/feedback';
import { createClient } from '@/lib/supabase/server';
import type { EngagementAction } from '@/lib/ranking/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { postId, action, duration, scrollPct } = body as {
      postId: string;
      action: EngagementAction;
      duration?: number;
      scrollPct?: number;
    };

    if (!postId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get authenticated user from session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Anonymous — no personalization yet; skip logging
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Fire engagement logging (background — we don't await the full chain)
    logEngagement({ userId: user.id, postId, action, duration, scrollPct });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Never return 5xx for analytics — it would block sendBeacon retry loops
    console.error('[/api/engagement] Error:', err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
