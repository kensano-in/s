/**
 * VERLYN — Secure Communication Utilities
 * CSRF token generation, IP hashing, and response hardening helpers.
 * Note: Full E2E encryption (libsodium/Signal protocol) is implemented
 * at the network/Supabase Realtime layer. This file covers HTTP-layer security.
 */

import { createHash, randomBytes } from 'crypto';

// ── IP Hashing ────────────────────────────────────────────────────────────────

/**
 * SHA-256 hash of an IP address with a server-side salt.
 * Used for rate limiting and deduplication without storing raw IPs.
 */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? 'verlyn-ip-salt-2024';
  return createHash('sha256').update(salt + ip).digest('hex');
}

// ── CSRF Tokens ────────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure CSRF token.
 * 32 bytes = 256 bits of entropy.
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// ── Security Headers ─────────────────────────────────────────────────────────

/**
 * Returns hardened HTTP security headers for API responses.
 * Apply with: new NextResponse(body, { headers: securityHeaders() })
 */
export function securityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options':           'nosniff',
    'X-XSS-Protection':                 '1; mode=block',
    'Referrer-Policy':                  'strict-origin-when-cross-origin',
    'Permissions-Policy':               'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security':        'max-age=63072000; includeSubDomains; preload',
    'Content-Security-Policy':          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' *.supabase.co wss://*.supabase.co; frame-ancestors 'self' https://t.me https://web.telegram.org https://*.telegram.org;",
    'Cache-Control':                    'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma':                           'no-cache',
  };
}

// ── Input Sanitization ────────────────────────────────────────────────────────

/** Deep sanitize: strips HTML, nulls, and control characters */
export function deepSanitize(input: unknown, maxLen = 2000): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/<[^>]*>/g, '')               // Strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')  // Control chars
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '')          // Non-printable
    .slice(0, maxLen);
}

// ── Request IP extraction ─────────────────────────────────────────────────────

import type { NextRequest } from 'next/server';

/** Safely extract the originating IP from a Next.js request */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ??         // Cloudflare
    req.headers.get('x-real-ip') ??                 // nginx
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

// ── Session fingerprint ───────────────────────────────────────────────────────

/** Build a session fingerprint from request headers for anomaly detection */
export function buildSessionFingerprint(req: NextRequest): string {
  const components = [
    req.headers.get('user-agent') ?? '',
    req.headers.get('accept-language') ?? '',
    req.headers.get('accept-encoding') ?? '',
  ];
  return createHash('sha256').update(components.join('|')).digest('hex').slice(0, 16);
}

// ── Global System Controls ──────────────────────────────────────────────────

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Checks if the system is currently in maintenance mode.
 * Fetches from 'global_config' table with key 'maintenance_mode'.
 */
export async function isMaintenanceMode(): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('global_config')
      .select('value')
      .eq('key', 'maintenance_mode')
      .single();
    
    return data?.value === 'true' || data?.value === true;
  } catch {
    return false; // Fail-safe: open by default
  }
}

/**
 * Assigns a priority score to a ticket based on risk and report type.
 */
export function calculatePriority(reportType: string, riskScore: number): 'low' | 'normal' | 'high' | 'critical' {
  if (reportType === 'emergency' || reportType === 'security') return 'critical';
  if (reportType === 'bug' && riskScore > 40) return 'high';
  if (riskScore > 50) return 'high';
  if (riskScore < 10) return 'low';
  return 'normal';
}
