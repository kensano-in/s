import '@/lib/sanitize-env';
/**
 * Admin Invitations API
 *
 * GET  /api/admin/invitations     — List all invitations (admin only)
 * POST /api/admin/invitations     — Issue a new invitation (admin only)
 *
 * Authentication: uses the same Bearer/Ghost pattern as the rest of the admin API.
 * Requires full admin password authentication (not ghost mode for POST).
 */

import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import { createAdminClient } from '@/lib/coming-soon/supabase';
import { audit } from '@/lib/coming-soon/audit';
import { adminApiLimiter } from '@/lib/coming-soon/rateLimit';
import {
  generateInviteCode,
  formatInviteCode,
  hashInviteCode,
  hashEmail,
  hashIp,
} from '@/lib/coming-soon/inviteSession';
import { verifyGhostToken } from '@/lib/coming-soon/ghostToken';

// ── Shared admin auth check ────────────────────────────────────────────────────

function checkAdminAuth(req: NextRequest): { ok: boolean; isGhost: boolean; isAdmin: boolean } {
  const authHeader = req.headers.get('authorization') ?? '';

  // Ghost mode: read-only
  if (authHeader.startsWith('Ghost ')) {
    const token = authHeader.slice(6);
    if (verifyGhostToken(token).valid) return { ok: true, isGhost: true, isAdmin: false };
    return { ok: false, isGhost: false, isAdmin: false };
  }

  if (!authHeader.startsWith('Bearer ')) return { ok: false, isGhost: false, isAdmin: false };

  const [password] = authHeader.slice(7).split(':');
  const adminPassword = process.env.ADMIN_PASSPHRASE || process.env.ADMIN_PASSWORD;
  if (!adminPassword || password !== adminPassword) return { ok: false, isGhost: false, isAdmin: false };

  return { ok: true, isGhost: false, isAdmin: true };
}

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown';
}

// ── GET — List invitations ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const ip   = getIp(req);
  const rl   = adminApiLimiter(ip);
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    await audit({ category: 'security', action: 'admin.invitations.unauthorized', actor: hashIp(ip), severity: 'warn', success: false });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('invitations')
      .select('id, code, email, status, issued_by, issued_at, expires_at, redeemed_at, notes')
      .order('issued_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ invitations: data ?? [] });
  } catch (err) {
    console.error('[admin/invitations GET]', err);
    return NextResponse.json({ error: 'Failed to load invitations' }, { status: 500 });
  }
}

// ── POST — Issue a new invitation ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip   = getIp(req);
  const rl   = adminApiLimiter(ip);
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  // Issuing requires full admin (not ghost)
  const auth = checkAdminAuth(req);
  if (!auth.ok || !auth.isAdmin) {
    await audit({ category: 'security', action: 'admin.invitations.issue.unauthorized', actor: hashIp(ip), severity: 'critical', success: false });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

    const { email, name, expiryDays = 7, notes } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const days = Math.min(Math.max(Number(expiryDays) || 7, 1), 365);

    // Generate unique code
    const supabase  = createAdminClient();
    let code: string;
    let codeHash: string;

    // Retry loop to guarantee uniqueness (collision probability is astronomically low)
    for (let attempt = 0; attempt < 3; attempt++) {
      code     = generateInviteCode();
      codeHash = hashInviteCode(code);

      const { data: existing } = await supabase
        .from('invitations').select('id').eq('code_hash', codeHash).single();
      if (!existing) break;
    }

    const emailHash = hashEmail(email);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const { data: inv, error: insertErr } = await supabase
      .from('invitations')
      .insert({
        code:       code!,
        code_hash:  codeHash!,
        email:      email.trim().toLowerCase(),
        email_hash: emailHash,
        status:     'active',
        issued_by:  name ? `Admin (${name})` : 'Admin',
        expires_at: expiresAt,
        notes:      notes ?? null,
      })
      .select('id, code')
      .single();

    if (insertErr || !inv) {
      console.error('[admin/invitations POST] insert error:', insertErr);
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    await audit({
      category: 'admin', action: 'invite.issued',
      actor: hashIp(ip), target: inv.id,
      severity: 'info', success: true,
      metadata: { email_hash: emailHash, expires_at: expiresAt, days },
    });

    return NextResponse.json({
      success:        true,
      id:             inv.id,
      code:           inv.code,
      code_formatted: formatInviteCode(inv.code),
      expires_at:     expiresAt,
    });

  } catch (err) {
    console.error('[admin/invitations POST]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}



