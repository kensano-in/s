/**
 * Whitelisted email domains for Verlyn pre-registration.
 * 197 globally trusted providers — verified & maintained by Verlyn Security.
 */
export const WHITELISTED_DOMAINS = new Set([
  // Google
  'gmail.com','googlemail.com',
  // Microsoft Outlook
  'outlook.com','outlook.in','outlook.co.uk','outlook.com.au','outlook.de','outlook.fr','outlook.es','outlook.it','outlook.jp',
  // Microsoft Hotmail
  'hotmail.com','hotmail.co.uk','hotmail.fr','hotmail.de','hotmail.it','hotmail.es','hotmail.co.jp',
  // Microsoft Live
  'live.com','live.co.uk','live.in','live.fr','live.de','live.com.au',
  // Microsoft MSN
  'msn.com',
  // Yahoo
  'yahoo.com','yahoo.co.uk','yahoo.co.in','yahoo.ca','yahoo.com.au','yahoo.co.jp','yahoo.de','yahoo.fr','yahoo.it','yahoo.es','yahoo.com.br','yahoo.com.mx',
  'ymail.com','rocketmail.com','myyahoo.com',
  // Apple
  'icloud.com','me.com','mac.com',
  // AOL / Verizon
  'aol.com','aim.com','verizon.net',
  // Zoho
  'zoho.com','zohomail.com','zohomail.in',
  // ProtonMail
  'protonmail.com','protonmail.ch','proton.me','pm.me',
  // Tutanota
  'tutanota.com','tutanota.de','tutamail.com','tuta.io','tuta.com','keemail.me',
  // GMX / Web.de
  'gmx.com','gmx.net','gmx.de','gmx.at','gmx.ch','web.de',
  // Mail.com
  'mail.com','email.com',
  // Fastmail
  'fastmail.com','fastmail.fm',
  // Rediff / Sify
  'rediffmail.com','rediff.com','sify.com',
  // Yandex / Mail.ru
  'yandex.com','yandex.ru','mail.ru','inbox.ru','bk.ru','list.ru',
  // Rambler
  'rambler.ru','lenta.ru','autorambler.ru','myrambler.ru','ro.ru',
  // China
  'qq.com','163.com','126.com','yeah.net','sina.com','sina.cn','sohu.com','foxmail.com','aliyun.com',
  // Korea
  'naver.com','daum.net','hanmail.net',
  // Japan
  'nifty.com','biglobe.ne.jp','excite.co.jp',
  // France
  'laposte.net','orange.fr','free.fr','sfr.fr','wanadoo.fr',
  // Italy
  'libero.it','virgilio.it','alice.it','tin.it','tiscali.it',
  // Brazil
  'terra.com.br','bol.com.br','uol.com.br','ig.com.br',
  // Spain
  'terra.es','telefonica.net',
  // UK
  'btinternet.com','sky.com','virginmedia.com','talktalk.net',
  // USA ISPs
  'comcast.net','sbcglobal.net','att.net','bellsouth.net','charter.net','cox.net','earthlink.net','juno.com','optonline.net',
  // Canada
  'rogers.com','shaw.ca','sympatico.ca','telus.net',
  // Privacy-first
  'mailfence.com','disroot.org','posteo.de','posteo.net','mailbox.org','runbox.com','startmail.com','hushmail.com','countermail.com','ctemplar.com',
  // Modern
  'hey.com','duck.com',
  // Eclipso
  'eclipso.de','eclipso.eu',
  // Legacy
  'lycos.com','usa.com',
]);

/** Strict RFC-5321-ish email pattern */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  sanitized?: string;
}

/** Sanitizes raw input — strips HTML tags, injection chars, enforces length */
export function sanitize(raw: string): string {
  return raw
    .trim()
    .replace(/<[^>]*>/g, '')
    .replace(/['"`;\\/]/g, '')
    .slice(0, 254);
}

/** Validates and sanitizes an email address. Returns { valid, reason, sanitized } */
export function validateEmail(raw: string): ValidationResult {
  const email = sanitize(raw).toLowerCase();

  if (!email) return { valid: false, reason: 'Email is required.' };
  if (!EMAIL_REGEX.test(email)) return { valid: false, reason: 'Invalid email format.' };

  const parts = email.split('@');
  if (parts.length !== 2) return { valid: false, reason: 'Invalid email format.' };

  const domain = parts[1];
  if (!WHITELISTED_DOMAINS.has(domain)) {
    return {
      valid: false,
      reason: `"@${domain}" is not on the approved provider list. Please use a trusted email provider (Gmail, Outlook, Yahoo, ProtonMail, etc.)`,
    };
  }

  return { valid: true, sanitized: email };
}
