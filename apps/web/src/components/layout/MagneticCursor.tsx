'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';

export default function MagneticCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [target, setTarget] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    let frameId: number;
    
    const onMouseMove = (e: MouseEvent) => {
      setTarget({ x: e.clientX, y: e.clientY });
      const targetEl = e.target as HTMLElement;
      setIsHovering(
        targetEl.tagName.toLowerCase() === 'button' || 
        targetEl.tagName.toLowerCase() === 'a' || 
        targetEl.closest('button') !== null || 
        targetEl.closest('a') !== null
      );
    };

    const update = () => {
      setPos(p => {
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        return {
          x: p.x + dx * 0.15,
          y: p.y + dy * 0.15
        };
      });
      frameId = requestAnimationFrame(update);
    };

    window.addEventListener('mousemove', onMouseMove);
    update();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(frameId);
    };
  }, [target.x, target.y]);

  // If mobile, don't show
  if (typeof window !== 'undefined' && window.innerWidth < 768) return null;

  return (
    <>
      <style>{`
        body { cursor: none; }
        button, a, input, [role="button"] { cursor: none !important; }
      `}</style>
      <div 
        className={clsx(
          "fixed top-0 left-0 w-8 h-8 rounded-full pointer-events-none z-[9999] mix-blend-difference transition-transform duration-300",
          isHovering ? "scale-150 bg-white/100" : "scale-100 bg-white/60"
        )}
        style={{
          transform: `translate3d(calc(${pos.x}px - 50%), calc(${pos.y}px - 50%), 0) scale(${isHovering ? 1.5 : 1})`,
        }}
      />
      <div 
        className="fixed top-0 left-0 w-2 h-2 rounded-full pointer-events-none z-[10000] bg-white transition-opacity duration-300"
        style={{
          transform: `translate3d(calc(${target.x}px - 50%), calc(${target.y}px - 50%), 0)`,
          opacity: isHovering ? 0 : 1
        }}
      />
    </>
  );
}
