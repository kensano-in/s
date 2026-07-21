'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import type { Post } from '@/lib/types';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Repeat2, Pencil, Trash2, X, Check, ShieldCheck, Zap, Sparkles, AlertCircle, Plus, MapPin, Loader2, RefreshCw, Flag, Clock, Globe, Compass, Music, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import ReportModal from '@/components/moderation/ReportModal';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deletePost, editPost, getCommentsDB, submitCommentDB, toggleLikeDB, toggleSaveDB, toggleRepostDB, togglePinPostDB } from '@/app/(main)/feed/actions';
import { motion, AnimatePresence } from 'framer-motion';
import KineticIcon from '@/components/ui/KineticIcon';
import { SPRING } from '@/lib/motion';
import { useEngagementTracker } from '@/hooks/useEngagementTracker';
import PostActionSheet from './PostActionSheet';
import CommentSheet from './CommentSheet';
import { createClient } from '@/lib/supabase/client';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

import { memo } from 'react';
import Image from 'next/image';
import { getAvatarUrl } from '@/lib/utils';

const ParsedContent = memo(({ content }: { content: string }) => {
  const parts = content.split(/(\[\s*[📸|🎬|📍].*?\])/g);
  
  const renderTextWithLinks = (text: string) => {
    const regex = /(\#[a-zA-Z0-9_]+)|(\@[a-zA-Z0-9_]+)|(https?:\/\/[^\s]+)/g;
    const tokens = text.split(regex);
    return tokens.map((token, index) => {
      if (!token) return null;
      if (token.startsWith('#')) {
        return (
          <span key={index} className="text-violet-400 font-semibold hover:text-violet-300 transition-colors cursor-pointer">
            {token}
          </span>
        );
      }
      if (token.startsWith('@')) {
        return (
          <span key={index} className="text-violet-400 font-semibold hover:underline cursor-pointer">
            {token}
          </span>
        );
      }
      if (token.startsWith('http://') || token.startsWith('https://')) {
        return (
          <a key={index} href={token} target="_blank" rel="noopener noreferrer" className="text-violet-400 font-semibold hover:underline transition-colors break-all">
            {token}
          </a>
        );
      }
      return <span key={index}>{token}</span>;
    });
  };

  return (
    <div className="post-text-content">
      {parts.map((p, i) => {
        if (p.startsWith('[') && p.endsWith(']')) {
          const inner = p.slice(1, -1).trim();
          const isImage = inner.includes('📸');
          const isVideo = inner.includes('🎬');
          const isLocation = inner.includes('📍');
          const label = inner.replace('📸', '').replace('🎬', '').replace('📍', '').replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
          
          if (isImage || isVideo) {
            return (
              <div key={i} className="flex items-center gap-4 bg-white/[0.03] px-6 py-5 rounded-[24px] border border-white/[0.06] shadow-soft-depth w-full max-w-md mt-6 hover:bg-white/[0.05] transition-all cursor-pointer group/asset overflow-hidden relative">
                <div className="w-12 h-12 rounded-xl bg-obsidian-800 flex items-center justify-center text-xl border border-white/5 group-hover/asset:scale-105 transition-transform">
                  {isImage ? '📸' : '🎬'}
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-bold text-white tracking-tight font-display">{label}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black">
                      {isImage ? 'Photo' : 'Video'}
                    </span>
                  </div>
                </div>
              </div>
            );
          }
        }
        return <span key={i}>{renderTextWithLinks(p)}</span>;
      })}
    </div>
  );
});

ParsedContent.displayName = 'ParsedContent';

const LazyVideo = memo(({ src, className }: { src: string; className?: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoEl.play().catch(() => {});
        } else {
          videoEl.pause();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(videoEl);
    return () => {
      observer.unobserve(videoEl);
      observer.disconnect();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      muted
      playsInline
      loop
      preload="metadata"
    />
  );
});
LazyVideo.displayName = 'LazyVideo';

interface Props {
  post: Post;
  currentUserId?: string;
  onCommentOpen?: () => void;
  postIndex?: number;
}

const PostCard = memo(({ post, currentUserId, onCommentOpen, postIndex }: Props) => {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [liked, setLiked] = useState<boolean>(post.isLiked ?? false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [saved, setSaved] = useState<boolean>(post.isSaved ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [repostToast, setRepostToast] = useState(false);
  const [repostToastMsg, setRepostToastMsg] = useState('');
  const [reposted, setReposted] = useState<boolean>(false);
  const [shareCount, setShareCount] = useState<number>(post.shareCount || 0);
  const [isReposting, setIsReposting] = useState<boolean>(false);
  const cardRef = useRef<HTMLElement>(null);
  const repostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Engagement Tracking ───────────────────────────────────────────────────
  const { ref: trackingRef, track } = useEngagementTracker({
    postId: post.id,
    userId: currentUserId,
    disabled: !currentUserId,
  });

  // Loading States
  const [isLiking, setIsLiking] = useState(false);
  const [isSavingSave, setIsSavingSave] = useState(false);

  // Audio playback connection
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const cardAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleToggleAudio = () => {
    if (!post.audio?.previewUrl) return;

    if (!cardAudioRef.current) {
      cardAudioRef.current = new Audio(post.audio.previewUrl);
      cardAudioRef.current.loop = true;
    }

    const audio = cardAudioRef.current;
    if (isPlayingAudio) {
      audio.pause();
      setIsPlayingAudio(false);
    } else {
      audio.currentTime = post.audio.playbackStartPosition || 0;
      audio.play().catch(() => {});
      setIsPlayingAudio(true);
    }
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (cardAudioRef.current) {
        cardAudioRef.current.pause();
        cardAudioRef.current = null;
      }
    };
  }, []);

  // Loop within trim bounds
  useEffect(() => {
    const audio = cardAudioRef.current;
    if (!audio || !post.audio) return;

    const start = post.audio.playbackStartPosition || 0;
    const end = post.audio.playbackEndPosition || 30;

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
  }, [isPlayingAudio, post.audio]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [showCommentSheet, setShowCommentSheet] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [commentsStream, setCommentsStream] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const shareCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const isOwner = currentUserId && post.author?.id === currentUserId;

  // Local state for post content
  const [localContent, setLocalContent] = useState(post.content);
  const savedContentRef = useRef<string | null>(null);

  const [isPinned, setIsPinned] = useState((post as any).isPinned || false);
  const [commentsDisabled, setCommentsDisabled] = useState(post.content.includes('[ 🚫 comments_disabled ]'));
  const [isArchived, setIsArchived] = useState(post.content.includes('[ 🚫 archived ]'));

  const handleTogglePin = async () => {
    try {
      const res = await togglePinPostDB(post.id, !isPinned);
      if (res.success) {
        setIsPinned((prev: boolean) => !prev);
      } else {
        alert(res.error || 'Failed to toggle pin status');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleComments = async () => {
    const hasCommentsDisabled = localContent.includes('[ 🚫 comments_disabled ]');
    let newContent = '';
    if (hasCommentsDisabled) {
      newContent = localContent.replace('[ 🚫 comments_disabled ]', '').trim();
    } else {
      newContent = `${localContent}\n[ 🚫 comments_disabled ]`.trim();
    }
    const res = await editPost(post.id, newContent);
    if (res?.success) {
      setLocalContent(newContent);
      savedContentRef.current = newContent;
      setCommentsDisabled(!hasCommentsDisabled);
    }
  };

  const handleToggleArchive = async () => {
    const hasArchive = localContent.includes('[ 🚫 archived ]');
    let newContent = '';
    if (hasArchive) {
      newContent = localContent.replace('[ 🚫 archived ]', '').trim();
    } else {
      newContent = `${localContent}\n[ 🚫 archived ]`.trim();
    }
    const res = await editPost(post.id, newContent);
    if (res?.success) {
      setLocalContent(newContent);
      savedContentRef.current = newContent;
      setIsArchived(!hasArchive);
    }
  };

  // --- Lightbox Media Viewer state ---
  const [activeMediaIndex, setActiveMediaIndex] = useState<number | null>(null);

  // Debounce refs for instant like, save, and repost actions
  const likeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLikeStateRef = useRef<boolean | null>(null);

  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveStateRef = useRef<boolean | null>(null);

  const repostDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRepostStateRef = useRef<boolean | null>(null);

  // --- Interactive Poll state ---
  const [votedOptionId, setVotedOptionId] = useState<string | undefined>(post.poll?.userVotedOptionId);
  const [pollState, setPollState] = useState<any>(post.poll || {
    question: "Select your preferred deployment stack:",
    options: [
      { id: '1', text: 'Supabase Serverless Node', votes: 142 },
      { id: '2', text: 'Prisma Client on edge caches', votes: 98 },
      { id: '3', text: 'Direct PostgreSQL pooler tunnel', votes: 247 }
    ],
    totalVotes: 487
  });

  const handleVote = (optionId: string) => {
    if (votedOptionId) return;
    setVotedOptionId(optionId);
    setPollState((prev: any) => {
      if (!prev) return prev;
      const updatedOptions = prev.options.map((opt: any) => {
        if (opt.id === optionId) {
          return { ...opt, votes: opt.votes + 1 };
        }
        return opt;
      });
      return {
        ...prev,
        options: updatedOptions,
        totalVotes: prev.totalVotes + 1,
        userVotedOptionId: optionId
      };
    });
  };

  useEffect(() => {
    if (savedContentRef.current !== null) {
      if (post.content === savedContentRef.current) {
        savedContentRef.current = null;
      }
      return;
    }
    setLocalContent(post.content);
  }, [post.content]);

  useEffect(() => {
    setLiked(post.isLiked ?? false);
  }, [post.isLiked]);

  useEffect(() => {
    setSaved(post.isSaved ?? false);
  }, [post.isSaved]);

  useEffect(() => {
    setLikeCount(post.likeCount);
  }, [post.likeCount]);

  useEffect(() => {
    setCommentCount(post.commentCount);
  }, [post.commentCount]);

  useEffect(() => {
    setShareCount(post.shareCount || 0);
  }, [post.shareCount]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const reposts = JSON.parse(localStorage.getItem('verlyn_reposts') || '[]');
      setReposted(reposts.includes(post.id));
    }
  }, [post.id]);


  // Identity Status Logic
  const isPrimeUser = (post.author as any)?.security_score >= 80 || post.author?.isVerified;

  // Parse content and metadata format
  const { cleanContent, timeFormat, locationLabel } = useMemo(() => {
    const rawContent = localContent || '';
    
    // Extract location
    const locMatch = rawContent.match(/\[\s*📍\s*(.*?)\s*\]/);
    const locationLabel = locMatch ? locMatch[1].trim() : null;

    // Remove metadata tags for clean display
    let cleaned = rawContent
      .replace(/\[\s*📍\s*(.*?)\s*\]/g, '')
      .replace(/\[\s*🚫\s*(.*?)\s*\]/g, '')
      .trim();

    // Check for time format suffix
    const match = cleaned.match(/^([\s\S]*)\s*\[time-format:(relative|absolute)\]\s*$/i);
    if (match) {
      return {
        cleanContent: match[1].trim(),
        timeFormat: match[2] as 'relative' | 'absolute',
        locationLabel
      };
    }
    return {
      cleanContent: cleaned,
      timeFormat: 'absolute' as 'relative' | 'absolute',
      locationLabel
    };
  }, [localContent]);

  useEffect(() => {
    if (isEditing) {
      setEditContent(cleanContent);
    }
  }, [isEditing, cleanContent]);

  // Timestamp Popup States
  const [showTimePopup, setShowTimePopup] = useState(false);
  const [isUpdatingFormat, setIsUpdatingFormat] = useState(false);
  const timePopupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (timePopupRef.current && !timePopupRef.current.contains(e.target as Node)) {
        setShowTimePopup(false);
      }
    }
    if (showTimePopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTimePopup]);

  const handleToggleTimeFormat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUpdatingFormat || !isOwner) return;
    setIsUpdatingFormat(true);
    
    const nextFormat = timeFormat === 'relative' ? 'absolute' : 'relative';
    const rawContent = localContent || '';
    const baseContent = rawContent.replace(/\s*\[time-format:(relative|absolute)\]\s*$/i, '').trim();
    const newRawContent = `${baseContent} [time-format:${nextFormat}]`;
    
    setLocalContent(newRawContent);
    const res = await editPost(post.id, newRawContent);
    if (res?.error) {
      console.error('Failed to toggle post time format:', res.error);
      setLocalContent(post.content);
    } else {
      setShowTimePopup(false);
    }
    setIsUpdatingFormat(false);
  };

  const actualDateTimeString = useMemo(() => {
    try {
      return new Date(post.createdAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return post.createdAt;
    }
  }, [post.createdAt]);

  const displayTime = useMemo(() => {
    if (timeFormat === 'relative') {
      try {
        return formatDistanceToNow(new Date(post.createdAt), { addSuffix: false });
      } catch {
        return actualDateTimeString;
      }
    }
    return actualDateTimeString;
  }, [timeFormat, post.createdAt, actualDateTimeString]);

  useEffect(() => {
    if (!showCommentInput) return;
    const loadComments = async () => {
      setIsLoadingComments(true);
      const res = await getCommentsDB(post.id);
      if (res.success && res.data) {
        setCommentsStream(res.data);
      } else {
        setCommentsStream([]);
      }
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

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return;
    
    const isLikingNow = !liked;
    const previousLiked = liked;
    const previousLikeCount = likeCount;
    
    setLiked(isLikingNow);
    setLikeCount((c) => isLikingNow ? c + 1 : c - 1);
    track(isLikingNow ? 'like' : 'unlike');
    
    pendingLikeStateRef.current = isLikingNow;
    
    if (likeDebounceRef.current) clearTimeout(likeDebounceRef.current);
    
    likeDebounceRef.current = setTimeout(async () => {
      const finalState = pendingLikeStateRef.current;
      if (finalState === null) return;
      try {
        const res = await toggleLikeDB(post.id, currentUserId, finalState);
        if (!res.success) {
          console.warn('Like toggle failed on DB, rolling back:', res.error);
          setLiked(previousLiked);
          setLikeCount(previousLikeCount);
        }
      } catch (err: any) {
        console.error('Like toggle error, rolling back:', err);
        setLiked(previousLiked);
        setLikeCount(previousLikeCount);
      }
    }, 300);
  };

  const handleSave = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUserId) return;
    
    const isSavingNow = !saved;
    const previousSaved = saved;
    
    setSaved(isSavingNow);
    track(isSavingNow ? 'save' : 'unsave');
    
    pendingSaveStateRef.current = isSavingNow;
    
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    
    saveDebounceRef.current = setTimeout(async () => {
      const finalState = pendingSaveStateRef.current;
      if (finalState === null) return;
      try {
        const res = await toggleSaveDB(post.id, currentUserId, finalState);
        if (!res.success) {
          console.warn('Save toggle failed on DB, rolling back:', res.error);
          setSaved(previousSaved);
        }
      } catch (err: any) {
        console.error('Save toggle error, rolling back:', err);
        setSaved(previousSaved);
      }
    }, 300);
  };

  const currentEditLocation = editContent.match(/\[📍\s*([^\]]+)\]/)?.[1] || '';
  const setEditLocation = (loc: string) => {
    let clean = editContent.replace(/\[📍[^\]]+\]/g, ' ').replace(/\s+/g, ' ').trim();
    if (loc) {
      clean = clean + ` [📍 ${loc}]`;
    }
    setEditContent(clean);
  };

  const currentEditTag = editContent.match(/\[tag:\s*([^\]]+)\]/)?.[1] || 'ZERO-KNOWLEDGE TUNNEL';
  const setEditTag = (tag: string) => {
    let clean = editContent.replace(/\[tag:[^\]]+\]/g, ' ').replace(/\s+/g, ' ').trim();
    if (tag) {
      clean = clean + ` [tag:${tag}]`;
    }
    setEditContent(clean);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || isSavingEdit) return;
    setIsSavingEdit(true);
    let finalEditContent = editContent.trim();
    if (timeFormat === 'relative') {
      finalEditContent += ' [time-format:relative]';
    } else {
      finalEditContent += ' [time-format:absolute]';
    }
    const result = await editPost(post.id, finalEditContent);
    if (result?.success) {
      savedContentRef.current = finalEditContent;
      setLocalContent(finalEditContent);
      setIsEditing(false);
    } else if (result?.error) {
      console.error('Edit failed:', result.error);
    }
    setIsSavingEdit(false);
  };

  const handleRepost = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return;

    const isRepostingNow = !reposted;
    const previousReposted = reposted;
    const previousShareCount = shareCount;

    setReposted(isRepostingNow);
    setShareCount((c) => isRepostingNow ? c + 1 : Math.max(0, c - 1));
    track(isRepostingNow ? 'repost' : 'unrepost');

    pendingRepostStateRef.current = isRepostingNow;

    if (repostDebounceRef.current) clearTimeout(repostDebounceRef.current);

    repostDebounceRef.current = setTimeout(async () => {
      const finalState = pendingRepostStateRef.current;
      if (finalState === null) return;
      try {
        const res = await toggleRepostDB(post.id, finalState);
        if (res.success) {
          if (typeof window !== 'undefined') {
            let reposts = JSON.parse(localStorage.getItem('verlyn_reposts') || '[]');
            if (finalState) {
              if (!reposts.includes(post.id)) reposts.push(post.id);
            } else {
              reposts = reposts.filter((id: string) => id !== post.id);
            }
            localStorage.setItem('verlyn_reposts', JSON.stringify(reposts));
          }
          
          setRepostToastMsg(finalState ? 'Reposted!' : 'Repost removed!');
          if (repostTimerRef.current) clearTimeout(repostTimerRef.current);
          setRepostToast(true);
          repostTimerRef.current = setTimeout(() => setRepostToast(false), 2000);
        } else {
          console.warn('Repost toggle failed on DB, rolling back:', res.error);
          setReposted(previousReposted);
          setShareCount(previousShareCount);
        }
      } catch (err: any) {
        console.error('Repost toggle error, rolling back:', err);
        setReposted(previousReposted);
        setShareCount(previousShareCount);
      }
    }, 300);
  };

  useEffect(() => () => {
    if (repostTimerRef.current) clearTimeout(repostTimerRef.current);
    if (shareCopiedTimerRef.current) clearTimeout(shareCopiedTimerRef.current);
  }, []);

  const handleShare = async () => {
    const url = `${window.location.origin}/feed#${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      if (shareCopiedTimerRef.current) clearTimeout(shareCopiedTimerRef.current);
      setShareCopied(true);
      shareCopiedTimerRef.current = setTimeout(() => setShareCopied(false), 2000);
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
    if (!commentText.trim() || isLoadingComments) return;
    setIsLoadingComments(true);
    setCommentCount((c) => c + 1);
    const tempId = `opt-${Date.now()}`;
    const newCommentPayload = { id: tempId, content: commentText.trim(), created_at: new Date().toISOString(), author: { id: currentUserId, display_name: 'You', username: 'you' } };
    setCommentsStream(prev => [...prev, newCommentPayload]);
    const submittedText = commentText;
    setCommentText('');

    const loadComments = async () => {
      const res = await getCommentsDB(post.id);
      if (res.success && res.data) {
        setCommentsStream(res.data);
      }
    };

    if (currentUserId) {
      submitCommentDB(post.id, currentUserId, submittedText)
        .then(() => loadComments())
        .finally(() => setIsLoadingComments(false));
    }
  };

  // Parsing url link preview
  const linkPreview = useMemo(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/;
    const match = cleanContent.match(urlRegex);
    if (!match) return null;
    const url = match[0];
    let hostname = 'unknown';
    try {
      hostname = new URL(url).hostname;
    } catch {}
    return {
      url,
      hostname,
      title: 'Decentralized Trust Protocol',
      description: 'Explore Verlyn\'s latest zero-knowledge infrastructure blueprints for modern social spaces.'
    };
  }, [cleanContent]);

  if (isDeleted) return null;

  return (
    <>
      <motion.article
        id={post.id}
        ref={(el) => { (cardRef as any).current = el; if (trackingRef) (trackingRef as any).current = el; }}
        layout
        whileHover={{ y: -2 }}
        transition={SPRING.micro}
        style={{ contentVisibility: 'auto', containIntrinsicSize: '0 450px' }}
        className="flex flex-col group transition-all duration-300 relative rounded-[32px] border border-white/[0.03] border-t-white/[0.08] bg-[#0c0c0e]/30 backdrop-blur-3xl overflow-hidden mb-6 hover:border-white/[0.06] hover:border-t-white/[0.12] hover:bg-[#0c0c0e]/40 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.04)] w-full max-w-[360px] sm:max-w-[420px] mx-auto"
        onMouseMove={(e) => {
          const el = e.currentTarget;
          const r = el.getBoundingClientRect();
          el.style.setProperty('--mx', `${e.clientX - r.left}px`);
          el.style.setProperty('--my', `${e.clientY - r.top}px`);
        }}
        onClick={() => track('click')}
      >
        {/* Glow overlay */}
        <div className="pointer-events-none absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" style={{ background: `radial-gradient(600px circle at var(--mx, 50%) var(--my, 50%), rgba(139, 92, 246, 0.03), transparent 80%)` }} />

        {/* Share Copied Toast */}
        <AnimatePresence>
          {shareCopied && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-widest shadow-premium whitespace-nowrap pointer-events-none"
            >
              <Check size={12} strokeWidth={3} />
              Link Copied
            </motion.div>
          )}
        </AnimatePresence>

        {/* Community details */}
        {post.communityId && (
          <div className="px-6 pt-6 pb-0 flex items-center relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 shadow-lux-inner hover:border-violet-500/40 hover:bg-violet-500/20 transition-all cursor-pointer group/comm">
              <Compass size={11} className="text-violet-400" />
              <span className="text-[9px] font-black uppercase tracking-widest text-violet-300 font-sans">{post.communityName || 'COMMUNITY'}</span>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 relative z-10">
          
          {/* Author row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link 
                href={`/profile/${post.author?.username}`} 
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/profile/${post.author?.username}`);
                }}
                className="relative group/avatar cursor-pointer block z-10"
              >
                <div className={clsx('w-11 h-11 rounded-full p-[1.5px] border transition-all duration-300 overflow-hidden shadow-soft-depth', isPrimeUser ? 'border-violet-500/40' : 'border-white/[0.08] group-hover/avatar:border-white/20')}>
                    <div className="relative w-full h-full rounded-full overflow-hidden bg-obsidian-800">
                      <Image 
                        src={getAvatarUrl(post.author?.username || 'user', post.author?.avatar)} 
                        fill 
                        className="object-cover rounded-full group-hover/avatar:scale-105 transition-transform duration-300" 
                        alt="avatar"
                        sizes="44px"
                      />
                    </div>
                </div>
                {isPrimeUser && <div className="absolute -top-0.5 -right-0.5 bg-violet-600 p-0.5 rounded-full border border-black text-white shadow-premium"><ShieldCheck size={9} strokeWidth={2.5} /></div>}
              </Link>
              <div>
                  <div className="flex items-center gap-2">
                    <Link 
                      href={`/profile/${post.author?.username}`} 
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/profile/${post.author?.username}`);
                      }}
                      className="flex items-center gap-1.5 group/author-name block z-10"
                    >
                       <h4 className="text-[14px] font-extrabold text-white group-hover/author-name:text-violet-300 transition-colors tracking-tight leading-none">{post.author?.displayName}</h4>
                       {isPrimeUser && <Sparkles size={11} className="text-violet-400 opacity-80" />}
                    </Link>
                    {isPrimeUser && (
                      <span className="text-[8px] font-black uppercase tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded">
                        Grade A+
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                     <Link 
                       href={`/profile/${post.author?.username}`} 
                       onClick={(e) => {
                         e.stopPropagation();
                         router.push(`/profile/${post.author?.username}`);
                       }}
                       className="text-[10px] font-bold text-slate-500 hover:text-slate-400 transition-colors uppercase tracking-wider leading-none z-10"
                     >
                       @{post.author?.username}
                     </Link>
                     
                     <span className="text-[10px] text-slate-600">•</span>
                     
                     <div className="flex items-center gap-1.5 text-slate-500/70">
                       <Clock size={11} className="opacity-70 flex-shrink-0" />
                       <div ref={timePopupRef} className="relative inline-block">
                         <button 
                           type="button" 
                           onClick={(e) => { e.stopPropagation(); setShowTimePopup(!showTimePopup); }}
                           className="text-[10px] font-semibold text-slate-500 hover:text-slate-300 tracking-wide leading-none transition-colors"
                         >
                           {displayTime}
                         </button>
                         {showTimePopup && (
                           <div className="absolute left-0 mt-2 z-50 bg-[#15151A] border border-white/[0.08] rounded-xl p-4 shadow-modal w-64 text-left pointer-events-auto">
                             <div className="flex items-center justify-between mb-2">
                               <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Actual Date/Time</span>
                               <button 
                                 type="button"
                                 onClick={(e) => { e.stopPropagation(); setShowTimePopup(false); }}
                                 className="text-slate-500 hover:text-white text-xs"
                               >
                                 &times;
                               </button>
                             </div>
                             <p className="text-xs font-bold text-white mb-3 leading-relaxed">
                               {actualDateTimeString}
                             </p>
                             {isOwner && (
                               <div className="border-t border-white/[0.05] pt-3 mt-1">
                                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-2">Owner Settings</span>
                                 <button
                                   type="button"
                                   onClick={handleToggleTimeFormat}
                                   disabled={isUpdatingFormat}
                                   className="w-full py-2 px-3 bg-white text-black hover:bg-slate-200 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all text-center"
                                 >
                                   {isUpdatingFormat ? 'Updating...' : timeFormat === 'relative' ? 'Switch to Actual Time' : 'Switch to Relative Time'}
                                 </button>
                               </div>
                             )}
                           </div>
                         )}
                       </div>
                     </div>


                     <span className="text-[10px] text-slate-600">•</span>
                     <span className="text-[9px] font-black text-cyan-500 uppercase tracking-widest bg-cyan-950/20 border border-cyan-500/10 px-1.5 py-0.5 rounded">
                       Zero-Knowledge Tunnel
                     </span>
                  </div>
              </div>
            </div>

            <div className="relative">
              <button type="button" onClick={() => setMenuOpen(true)} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-white/5 hover:text-white transition-all">
                  <MoreHorizontal size={18} />
              </button>
              <PostActionSheet
                isOpen={menuOpen}
                onClose={() => setMenuOpen(false)}
                post={post}
                isOwner={!!isOwner}
                saved={saved}
                onSave={handleSave}
                onShare={handleShare}
                onDelete={handleDelete}
                onEdit={() => setIsEditing(true)}
                onReport={() => setShowReportModal(true)}
                isPinned={isPinned}
                onPin={handleTogglePin}
                commentsDisabled={commentsDisabled}
                onToggleComments={handleToggleComments}
                isArchived={isArchived}
                onToggleArchive={handleToggleArchive}
              />
            </div>
          </div>

          {/* Instagram-style Media Carousel */}
          {post.mediaUrls && post.mediaUrls.length > 0 && (
            <div className="relative w-full aspect-square overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#050507]/30 group/carousel">
              
              {/* Carousel Track */}
              <div 
                className="absolute inset-0 flex transition-transform duration-500 ease-out" 
                style={{ transform: `translateX(-${currentMediaIndex * 100}%)` }}
              >
                {post.mediaUrls.map((url, i) => {
                  const isVideo = url.match(/\.(mp4|webm|mov|m4v|ogg)$/i) || url.includes('video-bucket') || url.includes('gtv-videos-bucket');
                  return (
                    <div 
                      key={i} 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMediaIndex(i);
                      }}
                      className="relative w-full h-full flex-shrink-0 cursor-pointer select-none"
                    >
                      {isVideo ? (
                        <LazyVideo 
                          src={url} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <Image 
                          src={url} 
                          fill 
                          className="object-cover" 
                          alt={`media-${i}`} 
                          sizes="(max-width: 768px) 100vw, 760px"
                          priority={postIndex === 0 && i === 0}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Top-Right Index Pill (e.g. 1/4) */}
              {post.mediaUrls.length > 1 && (
                <div className="absolute top-4 right-4 z-10 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-black font-mono tracking-wider text-white select-none">
                  {currentMediaIndex + 1}/{post.mediaUrls.length}
                </div>
              )}

              {/* Left Navigation Arrow */}
              {post.mediaUrls.length > 1 && currentMediaIndex > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentMediaIndex(prev => prev - 1);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all opacity-0 group-hover/carousel:opacity-100"
                >
                  <ChevronLeft size={18} />
                </button>
              )}

              {/* Right Navigation Arrow */}
              {post.mediaUrls.length > 1 && currentMediaIndex < post.mediaUrls.length - 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentMediaIndex(prev => prev + 1);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all opacity-0 group-hover/carousel:opacity-100"
                >
                  <ChevronRight size={18} />
                </button>
              )}

              {/* Dot Indicators */}
              {post.mediaUrls.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-1.5 pointer-events-none">
                  {post.mediaUrls.map((_, i) => (
                    <div
                      key={i}
                      className={clsx(
                        "w-1.5 h-1.5 rounded-full transition-all duration-300",
                        i === currentMediaIndex 
                          ? "bg-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.8)]" 
                          : "bg-white/40"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-white/[0.04]">
            <div className="flex items-center gap-1.5">
              <ActionBtn 
                active={liked} 
                icon={Heart} 
                label={localContent.includes('[ 🚫 likes_hidden ]') ? undefined : fmt(likeCount)} 
                activeColor="text-rose-500 font-extrabold" 
                onClick={handleLike} 
              />
              {!commentsDisabled && (
                <ActionBtn 
                  active={showCommentSheet} 
                  icon={MessageCircle} 
                  label={fmt(commentCount)} 
                  activeColor="text-violet-400 font-extrabold" 
                  onClick={() => {
                    if (onCommentOpen) {
                      onCommentOpen();
                    } else {
                      setShowCommentSheet(true);
                    }
                  }} 
                />
              )}
              {!localContent.includes('[ 🚫 shares_hidden ]') && (
                <div className="relative">
                  <ActionBtn 
                    active={reposted}
                    icon={Repeat2} 
                    label={fmt(shareCount)} 
                    activeColor="text-emerald-400 font-extrabold" 
                    onClick={handleRepost} 
                  />
                  <AnimatePresence>
                    {repostToast && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: -4 }} exit={{ opacity: 0 }} className="absolute -top-10 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider text-white bg-[#09090b] border border-white/10 px-4 py-1.5 rounded-full whitespace-nowrap shadow-premium">
                        {repostToastMsg}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
            <button 
              type="button"
              disabled={isSavingSave}
              onClick={handleSave} 
              className={clsx(
                'w-8 h-8 rounded-xl flex items-center justify-center transition-all group/save border', 
                saved && !isSavingSave ? 'bg-violet-600/10 text-violet-400 border-violet-500/20 shadow-none' : 'border-transparent text-slate-500 hover:text-slate-200 hover:bg-white/5',
                isSavingSave && "opacity-50"
              )}
            >
                <Bookmark size={15} className={clsx("transition-transform", saved && "scale-105", isSavingSave && "animate-pulse")} />
            </button>
          </div>

          {/* Post Soundtrack Pill */}
          {post.audio && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                handleToggleAudio();
              }}
              className={clsx(
                "flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border transition-all cursor-pointer select-none",
                isPlayingAudio
                  ? "bg-cyan-500/10 border-cyan-500/30 text-white shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                  : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] text-slate-300 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                {post.audio.artworkUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={post.audio.artworkUrl} 
                    alt="Album art" 
                    className={clsx("w-8 h-8 rounded-lg object-cover border border-white/5", isPlayingAudio && "animate-spin-slow")}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Music size={14} />
                  </div>
                )}
                <div className="min-w-0 flex flex-col">
                  <span className="text-[11px] font-bold text-white truncate leading-tight tracking-tight">{post.audio.trackName}</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate leading-none mt-0.5">{post.audio.artistName}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isPlayingAudio && (
                  <div className="w-6 h-4 flex items-end gap-0.5">
                    <div className="w-[2px] h-2.5 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                    <div className="w-[2px] h-4 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                    <div className="w-[2px] h-1.5 bg-cyan-400/70 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="w-[2px] h-3 bg-cyan-400/50 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                )}
                <span className="text-[8px] font-mono uppercase bg-white/5 px-2 py-0.5 rounded-full font-bold text-slate-500">
                  {isPlayingAudio ? "Playing" : "Soundtrack"}
                </span>
              </div>
            </div>
          )}

          {/* Post Text Content / Caption */}
              {isEditing ? (
                <div className="space-y-4.5 p-5 bg-[#09090b]/98 border border-white/[0.05] rounded-2xl animate-fade-in shadow-ambient mt-2">
                  {/* Header navigation row */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
                    <button
                      type="button"
                      onClick={() => { setIsEditing(false); setEditContent(cleanContent); }}
                      className="text-[12px] font-bold text-slate-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <span className="text-[13px] font-black tracking-wide text-white">Edit info</span>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSavingEdit}
                      className="text-[12px] font-black text-sky-500 hover:text-sky-400 disabled:opacity-40 transition-colors"
                    >
                      {isSavingEdit ? 'Saving...' : 'Done'}
                    </button>
                  </div>

                  {/* Body text & media preview */}
                  <div className="flex gap-4.5 pt-1">
                    {post.mediaUrls && post.mediaUrls.length > 0 && (
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/40 border border-white/5 shrink-0 relative">
                        <img src={post.mediaUrls[0]} className="w-full h-full object-cover" alt="preview" />
                      </div>
                    )}
                    <textarea 
                      value={editContent.replace(/\[📍[^\]]+\]/g, '').replace(/\[tag:[^\]]+\]/g, '').replace(/\[\s*🚫\s*comments_disabled\s*\]/g, '').replace(/\[\s*🚫\s*likes_hidden\s*\]/g, '').replace(/\[\s*🚫\s*shares_hidden\s*\]/g, '').trim()} 
                      onChange={e => {
                        const newTxt = e.target.value;
                        const commTag = editContent.includes('[ 🚫 comments_disabled ]') ? ' [ 🚫 comments_disabled ]' : '';
                        const likeTag = editContent.includes('[ 🚫 likes_hidden ]') ? ' [ 🚫 likes_hidden ] [ 🚫 shares_hidden ]' : '';
                        setEditContent(newTxt + commTag + likeTag);
                      }} 
                      className="flex-1 bg-transparent text-white text-[13px] leading-relaxed outline-none border-none resize-none placeholder:text-slate-600 h-14 focus:ring-0" 
                      placeholder="Write a caption..."
                      autoFocus 
                    />
                  </div>

                  {/* Advanced Settings section */}
                  <div className="space-y-4 border-t border-white/[0.05] pt-4.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-white">Hide like and view counts</span>
                      <IOSSwitch checked={editContent.includes('[ 🚫 likes_hidden ]')} onChange={() => {
                        const hasLikesHidden = editContent.includes('[ 🚫 likes_hidden ]');
                        let clean = editContent.replace(/\s*\[ 🚫 likes_hidden \]\s*/g, ' ')
                                               .replace(/\s*\[ 🚫 shares_hidden \]\s*/g, ' ')
                                               .trim();
                        if (!hasLikesHidden) {
                          clean = clean + ' [ 🚫 likes_hidden ] [ 🚫 shares_hidden ]';
                        }
                        setEditContent(clean);
                      }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-white">Turn off commenting</span>
                      <IOSSwitch checked={editContent.includes('[ 🚫 comments_disabled ]')} onChange={() => {
                        const hasDisabled = editContent.includes('[ 🚫 comments_disabled ]');
                        let clean = editContent.replace(/\s*\[ 🚫 comments_disabled \]\s*/g, ' ').trim();
                        if (!hasDisabled) {
                          clean = clean + ' [ 🚫 comments_disabled ]';
                        }
                        setEditContent(clean);
                      }} />
                    </div>
                  </div>
                </div>
              ) : (
                <ParsedContent content={cleanContent} />
              )}

          {/* Interactive Poll component */}
          {post.postType === 'poll' && pollState && (
            <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/[0.03] space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active System Poll</span>
              </div>
              <div className="space-y-3">
                {pollState.options.map((opt: any) => {
                  const percent = pollState.totalVotes > 0 ? Math.round((opt.votes / pollState.totalVotes) * 100) : 0;
                  const isVoted = votedOptionId === opt.id;
                  return (
                    <div 
                      key={opt.id}
                      onClick={() => handleVote(opt.id)}
                      className={clsx(
                        "relative h-11 border rounded-xl overflow-hidden cursor-pointer transition-all flex items-center justify-between px-4 select-none active:scale-[0.99]",
                        votedOptionId ? "pointer-events-none" : "hover:bg-white/[0.02]",
                        isVoted ? "border-violet-500/30 bg-violet-600/5" : "border-white/5"
                      )}
                    >
                      {/* Sliding dynamic progress background bar */}
                      <motion.div 
                        className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-violet-600/10 to-indigo-600/10 pointer-events-none"
                        initial={{ width: 0 }}
                        animate={{ width: votedOptionId ? `${percent}%` : 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                      <div className="flex items-center gap-2 relative z-10">
                        {isVoted && <Check size={12} className="text-violet-400" />}
                        <span className={clsx("text-xs font-bold transition-colors", isVoted ? "text-violet-300" : "text-slate-300")}>
                          {opt.text}
                        </span>
                      </div>
                      {votedOptionId && (
                        <span className="text-[11px] font-black text-slate-400 relative z-10">
                          {percent}% ({opt.votes})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 px-1 pt-1">
                <span>{pollState.totalVotes} total signals</span>
                <span>Closes in 2 days</span>
              </div>
            </div>
          )}

          {/* Shared Content / Quoted Post */}
          {post.sharedPost && (
            <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/[0.04] space-y-3 shadow-lux-inner">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full overflow-hidden relative bg-obsidian-800 border border-white/5">
                  <Image 
                    src={getAvatarUrl(post.sharedPost.author?.username || 'user', post.sharedPost.author?.avatar)}
                    fill
                    className="object-cover"
                    alt="shared avatar"
                    sizes="24px"
                  />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-white block leading-none">{post.sharedPost.author?.displayName}</span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">@{post.sharedPost.author?.username}</span>
                </div>
              </div>
              <p className="text-[13px] text-slate-400 leading-relaxed font-medium">
                {post.sharedPost.content}
              </p>
            </div>
          )}

          {/* Link Preview Card */}
          {linkPreview && (
            <a 
              href={linkPreview.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="block overflow-hidden rounded-2xl border border-white/[0.04] bg-[#050507]/30 hover:border-white/[0.08] hover:bg-[#050507]/50 transition-all group/link"
            >
              <div className="aspect-[2/1] relative w-full bg-[#121214] border-b border-b-white/[0.04] flex items-center justify-center">
                <Globe size={32} className="text-violet-500/20 group-hover/link:scale-105 transition-transform" />
              </div>
              <div className="p-4 space-y-1">
                <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest block">{linkPreview.hostname}</span>
                <h4 className="text-xs font-bold text-white group-hover/link:text-violet-300 transition-colors">{linkPreview.title}</h4>
                <p className="text-[10px] text-slate-500 leading-normal">{linkPreview.description}</p>
              </div>
            </a>
          )}

          {/* Inline Comment Feed */}
          <AnimatePresence>
              {showCommentInput && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-6 space-y-10 overflow-hidden">
                  <div className="w-full h-px bg-white/[0.04] mb-8" />
                  {isLoadingComments ? (
                    <div className="flex items-center gap-5 px-6">
                      <Loader2 size={16} className="animate-spin text-white" />
                      <span className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-600 animate-pulse">Loading comments...</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                       {commentsStream.map(c => (
                          <div key={c.id} className="group/cmnt px-8 py-6 bg-white/[0.02] rounded-[28px] border border-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.04] transition-all">
                              <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                     <span className="text-[14px] font-bold text-white font-display tracking-tight">{c.author?.display_name || 'Network Entity'}</span>
                                     <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">@{c.author?.username}</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.2em]">Verified</span>
                              </div>
                              <p className="text-[15px] font-medium leading-relaxed text-slate-400">{c.content}</p>
                          </div>
                       ))}
                    </div>
                  )}
                  <form onSubmit={handleComment} className="flex gap-3 p-1.5 bg-black/40 rounded-xl border border-white/[0.05] shadow-inner group/form focus-within:border-violet-500/30 transition-all">
                     <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add a comment..." className="flex-1 bg-transparent border-none text-[14px] font-medium focus:outline-none pl-4 placeholder:text-slate-600 text-white" />
                     <button type="submit" disabled={!commentText.trim()} className="h-9 px-5 rounded-lg bg-violet-600 text-white text-[11px] font-bold uppercase tracking-wider shadow-[0_0_8px_rgba(108,99,255,0.3)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-30">Post</button>
                  </form>
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      </motion.article>

      {/* Lightbox Fullscreen Media Viewer Overlay */}
      <AnimatePresence>
        {activeMediaIndex !== null && post.mediaUrls && post.mediaUrls.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/98 backdrop-blur-md flex flex-col justify-between p-6 select-none"
          >
            {/* Close trigger & pagination */}
            <div className="flex items-center justify-between w-full relative z-10">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 font-mono">
                Asset {activeMediaIndex + 1} of {post.mediaUrls.length}
              </span>
              <button 
                type="button"
                onClick={() => setActiveMediaIndex(null)}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Media Core Container */}
            <div className="flex-1 flex items-center justify-center relative my-4">
              <div className="relative max-w-4xl max-h-[70vh] w-full h-full aspect-video">
                <Image
                  src={post.mediaUrls[activeMediaIndex]}
                  fill
                  className="object-contain"
                  alt="active media"
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  priority
                />
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-center gap-4 relative z-10">
              <button
                type="button"
                disabled={activeMediaIndex === 0}
                onClick={() => setActiveMediaIndex(prev => prev !== null ? Math.max(0, prev - 1) : null)}
                className="px-6 py-3 rounded-xl bg-white/5 disabled:opacity-20 border border-white/5 text-xs font-bold uppercase tracking-widest text-white hover:bg-white/10 transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={activeMediaIndex === post.mediaUrls.length - 1}
                onClick={() => setActiveMediaIndex(prev => prev !== null ? Math.min(post.mediaUrls!.length - 1, prev + 1) : null)}
                className="px-6 py-3 rounded-xl bg-white/5 disabled:opacity-20 border border-white/5 text-xs font-bold uppercase tracking-widest text-white hover:bg-white/10 transition-colors"
              >
                Next
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      {!isOwner && post.author?.id && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetType="post"
          targetId={post.id}
          reportedUserId={post.author.id}
          contentPreview={post.content?.slice(0, 120)}
        />
      )}

      {/* Comment Sheet Bottom Overlay */}
      {showCommentSheet && (
        <CommentSheet
          postId={post.id}
          commentCount={commentCount}
          currentUserId={currentUserId}
          onClose={() => setShowCommentSheet(false)}
          postAuthorId={post.author?.id}
        />
      )}
    </>
  );
});

PostCard.displayName = 'PostCard';
export default PostCard;

function ActionBtn({ active, icon: Icon, label, activeColor, onClick }: any) {
  return (
    <button 
      type="button" 
      onClick={onClick} 
      className={clsx(
        'flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg transition-all duration-200 font-bold text-[12px] tracking-wide group/act select-none', 
        active ? activeColor : 'text-slate-500 hover:text-slate-200'
      )}
    >
       <Icon 
        size={16} 
        className={clsx(
          "transition-transform group-hover/act:scale-105", 
          active && "opacity-100",
          active && Icon === Heart && "fill-rose-500 text-rose-500 animate-pulse"
        )}
       />
       {label !== undefined && label !== null && (
         <span className="opacity-80 group-hover/act:opacity-100">{label}</span>
       )}
     </button>
  );
}

function IOSSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={clsx(
        "w-10 h-5.5 rounded-full transition-colors duration-200 focus:outline-none flex items-center px-0.5 shrink-0",
        checked ? "bg-[#34C759]" : "bg-white/10"
      )}
    >
      <div
        className={clsx(
          "w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform duration-200",
          checked ? "translate-x-[18px]" : "translate-x-0"
        )}
      />
    </button>
  );
}
