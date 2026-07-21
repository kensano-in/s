/**
 * Moderation System — Public API
 * Import from here for clean, unified access.
 */
export { analyzeText } from './text-filter';
export type { TextAnalysisResult } from './text-filter';

export { evaluateBotRisk, resetBotLog } from './bot-detector';

export {
  applyTrustEvent,
  getUserTrustScore,
  getTrustTier,
  TRUST_THRESHOLDS,
} from './trust-score';
export type { TrustEvent } from './trust-score';

export { evaluateContent } from './flagging';
export type { ModerationVerdict, FlagStatus } from './flagging';
