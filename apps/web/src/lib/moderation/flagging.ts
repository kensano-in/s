/**
 * ═══════════════════════════════════════════════════════════════
 *  CONTENT FLAGGING ENGINE
 *  Every piece of content gets a risk score + flag status.
 *  Combines text + bot + trust signals into a final verdict.
 * ═══════════════════════════════════════════════════════════════
 */

import { analyzeText, TextAnalysisResult } from './text-filter';
import { evaluateBotRisk } from './bot-detector';
import { getTrustTier, getUserTrustScore } from './trust-score';

export type FlagStatus = 'clean' | 'suspicious' | 'flagged' | 'removed' | 'shadow';

export type ModerationVerdict = {
  flagStatus: FlagStatus;
  riskScore: number;          // 0–100
  action: 'allow' | 'warn' | 'shadow' | 'block' | 'review';
  reasons: string[];
  textAnalysis: TextAnalysisResult;
  botRisk: number;
  trustBonus: number;
};

export async function evaluateContent(params: {
  text: string;
  authorId: string;
  actionType: 'post' | 'comment' | 'message' | 'report';
  ip?: string;
}): Promise<ModerationVerdict> {
  const { text, authorId, actionType, ip } = params;

  // ── Layer 1: Text Analysis ─────────────────────────────────
  const textResult = analyzeText(text);

  // ── Layer 2: Bot Detection ─────────────────────────────────
  const botActor = ip || authorId;
  const botResult = evaluateBotRisk({
    actorId: botActor,
    actionType,
    contentSnippet: text.slice(0, 200),
  });

  // ── Layer 3: Trust Score Modifier ─────────────────────────
  const trustScore = await getUserTrustScore(authorId);
  const trustTier = getTrustTier(trustScore);

  // Trust bonus/penalty on final risk:
  //   prime/trusted → subtract up to 20 pts (benefit of the doubt)
  //   restricted/shadow_ban/banned → add up to 30 pts (heightened scrutiny)
  let trustBonus = 0;
  if (trustTier === 'prime') trustBonus = -20;
  else if (trustTier === 'trusted') trustBonus = -12;
  else if (trustTier === 'restricted') trustBonus = +15;
  else if (trustTier === 'shadow_ban') trustBonus = +25;
  else if (trustTier === 'banned') trustBonus = +50;

  // ── Composite Score ────────────────────────────────────────
  // Weights: Text (60%) + Bot (30%) + Trust bonus (flat)
  const rawScore = textResult.riskScore * 0.6 + botResult.riskScore * 0.3 + trustBonus;
  const riskScore = Math.min(100, Math.max(0, rawScore));

  // ── Determine Action ───────────────────────────────────────
  let action: ModerationVerdict['action'] = 'allow';
  let flagStatus: FlagStatus = 'clean';
  const reasons = [...textResult.reasons];

  // Hard block: shadow-banned user or extreme content
  if (trustTier === 'banned' || (trustTier === 'shadow_ban' && riskScore >= 30)) {
    action = 'shadow';
    flagStatus = 'shadow';
    reasons.push('User is shadow-banned.');
  } else if (riskScore >= 85) {
    action = 'block';
    flagStatus = 'removed';
  } else if (riskScore >= 60) {
    action = 'review';
    flagStatus = 'flagged';
    reasons.push('Content queued for human review.');
  } else if (riskScore >= 30) {
    action = 'warn';
    flagStatus = 'suspicious';
    reasons.push('Content may violate community guidelines.');
  }

  if (botResult.isBot) {
    action = 'block';
    flagStatus = 'removed';
    reasons.push(`Bot behavior detected: ${botResult.signals.join(', ')}`);
  }

  return {
    flagStatus,
    riskScore: Math.round(riskScore),
    action,
    reasons,
    textAnalysis: textResult,
    botRisk: botResult.riskScore,
    trustBonus,
  };
}
