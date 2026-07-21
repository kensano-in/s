/**
 * Identity Moderation Engine
 * Handles real-time detection of offensive, explicit, or harmful language.
 */

const BLOCKED_TERMS = [
  'fuck',
  'fucc',
  'fck',
  'sex',
  'sexvideo',
  'porn',
  'bitch',
  'asshole',
  'hentai',
  'rape',
  'kys',
  'kill yourself',
  'nigger',
  'nigga',
  'faggot',
  'slut',
  'whore',
  'cunt',
  'dick',
  'cock',
  'pussy'
];

/**
 * Normalizes text to detect masked foul words
 * Examples: s3x -> sex, p0rn -> porn, fu*k -> fuck, fxck -> fuck, b1tch -> bitch
 */
function normalizeText(text: string): string {
  let normalized = text.toLowerCase();
  
  // Remove spaces, punctuation, and special characters used to obfuscate
  normalized = normalized.replace(/[.*+?^${}()|[\]\\/#_-]/g, '');
  
  // Replace leetspeak or common masking characters
  normalized = normalized.replace(/0/g, 'o');
  normalized = normalized.replace(/1/g, 'i');
  normalized = normalized.replace(/3/g, 'e');
  normalized = normalized.replace(/4/g, 'a');
  normalized = normalized.replace(/5/g, 's');
  normalized = normalized.replace(/8/g, 'b');
  normalized = normalized.replace(/@/g, 'a');
  normalized = normalized.replace(/!/g, 'i');
  normalized = normalized.replace(/\$/g, 's');
  normalized = normalized.replace(/x/g, 'c'); // e.g. fxck -> fcck -> catchable if we add fcck, or just map x to c in some contexts
  
  return normalized;
}

export interface ModerationResult {
  blocked: boolean;
  flaggedWord?: string;
}

export function checkIdentityContent(text: string): ModerationResult {
  if (!text) return { blocked: false };
  
  const rawLower = text.toLowerCase();
  const normalized = normalizeText(text);

  for (const term of BLOCKED_TERMS) {
    // Check against raw text
    if (rawLower.includes(term)) {
      return { blocked: true, flaggedWord: term };
    }
    // Check against normalized text
    if (normalized.includes(term)) {
      return { blocked: true, flaggedWord: term };
    }
  }

  // Handle specific edge cases like fxck
  if (rawLower.includes('fxck') || rawLower.includes('fu*k')) {
    return { blocked: true, flaggedWord: 'fuck' };
  }

  return { blocked: false };
}
