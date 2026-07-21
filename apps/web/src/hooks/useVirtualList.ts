'use client';

/**
 * useVirtualList — Lightweight variable-height virtual list (v2)
 *
 * Renders only items within the scrollport + overscan buffer.
 * Uses a ResizeObserver to measure real item heights and updates
 * total content size as items mount/unmount.
 *
 * Performance contract:
 *   - DOM nodes ≈ visibleCount + 2×overscan (typically 20–30 nodes)
 *   - O(log N) binary search for visible range via cumulative height cache
 *   - ResizeObserver callbacks are BATCHED via rAF — eliminates render storms
 *     where 50 items each firing a synchronous forceUpdate caused 50 re-renders/frame
 *   - No external dependencies (no react-window, no react-virtual)
 *
 * v2 changes vs v1:
 *   - rAF batching: all ResizeObserver callbacks within one frame are merged
 *     into a SINGLE forceUpdate call. Previous implementation fired one per item.
 *   - Dirty flag: only re-render when at least one size actually changed.
 *   - Scroll ref read: deferred to render phase (not in observer callback)
 *     to avoid layout thrashing.
 *   - Stable measureElement identity: uses index-keyed observer map.
 */

import { useRef, useState, useCallback, useEffect, RefObject } from 'react';

export interface VirtualItem {
  index: number;
  /** Measured or estimated pixel offset from list top */
  start: number;
  /** Measured item height (0 until first render) */
  size: number;
}

interface UseVirtualListOptions<T> {
  /** Source items array */
  items: T[];
  /** Scroll container ref */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Estimated item height for initial layout (actual measured after mount) */
  estimatedItemSize?: number;
  /** Items to render above/below the visible range */
  overscan?: number;
  /** Key to reset measurement cache (e.g. conversationId) */
  cacheKey?: string;
}

interface UseVirtualListReturn {
  /** Subset of items to render */
  virtualItems: VirtualItem[];
  /** Total pixel height of all items (for the spacer) */
  totalSize: number;
  /** Call this with the index and the rendered element to measure it */
  measureElement: (index: number, el: HTMLElement | null) => void;
}

/**
 * Threshold: only virtualise when list exceeds this count.
 * Below this, render all items to avoid virtualisation overhead for small lists.
 */
const VIRTUALISE_THRESHOLD = 60;

