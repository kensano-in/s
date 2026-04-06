'use client';

import { Play, Trophy, Gamepad2, Sparkles, Target, Zap } from 'lucide-react';
import { useState } from 'react';

const GAMES = [
  { id: '2048', name: 'Quantum 2048', players: '4.2K', rating: 4.8, type: 'Puzzle' },
  { id: 'chess', name: 'Neural Chess', players: '1.5K', rating: 4.9, type: 'Strategy' },
  { id: 'space', name: 'Void Runner', players: '12K', rating: 4.5, type: 'Arcade' }
];

export default function FunzonePage() {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-20 animate-fade-in text-on-surface p-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-display font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-v-violet via-white to-v-cyan">Verlyn Funzone</h1>
          <p className="text-on-surface-variant font-mono text-sm uppercase tracking-widest opacity-70">Neural Entertainment Module</p>
        </div>
        <div className="flex gap-4">
           <div className="glass-card px-6 py-3 flex items-center gap-3">
              <Trophy size={18} className="text-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
              <div className="flex flex-col">
                 <span className="text-[10px] text-on-surface-variant font-bold uppercase">Top Score</span>
                 <span className="text-sm font-black">128,400</span>
              </div>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           <div className="glass-card p-1 overflow-hidden relative group aspect-video rounded-[32px]">
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-v-violet/50 to-transparent" />
              <img 
                src="https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=2070" 
                alt="Arcade" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
              />
              <div className="absolute bottom-10 left-10 z-20 space-y-4">
                 <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 w-fit">
                    <Sparkles size={12} className="text-v-cyan" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">New Protocol</span>
                 </div>
                 <h2 className="text-5xl font-display font-black tracking-tighter leading-none">VOID RUNNER</h2>
                 <p className="text-lg text-white/70 max-w-md font-medium leading-tight">Master the neural drift in high-speed orbital flight.</p>
                 <button className="flex items-center gap-2 px-10 py-4 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-tighter hover:bg-v-cyan transition-colors shadow-2xl group">
                    Launch Core <Play size={18} fill="black" />
                 </button>
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-6 border-l-4 border-l-v-violet">
                 <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                    <Target size={14} />
                    <span className="text-[10px] uppercase font-bold tracking-widest">Daily Quest</span>
                 </div>
                 <h3 className="text-lg font-bold">2,000 Nodes in 2048</h3>
                 <p className="text-[12px] text-on-surface-variant mt-1 mb-4">Complete to earn 500 XP Signal.</p>
                 <div className="w-full h-1 bg-surface-high rounded-full overflow-hidden">
                    <div className="h-full bg-v-violet w-[60%]" />
                 </div>
              </div>
              <div className="glass-card p-6 border-l-4 border-l-v-cyan">
                 <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                    <Zap size={14} />
                    <span className="text-[10px] uppercase font-bold tracking-widest">Global Bonus</span>
                 </div>
                 <h3 className="text-lg font-bold">2X Reward Window</h3>
                 <p className="text-[12px] text-on-surface-variant mt-1 mb-4">Ends in 02:45:12 (PST Nodes).</p>
                 <button className="text-[10px] font-black uppercase text-v-cyan">Claim Boost</button>
              </div>
           </div>
        </div>

        <div className="space-y-6">
           <div className="glass-card p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                 <Gamepad2 size={16} /> Neural Arcade
              </h3>
              <div className="space-y-4">
                 {GAMES.map((g) => (
                    <div key={g.id} className="flex items-center gap-4 group cursor-pointer p-2 rounded-2xl hover:bg-surface-high/30 transition-all border border-transparent hover:border-white/5">
                       <div className="w-14 h-14 rounded-2xl bg-surface-lowest flex items-center justify-center text-v-violet shadow-inner">
                          <Gamepad2 size={24} />
                       </div>
                       <div className="flex-1">
                          <h4 className="text-sm font-bold group-hover:text-v-cyan transition-colors">{g.name}</h4>
                          <p className="text-[11px] text-on-surface-variant font-medium">{g.players} Players · ★{g.rating}</p>
                       </div>
                       <button className="p-2 rounded-xl bg-surface-high/50 group-hover:bg-v-cyan group-hover:text-black transition-all">
                          <Play size={14} fill="currentColor" />
                       </button>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
