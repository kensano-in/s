'use client';

import { Search, TrendingUp, Compass, Hash, Sparkles, Activity, Radio, Globe, Zap, Loader2, Signal, Eye, MessageCircle } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getTrendingWaves, getDiscoverySignals } from './actions';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import Link from 'next/link';
import PostCard from '@/components/features/feed/PostCard';
import KineticIcon from '@/components/ui/KineticIcon';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const CATEGORIES = [
  { id: 'trending', label: 'Trending', sub: 'Waves', icon: TrendingUp },
  { id: 'broadcast', label: 'Broadcasts', sub: 'Live', icon: Radio },
  { id: 'nodes', label: 'Top Nodes', sub: 'Verified', icon: Globe },
  { id: 'matrix', label: 'Network Matrix', sub: 'Grid', icon: Signal }
];

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState('trending');
  const [waves, setWaves] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const loadExploreData = useCallback(async () => {
    setLoading(true);
    const wavesData = await getTrendingWaves();
    if (Array.isArray(wavesData)) setWaves(wavesData);
    
    const signalsRes = await getDiscoverySignals();
    if (signalsRes.success) {
        setSignals((signalsRes.signals || []).map((m: any) => ({
            ...m,
            mediaUrls: m.media_urls || [],
            author: {
               id: m.author?.id,
               username: m.author?.username,
               displayName: m.author?.display_name,
               avatar: m.author?.avatar_url,
               security_score: m.author?.security_score
            }
        })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadExploreData();
  }, [loadExploreData]);

  // --- SEARCH: Debounced user + tag search ---
  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const { data } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${searchQuery.trim()}%,display_name.ilike.%${searchQuery.trim()}%`)
        .limit(6);
      setSearchResults(data || []);
      setIsSearching(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, supabase]);

  return (
    <div className="space-y-12 max-w-[1200px] mx-auto pb-40 animate-fade-in text-on-surface font-sans italic italic">
      
      {/* Sovereign Radar HUD */}
      <div className="glass-card p-12 bg-surface-lowest/40 border-none rounded-[60px] shadow-[0_0_100px_rgba(0,255,255,0.05)] relative overflow-hidden group">
         <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(var(--white) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
         <div className="absolute -inset-20 bg-v-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity blur-[100px] -z-10" />
         
         <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1 w-full space-y-4">
                <div className="flex items-center gap-3 opacity-40 mb-2">
                    <Activity size={14} className="text-v-cyan animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Network_Recon_Active</span>
                </div>
                <h1 className="text-5xl sm:text-7xl font-black italic tracking-tighter text-white uppercase leading-none mb-6">Discover <br/><span className="text-v-cyan">The Collective</span></h1>
                 <div className="relative group/search max-w-xl">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                        <KineticIcon icon={Search} size={22} color="var(--v-cyan)" active pulse />
                    </div>
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search people, tags, or signals..." 
                      className="w-full bg-black/40 border-2 border-white/5 rounded-[30px] py-6 pl-16 pr-8 text-lg font-black italic tracking-tight text-white placeholder:text-on-surface-variant/20 focus:outline-none focus:border-v-cyan/20 focus:ring-1 focus:ring-v-cyan/20 transition-all font-mono"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3 opacity-30">
                        {isSearching ? (
                          <Loader2 size={14} className="animate-spin text-v-cyan opacity-100" />
                        ) : (
                          <>
                            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-v-emerald">Ready</span>
                            <div className="w-2 h-2 rounded-full bg-v-emerald animate-pulse" />
                          </>
                        )}
                    </div>
                    {/* Scanning Line Animation */}
                    <motion.div 
                        animate={{ top: ['0%', '100%', '0%'] }} 
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                        className="absolute left-4 right-4 h-[1px] bg-v-cyan/20 pointer-events-none blur-sm"
                    />
                    {/* Live Search Results Dropdown */}
                    <AnimatePresence>
                      {searchResults.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.98 }}
                          className="absolute top-full mt-3 left-0 right-0 bg-surface-lowest/95 backdrop-blur-2xl border border-white/5 rounded-[24px] overflow-hidden shadow-2xl z-50"
                        >
                          {searchResults.map((u: any) => (
                            <a key={u.id} href={`/profile/${u.username}`} className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-all group/result">
                              <img src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} className="w-9 h-9 rounded-xl border border-white/10 object-cover" alt="avatar" />
                              <div>
                                <p className="text-xs font-black text-white italic">{u.display_name || u.username}</p>
                                <p className="text-[10px] font-bold text-v-cyan opacity-60 uppercase tracking-widest">@{u.username}</p>
                              </div>
                            </a>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                 </div>
            </div>
            
            <div className="hidden lg:flex items-center justify-center relative">
                 <div className="w-64 h-64 border-4 border-white/5 rounded-full relative flex items-center justify-center animate-spin-slow">
                     <span className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-v-cyan rounded-full shadow-[0_0_20px_var(--v-cyan)]" />
                     <div className="w-48 h-48 border-[1px] border-white/5 rounded-full" />
                 </div>
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Signal size={40} className="text-v-cyan opacity-40 mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Scanning</span>
                 </div>
            </div>
         </div>
      </div>

      {/* Wave Selectors */}
      <div className="flex flex-wrap gap-4 justify-center sm:justify-start px-4 relative">
        {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = activeTab === cat.id;
            return (
                <button
                    key={cat.id}
                    onClick={() => setActiveTab(cat.id)}
                    className={clsx(
                        'group flex items-center gap-4 px-10 py-5 rounded-[25px] text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 overflow-hidden relative shadow-2xl',
                        active ? 'text-white translate-y-[-4px]' : 'bg-surface-lowest/40 text-on-surface-variant border border-white/5 hover:bg-white/5'
                    )}
                >
                    <div className="relative z-10">
                        <KineticIcon 
                            icon={Icon} 
                            size={16} 
                            active={active} 
                            pulse={active} 
                            color={active ? 'white' : 'currentColor'} 
                        />
                    </div>
                    <div className="flex flex-col items-start relative z-10 transition-transform duration-500 group-hover:translate-x-1">
                        <span className="leading-none mb-0.5">{cat.label}</span>
                        <span className={clsx('text-[7px] font-black tracking-[0.3em] opacity-40', active && 'text-white/60')}>({cat.sub})</span>
                    </div>
                    
                    {active && (
                       <motion.div 
                        layoutId="explore-active-pill"
                        className="absolute inset-0 bg-primary-gradient -z-0"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                       />
                    )}
                </button>
            )
        })}
      </div>

      {/* Discovery Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 px-2">
        {/* WAVE TRENDS (LEFT) */}
        <div className="lg:col-span-1 space-y-8">
            <div className="flex items-center gap-4 px-4">
                <KineticIcon icon={TrendingUp} size={18} color="var(--v-violet)" pulse />
                <div className="flex flex-col">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white italic leading-none">Active_Waves</h3>
                    <span className="text-[7px] font-black tracking-[0.2em] text-on-surface-variant opacity-40 uppercase">Global Trends</span>
                </div>
            </div>
            
            <div className="glass-card p-10 bg-surface-lowest/20 border-none rounded-[50px] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-v-violet/5 blur-3xl rounded-full" />
                
                {loading ? (
                    <div className="py-20 flex flex-col items-center opacity-30">
                        <Loader2 size={24} className="animate-spin mb-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest italic">Finding Trends...</span>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {(waves.length > 0 ? waves : [
                            { tag: '#SignalCore', count: 1200 },
                            { tag: '#VerlynOS', count: 840 },
                            { tag: '#NeuralGrid', count: 520 },
                            { tag: '#E2EE_Privacy', count: 310 },
                            { tag: '#CyberExpanse', count: 220 },
                            { tag: '#PrimeIdentity', count: 180 }
                        ]).map((t, index) => (
                            <motion.div 
                                key={t.tag}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-center justify-between p-5 rounded-[24px] hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-4">
                                    <Hash size={16} className="text-v-violet opacity-40 group-hover:opacity-100 transition-opacity" />
                                    <span className="text-sm font-black italic group-hover:text-v-cyan transition-colors uppercase tracking-tight">{t.tag}</span>
                                </div>
                                <div className="flex flex-col items-end opacity-40">
                                    <span className="text-[10px] font-mono text-white leading-none mb-1">{fmt(t.count)}</span>
                                    <span className="text-[8px] font-black uppercase tracking-widest">Hits</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            <div className="glass-card p-10 bg-v-cyan/5 border border-v-cyan/10 rounded-[50px] shadow-2xl flex flex-col justify-between h-40 group">
                <div className="flex justify-between items-start">
                    <Sparkles size={24} className="text-v-cyan animate-pulse" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-v-cyan border border-v-cyan/20 px-2 py-0.5 rounded-lg">AI_SCAN_ACTIVE</span>
                </div>
                <p className="text-xs font-black italic tracking-tight text-on-surface-variant opacity-80 group-hover:opacity-100 transition-opacity">Discover personalized intelligence nodes based on your current signal modulation.</p>
            </div>
        </div>

        {/* FEED SELECTION (RIGHT) */}
        <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center gap-4 px-4">
                <Signal size={18} className="text-v-emerald" />
                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-white">Intelligence_Signals</h3>
            </div>

            <div className="space-y-8">
                {loading ? (
                    <div className="grid grid-cols-2 gap-8 opacity-20">
                         {[1,2,3,4].map(i => <div key={i} className="aspect-video bg-white/5 rounded-[40px] animate-pulse" />)}
                    </div>
                ) : signals.length === 0 ? (
                    <div className="py-40 text-center opacity-30 italic glass-card border-none bg-surface-lowest/10 rounded-[60px]">
                        <Compass size={40} className="mx-auto mb-6 text-on-surface-variant/20" />
                        <p className="text-[11px] font-black uppercase tracking-[0.5em] leading-none">Mapping Unknown Space</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {signals.map((p, index) => (
                            <motion.div 
                                key={p.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className="group relative"
                            >
                                <div className="absolute -inset-1 bg-primary-gradient rounded-[50px] blur-2xl opacity-0 group-hover:opacity-10 transition-opacity" />
                                <div className="glass-card bg-surface-lowest/40 border-none rounded-[50px] overflow-hidden shadow-2xl relative z-10 transition-transform duration-700 group-hover:translate-y-[-8px]">
                                    {p.mediaUrls?.[0] ? (
                                        <div className="aspect-[16/10] overflow-hidden">
                                            <img src={p.mediaUrls[0]} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="signal" />
                                        </div>
                                    ) : (
                                        <div className="aspect-[16/10] bg-white/[0.02] flex items-center justify-center p-10">
                                            <p className="text-sm font-black text-center italic text-on-surface opacity-60 uppercase tracking-tighter leading-relaxed">
                                                {p.content.slice(0, 120)}{p.content.length > 120 ? '...' : ''}
                                            </p>
                                        </div>
                                    )}
                                     <div className="p-8 space-y-4">
                                         <div className="flex items-center justify-between">
                                             <Link href={`/profile/${p.author?.username}`} className="flex items-center gap-3">
                                                 <img src={p.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.author?.username}`} className="w-8 h-8 rounded-xl border border-white/10" alt="node" />
                                                 <span className="text-[11px] font-black uppercase tracking-widest text-white italic group-hover:text-v-cyan transition-colors">@{p.author?.username}</span>
                                             </Link>
                                             <div className="flex items-center gap-4 text-on-surface-variant opacity-40">
                                                  <div className="flex items-center gap-1.5"><KineticIcon icon={Eye} size={12} color="currentColor" /> <span className="text-[10px] font-mono">{fmt(p.likeCount * 5)}</span></div>
                                                  <div className="flex items-center gap-1.5"><KineticIcon icon={MessageCircle} size={12} color="currentColor" /> <span className="text-[10px] font-mono">{p.commentCount}</span></div>
                                             </div>
                                         </div>
                                     </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
            
            <button className="w-full py-8 border-2 border-white/5 rounded-[40px] text-[11px] font-black uppercase tracking-[0.6em] text-on-surface-variant hover:text-white hover:bg-white/5 transition-all text-center">
                Expand_Matrix_Deep_Scan
            </button>
        </div>
      </div>
    </div>
  );
}
