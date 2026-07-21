import { createHmac } from 'crypto';

const CAPTCHA_SECRET = process.env.STEP_TOKEN_SECRET || 'fallback-secret-captcha';

export interface CaptchaChallenge {
  token: string;
  svg: string;
}

/**
 * Generate a random captcha code of length 5 (avoiding confusing characters like O, 0, I, l)
 */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a cryptographically signed token containing the captcha code and expiration timestamp
 */
export function generateCaptchaToken(code: string): string {
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minute validity
  const payload = `${code.toLowerCase()}\x00${expiresAt}`;
  const hmac = createHmac('sha256', CAPTCHA_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}\x01${hmac}`).toString('base64url');
}

/**
 * Verify the user's captcha answer against the signed token
 */
export function verifyCaptchaToken(token: string, answer: string): boolean {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const [payload, sig] = raw.split('\x01');
    if (!payload || !sig) return false;

    // Verify signature
    const expectedHmac = createHmac('sha256', CAPTCHA_SECRET).update(payload).digest('hex');
    if (sig !== expectedHmac) return false;

    // Parse payload
    const [code, expiresAtStr] = payload.split('\x00');
    if (!code || !expiresAtStr) return false;

    // Check expiration
    const expiresAt = parseInt(expiresAtStr, 10);
    if (Date.now() > expiresAt) return false;

    // Check answer (case-insensitive)
    return code.toLowerCase() === answer.toLowerCase().trim();
  } catch (e) {
    return false;
  }
}

/**
 * Generate the SVG Captcha markup
 */
export function generateSvgCaptcha(): CaptchaChallenge {
  const code = generateCode();
  const token = generateCaptchaToken(code);

  const width = 240;
  const height = 80;
  const fontFamilies = ['Arial', 'Courier New', 'Georgia', 'Trebuchet MS', 'Impact'];

  let svgElements = '';

  // 1. Add background noise lines (glow effect)
  for (let i = 0; i < 4; i++) {
    const x1 = Math.floor(Math.random() * width);
    const y1 = Math.floor(Math.random() * height);
    const x2 = Math.floor(Math.random() * width);
    const y2 = Math.floor(Math.random() * height);
    const colors = ['#a78bfa', '#8b5cf6', '#6d28d9', '#4c1d95'];
    const stroke = colors[Math.floor(Math.random() * colors.length)];
    svgElements += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${Math.random() * 2 + 1}" stroke-dasharray="5,5" opacity="0.4" />`;
  }

  // 2. Render characters with random rotation, offsets, and fonts
  const charWidth = width / 6;
  for (let i = 0; i < code.length; i++) {
    const char = code.charAt(i);
    const font = fontFamilies[Math.floor(Math.random() * fontFamilies.length)];
    const fontSize = Math.floor(Math.random() * 10) + 32; // size between 32 and 42
    const angle = Math.floor(Math.random() * 50) - 25; // rotation -25 to +25 deg
    const x = 30 + i * charWidth + (Math.random() * 10 - 5);
    const y = 50 + (Math.random() * 12 - 6);
    const colors = ['#ffffff', '#e9d5ff', '#c084fc', '#a78bfa'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    svgElements += `
      <text 
        x="${x}" 
        y="${y}" 
        font-family="${font}" 
        font-size="${fontSize}" 
        font-weight="black"
        fill="${color}"
        transform="rotate(${angle} ${x} ${y})"
        filter="url(#glow)"
      >
        ${char}
      </text>
    `;
  }

  // 3. Add foreground noise lines (crossing the text to disrupt OCR)
  for (let i = 0; i < 4; i++) {
    const x1 = Math.random() * 30;
    const y1 = Math.random() * height;
    const x2 = width - Math.random() * 30;
    const y2 = Math.random() * height;
    const colors = ['#ffffff', '#a78bfa', '#c084fc'];
    const stroke = colors[Math.floor(Math.random() * colors.length)];
    svgElements += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${Math.random() * 2.5 + 1.5}" opacity="0.75" />`;
  }

  // 4. Add noise dots (salt and pepper noise)
  for (let i = 0; i < 60; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const r = Math.random() * 1.5 + 0.5;
    const colors = ['#ffffff', '#a78bfa', '#6d28d9'];
    const fill = colors[Math.floor(Math.random() * colors.length)];
    svgElements += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="0.5" />`;
  }

  const svg = `
    <svg 
      width="100%" 
      height="100%" 
      viewBox="0 0 ${width} ${height}" 
      xmlns="http://www.w3.org/2000/svg"
      style="background-color: #080808; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); user-select: none;"
    >
      <defs>
        <!-- Displaces text using high frequency turbulence for clean organic distortion -->
        <filter id="distort">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <!-- Neon Glow filter for branding aesthetic -->
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#distort)">
        ${svgElements}
      </g>
    </svg>
  `;

  return { token, svg };
}
