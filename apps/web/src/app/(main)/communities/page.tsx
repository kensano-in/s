'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Shield, Plus, Zap, Star, Search, Loader2, X, AlertCircle, CheckCircle2, ChevronRight, Hash, Database, Globe, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCommunities, createCommunity, toggleCommunityJoin } from './actions';
import { useAppStore } from '@/lib/store';
import clsx from 'clsx';
import KineticIcon from '@/components/ui/KineticIcon';

export default function CommunitiesPage() {
  const { currentUser } = useAppStore();
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [modalErr, setModalErr] = useState<string | null>(null);

  // Creation State
  const [newComm, setNewComm] = useState({ name: '', displayName: '', description: '', isPrivate: false });

  const fetchCommunities = useCallback(async () => {
    setLoading(true);
    const res = await getCommunities(currentUser?.id);
    if (res.success) setCommunities(res.communities || []);
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

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-32 animate-fade-in text-on-surface p-6 italic">
      {/* Header & Search */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
        <div className="space-y-4">
          <h1 className="text-6xl font-black italic tracking-tighter text-white uppercase leading-none mb-1">Communities</h1>
          <div className="flex items-center gap-4">
             <KineticIcon icon={Users} size={14} color="var(--v-cyan)" pulse active />
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60">Sovereign Node Matrix (Humanized)</p>
          </div>
        </div>

        <div className="flex w-full lg:w-auto gap-4 items-center">
           <div className="relative flex-1 lg:w-96 group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                 <KineticIcon icon={Search} size={18} color="var(--v-cyan)" active pulse />
              </div>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="SEARCH COMMUNITIES..." className="w-full bg-surface-lowest/40 border border-white/5 text-[10px] font-black uppercase tracking-widest rounded-3xl py-5 pl-14 pr-8 focus:outline-none focus:ring-1 focus:ring-v-cyan/30 transition-all placeholder:text-on-surface-variant/30 italic shadow-2xl" />
           </div>
           <button onClick={() => setShowModal(true)} className="flex items-center justify-center gap-4 px-10 py-5 bg-primary-gradient rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(108,99,255,0.25)] group text-white">
            <KineticIcon icon={Plus} size={18} color="white" active pulse />
            START_COMMUNITY
           </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 opacity-40">
           <Loader2 size={32} className="animate-spin mb-6 text-v-cyan shadow-[0_0_20px_var(--v-cyan)]" />
           <p className="text-[10px] font-black uppercase tracking-[0.5em] italic">Connecting to Communities...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 gap-6 glass-card border-dashed border-white/5 bg-transparent rounded-[50px] italic">
            <Database size={50} className="text-on-surface-variant/10" />
            <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-40">No Nodes Broadcasted</p>
                <p className="text-sm font-bold text-on-surface-variant opacity-20">Initialize a new protocol to begin.</p>
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8">
           {filtered.map((c) => (
             <div key={c.id} className="glass-card group p-10 border-none bg-surface-lowest/30 hover:bg-surface-lowest/50 rounded-[50px] shadow-[0_30px_60px_rgba(0,0,0,0.5)] transition-all relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700 pointer-events-none">
                    <Users size={120} />
                </div>
                <div className="absolute top-6 right-6">
                    <div className={clsx('w-3 h-3 rounded-full animate-pulse shadow-[0_0_12px_currentColor]', c.is_private ? 'text-rose-500' : 'text-v-emerald')} />
                </div>
                
                <div className="relative space-y-6">
                    <div className="flex items-center gap-6">
                        <div className="relative group/icon">
                            <img src={c.icon_url} className="w-16 h-16 rounded-[24px] border-2 border-white/5 group-hover:border-v-cyan transition-all duration-500 relative z-10" alt="icon" />
                            <div className="absolute -inset-2 bg-v-cyan/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full -z-0" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black italic tracking-tighter text-white uppercase group-hover:text-v-cyan transition-colors">{c.display_name}</h3>
                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-40 italic">
                                <KineticIcon icon={Hash} size={10} color="var(--v-cyan)" /> {c.name.toUpperCase()}
                            </div>
                        </div>
                    </div>
                    
                    <p className="text-[12px] font-medium text-on-surface-variant opacity-60 leading-relaxed italic min-h-[48px] line-clamp-2">
                        {c.description}
                    </p>

                    <div className="flex items-center gap-6 xl:gap-8 pt-4 flex-wrap">
                        <div className="flex flex-col">
                            <span className="text-sm font-black italic tracking-tighter text-v-cyan mb-0.5">{c.member_count}</span>
                            <span className="text-[7px] font-black opacity-30 uppercase tracking-[0.2em]">Members</span>
                        </div>
                        <div className="w-px h-8 bg-white/5" />
                        <div className="flex flex-col">
                            <span className="text-sm font-black italic tracking-tighter text-v-violet mb-0.5">LVL {c.boost_level}</span>
                            <span className="text-[7px] font-black opacity-30 uppercase tracking-[0.2em]">Activity_Level</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mt-10 pt-8 border-t border-white/5 relative z-10">
                    <div className="flex items-center gap-3">
                        <KineticIcon icon={c.is_private ? Lock : Globe} size={14} color={c.is_private ? '#FB7185' : '#10B981'} active pulse />
                        <span className={clsx('text-[8px] font-black uppercase tracking-widest italic', c.is_private ? 'text-rose-400' : 'text-v-emerald')}>
                            {c.is_private ? 'Sovereign Private' : 'Public Domain'}
                        </span>
                    </div>

                    <button 
                        onClick={() => handleJoinLeave(c.id, !c.isJoined)}
                        className={clsx('px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 border italic', c.isJoined ? 'bg-surface-high text-on-surface-variant border-white/5 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20' : 'bg-white text-black border-transparent hover:bg-v-cyan')}
                    >
                        {c.isJoined ? 'LEAVE_NODE' : 'JOIN_COMMUNITY'}
                    </button>
                </div>
             </div>
           ))}
        </div>
      )}

      {/* Creation Modal */}
      <AnimatePresence>
          {showModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl italic">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="glass-card w-full max-w-2xl p-12 border-none bg-[#050505] shadow-[0_0_120px_rgba(108,99,255,0.1)] rounded-[60px]"
                  >
                      <div className="flex justify-between items-center mb-10">
                         <div className="flex items-center gap-6">
                             <div className="w-14 h-14 rounded-3xl bg-primary-gradient flex items-center justify-center text-white shadow-2xl">
                                <KineticIcon icon={Zap} size={24} color="white" pulse glow active />
                             </div>
                             <div>
                                <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none mb-1 text-white">Start Community</h3>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-v-cyan opacity-60">DEPLOYING NEW NEURAL HUB</p>
                             </div>
                         </div>
                         <button onClick={() => setShowModal(false)} className="p-3 hover:bg-white/5 rounded-2xl transition-all">
                            <KineticIcon icon={X} size={24} color="var(--on-surface-variant)" />
                         </button>
                      </div>

                      <div className="space-y-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <ModalInput label="Community Name" value={newComm.displayName} onChange={(v: string) => setNewComm({...newComm, displayName: v, name: v.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '')})} placeholder="Neural Network" />
                             <ModalInput label="Namespace Identifier" value={newComm.name} disabled labelIcon={<KineticIcon icon={Hash} size={10} color="var(--v-cyan)" />} desc="IMMUTABLE KERNEL ID" />
                          </div>
                         <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 mb-2 block italic">Intelligence Description</label>
                             <textarea value={newComm.description} onChange={(e) => setNewComm({...newComm, description: e.target.value})} className="w-full bg-surface-lowest border border-white/5 rounded-3xl py-6 px-8 text-sm focus:outline-none focus:ring-2 focus:ring-v-cyan/20 transition-all font-medium min-h-[120px] resize-none italic shadow-inner" placeholder="Briefly define the protocol scope..." />
                         </div>

                         <div className="flex items-center justify-between p-6 bg-surface-lowest border border-white/5 rounded-3xl italic">
                             <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Sovereign Encryption</span>
                                <span className="text-[9px] font-black text-on-surface-variant opacity-40 uppercase tracking-tighter">Private by default. Enlistment requires verification.</span>
                             </div>
                             <div onClick={() => setNewComm({...newComm, isPrivate: !newComm.isPrivate})} className={clsx('w-12 h-6 px-1 rounded-full flex items-center cursor-pointer transition-all', newComm.isPrivate ? 'bg-rose-500' : 'bg-surface-high')}>
                                 <motion.div animate={{ x: newComm.isPrivate ? 24 : 0 }} className="w-4 h-4 bg-white rounded-full shadow-xl" />
                             </div>
                         </div>

                         {modalErr && <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest">ERROR: {modalErr}</div>}

                         <button 
                            onClick={handleCreate}
                            disabled={isCreating}
                            className="w-full py-6 bg-primary-gradient rounded-3xl font-black uppercase tracking-[0.3em] text-[12px] shadow-3xl hover:scale-[1.02] active:scale-95 transition-all text-white disabled:opacity-50"
                         >
                             {isCreating ? 'MODULATING PROTOCOL...' : 'INITIALIZE NODE'}
                         </button>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
}

function ModalInput({ label, value, onChange, placeholder, disabled, labelIcon, desc }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 mb-2 flex items-center gap-1 italic">{labelIcon} {label}</label>
            <input disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-surface-lowest border border-white/5 rounded-2xl py-5 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-v-cyan/20 transition-all font-black uppercase tracking-widest italic disabled:opacity-30" placeholder={placeholder} />
            {desc && <p className="text-[8px] font-black opacity-30 px-1 uppercase">{desc}</p>}
        </div>
    )
}
