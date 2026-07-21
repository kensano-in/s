'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Loader2, Send, MessageCircle, Pin, CornerDownRight, CheckCircle2, ChevronDown, ChevronUp, UserPlus, UserCheck, Sparkles } from 'lucide-react';
import { getCommentsDB, submitCommentDB, toggleCommentLikeDB } from '@/app/(main)/feed/actions';
import { useAppStore } from '@/lib/store';
import { getAvatarUrl } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import clsx from 'clsx';

const QUICK_EMOJIS = ['❤️', '🙌', '🔥', '👏', '✅', '😍', '😢', '😂'];

interface Comment {
  id: string;
  content: string;
  created_at: string;
  parent_id?: string | null;
  post_id?: string;
  author_id?: string;
  likeCount?: number;
  liked?: boolean;
  comment_likes?: { user_id: string }[];
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified?: boolean;
  } | null;
}

interface Props {
  postId: string;
  commentCount: number;
  currentUserId?: string;
  onClose: () => void;
  postAuthorId?: string;
}

export default function CommentSheet({ postId, commentCount, currentUserId, onClose, postAuthorId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localCount, setLocalCount] = useState(commentCount);
  const [sortBy, setSortBy] = useState<'newest' | 'top'>('top');
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentUser = useAppStore(s => s.currentUser);
  const isFollowing = useAppStore(s => s.isFollowing);
  const toggleFollow = useAppStore(s => s.toggleFollow);

  // Load comments
  const loadComments = useCallback(async () => {
    setLoading(true);
    const res = await getCommentsDB(postId);
    if (res.success && res.data) {
      // Map DB schema to interface
      const mapped = (res.data as any[]).map((c: any) => {
        const likes = c.comment_likes || [];
        return {
          id: c.id,
          content: c.content,
          created_at: c.created_at,
          parent_id: c.parent_id,
          post_id: c.post_id,
          author_id: c.author_id,
          likeCount: likes.length,
          liked: currentUserId ? likes.some((l: any) => l.user_id === currentUserId) : false,
          comment_likes: likes,
          author: c.author
        };
      });
      setComments(mapped);
      setLocalCount(mapped.length);
    }
    setLoading(false);
  }, [postId, currentUserId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Real-time listener for comments updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`comments_realtime:${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, loadComments]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Focus input on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // Classify comments into root & replies
  const groupedComments = useMemo(() => {
    const roots = comments.filter(c => !c.parent_id);
    const replies: Record<string, Comment[]> = {};
    
    comments.forEach(c => {
      if (c.parent_id) {
        if (!replies[c.parent_id]) replies[c.parent_id] = [];
        replies[c.parent_id].push(c);
      }
    });

    // Sort roots
    if (sortBy === 'top') {
      roots.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    } else {
      roots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // Sort replies chronologically
    Object.keys(replies).forEach(parentId => {
      replies[parentId].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

    return { roots, replies };
  }, [comments, sortBy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || submitting || !currentUserId) return;
    setSubmitting(true);
    const content = text.trim();
    setText('');

    const parentId = replyingTo?.id || null;

    // Optimistic insert
    const tempComment: Comment = {
      id: `opt-${Date.now()}`,
      content,
      created_at: new Date().toISOString(),
      parent_id: parentId,
      likeCount: 0,
      liked: false,
      author: {
        id: currentUserId,
        username: currentUser?.username || 'you',
        display_name: currentUser?.displayName || 'You',
        avatar_url: currentUser?.avatar || null,
        is_verified: currentUser?.isVerified || false,
      },
    };

    setComments(prev => [...prev, tempComment]);
    setLocalCount(c => c + 1);

    if (parentId) {
      // Auto expand replies for parent
      setExpandedComments(prev => ({ ...prev, [parentId]: true }));
    }

    setReplyingTo(null);

    await submitCommentDB(postId, currentUserId, content, parentId || undefined);
    setSubmitting(false);
    
    // Reload to get real database IDs & state
    await loadComments();
  };

  const handleEmojiReaction = (emoji: string) => {
    setText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleReplyClick = (comment: Comment) => {
    // If replying to a reply, use its parent_id so all replies group under same thread root
    const parentId = comment.parent_id || comment.id;
    setReplyingTo({ id: parentId, username: comment.author?.username || 'unknown' });
    setText(`@${comment.author?.username} `);
    inputRef.current?.focus();
  };

  const toggleCommentLike = async (commentId: string) => {
    if (!currentUserId) return;
    
    const originalComment = comments.find(c => c.id === commentId);
    if (!originalComment) return;
    
    const previousLiked = originalComment.liked ?? false;
    const previousLikeCount = originalComment.likeCount ?? 0;
    const nextLiked = !previousLiked;
    
    // Optimistic UI state update
    setComments(prev =>
      prev.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            liked: nextLiked,
            likeCount: previousLikeCount + (nextLiked ? 1 : -1)
          };
        }
        return c;
      })
    );

    try {
      const res = await toggleCommentLikeDB(commentId, currentUserId, nextLiked);
      if (!res.success) {
        console.warn('Comment like failed on DB, rolling back:', res.error);
        // Rollback
        setComments(prev =>
          prev.map(c => {
            if (c.id === commentId) {
              return {
                ...c,
                liked: previousLiked,
                likeCount: previousLikeCount
              };
            }
            return c;
          })
        );
      }
    } catch (err: any) {
      console.error('Comment like error, rolling back:', err);
      // Rollback
      setComments(prev =>
        prev.map(c => {
          if (c.id === commentId) {
            return {
              ...c,
              liked: previousLiked,
              likeCount: previousLikeCount
            };
          }
          return c;
        })
      );
    }
  };

  const toggleRepliesExpanded = (parentId: string) => {
    setExpandedComments(prev => ({
      ...prev,
      [parentId]: !prev[parentId]
    }));
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="cs-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Slide-Up Bottom Sheet */}
      <motion.div
        key="cs-sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 350, damping: 36 }}
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center justify-end pointer-events-none"
      >
        <div
          className="w-full max-w-[580px] bg-[#121212] border border-white/[0.08] rounded-t-[32px] overflow-hidden flex flex-col pointer-events-auto shadow-ambient"
          style={{ height: '88vh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Top Handle / Drag bar */}
          <div className="flex justify-center pt-3 pb-1 shrink-0 cursor-pointer" onClick={onClose}>
            <div className="w-12 h-1.5 rounded-full bg-white/20 hover:bg-white/40 transition-colors" />
          </div>

          {/* Header section: centered title to match Instagram */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04] shrink-0 relative">
            {/* Empty block to help center title */}
            <div className="w-8" />
            
            <h3 className="text-[14px] font-bold text-white tracking-wide text-center">
              Comments
            </h3>

            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/[0.05] text-white/50 hover:text-white transition-all active:scale-95"
            >
              <X size={18} />
            </button>
          </div>

          {/* Comment List */}
          <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-white/25" />
              </div>
            ) : groupedComments.roots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="w-16 h-16 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center">
                  <MessageCircle size={24} className="text-white/20" />
                </div>
                <div className="space-y-1">
                  <p className="text-[13px] font-black uppercase tracking-widest text-white/40">No comments yet</p>
                  <p className="text-xs text-white/20">Be the first to leave a comment on this post.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedComments.roots.map((rootComment) => {
                  const commentReplies = groupedComments.replies[rootComment.id] || [];
                  const isExpanded = !!expandedComments[rootComment.id];
                  
                  return (
                    <div key={rootComment.id} className="group-comment-block p-4 rounded-2xl bg-white/[0.01] border border-white/[0.03] hover:border-violet-500/10 transition-all duration-300">
                      {/* Top-Level Comment */}
                      <CommentRow
                        comment={rootComment}
                        currentUserId={currentUserId}
                        postAuthorId={postAuthorId}
                        onLike={() => toggleCommentLike(rootComment.id)}
                        onReply={() => handleReplyClick(rootComment)}
                        isFollowing={isFollowing}
                        toggleFollow={toggleFollow}
                      />

                      {/* Replied Thread Block */}
                      {commentReplies.length > 0 && (
                        <div className="pl-12 mt-2 space-y-3 relative">
                          {/* Visual Indentation Line */}
                          <div className="absolute left-6 top-0 bottom-6 w-[1.5px] bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

                          {/* Toggle expand button */}
                          <button
                            onClick={() => toggleRepliesExpanded(rootComment.id)}
                            className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-violet-400 hover:text-violet-300 transition-colors py-1 pl-1"
                          >
                            <span className="w-4 h-px bg-violet-500/30" />
                            {isExpanded ? (
                              <span className="flex items-center gap-1">Hide replies <ChevronUp size={11} /></span>
                            ) : (
                              <span className="flex items-center gap-1">View replies ({commentReplies.length}) <ChevronDown size={11} /></span>
                            )}
                          </button>

                          {/* Replies list */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.25, ease: "easeInOut" }}
                                className="space-y-3 overflow-hidden"
                              >
                                {commentReplies.map((reply) => (
                                  <div key={reply.id} className="relative">
                                    {/* Curved thread map line */}
                                    <div className="absolute left-[-26px] top-[-10px] w-6 h-[40px] pointer-events-none">
                                      <svg width="24" height="40" viewBox="0 0 24 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-violet-500/20 stroke-current">
                                        <path d="M1 0V20C1 28.2843 7.71573 35 16 35H24" strokeWidth="1.5" strokeLinecap="round" />
                                      </svg>
                                    </div>

                                    <CommentRow
                                      comment={reply}
                                      currentUserId={currentUserId}
                                      postAuthorId={postAuthorId}
                                      onLike={() => toggleCommentLike(reply.id)}
                                      onReply={() => handleReplyClick(reply)}
                                      isReply
                                      isFollowing={isFollowing}
                                      toggleFollow={toggleFollow}
                                    />
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-white/[0.06] bg-[#121212] z-10">
            {/* Quick emoji row - clean layout matching Instagram */}
            <div className="flex items-center justify-center px-4 py-1.5 border-b border-white/[0.02]">
              <div className="flex items-center gap-2">
                {QUICK_EMOJIS.map(emoji => (
                  <motion.button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiReaction(emoji)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-8 h-8 flex items-center justify-center text-md hover:bg-white/[0.04] rounded-full transition-all duration-150"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Replying banner */}
            {replyingTo && (
              <div className="flex items-center justify-between bg-violet-600/5 border-b border-violet-500/10 px-6 py-2">
                <p className="text-[10px] font-bold text-violet-300">
                  Replying to <span className="text-white font-extrabold">@{replyingTo.username}</span>
                </p>
                <button
                  type="button"
                  onClick={() => { setReplyingTo(null); setText(''); }}
                  className="w-5 h-5 rounded-full flex items-center justify-center bg-white/[0.05] text-white/50 hover:text-white"
                >
                  <X size={10} />
                </button>
              </div>
            )}

            {/* Text Form: clean and borderless input with text Post button */}
            <form onSubmit={handleSubmit} className="flex items-center gap-3.5 px-5 py-4">
              {/* Round avatar */}
              <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-900 shrink-0 border border-white/5 relative">
                <img
                  src={getAvatarUrl(currentUser?.username || 'user', currentUser?.avatar)}
                  alt="me"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Borderless input wrapper */}
              <div className="flex-1 flex items-center bg-transparent">
                <input
                  ref={inputRef}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder={replyingTo ? `Write reply...` : "Add a comment..."}
                  className="w-full bg-transparent text-[14px] text-white placeholder:text-white/20 outline-none border-none py-1 focus:ring-0"
                />
              </div>

              {/* Blue post trigger */}
              <button
                type="submit"
                disabled={!text.trim() || submitting}
                className="text-[14px] font-black text-sky-500 hover:text-sky-400 disabled:opacity-30 disabled:pointer-events-none transition-colors px-2 leading-none shrink-0"
              >
                {submitting ? <Loader2 size={14} className="animate-spin text-sky-500" /> : 'Post'}
              </button>
            </form>

            {/* safe area bottom padding for mobile */}
            <div className="h-safe-area-inset-bottom pb-3" />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Comment Row Subcomponent ──────────────────────────────────────────────────────────

function CommentRow({
  comment,
  currentUserId,
  postAuthorId,
  onLike,
  onReply,
  isReply = false,
  isFollowing,
  toggleFollow
}: {
  comment: Comment;
  currentUserId?: string;
  postAuthorId?: string;
  onLike: () => void;
  onReply: () => void;
  isReply?: boolean;
  isFollowing: (id: string) => boolean;
  toggleFollow: (id: string) => void;
}) {
  const isCreator = postAuthorId && comment.author?.id === postAuthorId;
  const isMe = currentUserId && comment.author?.id === currentUserId;
  const showFollowBtn = comment.author?.id && !isMe && !isFollowing(comment.author.id);

  const timeAgo = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(comment.created_at), { addSuffix: false });
    } catch {
      return 'now';
    }
  }, [comment.created_at]);

  // Render text content and highlight mentions
  const parsedContent = useMemo(() => {
    const parts = comment.content.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const username = part.slice(1);
        return (
          <Link
            key={index}
            href={`/profile/${username}`}
            className="text-sky-400 font-extrabold hover:underline"
          >
            {part}
          </Link>
        );
      }
      return <span key={index}>{part}</span>;
    });
  }, [comment.content]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={clsx("flex gap-4 py-3 group/row transition-all", isReply ? "py-2" : "py-3")}
    >
      {/* Avatar with click to profile */}
      <Link href={`/profile/${comment.author?.username}`} className="shrink-0">
        <div className={clsx(
          "rounded-xl overflow-hidden ring-1 ring-white/10 bg-neutral-900 shadow-soft-depth",
          isReply ? "w-8 h-8" : "w-10 h-10"
        )}>
          <img
            src={getAvatarUrl(comment.author?.username || 'user', comment.author?.avatar_url)}
            alt={comment.author?.display_name || 'user'}
            className="w-full h-full object-cover"
          />
        </div>
      </Link>

      {/* Content wrapper */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Meta row: Username, verified check, creator highlight, time, follow */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Link href={`/profile/${comment.author?.username}`}>
                <span className="text-[13px] font-bold text-white hover:text-white/80 transition-colors leading-none">
                  {comment.author?.username || 'unknown'}
                </span>
              </Link>
              
              {comment.author?.is_verified && (
                <CheckCircle2 size={13} className="text-white fill-black" strokeWidth={3} />
              )}

              {isCreator && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <Sparkles size={8} /> Creator
                </span>
              )}

              <span className="text-[10px] text-white/20 font-bold">• {timeAgo}</span>

              {/* Inline follow trigger */}
              {showFollowBtn && (
                <button
                  onClick={() => toggleFollow(comment.author!.id)}
                  className="text-[10px] font-black uppercase tracking-wider text-sky-400 hover:text-sky-300 transition-colors leading-none"
                >
                  • Follow
                </button>
              )}
            </div>

            {/* Comment text */}
            <p className="text-[14px] text-white/80 leading-relaxed break-words pr-2">
              {parsedContent}
            </p>

            {/* Action Row: Reply */}
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={onReply}
                className="text-[11px] font-extrabold uppercase tracking-wider text-white/30 hover:text-white/60 transition-colors"
              >
                Reply
              </button>
            </div>
          </div>

          {/* Like Heart Button */}
          <button
            onClick={onLike}
            className="flex flex-col items-center gap-1 shrink-0 ml-2 mt-0.5 hover:scale-105 active:scale-95 transition-transform"
          >
            <Heart
              size={15}
              className={clsx(
                "transition-all duration-300",
                comment.liked ? "fill-rose-500 text-rose-500 scale-110" : "text-white/20 hover:text-white/40"
              )}
              strokeWidth={comment.liked ? 0 : 2.5}
            />
            {(comment.likeCount || 0) > 0 && (
              <span className="text-[10px] font-extrabold text-white/20 leading-none">
                {comment.likeCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
