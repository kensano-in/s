'use client';

import { useAppStore } from '@/lib/store';
import PostCard from '@/components/features/feed/PostCard';
import { Edit3, Camera, Award, Grid3x3, Bookmark, Loader2, CheckCircle2, ShieldCheck, Database, Palette, Ghost, Zap, Sparkles, Hash, Activity, Globe, Share2, AlertTriangle, Fingerprint } from 'lucide-react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import EditProfileModal from '@/components/features/profile/EditProfileModal';
import { createClient } from '@/lib/supabase/client';
import { getDatabaseProfile } from './actionsCore';
import { uploadMedia } from '@/app/(main)/feed/upload';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

function kFmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const THEME_PRESETS = [
  { id: 'cyan', name: 'Cyber Matrix', color: '#00FFFF', gradient: 'linear-gradient(135deg, rgba(0,255,255,0.2) 0%, rgba(0,0,0,0) 100%)' },
  { id: 'violet', name: 'Nebula Core', color: '#8B5CF6', gradient: 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(0,0,0,0) 100%)' },
  { id: 'emerald', name: 'Bio Digital', color: '#10B981', gradient: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(0,0,0,0) 100%)' },
  { id: 'rose', name: 'Sovereign Red', color: '#F43F5E', gradient: 'linear-gradient(135deg, rgba(244,63,94,0.2) 0%, rgba(0,0,0,0) 100%)' },
  { id: 'amber', name: 'Solar Flare', color: '#F59E0B', gradient: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(0,0,0,0) 100%)' }
];

