'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PILLARS = [
  "Connect Privately",
  "Talk Freely",
  "Own Your Data",
  "No Bots. No Spam.",
  "Verlyn is for You"
];

export default function IntroScreen({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState(0);
  const [pillar, setPillar] = useState(0);

  useEffect(() => {
    // Human-Centric Timeline (Fast, Warm, Professional)
    const t1 = setTimeout(() => setStage(1), 300);  // Logo
    const t2 = setTimeout(() => setStage(2), 1100); // Wordmark
    const t3 = setTimeout(() => setStage(3), 1800); // Progress Start
    const t4 = setTimeout(() => setStage(4), 5400); // Exit
    const t5 = setTimeout(onComplete, 6200);

    const pInterval = setInterval(() => {
      setPillar(p => (p + 1) % PILLARS.length);
    }, 1000);

    return () => {
      [t1, t2, t3, t4, t5].forEach(clearTimeout);
      clearInterval(pInterval);
    };
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      animate={{ opacity: stage === 4 ? 0 : 1 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#000',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', cursor: 'none'
      }}
    >
      {/* ── SOFT AMBIENT GLOW ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 60%)',
        opacity: stage >= 1 ? 1 : 0,
        transition: 'opacity 1s ease'
      }} />

      {/* ── LOGO ────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', width: '70px', height: '70px', marginBottom: '32px' }}>
        <AnimatePresence>
          {stage >= 1 && (
            <motion.svg 
              viewBox="0 0 100 100" 
              fill="none" 
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
            >
              <motion.path 
                d="M12,15 H38 L50,60 L62,15 H88 L58,85 H42 Z" 
                fill="white"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "circOut" }}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </div>

      {/* ── WORDMARK ────────────────────────────────────────────────── */}
      <motion.h1
        initial={{ opacity: 0, y: 5 }}
        animate={{ 
          opacity: stage >= 2 ? 1 : 0, 
          y: stage >= 2 ? 0 : 5,
        }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{
          fontFamily: 'var(--font-bebas), "Bebas Neue", sans-serif',
          fontSize: 'clamp(40px, 7vw, 72px)',
          color: '#fff', margin: '0 0 24px',
          fontWeight: 400,
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          marginRight: '-0.4em',
          textAlign: 'center'
        }}
      >
        VERLYN
      </motion.h1>

      {/* ── PILLARS (HUMANIZED TEXTS) ───────────────────────────────── */}
      <div style={{ height: '20px', overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          {stage >= 3 && (
            <motion.p
              key={pillar}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              style={{
                fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0,
                textAlign: 'center'
              }}
            >
              {PILLARS[pillar]}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── PROGRESS BAR ────────────────────────────────────────────── */}
      <div style={{ 
        width: '240px', height: '1px', background: 'rgba(255,255,255,0.06)', 
        marginTop: '32px', overflow: 'hidden', position: 'relative'
      }}>
        <motion.div 
          initial={{ width: '0%' }}
          animate={{ width: stage >= 3 ? '100%' : '0%' }}
          transition={{ duration: 3.5, ease: "linear" }}
          style={{ height: '100%', background: '#fff' }}
        />
      </div>
    </motion.div>
  );
}
