'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, Zap, User, Settings, Home, Radio, MessageSquare, Layout, Shield, Cpu, ChevronRight, Hash, Globe, Sparkles } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

const COMMANDS = [
  { id: 'feed', label: 'Neural Feed', icon: Home, route: '/feed', shortcut: 'G F' },
  { id: 'explore', label: 'Explore Expanse', icon: Radio, route: '/explore', shortcut: 'G E' },
  { id: 'profile', label: 'Identity Node', icon: User, route: '/profile', shortcut: 'G P' },
  { id: 'settings', label: 'Kernel Settings', icon: Settings, route: '/settings', shortcut: 'G S' },
  { id: 'messages', label: 'Signal Hub', icon: MessageSquare, route: '/messages', shortcut: 'G M' },
  { id: 'theme', label: 'Appearance Interface', icon: Layout, action: 'theme', shortcut: 'T' },
  { id: 'export', label: 'Neural Archive Export', icon: Cpu, action: 'export', shortcut: 'E' },
  { id: 'security', label: 'Security Protocols', icon: Shield, route: '/settings?tab=sovereignty', shortcut: 'S' },
];

export default function CommandPalette() {
  const { isCommandPaletteOpen, setCommandPaletteOpen } = useAppStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = COMMANDS.filter(cmd => 
    cmd.label.toLowerCase().includes(query.toLowerCase()) || 
    cmd.id.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isCommandPaletteOpen]);

  const handleSelect = (cmd: typeof COMMANDS[0]) => {
    if (cmd.route) {
        router.push(cmd.route);
    } else if (cmd.action === 'theme') {
        router.push('/settings?tab=appearance');
    } else if (cmd.action === 'export') {
        router.push('/settings?tab=terminal');
    }
    setCommandPaletteOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) handleSelect(filteredCommands[selectedIndex]);
    } else if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
    }
  };

  return (
    <AnimatePresence>
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => setCommandPaletteOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-2xl" 
          />

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl glass-card border border-white/5 bg-[#0a0a0b]/80 shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-[32px] overflow-hidden italic"
          >
            {/* Search Header */}
            <div className="p-6 border-b border-white/5 flex items-center gap-4 relative">
                <Command size={18} className="text-v-cyan opacity-50" />
                <input 
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="SCANN_MATRIX_FOR_COMMANDS..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-xl font-black uppercase tracking-tighter text-white placeholder:text-white/10 outline-none"
                />
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[9px] font-black uppercase text-on-surface-variant opacity-60">Esc to close</span>
                </div>
            </div>

            {/* Results */}
            <div className="max-h-[450px] overflow-y-auto p-3 custom-scrollbar">
                {filteredCommands.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                        <Sparkles size={40} className="mx-auto text-v-cyan opacity-10 animate-pulse" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">NO_DATA_NODES_FOUND</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                         <div className="px-4 py-2 opacity-30">
                            <span className="text-[9px] font-black uppercase tracking-widest text-v-cyan">Directives</span>
                         </div>
                         {filteredCommands.map((cmd, idx) => (
                             <button
                                key={cmd.id}
                                onClick={() => handleSelect(cmd)}
                                onMouseEnter={() => setSelectedIndex(idx)}
                                className={clsx(
                                    'w-full flex items-center justify-between gap-4 p-4 rounded-2xl transition-all duration-300 group relative overflow-hidden',
                                    selectedIndex === idx ? 'bg-v-cyan/10 translate-x-2' : 'hover:bg-white/[0.02]'
                                )}
                             >
                                {selectedIndex === idx && (
                                    <motion.div layoutId="active-bg" className="absolute left-0 top-0 bottom-0 w-1 bg-v-cyan" />
                                )}
                                <div className="flex items-center gap-4">
                                     <div className={clsx(
                                         'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                                         selectedIndex === idx ? 'bg-v-cyan text-black' : 'bg-white/5 text-on-surface-variant group-hover:text-white'
                                     )}>
                                         <cmd.icon size={18} />
                                     </div>
                                     <div className="text-left">
                                         <h4 className={clsx('text-sm font-black uppercase tracking-tighter transition-colors', selectedIndex === idx ? 'text-white' : 'text-on-surface-variant')}>{cmd.label}</h4>
                                         <p className="text-[9px] font-black uppercase tracking-widest opacity-30">{cmd.route || 'System Command'}</p>
                                     </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {cmd.shortcut && (
                                        <span className="text-[10px] font-mono opacity-20 group-hover:opacity-60 transition-opacity">{cmd.shortcut}</span>
                                    )}
                                    <ChevronRight size={14} className={clsx('transition-all', selectedIndex === idx ? 'text-v-cyan opacity-100' : 'opacity-0')} />
                                </div>
                             </button>
                         ))}
                    </div>
                )}
            </div>

            {/* Platform Footer */}
            <div className="p-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 opacity-30">
                    <Cpu size={12} />
                    <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant">SIG_CMD_KERNEL_v1.0.4</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 grayscale opacity-30">
                        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[8px] font-mono">↑↓</kbd>
                        <span className="text-[8px] font-black uppercase tracking-widest">Navigate</span>
                    </div>
                    <div className="flex items-center gap-1.5 grayscale opacity-30">
                        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[8px] font-mono">Enter</kbd>
                        <span className="text-[8px] font-black uppercase tracking-widest">Execute</span>
                    </div>
                </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
