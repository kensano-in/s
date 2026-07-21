'use client';

import { SpotifyTrack } from '@/hooks/useSpotify';
import { 
  Music, 
  Trash2, 
  RefreshCw, 
  Sliders, 
  Volume2, 
  VolumeX, 
  Scissors, 
  Sparkles,
  Disc
} from 'lucide-react';
import clsx from 'clsx';

interface VerlynMusicEditorProps {
  selectedTrack: SpotifyTrack;
  onReplaceTrack: () => void;
  onRemoveTrack: () => void;
  
  startTime: number; // in seconds
  endTime: number;   // in seconds
  musicVolume: number; // 0 to 100
  originalVolume: number; // 0 to 100
  fadeIn: number; // 0 to 5 seconds
  fadeOut: number; // 0 to 5 seconds
  
  onChangeStartTime: (t: number) => void;
  onChangeEndTime: (t: number) => void;
  onChangeMusicVolume: (v: number) => void;
  onChangeOriginalVolume: (v: number) => void;
  onChangeFadeIn: (v: number) => void;
  onChangeFadeOut: (v: number) => void;
  
  hasVideoAudio?: boolean;
}

export default function VerlynMusicEditor({
  selectedTrack,
  onReplaceTrack,
  onRemoveTrack,
  startTime,
  endTime,
  musicVolume,
  originalVolume,
  fadeIn,
  fadeOut,
  onChangeStartTime,
  onChangeEndTime,
  onChangeMusicVolume,
  onChangeOriginalVolume,
  onChangeFadeIn,
  onChangeFadeOut,
  hasVideoAudio = false,
}: VerlynMusicEditorProps) {
  
  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleStartTimeChange = (val: number) => {
    onChangeStartTime(val);
    // Keep a fixed duration of 15 seconds for stories or 30 seconds default for posts,
    // or let it slide dynamically up to the 30-second preview clip boundary.
    const duration = 15; // standard preview clip segment
    const newEnd = Math.min(val + duration, 30);
    onChangeEndTime(newEnd);
  };

  return (
    <div className="space-y-6 bg-neutral-950/40 backdrop-blur-3xl border border-white/5 p-5 rounded-2xl text-neutral-200">
      
      {/* 1. Track Info Card */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-900 border border-white/10">
            {selectedTrack.albumArtUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedTrack.albumArtUrl} alt={selectedTrack.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-6 h-6 text-neutral-600 animate-spin" />
              </div>
            )}
            <div className="absolute bottom-1 right-1 bg-black/60 p-0.5 rounded-full">
              <Disc className="w-3.5 h-3.5 text-emerald-500 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
          </div>
          
          <div className="min-w-0">
            <span className="text-[14px] font-bold block truncate leading-tight text-neutral-100">
              {selectedTrack.name}
            </span>
            <span className="text-[12px] text-neutral-500 truncate block mt-0.5">
              {selectedTrack.artist}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase block mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Spotify Audio Loop
            </span>
          </div>
        </div>

        {/* Replace/Remove Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onReplaceTrack}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-neutral-100 transition-all border border-white/5"
            title="Replace soundtrack"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onRemoveTrack}
            className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all border border-red-500/10"
            title="Remove soundtrack"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Audio Control Panel */}
      <div className="space-y-4">
        
        {/* Trim Start Time */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[12px] font-medium">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-cyan-400" />
              Start Offset
            </span>
            <span className="text-cyan-400 font-mono">{formatTime(startTime)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="15" // Bounded to 15s so we can play a 15s clip within the 30s preview limit
            step="0.5"
            value={startTime}
            onChange={(e) => handleStartTimeChange(parseFloat(e.target.value))}
            className="w-full accent-cyan-500 bg-white/5 h-1 rounded-lg appearance-none cursor-pointer outline-none"
          />
          <div className="flex justify-between text-[10px] text-neutral-600 font-mono">
            <span>0:00</span>
            <span>0:15</span>
          </div>
        </div>

        {/* Music Volume */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[12px] font-medium">
            <span className="text-neutral-400 flex items-center gap-1.5">
              {musicVolume === 0 ? <VolumeX className="w-3.5 h-3.5 text-neutral-600" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
              Soundtrack Volume
            </span>
            <span className="text-neutral-300 font-mono">{musicVolume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={musicVolume}
            onChange={(e) => onChangeMusicVolume(parseInt(e.target.value))}
            className="w-full accent-cyan-500 bg-white/5 h-1 rounded-lg appearance-none cursor-pointer outline-none"
          />
        </div>

        {/* Original Video Volume (Mixed Mode) */}
        {hasVideoAudio && (
          <div className="space-y-2 border-t border-white/5 pt-4">
            <div className="flex items-center justify-between text-[12px] font-medium">
              <span className="text-neutral-400 flex items-center gap-1.5">
                {originalVolume === 0 ? <VolumeX className="w-3.5 h-3.5 text-neutral-600" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
                Original Video Audio
              </span>
              <span className="text-neutral-300 font-mono">{originalVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={originalVolume}
              onChange={(e) => onChangeOriginalVolume(parseInt(e.target.value))}
              className="w-full accent-cyan-500 bg-white/5 h-1 rounded-lg appearance-none cursor-pointer outline-none"
            />
          </div>
        )}

        {/* Fade In & Fade Out */}
        <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-medium">
              <span className="text-neutral-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-500" />
                Fade In
              </span>
              <span className="text-neutral-300 font-mono">{fadeIn}s</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={fadeIn}
              onChange={(e) => onChangeFadeIn(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-white/5 h-1 rounded-lg appearance-none cursor-pointer outline-none"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-medium">
              <span className="text-neutral-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-500" />
                Fade Out
              </span>
              <span className="text-neutral-300 font-mono">{fadeOut}s</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={fadeOut}
              onChange={(e) => onChangeFadeOut(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-white/5 h-1 rounded-lg appearance-none cursor-pointer outline-none"
            />
          </div>
        </div>

      </div>

    </div>
  );
}
