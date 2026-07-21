'use client';

/**
 * TouchRipple v2 — Dual-mode ripple system
 *
 * Mode A (wrapper): <TouchRipple>{children}</TouchRipple>
 *   — Wraps an element. Intercepts pointerdown at the wrapper level.
 *
 * Mode B (overlay): <TouchRipple /> (self-closing, no children)
 *   — Absolutely positioned overlay inside a `position:relative; overflow:hidden`
 *     parent. The parent handles pointer events normally; ripple injects itself
 *     on the parent's pointerdown via event delegation.
 *     This is the pattern used by motion.button wrappers across the codebase.
 *
 * GPU properties used: transform, opacity only. Zero layout thrash.
 */

import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { RIPPLE } from '@/lib/motion';

interface TouchRippleProps {
  children?: React.ReactNode;
  className?: string;
  /** Ripple color. Defaults to soft white. */
  color?: string;
  disabled?: boolean;
}

function spawnRipple(
  container: HTMLElement,
  x: number,
  y: number,
  color: string
) {
  const rect = container.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2.2;
  const ripple = document.createElement('span');
  ripple.className = 'touch-ripple-wave';
  ripple.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    left: ${x - size / 2}px;
    top: ${y - size / 2}px;
    background: ${color};
    animation-duration: ${RIPPLE.duration}ms;
  `;
  container.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  setTimeout(() => ripple.remove(), RIPPLE.duration + 60);
}

export default function TouchRipple({
  children,
  className,
  color = 'rgba(255, 255, 255, 0.13)',
  disabled = false,
}: TouchRippleProps) {
  const overlayRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      spawnRipple(container, e.clientX - rect.left, e.clientY - rect.top, color);
    },
    [disabled, color]
  );

  // ── Mode B: overlay (no children) ──────────────────────────────────────────
  useEffect(() => {
    if (children !== undefined || disabled) return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    const parent = overlay.parentElement;
    if (!parent) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (disabled) return;
      const rect = parent.getBoundingClientRect();
      spawnRipple(parent, e.clientX - rect.left, e.clientY - rect.top, color);
    };

    parent.addEventListener('pointerdown', handlePointerDown);
    return () => parent.removeEventListener('pointerdown', handlePointerDown);
  }, [children, color, disabled]);

  // ── Mode B render ───────────────────────────────────────────────────────────
  if (children === undefined) {
    return (
      <span
        ref={overlayRef}
        aria-hidden="true"
        className="absolute inset-0 rounded-[inherit] overflow-hidden pointer-events-none z-0"
      />
    );
  }

  // ── Mode A: wrapper ─────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      className={cn('touch-ripple-container', className)}
    >
      {children}
    </div>
  );
}
