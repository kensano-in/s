'use client';

import { useState } from 'react';
import { ExternalLink, Youtube, Instagram, Twitter, Facebook, Globe, Play } from 'lucide-react';

export type SocialPlatform = 'twitter' | 'instagram' | 'facebook' | 'youtube' | 'unknown';

export interface SocialEmbed {
  url: string;
  platform: SocialPlatform;
  videoId?: string;      // YouTube video ID
  postId?: string;       // Instagram/Twitter post ID
}

// ── Platform Detection ───────────────────────────────────────────────────────
export function detectPlatform(url: string): SocialEmbed {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = u.hostname.replace('www.', '');

    // YouTube
    if (host === 'youtube.com' || host === 'youtu.be') {
      let videoId: string | undefined;
      if (host === 'youtu.be') {
        videoId = u.pathname.slice(1).split('?')[0];
      } else {
        videoId = u.searchParams.get('v') || undefined;
        if (!videoId && u.pathname.startsWith('/shorts/')) {
          videoId = u.pathname.split('/shorts/')[1]?.split('?')[0];
        }
      }
      return { url, platform: 'youtube', videoId };
    }

    // Twitter / X
    if (host === 'twitter.com' || host === 'x.com') {
      const parts = u.pathname.split('/');
      const statusIdx = parts.indexOf('status');
      const postId = statusIdx !== -1 ? parts[statusIdx + 1] : undefined;
      return { url, platform: 'twitter', postId };
    }

    // Instagram
    if (host === 'instagram.com') {
      const parts = u.pathname.split('/').filter(Boolean);
      const pIdx = parts.indexOf('p');
      const reelIdx = parts.indexOf('reel');
      const postId = pIdx !== -1 ? parts[pIdx + 1] : reelIdx !== -1 ? parts[reelIdx + 1] : undefined;
      return { url, platform: 'instagram', postId };
    }

    // Facebook
    if (host === 'facebook.com' || host === 'fb.com' || host === 'fb.watch') {
      return { url, platform: 'facebook' };
    }

    return { url, platform: 'unknown' };
  } catch {
    return { url, platform: 'unknown' };
  }
}

// ── Platform Config ──────────────────────────────────────────────────────────
const PLATFORM_CONFIG: Record<SocialPlatform, {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.FC<{ size?: number; className?: string }>;
}> = {
  twitter: {
    label: 'X (Twitter)',
    color: 'text-white',
    bg: 'bg-black',
    border: 'border-white/10',
    icon: Twitter,
  },
  instagram: {
    label: 'Instagram',
    color: 'text-white',
    bg: 'bg-gradient-to-br from-purple-600/20 via-pink-500/20 to-amber-500/20',
    border: 'border-pink-500/20',
    icon: Instagram,
  },
  facebook: {
    label: 'Facebook',
    color: 'text-blue-400',
    bg: 'bg-blue-950/30',
    border: 'border-blue-500/20',
    icon: Facebook,
  },
  youtube: {
    label: 'YouTube',
    color: 'text-red-400',
    bg: 'bg-red-950/20',
    border: 'border-red-500/20',
    icon: Youtube,
  },
  unknown: {
    label: 'External Link',
    color: 'text-neutral-400',
    bg: 'bg-white/[0.02]',
    border: 'border-white/[0.06]',
    icon: Globe,
  },
};

// ── Component ────────────────────────────────────────────────────────────────
interface SocialEmbedCardProps {
  embed: SocialEmbed;
  compact?: boolean;
}

export default function SocialEmbedCard({ embed, compact = false }: SocialEmbedCardProps) {
  const [imgError, setImgError] = useState(false);
  const config = PLATFORM_CONFIG[embed.platform];
  const Icon = config.icon;

  const displayUrl = embed.url.length > 55 ? embed.url.slice(0, 52) + '…' : embed.url;

  // YouTube thumbnail
  const ytThumb = embed.platform === 'youtube' && embed.videoId
    ? `https://img.youtube.com/vi/${embed.videoId}/hqdefault.jpg`
    : null;

  return (
    <a
      href={embed.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        group block rounded-xl border backdrop-blur-sm overflow-hidden transition-all duration-200
        hover:brightness-110 hover:scale-[1.01] active:scale-[0.99]
        ${config.bg} ${config.border}
        ${compact ? 'p-2.5' : 'p-3'}
      `}
    >
      {/* YouTube has thumbnail */}
      {ytThumb && !imgError && (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-2.5 bg-black/40">
          <img
            src={ytThumb}
            alt="YouTube thumbnail"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/40">
              <Play size={16} className="text-white ml-0.5" fill="white" />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Platform icon badge */}
          <div className={`
            shrink-0 w-6 h-6 rounded-md flex items-center justify-center
            ${embed.platform === 'twitter' ? 'bg-black border border-white/10' : ''}
            ${embed.platform === 'instagram' ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-amber-400' : ''}
            ${embed.platform === 'facebook' ? 'bg-blue-600' : ''}
            ${embed.platform === 'youtube' ? 'bg-red-600' : ''}
            ${embed.platform === 'unknown' ? 'bg-white/10' : ''}
          `}>
            <Icon size={13} className="text-white" />
          </div>

          <div className="min-w-0">
            <p className={`text-[10px] font-black uppercase tracking-widest ${config.color}`}>
              {config.label}
            </p>
            <p className="text-[10px] text-neutral-500 truncate font-mono leading-tight">
              {displayUrl}
            </p>
          </div>
        </div>

        <ExternalLink
          size={11}
          className="text-neutral-600 group-hover:text-neutral-300 transition-colors shrink-0"
        />
      </div>

      {/* Instagram visual hint */}
      {embed.platform === 'instagram' && (
        <div className="mt-2 pt-2 border-t border-white/[0.05]">
          <div className="flex items-center gap-1.5">
            <div className="flex gap-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-12 h-8 rounded-md bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-amber-500/10 border border-white/5" />
              ))}
            </div>
            <p className="text-[9px] text-neutral-600 font-semibold">View on Instagram</p>
          </div>
        </div>
      )}

      {/* Twitter/X post hint */}
      {embed.platform === 'twitter' && (
        <div className="mt-2 pt-2 border-t border-white/[0.05]">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-white/10 shrink-0" />
            <div className="space-y-1 flex-1">
              <div className="h-2 bg-white/10 rounded-full w-3/4" />
              <div className="h-2 bg-white/[0.06] rounded-full w-full" />
              <div className="h-2 bg-white/[0.06] rounded-full w-2/3" />
            </div>
          </div>
        </div>
      )}
    </a>
  );
}
