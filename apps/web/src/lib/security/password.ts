/**
 * Verlyn Password Hardening & Strength Engine
 * Enforces production-grade security policies for passwords.
 */

export interface PasswordValidationResult {
  valid: boolean;
  reason?: string;
}

export function validatePasswordStrength(
  password: string,
  email: string,
  username: string
): PasswordValidationResult {
  if (!password) {
    return { valid: false, reason: 'Password is required.' };
  }

  // 1. Length Checks (Min 12, Max 72 to prevent bcrypt performance exploits/denial of service)
  if (password.length < 12) {
    return { valid: false, reason: 'Password must be at least 12 characters long.' };
  }
  if (password.length > 72) {
    return { valid: false, reason: 'Password cannot exceed 72 characters.' };
  }

  const lowerPassword = password.toLowerCase();
  const lowerEmail = (email || '').toLowerCase().trim();
  const emailPrefix = lowerEmail.split('@')[0];
  const lowerUsername = (username || '').toLowerCase().trim();

  // 2. Prevent passwords derived from or identical to user context
  if (lowerUsername && (lowerPassword.includes(lowerUsername) || lowerUsername.includes(lowerPassword))) {
    return { valid: false, reason: 'Password cannot contain or be similar to your username.' };
  }
  if (emailPrefix && (lowerPassword.includes(emailPrefix) || emailPrefix.includes(lowerPassword))) {
    return { valid: false, reason: 'Password cannot contain or be similar to your email handle.' };
  }

  // 3. Reject known insecure, common, and sequential password patterns
  const commonPasswords = new Set([
    'password1234', 'password12345', 'passphrase123', 'admin12345',
    'welcome1234', 'verlyn12345', '123456789012', '123456789012345',
    'qwertyuiopas', 'asdfghjklzxc', 'verlynnetwork', 'shayanverlyn'
  ]);

  if (commonPasswords.has(lowerPassword)) {
    return { valid: false, reason: 'This password is too common and easy to guess.' };
  }

  // 4. Reject simple repeating or sequential characters
  if (/^(.)\1+$/.test(password)) {
    return { valid: false, reason: 'Password cannot consist of repeating characters.' };
  }

  // 5. Complexity Requirements (Must meet at least 3 categories)
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let typesCount = 0;
  if (hasUppercase) typesCount++;
  if (hasLowercase) typesCount++;
  if (hasDigit) typesCount++;
  if (hasSpecial) typesCount++;

  if (typesCount < 3) {
    return {
      valid: false,
      reason: 'Password must include at least 3 categories: uppercase letters, lowercase letters, numbers, and special characters.'
    };
  }

  return { valid: true };
}