export function useVirtualList<T>({
  items,
  scrollRef,
  estimatedItemSize = 72,
  overscan = 8,
  cacheKey,
}: UseVirtualListOptions<T>): UseVirtualListReturn {
  const [scrollTop, setScrollTop] = useState(0);
  const [clientHeight, setClientHeight] = useState(600);

  // Measured sizes keyed by item index
  const sizesRef = useRef<number[]>([]);
  const observedElementsRef = useRef<Map<number, HTMLElement>>(new Map());
  const [, forceUpdate] = useState(0);

  // ── rAF Batch System ──────────────────────────────────────────────────────
  // Batches ResizeObserver changes, scroll container height shifts, and scroll position
  // updates into a single browser frame repaint loop.
  const rafRef = useRef<number | null>(null);
  const isDirtyRef = useRef(false);
  const pendingScrollTopRef = useRef<number | null>(null);
  const pendingClientHeightRef = useRef<number | null>(null);

  const scheduleUpdate = useCallback(() => {
    if (rafRef.current !== null) return; // already scheduled
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      let shouldUpdate = false;
      if (isDirtyRef.current) {
        isDirtyRef.current = false;
        shouldUpdate = true;
      }
      if (pendingScrollTopRef.current !== null) {
        setScrollTop(pendingScrollTopRef.current);
        pendingScrollTopRef.current = null;
        shouldUpdate = true;
      }
      if (pendingClientHeightRef.current !== null) {
        setClientHeight(pendingClientHeightRef.current);
        pendingClientHeightRef.current = null;
        shouldUpdate = true;
      }
      if (shouldUpdate) {
        forceUpdate(n => n + 1);
      }
    });
  }, []);

  const sharedObserverRef = useRef<ResizeObserver | null>(null);
  const elementToKeyRef = useRef<WeakMap<Element, number>>(new WeakMap());

  // Reset measurement cache on cacheKey change (conversation switch)
  useEffect(() => {
    sizesRef.current = [];
    if (sharedObserverRef.current) {
      sharedObserverRef.current.disconnect();
    }
    observedElementsRef.current.clear();
    elementToKeyRef.current = new WeakMap();
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    isDirtyRef.current = true;
    forceUpdate(n => n + 1);
  }, [cacheKey]);

  // Synchronize scroll events and clientHeight changes
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      pendingScrollTopRef.current = container.scrollTop;
      scheduleUpdate();
    };

    const containerObserver = new ResizeObserver(([entry]) => {
      pendingClientHeightRef.current = Math.ceil(entry.contentRect.height);
      scheduleUpdate();
    });
    containerObserver.observe(container);

    container.addEventListener('scroll', handleScroll, { passive: true });

    // Initial read
    setScrollTop(container.scrollTop);
    setClientHeight(container.clientHeight);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      containerObserver.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [scrollRef, cacheKey, scheduleUpdate]);

  // Initialize and tear down the shared ResizeObserver
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sharedObserverRef.current = new ResizeObserver((entries) => {
        let sizeChanged = false;
        for (const entry of entries) {
          const index = elementToKeyRef.current.get(entry.target);
          if (index !== undefined) {
            const newSize = Math.ceil(entry.contentRect.height);
            if (sizesRef.current[index] !== newSize) {
              sizesRef.current[index] = newSize;
              sizeChanged = true;
            }
          }
        }
        if (sizeChanged) {
          isDirtyRef.current = true;
          scheduleUpdate();
        }
      });
    }
    return () => {
      if (sharedObserverRef.current) {
        sharedObserverRef.current.disconnect();
        sharedObserverRef.current = null;
      }
    };
  }, [scheduleUpdate]);

  const measureElement = useCallback((index: number, el: HTMLElement | null) => {
    const prevEl = observedElementsRef.current.get(index);

    if (!el) {
      if (prevEl && sharedObserverRef.current) {
        sharedObserverRef.current.unobserve(prevEl);
      }
      observedElementsRef.current.delete(index);
      return;
    }

    if (prevEl === el) {
      return;
    }

    if (prevEl && sharedObserverRef.current) {
      sharedObserverRef.current.unobserve(prevEl);
    }

    observedElementsRef.current.set(index, el);
    elementToKeyRef.current.set(el, index);

    if (sharedObserverRef.current) {
      sharedObserverRef.current.observe(el);
    }

    const initialSize = Math.ceil(el.getBoundingClientRect().height);
    if (initialSize > 0 && sizesRef.current[index] !== initialSize) {
      sizesRef.current[index] = initialSize;
      isDirtyRef.current = true;
      scheduleUpdate();
    }
  }, [scheduleUpdate]);

  // For small lists, bypass virtualisation entirely
  if (items.length <= VIRTUALISE_THRESHOLD) {
    const virtualItems: VirtualItem[] = items.map((_, i) => ({
      index: i,
      start: 0,
      size: sizesRef.current[i] ?? estimatedItemSize,
    }));
    const totalSize = items.reduce((acc, _, i) => acc + (sizesRef.current[i] ?? estimatedItemSize), 0);
    return {
      virtualItems,
      totalSize,
      measureElement,
    };
  }

  // Build cumulative offsets
  const offsets: number[] = new Array(items.length + 1);
  offsets[0] = 0;
  for (let i = 0; i < items.length; i++) {
    offsets[i + 1] = offsets[i] + (sizesRef.current[i] ?? estimatedItemSize);
  }
  const totalSize = offsets[items.length];

  // Binary search for first visible index
  let lo = 0, hi = items.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (offsets[mid + 1] < scrollTop) lo = mid + 1;
    else hi = mid;
  }

  const startIndex = Math.max(0, lo - overscan);
  const endIndex = Math.min(items.length - 1, (() => {
    let i = lo;
    while (i < items.length && offsets[i] < scrollTop + clientHeight) i++;
    return Math.min(items.length - 1, i + overscan);
  })());

  const virtualItems: VirtualItem[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    virtualItems.push({
      index: i,
      start: offsets[i],
      size: sizesRef.current[i] ?? estimatedItemSize,
    });
  }

  return { virtualItems, totalSize, measureElement };
}
