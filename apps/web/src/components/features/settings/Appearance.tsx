'use client';

import { useAppStore } from '@/lib/store';
import { Palette, Moon, Sun, Monitor, Pipette, Zap, Layers, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const ACCENT_COLORS = [
  { id: 'v-violet', color: '#6C63FF', name: 'Ultraviolet' },
  { id: 'v-cyan', color: '#00D1FF', name: 'Cyanide' },
  { id: 'v-pink', color: '#FF00A8', name: 'Cyberpink' },
  { id: 'v-emerald', color: '#10B981', name: 'Matrix' },
  { id: 'v-orange', color: '#F97316', name: 'Solaris' },
];

const THEME_MODES = [
  { id: 'midnight', icon: Moon, name: 'Deep Space', desc: 'True absolute black' },
  { id: 'corporate', icon: Layers, name: 'Glass Matrix', desc: 'Professional blue-steel' },
  { id: 'light', icon: Sun, name: 'Nova Light', desc: 'Clean, clinical white' },
  { id: 'oled', icon: Monitor, name: 'Void OLED', desc: 'Zero-power blacks' },
];

export default function Appearance() {
  const { theme, setTheme } = useAppStore();
  const [accentId, setAccentId] = useState('v-violet');

  const handleAccent = (id: string, color: string) => {
    setAccentId(id);
    document.documentElement.style.setProperty('--v-accent', color);
    document.documentElement.style.setProperty('--v-accent-glow', `${color}66`);
  };

  return (
    <div className="space-y-12 max-w-3xl animate-fade-in">
      <section>
        <div className="flex items-center justify-between mb-8 px-1">
          <div className="flex items-center gap-3">
             <Palette size={18} className="text-v-violet" />
             <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Visual Kernels</h2>
          </div>
          <div className="px-3 py-1 bg-v-violet/10 border border-v-violet/20 rounded-full text-[10px] font-black uppercase tracking-widest text-v-violet animate-pulse shadow-[0_0_10px_rgba(108,99,255,0.2)]">
             Live Rendering active
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {THEME_MODES.map((t) => {
            const Icon = t.icon;
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as any)}
                className={`relative group flex items-start gap-4 p-5 rounded-3xl border-2 transition-all text-left overflow-hidden ${
                  active 
                    ? 'border-v-accent bg-v-accent/5 shadow-[0_0_32px_var(--v-accent-glow)]' 
                    : 'border-white/5 bg-surface-lowest/30 hover:border-white/10 hover:bg-surface-lowest/50'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-500 group-hover:scale-110 ${
                  active ? 'bg-v-accent text-white' : 'bg-surface-high/50 text-on-surface-variant opacity-60'
                }`}>
                   <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-black uppercase tracking-tight mb-1 ${active ? 'text-white' : 'text-on-surface-variant'}`}>{t.name}</h4>
                  <p className="text-[11px] font-medium text-on-surface-variant opacity-40">{t.desc}</p>
                </div>
                {active && (
                   <motion.div 
                    layoutId="active-theme" 
                    className="absolute right-4 top-4 text-v-accent"
                   >
                     <Check size={18} strokeWidth={4} />
                   </motion.div>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-8 px-1">
          <Pipette size={18} className="text-v-cyan" />
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Accent Matrix</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
           {ACCENT_COLORS.map((a) => {
             const active = accentId === a.id;
             return (
               <button 
                 key={a.id}
                 onClick={() => handleAccent(a.id, a.color)}
                 className={`group flex flex-col items-center gap-3 p-4 rounded-3xl transition-all ${
                   active ? 'bg-white/5 shadow-xl' : 'hover:bg-white/[0.03]'
                 }`}
               >
                 <div 
                   className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg relative group-hover:scale-110"
                   style={{ backgroundColor: a.color, boxShadow: `0 8px 16px ${a.color}44` }}
                 >
                   {active && <Check size={20} strokeWidth={3} className="text-white drop-shadow-md" />}
                 </div>
                 <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-white' : 'text-on-surface-variant opacity-50'}`}>
                    {a.name}
                 </span>
               </button>
             )
           })}
        </div>
      </section>

      <section>
         <div className="glass-card p-8 border-none bg-primary-gradient relative overflow-hidden group rounded-[40px]">
            <div className="absolute top-0 right-0 p-8 opacity-20 rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-transform duration-700">
               <Zap size={140} fill="white" />
            </div>
            <div className="relative z-10 max-w-sm space-y-4">
               <div className="flex items-center gap-3 px-3 py-1 bg-white/10 rounded-full border border-white/20 w-fit">
                 <Sparkles size={12} />
                 <span className="text-[10px] font-black uppercase tracking-widest">Protocol Experimental</span>
               </div>
               <h3 className="text-3xl font-black tracking-tighter text-white uppercase italic">Custom Neural Skin</h3>
               <p className="text-sm font-medium text-white/70 leading-tight">
                 Define your own hex-based reality. Advanced CSS injection for sovereign identities.
               </p>
               <button className="px-8 py-3 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl hover:bg-v-cyan transition-colors active:scale-95">
                  Launch Interface Editor
               </button>
            </div>
         </div>
      </section>
    </div>
  );
}
