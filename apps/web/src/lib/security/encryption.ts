/**
 * Verlyn Security: Device-Level Session Encryption
 * Uses AES-GCM to protect stashed refresh tokens in localStorage.
 */

const KEY_ALIAS = 'verlyn_device_v1_k';
const ALGO = 'AES-GCM';

// Lazy-loaded encryption key
let masterKey: CryptoKey | null = null;

/**
 * Initialize or retrieve the persistent device encryption key
 */
async function getMasterKey(): Promise<CryptoKey> {
  if (masterKey) return masterKey;

  const storedKey = localStorage.getItem(KEY_ALIAS);
  
  if (storedKey) {
    try {
      const jwk = JSON.parse(storedKey);
      masterKey = await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: ALGO, length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      return masterKey;
    } catch (e) {
      console.error('Failed to restore device key, generating new one...', e);
    }
  }

  // Generate new key
  masterKey = await crypto.subtle.generateKey(
    { name: ALGO, length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  const jwk = await crypto.subtle.exportKey('jwk', masterKey);
  localStorage.setItem(KEY_ALIAS, JSON.stringify(jwk));
  
  return masterKey;
}

/**
 * Encrypt a string (usually a JSON session string)
 */
export async function encryptData(text: string): Promise<string> {
  const key = await getMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    encoded
  );

  // Combine IV + Data for storage
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a combined base64 data string
 */
export async function decryptData(data: string): Promise<string> {
  try {
    const key = await getMasterKey();
    const combined = new Uint8Array(
      atob(data).split('').map((c) => c.charCodeAt(0))
    );
    
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGO, iv },
      key,
      encrypted
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error('Decryption failed. Session may be invalid or corrupted.', e);
    throw new Error('CORRUPTED_SESSION');
  }
}
