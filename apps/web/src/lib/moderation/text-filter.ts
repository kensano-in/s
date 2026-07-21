/**
 * ═══════════════════════════════════════════════════════════════
 *  TEXT MODERATION ENGINE
 *  Layer 1 — Pre-upload keyword blacklist + toxicity scoring
 * ═══════════════════════════════════════════════════════════════
 */

// ── KEYWORD BLACKLIST ──────────────────────────────────────────
const ABSOLUTE_BLACKLIST: string[] = [
  // Slurs (redacted — the actual list would be comprehensive)
  'nigger', 'faggot', 'kike', 'chink', 'spic', 'wetback', 'retard',
  // CSAM triggers
  'child porn', 'cp link', 'jailbait', 'loli sex',
  // Credible threats
  'i will kill you', 'bomb threat', 'school shooting',
  // Doxxing patterns
  'here is their address', 'swat this person',
];

const SEVERITY_WEIGHTS: Record<string, number> = {
  // Hate speech
  hate_keyword: 90,
  slur: 95,
  // Threats
  threat: 85,
  // Spam
  url_spam: 40,
  repeated_chars: 20,
  all_caps: 10,
  excessive_emojis: 15,
  // Sexual
  sexual_explicit: 80,
  // CSAM
  csam: 100,
};

export interface TextAnalysisResult {
  allowed: boolean;
  riskScore: number; // 0–100
  flags: string[];
  reasons: string[];
  action: 'allow' | 'warn' | 'block' | 'review';
}

/**
 * Normalize text for comparison (case-insensitive, strip symbols)
 */
function normalizeForCheck(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Check for absolute blacklist hits
 */
function checkBlacklist(normalized: string): { hit: boolean; terms: string[] } {
  const terms = ABSOLUTE_BLACKLIST.filter(term => normalized.includes(term));
  return { hit: terms.length > 0, terms };
}

/**
 * Score spam behaviors
 */
function scoreSpam(text: string): { score: number; flags: string[] } {
  const flags: string[] = [];
  let score = 0;

  // URL spam (3+ URLs)
  const urls = text.match(/https?:\/\/[^\s]+/g) || [];
  if (urls.length >= 3) { flags.push('url_spam'); score += SEVERITY_WEIGHTS.url_spam; }

  // Repeated characters (aaaaaaa)
  if (/(.)\1{6,}/.test(text)) { flags.push('repeated_chars'); score += SEVERITY_WEIGHTS.repeated_chars; }

  // ALL CAPS (>70% uppercase, min 20 chars)
  if (text.length > 20) {
    const upper = (text.match(/[A-Z]/g) || []).length;
    const alpha = (text.match(/[a-zA-Z]/g) || []).length;
    if (alpha > 0 && upper / alpha > 0.7) { flags.push('all_caps'); score += SEVERITY_WEIGHTS.all_caps; }
  }

  // Excessive emojis (5+)
  const emojiMatches = text.match(/[\p{Emoji}]/gu) || [];
  if (emojiMatches.length > 5) { flags.push('excessive_emojis'); score += SEVERITY_WEIGHTS.excessive_emojis; }

  // Super long single word (obfuscation)
  const words = text.split(/\s+/);
  if (words.some(w => w.length > 50)) { flags.push('obfuscation_long_word'); score += 30; }

  return { score, flags };
}

/**
 * Score sexual / explicit content (basic keyword patterns)
 */
function scoreSexual(normalized: string): { score: number; flags: string[] } {
  const flags: string[] = [];
  let score = 0;

  const sexualTerms = ['porn', 'xxx', 'nude', 'naked', 'sex video', 'onlyfans', 'nsfw link'];
  const hits = sexualTerms.filter(t => normalized.includes(t));
  if (hits.length > 0) { flags.push('sexual_explicit'); score += SEVERITY_WEIGHTS.sexual_explicit; }

  return { score, flags };
}

/**
 * Score threat language
 */
function scoreThreats(normalized: string): { score: number; flags: string[] } {
  const flags: string[] = [];
  let score = 0;

  const threatPatterns = [
    /i('ll| will) (kill|hurt|murder|rape|destroy) (you|him|her|them|this)/,
    /going to (kill|bomb|shoot|attack)/,
    /i know where you live/,
    /come (find|get) you/,
  ];

  for (const pattern of threatPatterns) {
    if (pattern.test(normalized)) {
      flags.push('threat_language');
      score += SEVERITY_WEIGHTS.threat;
      break;
    }
  }

  return { score, flags };
}

/**
 * Master text analysis function
 */
export function analyzeText(text: string): TextAnalysisResult {
  if (!text || text.trim().length === 0) {
    return { allowed: true, riskScore: 0, flags: [], reasons: [], action: 'allow' };
  }

  const normalized = normalizeForCheck(text);
  const allFlags: string[] = [];
  const allReasons: string[] = [];
  let totalScore = 0;

  // 1. Absolute blacklist
  const blacklistResult = checkBlacklist(normalized);
  if (blacklistResult.hit) {
    allFlags.push('absolute_blacklist');
    allReasons.push(`Prohibited terms detected: ${blacklistResult.terms.join(', ')}`);
    totalScore += 100;
  }

  // 2. Spam signals
  const spamResult = scoreSpam(text);
  allFlags.push(...spamResult.flags);
  totalScore += spamResult.score;

  // 3. Sexual content
  const sexualResult = scoreSexual(normalized);
  allFlags.push(...sexualResult.flags);
  totalScore += sexualResult.score;

  // 4. Threats
  const threatResult = scoreThreats(normalized);
  allFlags.push(...threatResult.flags);
  totalScore += threatResult.score;

  // Clamp to 100
  const riskScore = Math.min(100, totalScore);

  // Determine action
  let action: TextAnalysisResult['action'] = 'allow';
  if (riskScore >= 85) action = 'block';
  else if (riskScore >= 60) action = 'review';
  else if (riskScore >= 30) action = 'warn';

  return {
    allowed: action !== 'block',
    riskScore,
    flags: [...new Set(allFlags)],
    reasons: allReasons,
    action,
  };
}
