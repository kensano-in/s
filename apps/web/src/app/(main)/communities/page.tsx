'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, Plus, Search, Loader2, X, Globe, Lock, Hash, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCommunities, createCommunity, toggleCommunityJoin } from './actions';
import { useAppStore } from '@/lib/store';
import clsx from 'clsx';
import Link from 'next/link';

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);

  // Simulated member fluctuation to make it feel alive
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const tick = () => {
       const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
       if (change !== 0) {
          setDisplayValue(prev => Math.max(0, prev + change));
       }
       timeout = setTimeout(tick, 3000 + Math.random() * 5000);
    };
    tick();
    return () => clearTimeout(timeout);
  }, [value]);

  return <span>{displayValue.toLocaleString()}</span>;
}

export default function CommunitiesPage() {
  const { currentUser } = useAppStore();
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Create Modal
  const [showModal, setShowModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [modalErr, setModalErr] = useState<string | null>(null);
  const [newComm, setNewComm] = useState({ name: '', displayName: '', description: '', isPrivate: false });

  const fetchCommunities = useCallback(async () => {
    setLoading(true);
    const res = await getCommunities(currentUser?.id);
    if (res.success && res.communities) {
      // Sort joined first, then by member count
      const sorted = res.communities.sort((a: any, b: any) => {
        if (a.isJoined && !b.isJoined) return -1;
        if (!a.isJoined && b.isJoined) return 1;
        return b.member_count - a.member_count;
      });
      setCommunities(sorted);
      if (sorted.length > 0) setSelectedId(sorted[0].id);
    }
    setLoading(false);
  }, [currentUser?.id]);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  const handleJoinLeave = async (cId: string, isJoining: boolean) => {
    if (!currentUser?.id) return;
    const res = await toggleCommunityJoin(cId, currentUser.id, isJoining);
    if (res.success) {
        setCommunities(prev => prev.map(c => c.id === cId ? { ...c, isJoined: isJoining, member_count: isJoining ? c.member_count + 1 : c.member_count - 1 } : c));
    }
  }

  const handleCreate = async () => {
      if (!currentUser?.id) return;
      setIsCreating(true);
      setModalErr(null);
      const res = await createCommunity({ ...newComm, userId: currentUser.id });
      if (res.success) {
          setShowModal(false);
          setNewComm({ name: '', displayName: '', description: '', isPrivate: false });
          fetchCommunities();
      } else {
          setModalErr(res.error);
      }
      setIsCreating(false);
  };

  const filtered = communities.filter(c => 
    c.display_name.toLowerCase().includes(search.toLowerCase()) || 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCommunity = useMemo(() => communities.find(c => c.id === selectedId), [communities, selectedId]);

  return (
    <div className="h-full flex flex-col md:flex-row max-w-7xl mx-auto italic animate-fade-in pb-16 md:pb-0 overflow-hidden text-white">
      
      {/* LEFT PANEL: Directory */}
      <div className="w-full md:w-[400px] lg:w-[450px] flex-shrink-0 flex flex-col h-[calc(100vh-80px)] border-r border-white/5 bg-[#050505]">
          <div className="p-6 pb-4 shrink-0">
             <div className="flex items-center justify-between mb-6">
                <div>
                   <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                      Communities <span className="live-dot w-2.5 h-2.5 bg-v-cyan rounded-full" />
                   </h1>
                   <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Global Directory</p>
                </div>
                <button onClick={() => setShowModal(true)} className="w-10 h-10 rounded-full bg-primary-gradient flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all text-white">
                   <Plus size={18} />
                </button>
             </div>
             
             <div className="relative group">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input 
                   value={search} onChange={(e) => setSearch(e.target.value)} 
                   placeholder="SEARCH COMMUNITIES..." 
                   className="w-full bg-[#121212] border border-[#262626] text-xs font-black uppercase tracking-widest rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-v-cyan/50 transition-all placeholder:text-neutral-600 shadow-inner" 
                />
             </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-12 custom-scrollbar space-y-2">
             {loading ? (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-v-cyan opacity-50" /></div>
             ) : filtered.length === 0 ? (
                <div className="py-20 text-center text-neutral-600 text-xs font-bold uppercase tracking-widest">No communities found</div>
             ) : (
                <AnimatePresence>
                   {filtered.map((c, i) => (
                      <motion.div
                         key={c.id}
                         layout
                         className="stagger-item group"
                      >
                         <button 
                            onClick={() => setSelectedId(c.id)}
                            className={clsx(
                               "w-full flex items-center gap-4 p-3 rounded-2xl transition-all relative community-card border border-transparent text-left",
                               selectedId === c.id ? "bg-[#121212] border-white/10 lux-shadow" : "hover:bg-[#0a0a0a]"
                            )}
                         >
                            {selectedId === c.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-md shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
                            
                            <div className="relative">
                               <img src={c.icon_url} className="w-12 h-12 rounded-[14px] object-cover border border-[#262626] group-hover:border-blue-500/30 transition-colors" alt="" />
                               {c.isJoined && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#050505] rounded-full flex items-center justify-center"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" /></div>}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2">
                                  <h3 className="font-black text-sm uppercase tracking-tight truncate text-white">{c.display_name}</h3>
                                  {c.is_private && <Lock size={10} className="text-rose-400 shrink-0" />}
                               </div>
                               <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">
                                  <AnimatedNumber value={c.member_count} /> Members
                                  {c.isJoined && <span className="ml-2 text-blue-500">Joined</span>}
                               </div>
                            </div>
                         </button>
                      </motion.div>
                   ))}
                </AnimatePresence>
             )}
          </div>
      </div>

      {/* RIGHT PANEL: Detail Preview */}
      <div className="hidden md:flex flex-1 flex-col h-[calc(100vh-80px)] bg-[#0A0A0A] relative flex-shrink">
         {selectedCommunity ? (
            <div className="w-full h-full flex flex-col p-8 lg:p-12 overflow-y-auto custom-scrollbar">
               
               <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-8 mb-12">
                  <div className="flex gap-6 items-center lg:items-start">
                     <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-[24px] overflow-hidden border-2 border-white/5 relative group">
                        <img src={selectedCommunity.icon_url} className="w-full h-full object-cover" alt="" />
                     </div>
                     <div className="pt-2">
                        <h2 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter leading-none mb-2 text-white">{selectedCommunity.display_name}</h2>
                        <div className="flex items-center gap-3 text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">
                           <Hash size={12} className="text-blue-500" /> {selectedCommunity.name}
                           <span className="w-1 h-1 bg-neutral-700 rounded-full" />
                           <Activity size={12} className={selectedCommunity.isJoined ? "text-emerald-400" : "text-neutral-500"} /> 
                           {selectedCommunity.isJoined ? "Joined" : "Not Joined"}
                        </div>
                     </div>
                  </div>

                  <div className="flex-shrink-0 flex flex-col items-end">
                     {selectedCommunity.isJoined ? (
                        <Link href={`/communities/${selectedCommunity.id}`} className="px-8 py-3 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                           Enter Server
                        </Link>
                     ) : (
                        <button onClick={() => handleJoinLeave(selectedCommunity.id, true)} className="px-8 py-3 btn-primary font-black text-xs uppercase tracking-widest shadow-xl">
                           Join Community
                        </button>
                     )}
                     
                     {selectedCommunity.isJoined && (
                        <button onClick={() => handleJoinLeave(selectedCommunity.id, false)} className="mt-4 text-[9px] font-bold text-neutral-600 hover:text-rose-400 uppercase tracking-widest transition-colors">
                           Leave Community
                        </button>
                     )}
                  </div>
               </div>

               <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <div className="xl:col-span-2 space-y-8">
                     <div>
                        <h3 className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-4">About</h3>
                        <div className="bg-[#121212] border border-[#262626] rounded-2xl p-6">
                           <p className="text-sm font-medium text-neutral-300 leading-relaxed min-h-[60px]">
                              {selectedCommunity.description || "No description provided."}
                           </p>
                        </div>
                     </div>

                     <div>
                        <h3 className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-4">Channels Preview</h3>
                        <div className="bg-[#121212] border border-[#262626] rounded-2xl overflow-hidden divide-y divide-[#262626]">
                           {['general', 'announcements', 'off-topic'].map((ch, i) => (
                              <div key={ch} className="px-6 py-4 flex items-center gap-3 text-neutral-400">
                                 <Hash size={14} className="opacity-50" />
                                 <span className="text-xs font-black uppercase tracking-tight">{ch}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div>
                        <h3 className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-4">Specs</h3>
                        <div className="bg-[#121212] border border-[#262626] rounded-2xl p-6 space-y-4">
                           <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-neutral-500 uppercase">Members</span>
                              <span className="text-sm font-black"><AnimatedNumber value={selectedCommunity.member_count} /></span>
                           </div>
                           <div className="w-full h-px bg-[#262626]" />
                           <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-neutral-500 uppercase">Access</span>
                              <span className={clsx("text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md", selectedCommunity.is_private ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400")}>
                                 {selectedCommunity.is_private ? "Private" : "Public"}
                              </span>
                           </div>
                           <div className="w-full h-px bg-[#262626]" />
                           <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-neutral-500 uppercase">Est.</span>
                              <span className="text-xs font-bold text-neutral-400">{new Date(selectedCommunity.created_at || Date.now()).toLocaleDateString()}</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 opacity-50">
               <Globe size={48} className="mb-6 opacity-20" />
               <p className="text-xs font-black uppercase tracking-[0.3em]">Select a community</p>
            </div>
         )}
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
          {showModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="glass-card w-full max-w-xl p-8 border border-[#262626] bg-[#0A0A0A] lux-shadow rounded-3xl"
                  >
                      <div className="flex justify-between items-center mb-8">
                         <div>
                            <h3 className="text-2xl font-black italic tracking-tighter uppercase leading-none text-white">New Community</h3>
                         </div>
                         <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                            <X size={20} className="text-neutral-500" />
                         </button>
                      </div>

                      <div className="space-y-6">
                         <div className="space-y-2">
                             <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 px-1 ml-1 flex items-center gap-1">Community Focus</label>
                             <input value={newComm.displayName} onChange={(e) => setNewComm({...newComm, displayName: e.target.value, name: e.target.value.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '')})} className="w-full bg-[#121212] border border-[#262626] rounded-xl py-4 px-5 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-black uppercase tracking-widest text-white shadow-inner" placeholder="e.g. Design Engineers" />
                         </div>
                         
                         <div className="space-y-2">
                             <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 px-1 ml-1">Unique Identifier</label>
                             <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-600 font-black">#</span>
                                <input disabled value={newComm.name} className="w-full bg-[#050505] border border-[#1a1a1a] rounded-xl py-4 pl-10 pr-5 text-sm font-black uppercase tracking-widest text-neutral-500" />
                             </div>
                         </div>

                         <div className="space-y-2">
                             <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 px-1 ml-1 block">Description</label>
                             <textarea value={newComm.description} onChange={(e) => setNewComm({...newComm, description: e.target.value})} className="w-full bg-[#121212] border border-[#262626] rounded-xl py-4 px-5 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-medium min-h-[100px] resize-none shadow-inner text-white" placeholder="What is this community about?" />
                         </div>

                         <div className="flex items-center justify-between p-4 bg-[#121212] border border-[#262626] rounded-xl">
                             <div className="flex flex-col">
                                <span className="text-xs font-black text-white uppercase tracking-tight">Private Server</span>
                                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Requires invite.</span>
                             </div>
                             <button onClick={() => setNewComm({...newComm, isPrivate: !newComm.isPrivate})} className={clsx('w-12 h-6 px-1 rounded-full flex items-center transition-all', newComm.isPrivate ? 'bg-rose-500' : 'bg-[#262626]')}>
                                 <motion.div animate={{ x: newComm.isPrivate ? 24 : 0 }} className="w-4 h-4 bg-white rounded-full lux-shadow" />
                             </button>
                         </div>

                         {modalErr && <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest">ERROR: {modalErr}</div>}

                         <button 
                            onClick={handleCreate}
                            disabled={isCreating}
                            className="w-full btn-primary py-5 mt-4 font-black uppercase tracking-[0.2em] text-xs shadow-glow-primary"
                         >
                             {isCreating ? 'Initialize...' : 'Create Target'}
                         </button>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
}
