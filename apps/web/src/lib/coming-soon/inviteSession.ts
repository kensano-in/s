/**
 * VERLYN — Invitation Session Security Library
 * Handles JWT signing/verification, OTP generation/hashing,
 * email normalization, and all cryptographic utilities for the
 * Advanced Access flow.
 *
 * Server-side only. Never import this in client components.
 */

import { createHash, randomBytes, randomInt } from 'crypto';
import bcrypt from 'bcryptjs';

// ── Constants ─────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS       = 12;
const OTP_LENGTH          = 6;
const SESSION_EXPIRY_SECS = 15 * 60;          // 15 minutes per stage
const JWT_ALGORITHM       = 'HS256';
const HEADER_B64          = Buffer.from(JSON.stringify({ alg: JWT_ALGORITHM, typ: 'JWT' })).toString('base64url');

// ── Types ─────────────────────────────────────────────────────────────────────

export type InviteStage = 'agreements_accepted' | 'code_verified' | 'email_verified' | 'otp_verified';

export interface InviteSessionPayload {
  /** Supabase invitation row ID */
  inv_id:     string;
  /** Current verification stage */
  stage:      InviteStage;
  /** SHA-256 of normalized email — for server-side comparison only */
  email_hash: string;
  /** JWT ID (nonce) — single-use replay protection */
  jti:        string;
  /** Issued-at Unix seconds */
  iat:        number;
  /** Expiry Unix seconds */
  exp:        number;
}

// ── JWT (HMAC-SHA256) ─────────────────────────────────────────────────────────

function getSecret(): string {
  const secret = process.env.INVITE_JWT_SECRET;
  if (!secret) throw new Error('[InviteSession] INVITE_JWT_SECRET is not set');
  return secret;
}

function hmacSign(data: string, secret: string): string {
  const { createHmac } = require('crypto') as typeof import('crypto');
  return createHmac('sha256', secret).update(data).digest('base64url');
}

/**
 * Sign an invitation session JWT (auto-generates jti).
 * Returns a compact HS256 JWT string.
 */
export function signInviteJWT(
  payload: Omit<InviteSessionPayload, 'iat' | 'exp' | 'jti'>,
): string {
  return signInviteJWTWithJti({ ...payload, jti: generateJti() });
}

/**
 * Sign an invitation session JWT with a pre-provided jti.
 * Use this when you need to store the jti in the DB before issuing the token.
 */
export function signInviteJWTWithJti(
  payload: Omit<InviteSessionPayload, 'iat' | 'exp'> & { jti: string },
): string {
  const secret = getSecret();
  const iat    = Math.floor(Date.now() / 1000);
  const exp    = iat + SESSION_EXPIRY_SECS;

  const full: InviteSessionPayload = { ...payload, iat, exp };
  const body = Buffer.from(JSON.stringify(full)).toString('base64url');
  const sig  = hmacSign(`${HEADER_B64}.${body}`, secret);

  return `${HEADER_B64}.${body}.${sig}`;
}

/**
 * Verify and decode an invitation session JWT.
 * Throws on invalid signature, expired token, or malformed input.
 */
export function verifyInviteJWT(token: string): InviteSessionPayload {
  const secret = getSecret();
  const parts  = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed JWT');

  const [header, body, sig] = parts;
  const expectedSig = hmacSign(`${header}.${body}`, secret);

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(sig, expectedSig)) {
    throw new Error('Invalid JWT signature');
  }

  let payload: InviteSessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Malformed JWT payload');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error('JWT expired');
  if (!payload.jti)      throw new Error('Missing jti');
  if (!payload.inv_id)   throw new Error('Missing inv_id');
  if (!payload.stage)    throw new Error('Missing stage');

  return payload;
}

// ── Timing-safe string comparison ─────────────────────────────────────────────

function timingSafeEqual(a: string, b: string): boolean {
  const { timingSafeEqual: tsEqual } = require('crypto') as typeof import('crypto');
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    // Prevent short-circuit; still do a dummy comparison
    tsEqual(aBuf, aBuf);
    return false;
  }
  return tsEqual(aBuf, bBuf);
}

// ── Nonce (JTI) generation ────────────────────────────────────────────────────

/** Generate a cryptographically random JWT ID */
export function generateJti(): string {
  return randomBytes(24).toString('base64url');
}

// ── Invitation Code generation ────────────────────────────────────────────────

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // unambiguous chars (no 0,O,1,I)
const CODE_LENGTH   = 12;

/** Generate a cryptographically secure 12-character invitation code */
export function generateInviteCode(): string {
  const bytes = randomBytes(CODE_LENGTH * 2);
  let code    = '';
  for (let i = 0; i < bytes.length && code.length < CODE_LENGTH; i++) {
    const idx = bytes[i] % CODE_ALPHABET.length;
    code += CODE_ALPHABET[idx];
  }
  return code;
}

/** Format a 12-char code as XXXX-XXXX-XXXX for display */
export function formatInviteCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}

/** Strip formatting and normalize a user-entered code */
export function normalizeInviteCode(raw: string): string {
  return raw.replace(/[-\s]/g, '').toUpperCase().trim();
}

// ── OTP ───────────────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure 6-digit OTP.
 * Uses crypto.randomInt to avoid modulo bias.
 */
export function generateOtp(): string {
  const otp = randomInt(100000, 999999 + 1); // inclusive [100000, 999999]
  return otp.toString().padStart(OTP_LENGTH, '0');
}

/** Hash an OTP with bcrypt (12 rounds) for secure storage */
export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, BCRYPT_ROUNDS);
}

/** Constant-time bcrypt comparison of a submitted OTP against its stored hash */
export async function verifyOtp(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── Email ─────────────────────────────────────────────────────────────────────

/** Normalize an email for consistent comparison */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** SHA-256 hash of normalized email — used for server-side comparison */
export function hashEmail(email: string): string {
  const salt = process.env.INVITE_SCRYPT_SALT ?? 'vrl-email-salt';
  return createHash('sha256')
    .update(normalizeEmail(email) + salt)
    .digest('hex');
}

// ── Code hash ─────────────────────────────────────────────────────────────────

/** SHA-256 hash of invitation code — used for DB lookup (never store raw code in lookup path) */
export function hashInviteCode(code: string): string {
  return createHash('sha256')
    .update(normalizeInviteCode(code))
    .digest('hex');
}

// ── IP fingerprinting ─────────────────────────────────────────────────────────

/** Hash an IP address for storage (GDPR-friendly pseudonymization) */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? 'verlyn-ip-salt';
  return createHash('sha256').update(ip + salt).digest('hex').slice(0, 16);
}

/** Hash a User-Agent string for device fingerprinting */
export function hashUa(ua: string): string {
  return createHash('sha256').update(ua).digest('hex').slice(0, 16);
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

export const INVITE_COOKIE_NAME = 'vrl_acc_sess';

export function buildCookieHeader(token: string): string {
  const maxAge = SESSION_EXPIRY_SECS;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${INVITE_COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

export function clearCookieHeader(): string {
  return `${INVITE_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

/** Extract the invite session token from a Next.js request cookie header */
export function extractInviteCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${INVITE_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

// ── Legal Framework Constants ────────────────────────────────────────────────
export const LEGAL_VERSION = '1.0.0';
export const LEGAL_HASH = '8f4e2c9a1d7f3e5b6c8a0d9e7f5a3c2b1d0e9f8a7c6b5a4f3e2d1c0b9a8f7e6d';

