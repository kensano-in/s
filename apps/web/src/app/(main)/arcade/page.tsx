'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Sparkles, Target, Zap, Check, Share2, X, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

// Type for our mini-experiences
type ArcadeExperience = {
  id: string;
  title: string;
  tagline: string;
  icon: React.ElementType;
  playersLive: number;
  bgColor: string;
  iconColor: string;
};

const EXPERIENCES: ArcadeExperience[] = [
  {
    id: 'reaction',
    title: 'Reaction Pulse',
    tagline: 'Test your sub-second response time.',
    icon: Zap,
    playersLive: 24,
    bgColor: 'bg-yellow-500/10',
    iconColor: 'text-yellow-500',
  },
  {
    id: 'sequence',
    title: 'Memory Sequence',
    tagline: 'Recall the pattern. Don\'t blink.',
    icon: Target,
    playersLive: 18,
    bgColor: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
  },
  {
    id: 'swipe',
    title: 'Directional Swipe',
    tagline: 'Fast decisions under pressure.',
    icon: Sparkles,
    playersLive: 52,
    bgColor: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
  }
];

export default function ArcadePage() {
  const [activeSession, setActiveSession] = useState<string | null>(null);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-32">
      
      <header className="mb-10 space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-white uppercase italic">Arcade</h1>
        <p className="text-sm text-neutral-400 font-medium">Quick interactions. Instant feedback. Zero waiting.</p>
      </header>

      {/* Grid of clean, minimalist cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXPERIENCES.map((exp) => (
          <motion.div
            key={exp.id}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setActiveSession(exp.id)}
            className="group relative bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-5 cursor-pointer overflow-hidden isolate"
          >
            {/* Subtle hover background highlight without glow spam */}
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.02] transition-colors -z-10" />
            
            <div className="flex justify-between items-start mb-6">
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', exp.bgColor)}>
                <exp.icon size={20} className={exp.iconColor} />
              </div>
              <div className="flex items-center gap-1.5 bg-[#121212] border border-[#262626] px-2 py-1 rounded-md">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-neutral-400">{exp.playersLive} live</span>
              </div>
            </div>

            <h3 className="text-base font-bold text-white mb-1 tracking-tight">{exp.title}</h3>
            <p className="text-sm text-neutral-500 mb-6 line-clamp-2 leading-relaxed">{exp.tagline}</p>

            <button className="w-full flex items-center justify-center gap-2 bg-[#121212] group-hover:bg-white group-hover:text-black text-white hover:border-transparent border border-[#262626] py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300">
              <Play size={14} className="fill-current" />
              Play
            </button>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {activeSession && (
          <ArcadeModal 
             id={activeSession} 
             onClose={() => setActiveSession(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ArcadeModal({ id, onClose }: { id: string, onClose: () => void }) {
  // Simple state machine for the micro-interaction placeholder
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'success'>('idle');
  const [score, setScore] = useState(0);

  const expInfo = EXPERIENCES.find(e => e.id === id) || EXPERIENCES[0];
  
  // Fake game cycle for demonstration
  const runGame = () => {
    setGameState('playing');
    setTimeout(() => {
      setScore(Math.floor(Math.random() * 500) + 100);
      setGameState('success');
    }, 1500); // Super fast 1.5s interaction
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="w-full max-w-sm bg-[#0a0a0a] border border-[#1f1f1f] rounded-3xl p-6 relative shadow-2xl flex flex-col items-center text-center"
      >
        <button 
           onClick={onClose}
           className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#121212] flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>

        <div className={clsx('w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mt-4', expInfo.bgColor)}>
           <expInfo.icon size={32} className={expInfo.iconColor} />
        </div>

        <h2 className="text-xl font-bold text-white mb-2">{expInfo.title}</h2>
        <p className="text-sm text-neutral-500 mb-8 max-w-[200px]">{expInfo.tagline}</p>

        <div className="w-full flex-1 flex flex-col justify-end min-h-[120px]">
          {gameState === 'idle' && (
            <motion.button 
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.95 }}
               onClick={runGame}
               className="w-full py-4 bg-white text-black rounded-xl font-bold uppercase tracking-widest text-sm"
            >
              Start Event
            </motion.button>
          )}

          {gameState === 'playing' && (
            <div className="flex flex-col items-center gap-4">
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                 className="w-8 h-8 rounded-full border-2 border-[#262626] border-t-white" 
               />
               <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Focus...</span>
            </div>
          )}

          {gameState === 'success' && (
             <motion.div 
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               className="w-full flex flex-col items-center gap-6"
             >
               <div className="flex flex-col items-center">
                 <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Score</span>
                 <motion.h3 
                   initial={{ y: 10 }}
                   animate={{ y: 0 }}
                   className="text-4xl font-black text-white italic"
                 >
                   {score}
                 </motion.h3>
               </div>
               
               <div className="flex gap-3 w-full">
                 <button 
                    onClick={runGame}
                    className="flex-1 py-3 bg-[#121212] border border-[#262626] text-white hover:bg-[#1a1a1a] rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-colors"
                 >
                   <RefreshCw size={14} /> Retry
                 </button>
                 <button 
                    onClick={onClose}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-colors"
                 >
                   <Share2 size={14} /> Share
                 </button>
               </div>
             </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