export default function ProfilePage() {
  const [tab, setTab] = useState<'posts' | 'saved' | 'signals'>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [bannerColor, setBannerColor] = useState<string>('cyan');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [dbUser, setDbUser] = useState<any>(null);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { currentUser, updateProfile, syncStatus, setSyncStatus } = useAppStore();
  const supabase = useMemo(() => createClient(), []);

  const activeTheme = useMemo(() => THEME_PRESETS.find(t => t.id === bannerColor) || THEME_PRESETS[0], [bannerColor]);

  const fetchProfile = useCallback(async () => {
    if (!currentUser?.id) return;
    const res = await getDatabaseProfile(currentUser.id);
    if (res.success) setDbUser(res.data);
  }, [currentUser?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!currentUser?.id) return;
    async function loadPosts() {
      setLoadingPosts(true);
      const { data } = await supabase.from('posts').select('*, author:users(*)').eq('author_id', currentUser!.id).order('created_at', { ascending: false });
      if (data) {
        setUserPosts(data.map((m: any) => ({
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
      setLoadingPosts(false);
    }
    loadPosts();
  }, [currentUser?.id, supabase]);

  const handleAvatarUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setSyncStatus('syncing');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'avatars');
    const result = await uploadMedia(fd);
    if ('url' in result) {
      updateProfile({ avatar: result.url });
      await fetchProfile();
      setSyncStatus('idle');
    }
  };

  if (!currentUser) return null;

  const score = dbUser?.security_score || 0;
  const integrity = dbUser?.profile_completeness || 0;

  return (
    <div className="space-y-0 animate-fade-in relative pb-40 font-sans italic selection:bg-v-cyan/30 text-on-surface">
      <EditProfileModal isOpen={isEditing} onClose={() => setIsEditing(false)} />
      
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarUpload(e.target.files)} />

      {/* Sovereign Signal Aura (Background Glow) */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] opacity-10 blur-[150px] -z-10 transition-all duration-1000" style={{ background: activeTheme.color }} />

      <div className="max-w-[1000px] mx-auto px-6 pt-12 sm:pt-20">
        
        {/* Dynamic Profile Header */}
        <div className="flex flex-col md:flex-row gap-12 items-start md:items-center relative mb-20">
            {/* Identity Node (Avatar) */}
            <div className="relative group/avatar cursor-pointer">
                <div className="w-[180px] h-[180px] sm:w-[240px] sm:h-[240px] p-1.5 rounded-[60px] bg-white/5 border border-white/10 shadow-3xl overflow-hidden group-hover/avatar:border-white/30 transition-all duration-700 relative z-20">
                    <img 
                        src={dbUser?.avatar_url || currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`} 
                        className="w-full h-full object-cover rounded-[55px] group-hover/avatar:scale-110 transition-transform duration-1000" 
                        alt="avatar" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center" onClick={() => avatarInputRef.current?.click()}>
                        <Camera size={40} className="text-white drop-shadow-2xl translate-y-4 group-hover/avatar:translate-y-0 transition-transform duration-500" />
                    </div>
                </div>
                {/* Visual Status Rings */}
                <div className="absolute -inset-4 border border-white/5 rounded-[80px] -z-10 animate-pulse-slow" />
                <div className="absolute -inset-8 border border-white/[0.02] rounded-[100px] -z-20 animate-spin-slow" />
                {dbUser?.is_verified && <div className="absolute -top-3 -right-3 w-12 h-12 bg-v-cyan text-black rounded-3xl flex items-center justify-center shadow-[0_0_30px_var(--v-cyan)] z-30 border-4 border-black"><ShieldCheck size={24} /></div>}
            </div>

            {/* Signal Profile Data */}
            <div className="flex-1 space-y-8">
                <div>
                   <div className="flex items-center gap-6 mb-3">
                         <h1 className="text-5xl sm:text-7xl font-black italic tracking-tighter text-white uppercase leading-none">{dbUser?.display_name || currentUser.displayName}</h1>
                         {dbUser?.role === 'PRIME' && <span className="px-4 py-1.5 bg-v-violet/10 text-v-violet border border-v-violet/20 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl">PRIME_IDENTITY</span>}
                   </div>
                   <div className="flex items-center gap-4">
                        <span className="text-v-cyan text-sm font-black uppercase tracking-widest italic flex items-center gap-2">
                           <Hash size={14} /> {dbUser?.username || currentUser.username}
                        </span>
                        <div className="w-1.5 h-1.5 rounded-full bg-v-cyan shadow-[0_0_10px_var(--v-cyan)] animate-pulse" />
                        <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-40">NODE_BROADCAST_ACTIVE</span>
                   </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <NodeStat label="Signals" val={userPosts.length} color="text-white" />
                    <NodeStat label="Enlisted" val={kFmt(dbUser?.follower_count || currentUser.followerCount || 0)} color="text-on-surface" />
                    <NodeStat label="Linking" val={kFmt(dbUser?.following_count || currentUser.followingCount || 0)} color="text-on-surface" />
                    <NodeStat label="Karma" val={kFmt(dbUser?.karma_score || 0)} color="text-v-violet" />
                </div>

                {/* Bio / Broadcast */}
                <div className="p-8 rounded-[40px] bg-surface-lowest/40 border border-white/5 shadow-2xl relative overflow-hidden group">
                   <div className="absolute inset-0 bg-primary-gradient opacity-0 group-hover:opacity-10 transition-opacity" />
                   <p className="text-base sm:text-lg font-bold text-on-surface-variant leading-relaxed italic tracking-tight relative z-10">
                       {dbUser?.bio || "Kernel identity transmission pending content injection..."}
                   </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <button onClick={() => setIsEditing(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-10 py-5 bg-primary-gradient text-white rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-3xl hover:scale-105 active:scale-95 transition-all">
                        <Edit3 size={18} /> EDIT KERNEL
                    </button>
                    <button onClick={() => setShowColorPicker(!showColorPicker)} className="w-16 h-16 rounded-3xl bg-surface-high/50 flex items-center justify-center text-on-surface-variant border border-white/10 hover:bg-white hover:text-black transition-all">
                        <Palette size={20} />
                    </button>
                    <button className="w-16 h-16 rounded-3xl bg-surface-high/50 flex items-center justify-center text-on-surface-variant border border-white/10 hover:bg-white hover:text-black transition-all">
                        <Share2 size={20} />
                    </button>
                </div>
            </div>
        </div>

        {/* Node Integrity Matrix (Quick Info) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            <IntegrityCard 
                label="Identity Integrity" 
                percent={integrity} 
                icon={Fingerprint} 
                color="from-v-cyan to-v-cyan/20"
                desc="Completion of identity metadata nodes."
            />
            <IntegrityCard 
                label="Sovereign Security" 
                percent={score} 
                icon={ShieldCheck} 
                color="from-v-violet to-v-violet/20"
                desc="Network trust and kernel protection score."
            />
            <div className="glass-card p-10 bg-surface-lowest/40 border-none rounded-[50px] shadow-2xl flex flex-col justify-between">
                <div>
                   <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Visual Signature</span>
                      <ChevronRight size={14} className="opacity-20" />
                   </div>
                   <h4 className="text-xl font-black italic tracking-tighter uppercase text-white leading-none">{activeTheme.name}</h4>
                </div>
                <div className="flex gap-2 mt-6">
                    {THEME_PRESETS.map(t => (
                        <div key={t.id} onClick={() => setBannerColor(t.id)} className={clsx('w-8 h-8 rounded-xl cursor-pointer border-2 transition-all', bannerColor === t.id ? 'border-white scale-110 shadow-lg' : 'border-white/5 opacity-50 hover:opacity-100')} style={{ backgroundColor: t.color }} />
                    ))}
                </div>
            </div>
        </div>

        {/* Content Navigation */}
        <div className="flex border-b border-white/5 justify-start gap-12 mb-12">
            <TabBtn active={tab === 'posts'} onClick={() => setTab('posts')} icon={Grid3x3} label="Broadcasts" />
            <TabBtn active={tab === 'saved'} onClick={() => setTab('saved')} icon={Bookmark} label="Archives" />
            <TabBtn active={tab === 'signals'} onClick={() => setTab('signals')} icon={Activity} label="Feed Log" />
        </div>

        {/* Node GRID CONTENT */}
        <div className="min-h-[500px]">
            {tab === 'posts' && (
                loadingPosts ? (
                    <div className="flex flex-col items-center justify-center py-40 opacity-40">
                        <Loader2 size={32} className="animate-spin text-v-cyan mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Hydrating Node History...</p>
                    </div>
                ) : userPosts.length === 0 ? (
                    <div className="py-40 text-center flex flex-col items-center glass-card border-none bg-surface-lowest/20 rounded-[60px]">
                        <Ghost size={60} className="text-on-surface-variant/20 mb-8" />
                        <p className="text-[11px] font-black uppercase tracking-[0.5em] text-on-surface-variant opacity-40 leading-none">Inert Frequency</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 sm:gap-10">
                        {userPosts.map((p, index) => (
                            <motion.div 
                                key={p.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => window.location.href = `/feed/${p.id}`}
                                className="aspect-[3/4] bg-surface-lowest/40 rounded-[45px] relative group overflow-hidden cursor-pointer shadow-2xl border border-white/5"
                            >
                                {p.mediaUrls?.[0] ? (
                                    <img src={p.mediaUrls[0]} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="post" />
                                ) : (
                                    <div className="w-full h-full flex p-10 items-center justify-center text-sm font-black italic uppercase tracking-tighter opacity-80 text-on-surface group-hover:text-v-cyan transition-colors">
                                        {p.content.slice(0, 80)}{p.content.length > 80 ? '...' : ''}
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-primary-gradient opacity-0 group-hover:opacity-40 transition-opacity flex flex-col items-center justify-center gap-2">
                                    <div className="flex items-center gap-4 text-white">
                                        <div className="flex items-center gap-1.5"><Zap size={20} fill="white" /> <span className="text-lg font-black">{kFmt(p.likeCount)}</span></div>
                                        <div className="flex items-center gap-1.5"><MessageCircle size={20} fill="white" /> <span className="text-lg font-black">{kFmt(p.commentCount)}</span></div>
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-v-cyan">RETRIVE_SIGNAL</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )
            )}
            
            {tab !== 'posts' && (
                <div className="py-60 text-center flex flex-col items-center glass-card border-none bg-surface-lowest/10 rounded-[60px]">
                    <Activity size={40} className="text-on-surface-variant/10 animate-pulse mb-8" />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-20 italic">Archives synchronized but encrypted. Implementation pending.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

function NodeStat({ label, val, color }: any) {
    return (
        <div className="flex flex-col">
            <span className={clsx('text-3xl font-black italic tracking-tighter leading-none mb-1', color)}>{val}</span>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-30 italic">{label}</span>
        </div>
    )
}

function integrityIcon(color: string) {
    return <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border border-white/10', color)} />
}

function IntegrityCard({ label, percent, icon: Icon, color, desc }: any) {
    return (
        <div className="glass-card p-10 bg-surface-lowest/40 border-none rounded-[50px] shadow-2xl flex flex-col justify-between group hover:bg-surface-lowest/60 transition-all">
            <div className="flex justify-between items-start mb-6">
                <div className={clsx('w-14 h-14 rounded-3xl flex items-center justify-center bg-gradient-to-br text-white shadow-2xl group-hover:scale-110 transition-transform duration-500', color)}>
                    <Icon size={24} />
                </div>
                <div className="text-right">
                    <span className="text-4xl font-black italic tracking-tighter text-white leading-none mb-1">{percent}%</span>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40">OPTIMIZED</p>
                </div>
            </div>
            <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-white mb-2 italic">{label}</h4>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 1.5, ease: 'easeOut' }} className={clsx('h-full bg-gradient-to-r', color)} />
                </div>
                <p className="text-[9px] font-bold text-on-surface-variant opacity-40 mt-4 leading-relaxed italic">{desc}</p>
            </div>
        </div>
    )
}

function TabBtn({ active, onClick, icon: Icon, label }: any) {
    return (
        <button onClick={onClick} className={clsx('flex items-center gap-4 py-8 relative group transition-all', active ? 'text-white' : 'text-on-surface-variant opacity-40 hover:opacity-100')}>
            <Icon size={18} className={clsx('transition-all duration-500', active ? 'text-v-cyan scale-125' : 'group-hover:scale-110')} />
            <span className="text-xs font-black uppercase tracking-widest italic">{label}</span>
            {active && <motion.div layoutId="profile-tab" className="absolute bottom-[-1px] left-0 right-0 h-1 bg-v-cyan shadow-[0_0_15px_var(--v-cyan)] rounded-t-full" />}
        </button>
    )
}

function MessageCircle({ size, fill, className }: any) {
    return <Activity size={size} className={className} />
}

function ChevronRight({ size, className }: any) {
    return <Zap size={size} className={className} />
}
