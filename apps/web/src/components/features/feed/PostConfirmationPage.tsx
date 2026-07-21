'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Share2, Globe, Users, Heart, Star, Lock, Settings, 
  Calendar, MapPin, User, Volume2, Play, Link, Hash, Info, CheckCircle
} from 'lucide-react';
import clsx from 'clsx';
import { SpotifyTrack } from '@/hooks/useSpotify';

const SPRING_TRANSITION = { type: 'spring', stiffness: 350, damping: 30 };

interface SelectedMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  originalUrl?: string;
  name: string;
  duration?: number;
  sizeBytes?: number;
  compressedSize?: string;
}

interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  color: string;
  opacity: number;
  rotation: number;
  scale: number;
  bold: boolean;
  italic: boolean;
  background: 'none' | 'solid' | 'glass' | 'neon';
  backgroundColor: string;
  shadow: boolean;
  gradient: boolean;
  gradientColors: string[];
  letterSpacing: number;
}

interface OverlayLayer {
  id: string;
  type: 'shape' | 'frame' | 'sticker' | 'emoji' | 'gif' | 'gradient' | 'blur' | 'glass';
  value: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

interface MediaEdits {
  filterId: string;
  filterIntensity: number;
  brightness: number;
  contrast: number;
  highlights: number;
  shadows: number;
  warmth: number;
  tint: number;
  structure: number;
  saturation: number;
  sharpness: number;
  noiseReduction: number;
  vignette: number;
  fade: number;
  tiltShift: 'none' | 'radial' | 'linear';
  tiltShiftValue: number;
  perspectiveX: number;
  perspectiveY: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  cropAspect: 'original' | '1:1' | '4:5' | '16:9';
  textLayers: TextLayer[];
  overlayLayers: OverlayLayer[];
  videoAudioMode: 'mute' | 'original' | 'mix';
  videoVolume: number;
}

interface PostConfirmationPageProps {
  selectedMedia: SelectedMedia[];
  mediaEdits: Record<string, MediaEdits>;
  selectedTrackId: string | null;
  selectedSpotifyTrack?: SpotifyTrack | null;
  musicVolume: number;
  musicTrimStart: number;
  musicTrimEnd: number;
  caption: string;
  taggedUsers: string[];
  selectedLocation: string | null;
  audience: 'everyone' | 'followers' | 'friends' | 'close_friends' | 'private' | 'custom';
  isScheduled: boolean;
  scheduleDate: string;
  onBack: () => void;
  onConfirm: () => void;
}

export default function PostConfirmationPage({
  selectedMedia,
  mediaEdits,
  selectedTrackId,
  selectedSpotifyTrack,
  musicVolume,
  musicTrimStart,
  musicTrimEnd,
  caption,
  taggedUsers,
  selectedLocation,
  audience,
  isScheduled,
  scheduleDate,
  onBack,
  onConfirm
}: PostConfirmationPageProps) {
  const [previewIdx, setPreviewIdx] = useState(0);
  const activeMedia = selectedMedia[previewIdx];
  const edits = mediaEdits[activeMedia?.id] || {
    filterId: 'original', filterIntensity: 100, brightness: 0, contrast: 0,
    highlights: 0, shadows: 0, warmth: 0, tint: 0, structure: 0, saturation: 0,
    sharpness: 0, noiseReduction: 0, vignette: 0, fade: 0, tiltShift: 'none',
    tiltShiftValue: 15, perspectiveX: 0, perspectiveY: 0, rotation: 0,
    flipH: false, flipV: false, cropAspect: 'original', textLayers: [],
    overlayLayers: [], videoAudioMode: 'mix', videoVolume: 50
  };

  // Helper function to return visual filters
  const getCSSFilters = (e: MediaEdits) => {
    let s = '';
    s += `brightness(${100 + e.brightness}%) `;
    s += `contrast(${100 + e.contrast}%) `;
    s += `saturate(${100 + e.saturation}%) `;
    if (e.warmth > 0) s += `sepia(${e.warmth * 0.4}%) `;
    else if (e.warmth < 0) s += `hue-rotate(${e.warmth * 0.15}deg) `;
    if (e.tint !== 0) s += `hue-rotate(${e.tint * 0.3}deg) `;
    if (e.fade > 0) s += `opacity(${100 - e.fade * 0.4}%) `;
    if (e.filterId !== 'original') {
      const presets: Record<string, string> = {
        vesper: 'sepia(30%) contrast(115%) saturate(105%)',
        cyberpunk: 'hue-rotate(50deg) saturate(170%) contrast(120%)',
        noir: 'grayscale(100%) contrast(140%) brightness(95%)',
        chrome: 'saturate(150%) contrast(120%)',
        solitude: 'saturate(55%) hue-rotate(-20deg)',
        retro: 'sepia(20%) saturate(90%) contrast(95%)',
        frost: 'hue-rotate(185deg) brightness(105%) contrast(90%)'
      };
      s += `${presets[e.filterId] || ''} `;
    }
    return s.trim();
  };

  const getCSSTransforms = (e: MediaEdits) => {
    let s = '';
    s += `rotate(${e.rotation}deg) `;
    if (e.flipH) s += `scaleX(-1) `;
    if (e.flipV) s += `scaleY(-1) `;
    if (e.perspectiveX !== 0 || e.perspectiveY !== 0) {
      s += `perspective(400px) rotateX(${e.perspectiveY * 0.25}deg) rotateY(${e.perspectiveX * 0.25}deg) `;
    }
    return s.trim();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={SPRING_TRANSITION}
      className="fixed inset-0 z-[950] flex flex-col bg-[#040209] text-white select-none overflow-hidden"
    >
      {/* Ambient Premium Violet Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-violet-950/10 blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-950/15 blur-[140px] pointer-events-none z-0" />

      {/* ── Top Bar Header ── */}
      <header className="h-20 flex-shrink-0 flex items-center justify-between px-8 border-b border-[#170f2f] bg-[#090612]/60 backdrop-blur-md relative z-20">
        <button
          onClick={onBack}
          className="group flex items-center gap-3.5 px-5 py-2.5 rounded-2xl bg-[#120c24] hover:bg-[#160f2c] border border-[#25194a]/85 active:scale-95 transition-all text-neutral-350 hover:text-white"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-[12px] font-bold font-display tracking-wider uppercase">Go Back</span>
        </button>

        <div className="text-center">
          <span className="font-mono text-[9px] text-[#6C63FF] tracking-[0.3em] font-black uppercase block mb-1">
            CONFIRMATION LAYER
          </span>
          <h1 className="text-[16px] font-black font-display tracking-tight text-white">Ready to publish?</h1>
        </div>

        <div className="w-[120px]" />
      </header>

      {/* ── Content Layout ── */}
      <div className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row pb-28 lg:pb-0 relative z-10">
        
        {/* Left Column: Visual Review */}
        <div className="w-full lg:flex-1 bg-[#06040b]/30 p-8 flex flex-col items-center justify-center relative border-b lg:border-b-0 lg:border-r border-[#170f2f]">
          <div className="relative aspect-square w-full max-w-[420px] rounded-[24px] border border-[#20143f] bg-[#0c081a] flex items-center justify-center overflow-hidden shadow-2xl">
            {activeMedia.type === 'image' ? (
              <img 
                src={activeMedia.url} 
                className="max-w-full max-h-full object-contain"
                style={{
                  filter: getCSSFilters(edits as MediaEdits),
                  transform: getCSSTransforms(edits as MediaEdits)
                }}
                alt="Post preview"
              />
            ) : (
              <video 
                src={activeMedia.url} 
                className="max-w-full max-h-full object-contain"
                muted
                autoPlay
                loop
                playsInline
                style={{
                  filter: getCSSFilters(edits as MediaEdits),
                  transform: getCSSTransforms(edits as MediaEdits)
                }}
              />
            )}

            {/* Badges */}
            <div className="absolute top-4 left-4 bg-[#090612]/85 backdrop-blur-md px-2.5 py-1 rounded-lg text-[9px] font-mono text-slate-355 border border-[#20143f]">
              Preset: {edits.filterId !== 'original' ? edits.filterId.toUpperCase() : 'NONE'}
            </div>

            <div className="absolute top-4 right-4 bg-[#090612]/85 backdrop-blur-md px-2.5 py-1 rounded-lg text-[9px] font-mono text-slate-355 border border-[#20143f]">
              {previewIdx + 1} / {selectedMedia.length}
            </div>          </div>

            {/* Render Canvas Typography Layers */}
            {edits.textLayers.map((layer) => (
              <div
                key={layer.id}
                className="absolute pointer-events-none select-none"
                style={{
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  transform: `translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale * 0.85})`,
                  color: layer.color,
                  opacity: layer.opacity / 100,
                  fontFamily: layer.fontFamily,
                  fontSize: `${layer.fontSize * 0.85}px`,
                  fontWeight: layer.bold ? 'bold' : 'normal',
                  fontStyle: layer.italic ? 'italic' : 'normal',
                  textShadow: layer.shadow ? '2px 2px 4px rgba(0,0,0,0.6)' : 'none',
                  letterSpacing: `${layer.letterSpacing}px`,
                }}
              >
                <span className={clsx(
                  "px-2 py-1 rounded",
                  layer.background === 'solid' && 'bg-black',
                  layer.background === 'glass' && 'bg-white/10 backdrop-blur-md border border-white/10',
                  layer.background === 'neon' && 'bg-[#6C63FF]/20 border border-[#6C63FF]/30 text-[#6C63FF] shadow-glow'
                )}>
                  {layer.text}
                </span>
              </div>
            ))}

            {/* Render Canvas Stickers */}
            {edits.overlayLayers.map((layer) => (
              <div
                key={layer.id}
                className="absolute pointer-events-none select-none text-xl"
                style={{
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  transform: `translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale * 0.85})`,
                  opacity: layer.opacity / 100
                }}
              >
                {layer.type === 'emoji' && <span>{layer.value}</span>}
                {layer.type === 'sticker' && <span className="filter drop-shadow-[0_0_6px_rgba(108,99,255,0.5)]">{layer.value}</span>}
                {layer.type === 'shape' && (
                  <div className="w-12 h-12 bg-[#6C63FF]/20 border border-[#6C63FF]/30 backdrop-blur-sm rounded flex items-center justify-center text-[8px] font-mono uppercase tracking-wider text-slate-350">
                    {layer.value}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Carousel thumbnails switcher */}
          {selectedMedia.length > 1 && (
            <div className="flex gap-2.5 mt-4 overflow-x-auto hide-scrollbar max-w-[420px] pb-1">
              {selectedMedia.map((m, idx) => (
                <div
                  key={m.id}
                  onClick={() => setPreviewIdx(idx)}
                  className={clsx(
                    'w-11 h-11 rounded-lg overflow-hidden border cursor-pointer flex-shrink-0 transition-all',
                    idx === previewIdx ? 'border-[#6C63FF] scale-105 shadow-glow-primary' : 'border-white/10 opacity-40 hover:opacity-100'
                  )}
                >
                  <img src={m.url} className="w-full h-full object-cover" alt="Thumb" />
                </div>
              ))}
            </div>
          )}
        {/* Right Column: Spec metadata reviews */}
        <div className="w-full lg:w-[460px] xl:w-[500px] bg-[#080510] border-l border-[#170f2f] flex flex-col p-6 pb-28 space-y-6 lg:overflow-y-auto lg:page-scroll">
          <div>
            <h3 className="text-xs font-mono font-black text-slate-500 uppercase tracking-widest">// DECRYPTED SPECIFICATIONS</h3>
            <p className="text-[10px] text-slate-600 mt-1">Verify metadata properties before grid broadcasting.</p>
          </div>

          <div className="space-y-4">
            
            {/* Caption Card */}
            <div className="p-4 rounded-xl border border-[#1c1236] bg-[#0b0b16]/30 space-y-2">
              <span className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider block">Caption Content</span>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                {caption.trim() ? caption : <span className="italic text-slate-600">No caption written.</span>}
              </p>
            </div>

            {/* Tagged People Card */}
            <div className="p-4 rounded-xl border border-[#1c1236] bg-[#0b0b16]/30 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                <User size={14} className="text-[#6C63FF]" />
                <span className="text-slate-400">Tagged Users</span>
              </div>
              <div className="flex flex-wrap gap-1 justify-end max-w-[240px]">
                {taggedUsers.length > 0 ? (
                  taggedUsers.map(u => (
                    <span key={u} className="text-[10px] text-white bg-[#6C63FF]/15 px-2 py-0.5 rounded-md border border-[#6C63FF]/30">
                      {u}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-600 italic">None</span>
                )}
              </div>
            </div>

            {/* Location Card */}
            <div className="p-4 rounded-xl border border-[#1c1236] bg-[#0b0b16]/30 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                <MapPin size={14} className="text-cyan-400" />
                <span className="text-slate-400">Location Tag</span>
              </div>
              <span className="text-white font-bold">
                {selectedLocation ? selectedLocation : <span className="text-slate-600 font-normal italic">None</span>}
              </span>
            </div>

            {/* Soundtrack loop Card */}
            <div className="p-4 rounded-xl border border-[#1c1236] bg-[#0b0b16]/30 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                <Volume2 size={14} className="text-[#6C63FF]" />
                <span className="text-slate-400">Background Music</span>
              </div>
              <span className="text-white font-bold">
                {selectedSpotifyTrack ? (
                  `${selectedSpotifyTrack.name} - ${selectedSpotifyTrack.artist}`
                ) : selectedTrackId ? (
                  'Custom Track'
                ) : (
                  <span className="text-slate-600 font-normal italic">Original Audio</span>
                )}
              </span>
            </div>

            {/* Audience privacy setting */}
            <div className="p-4 rounded-xl border border-[#1c1236] bg-[#0b0b16]/30 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                <Globe size={14} className="text-[#6C63FF]" />
                <span className="text-slate-400">Decryption Audience</span>
              </div>
              <span className="text-white font-black uppercase tracking-wider bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full text-[9px]">
                {audience}
              </span>
            </div>

            {/* Schedule time setting */}
            <div className="p-4 rounded-xl border border-[#1c1236] bg-[#0b0b16]/30 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                <Calendar size={14} className="text-amber-400" />
                <span className="text-slate-400">Release Schedule</span>
              </div>
              <span className="text-white font-bold">
                {isScheduled && scheduleDate ? (
                  new Date(scheduleDate).toLocaleString()
                ) : (
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md">Immediate Release</span>
                )}
              </span>
            </div>

          </div>

          {/* Guidelines warning */}
          <div className="p-3.5 rounded-xl border border-[#1c1236] bg-[#0c081a]/40 text-[10px] text-neutral-450 leading-relaxed font-mono flex items-start gap-2.5">
            <Info size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <span>
              By publishing, you commit this signal data block to the public Verlyn network. Verify that all media filter edits are final.
            </span>
          </div>

        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="absolute bottom-0 left-0 right-0 h-24 border-t border-[#170f2f] bg-[#090612]/90 backdrop-blur-md px-8 flex items-center justify-between z-40">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-lg bg-[#120c24] hover:bg-[#160f2c] border border-[#25194a]/85 text-xs font-medium text-slate-350 transition-all active:scale-[0.98]"
        >
          Cancel & Edit
        </button>

        <button
          onClick={onConfirm}
          className="group flex items-center gap-3 px-8 py-2.5 rounded-lg bg-[#6C63FF] hover:bg-[#5b52f5] active:scale-[0.98] transition-all text-xs font-semibold tracking-wide text-white shadow-[0_0_20px_rgba(108,99,255,0.2)] border border-[#6C63FF]/30 select-none"
        >
          <span>Confirm & Publish</span>
          <Share2 size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </footer>
    </motion.div>
  );
}
