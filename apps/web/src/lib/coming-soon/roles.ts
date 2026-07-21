/**
 * VERLYN — Role & Permission System
 * Defines all platform roles and their permission scopes.
 * Used by API routes, middleware, and the admin gateway.
 */

import '@/lib/sanitize-env';

// ── Role definitions ─────────────────────────────────────────────────────────

export type Role =
  | 'super_admin'
  | 'admin'
  | 'support_agent'
  | 'moderator'
  | 'viewer';

export type Permission =
  // Ticket permissions
  | 'tickets:read'
  | 'tickets:write'
  | 'tickets:delete'
  | 'tickets:assign'
  | 'tickets:close'
  // Admin permissions
  | 'admin:read'
  | 'admin:write'
  | 'admin:delete'
  | 'admin:roles'
  // User permissions
  | 'users:read'
  | 'users:ban'
  | 'users:delete'
  // System permissions
  | 'system:read'
  | 'system:config'
  | 'system:audit'
  | 'system:metrics'
  // Moderation
  | 'mod:flag'
  | 'mod:review'
  | 'mod:escalate';

// ── Permission matrix ────────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [
    'tickets:read', 'tickets:write', 'tickets:delete', 'tickets:assign', 'tickets:close',
    'admin:read', 'admin:write', 'admin:delete', 'admin:roles',
    'users:read', 'users:ban', 'users:delete',
    'system:read', 'system:config', 'system:audit', 'system:metrics',
    'mod:flag', 'mod:review', 'mod:escalate',
  ],
  admin: [
    'tickets:read', 'tickets:write', 'tickets:assign', 'tickets:close',
    'admin:read', 'admin:write',
    'users:read', 'users:ban',
    'system:read', 'system:audit', 'system:metrics',
    'mod:flag', 'mod:review', 'mod:escalate',
  ],
  support_agent: [
    'tickets:read', 'tickets:write', 'tickets:close',
    'users:read',
    'system:read', 'system:metrics',
    'mod:flag',
  ],
  moderator: [
    'tickets:read',
    'users:read', 'users:ban',
    'system:read',
    'mod:flag', 'mod:review', 'mod:escalate',
  ],
  viewer: [
    'tickets:read',
    'system:read', 'system:metrics',
  ],
};

// ── Role metadata ─────────────────────────────────────────────────────────────

export interface RoleMeta {
  label:       string;
  description: string;
  color:       string;
  level:       number;  // Higher = more authority
}

export const ROLE_META: Record<Role, RoleMeta> = {
  super_admin:   { label: 'Super Admin',    description: 'Full platform control. Can manage roles, system config, and audit trails.', color: '#a78bfa', level: 5 },
  admin:         { label: 'Admin',          description: 'Platform administration, ticket management, and user oversight.', color: '#6366f1', level: 4 },
  support_agent: { label: 'Support Agent',  description: 'Handles support tickets, replies to users, resolves cases.', color: '#3b82f6', level: 3 },
  moderator:     { label: 'Moderator',      description: 'Reviews flagged content and manages user trust signals.', color: '#10b981', level: 2 },
  viewer:        { label: 'Viewer',         description: 'Read-only access to tickets and system metrics.', color: '#94a3b8', level: 1 },
};

// ── Permission helpers ────────────────────────────────────────────────────────

/** Check if a role has a specific permission */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Check if a role has ANY of the given permissions */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

/** Check if a role has ALL of the given permissions */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

/** Get all permissions for a role */
export function getPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/** Compare two roles. Returns true if roleA outranks roleB */
export function outranks(roleA: Role, roleB: Role): boolean {
  return (ROLE_META[roleA]?.level ?? 0) > (ROLE_META[roleB]?.level ?? 0);
}

// ── Role resolution from env (admin panel auth) ───────────────────────────────

/**
 * Resolve the role from the Authorization header.
 * Format: "Bearer <password>:<2fa_token>:<role>"
 * The password must match ADMIN_PASSWORD env var.
 */
export function resolveRoleFromHeader(authHeader: string | null): Role | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const parts = authHeader.slice(7).split(':');
  const [password] = parts;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || password !== adminPassword) return null;
  // Role embedded as 3rd segment, defaults to 'admin'
  const roleSegment = parts[2] as Role | undefined;
  if (roleSegment && roleSegment in ROLE_META) return roleSegment;
  return 'admin';
}



