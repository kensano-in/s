/**
 * Security: Disposable Email Validator
 */

const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'temp-mail.org',
  'throwawaymail.com',
  'yopmail.com',
  'sharklasers.com',
  'dispostable.com',
  'tempmail.net',
  'getairmail.com',
  'maildrop.cc',
  'anonaddy.com',
  'duck.com',
  'protonmail.com', // Optional: some high-security apps block proton due to ease of account creation, but we'll allow it for now unless requested
]);

/**
 * Checks if an email domain is known to be disposable or high-risk.
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || !email.includes('@')) return true;
  
  const domain = email.split('@')[1].toLowerCase();
  
  // 1. Check exact blacklist
  if (DISPOSABLE_DOMAINS.has(domain)) return true;
  
  // 2. Check for common patterns (e.g. numeric domains, etc.)
  const parts = domain.split('.');
  if (parts.length > 2) {
    // Check if subdomains are suspicious
    if (DISPOSABLE_DOMAINS.has(parts.slice(-2).join('.'))) return true;
  }

  return false;
}

/**
 * Validates email format and perform basic sanity checks.
 */
export function validateEmailReputation(email: string): { valid: boolean; error?: string } {
  if (email.length > 254) return { valid: false, error: 'Email is too long.' };
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Malformed email format.' };
  }
  
  if (isDisposableEmail(email)) {
    return { valid: false, error: 'Disposable email addresses are not allowed.' };
  }

  return { valid: true };
}
