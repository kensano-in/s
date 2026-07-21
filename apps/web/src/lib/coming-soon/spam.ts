/**
 * VERLYN — Advanced Anti-Spam Engine
 * Multi-signal spam detection with configurable thresholds.
 */

// ── Patterns ─────────────────────────────────────────────────────────────────

const SPAM_PATTERNS = [
  // Repeated characters
  /(.)\1{7,}/,
  // URLs and external links
  /https?:\/\//i,
  /www\.\S+\.\S+/i,
  // Excessive capitalization (>60% of alpha chars are uppercase)
  // handled in function
  // Keyboard mash
  /[asdfghjkl]{8,}|[qwertyuiop]{8,}|[zxcvbnm]{8,}/i,
  // Injection attempts
  /<[^>]+>/,
  /['";\\]{3,}/,
  // Emoji spam
  /(\p{Emoji})\1{3,}/u,
  // Phone numbers disguised as text
  /(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/,
  // Currency spam
  /\$\s?\d{3,}[,\d]*/,
  // All-caps words strung together
  /\b[A-Z]{6,}\b.*\b[A-Z]{6,}\b/,
];

const PROHIBITED_TERMS = [
  'nigger', 'faggot', 'chink', 'kike', 'spic',  // slurs
  'fuck you', 'go to hell', 'kill yourself',      // hostile
  'buy now', 'limited offer', 'click here',       // spam phrases
  'make money fast', 'work from home', 'crypto',  // financial spam
];

// ── Entropy analysis ─────────────────────────────────────────────────────────

function shannonEntropy(text: string): number {
  const freq: Record<string, number> = {};
  for (const c of text) freq[c] = (freq[c] ?? 0) + 1;
  const len = text.length;
  return -Object.values(freq).reduce((sum, f) => sum + (f / len) * Math.log2(f / len), 0);
}

function capsRatio(text: string): number {
  const alpha = text.replace(/[^a-zA-Z]/g, '');
  if (!alpha.length) return 0;
  const upper = alpha.replace(/[^A-Z]/g, '');
  return upper.length / alpha.length;
}

function uniqueWordRatio(text: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return 1;
  return new Set(words).size / words.length;
}

// ── Scoring ───────────────────────────────────────────────────────────────────

export interface SpamAnalysis {
  isSpam:   boolean;
  score:    number;   // 0–100
  signals:  string[];
  reason?:  string;
}

/**
 * Comprehensive spam analysis.
 * Returns score 0–100. Score >= 40 is considered spam.
 */
export function analyzeSpam(text: string, context?: 'subject' | 'description' | 'name'): SpamAnalysis {
  const signals: string[] = [];
  let score = 0;

  // Pattern matches
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      signals.push(`pattern:${pattern.source.slice(0, 20)}`);
      score += 25;
    }
  }

  // Prohibited terms
  const lower = text.toLowerCase();
  for (const term of PROHIBITED_TERMS) {
    if (lower.includes(term)) {
      signals.push(`prohibited:${term.slice(0, 10)}`);
      score += 35;
    }
  }

  // Entropy check (very low = repetitive garbage)
  const entropy = shannonEntropy(text);
  if (entropy < 1.5 && text.length > 20) {
    signals.push('low_entropy');
    score += 20;
  }

  // Caps ratio
  const caps = capsRatio(text);
  if (caps > 0.6) {
    signals.push('excessive_caps');
    score += 15;
  }

  // Repetitive vocabulary
  const uniqueRatio = uniqueWordRatio(text);
  if (uniqueRatio < 0.3 && text.split(/\s+/).length > 10) {
    signals.push('repetitive_vocab');
    score += 15;
  }

  // Context-specific: descriptions should have some length variety
  if (context === 'subject' && text.length < 10) {
    signals.push('too_short_subject');
    score += 10;
  }

  const capped = Math.min(score, 100);
  return {
    isSpam:  capped >= 40,
    score:   capped,
    signals,
    reason:  capped >= 40 ? 'Content flagged by anti-spam analysis. Please write a genuine, detailed message.' : undefined,
  };
}

/** Quick boolean check — wraps analyzeSpam */
export function isSpam(text: string, context?: 'subject' | 'description' | 'name'): boolean {
  return analyzeSpam(text, context).isSpam;
}
