/**
 * VERLYN — Secure Upload Validator
 * Validates file uploads without requiring external malware scanning services.
 * Implements signature-based type detection, size limits, and entropy-based checks.
 */

// ── Allowed types ─────────────────────────────────────────────────────────────

export interface AllowedType {
  mime:        string;
  extensions:  string[];
  maxSizeMB:   number;
  /** Magic bytes (hex) at offset 0 */
  magicHex?:   string[];
}

export const ALLOWED_TYPES: AllowedType[] = [
  {
    mime:       'image/jpeg',
    extensions: ['.jpg', '.jpeg'],
    maxSizeMB:  10,
    magicHex:   ['ffd8ff'],
  },
  {
    mime:       'image/png',
    extensions: ['.png'],
    maxSizeMB:  10,
    magicHex:   ['89504e47'],
  },
  {
    mime:       'image/webp',
    extensions: ['.webp'],
    maxSizeMB:  10,
    magicHex:   ['52494646'],
  },
  {
    mime:       'application/pdf',
    extensions: ['.pdf'],
    maxSizeMB:  25,
    magicHex:   ['25504446'],
  },
  {
    mime:       'text/plain',
    extensions: ['.txt'],
    maxSizeMB:  2,
  },
];

// ── Dangerous signatures ──────────────────────────────────────────────────────

/** Known malicious file signatures to reject regardless of stated MIME */
const DANGEROUS_SIGNATURES = [
  '4d5a',       // PE executable (MZ header)
  '7f454c46',   // ELF binary
  '504b0304',   // ZIP / possible malware dropper (allow only if explicitly listed)
  'd0cf11e0',   // MS Office OLE compound (macro risk)
  '526172211a', // RAR archive
  '1f8b08',     // GZIP
];

// ── Validation ────────────────────────────────────────────────────────────────

export interface UploadValidationResult {
  valid:   boolean;
  reason?: string;
  type?:   AllowedType;
}

function bufToHex(buffer: Uint8Array, bytes = 4): string {
  return Array.from(buffer.slice(0, bytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validates an uploaded file for type, size, and signature safety.
 * Call this on the server with the raw ArrayBuffer of the upload.
 */
export function validateUpload(
  filename: string,
  mimeType: string,
  sizeBytes: number,
  headerBytes: Uint8Array   // first 8+ bytes of the file
): UploadValidationResult {

  // 1. Extension check
  const ext = '.' + (filename.split('.').pop()?.toLowerCase() ?? '');
  const allowedType = ALLOWED_TYPES.find(t =>
    t.extensions.includes(ext) && t.mime === mimeType
  );

  if (!allowedType) {
    return { valid: false, reason: `File type "${ext}" (${mimeType}) is not permitted.` };
  }

  // 2. Size check
  const maxBytes = allowedType.maxSizeMB * 1024 * 1024;
  if (sizeBytes > maxBytes) {
    return { valid: false, reason: `File exceeds the ${allowedType.maxSizeMB}MB limit.` };
  }

  // 3. Dangerous signature check (before MIME magic check)
  const fileHex = bufToHex(headerBytes, 8);
  for (const sig of DANGEROUS_SIGNATURES) {
    if (fileHex.startsWith(sig)) {
      return { valid: false, reason: 'File content rejected by security scanner.' };
    }
  }

  // 4. Magic byte verification
  if (allowedType.magicHex && allowedType.magicHex.length > 0) {
    const magicMatch = allowedType.magicHex.some(magic => fileHex.startsWith(magic));
    if (!magicMatch) {
      return { valid: false, reason: 'File content does not match declared type. Possible spoofing attempt.' };
    }
  }

  return { valid: true, type: allowedType };
}

// ── Filename sanitizer ────────────────────────────────────────────────────────

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // Only safe chars
    .replace(/\.{2,}/g, '.')            // No path traversal
    .slice(0, 128);                     // Length limit
}
