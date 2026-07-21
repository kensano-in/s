import '@/lib/sanitize-env';
/**
 * ═══════════════════════════════════════════════════════════════
 *  API ROUTE: POST /api/security/moderate
 *  Pre-upload content moderation endpoint.
 *  Call this BEFORE inserting any post/comment/message.
 * ═══════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { evaluateContent } from '@/lib/moderation/flagging';
import { applyTrustEvent } from '@/lib/moderation/trust-score';

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Build a minimal server client (read-only auth check)
  let supabaseResponse = NextResponse.next({ request: { headers: req.headers } });
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (c) => {
        supabaseResponse = NextResponse.next({ request: req });
        c.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { text: string; actionType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.text || typeof body.text !== 'string') {
    return NextResponse.json({ error: 'text field is required' }, { status: 400 });
  }

  const ip = getIp(req);
  const verdict = await evaluateContent({
    text: body.text,
    authorId: user.id,
    actionType: (body.actionType as any) ?? 'post',
    ip,
  });

  // If content is blocked, apply trust penalty
  if (verdict.action === 'block') {
    await applyTrustEvent(user.id, 'post_blocked');
  }

  return NextResponse.json({
    allowed: verdict.action !== 'block' && verdict.action !== 'shadow',
    action: verdict.action,
    riskScore: verdict.riskScore,
    flagStatus: verdict.flagStatus,
    reasons: verdict.reasons,
    botRisk: verdict.botRisk,
  });
}
