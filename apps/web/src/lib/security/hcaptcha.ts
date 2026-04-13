/**
 * Security: hCaptcha Server-Side Verification
 */

const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET_KEY;
const HCAPTCHA_VERIFY_URL = 'https://hcaptcha.com/siteverify';

export async function verifyHCaptcha(token: string): Promise<{ success: boolean; error?: string }> {
  if (!HCAPTCHA_SECRET) {
    console.warn('[Security] HCAPTCHA_SECRET_KEY is not defined. Bypassing check.');
    return { success: true };
  }

  if (!token) {
    return { success: false, error: 'Bot detection token is missing.' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(HCAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${HCAPTCHA_SECRET}&response=${token}`,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (data.success) {
      return { success: true };
    }

    return { success: false, error: 'Bot detection failed. Please try again.' };
  } catch (err) {
    console.error('[Security] hCaptcha verification error:', err);
    return { success: false, error: 'Security service unavailable.' };
  }
}
