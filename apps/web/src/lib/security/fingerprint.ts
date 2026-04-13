import { crypto } from 'next/dist/compiled/@edge-runtime/primitives';

/**
 * Generates a server-side fingerprint based on request headers.
 */
export async function generateFingerprint(req: Request): Promise<string> {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const ua = req.headers.get('user-agent') || 'unknown';
  const lang = req.headers.get('accept-language') || 'unknown';
  
  // Combine factors
  const seed = `${ip}|${ua}|${lang}`;
  
  // Hash using SHA-256
  const msgBuffer = new TextEncoder().encode(seed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Checks if a fingerprint is currently flagged for abuse.
 * This is a placeholder for a DB check.
 */
export async function isFingerprintFlagged(fingerprint: string, supabase: any): Promise<boolean> {
  const { data } = await supabase
    .from('banned_identities')
    .select('id')
    .match({ type: 'fingerprint', identifier: fingerprint })
    .maybeSingle();
    
  return !!data;
}
