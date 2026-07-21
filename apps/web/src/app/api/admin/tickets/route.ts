import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import speakeasy from 'speakeasy';
import { adminApiLimiter } from '@/lib/coming-soon/rateLimit';
import { getClientIp, hashIp, securityHeaders } from '@/lib/coming-soon/secureComm';
import { resolveRoleFromHeader, hasPermission } from '@/lib/coming-soon/roles';
import { auditAdminLogin, auditTicketUpdate, auditUnauthorized } from '@/lib/coming-soon/audit';
import { verifyGhostToken } from '@/lib/coming-soon/ghostToken';

// ── Admin authentication ───────────────────────────────────────────────────────
// For GET (login): full 2FA check is enforced.
// For PATCH/writes: only password is required (TOTP expires in 30s, can't be reused for session writes).
function checkAdminAuth(req: NextRequest, require2fa = false): { ok: boolean; role?: ReturnType<typeof resolveRoleFromHeader>; isGhost?: boolean } {
  const authHeader = req.headers.get('authorization');
  
  // Ghost Mode Check
  if (authHeader?.startsWith('Ghost ')) {
    const token = authHeader.slice(6);
    if (verifyGhostToken(token).valid) {
      return { ok: true, role: 'viewer', isGhost: true };
    }
    return { ok: false };
  }

  if (!authHeader?.startsWith('Bearer ')) return { ok: false };

  const tokenString = authHeader.slice(7);
  // token format: password or password:totp
  const [password, token2fa] = tokenString.split(':');

  const adminPassword = process.env.ADMIN_PASSPHRASE || process.env.ADMIN_PASSWORD;
  const secret2fa     = process.env.ADMIN_2FA_SECRET;

  if (!adminPassword || password !== adminPassword) return { ok: false };

  // Only enforce 2FA on initial login (GET request to fetch tickets)
  if (require2fa && secret2fa) {
    if (!token2fa) return { ok: false };
    const valid = speakeasy.totp.verify({
      secret:   secret2fa,
      encoding: 'base32',
      token:    token2fa,
      window:   2,
    });
    if (!valid) return { ok: false };
  }

  const role = resolveRoleFromHeader(authHeader);
  return { ok: true, role, isGhost: false };
}

// ── GET: Fetch all tickets ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const headers = securityHeaders();
  const ip = getClientIp(req);
  const ipHash = hashIp(ip);

  // Rate limit admin API
  const rl = adminApiLimiter(ipHash);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers });
  }

  const auth = checkAdminAuth(req, true); // require 2FA on login (unless ghost)
  if (!auth.ok) {
    await auditUnauthorized(ipHash, '/api/admin/tickets GET');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  }

  if (auth.isGhost) {
    await auditAdminLogin(ipHash, true, { endpoint: 'GET /api/admin/tickets', role: 'shadow_trial' });
  } else {
    await auditAdminLogin(ipHash, true, { endpoint: 'GET /api/admin/tickets', role: auth.role });
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Support role-based field filtering
    const fields = auth.role === 'viewer'
      ? 'id,case_id,subject,status,report_type,created_at,updated_at'
      : '*';

    const url = new URL(req.url);
    const statusFilter  = url.searchParams.get('status');
    const priorityFilter = url.searchParams.get('priority');
    const limitParam    = parseInt(url.searchParams.get('limit') ?? '100');
    const limit         = Math.min(Math.max(1, limitParam), 500);

    let query = supabaseAdmin
      .from('support_tickets')
      .select(fields)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (statusFilter)   query = query.eq('status', statusFilter);
    if (priorityFilter) query = query.eq('priority', priorityFilter);

    const { data, error } = await query;
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ tickets: [] }, { status: 200, headers });
      throw error;
    }

    return NextResponse.json({ tickets: data, role: auth.role }, { status: 200, headers });
  } catch (err: unknown) {
    const msg = err instanceof Error
      ? err.message
      : (err as any)?.message || (err as any)?.details || JSON.stringify(err) || 'Internal server error';
    console.error('[Admin Tickets GET]', err);
    return NextResponse.json({ error: msg }, { status: 500, headers });
  }
}

// ── PATCH: Update ticket ──────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const headers = securityHeaders();
  const ip = getClientIp(req);
  const ipHash = hashIp(ip);

  const rl = adminApiLimiter(ipHash);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers });
  }

  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    await auditUnauthorized(ipHash, '/api/admin/tickets PATCH');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  }

  // Viewers and Ghost sessions cannot write
  if (auth.isGhost || !hasPermission(auth.role ?? 'viewer', 'tickets:write')) {
    return NextResponse.json({ error: 'Insufficient permissions. Shadow sessions are read-only.' }, { status: 403, headers });
  }

  try {
    const body = await req.json() as Record<string, unknown>;
    const { id, status, admin_reply, priority, assigned_to, internal_notes } = body;

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400, headers });

    const updatePayload: Record<string, unknown> = {};
    if (status)         updatePayload.status         = status;
    if (admin_reply !== undefined) updatePayload.admin_reply = admin_reply;
    if (priority)       updatePayload.priority       = priority;
    if (assigned_to !== undefined) updatePayload.assigned_to = assigned_to;
    if (internal_notes !== undefined) updatePayload.internal_notes = internal_notes;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400, headers });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { error } = await supabaseAdmin
      .from('support_tickets')
      .update(updatePayload)
      .eq('id', String(id));

    if (error) throw error;

    await auditTicketUpdate(ipHash, String(id), updatePayload);

    return NextResponse.json({ success: true }, { status: 200, headers });
  } catch (err: unknown) {
    const msg = err instanceof Error
      ? err.message
      : (err as any)?.message || (err as any)?.details || JSON.stringify(err) || 'Internal server error';
    console.error('[Admin Tickets PATCH]', err);
    return NextResponse.json({ error: msg }, { status: 500, headers });
  }
}




