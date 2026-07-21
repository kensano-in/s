/**
 * ═══════════════════════════════════════════════════════════════
 *  LAYER 7 — AI ADVERSARIAL ANALYSIS ENGINE
 *  Uses Gemini Flash to act as an adversarial security judge
 *  Runs ONLY after all rule-based layers pass (don't waste API calls)
 * ═══════════════════════════════════════════════════════════════
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIAnalysisResult {
  risk_score: number;
  verdict: 'allow' | 'suspicious' | 'block';
  reason: string;
  layer: 'L7_AI';
}

const SYSTEM_PROMPT = `SYSTEM: USERNAME IMPERSONATION DETECTION ENGINE

YOUR PRIMARY OBJECTIVE: Guard against active brand and authority impersonation. Real human names, user identities, and personal usernames must NEVER be blocked under any circumstances.

CRITICAL POLICY FOR HUMAN NAMES:
- You must always ALLOW human names (e.g. rahul, pritam, subhankar, sagar, amit, govind, padmini, wendy, imran, patricia, lucia).
- You must allow names combined with numbers, location codes, birth years, or non-authority job roles (e.g., rahul1998, pritam_dev, sagar_in, amit_delhi, wendy_designer, subha_coder).
- Real human names are NOT brand/authority impersonators, even if they contain substrings like "admin" (e.g. padmini), "gov" (e.g. govind), "meta" (e.g. metal_music), or "cia" (e.g. patricia).

STRICT IMPERSONATION CRITERIA:
Only flag a username as "block" or "suspicious" if it meets BOTH conditions:
1. It contains or closely mimics a major brand (e.g. google, facebook, verlyn, shincore, paypal, vimeo).
2. AND it appends/prepends a deceptive system authority keyword (e.g. admin, support, official, team, staff, mod, verified, help, service).

REFERENCE CASES:
- "googlesupport" -> BLOCK (Resembles "google" + authority word "support")
- "google_admin" -> BLOCK (Resembles "google" + authority word "admin")
- "its_verlyn_support" -> BLOCK (Resembles "verlyn" + authority word "support")
- "rahul_google" -> ALLOW (Personal name + brand; indicates a fan or normal user, not system impersonation)
- "padmini" -> ALLOW (Real human name; does not resemble brand + authority combination)
- "govind" -> ALLOW (Real human name; does not resemble brand + authority combination)
- "its_subhankar" -> ALLOW (Personal username; no brand name present)
- "subhankar_real" -> ALLOW (Personal name; "real" indicates a verified personal handle, not system authority)
- "wendy99" -> ALLOW (Human name + number)
- "imran_dev" -> ALLOW (Human name + developer suffix)

OUTPUT FORMAT (JSON ONLY, NO ADDITIONAL TEXT):
{
  "risk_score": <number 0-100>,
  "verdict": "<allow|suspicious|block>",
  "reason": "<clear explanation of why the name is approved or blocked>"
}

THRESHOLDS:
- risk_score >= 60 -> "block"
- risk_score 40-59 -> "suspicious"
- risk_score < 40 -> "allow"

DEFAULT PRINCIPLE: When in doubt, ALWAYS ALLOW.`;

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export async function aiAdversarialAnalysis(
  rawUsername: string,
  normalizedUsername: string
): Promise<AIAnalysisResult> {
  const defaultFail: AIAnalysisResult = {
    risk_score: 75,
    verdict: 'block',
    reason: 'AI analysis service unavailable — defaulting to block for safety.',
    layer: 'L7_AI'
  };

  try {
    const client = getClient();
    const model = client.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1, // Low temp = deterministic, strict judgement
        maxOutputTokens: 256,
      }
    });

    const userMessage = `Analyze this username for impersonation and security risk.
Original: "${rawUsername}"
Normalized (leet removed, symbols stripped): "${normalizedUsername}"`;

    const result = await model.generateContent(userMessage);
    const text = result.response.text().trim();

    // Parse and validate
    const parsed = JSON.parse(text);

    if (
      typeof parsed.risk_score !== 'number' ||
      !['allow', 'suspicious', 'block'].includes(parsed.verdict) ||
      typeof parsed.reason !== 'string'
    ) {
      console.error('[AI-L7] Invalid response shape:', parsed);
      return defaultFail;
    }

    // Enforce threshold alignment (don't trust AI if it contradicts its own score)
    let verdict = parsed.verdict as 'allow' | 'suspicious' | 'block';
    const score = Math.min(100, Math.max(0, Math.round(parsed.risk_score)));
    if (score >= 60) verdict = 'block';
    else if (score >= 40) verdict = 'suspicious';
    else verdict = 'allow';

    console.log(`[AI-L7] "${rawUsername}" → score=${score}, verdict=${verdict}, reason="${parsed.reason}"`);

    return {
      risk_score: score,
      verdict,
      reason: parsed.reason,
      layer: 'L7_AI'
    };
  } catch (err: any) {
    console.error('[AI-L7] Analysis failed:', err?.message ?? err);
    // On any failure, fail OPEN for allow (avoid blocking legit users due to API errors)
    // Change to defaultFail if you want fail-closed behavior
    return {
      risk_score: 30,
      verdict: 'allow',
      reason: 'AI analysis temporarily unavailable — passed by default.',
      layer: 'L7_AI'
    };
  }
}
