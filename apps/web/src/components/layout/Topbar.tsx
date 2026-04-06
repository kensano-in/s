'use client';

import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Search, Bell, MessageCircle, Menu, X, Radio, Activity, Cpu, Zap, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export default function Topbar() {
  const { unreadNotifCount, setNotifPanelOpen, setMobileDrawerOpen, currentUser } = useAppStore();
  const [searchVal, setSearchVal] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      router.push(`/explore?q=${encodeURIComponent(searchVal.trim())}`);
      setSearchVal('');
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setSearchVal('');
      inputRef.current?.blur();
    }
  };

  const handleSearchClick = () => {
    if (searchVal.trim()) {
      router.push(`/explore?q=${encodeURIComponent(searchVal.trim())}`);
      setSearchVal('');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 transition-all duration-500 italic"
      style={{ background: 'rgba(5,5,10,0.8)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' }}>
      {/* Dynamic Sync Beam */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-v-cyan to-transparent opacity-30 animate-pulse" />

      <div className="flex h-16 items-center px-6 md:px-10 justify-between max-w-[1600px] mx-auto w-full gap-8">

        {/* ── Sovereign Logo ── */}
        <Link href="/feed" className="flex items-center gap-4 group">
            <div className="relative">
                <div className="w-10 h-10 rounded-[14px] bg-black border border-white/10 flex items-center justify-center text-white font-black text-xl shadow-2xl group-hover:border-v-cyan/50 transition-all duration-500 overflow-hidden">
                    <span className="relative z-10 group-hover:scale-125 transition-transform">V</span>
                    <div className="absolute inset-0 bg-primary-gradient opacity-20 group-hover:opacity-40 transition-opacity" />
                </div>
                <div className="absolute -inset-1 border border-v-cyan/10 rounded-[16px] -z-10 group-hover:scale-110 transition-transform opacity-0 group-hover:opacity-100" />
            </div>
            <div className="hidden lg:flex flex-col leading-none">
                <span className="text-lg font-black tracking-tighter text-white uppercase group-hover:text-v-cyan transition-colors">Verlyn</span>
                <span className="text-[8px] font-black tracking-[0.4em] text-on-surface-variant opacity-40 uppercase">Intelligence Matrix</span>
            </div>
        </Link>

        {/* ── Intelligence Search Hub (HUD Style) ── */}
        <div className="flex-1 max-w-2xl mx-auto hidden md:block">
          <div className={clsx(
              "relative group transition-all duration-500 rounded-2xl p-[1px]",
              isFocused ? "bg-v-cyan/20 shadow-[0_0_40px_rgba(0,255,255,0.05)]" : "bg-white/5"
          )}>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-3">
              <Search size={14} className={clsx('transition-colors duration-500', isFocused ? 'text-v-cyan' : 'text-white/20')} />
              {isFocused && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="h-4 w-px bg-v-cyan/40" />
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              placeholder={isFocused ? "SCANNING_NODES..." : "SCAN NETWORK FOR INTELLIGENCE..."}
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={handleSearch}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full py-3 pl-12 pr-12 rounded-[14px] text-[12px] font-black tracking-widest bg-black border-none focus:ring-0 text-white placeholder:text-white/10 uppercase transition-all duration-500"
              autoComplete="off"
            />

            {/* HUD Metadata */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3 opacity-30 group-hover:opacity-100 transition-opacity">
                <AnimatePresence>
                    {searchVal ? (
                        <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} onClick={() => setSearchVal('')} className="text-white/40 hover:text-rose-500"><X size={14} /></motion.button>
                    ) : (
                        <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-v-emerald animate-pulse shadow-[0_0_8px_var(--v-emerald)]" />
                             <span className="text-[8px] font-mono tracking-widest text-v-emerald hidden lg:block">SYS_ONLINE</span>
                        </div>
                    )}
                </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── Operational Actions ── */}
        <div className="flex items-center gap-3">
          
          {/* Signal Indicator (New feature: real-time activity) */}
          <div className="hidden xl:flex items-center gap-4 px-5 py-2.5 rounded-2xl bg-white/[0.02] border border-white/5 mr-4">
               <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-v-cyan uppercase tracking-widest">Global_Sync</span>
                    <span className="text-[10px] font-mono text-white/50 tracking-tighter">0.04ms</span>
               </div>
               <Activity size={20} className="text-v-cyan animate-pulse opacity-50" />
          </div>

          <NavAction 
            id="notif-btn" 
            onClick={() => setNotifPanelOpen(true)} 
            icon={Bell} 
            badge={unreadNotifCount > 0} 
            label="Signals"
          />

          <Link href="/messages" className="hidden sm:block">
            <NavAction icon={MessageCircle} label="Signals" />
          </Link>

          {/* User Identity Kernel */}
          <Link href="/profile" className="group relative ml-2">
            <div className="p-[2.5px] rounded-[15px] bg-white/10 group-hover:bg-primary-gradient transition-all duration-500">
                <div className="rounded-[13px] overflow-hidden bg-black p-[1px]">
                    <img 
                        src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username}`} 
                        className="w-9 h-9 object-cover rounded-[12px] group-hover:scale-110 transition-transform" 
                        alt="me"
                    />
                </div>
            </div>
            {/* Identity Shield Badge */}
            {(currentUser as any)?.security_score >= 80 && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-v-cyan text-black rounded-lg flex items-center justify-center border-2 border-black shadow-lg">
                    <ShieldCheck size={10} />
                </div>
            )}
          </Link>
          
          <button onClick={() => setMobileDrawerOpen(true)} className="md:hidden w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white"><Menu size={20} /></button>
        </div>
      </div>
    </header>
  );
}

function NavAction({ icon: Icon, badge, onClick, label }: any) {
    return (
        <button onClick={onClick} className="relative w-11 h-11 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/60 hover:text-v-cyan hover:bg-white/[0.08] transition-all group">
             <Icon size={20} className="group-hover:scale-110 transition-transform" />
             {badge && <span className="absolute top-2 right-2 w-2 h-2 bg-v-cyan rounded-full shadow-[0_0_10px_var(--v-cyan)] animate-pulse" />}
        </button>
    )
}
