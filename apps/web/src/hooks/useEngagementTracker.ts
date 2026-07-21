import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UseEngagementTrackerProps {
  postId: string;
  userId?: string;
  disabled?: boolean;
}

const ACTION_WEIGHTS: Record<string, number> = {
  view: 0.1,
  click: 0.5,
  like: 1.0,
  comment: 2.0,
  save: 3.0,
  unlike: -1.0,
  unsave: -3.0
};

export function useEngagementTracker({ postId, userId, disabled = false }: UseEngagementTrackerProps) {
  const ref = useRef<HTMLElement | null>(null);
  const trackedViewRef = useRef(false);

  const track = useCallback(async (actionType: string) => {
    if (disabled || !userId) return;

    const weight = ACTION_WEIGHTS[actionType] || 0.1;
    
    // Fire and forget edge tracking
    const supabase = createClient();
    supabase.from('engagement_logs').insert({
      user_id: userId,
      post_id: postId,
      action_type: actionType,
      weight
    }).then(({ error }: { error: any }) => {
      if (error) {
        console.warn(`[EngagementTracker] Failed to track ${actionType}:`, error);
      }
    });

  }, [postId, userId, disabled]);

  // Track View on Intersection
  useEffect(() => {
    if (disabled || !userId || trackedViewRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          // If 50% of the post is visible, count it as a view
          track('view');
          trackedViewRef.current = true;
          observer.disconnect();
        }
      });
    }, { threshold: [0.5] });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [disabled, userId, track]);

  return { ref, track };
}
