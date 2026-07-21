import { createHash, randomBytes } from 'crypto';

/**
 * Verlyn Security Utility — Proof of Work (PoW)
 * This forces the client to perform a computational task before the server accepts a request.
 * It's the ultimate defense against automated spam bots.
 */

const DIFFICULTY = 4; // Number of leading zeros required (4 is strong, takes ~500ms-2s)

export function generateChallenge(): string {
  return randomBytes(16).toString('hex');
}

export function verifyWork(challenge: string, nonce: string): boolean {
  const hash = createHash('sha256')
    .update(challenge + nonce)
    .digest('hex');
  
  const target = '0'.repeat(DIFFICULTY);
  return hash.startsWith(target);
}
