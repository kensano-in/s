'use client';

import { useState } from 'react';
import { Play, Pause, Music, Volume2, VolumeX, Square } from 'lucide-react';
import { Track } from './MusicPicker';
import clsx from 'clsx';

interface ProfileMusicCardProps {
  track: Track | null;
  editable?: boolean;
}

export function ProfileMusicCard({ track, editable = false }: ProfileMusicCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  if (!track) {
    return null;
  }

  // Generate the correct URL for the iframe embed player
  const getEmbedUrl = () => {
    switch (track.source) {
      case 'spotify':
        return `https://open.spotify.com/embed/track/${track.embedId}?utm_source=generator&theme=0`;
      case 'youtube':
        return `https://www.youtube.com/embed/${track.embedId}?autoplay=1&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`;
      case 'soundcloud':
        return `https://w.soundcloud.com/player/?url=${track.embedId}&color=%2310b981&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false`;
      default:
        return '';
    }
  };

  return (
    <div className="w-full bg-[#050505] border border-white/10 rounded-2xl overflow-hidden shadow-xl hover:border-white/20 transition-all duration-300">
      {/* Sleek Custom AMOLED Player Header */}
      <div className="p-4 flex items-center justify-between gap-4 relative">
        <div className="flex items-center gap-3">
          {/* Animated/Glowing Spinning Album Artwork */}
          <div className="relative group shrink-0">
            <div className={clsx(
              "w-11 h-11 rounded-xl overflow-hidden border border-white/5 bg-neutral-900 transition-all duration-500",
              isPlaying && "ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/20"
            )}>
              <img src={track.artwork} alt={track.name} className="w-full h-full object-cover" />
            </div>
            {/* Overlay play button on artwork */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl text-white"
            >
              {isPlaying ? <Square size={14} fill="white" /> : <Play size={14} fill="white" className="ml-0.5" />}
            </button>
          </div>

          {/* Track details */}
          <div className="min-w-0">
            <span className="text-[9px] font-extrabold uppercase text-blue-400 tracking-wider flex items-center gap-1.5 leading-none mb-1">
              <Music size={9} /> Pinned Track
            </span>
            <h4 className="text-[13px] font-extrabold text-white leading-tight truncate max-w-[180px] sm:max-w-[240px]">
              {track.name}
            </h4>
            <p className="text-[11.5px] text-neutral-500 mt-0.5 leading-none truncate max-w-[180px] sm:max-w-[240px]">
              {track.artist}
            </p>
          </div>
        </div>

        {/* Action button controls */}
        <div className="flex items-center gap-2">
          {/* Active SVG audio wave animation when playing */}
          {isPlaying && (
            <div className="flex items-end gap-0.5 h-3 px-1 select-none" aria-hidden="true">
              <span className="w-0.5 bg-blue-500 rounded-full animate-pulse h-2" style={{ animationDelay: '0.1s', animationDuration: '0.6s' }}></span>
              <span className="w-0.5 bg-blue-400 rounded-full animate-pulse h-3" style={{ animationDelay: '0.3s', animationDuration: '0.8s' }}></span>
              <span className="w-0.5 bg-blue-500 rounded-full animate-pulse h-1" style={{ animationDelay: '0.2s', animationDuration: '0.5s' }}></span>
              <span className="w-0.5 bg-blue-400 rounded-full animate-pulse h-2.5" style={{ animationDelay: '0.4s', animationDuration: '0.7s' }}></span>
            </div>
          )}

          {/* Play/Pause control */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={clsx(
              "p-2 rounded-xl transition-all active:scale-95 border",
              isPlaying
                ? "bg-blue-600/10 border-blue-500/20 text-blue-400"
                : "bg-neutral-900 border-white/5 text-neutral-400 hover:text-white"
            )}
            aria-label={isPlaying ? "Pause track" : "Play track"}
          >
            {isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" className="ml-0.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Official Licensed Iframe Player Widget */}
      {isPlaying && (
        <div className="border-t border-white/5 bg-black animate-fade-in p-2">
          <iframe
            src={getEmbedUrl()}
            width="100%"
            height={track.source === 'spotify' ? '80' : '120'}
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            loading="lazy"
            title={`Licensed playback window for ${track.name}`}
            className="rounded-xl shadow-inner border border-white/5"
          />
        </div>
      )}
    </div>
  );
}
