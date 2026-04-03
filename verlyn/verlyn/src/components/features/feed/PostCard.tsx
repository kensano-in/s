'use client';

import { useState } from 'react';
import type { Post } from '@/lib/types';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Repeat2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked((v) => !v);
    setLikeCount((c) => liked ? c - 1 : c + 1);
  };

  return (
    <article className="post-card">
      {/* Community tag */}
      {post.communityId && (
        <div
          className="flex items-center gap-2 px-4 pt-3 pb-0"
        >
          <span className="text-lg leading-none">{post.communityIcon}</span>
          <span
            className="text-xs font-semibold hover:underline cursor-pointer"
            style={{ color: 'var(--v-violet-light)' }}
          >
            {post.communityName}
          </span>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Author row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.author.avatar}
                alt={post.author.displayName}
                className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
              />
              {post.author.isOnline && <span className="online-dot" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm cursor-pointer hover:underline" style={{ color: 'var(--text-primary)' }}>
                  {post.author.displayName}
                </span>
                {post.author.isVerified && (
                  <div className="verified-badge w-4 h-4 flex-shrink-0">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  </div>
                )}
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>·</span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  @{post.author.username}
                </span>
              </div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </div>
            </div>
          </div>

          <button className="icon-btn flex-shrink-0">
            <MoreHorizontal size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>
          {post.content}
        </div>

        {/* Media */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className={`grid gap-2 rounded-xl overflow-hidden ${post.mediaUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {post.mediaUrls.map((url, i) => (
              <div key={i} className={`relative overflow-hidden rounded-xl ${!imageLoaded ? 'skeleton' : ''}`} style={{ aspectRatio: post.mediaUrls!.length === 1 ? '16/9' : '1/1' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Media ${i + 1}`}
                  className="w-full h-full object-cover cursor-pointer transition-transform duration-300 hover:scale-105"
                  style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
                  onLoad={() => setImageLoaded(true)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            {/* Like */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                liked ? 'text-red-400' : ''
              }`}
              style={{
                color: liked ? 'var(--v-red)' : 'var(--text-secondary)',
                background: liked ? 'rgba(255,75,107,0.1)' : 'transparent',
              }}
              id={`like-btn-${post.id}`}
            >
              <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
              <span>{fmt(likeCount)}</span>
            </button>

            {/* Comment */}
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-105"
              style={{ color: 'var(--text-secondary)' }}
              id={`comment-btn-${post.id}`}
            >
              <MessageCircle size={16} />
              <span>{fmt(post.commentCount)}</span>
            </button>

            {/* Repost */}
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-105"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Repeat2 size={16} />
              <span>{fmt(post.shareCount)}</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            {/* Share */}
            <button className="icon-btn" title="Share">
              <Share2 size={16} />
            </button>

            {/* Save */}
            <button
              onClick={(e) => { e.stopPropagation(); setSaved((v) => !v); }}
              className="icon-btn transition-colors"
              title={saved ? 'Unsave' : 'Save'}
              style={{ color: saved ? 'var(--v-violet)' : 'var(--text-secondary)' }}
              id={`save-btn-${post.id}`}
            >
              <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
