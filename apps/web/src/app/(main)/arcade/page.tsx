'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Sparkles, Target, Zap, Check, Share2, X, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

// Type for our mini-experiences
type ArcadeExperience = {
  id: string;
  title: string;
  tagline: string;
  icon: any;
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

            <button type="button" className="w-full flex items-center justify-center gap-2 bg-[#121212] group-hover:bg-white group-hover:text-black text-white hover:border-transparent border border-[#262626] py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300">
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

function ArcadeModal({ id, onClose }: { id: string; onClose: () => void }) {
  const expInfo = EXPERIENCES.find((e) => e.id === id) || EXPERIENCES[0];

  // Game-specific state machines
  const [gameActive, setGameActive] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  // --- REACTION PULSE STATES ---
  const [reactionStatus, setReactionStatus] = useState<'idle' | 'waiting' | 'go' | 'result' | 'early'>('idle');
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionStartRef = useRef<number>(0);

  // --- MEMORY SEQUENCE STATES ---
  const [memorySequence, setMemorySequence] = useState<number[]>([]);
  const [memoryUserIndex, setMemoryUserIndex] = useState(0);
  const [activeMemoryPad, setActiveMemoryPad] = useState<number | null>(null);
  const [memoryStatus, setMemoryStatus] = useState<'idle' | 'watching' | 'playing' | 'gameover'>('idle');

  // --- DIRECTIONAL SWIPE STATES ---
  const [swipeTarget, setSwipeTarget] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('UP');
  const [swipeTimeLeft, setSwipeTimeLeft] = useState(100);
  const [swipeScore, setSwipeScore] = useState(0);
  const [swipeStatus, setSwipeStatus] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const swipeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
      if (swipeIntervalRef.current) clearInterval(swipeIntervalRef.current);
    };
  }, []);

  // ==========================================
  // Game 1: Reaction Pulse Logic
  // ==========================================
  const startReactionGame = () => {
    setReactionStatus('waiting');
    setGameActive(true);
    const delay = Math.floor(Math.random() * 2500) + 1500; // 1.5s - 4s random delay
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    reactionTimerRef.current = setTimeout(() => {
      setReactionStatus('go');
      reactionStartRef.current = performance.now();
    }, delay);
  };

  const handleReactionClick = () => {
    if (reactionStatus === 'waiting') {
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
      setReactionStatus('early');
    } else if (reactionStatus === 'go') {
      const diff = Math.round(performance.now() - reactionStartRef.current);
      setScore(diff);
      setReactionStatus('result');
    }
  };

  // ==========================================
  // Game 2: Memory Sequence (Simon Says)
  // ==========================================
  const startMemoryGame = () => {
    setGameActive(true);
    const newSeq = [Math.floor(Math.random() * 4)];
    setMemorySequence(newSeq);
    playMemorySequence(newSeq);
  };

  const playMemorySequence = (seq: number[]) => {
    setMemoryStatus('watching');
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < seq.length) {
        setActiveMemoryPad(seq[idx]);
        setTimeout(() => setActiveMemoryPad(null), 300);
        idx++;
      } else {
        clearInterval(interval);
        setMemoryStatus('playing');
        setMemoryUserIndex(0);
      }
    }, 550);
  };

  const handleMemoryPadClick = (padIdx: number) => {
    if (memoryStatus !== 'playing') return;
    setActiveMemoryPad(padIdx);
    setTimeout(() => setActiveMemoryPad(null), 150);

    if (padIdx === memorySequence[memoryUserIndex]) {
      const nextIndex = memoryUserIndex + 1;
      if (nextIndex === memorySequence.length) {
        // Success for the current round
        setMemoryStatus('watching');
        setTimeout(() => {
          const updatedSeq = [...memorySequence, Math.floor(Math.random() * 4)];
          setMemorySequence(updatedSeq);
          playMemorySequence(updatedSeq);
        }, 800);
      } else {
        setMemoryUserIndex(nextIndex);
      }
    } else {
      // Game over
      setScore(memorySequence.length - 1);
      setMemoryStatus('gameover');
    }
  };

  // ==========================================
  // Game 3: Directional Swipe Logic
  // ==========================================
  const startSwipeGame = () => {
    setGameActive(true);
    setSwipeScore(0);
    setSwipeStatus('playing');
    nextSwipeRound(0);
  };

  const nextSwipeRound = (currentScore: number) => {
    const directions: ('UP' | 'DOWN' | 'LEFT' | 'RIGHT')[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    const nextDir = directions[Math.floor(Math.random() * directions.length)];
    setSwipeTarget(nextDir);
    setSwipeTimeLeft(100);

    if (swipeIntervalRef.current) clearInterval(swipeIntervalRef.current);
    
    // Speed increases as score goes up
    const timeStep = Math.max(10, 30 - currentScore * 0.8);
    swipeIntervalRef.current = setInterval(() => {
      setSwipeTimeLeft((prev) => {
        if (prev <= 1) {
          if (swipeIntervalRef.current) clearInterval(swipeIntervalRef.current);
          setScore(currentScore);
          setSwipeStatus('gameover');
          return 0;
        }
        return prev - 2;
      });
    }, timeStep);
  };

  const handleSwipeAction = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (swipeStatus !== 'playing') return;

    if (dir === swipeTarget) {
      const nextScore = swipeScore + 1;
      setSwipeScore(nextScore);
      nextSwipeRound(nextScore);
    } else {
      if (swipeIntervalRef.current) clearInterval(swipeIntervalRef.current);
      setScore(swipeScore);
      setSwipeStatus('gameover');
    }
  };

  // Setup arrow keys for the swipe game
  useEffect(() => {
    if (id !== 'swipe' || swipeStatus !== 'playing') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') handleSwipeAction('UP');
      if (e.key === 'ArrowDown') handleSwipeAction('DOWN');
      if (e.key === 'ArrowLeft') handleSwipeAction('LEFT');
      if (e.key === 'ArrowRight') handleSwipeAction('RIGHT');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [id, swipeStatus, swipeTarget, swipeScore]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="w-full max-w-sm bg-[#0a0a0a] border border-[#1f1f1f] rounded-3xl p-6 relative shadow-2xl flex flex-col items-center select-none"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#121212] flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>

        <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mt-2', expInfo.bgColor)}>
          <expInfo.icon size={26} className={expInfo.iconColor} />
        </div>

        <h2 className="text-lg font-bold text-white tracking-tight">{expInfo.title}</h2>
        <p className="text-xs text-neutral-500 mb-6">{expInfo.tagline}</p>

        {/* ==================== REACTION GAME DISPLAY ==================== */}
        {id === 'reaction' && (
          <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[220px]">
            {!gameActive ? (
              <button
                type="button"
                onClick={startReactionGame}
                className="w-full py-4 bg-white text-black rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-neutral-100 transition-colors"
              >
                Start Test
              </button>
            ) : (
              <div className="w-full h-full flex-1 flex flex-col justify-between">
                <div
                  onClick={handleReactionClick}
                  className={clsx(
                    "w-full h-32 rounded-2xl flex flex-col items-center justify-center border transition-all cursor-pointer select-none duration-150 active:scale-[0.98]",
                    reactionStatus === 'waiting' && "bg-red-500/10 border-red-500/30 text-red-500",
                    reactionStatus === 'go' && "bg-cyan-500/20 border-cyan-400 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.15)]",
                    reactionStatus === 'early' && "bg-orange-500/10 border-orange-500/30 text-orange-500",
                    reactionStatus === 'result' && "bg-[#121212] border-[#222] text-white"
                  )}
                >
                  {reactionStatus === 'waiting' && (
                    <>
                      <span className="text-sm font-black uppercase tracking-widest animate-pulse">Wait for green...</span>
                      <span className="text-[10px] opacity-40 mt-1">Don&apos;t tap yet!</span>
                    </>
                  )}
                  {reactionStatus === 'go' && (
                    <span className="text-xl font-black uppercase tracking-widest scale-110">TAP NOW!</span>
                  )}
                  {reactionStatus === 'early' && (
                    <>
                      <span className="text-sm font-black uppercase tracking-widest">TOO EARLY!</span>
                      <span className="text-[10px] opacity-60 mt-1">Tap to reset and try again.</span>
                    </>
                  )}
                  {reactionStatus === 'result' && (
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Reaction Time</span>
                      <span className="text-3xl font-black italic text-cyan-400 mt-1">{score}ms</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 w-full mt-4">
                  {(reactionStatus === 'result' || reactionStatus === 'early') && (
                    <button
                      type="button"
                      onClick={startReactionGame}
                      className="flex-1 py-3 bg-[#121212] border border-[#222] text-white hover:bg-neutral-900 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <RefreshCw size={12} /> Retry
                    </button>
                  )}
                  {reactionStatus === 'result' && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Share2 size={12} /> Complete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== MEMORY GAME DISPLAY ==================== */}
        {id === 'sequence' && (
          <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[220px]">
            {!gameActive ? (
              <button
                type="button"
                onClick={startMemoryGame}
                className="w-full py-4 bg-white text-black rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-neutral-100 transition-colors"
              >
                Start Challenge
              </button>
            ) : (
              <div className="w-full flex flex-col items-center">
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-4">
                  {memoryStatus === 'watching' ? (
                    <span className="text-blue-400 animate-pulse font-black">Watch closely...</span>
                  ) : memoryStatus === 'playing' ? (
                    <span className="text-green-400 font-black">Your turn! ({memoryUserIndex + 1}/{memorySequence.length})</span>
                  ) : (
                    <span className="text-red-500 font-black">Game Over! Score: {score}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 w-44 h-44 mb-5">
                  {[0, 1, 2, 3].map((padIdx) => {
                    const padStyles = [
                      "bg-red-500/10 border-red-500/20 active:bg-red-500/40 text-red-500",
                      "bg-blue-500/10 border-blue-500/20 active:bg-blue-500/40 text-blue-500",
                      "bg-yellow-500/10 border-yellow-500/20 active:bg-yellow-500/40 text-yellow-500",
                      "bg-green-500/10 border-green-500/20 active:bg-green-500/40 text-green-500",
                    ];
                    const padActiveStyles = [
                      "bg-red-500 border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)]",
                      "bg-blue-500 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]",
                      "bg-yellow-500 border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)]",
                      "bg-green-500 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.5)]",
                    ];
                    return (
                      <button
                        type="button"
                        key={padIdx}
                        disabled={memoryStatus !== 'playing'}
                        onClick={() => handleMemoryPadClick(padIdx)}
                        className={clsx(
                          "rounded-2xl border transition-all aspect-square duration-100 flex items-center justify-center",
                          activeMemoryPad === padIdx ? padActiveStyles[padIdx] : padStyles[padIdx]
                        )}
                      />
                    );
                  })}
                </div>

                {memoryStatus === 'gameover' && (
                  <div className="flex gap-2 w-full">
                    <button
                      type="button"
                      onClick={startMemoryGame}
                      className="flex-1 py-3 bg-[#121212] border border-[#222] text-white hover:bg-neutral-900 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <RefreshCw size={12} /> Try Again
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Check size={12} /> Share
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== SWIPE GAME DISPLAY ==================== */}
        {id === 'swipe' && (
          <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[220px]">
            {!gameActive ? (
              <button
                type="button"
                onClick={startSwipeGame}
                className="w-full py-4 bg-white text-black rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-neutral-100 transition-colors"
              >
                Start Swipe
              </button>
            ) : (
              <div className="w-full flex flex-col items-center">
                {swipeStatus === 'playing' ? (
                  <div className="w-full flex flex-col items-center">
                    <div className="flex justify-between w-full px-1 text-[10px] font-bold text-neutral-400 mb-2">
                      <span>SCORE: {swipeScore}</span>
                      <span className="text-purple-400">RAPID PRESS!</span>
                    </div>

                    {/* Progress timer bar */}
                    <div className="w-full h-1 bg-neutral-900 rounded-full overflow-hidden mb-6">
                      <div 
                        className="h-full bg-purple-500 transition-all duration-75"
                        style={{ width: `${swipeTimeLeft}%` }}
                      />
                    </div>

                    {/* Target arrow display */}
                    <div className="w-32 h-20 bg-[#121212] border border-[#222] rounded-2xl flex items-center justify-center text-3xl font-black text-white italic mb-6 animate-pulse">
                      {swipeTarget}
                    </div>

                    {/* D-Pad Buttons for Touch / Mouse Click */}
                    <div className="grid grid-cols-3 gap-2 w-48 mb-2">
                      <div />
                      <button
                        type="button"
                        onClick={() => handleSwipeAction('UP')}
                        className="w-12 h-12 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold border border-[#222] active:scale-90 transition-transform"
                      >
                        ▲
                      </button>
                      <div />
                      <button
                        type="button"
                        onClick={() => handleSwipeAction('LEFT')}
                        className="w-12 h-12 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold border border-[#222] active:scale-90 transition-transform"
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwipeAction('DOWN')}
                        className="w-12 h-12 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold border border-[#222] active:scale-90 transition-transform"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwipeAction('RIGHT')}
                        className="w-12 h-12 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold border border-[#222] active:scale-90 transition-transform"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Final Score</span>
                    <h3 className="text-4xl font-black text-white italic mb-6">{score}</h3>

                    <div className="flex gap-2 w-full">
                      <button
                        type="button"
                        onClick={startSwipeGame}
                        className="flex-1 py-3 bg-[#121212] border border-[#222] text-white hover:bg-neutral-900 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <RefreshCw size={12} /> Retry
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Check size={12} /> Share
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
