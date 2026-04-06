'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Radio, Activity } from 'lucide-react';
import clsx from 'clsx';
import KineticIcon from './KineticIcon';

const THEMES = [
  { id: 'cyan', name: 'Cyber Matrix', color: '#00FFFF', freq: '440THz', desc: 'Neon Cyan Protocol' },
  { id: 'violet', name: 'Nebula Core', color: '#8B5CF6', freq: '620THz', desc: 'Deep Violet Nexus' },
  { id: 'emerald', name: 'Bio Digital', color: '#10B981', freq: '550THz', desc: 'Emerald Signal' },
  { id: 'rose', name: 'Sovereign Red', color: '#F43F5E', freq: '400THz', desc: 'Aura Rose Band' },
  { id: 'amber', name: 'Solar Flare', color: '#F59E0B', freq: '500THz', desc: 'Amber Wavehead' }
];

interface Props {
  activeId: string;
  onSelect: (id: string) => void;
}

export default function SpectralOrb({ activeId, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="flex flex-wrap gap-4">
        {THEMES.map((t) => {
          const active = activeId === t.id;
          return (
            <motion.button
              key={t.id}
              onClick={() => onSelect(t.id)}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className={clsx(
                'relative w-20 h-20 rounded-[28px] border-2 transition-all duration-500 group overflow-hidden flex flex-col items-center justify-center gap-1',
                active ? 'border-white shadow-[0_0_40px_rgba(255,255,255,0.2)] scale-110' : 'border-white/5 opacity-40 hover:opacity-100'
              )}
              style={{ backgroundColor: `${t.color}15` }}
            >
              {/* Background Glow */}
              <div 
                className={clsx('absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity', active && 'opacity-30')} 
                style={{ backgroundColor: t.color }} 
              />
              
              <KineticIcon 
                icon={active ? Sparkles : Radio} 
                size={20} 
                color={t.color} 
                pulse={active}
                glow={active}
              />
              
              <span className="text-[7px] font-black uppercase tracking-widest text-white/60 group-hover:text-white transition-colors">{t.freq}</span>
              
              {active && (
                <motion.div 
                    layoutId="active-spectral" 
                    className="absolute inset-0 border-2 border-white rounded-[28px]"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Selected Theme Details (Human Humanization) */}
      <AnimatePresence mode="wait">
        {activeId && (
          <motion.div 
            key={activeId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-5 rounded-[32px] bg-white/[0.03] border border-white/5 flex items-center gap-5"
          >
             <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-black shadow-2xl"
                style={{ backgroundColor: THEMES.find(t => t.id === activeId)?.color }}
             >
                <Activity size={24} />
             </div>
             <div>
                <h4 className="text-sm font-black uppercase tracking-tighter text-white italic leading-none mb-1">
                    {THEMES.find(t => t.id === activeId)?.name}
                </h4>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-40">
                    {THEMES.find(t => t.id === activeId)?.desc} (Visual Override)
                </p>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
