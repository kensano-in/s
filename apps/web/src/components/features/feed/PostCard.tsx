'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import type { Post } from '@/lib/types';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Repeat2, Pencil, Trash2, X, Check, ShieldCheck, Zap, Sparkles, AlertCircle, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { deletePost, editPost, submitCommentDB, toggleLikeDB, toggleSaveDB } from '@/app/(main)/feed/actions';
import { motion, AnimatePresence } from 'framer-motion';
import KineticIcon from '@/components/ui/KineticIcon';
import { SPRING } from '@/lib/motion';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function renderParsedContent(rawText: string) {
  const parts = rawText.split(/(\[\s*[📸|🎬|📍].*?\])/g);
  return (
    <div className="text-[15px] leading-relaxed whitespace-pre-line text-on-surface font-medium space-y-3 italic tracking-tight">
      {parts.map((p, i) => {
        if (p.startsWith('[') && p.endsWith(']')) {
          const inner = p.slice(1, -1).trim();
          const isImage = inner.includes('📸');
          const isVideo = inner.includes('🎬');
          const isLocation = inner.includes('📍');
          const label = inner.replace('📸', '').replace('🎬', '').replace('📍', '').trim();
          
          if (isImage || isVideo) {
            return (
              <div key={i} className="flex items-center gap-4 bg-surface-lowest/40 px-5 py-4 rounded-[24px] border border-white/5 shadow-2xl w-fit mt-2 hover:bg-surface-high transition-all cursor-pointer group/asset overflow-hidden relative">
                <div className="absolute inset-0 bg-primary-gradient opacity-0 group-hover/asset:opacity-10 transition-opacity" />
                <div className="w-12 h-12 rounded-xl bg-surface-high flex items-center justify-center text-xl shadow-inner border border-white/5 group-hover/asset:scale-110 transition-transform">
                  {isImage ? '📸' : '🎬'}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black text-white italic uppercase tracking-tighter">{label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-v-cyan uppercase tracking-widest font-black opacity-60">
                      {isImage ? 'IMAGE' : 'VIDEO'}
                    </span>
                    <span className="text-[8px] text-white/20 uppercase tracking-tighter font-bold">
                      ({isImage ? 'View' : 'Play'})
                    </span>
                  </div>
                </div>
              </div>
            );
          }
          if (isLocation) {
            return (
              <div key={i} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-v-cyan bg-v-cyan/10 px-4 py-2 rounded-full w-fit mt-2 border border-v-cyan/20 italic shadow-[0_0_15px_rgba(6,182,212,0.1)] group/geo">
                <KineticIcon icon={AlertCircle} size={10} color="var(--v-cyan)" pulse glow />
                LOCATION: <span className="text-white">{label}</span>
              </div>
            );
          }
        }
        return <span key={i}>{p}</span>;
      })}
    </div>
  );
}

interface Props {
  post: Post;
  currentUserId?: string;
}

