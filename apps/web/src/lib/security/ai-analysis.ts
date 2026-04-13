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

YOUR ONLY JOB: Detect clear brand or authority impersonation. Allow everything else.

BLOCK ONLY IF ALL of these are true simultaneously:
1. The username closely resembles a well-known brand/platform (google, microsoft, paypal, instagram, etc.)
2. AND it combines that brand with an authority word (admin, support, official, team, staff, mod, verified)
Example blocks: googlesupport, amazonofficial, instagramteam, paypalhelp

ALWAYS ALLOW:
- Personal names: subhankar, pritam, sagar, rahul, ali, john, maria, sofia
- Cultural names from any country or language
- Anime/fictional names: naruto, tanjiro, goku, luffy
- Fan names: ilovegoogle, netflixfan, appleuser
- Random usernames that don't match any known brand+authority pattern
- Short names, long names, unusual names — if they're not impersonating a brand

CRITICAL RULE:
Do NOT block a username just because it is unfamiliar or unusual.
Do NOT assume malicious intent for personal names.
Only block if there is CLEAR, OBVIOUS brand impersonation with authority abuse.

OUTPUT ONLY THIS JSON — NO TEXT BEFORE OR AFTER:
{
  "risk_score": <number 0-100>,
  "verdict": "<allow|suspicious|block>",
  "reason": "<one clear sentence>"
}

THRESHOLDS:
- risk_score >= 60 → "block"
- risk_score 40-59 → "suspicious"
- risk_score < 40 → "allow"

DEFAULT BEHAVIOR: When in doubt → ALLOW.`;

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
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1, // Low temp = deterministic, strict judgement
        maxOutputTokens: 256,
      }
    });

    const userMessage = `Analyze this username for impersonation and security risk.

Original: "${rawUsername}"
Normalized (leet removed, symbols stripped): "${normalizedUsername}"

Respond ONLY with JSON.`;

    const chat = model.startChat({
      history: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT }] }, { role: 'model', parts: [{ text: '{"risk_score":0,"verdict":"allow","reason":"Ready to analyze."}' }] }]
    });

    const result = await chat.sendMessage(userMessage);
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
