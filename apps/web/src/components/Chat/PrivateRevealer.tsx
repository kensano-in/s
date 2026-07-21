'use client';

import React, { useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';

interface PrivateRevealerProps {
  content: string;
  isSent: boolean;
}

export default function PrivateRevealer({ content, isSent }: PrivateRevealerProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const controls = useAnimation();

  const handleStart = () => {
    setIsRevealed(true);
    controls.start({ filter: 'blur(0px)', opacity: 1 });
  };

  const handleEnd = () => {
    setIsRevealed(false);
    controls.start({ filter: 'blur(10px)', opacity: 0.6 });
  };

  return (
    <div className="relative cursor-pointer select-none">
      <motion.div
        onMouseDown={handleStart}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchEnd={handleEnd}
        animate={controls}
        initial={{ filter: 'blur(10px)', opacity: 0.6 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 p-0.5"
      >
        {content}
      </motion.div>

      {!isRevealed && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border ${
              isSent 
              ? 'bg-white/10 border-white/20 text-white/60' 
              : 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400'
            }`}
          >
            <ShieldAlert size={12} className="animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Hold to Reveal</span>
          </motion.div>
        </div>
      )}

      {/* Static Noise Background */}
      {!isRevealed && (
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none rounded-inherit"
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
          }}
        />
      )}
    </div>
  );
}
