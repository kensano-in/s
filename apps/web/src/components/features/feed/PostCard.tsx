'use client';

import { useState, useRef, useEffect } from 'react';
import type { Post } from '@/lib/types';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Repeat2, Pencil, Trash2, X, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { deletePost, editPost, submitCommentDB } from '@/app/(main)/feed/actions';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// FIX: Parses literal string attachments (e.g. `[ 📸 Sano Shinichiro.jpg ]`) and renders beautiful synthetic attachments
function renderParsedContent(rawText: string) {
  const parts = rawText.split(/(\[\s*[📸|🎬|📍].*?\])/g);
  return (
    <div className="text-[15px] leading-relaxed whitespace-pre-line text-on-surface font-medium space-y-2">
      {parts.map((p, i) => {
        if (p.startsWith('[') && p.endsWith(']')) {
          const inner = p.slice(1, -1).trim();
          const isImage = inner.includes('📸');
          const isVideo = inner.includes('🎬');
          const isLocation = inner.includes('📍');
          const label = inner.replace('📸', '').replace('🎬', '').replace('📍', '').trim();
          
          if (isImage || isVideo) {
            return (
              <div key={i} className="flex items-center gap-3 bg-surface-highest/50 px-4 py-3 rounded-xl border border-outline-variant/10 shadow-ambient w-fit mt-1 hover:bg-surface-high transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center text-lg shadow-inner">
                  {isImage ? '📸' : '🎬'}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-on-surface">{label}</span>
                  <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                    {isImage ? 'IMAGE ATTACHMENT' : 'VIDEO ASSET'}
                  </span>
                </div>
              </div>
            );
          }
          if (isLocation) {
            return (
              <div key={i} className="flex items-center gap-2 text-sm text-primary-light bg-primary-dark/10 px-3 py-1.5 rounded-full w-fit mt-1">
                📍 <span className="font-bold">{label}</span>
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
  const [particles, setParticles] = useState<{ id: number; x: number }[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isCardHovered, setIsCardHovered] = useState(false);

  // Edit / Delete state
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // FIX 11: Comment input state & Hydration Engine
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [commentsStream, setCommentsStream] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isOwner = currentUserId && post.author?.id === currentUserId;

  // Hydrate comments when expanded
  useEffect(() => {
    if (showCommentInput && commentsStream.length === 0) {
      setIsLoadingComments(true);
      import('@/lib/supabase/client').then(({ createClient }) => {
        const supabase = createClient();
        supabase.from('comments')
          .select('*, author:users(username, display_name, avatar_url, role)')
          .eq('post_id', post.id)
          .order('created_at', { ascending: true })
          .then(({ data, error }) => {
            if (!error && data) setCommentsStream(data);
            setIsLoadingComments(false);
          });
      });
    }
  }, [showCommentInput, post.id, commentsStream.length]);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isLiking = !liked;
    setLiked(isLiking);
    setLikeCount((c) => isLiking ? c + 1 : c - 1);
    if (isLiking) {
      const newParticle = { id: Date.now(), x: (Math.random() - 0.5) * 40 };
      setParticles(p => [...p, newParticle]);
      setTimeout(() => {
        setParticles(p => p.filter(part => part.id !== newParticle.id));
      }, 1500);
    }
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    if (!confirm('Delete this post permanently?')) return;
    const result = await deletePost(post.id);
    if (result?.success) setIsDeleted(true);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editContent === post.content) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    const result = await editPost(post.id, editContent);
    setIsSaving(false);
    if (result?.success) {
      post.content = editContent;
      setIsEditing(false);
    }
  };

  // FIX 11: Optimistic comment submit
  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentCount((c) => c + 1);
    
    // Optimistically inject into stream
    const tempId = `optimistic-${Date.now()}`;
    const newCommentPayload = {
      id: tempId,
      content: commentText.trim(),
      created_at: new Date().toISOString(),
      author: {
        id: currentUserId,
        display_name: 'You',  // Will be overwritten correctly on subsequent fetch or if store imported
        username: 'you',
      }
    };
    setCommentsStream(prev => [...prev, newCommentPayload]);
    
    const submittedText = commentText;
    setCommentText('');
    
    if (currentUserId) {
      submitCommentDB(post.id, currentUserId, submittedText).catch((err) => console.error("RPC Error:", err));
    }
  };

  if (isDeleted) return null;

  return (
    <article
      className="glass-card flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-[0_40px_80px_-12px_rgba(208,188,255,0.08)] relative"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
    >
      {/* Magnetic Shimmer */}
      {isCardHovered && (
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(208, 188, 255, 0.04), transparent 40%)`,
          }}
        />
      )}

      {post.communityId && (
        <div className="px-6 pt-5 pb-0 flex items-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-highest border border-outline-variant/15 shadow-ambient">
            <span className="text-sm leading-none">{post.communityIcon}</span>
            <span className="text-xs font-bold font-display tracking-wide uppercase text-primary-light cursor-pointer hover:opacity-80 transition-opacity">
              {post.communityName}
            </span>
          </div>
        </div>
      )}

      <div className="p-6 space-y-4 relative z-10">
        {/* Author row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=user`}
                alt={post.author?.displayName || 'User'}
                className="w-11 h-11 rounded-full object-cover cursor-pointer hover:opacity-90 transition-all border border-outline-variant/10 shadow-ambient"
              />
              {post.author?.isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-secondary-light border-2 border-surface-highest rounded-full" />}
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-[15px] cursor-pointer hover:text-primary-light transition-colors text-on-surface tracking-tight">
                  {post.author?.displayName || 'Unknown'}
                </span>
                {post.author?.isVerified && (
                  <div className="flex-shrink-0 bg-primary-gradient w-3.5 h-3.5 rounded-full flex items-center justify-center p-[2px] shadow-ambient">
                    <svg viewBox="0 0 24 24" fill="white" className="w-full h-full"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                  </div>
                )}
                <span className="text-xs font-medium text-on-surface-variant ml-1">
                  @{post.author?.username || 'unknown'}
                </span>
              </div>
              <div className="text-[11px] font-medium text-on-surface-variant opacity-70">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </div>
            </div>
          </div>

          {/* MoreMenu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="icon-btn text-on-surface-variant hover:text-on-surface hover:bg-surface-high transition-colors"
              id={`more-btn-${post.id}`}
            >
              <MoreHorizontal size={20} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-10 z-50 w-44 glass-card rounded-2xl shadow-2xl border border-outline-variant/20 py-1.5 animate-fade-in overflow-hidden">
                {isOwner && (
                  <>
                    <button
                      onClick={() => { setIsEditing(true); setMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-high transition-colors"
                    >
                      <Pencil size={15} className="text-primary-light" /> Edit Post
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={15} /> Delete Post
                    </button>
                    <div className="h-px bg-outline-variant/15 my-1" />
                  </>
                )}
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface-variant hover:bg-surface-high transition-colors">
                  <Share2 size={15} /> Share
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content — editable if editing */}
        <div className="pl-[56px]">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="w-full bg-surface-low text-on-surface rounded-xl px-4 py-3 text-[15px] leading-relaxed border border-primary-light/30 outline-none resize-none focus:border-primary-light/60 transition-colors"
                rows={3}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-gradient text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Check size={13} /> {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => { setIsEditing(false); setEditContent(post.content); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-highest text-on-surface-variant text-xs font-semibold hover:bg-surface-high transition-colors"
                >
                  <X size={13} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            renderParsedContent(post.content)
          )}
        </div>

        {/* Media */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className={clsx('grid gap-2 overflow-hidden pl-[56px]', post.mediaUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
            {post.mediaUrls.map((url, i) => (
              <div key={i} className="relative overflow-hidden rounded-[24px] border border-outline-variant/10 shadow-ambient" style={{ aspectRatio: post.mediaUrls!.length === 1 ? '16/9' : '1/1' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Media ${i + 1}`} className="w-full h-full object-cover cursor-pointer transition-transform duration-500 hover:scale-[1.03]" />
              </div>
            ))}
          </div>
        )}

        {/* Actions Row */}
        <div className="flex items-center justify-between pt-3 pl-[52px]">
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Like — WHITE heart */}
            <button
              onClick={handleLike}
              className={clsx(
                'relative flex items-center gap-2 cursor-pointer transition-all duration-200 px-3 py-1.5 rounded-full z-10',
                liked
                  ? 'text-white bg-white/10'
                  : 'text-on-surface-variant hover:text-white hover:bg-white/5'
              )}
              id={`like-btn-${post.id}`}
            >
              {particles.map(p => (
                <div
                  key={p.id}
                  className="absolute pointer-events-none z-50 text-[18px]"
                  style={{
                    left: `calc(50% + ${p.x}px)`,
                    bottom: '10px',
                    animation: `float-up 1.5s ease-out forwards`,
                  }}
                >
                  ✨
                </div>
              ))}
              <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
              <span className="font-semibold text-[13px]">{fmt(likeCount)}</span>
            </button>

            {/* Comment — FIX 11: Now toggles inline input */}
            <button
              onClick={() => setShowCommentInput(v => !v)}
              className={clsx(
                'flex items-center gap-2 cursor-pointer transition-all duration-200 px-3 py-1.5 rounded-full',
                showCommentInput
                  ? 'text-primary-light bg-surface-highest'
                  : 'text-on-surface-variant hover:text-primary-light hover:bg-surface-highest'
              )}
              id={`comment-btn-${post.id}`}
              aria-label={showCommentInput ? 'Hide comment input' : 'Write a comment'}
            >
              <MessageCircle size={18} />
              <span className="font-semibold text-[13px]">{fmt(commentCount)}</span>
            </button>

            {/* Repost */}
            <button className="flex items-center gap-2 cursor-pointer transition-all duration-200 px-3 py-1.5 rounded-full text-on-surface-variant hover:text-green-400 hover:bg-surface-highest">
              <Repeat2 size={18} />
              <span className="font-semibold text-[13px]">{fmt(post.shareCount ?? 0)}</span>
            </button>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setSaved((v) => !v); }}
            className="p-2 rounded-full transition-colors"
            title={saved ? 'Unsave' : 'Save'}
            id={`save-btn-${post.id}`}
          >
            <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} className={saved ? 'text-primary-light' : 'text-on-surface-variant hover:text-on-surface'} />
          </button>
        </div>

        {/* FIX 11: Comment input — visible when comment button is toggled */}
        {showCommentInput && (
          <div className="mt-3 pl-[52px] space-y-4">
            {/* Visual Stream */}
            {isLoadingComments ? (
              <div className="py-3 text-xs text-on-surface-variant animate-pulse font-medium">Fetching secure feed...</div>
            ) : commentsStream.length > 0 ? (
              <div className="space-y-3 pt-2 relative">
                {/* Visual Branch Line connecting comments */}
                <div className="absolute left-[16px] top-4 bottom-6 border-l border-outline-variant/15" />
                {commentsStream.map((c) => (
                  <div key={c.id} className="relative flex gap-3 text-sm animate-fade-in pr-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.author?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.author?.username || 'user'}`}
                      alt={c.author?.display_name || 'User'}
                      className="w-8 h-8 rounded-full object-cover z-10 border border-surface-low"
                    />
                    <div className="flex-1 bg-surface-lowest px-4 py-3 rounded-2xl rounded-tl-sm border border-outline-variant/10">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-bold text-on-surface text-[13px]">{c.author?.display_name || 'User'}</span>
                        <span className="text-[11px] text-on-surface-variant/80">@{c.author?.username}</span>
                        <span className="text-[10px] text-on-surface-variant mx-1">· {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                      </div>
                      <p className="text-[13px] text-on-surface/90 leading-relaxed break-words whitespace-pre-wrap">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Input Form */}
            <form onSubmit={handleComment} className="flex gap-2 relative z-10" id={`comment-form-${post.id}`}>
              <input
                autoFocus
                placeholder="Write a comment..."
                className="flex-1 bg-surface-low rounded-full px-4 py-2 text-sm border border-outline-variant/20 focus:outline-none focus:border-primary-light/40 text-on-surface transition-colors"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                id={`comment-input-${post.id}`}
                aria-label="Write a comment"
              />
              <button type="submit" disabled={!commentText.trim()} className="primary-btn px-4 py-2 text-sm disabled:opacity-50 transition-all font-bold" style={{ minHeight: 'unset' }}>
                Post
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}
