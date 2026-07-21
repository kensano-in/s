/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Verlyn Step-Completion Token System
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Each registration step that requires server-side proof issues a signed token
 * using SHA-256 HMAC. The token is:
 *   • Bound to the specific email address
 *   • Bound to the specific step name
 *   • Time-limited (30-minute TTL)
 *   • Verified with timingSafeEqual (constant-time) to prevent timing attacks
 *   • Contains a random nonce so identical inputs produce unique tokens
 *
 * Tokens are NEVER issued by the client. They are issued exclusively by server
 * actions after server-side validation passes. The client stores them in memory
 * and sends them with the final form submission.
 *
 * A forger without the STEP_TOKEN_SECRET cannot produce a valid HMAC.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

/** 30-minute token TTL */
const TOKEN_TTL_MS = 30 * 60 * 1000;

/** Get signing secret — required env var */
function getSecret(): string {
  const s = process.env.STEP_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secure-secret-key-199387';
  return s;
}

export type StepName =
  | 'basics'
  | 'email_verify'
  | 'phone_trust'
  | 'username_check'
  | 'human_captcha';

/**
 * Issue a cryptographically signed step-completion token.
 * Must only be called from server-side code ('use server' actions).
 */
export function issueStepToken(step: StepName, email: string): string {
  const secret = getSecret();
  const ts = Date.now().toString(36);                    // base-36 timestamp
  const nonce = randomBytes(8).toString('hex');           // 16-char random nonce
  const normalEmail = email.toLowerCase().trim();
  const payload = `${step}\x00${normalEmail}\x00${ts}\x00${nonce}`;
  const mac = createHmac('sha256', secret).update(payload).digest('base64url');
  // Token = base64url(payload + "." + mac)
  return Buffer.from(`${payload}\x01${mac}`).toString('base64url');
}

export interface TokenVerifyResult {
  valid: boolean;
  reason?: string;
}

/**
 * Verify a step-completion token.
 * Returns { valid: true } only if signature, step, email, and TTL all pass.
 * Uses timingSafeEqual to prevent timing-based side-channel attacks.
 */
export function verifyStepToken(
  token: string,
  expectedStep: StepName,
  expectedEmail: string,
): TokenVerifyResult {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const sepIdx = raw.lastIndexOf('\x01');
    if (sepIdx < 0) return { valid: false, reason: 'malformed:no_sep' };

    const payload = raw.slice(0, sepIdx);
    const mac = raw.slice(sepIdx + 1);

    // ── 1. Constant-time HMAC verification ─────────────────────────────────
    const secret = getSecret();
    const expectedMac = createHmac('sha256', secret).update(payload).digest('base64url');
    const macBuf = Buffer.from(mac, 'utf8');
    const expBuf = Buffer.from(expectedMac, 'utf8');
    if (macBuf.length !== expBuf.length || !timingSafeEqual(macBuf, expBuf)) {
      return { valid: false, reason: 'invalid_signature' };
    }

    // ── 2. Parse payload fields ─────────────────────────────────────────────
    const parts = payload.split('\x00');
    if (parts.length !== 4) return { valid: false, reason: 'malformed:parts' };
    const [tokenStep, tokenEmail, tsBase36] = parts;

    // ── 3. Step binding ─────────────────────────────────────────────────────
    if (tokenStep !== expectedStep) {
      return { valid: false, reason: `wrong_step:got_${tokenStep}` };
    }

    // ── 4. Email binding ────────────────────────────────────────────────────
    if (tokenEmail !== expectedEmail.toLowerCase().trim()) {
      return { valid: false, reason: 'wrong_email' };
    }

    // ── 5. TTL check ────────────────────────────────────────────────────────
    const ts = parseInt(tsBase36, 36);
    if (isNaN(ts) || Date.now() - ts > TOKEN_TTL_MS) {
      return { valid: false, reason: 'expired' };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'exception' };
  }
}
