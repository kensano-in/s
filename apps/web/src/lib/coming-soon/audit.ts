/**
 * VERLYN — Audit Trail System
 * Records every security-relevant event to the audit_logs table.
 * All logs are append-only and cannot be modified or deleted by the app layer.
 */

import { createClient } from '@supabase/supabase-js';

// ── Event type taxonomy ──────────────────────────────────────────────────────

export type AuditCategory =
  | 'auth'
  | 'admin'
  | 'support'
  | 'registration'
  | 'security'
  | 'system'
  | 'data';

export type AuditSeverity = 'info' | 'warn' | 'critical';

export interface AuditEvent {
  category:   AuditCategory;
  action:     string;            // e.g. "ticket.create", "admin.login.failed"
  actor?:     string;            // IP, email, or role identifier
  target?:    string;            // resource affected (ticket ID, email, etc.)
  metadata?:  Record<string, unknown>;
  severity:   AuditSeverity;
  success:    boolean;
}

// ── Internal log writer ──────────────────────────────────────────────────────

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Write an audit event. Fire-and-forget — never throws.
 * Falls back to console if Supabase is unavailable.
 */
export async function audit(event: AuditEvent): Promise<void> {
  const record = {
    category:  event.category,
    action:    event.action,
    actor:     event.actor    ?? null,
    target:    event.target   ?? null,
    metadata:  event.metadata ?? null,
    severity:  event.severity,
    success:   event.success,
    created_at: new Date().toISOString(),
  };

  // Always log to console (structured JSON for log aggregators)
  console.log(JSON.stringify({ audit: record }));

  // Persist to Supabase
  try {
    const client = getServiceClient();
    if (!client) return;
    await client.from('audit_logs').insert(record);
  } catch (err) {
    // Silently continue — audit must never break the primary flow
    console.warn('[AUDIT] Failed to persist:', err);
  }
}

// ── Convenience wrappers ─────────────────────────────────────────────────────

export const auditAdminLogin = (actor: string, success: boolean, meta?: Record<string, unknown>) =>
  audit({ category: 'auth', action: 'admin.login', actor, severity: success ? 'info' : 'warn', success, metadata: meta });

export const auditTicketCreate = (actor: string, ticketId: string) =>
  audit({ category: 'support', action: 'ticket.create', actor, target: ticketId, severity: 'info', success: true });

export const auditTicketUpdate = (actor: string, ticketId: string, changes: Record<string, unknown>) =>
  audit({ category: 'admin', action: 'ticket.update', actor, target: ticketId, severity: 'info', success: true, metadata: changes });

export const auditRateLimit = (actor: string, endpoint: string) =>
  audit({ category: 'security', action: 'rate_limit.hit', actor, target: endpoint, severity: 'warn', success: false });

export const auditSpamDetect = (actor: string, field: string) =>
  audit({ category: 'security', action: 'spam.detected', actor, metadata: { field }, severity: 'warn', success: false });

export const auditRegistration = (actor: string, email: string, success: boolean, reason?: string) =>
  audit({ category: 'registration', action: 'preregister.submit', actor, target: email, severity: 'info', success, metadata: reason ? { reason } : undefined });

export const auditUnauthorized = (actor: string, endpoint: string) =>
  audit({ category: 'security', action: 'access.unauthorized', actor, target: endpoint, severity: 'critical', success: false });
