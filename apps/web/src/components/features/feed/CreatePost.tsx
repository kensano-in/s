'use client';

import { useRef, useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Image as ImageIcon, Video, Smile, MapPin, X, Upload, Loader2, Zap, Radio, Globe, Lock, Users, Activity, Sparkles, Fingerprint, Cpu } from 'lucide-react';
import { submitPost } from '@/app/(main)/feed/actions';
import { uploadMedia } from '@/app/(main)/feed/upload';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { getAvatarUrl } from '@/lib/utils';

const EMOJIS = ['⚡','💎','🧠','🔥','🌊','🎯','🚀','🎭','💡','✨','🏆','💫','🌈','🧿','👁️','🦾','🛰️','🧬','📡','🧪'];
const MAX_CHARS = 500;

interface MediaPreview {
  url: string;
  publicUrl: string;
  type: 'image' | 'video';
  name: string;
  uploading: boolean;
  error: boolean;
}

interface CreatePostProps {
  onSuccess?: () => void;
}

export default function CreatePost({ onSuccess }: CreatePostProps) {
  const currentUser = useAppStore(s => s.currentUser);
  const isAuthLoading = useAppStore(s => s.isAuthLoading);
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'followers' | 'private'>('public');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [mediaPreviews, setMediaPreviews] = useState<MediaPreview[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 300) + 'px';
    }
  }, [content]);

  // Early returns MUST be after all hooks (React Rules of Hooks)
  if (isAuthLoading) return (
    <div className="glass-card p-8 mb-10 border-none bg-surface-lowest/40 rounded-[40px] shadow-2xl animate-pulse">
      <div className="flex gap-6 items-start">
        <div className="w-14 h-14 rounded-2xl bg-white/5" />
        <div className="flex-1 space-y-3 pt-2">
          <div className="h-4 bg-white/5 rounded-full w-3/4" />
          <div className="h-4 bg-white/5 rounded-full w-1/2" />
        </div>
      </div>
    </div>
  );

  if (!currentUser) return null;

  const handleFileSelect = async (files: FileList | null, type: 'image' | 'video') => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const blobUrl = URL.createObjectURL(file);
    
    const preview: MediaPreview = {
      url: blobUrl,
      publicUrl: '',
      type,
      name: file.name,
      uploading: true,
      error: false,
    };
    setMediaPreviews(prev => [...prev, preview]);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'posts');
    const result = await uploadMedia(fd);
    
    setMediaPreviews(prev => prev.map(p =>
      p.url === blobUrl
        ? { ...p, publicUrl: 'url' in result ? result.url : '', uploading: false, error: 'error' in result }
        : p
    ));
  };

  const removeMedia = (blobUrl: string) => {
    URL.revokeObjectURL(blobUrl);
    setMediaPreviews(prev => prev.filter(p => p.url !== blobUrl));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPosting || (!content.trim() && mediaPreviews.length === 0)) return;

    setIsPosting(true);
    const fd = new FormData();
    fd.append('content', content);
    fd.append('privacy', privacy);
    mediaPreviews.forEach(p => { if (p.publicUrl) fd.append('mediaUrls', p.publicUrl); });

    setErrorMsg(null);
    const res = await submitPost(fd);
    
    if (res?.error) {
       setErrorMsg(res.error);
       setIsPosting(false);
       return;
    }

    mediaPreviews.forEach(p => URL.revokeObjectURL(p.url));
    setMediaPreviews([]);
    setContent('');
    setIsPosting(false);
    router.refresh();
    if (onSuccess) onSuccess();
  };

  if (!currentUser) return null;

  return (
    <div className={clsx(
        'glass-card p-0 mb-6 border border-white/[0.03] border-t-white/[0.08] bg-[#0c0c0e]/30 relative overflow-hidden transition-all duration-page rounded-[24px]',
        isFocused ? 'shadow-[0_20px_50px_rgba(108,99,255,0.06),inset_0_1px_0_rgba(255,255,255,0.08)] border-white/[0.06] border-t-white/[0.12] bg-[#0c0c0e]/45' : 'shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)]'
    )}>
        <form onSubmit={handleSubmit} className="relative z-10">
            {/* Input Hub */}
            <div className="p-6 pb-4">
                <span className="font-mono text-[9px] text-violet-400/80 tracking-[0.25em] font-black uppercase mb-3 block select-none">
                  // Broadcast Signal
                </span>
                <div className="flex gap-4 items-start">
                    <div className="relative group/avatar flex-shrink-0">
                        <div className={clsx(
                            'w-11 h-11 rounded-full p-[1px] bg-white/10 border transition-all duration-300 overflow-hidden shadow-soft-depth',
                            isFocused ? 'border-violet-500 shadow-[0_0_12px_rgba(108,99,255,0.4)]' : 'border-white/[0.08]'
                        )}>
                            <img 
                                src={getAvatarUrl(currentUser.username, currentUser.avatar)} 
                                className="w-full h-full rounded-full object-cover group-hover/avatar:scale-105 transition-transform duration-primary" 
                                alt="avatar" 
                            />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#09090b] shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                    </div>
                    <div className="flex-1">
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={`What's on your mind, ${currentUser.displayName.split(' ')[0]}?`}
                            className="w-full bg-transparent border-none text-[16px] font-medium tracking-tight text-white placeholder:text-slate-500/60 focus:ring-0 resize-none min-h-[70px] leading-relaxed pt-2.5 scrollbar-none font-sans mb-2"
                        />
                    </div>
                </div>

                {/* Media Matrix */}
                <AnimatePresence>
                    {mediaPreviews.length > 0 && (
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="grid grid-cols-2 gap-4 mt-4 mb-6">
                            {mediaPreviews.map((m) => (
                                <div key={m.url} className="relative aspect-video rounded-[18px] overflow-hidden border border-white/[0.08] bg-black/40 group/media">
                                    {m.type === 'image' ? (
                                        <img src={m.url} alt="p" className="w-full h-full object-cover" />
                                    ) : (
                                        <video src={m.url} className="w-full h-full object-cover" muted playsInline />
                                    )}
                                    {m.uploading && <div className="absolute inset-0 bg-black/80 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-white" /></div>}
                                    <button type="button" onClick={() => removeMedia(m.url)} className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-black/60 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover/media:opacity-100 transition-opacity hover:bg-rose-500">
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {errorMsg && (
                    <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
                        <span>Error: {errorMsg}</span>
                        <button type="button" onClick={() => setErrorMsg(null)}><X size={12} /></button>
                    </div>
                )}
            </div>

            {/* Post Options */}
            <div className="px-6 py-4 bg-white/[0.01] border-t border-white/[0.03] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                    <CreatorAction icon={ImageIcon} color="text-white/60 group-hover:text-white" onClick={() => imageInputRef.current?.click()} label="Image" />
                    <CreatorAction icon={Video} color="text-white/60 group-hover:text-white" onClick={() => videoInputRef.current?.click()} label="Video" />
                    <div className="relative">
                        <CreatorAction icon={Smile} color="text-white/60 group-hover:text-white" onClick={() => setShowEmojiPicker(!showEmojiPicker)} label="Emoji" />
                        {showEmojiPicker && (
                            <div className="absolute bottom-full mb-4 left-0 p-4 bg-[#09090b] border border-white/[0.08] rounded-[20px] shadow-premium z-50 grid grid-cols-5 gap-2.5 w-56 animate-fade-in backdrop-blur-2xl">
                                {EMOJIS.map(e => <button key={e} type="button" onClick={() => { setContent(c => c + e); setShowEmojiPicker(false); }} className="text-lg hover:bg-white/10 p-2 rounded-lg transition-all">{e}</button>)}
                            </div>
                        )}
                    </div>
                    <div className="h-6 w-px bg-white/[0.06] mx-2" />
                    <div className="flex items-center gap-1">
                        <PrivacyBtn active={privacy === 'public'} icon={Globe} onClick={() => setPrivacy('public')} title="Public" />
                        <PrivacyBtn active={privacy === 'followers'} icon={Users} onClick={() => setPrivacy('followers')} title="Followers Only" />
                        <PrivacyBtn active={privacy === 'private'} icon={Lock} onClick={() => setPrivacy('private')} title="Private (Only Me)" />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                      {/* Premium Circular SVG Progress Indicator */}
                      {(() => {
                        const percentage = Math.min((content.length / MAX_CHARS) * 100, 100);
                        const circumference = 2 * Math.PI * 6.5;
                        const strokeDashoffset = circumference - (percentage / 100) * circumference;
                        const isCloseToLimit = content.length >= MAX_CHARS - 100;
                        const isOverLimit = content.length > MAX_CHARS;
                        const strokeColor = isOverLimit ? 'stroke-rose-500' : isCloseToLimit ? 'stroke-amber-500' : 'stroke-violet-500';
                        return (
                          <div className="flex items-center gap-2">
                            {isCloseToLimit && (
                              <span className={clsx("text-[9px] font-mono font-bold tracking-tight", isOverLimit ? "text-rose-500" : "text-slate-500")}>
                                {MAX_CHARS - content.length}
                              </span>
                            )}
                            <div className="relative w-4.5 h-4.5">
                              <svg className="w-full h-full transform -rotate-90">
                                <circle
                                  cx="9"
                                  cy="9"
                                  r="6.5"
                                  className="stroke-white/[0.04]"
                                  strokeWidth="1.75"
                                  fill="transparent"
                                />
                                <circle
                                  cx="9"
                                  cy="9"
                                  r="6.5"
                                  className={clsx("transition-all duration-100", strokeColor)}
                                  strokeWidth="1.75"
                                  fill="transparent"
                                  strokeDasharray={circumference}
                                  strokeDashoffset={strokeDashoffset}
                                  strokeLinecap="round"
                                />
                              </svg>
                            </div>
                          </div>
                        );
                      })()}
                      <button
                        type="submit"
                        disabled={isPosting || (content.length === 0 && mediaPreviews.length === 0)}
                        className="group relative px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-[12px] shadow-[0_0_12px_rgba(108,99,255,0.25)] border border-violet-500/20 disabled:opacity-20 disabled:shadow-none hover:shadow-[0_0_18px_rgba(108,99,255,0.4)] active:scale-95 transition-all duration-300 overflow-hidden"
                      >
                        <span className="relative z-10 flex items-center gap-2">
                            {isPosting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            {isPosting ? 'Posting...' : 'Post'}
                        </span>
                      </button>
                </div>
            </div>

            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e.target.files, 'image')} />
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => handleFileSelect(e.target.files, 'video')} />
        </form>
    </div>
  );
}

function CreatorAction({ icon: Icon, color, onClick, label }: any) {
    return (
        <button type="button" onClick={onClick} className="group flex items-center gap-2 px-3.5 py-2 rounded-xl hover:bg-white/[0.04] transition-all">
            <Icon size={16} className={clsx('transition-transform group-hover:scale-105 opacity-60 group-hover:opacity-100', color)} />
            <span className="text-[10px] font-bold tracking-wider text-slate-400 group-hover:text-slate-200 transition-colors uppercase">{label}</span>
        </button>
    )
}

function PrivacyBtn({ active, icon: Icon, onClick, title }: any) {
    return (
        <button type="button" onClick={onClick} title={title} className={clsx('w-8 h-8 rounded-xl flex items-center justify-center transition-all border outline-none', active ? 'bg-violet-600 text-white border-violet-500/30 shadow-[0_0_10px_rgba(124,58,237,0.3)]' : 'text-slate-400 hover:text-white border-transparent hover:bg-white/5')}>
            <Icon size={14} />
        </button>
    )
}
