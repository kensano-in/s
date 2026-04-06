'use client';

import { TrendingUp, Users, UserPlus, UserCheck, Loader2, Zap, Radio, Activity, Cpu, ShieldCheck, Globe, Hash, Hexagon, Database, Fingerprint } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface RealUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  follower_count: number;
  security_score?: number;
}

export default function RightPanel() {
  const { following, toggleFollow, currentUser } = useAppStore();
  const [suggestedUsers, setSuggestedUsers] = useState<RealUser[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function loadSuggestions() {
      if (!currentUser?.id) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url, is_verified, follower_count, security_score')
          .neq('id', currentUser.id)
          .order('follower_count', { ascending: false })
          .limit(5);

        if (error) throw error;
        setSuggestedUsers((data || []) as RealUser[]);
      } catch (err) {
        setSuggestedUsers([]);
      } finally {
        setLoading(false);
      }
    }
    loadSuggestions();
  }, [currentUser?.id, supabase]);

  return (
    <aside className="hidden lg:flex flex-col w-[340px] flex-shrink-0 border-l border-white/5 overflow-y-auto py-8 px-6 gap-8 hide-scrollbar italic italic"
      style={{ background: 'rgba(5,5,10,0.2)', backdropFilter: 'blur(40px)' }}
    >
      {/* Search HUD Mini (Mobile/Tablet replacement) */}
      <div className="md:hidden">
          {/* Internal search would go here, but this is aside for desktop */}
      </div>

      {/* NODES RECON (Who to Follow) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
                <Users size={16} className="text-v-cyan" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Nodes_To_Enlist</h3>
            </div>
            <Link href="/explore" className="text-[9px] font-black uppercase tracking-widest text-v-cyan/40 hover:text-v-cyan transition-colors">Global_Index</Link>
        </div>

        <div className="glass-card p-6 bg-surface-lowest/20 border-none rounded-[40px] shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary-gradient opacity-0 group-hover:opacity-5 transition-opacity" />
            
            {loading ? (
                <div className="flex flex-col items-center justify-center py-10 opacity-40">
                    <Loader2 size={24} className="animate-spin mb-3 text-v-cyan" />
                    <span className="text-[9px] font-black tracking-widest uppercase">Scanning_Network...</span>
                </div>
            ) : suggestedUsers.length === 0 ? (
                <div className="py-10 text-center opacity-30 italic">
                    <Database size={24} className="mx-auto mb-4" />
                    <p className="text-[9px] font-black uppercase tracking-widest leading-none">Vacuum Detected</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {suggestedUsers.map((u) => {
                        const isFollowing = following.includes(u.id);
                        const isPrime = (u.security_score || 0) >= 80;
                        return (
                            <div key={u.id} className="flex items-center justify-between gap-4 group/node">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="relative">
                                        <div className="p-0.5 rounded-[12px] bg-white/5 border border-white/10 group-hover/node:border-v-cyan/50 transition-all duration-500 overflow-hidden">
                                            <img 
                                                src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} 
                                                className="w-9 h-9 rounded-[10px] object-cover" 
                                                alt="avatar" 
                                            />
                                        </div>
                                        {isPrime && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-black border border-v-cyan/20 rounded-full flex items-center justify-center text-v-cyan"><Zap size={8} /></div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[11px] font-black text-white uppercase italic leading-none mb-1 group-hover/node:text-v-cyan transition-colors truncate">{u.display_name}</h4>
                                        <div className="flex items-center gap-1.5 opacity-40">
                                            <span className="text-[8px] font-black uppercase tracking-widest truncate">@{u.username}</span>
                                            {u.is_verified && <ShieldCheck size={8} className="text-v-cyan" />}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => toggleFollow(u.id)}
                                    className={clsx(
                                        'px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-500',
                                        isFollowing ? 'bg-white/5 text-white/40 border border-white/5' : 'bg-primary-gradient text-white shadow-xl hover:scale-110 active:scale-95'
                                    )}
                                >
                                    {isFollowing ? 'ENLISTED' : 'ENLIST'}
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
      </section>

      {/* WAVE_ACTIVITY (Trending) */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2">
            <Radio size={16} className="text-v-violet" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Wave_Activity</h3>
        </div>
        <div className="glass-card p-6 bg-surface-lowest/20 border-none rounded-[40px] shadow-2xl space-y-4">
             <TrendItem tag="DECENTRALIZED_IDENTITY" hits="24.5K" />
             <TrendItem tag="VERLYN_PRIME" hits="18.2K" color="text-v-cyan" />
             <TrendItem tag="SIGNAL_E2EE" hits="12.9K" />
             <TrendItem tag="NODE_MATRIX" hits="9.4K" />
             <TrendItem tag="KINETIC_UI" hits="5.1K" />
        </div>
      </section>

      {/* SYSTEM LOG FOOTER */}
      <div className="mt-auto pt-8">
           <div className="glass-card p-8 bg-surface-lowest/10 border-none rounded-[50px] relative overflow-hidden group">
                <div className="absolute inset-0 bg-v-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 space-y-6">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-v-emerald animate-pulse shadow-[0_0_10px_var(--v-emerald)]" />
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-v-emerald">System_Operational</span>
                         </div>
                         <Cpu size={14} className="opacity-20 translate-y-[-1px]" />
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center opacity-40">
                            <span className="text-[8px] font-black uppercase tracking-widest">Build_Kernel</span>
                            <span className="text-[10px] font-mono tracking-tighter text-white">V0.2.4-NODE_SIGMA</span>
                        </div>
                        <div className="flex justify-between items-center opacity-40">
                            <span className="text-[8px] font-black uppercase tracking-widest">Protocol</span>
                            <span className="text-[10px] font-mono tracking-tighter text-white">SIG_E2EE_ACTIVE</span>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                                 <Fingerprint size={14} className="opacity-30" />
                              </div>
                              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30 italic">© 2026 VERLYN_CORP</span>
                         </div>
                         <Link href="/settings" className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 hover:text-v-cyan transition-colors">
                              <Zap size={14} />
                         </Link>
                    </div>
                </div>
           </div>
      </div>
    </aside>
  );
}

function TrendItem({ tag, hits, color }: any) {
    return (
        <div className="group cursor-pointer">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <Hash size={10} className="text-v-violet opacity-40" />
                    <span className={clsx('text-[10px] font-black uppercase tracking-tighter italic group-hover:text-white transition-colors', color || 'text-on-surface-variant')}>
                        {tag}
                    </span>
                </div>
                <Activity size={10} className="text-v-cyan opacity-0 group-hover:opacity-100 transition-all scale-0 group-hover:scale-100" />
            </div>
            <p className="text-[8px] font-black uppercase tracking-widest opacity-20 ml-5">{hits} SHOCKWAVES</p>
        </div>
    )
}
