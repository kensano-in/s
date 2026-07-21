'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * useBreakpoint
 *
 * Single source of truth for responsive layout decisions.
 * Uses ResizeObserver on document.documentElement for zero-jank breakpoint
 * detection — avoids the flash/conflict that window.matchMedia listeners can
 * cause on rapid resize.
 *
 * Breakpoints (aligned with Tailwind config):
 *   mobile:  < 768px
 *   tablet:  768 – 1024px
 *   desktop: > 1024px
 *
 * Syncs into the global Zustand store so ANY component can read
 * `useAppStore(s => s.breakpoint)` without prop-drilling or duplicating
 * matchMedia logic.
 *
 * Mount this hook ONCE in the root layout. It is idempotent — mounting
 * multiple times just updates the same store key.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';

// SSR-safe useLayoutEffect fallback
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const MOBILE_MAX  = 767;
const TABLET_MAX  = 1279;

function getBreakpoint(width: number): 'mobile' | 'tablet' | 'desktop' {
  if (width <= MOBILE_MAX)  return 'mobile';
  if (width <= TABLET_MAX)  return 'tablet';
  return 'desktop';
}

export function useBreakpoint() {
  const setBreakpoint = useAppStore((s) => s.setBreakpoint);
  const observerRef = useRef<ResizeObserver | null>(null);

  useIsomorphicLayoutEffect(() => {
    // Set immediately from current window width
    const initialBp = getBreakpoint(window.innerWidth);
    setBreakpoint(initialBp);

    // Use ResizeObserver on the root element for continuous tracking
    observerRef.current = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = entry.contentRect.width || window.innerWidth;
      const bp = getBreakpoint(width);
      // Only update if changed to avoid unnecessary re-renders
      const current = useAppStore.getState().breakpoint;
      if (current !== bp) {
        setBreakpoint(bp);
      }
    });

    observerRef.current.observe(document.documentElement);

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Convenience selector hooks — use these in components to avoid
 * repeated `useAppStore(s => s.breakpoint === 'mobile')` calls.
 */
export function useIsMobile()  { return useAppStore((s) => s.breakpoint === 'mobile');  }
export function useIsTablet()  { return useAppStore((s) => s.breakpoint === 'tablet');  }
export function useIsDesktop() { return useAppStore((s) => s.breakpoint === 'desktop'); }
