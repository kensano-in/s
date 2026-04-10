'use client';

/**
 * TouchRipple — Axiom 14: Interaction Field
 *
 * Every touch must create a ripple in the system.
 * Wraps any element and injects a GPU-composited radial ripple on pointerdown.
 * Uses only transform + opacity — zero layout thrash.
 * Auto-removes the ripple element after 500ms.
 */

import { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { RIPPLE } from '@/lib/motion';

interface TouchRippleProps {
  children: React.ReactNode;
  className?: string;
  /** Color of the ripple. Defaults to white. */
  color?: string;
  /** If true, ripple is disabled (e.g. when button is disabled). */
  disabled?: boolean;
}

export default function TouchRipple({
  children,
  className,
  color = 'rgba(255, 255, 255, 0.18)',
  disabled = false,
}: TouchRippleProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();

      // Pointer position relative to the container
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Size: the ripple should be large enough to cover the entire element
      // Use the largest dimension × 2 to guarantee full coverage
      const size = Math.max(rect.width, rect.height) * 2;

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

      // Clean up after animation completes
      const timeout = setTimeout(() => {
        ripple.remove();
      }, RIPPLE.duration + 50);

      // If the pointer is released early, we still let the animation finish
      const cleanup = () => clearTimeout(timeout);
      ripple.addEventListener('animationend', () => {
        ripple.remove();
        cleanup();
      }, { once: true });
    },
    [disabled, color]
  );

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
