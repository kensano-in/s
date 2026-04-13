'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface CinematicLogoProps {
  onComplete: () => void;
}

export default function CinematicLogo({ onComplete }: CinematicLogoProps) {
  const [phase, setPhase] = useState<'ignite' | 'collision' | 'stabilize' | 'shatter'>('ignite');

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('collision'), 800),
      setTimeout(() => setPhase('stabilize'), 1600),
      setTimeout(() => setPhase('shatter'), 2400),
      setTimeout(onComplete, 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#020202] z-[9999] overflow-hidden">
      {/* 🌌 Atmospheric Backdrop: Void Distortion */}
      <div className="absolute inset-0 z-0">
        <motion.div 
          animate={{ 
            opacity: [0.05, 0.1, 0.05],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute inset-x-[-20%] inset-y-[-20%] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)] blur-[100px]"
        />
        
        {/* Kinetic Grid Layer */}
        <div className="absolute inset-0 opacity-[0.03] z-10 overflow-hidden">
          <motion.div 
            animate={{ y: ['0%', '-50%'] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="w-full h-[200%] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:40px_40px]"
          />
        </div>
      </div>

      <AnimatePresence>
        {/* ⚡ Collision Shards */}
        {phase === 'collision' && (
          <div className="absolute inset-0 z-20 pointer-events-none">
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                animate={{ 
                  scale: [0, 4, 0], 
                  x: (Math.random() - 0.5) * 1000, 
                  y: (Math.random() - 0.5) * 1000,
                  opacity: [0, 1, 0]
                }}
                className="absolute left-1/2 top-1/2 w-px h-20 bg-gradient-to-t from-white to-transparent"
                style={{ rotate: `${i * 15}deg` }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* 💠 The Core: Sentinel Apex */}
      <motion.div
        animate={{
          scale: phase === 'shatter' ? 1.5 : 1,
          opacity: phase === 'shatter' ? 0 : 1,
          filter: phase === 'shatter' ? 'blur(20px)' : 'blur(0px)',
        }}
        transition={{ duration: 0.4 }}
        className="relative z-30"
      >
        <svg
          width="180"
          height="180"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          {/* Chromatic Aberration Shadows */}
          <motion.path
            d="M15 10 L50 90 L85 10"
            stroke="cyan"
            strokeWidth="12"
            strokeLinecap="round"
            className="mix-blend-screen opacity-20"
            animate={{ 
              x: phase === 'collision' ? [-2, 2, -2] : 0,
              y: phase === 'collision' ? [2, -2, 2] : 0 
            }}
          />
          <motion.path
            d="M15 10 L50 90 L85 10"
            stroke="magenta"
            strokeWidth="12"
            strokeLinecap="round"
            className="mix-blend-screen opacity-20"
            animate={{ 
              x: phase === 'collision' ? [2, -2, 2] : 0,
              y: phase === 'collision' ? [-2, 2, -2] : 0 
            }}
          />

          {/* Primary Apex Build */}
          <motion.path
            d="M15 10 L50 90 L85 10"
            stroke="white"
            strokeWidth="12"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: phase === 'ignite' ? 0.4 : 1, 
              opacity: 1,
              strokeWidth: phase === 'collision' ? [12, 16, 12] : 12
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />

          {/* Impact Corona */}
          {phase === 'collision' && (
            <motion.circle
              cx="50"
              cy="90"
              r="10"
              fill="white"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 4, 1] }}
              className="blur-[2px]"
            />
          )}
        </svg>

        {/* 🌌 Ghost Pulse Aura */}
        <motion.div 
          animate={{ 
            scale: phase === 'collision' ? [1, 2.5, 1.2] : [1, 1.2, 1],
            opacity: phase === 'collision' ? [0.2, 0.8, 0.3] : [0.2, 0.4, 0.2] 
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-white/20 blur-[50px] rounded-full -z-10"
        />

        {/* Data Rain Streams */}
        {phase === 'stabilize' && (
          <div className="absolute inset-0 z-40 overflow-visible pointer-events-none">
             {[15, 85].map((x) => (
                <motion.div
                  key={x}
                  initial={{ y: 0, height: 0, opacity: 1 }}
                  animate={{ y: 300, height: 150, opacity: 0 }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.2 }}
                  className="absolute w-px bg-gradient-to-b from-white to-transparent"
                  style={{ left: `${x}%` }}
                />
             ))}
          </div>
        )}
      </motion.div>

      {/* Kinetic Blast Layer */}
      <AnimatePresence>
        {phase === 'collision' && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 10, opacity: [0, 0.4, 0] }}
            exit={{ opacity: 0 }}
            className="absolute border-[2px] border-white/30 rounded-full w-40 h-40 z-[15] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* High-Fidelity Noise Overlay */}
      <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none z-[100]" 
           style={{ 
             backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` 
           }} 
      />
    </div>
  );
}
