'use client';

import { Play, Trophy, Gamepad2, Sparkles, Target, Zap, Activity, ShieldCheck, Flame, Globe, Radio, Signal, Search, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import KineticIcon from '@/components/ui/KineticIcon';
import clsx from 'clsx';

const GAMES = [
  { id: '2048', name: 'Quantum 2048', players: '4.2K', rating: 4.8, type: 'Puzzle', icon: ShieldCheck },
  { id: 'chess', name: 'Neural Chess', players: '1.5-K', rating: 4.9, type: 'Strategy', icon: Globe },
  { id: 'space', name: 'Void Runner', players: '12K', rating: 4.5, type: 'Arcade', icon: Zap }
];

export default function FunzonePage() {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-20 animate-fade-in text-on-surface p-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
        <div className="space-y-4">
          <h1 className="text-6xl font-black italic tracking-tighter text-white uppercase leading-none mb-1">The <br/><span className="gradient-text">Arcade</span></h1>
          <div className="flex items-center gap-4">
             <KineticIcon icon={Activity} size={14} color="var(--v-cyan)" pulse active />
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60">Humanized Gaming Hub (v1.0)</p>
          </div>
        </div>
        <div className="flex gap-4">
           <div className="glass-card px-8 py-4 flex items-center gap-5 border-none bg-surface-lowest/40 rounded-[32px] shadow-2xl group cursor-pointer hover:bg-white/[0.03] transition-all">
              <KineticIcon icon={Trophy} size={22} color="#FBBF24" pulse active glow />
              <div className="flex flex-col">
                 <span className="text-[9px] text-v-cyan font-black uppercase tracking-widest">Top Sequence</span>
                 <span className="text-xl font-black italic tracking-tighter text-white">128,400</span>
              </div>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-1 overflow-hidden relative group aspect-video rounded-[50px] shadow-[0_40px_80px_rgba(0,0,0,0.6)]">
               <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
               <img 
                 src="https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=2070" 
                 alt="Arcade" 
                 className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-60"
               />
               <div className="absolute bottom-12 left-12 z-20 space-y-6">
                  <div className="flex items-center gap-4 px-6 py-2 bg-v-cyan/10 backdrop-blur-3xl rounded-full border border-v-cyan/20 w-fit">
                     <KineticIcon icon={Sparkles} size={14} color="var(--v-cyan)" active pulse />
                     <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white">New Game Added</span>
                  </div>
                  <h2 className="text-6xl font-black italic tracking-tighter leading-none text-white uppercase">VOID RUNNER</h2>
                  <p className="text-sm text-on-surface-variant max-w-sm font-black italic leading-relaxed uppercase tracking-tight opacity-80">Master the neural drift in high-speed orbital flight. Calibrate your sensory nodes for peak signal synchronization.</p>
                  <button className="flex items-center gap-4 px-12 py-5 bg-white text-black rounded-[24px] font-black text-[12px] uppercase tracking-[0.1em] hover:bg-v-cyan transform active:scale-95 transition-all shadow-[0_15px_30px_rgba(108,99,255,0.4)] group italic">
                     Start Playing <KineticIcon icon={Play} size={18} color="black" active pulse />
                  </button>
               </div>
               {/* Pulsing Scan Line */}
               <motion.div 
                    animate={{ top: ['0%', '100%', '0%'] }} 
                    transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                    className="absolute left-0 right-0 h-[2px] bg-v-cyan/20 blur-md z-10 pointer-events-none"
               />
            </div>
            <div className="grid grid-cols-2 gap-6">
               <div className="glass-card p-8 border-none bg-surface-lowest/40 rounded-[40px] shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-v-violet opacity-30" />
                  <div className="flex items-center gap-4 mb-4">
                     <KineticIcon icon={Target} size={18} color="var(--v-violet)" pulse />
                     <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-black tracking-[0.3em] text-v-violet">Daily Sequence</span>
                        <span className="text-[7px] font-black opacity-30 uppercase tracking-[0.2em] leading-none">Matrix Goal</span>
                     </div>
                  </div>
                 <h3 className="text-lg font-bold">2,000 Nodes in 2048</h3>
                 <p className="text-[12px] text-on-surface-variant mt-1 mb-4">Complete to earn 500 XP Signal.</p>
                 <div className="w-full h-1 bg-surface-high rounded-full overflow-hidden">
                    <div className="h-full bg-v-violet w-[60%]" />
                 </div>
              </div>
               <div className="glass-card p-8 border-none bg-surface-lowest/40 rounded-[40px] shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-v-cyan opacity-30" />
                  <div className="flex items-center gap-4 mb-4">
                     <KineticIcon icon={Zap} size={18} color="var(--v-cyan)" active pulse glow />
                     <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-black tracking-[0.3em] text-v-cyan">Network Boost</span>
                        <span className="text-[7px] font-black opacity-30 uppercase tracking-[0.2em] leading-none">Global Window</span>
                     </div>
                  </div>
                  <h3 className="text-xl font-black italic tracking-tighter uppercase text-white truncate">2X Reward Field</h3>
                  <p className="text-[11px] text-on-surface-variant opacity-60 font-black italic uppercase tracking-tight mt-1 mb-4 leading-relaxed">Active Signal: 02:45:12</p>
                  <button className="text-[10px] font-black uppercase text-v-cyan tracking-[0.4em] hover:text-white transition-colors">Claim_Resonance</button>
               </div>
           </div>
        </div>

         <div className="space-y-8">
            <div className="flex items-center gap-4 px-4">
                <KineticIcon icon={Gamepad2} size={20} color="var(--v-violet)" active pulse />
                <div className="flex flex-col">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-white italic leading-none">Simulation_Library</h3>
                    <span className="text-[8px] font-black tracking-[0.2em] text-on-surface-variant opacity-40 uppercase mt-1">Neural Protocols</span>
                </div>
            </div>
            
            <div className="space-y-4">
               {GAMES.map((g, i) => (
                  <motion.div 
                    key={g.id} 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-5 group cursor-pointer p-5 rounded-[32px] bg-surface-lowest/40 border border-white/5 hover:border-v-cyan/20 transition-all shadow-2xl relative overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-primary-gradient opacity-0 group-hover:opacity-5 transition-opacity -z-0" />
                     <div className="w-16 h-16 rounded-[22px] bg-surface-high flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform">
                        <KineticIcon icon={g.icon || Gamepad2} size={28} color="var(--v-violet)" active />
                     </div>
                     <div className="flex-1 relative z-10">
                        <h4 className="text-lg font-black italic tracking-tighter uppercase text-white group-hover:text-v-cyan transition-colors">{g.name}</h4>
                        <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mt-1 italic">{g.players} Simulators · Protocol {g.type}</p>
                     </div>
                     <button className="p-4 rounded-2xl bg-surface-high/50 group-hover:bg-white group-hover:text-black transition-all relative z-10">
                        <KineticIcon icon={Play} size={16} color="currentColor" active />
                     </button>
                  </motion.div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}
