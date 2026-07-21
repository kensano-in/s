import { GoogleGenerativeAI } from '@google/generative-ai';

// ── Strict Dictionary of Offensive Words & Slangs (English & Hindi) ───────────
export const BAD_WORDS = [
  // English Profanity & Troll terms
  'admin', 'root', 'verlyn', 'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'whore', 'slut',
  'bastard', 'motherfucker', 'cock', 'faggot', 'nigger', 'nigga', 'scam', 'spam', 'troll',
  
  // Hindi / Hinglish Galis (offensive words)
  'bhenchod', 'behenchod', 'madarchod', 'chutiya', 'bhosdike', 'bhosdi', 'gandu', 'raand', 'randi', 
  'kamina', 'suar', 'bhadwa', 'laude', 'loda', 'lode', 'muthiya', 'jhantu', 'chut', 'choot', 
  'gand', 'gaand', 'lund', 'saala', 'sala', 'harami', 'kutta'
];

/**
 * Perform a fast local dictionary check for abusive language.
 */
export function checkAbusiveLanguage(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  
  // 1. Check exact word matches
  const words = normalized.split(/[\s.\-_]+/);
  const hasBadWord = BAD_WORDS.some(bad => words.some(w => w === bad));
  if (hasBadWord) return true;

  // 2. Check substring containment (excluding short common substrings)
  const hasSubMatch = BAD_WORDS.some(bad => {
    if (bad.length < 4) return false; // avoid false positives on short words
    return normalized.includes(bad);
  });

  return hasSubMatch;
}

/**
 * Perform enterprise-grade moderation (Local Dictionary + Gemini AI).
 */
export async function moderateText(text: string): Promise<{ isAbusive: boolean; reason: string | null }> {
  if (!text || typeof text !== 'string' || text.trim().length < 2) {
    return { isAbusive: true, reason: 'Invalid or empty input' };
  }

  // 1. Fast path: Dictionary check
  if (checkAbusiveLanguage(text)) {
    return { isAbusive: true, reason: 'Profanity detected (dictionary filter)' };
  }

  // 2. Slow path: Gemini AI check
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { isAbusive: false, reason: null };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
You are a highly strict content moderation API for an enterprise application. 
Your task is to determine if the following name contains any abusive, profane, highly offensive, or inappropriate language in ANY language (especially English, Hindi, Hinglish, Spanish, etc.).
Also flag names that are clearly trolling or attempting to bypass filters (e.g. using symbols replacing letters for bad words).
Do NOT be overly sensitive about normal names, but have ZERO TOLERANCE for swear words, slurs, explicit sexual terms, or severe insults.

Respond in strict JSON format:
{
  "isAbusive": boolean,
  "reason": "short explanation if abusive, else null"
}

Text to check: "${text}"
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const moderationResult = JSON.parse(jsonMatch[0]);
    return {
      isAbusive: !!moderationResult.isAbusive,
      reason: moderationResult.reason || null
    };

  } catch (error) {
    console.error('Moderation Helper Error:', error);
    // Fail open in production to prevent blocking legitimate users on network failure
    return { isAbusive: false, reason: null };
  }
}
