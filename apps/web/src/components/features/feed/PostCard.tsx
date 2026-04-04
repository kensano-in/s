'use client';

import { useState } from 'react';
import type { Post } from '@/lib/types';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Repeat2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface Props { post: Post }

export default function PostCard({ post }: Props) {
  const [liked, setLiked] = useState<boolean>(post.isLiked ?? false);
  const [saved, setSaved] = useState<boolean>(post.isSaved ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number }[]>([]);
  // Shimmer tracking state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isCardHovered, setIsCardHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isLiking = !liked;
    setLiked(isLiking);
    setLikeCount((c) => isLiking ? c + 1 : c - 1);
    
    // Twitch-Style Particle Spawner on Like
    if (isLiking) {
      const newParticle = { id: Date.now(), x: (Math.random() - 0.5) * 40 };
      setParticles(p => [...p, newParticle]);
      // Garbage collect after 1.5s
      setTimeout(() => {
        setParticles(p => p.filter(part => part.id !== newParticle.id));
      }, 1500);
    }
  };

  return (
    <article 
      className="glass-card flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-[0_40px_80px_-12px_rgba(208,188,255,0.08)] relative"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
    >
      {/* Magnetic Ethereal Shimmer layer */}
      {isCardHovered && (
        <div 
          className="pointer-events-none absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(208, 188, 255, 0.05), transparent 40%)`,
          }}
        />
      )}

      {/* Community tag (Glass pill style) */}
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
                src={post.author.avatar}
                alt={post.author.displayName}
                className="w-11 h-11 rounded-full object-cover cursor-pointer hover:opacity-90 transition-all border border-outline-variant/10 shadow-ambient"
              />
              {post.author.isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-secondary-light border-2 border-surface-highest rounded-full" />}
            </div>
            
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-[15px] cursor-pointer hover:text-primary-light transition-colors text-on-surface tracking-tight">
                  {post.author.displayName}
                </span>
                {post.author.isVerified && (
                  <div className="flex-shrink-0 bg-primary-gradient w-3.5 h-3.5 rounded-full flex items-center justify-center p-[2px] shadow-ambient">
                    <svg viewBox="0 0 24 24" fill="white" className="w-full h-full"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  </div>
                )}
                <span className="text-xs font-medium text-on-surface-variant ml-1">
                  @{post.author.username}
                </span>
              </div>
              <div className="text-[11px] font-medium text-on-surface-variant opacity-70">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </div>
            </div>
          </div>

          <button className="icon-btn text-on-surface-variant hover:text-on-surface hover:bg-surface-high transition-colors">
            <MoreHorizontal size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="text-[15px] leading-relaxed whitespace-pre-line text-on-surface font-medium pl-[56px]">
          {post.content}
        </div>

        {/* Media Grid */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className={clsx('grid gap-2 overflow-hidden pl-[56px]', post.mediaUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
            {post.mediaUrls.map((url, i) => (
              <div key={i} className={`relative overflow-hidden rounded-[24px] border border-outline-variant/10 shadow-ambient ${!imageLoaded ? 'bg-surface-highest animate-pulse' : ''}`} style={{ aspectRatio: post.mediaUrls!.length === 1 ? '16/9' : '1/1' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Media ${i + 1}`}
                  className="w-full h-full object-cover cursor-pointer transition-transform duration-500 hover:scale-[1.03]"
                  style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.5s ease-in-out' }}
                  onLoad={() => setImageLoaded(true)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Actions Row */}
        <div className="flex items-center justify-between pt-3 pl-[52px]">
          <div className="flex items-center gap-1 sm:gap-4">
            
            {/* Like with Live Twitch Reactions */}
            <button
              onClick={handleLike}
              className={clsx(
                'relative flex items-center gap-2 cursor-pointer transition-all duration-200 px-3 py-1.5 rounded-full z-10',
                liked ? 'text-secondary-light bg-secondary-dark/10' : 'text-on-surface-variant hover:text-secondary-light hover:bg-surface-highest'
              )}
              id={`like-btn-${post.id}`}
            >
              {/* Floating Reaction Particles Array */}
              {particles.map(p => (
                <div 
                  key={p.id}
                  className="absolute pointer-events-none drop-shadow-[0_0_8px_rgba(255,100,150,0.8)] z-50 text-[18px]"
                  style={{
                    left: `calc(50% + ${p.x}px)`,
                    bottom: '10px',
                    animation: `float-up 1.5s ease-out forwards`,
                  }}
                >
                  🔥
                </div>
              ))}
              
              <Heart size={18} fill={liked ? 'currentColor' : 'none'} className={clsx(liked && 'animate-pulse-glow')} />
              <span className="font-semibold text-[13px]">{fmt(likeCount)}</span>
            </button>

            {/* Comment */}
            <button
              className="flex items-center gap-2 cursor-pointer transition-all duration-200 px-3 py-1.5 rounded-full text-on-surface-variant hover:text-primary-light hover:bg-surface-highest"
              id={`comment-btn-${post.id}`}
            >
              <MessageCircle size={18} />
              <span className="font-semibold text-[13px]">{fmt(post.commentCount)}</span>
            </button>

            {/* Repost */}
            <button
              className="flex items-center gap-2 cursor-pointer transition-all duration-200 px-3 py-1.5 rounded-full text-on-surface-variant hover:text-green-400 hover:bg-surface-highest"
            >
              <Repeat2 size={18} />
              <span className="font-semibold text-[13px]">{fmt(post.shareCount)}</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-highest transition-colors" title="Share">
              <Share2 size={18} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setSaved((v) => !v); }}
              className="p-2 rounded-full transition-colors"
              title={saved ? 'Unsave' : 'Save'}
              style={{ color: saved ? 'var(--v-violet)' : 'var(--text-secondary)' }}
              id={`save-btn-${post.id}`}
            >
              <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} className={saved ? 'text-primary-light' : 'text-on-surface-variant hover:bg-surface-highest'} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