export default function PostCard({ post, currentUserId }: Props) {
  const [liked, setLiked] = useState<boolean>(post.isLiked ?? false);
  const [saved, setSaved] = useState<boolean>(post.isSaved ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [repostToast, setRepostToast] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [commentsStream, setCommentsStream] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const isOwner = currentUserId && post.author?.id === currentUserId;

  // Identity Status Logic (Security Score Check simulation)
  const isPrimeUser = (post.author as any)?.security_score >= 80 || post.author?.isVerified;

  useEffect(() => {
    if (!showCommentInput) return;
    const loadComments = async () => {
      setIsLoadingComments(true);
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase
        .from('comments')
        .select('*, author:users(id, username, display_name, avatar_url, security_score)')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      setCommentsStream(data || []);
      setIsLoadingComments(false);
    };
    loadComments();
  }, [showCommentInput, post.id]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return;
    const isLiking = !liked;
    setLiked(isLiking);
    setLikeCount((c) => isLiking ? c + 1 : c - 1);
    await toggleLikeDB(post.id, currentUserId, isLiking);
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return;
    const isSaving = !saved;
    setSaved(isSaving);
    await toggleSaveDB(post.id, currentUserId, isSaving);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setIsSaving(true);
    const result = await editPost(post.id, editContent.trim());
    if (result?.success || !result?.error) {
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const handleRepost = () => {
    setRepostToast(true);
    setTimeout(() => setRepostToast(false), 2000);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/feed#${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard.');
    } catch(err) {
      console.log('Failed to copy', err);
    }
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    if (!confirm('Delete this post?')) return;
    const result = await deletePost(post.id);
    if (result?.success) setIsDeleted(true);
  };

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentCount((c) => c + 1);
    const tempId = `opt-${Date.now()}`;
    const newCommentPayload = { id: tempId, content: commentText.trim(), created_at: new Date().toISOString(), author: { id: currentUserId, display_name: 'You', username: 'you' } };
    setCommentsStream(prev => [...prev, newCommentPayload]);
    const submittedText = commentText;
    setCommentText('');
    if (currentUserId) submitCommentDB(post.id, currentUserId, submittedText);
  };

  if (isDeleted) return null;

  return (
    <motion.article
      layout
      whileHover={{ y: -3, boxShadow: '0 45px 100px -20px rgba(0,0,0,0.6)' }}
      whileTap={{ scale: 0.98 }}
      transition={SPRING.micro}
      className="glass-card flex flex-col group overflow-hidden transition-all duration-primary relative rounded-[40px] border-none bg-surface-lowest/40 backdrop-blur-3xl italic"
      onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMousePos({ x: e.clientX - r.left, y: e.clientY - r.top }); }}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
    >
      {/* Magnetic Signal Shimmer */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ background: `radial-gradient(500px circle at ${mousePos.x}px ${mousePos.y}px, rgba(108, 99, 255, 0.05), transparent 40%)` }} />
      
      {/* Sweep Glint */}
      <motion.div 
        animate={{ x: ['-100%', '300%'] }}
        transition={{ repeat: Infinity, duration: 6, ease: 'linear', delay: 2 }}
        className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent skew-x-12 pointer-events-none z-10"
      />

      {post.communityId && (
        <div className="px-8 pt-7 pb-0 flex items-center relative z-10">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-surface-high/50 border border-white/5 shadow-xl hover:bg-white hover:text-black transition-all cursor-pointer group/comm">
            <span className="text-[10px] font-black uppercase tracking-widest text-v-cyan group-hover/comm:text-black italic">COMMUNITY: {post.communityName?.toUpperCase() || 'GENERAL'}</span>
            <KineticIcon icon={Zap} size={12} color="var(--v-cyan)" active pulse />
          </div>
        </div>
      )}

      <div className="p-8 space-y-6 relative z-10">
        {/* Author row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group/avatar cursor-pointer">
              <div className={clsx('w-14 h-14 rounded-[24px] p-0.5 border-2 transition-all duration-500 overflow-hidden shadow-2xl', isPrimeUser ? 'border-v-violet shadow-[0_0_20px_rgba(108,99,255,0.3)]' : 'border-white/5 group-hover/avatar:border-v-cyan')}>
                  <img src={post.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=user`} className="w-full h-full object-cover rounded-[20px] group-hover/avatar:scale-110 transition-transform duration-700" alt="avatar" />
              </div>
              {isPrimeUser && <div className="absolute -top-1 -right-1 bg-v-violet p-1 rounded-lg shadow-xl"><KineticIcon icon={ShieldCheck} size={12} color="white" active /></div>}
            </div>
            <div>
                <div className="flex items-center gap-2 mb-0.5">
                   <h4 className="text-base font-black italic text-white uppercase tracking-tighter leading-none">{post.author?.displayName}</h4>
                   {isPrimeUser && (
                     <div className="flex flex-col">
                        <span className="text-[8px] font-black bg-v-violet/10 text-v-violet border border-v-violet/20 px-2 py-0.5 rounded-full tracking-widest uppercase mb-1">VERIFIED</span>
                        <span className="text-[7px] text-v-violet/60 font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Verified User</span>
                     </div>
                   )}
                </div>
                <div className="flex items-center gap-2 opacity-50">
                   <span className="text-[10px] font-bold text-v-cyan italic tracking-widest uppercase">@{post.author?.username}</span>
                   <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-tighter mb-0.5">• {formatDistanceToNow(new Date(post.createdAt), { addSuffix: false })} ago</span>
                </div>
            </div>
          </div>

          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(v => !v)} className="w-10 h-10 rounded-2xl flex items-center justify-center text-on-surface-variant hover:bg-surface-high hover:text-white transition-all">
                <KineticIcon icon={MoreHorizontal} size={20} color="currentColor" active={menuOpen} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 top-12 z-50 w-48 glass-card border-none bg-surface-lowest rounded-[28px] shadow-3xl py-2 overflow-hidden italic">
                  {isOwner && (
                    <>
                      <button onClick={() => { setIsEditing(true); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface hover:bg-primary-gradient hover:text-white transition-all"><KineticIcon icon={Pencil} size={14} /> Edit Post</button>
                      <button onClick={handleDelete} className="w-full flex items-center gap-3 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><KineticIcon icon={Trash2} size={14} /> Delete Post</button>
                    </>
                  )}
                  <button onClick={handleShare} className="w-full flex items-center gap-3 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:bg-white/5 transition-all"><KineticIcon icon={Share2} size={14} /> Share Post</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Content */}
        <div className="pl-0 sm:pl-18">
          {isEditing ? (
            <div className="space-y-4">
              <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="w-full bg-surface-lowest border border-v-violet/30 text-white rounded-[32px] px-6 py-5 text-sm font-bold italic outline-none resize-none focus:border-v-violet transition-all shadow-inner" rows={4} autoFocus />
              <div className="flex gap-2">
                <button onClick={handleSaveEdit} disabled={isSaving} className="px-6 py-2.5 rounded-full bg-primary-gradient text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"> {isSaving ? 'SAVING...' : 'SAVE CHANGES'} </button>
                <button onClick={() => { setIsEditing(false); setEditContent(post.content); }} className="px-6 py-2.5 rounded-full bg-surface-high text-on-surface-variant text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all"> CANCEL </button>
              </div>
            </div>
          ) : (
            renderParsedContent(post.content)
          )}
        </div>

        {/* Media Grid */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className={clsx('grid gap-4 overflow-hidden pl-0 sm:pl-18', post.mediaUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
            {post.mediaUrls.map((url, i) => (
              <div key={i} className="relative overflow-hidden rounded-[40px] border border-white/5 shadow-3xl group/media cursor-pointer" style={{ aspectRatio: post.mediaUrls!.length === 1 ? '16/9' : '1/1' }}>
                <img src={url} className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-110" alt="media" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center"><Sparkles size={32} className="text-v-cyan" /></div>
              </div>
            ))}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 pl-0 sm:pl-18">
          <div className="flex items-center gap-2">
            <ActionBtn active={liked} icon={Heart} label={fmt(likeCount)} activeColor="text-rose-500" onClick={handleLike} />
            <ActionBtn active={showCommentInput} icon={MessageCircle} label={fmt(commentCount)} activeColor="text-v-cyan" onClick={() => setShowCommentInput(!showCommentInput)} />
            <div className="relative">
              <ActionBtn icon={Repeat2} label={fmt(post.shareCount || 0)} activeColor="text-v-emerald" onClick={handleRepost} />
              <AnimatePresence>
                {repostToast && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: -4 }} exit={{ opacity: 0 }} className="absolute -top-8 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-widest text-v-emerald bg-v-emerald/10 border border-v-emerald/20 px-3 py-1 rounded-full whitespace-nowrap">
                    Coming Soon
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <button onClick={handleSave} className={clsx('w-12 h-12 rounded-[20px] flex items-center justify-center transition-all group/save', saved ? 'bg-v-violet text-white shadow-xl scale-110' : 'text-on-surface-variant hover:text-white hover:bg-white/5')}>
              <KineticIcon icon={Bookmark} size={20} color="currentColor" active={saved} pulse={saved} glow={saved} />
          </button>
        </div>

        {/* Inline Comment Feed */}
        <AnimatePresence>
            {showCommentInput && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-4 pl-0 sm:pl-18 space-y-6 overflow-hidden">
                <div className="w-full h-px bg-white/5 mb-6" />
                {isLoadingComments ? <div className="text-[9px] font-black uppercase text-v-cyan animate-pulse tracking-[0.3em]">Loading Comments...</div> : (
                  <div className="space-y-6 relative ml-4 border-l-2 border-white/5 pl-8">
                     {commentsStream.map(c => (
                        <div key={c.id} className="relative group/cmnt">
                           <div className="absolute -left-[41px] top-2 w-3 h-3 rounded-full bg-surface border-2 border-white/10 group-hover/cmnt:bg-v-cyan transition-colors" />
                           <div className="flex flex-col gap-1.5 p-5 bg-surface-lowest/60 rounded-[28px] border border-white/5 group-hover/cmnt:bg-surface-low transition-all">
                              <div className="flex items-center gap-3 mb-1">
                                 <span className="text-xs font-black text-white italic uppercase tracking-tighter">{c.author?.display_name || 'Anonymous User'}</span>
                                 <span className="text-[9px] font-bold text-v-cyan opacity-40">@{c.author?.username}</span>
                              </div>
                              <p className="text-[13px] font-medium leading-relaxed opacity-70 italic tracking-tight">{c.content}</p>
                           </div>
                        </div>
                     ))}
                  </div>
                )}
                <form onSubmit={handleComment} className="flex gap-4 p-2 bg-surface-lowest rounded-full border border-white/5 shadow-inner">
                   <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write a comment..." className="flex-1 bg-transparent border-none text-sm font-bold italic focus:outline-none pl-6 placeholder:text-on-surface-variant/30" />
                   <button type="submit" disabled={!commentText.trim()} className="w-12 h-12 rounded-full bg-primary-gradient flex items-center justify-center text-white shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-30"><Plus size={20} /></button>
                </form>
              </motion.div>
            )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

function ActionBtn({ active, icon: Icon, label, activeColor, onClick }: any) {
  return (
    <button onClick={onClick} className={clsx('flex items-center gap-2.5 px-5 py-2.5 rounded-full transition-all duration-300 font-bold italic text-xs uppercase tracking-widest group/act', active ? `${activeColor} bg-white/5 shadow-xl` : 'text-on-surface-variant/60 hover:text-white hover:bg-white/[0.03]')}>
       <KineticIcon 
        icon={Icon} 
        size={16} 
        color={active ? activeColor.replace('text-', 'var(--') + ')' : 'currentColor'} 
        active={active} 
        pulse={active}
       />
       <span className="mt-0.5">{label}</span>
    </button>
  );
}
