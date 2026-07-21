'use client';

import { useEffect, useState, useMemo, useRef, memo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { Plus, X, Play, Loader2, ChevronLeft, ChevronRight, Zap, Ghost, Eye, Clock, Activity, ShieldCheck, Sparkles, Camera, Music } from 'lucide-react';
import { createStory, markStoryViewed, fetchStoriesDB } from '@/app/(main)/feed/story-actions';
import { uploadMedia } from '@/app/(main)/feed/upload';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { getAvatarUrl } from '@/lib/utils';
import StoryCreatorStudio from './StoryCreatorStudio';

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

const StoryReel = memo(function StoryReel() {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroup, setViewerGroup] = useState<StoryGroup | null>(null);
  const [viewerIdx, setViewerIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [creatorStudioOpen, setCreatorStudioOpen] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentUser = useAppStore(s => s.currentUser);
  const supabase = useMemo(() => createClient(), []);

  const loadStoriesData = async () => {
    const result = await fetchStoriesDB();
    const data = result.data as unknown as DBStory[];

    if (data && data.length > 0) {
      const groupMap = new Map<string, StoryGroup>();
      for (const s of data) {
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

  const storyReelAudioRef = useRef<HTMLAudioElement | null>(null);

  // Story soundtrack play/pause effect
  useEffect(() => {
    if (!viewerOpen || !viewerGroup) {
      if (storyReelAudioRef.current) {
        storyReelAudioRef.current.pause();
        storyReelAudioRef.current = null;
      }
      return;
    }

    const story = viewerGroup.stories[viewerIdx];
    const rawMusic = (story as any)?.music;
    const music = Array.isArray(rawMusic) ? rawMusic[0] : rawMusic;

    if (music?.preview_url) {
      if (!storyReelAudioRef.current) {
        storyReelAudioRef.current = new Audio();
      }
      const audio = storyReelAudioRef.current;
      if (audio.src !== music.preview_url) {
        audio.src = music.preview_url;
        audio.load();
      }
      audio.currentTime = music.start_time || 0;
      audio.play().catch(() => {});
    } else if (storyReelAudioRef.current) {
      storyReelAudioRef.current.pause();
    }

    return () => {
      if (storyReelAudioRef.current) {
        storyReelAudioRef.current.pause();
      }
    };
  }, [viewerOpen, viewerGroup, viewerIdx]);

  // Audio trim loop for stories
  useEffect(() => {
    const audio = storyReelAudioRef.current;
    if (!audio || !viewerGroup) return;

    const story = viewerGroup.stories[viewerIdx];
    const rawMusic = (story as any)?.music;
    const music = Array.isArray(rawMusic) ? rawMusic[0] : rawMusic;
    if (!music) return;

    const start = music.start_time || 0;
    const duration = music.duration || 15;
    const end = start + duration;

    const handleTimeUpdate = () => {
      if (audio.currentTime > end) {
        audio.currentTime = start;
      }
      if (audio.currentTime < start) {
        audio.currentTime = start;
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [viewerOpen, viewerGroup, viewerIdx]);

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

      <div className="flex gap-5 p-5 rounded-[24px] bg-[#0c0c0e]/30 border border-white/[0.04] overflow-x-auto hide-scrollbar backdrop-blur-xl shadow-premium relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        
        {/* Add Story (Upload) */}
        <button type="button" className="flex flex-col items-center gap-2.5 flex-shrink-0 group/add" onClick={() => setShowComingSoon(true)} disabled={uploading}>
            <div className="relative">
                <div className="w-14 h-14 rounded-full p-[2px] bg-white/5 border border-white/10 group-hover/add:border-violet-500/50 transition-all duration-300 overflow-hidden shadow-soft-depth">
                    <div className="w-full h-full rounded-full overflow-hidden bg-black/40">
                        <img src={getAvatarUrl(currentUser?.username || 'me', currentUser?.avatar)} alt="Me" className="w-full h-full object-cover group-hover/add:scale-105 transition-transform opacity-55" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                        {uploading ? <Loader2 size={16} className="animate-spin text-violet-400" /> : <Plus size={18} className="text-white/60 group-hover/add:text-white transition-colors" />}
                    </div>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-[0_0_10px_rgba(108,99,255,0.4)] border border-black">
                    <Plus size={10} strokeWidth={3} />
                </div>
            </div>
            <span className="text-[10px] font-bold tracking-wide text-slate-500 group-hover/add:text-slate-300 transition-colors">Your Story</span>
        </button>

        {/* Stories */}
        {loading ? (
             <div className="flex items-center gap-5 px-2">
                {[1,2,3,4].map(i => <div key={i} className="w-14 h-14 rounded-full bg-white/5 animate-pulse" />)}
             </div>
        ) : (
          groups.map((group) => {
            const isPrime = (group.author as any).security_score >= 80;
            return (
                <button type="button" key={group.author.id} className="flex flex-col items-center gap-2.5 flex-shrink-0 group/node" onClick={() => openViewer(group)}>
                   <div className={clsx('relative p-[2.5px] rounded-full transition-all duration-300 group-hover/node:scale-105', group.hasUnviewed ? 'bg-gradient-to-tr from-violet-600 via-purple-500 to-fuchsia-500 shadow-[0_0_15px_rgba(124,58,237,0.25)]' : 'bg-white/5 group-hover/node:bg-white/15')}>
                        <div className="rounded-full overflow-hidden bg-[#050508] p-[1.5px]">
                            <img 
                                src={getAvatarUrl(group.author.username, group.author.avatar_url)} 
                                className="w-[48px] h-[48px] rounded-full object-cover transition-transform duration-300" 
                                alt="avatar" 
                            />
                        </div>
                        {isPrime && <div className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-violet-500 text-white rounded-full flex items-center justify-center shadow-lg border border-black"><ShieldCheck size={9} /></div>}
                   </div>
                   <span className="text-[10px] font-semibold tracking-wide text-slate-400 group-hover/node:text-slate-200 transition-colors truncate w-16 text-center">{group.author.display_name.split(' ')[0]}</span>
                </button>
            )
          })
        )}
      </div>

      {/* Story Viewer */}
      <AnimatePresence>
        {viewerOpen && viewerGroup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-3xl flex items-center justify-center font-sans">
            
            {/* Background Overlay */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--white) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            
            <div className="relative w-full max-w-[480px] h-full sm:max-h-[90vh] bg-surface-lowest shadow-[0_0_150px_rgba(0,0,0,1)] flex flex-col sm:rounded-[40px] overflow-hidden border border-white/5">
                {/* Header Context */}
                <div className="absolute top-0 left-0 right-0 p-8 z-20 bg-gradient-to-b from-black/90 to-transparent">
                    <div className="flex gap-2 mb-5">
                        {viewerGroup.stories.map((_, i) => (
                        <div key={i} className="h-1 flex-1 rounded-full overflow-hidden bg-white/10">
                            <motion.div className="h-full bg-violet-500 shadow-[0_0_10px_rgba(108,99,255,0.5)]" initial={{ width: 0 }} animate={{ width: i < viewerIdx ? '100%' : i === viewerIdx ? `${progress}%` : '0%' }} transition={{ duration: i === viewerIdx ? 0.1 : 0 }} />
                        </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                             <div className="p-[1.5px] rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600">
                                <img src={getAvatarUrl(viewerGroup.author.username, viewerGroup.author.avatar_url)} className="w-9 h-9 rounded-full border border-black/20" alt="aa" />
                             </div>
                             <div>
                                <h4 className="text-sm font-bold text-white tracking-tight">{viewerGroup.author.display_name}</h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <Clock size={9} className="text-violet-400" />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">EXPIRES AT: {new Date(viewerGroup.stories[viewerIdx].expires_at).toLocaleTimeString()}</span>
                                </div>
                             </div>
                        </div>
                        <button type="button" onClick={() => setViewerOpen(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-rose-500/20 hover:text-rose-400 transition-all"><X size={18} /></button>
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

                    {/* Spotify soundtrack badge */}
                    {(() => {
                      const story = viewerGroup.stories[viewerIdx];
                      const rawMusic = (story as any)?.music;
                      const music = Array.isArray(rawMusic) ? rawMusic[0] : rawMusic;
                      if (!music) return null;
                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute top-28 left-6 right-6 z-20 flex items-center gap-2.5 px-3 py-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl w-fit max-w-[280px]"
                        >
                          {music.artwork_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={music.artwork_url} 
                              alt="Album Art" 
                              className="w-7 h-7 rounded-lg object-cover border border-white/5 animate-spin-slow" 
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                              <Music size={12} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-white truncate max-w-[160px]">{music.track_name}</p>
                            <p className="text-[8px] text-neutral-400 truncate max-w-[160px] mt-0.5">{music.artist_name}</p>
                          </div>
                        </motion.div>
                      );
                    })()}
                    
                    {/* Visual Glitch Overlay */}
                    <div className="absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-t from-black via-transparent to-black" />
                </div>

                {/* Footer Engagement */}
                <div className="absolute bottom-0 left-0 right-0 p-8 z-20 bg-gradient-to-t from-black/95 to-transparent flex items-center justify-between">
                    <div className="flex items-center gap-4 text-white/50">
                        <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider"><Eye size={12} className="text-violet-400" /> {viewerGroup.stories[viewerIdx].view_count}</div>
                        <div className="w-px h-3 bg-white/10" />
                        <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider"><Zap size={12} className="text-violet-400" /> 1.2K</div>
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

      {/* Story Creator Studio Overlay */}
      {creatorStudioOpen && (
        <StoryCreatorStudio
          currentUserId={currentUser?.id}
          currentUser={currentUser}
          onClose={() => setCreatorStudioOpen(false)}
          onSuccess={() => {
            setCreatorStudioOpen(false);
            loadStoriesData();
          }}
        />
      )}

      {/* Coming Soon Note Popup */}
      <AnimatePresence>
        {showComingSoon && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => setShowComingSoon(false)}
            className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 cursor-pointer"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }} 
              animate={{ scale: 1, y: 0, opacity: 1 }} 
              exit={{ scale: 0.9, y: 20, opacity: 0 }} 
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[360px] bg-[#0c0c0f]/90 border border-white/[0.08] p-8 rounded-[28px] shadow-[0_0_80px_rgba(0,0,0,0.8)] text-center relative overflow-hidden backdrop-blur-xl"
            >
              {/* Background gradient glow */}
              <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-violet-600/10 blur-[60px]" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-fuchsia-600/10 blur-[60px]" />

              <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/[0.08] flex items-center justify-center mx-auto text-violet-400 mb-6 shadow-inner">
                <Camera size={20} className="text-violet-400" />
              </div>

              <h3 className="text-base font-bold text-white mb-2 tracking-tight">Stories Coming Soon</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6 px-2">
                We're currently putting the finishing touches on the new Stories feature. Stay tuned!
              </p>

              <button
                type="button"
                onClick={() => setShowComingSoon(false)}
                className="w-full py-3 rounded-xl bg-white hover:bg-slate-200 text-black text-xs font-semibold tracking-wide transition-all shadow-md"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

StoryReel.displayName = 'StoryReel';
export default StoryReel;
