import crypto from 'crypto';

const GHOST_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getSecret(): string {
  const secret = process.env.GHOST_SESSION_SECRET;
  if (!secret) throw new Error('GHOST_SESSION_SECRET env var is not set');
  return secret;
}

/**
 * Issue a signed ghost session token.
 * Format: ghost.<timestampMs>.<hmac_sha256>
 */
export function issueGhostToken(): string {
  const ts = Date.now().toString();
  const secret = getSecret();
  const mac = crypto
    .createHmac('sha256', secret)
    .update(ts)
    .digest('hex');
  return `ghost.${ts}.${mac}`;
}

/**
 * Verify a ghost token. Returns { valid: true } only if HMAC matches AND token has not expired.
 */
export function verifyGhostToken(token: string): { valid: boolean; reason?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== 'ghost') {
      return { valid: false, reason: 'malformed' };
    }
    const [, ts, mac] = parts;
    const secret = getSecret();
    const expected = crypto
      .createHmac('sha256', secret)
      .update(ts)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const macBuf = Buffer.from(mac, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (macBuf.length !== expectedBuf.length) return { valid: false, reason: 'invalid_mac' };
    if (!crypto.timingSafeEqual(macBuf, expectedBuf)) {
      return { valid: false, reason: 'invalid_mac' };
    }

    const age = Date.now() - parseInt(ts, 10);
    if (age > GHOST_TOKEN_TTL_MS) {
      return { valid: false, reason: 'expired' };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'error' };
  }
}
