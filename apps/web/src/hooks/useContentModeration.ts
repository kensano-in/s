'use client';
/**
 * ═══════════════════════════════════════════════════════════════
 *  useContentModeration
 *  Client-side hook for pre-upload content screening.
 *  Calls /api/security/moderate before content is submitted.
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react';

export type ModerationState = 'idle' | 'checking' | 'approved' | 'warned' | 'blocked';

export interface ModerationResult {
  allowed: boolean;
  action: 'allow' | 'warn' | 'shadow' | 'block' | 'review';
  riskScore: number;
  flagStatus: string;
  reasons: string[];
  botRisk: number;
}

export function useContentModeration() {
  const [state, setState] = useState<ModerationState>('idle');
  const [result, setResult] = useState<ModerationResult | null>(null);

  /**
   * Screen text content before submission.
   * Returns whether the content is cleared to post.
   */
  const screenContent = useCallback(async (
    text: string,
    actionType: 'post' | 'comment' | 'message' = 'post'
  ): Promise<ModerationResult | null> => {
    if (!text.trim()) return null;

    setState('checking');

    try {
      const res = await fetch('/api/security/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, actionType }),
      });

      if (!res.ok) {
        // API error — allow content through rather than silently fail
        console.warn('[Moderation] API error, allowing content through:', res.status);
        setState('approved');
        return null;
      }

      const data: ModerationResult = await res.json();
      setResult(data);

      if (!data.allowed) {
        setState('blocked');
      } else if (data.action === 'warn') {
        setState('warned');
      } else {
        setState('approved');
      }

      return data;
    } catch (err) {
      // Network error — allow through gracefully
      console.warn('[Moderation] Network error, allowing through:', err);
      setState('approved');
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setResult(null);
  }, []);

  return { state, result, screenContent, reset };
}
