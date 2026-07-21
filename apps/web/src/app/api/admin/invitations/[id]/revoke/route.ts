import '@/lib/sanitize-env';
/**
 * POST /api/admin/invitations/[id]/revoke
 *
 * Revokes an active invitation. Sets status to 'revoked', records who and when.
 * Admin authentication required. Ghost mode NOT permitted.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/coming-soon/supabase';
import { audit } from '@/lib/coming-soon/audit';
import { adminApiLimiter } from '@/lib/coming-soon/rateLimit';
import { hashIp } from '@/lib/coming-soon/inviteSession';

export const dynamic = 'force-dynamic';

function checkAdminAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return false;
  const [password] = authHeader.slice(7).split(':');
  const adminPassword = process.env.ADMIN_PASSPHRASE || process.env.ADMIN_PASSWORD;
  return !!(adminPassword && password === adminPassword);
}

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown';
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = getIp(req);
  const rl = adminApiLimiter(ip);
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  if (!checkAdminAuth(req)) {
    await audit({ category: 'security', action: 'admin.invitations.revoke.unauthorized', actor: hashIp(ip), severity: 'critical', success: false });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid invitation ID' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    // Verify exists and is active
    const { data: inv, error: fetchErr } = await supabase
      .from('invitations')
      .select('id, status, email')
      .eq('id', id)
      .single();

    if (fetchErr || !inv) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    if (inv.status !== 'active') return NextResponse.json({ error: `Invitation is already ${inv.status}` }, { status: 400 });

    const { error: updateErr } = await supabase
      .from('invitations')
      .update({
        status:      'revoked',
        revoked_at:  new Date().toISOString(),
        revoked_by:  `admin:${hashIp(ip)}`,
      })
      .eq('id', id);

    if (updateErr) throw updateErr;

    // Also invalidate any active sessions for this invitation
    await supabase.from('invitation_sessions').delete().eq('invitation_id', id);

    await audit({
      category: 'admin', action: 'invite.revoked',
      actor: hashIp(ip), target: id,
      severity: 'warn', success: true,
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('[admin/invitations/revoke]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}



