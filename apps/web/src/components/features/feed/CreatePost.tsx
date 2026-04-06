'use client';

import { useRef, useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Image as ImageIcon, Video, Smile, MapPin, X, Upload, Loader2, Zap, Radio, Globe, Lock, Users, Activity, Sparkles, Fingerprint, Cpu } from 'lucide-react';
import { submitPost } from '@/app/(main)/feed/actions';
import { uploadMedia } from '@/app/(main)/feed/upload';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

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

export default function CreatePost() {
  const { currentUser } = useAppStore();
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'nodes' | 'matrix'>('public');
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
  };

  if (!currentUser) return null;

  return (
    <div className={clsx(
        'glass-card p-0 mb-10 border-none bg-surface-lowest/40 relative overflow-hidden transition-all duration-700 rounded-[40px] italic',
        isFocused ? 'shadow-[0_0_80px_rgba(0,255,255,0.1)] ring-1 ring-v-cyan/20' : 'shadow-2xl'
    )}>
        {/* Technical Background scan lines */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ 
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)', 
            backgroundSize: '100% 4px' 
        }} />

        <form onSubmit={handleSubmit} className="relative z-10">
            {/* Input Hub */}
            <div className="p-8">
                <div className="flex gap-6 items-start mb-4">
                    <div className="relative group/avatar">
                        <img 
                            src={currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`} 
                            className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-xl group-hover/avatar:rotate-3 transition-transform" 
                            alt="avatar" 
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-v-emerald rounded-full border-2 border-black" />
                    </div>
                    <div className="flex-1">
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={`Inject intelligence, ${currentUser.displayName.split(' ')[0]}...`}
                            className="w-full bg-transparent border-none text-xl font-bold tracking-tight text-white placeholder:text-on-surface-variant/40 focus:ring-0 resize-none min-h-[80px] leading-relaxed pt-2 scrollbar-none"
                        />
                    </div>
                </div>

                {/* Media Matrix */}
                <AnimatePresence>
                    {mediaPreviews.length > 0 && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="grid grid-cols-2 gap-4 mt-6">
                            {mediaPreviews.map((m) => (
                                <div key={m.url} className="relative aspect-video rounded-3xl overflow-hidden border border-white/5 bg-black/40 group/media">
                                    {m.type === 'image' ? (
                                        <img src={m.url} alt="p" className="w-full h-full object-cover" />
                                    ) : (
                                        <video src={m.url} className="w-full h-full object-cover" muted playsInline />
                                    )}
                                    {m.uploading && <div className="absolute inset-0 bg-black/80 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-v-cyan" /></div>}
                                    <button type="button" onClick={() => removeMedia(m.url)} className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-black/80 text-white flex items-center justify-center opacity-0 group-hover/media:opacity-100 transition-opacity hover:bg-rose-500">
                                        <X size={18} />
                                    </button>
                                    <div className="absolute bottom-2 left-4 px-2 py-1 rounded-md bg-black/60 text-[8px] font-black uppercase text-v-cyan tracking-widest border border-v-cyan/20">
                                        RAW_UPLINK_OK
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {errorMsg && (
                    <div className="mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-between">
                        <span>ERROR: {errorMsg}</span>
                        <button type="button" onClick={() => setErrorMsg(null)}><X size={14} /></button>
                    </div>
                )}
            </div>

            {/* Signal Control Bar */}
            <div className="px-8 py-6 bg-white/[0.02] border-t border-white/5 flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                    <CreatorAction icon={ImageIcon} color="text-v-cyan" onClick={() => imageInputRef.current?.click()} label="Vision" />
                    <CreatorAction icon={Video} color="text-v-violet" onClick={() => videoInputRef.current?.click()} label="Motion" />
                    <div className="relative">
                        <CreatorAction icon={Smile} color="text-v-amber" onClick={() => setShowEmojiPicker(!showEmojiPicker)} label="Tone" />
                        {showEmojiPicker && (
                            <div className="absolute bottom-full mb-4 left-0 p-4 bg-surface-highest border border-white/10 rounded-2xl shadow-3xl z-50 grid grid-cols-5 gap-2 w-52 animate-fade-in">
                                {EMOJIS.map(e => <button key={e} type="button" onClick={() => { setContent(c => c + e); setShowEmojiPicker(false); }} className="text-xl hover:bg-white/10 p-2 rounded-lg">{e}</button>)}
                            </div>
                        )}
                    </div>
                    <div className="h-6 w-px bg-white/5 mx-2" />
                    <div className="flex items-center gap-1">
                        <PrivacyBtn active={privacy === 'public'} icon={Globe} onClick={() => setPrivacy('public')} />
                        <PrivacyBtn active={privacy === 'nodes'} icon={Users} onClick={() => setPrivacy('nodes')} />
                        <PrivacyBtn active={privacy === 'matrix'} icon={Lock} onClick={() => setPrivacy('matrix')} />
                    </div>
                </div>

                <div className="flex items-center gap-6">
                     <div className="flex flex-col items-end opacity-40">
                         <span className={clsx('text-[10px] font-black tracking-widest uppercase', content.length > MAX_CHARS ? 'text-rose-500' : 'text-v-cyan')}>Signal_Length</span>
                         <span className="text-[10px] font-mono">{content.length}/{MAX_CHARS}</span>
                     </div>
                     <button
                        type="submit"
                        disabled={isPosting || (content.length === 0 && mediaPreviews.length === 0)}
                        className="group relative px-10 py-5 bg-primary-gradient text-white rounded-3xl font-black uppercase tracking-[0.3em] text-[11px] shadow-3xl disabled:opacity-30 hover:scale-105 active:scale-95 transition-all overflow-hidden"
                     >
                        <span className="relative z-10 flex items-center gap-3">
                            {isPosting ? <Loader2 size={16} className="animate-spin" /> : <Radio size={16} className="animate-pulse" />}
                            {isPosting ? 'BROADCASTING...' : 'BROADCAST SIGNAL'}
                        </span>
                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
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
        <button type="button" onClick={onClick} className="group flex items-center gap-3 px-4 py-2.5 rounded-2xl hover:bg-white/5 transition-all">
            <Icon size={18} className={clsx('transition-transform group-hover:scale-110', color)} />
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-40 group-hover:opacity-100 transition-opacity">{label}</span>
        </button>
    )
}

function PrivacyBtn({ active, icon: Icon, onClick }: any) {
    return (
        <button type="button" onClick={onClick} className={clsx('w-10 h-10 rounded-xl flex items-center justify-center transition-all', active ? 'bg-v-cyan/10 text-v-cyan border border-v-cyan/30' : 'text-on-surface-variant opacity-40 hover:opacity-100')}>
            <Icon size={16} />
        </button>
    )
}
