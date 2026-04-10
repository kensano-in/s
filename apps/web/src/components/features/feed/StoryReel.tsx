'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { Plus, X, Play, Loader2, ChevronLeft, ChevronRight, Zap, Ghost, Eye, Clock, Activity, ShieldCheck } from 'lucide-react';
import { createStory, markStoryViewed } from '@/app/(main)/feed/story-actions';
import { uploadMedia } from '@/app/(main)/feed/upload';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface DBStory {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  view_count: number;
  expires_at: string;
  created_at: string;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    security_score?: number;
  };
}

interface StoryGroup {
  author: DBStory['author'];
  stories: DBStory[];
  hasUnviewed: boolean;
}

export default function StoryReel() {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroup, setViewerGroup] = useState<StoryGroup | null>(null);
  const [viewerIdx, setViewerIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { currentUser } = useAppStore();
  const supabase = useMemo(() => createClient(), []);

  const loadStoriesData = async () => {
    const { data } = await supabase
      .from('stories')
      .select('id, media_url, media_type, view_count, expires_at, created_at, author:users!stories_author_id_fkey(id, username, display_name, avatar_url, security_score)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(60);

    if (data) {
      const groupMap = new Map<string, StoryGroup>();
      for (const s of data as unknown as DBStory[]) {
        const aid = s.author.id;
        if (!groupMap.has(aid)) {
          groupMap.set(aid, { author: s.author, stories: [], hasUnviewed: true });
        }
        groupMap.get(aid)!.stories.push(s);
      }
      setGroups(Array.from(groupMap.values()));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStoriesData();
  }, [supabase]);

  const openViewer = (group: StoryGroup) => {
    setViewerGroup(group);
    setViewerIdx(0);
    setProgress(0);
    setViewerOpen(true);
  };

  useEffect(() => {
    if (!viewerOpen || !viewerGroup) return;
    const story = viewerGroup.stories[viewerIdx];
    if (story && currentUser?.id) markStoryViewed(story.id, currentUser.id);
    
    setProgress(0);
    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          if (viewerIdx < viewerGroup.stories.length - 1) setViewerIdx(i => i + 1);
          else setViewerOpen(false);
          return 0;
        }
        return p + 1.5; // Approx 6.5s per story
      });
    }, 100);
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, [viewerOpen, viewerGroup, viewerIdx, currentUser?.id]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !files[0] || !currentUser?.id) return;
    const file = files[0];
    const isVideo = file.type.startsWith('video/');
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'stories');
    const result = await uploadMedia(fd);
    if ('url' in result) {
      await createStory(currentUser.id, result.url, isVideo ? 'video' : 'image');
      await loadStoriesData();
    }
    setUploading(false);
  };

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => handleFileUpload(e.target.files)} />

      <div className="flex gap-4 p-6 rounded-[32px] bg-surface-lowest/20 border border-white/5 overflow-x-auto hide-scrollbar italic backdrop-blur-xl shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-v-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        
        {/* Add Story (Upload) */}
        <button className="flex flex-col items-center gap-3 flex-shrink-0 group/add" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <div className="relative">
                <div className="w-16 h-16 rounded-[22px] p-0.5 bg-white/5 border border-white/10 group-hover/add:border-v-cyan transition-all duration-500 overflow-hidden shadow-xl">
                    <img src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=me`} alt="Me" className="w-full h-full object-cover group-hover/add:scale-110 transition-transform opacity-40" />
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                        {uploading ? <Loader2 size={18} className="animate-spin text-v-cyan" /> : <Plus size={20} className="scale-x-125" />}
                    </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-xl bg-v-cyan text-black flex items-center justify-center shadow-[0_0_15px_var(--v-cyan)] border-2 border-black">
                    <Zap size={10} />
                </div>
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-40 group-hover/add:opacity-100 transition-opacity">Add Story</span>
        </button>

        {/* Stories */}
        {loading ? (
             <div className="flex items-center gap-6 px-4">
                {[1,2,3,4].map(i => <div key={i} className="w-16 h-16 rounded-[22px] bg-white/5 animate-pulse" />)}
             </div>
        ) : (
          groups.map((group) => {
            const isPrime = (group.author as any).security_score >= 80;
            return (
                <button key={group.author.id} className="flex flex-col items-center gap-3 flex-shrink-0 group/node" onClick={() => openViewer(group)}>
                   <div className={clsx('relative p-[3px] rounded-[24px] transition-all duration-700 group-hover/node:scale-105', group.hasUnviewed ? 'bg-primary-gradient shadow-[0_0_20px_rgba(108,99,255,0.3)]' : 'bg-white/5 group-hover/node:bg-white/10')}>
                        <div className="rounded-[21px] overflow-hidden bg-black p-0.5">
                            <img 
                                src={group.author.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${group.author.username}`} 
                                className="w-[58px] h-[58px] rounded-[18px] object-cover group-hover/node:rotate-2 transition-transform duration-500" 
                                alt="avatar" 
                                onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${group.author.username}`; }}
                            />
                        </div>
                        {isPrime && <div className="absolute -top-1 -right-1 w-5 h-5 bg-v-violet text-white rounded-lg flex items-center justify-center shadow-lg border border-black"><ShieldCheck size={10} /></div>}
                   </div>
                   <span className="text-[9px] font-black uppercase tracking-[0.1em] text-on-surface-variant opacity-60 truncate w-16 text-center italic">{group.author.display_name.split(' ')[0]}</span>
                </button>
            )
          })
        )}
      </div>

      {/* Story Viewer */}
      <AnimatePresence>
        {viewerOpen && viewerGroup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-3xl flex items-center justify-center font-sans italic italic">
            
            {/* Background Overlay */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--white) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            
            <div className="relative w-full max-w-[480px] h-full sm:max-h-[90vh] bg-surface-lowest shadow-[0_0_150px_rgba(0,0,0,1)] flex flex-col sm:rounded-[60px] overflow-hidden border border-white/5">
                {/* Header Context */}
                <div className="absolute top-0 left-0 right-0 p-10 z-20 bg-gradient-to-b from-black/80 to-transparent">
                    <div className="flex gap-2 mb-6">
                        {viewerGroup.stories.map((_, i) => (
                        <div key={i} className="h-1 flex-1 rounded-full overflow-hidden bg-white/10">
                            <motion.div className="h-full bg-v-cyan shadow-[0_0_10px_var(--v-cyan)]" initial={{ width: 0 }} animate={{ width: i < viewerIdx ? '100%' : i === viewerIdx ? `${progress}%` : '0%' }} transition={{ duration: i === viewerIdx ? 0.1 : 0 }} />
                        </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                             <div className="p-1 rounded-[15px] bg-primary-gradient">
                                <img src={viewerGroup.author.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${viewerGroup.author.username}`} className="w-10 h-10 rounded-[12px] border border-black/20" alt="aa" />
                             </div>
                             <div>
                                <h4 className="text-sm font-black text-white uppercase tracking-tighter italic">{viewerGroup.author.display_name}</h4>
                                <div className="flex items-center gap-2">
                                    <Clock size={10} className="text-v-cyan" />
                                    <span className="text-[9px] font-bold text-on-surface-variant opacity-60 uppercase tracking-widest">EXPIRES AT: {new Date(viewerGroup.stories[viewerIdx].expires_at).toLocaleTimeString()}</span>
                                </div>
                             </div>
                        </div>
                        <button onClick={() => setViewerOpen(false)} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white hover:bg-rose-500 hover:text-white transition-all"><X size={20} /></button>
                    </div>
                </div>

                {/* Main Capture */}
                <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div key={viewerIdx} initial={{ filter: 'blur(20px) grayscale(1)', opacity: 0 }} animate={{ filter: 'blur(0px) grayscale(0)', opacity: 1 }} exit={{ filter: 'blur(20px) grayscale(1)', opacity: 0 }} transition={{ duration: 0.6 }} className="w-full h-full">
                            {viewerGroup.stories[viewerIdx]?.media_type === 'video' ? (
                                <video src={viewerGroup.stories[viewerIdx].media_url} className="w-full h-full object-cover" autoPlay muted playsInline loop />
                            ) : (
                                <img src={viewerGroup.stories[viewerIdx]?.media_url} className="w-full h-full object-cover" alt="Story" />
                            )}
                        </motion.div>
                    </AnimatePresence>
                    
                    {/* Visual Glitch Overlay */}
                    <div className="absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-t from-black via-transparent to-black" />
                </div>

                {/* Footer Engagement */}
                <div className="absolute bottom-0 left-0 right-0 p-10 z-20 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
                    <div className="flex items-center gap-4 text-white/50">
                        <div className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest"><Eye size={12} className="text-v-cyan" /> {viewerGroup.stories[viewerIdx].view_count}</div>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest"><Zap size={12} className="text-v-violet" /> 1.2K</div>
                    </div>
                </div>

                {/* Interactive Taps */}
                <div className="absolute inset-0 z-10 flex">
                    <div className="w-1/3 h-full cursor-pointer" onClick={() => setViewerIdx(i => Math.max(0, i - 1))} />
                    <div className="w-1/3 h-full" />
                    <div className="w-1/3 h-full cursor-pointer" onClick={() => { if (viewerIdx < viewerGroup.stories.length - 1) setViewerIdx(i => i + 1); else setViewerOpen(false); }} />
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
