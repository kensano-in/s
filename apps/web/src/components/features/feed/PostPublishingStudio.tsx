'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Check, Globe, Users, Heart, Star, Lock, Settings, 
  Calendar, Clock, MessageSquare, EyeOff, Share2, Download, Compass, 
  MapPin, User, Volume2, Play, Pause, Link, Hash, ChevronDown, 
  ChevronUp, Loader2, Sparkles, AlertCircle
} from 'lucide-react';
import clsx from 'clsx';
import { SpotifyTrack } from '@/hooks/useSpotify';
import { createClient } from '@/lib/supabase/client';

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

interface PostPublishingStudioProps {
  selectedMedia: SelectedMedia[];
  mediaEdits: Record<string, MediaEdits>;
  selectedTrackId: string | null;
  selectedSpotifyTrack?: SpotifyTrack | null;
  musicVolume: number;
  musicTrimStart: number;
  musicTrimEnd: number;
  musicFadeIn: number;
  musicFadeOut: number;
  onBack: () => void;
  onClose: () => void;

  // Lifted up state props
  caption: string;
  setCaption: React.Dispatch<React.SetStateAction<string>>;
  taggedUsers: string[];
  setTaggedUsers: React.Dispatch<React.SetStateAction<string[]>>;
  selectedLocation: string | null;
  setSelectedLocation: React.Dispatch<React.SetStateAction<string | null>>;
  attachedLinks: string[];
  setAttachedLinks: React.Dispatch<React.SetStateAction<string[]>>;
  audience: 'everyone' | 'followers' | 'friends' | 'close_friends' | 'private' | 'custom';
  setAudience: React.Dispatch<React.SetStateAction<'everyone' | 'followers' | 'friends' | 'close_friends' | 'private' | 'custom'>>;
  hasReminder: boolean;
  setHasReminder: React.Dispatch<React.SetStateAction<boolean>>;
  reminderDate: string;
  setReminderDate: React.Dispatch<React.SetStateAction<string>>;
  isScheduled: boolean;
  setIsScheduled: React.Dispatch<React.SetStateAction<boolean>>;
  scheduleDate: string;
  setScheduleDate: React.Dispatch<React.SetStateAction<string>>;
  commentsOff: boolean;
  setCommentsOff: React.Dispatch<React.SetStateAction<boolean>>;
  hideLikes: boolean;
  setHideLikes: React.Dispatch<React.SetStateAction<boolean>>;
  hideShares: boolean;
  setHideShares: React.Dispatch<React.SetStateAction<boolean>>;
  allowRemix: boolean;
  setAllowRemix: React.Dispatch<React.SetStateAction<boolean>>;
  allowDownloads: boolean;
  setAllowDownloads: React.Dispatch<React.SetStateAction<boolean>>;
  
  onSharePressed: () => void;
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSwitch({ checked, onChange }: SwitchProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={clsx(
        "w-8 h-4.5 rounded-full p-0.5 transition-all duration-300 relative focus:outline-none border",
        checked 
          ? "bg-[#6C63FF]/30 border-[#6C63FF]/50" 
          : "bg-white/[0.02] border-white/[0.08]"
      )}
    >
      <div
        className={clsx(
          "w-3.5 h-3.5 rounded-full shadow-md transform transition-all duration-300",
          checked 
            ? "translate-x-3.5 bg-[#6C63FF]" 
            : "translate-x-0 bg-slate-500"
        )}
      />
    </button>
  );
}

export default function PostPublishingStudio({
  selectedMedia,
  mediaEdits,
  selectedTrackId,
  selectedSpotifyTrack,
  musicVolume,
  musicTrimStart,
  musicTrimEnd,
  musicFadeIn,
  musicFadeOut,
  onBack,
  onClose,

  caption,
  setCaption,
  taggedUsers,
  setTaggedUsers,
  selectedLocation,
  setSelectedLocation,
  attachedLinks,
  setAttachedLinks,
  audience,
  setAudience,
  hasReminder,
  setHasReminder,
  reminderDate,
  setReminderDate,
  isScheduled,
  setIsScheduled,
  scheduleDate,
  setScheduleDate,
  commentsOff,
  setCommentsOff,
  hideLikes,
  setHideLikes,
  hideShares,
  setHideShares,
  allowRemix,
  setAllowRemix,
  allowDownloads,
  setAllowDownloads,
  onSharePressed
}: PostPublishingStudioProps) {
  // Tagging state — real DB search
  const [tagInput, setTagInput] = useState('');
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [userSuggestions, setUserSuggestions] = useState<{ username: string; display_name: string; avatar_url: string | null }[]>([]);
  const [tagSearchLoading, setTagSearchLoading] = useState(false);

  // Location state — real Nominatim search
  const [locationInput, setLocationInput] = useState('');
  const [locDropdownOpen, setLocDropdownOpen] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [locSearchLoading, setLocSearchLoading] = useState(false);

  const tagSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = useMemo(() => createClient(), []);

  // Real user search from Supabase
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 1) { setUserSuggestions([]); return; }
    setTagSearchLoading(true);
    try {
      const clean = query.replace(/^@/, '');
      const { data } = await supabase
        .from('users')
        .select('username, display_name, avatar_url')
        .or(`username.ilike.${clean}%,display_name.ilike.%${clean}%`)
        .limit(8);
      setUserSuggestions(data || []);
      setTagDropdownOpen((data || []).length > 0);
    } catch { setUserSuggestions([]); }
    setTagSearchLoading(false);
  }, [supabase]);

  // Real location search from OpenStreetMap Nominatim (free, no key needed)
  const searchLocations = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) { setLocationSuggestions([]); return; }
    setLocSearchLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=0`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'Verlyn-Social/1.0' } }
      );
      const data = await res.json();
      setLocationSuggestions(data || []);
      setLocDropdownOpen((data || []).length > 0);
    } catch { setLocationSuggestions([]); }
    setLocSearchLoading(false);
  }, []);

  // External Links state
  const [linkInput, setLinkInput] = useState('');

  // Accordion state
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  // Preview Carousel active state
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

  const activeTrack = selectedSpotifyTrack ? { id: selectedSpotifyTrack.id, title: selectedSpotifyTrack.name } : selectedTrackId ? { id: selectedTrackId, title: 'Custom Track' } : null;

  // CSS / GPU Visual style helpers
  const getCSSFilters = (e: MediaEdits) => {
    let s = '';
    s += `brightness(${100 + e.brightness}%) `;
    s += `contrast(${100 + e.contrast}%) `;
    s += `saturate(${100 + e.saturation}%) `;
    
    if (e.warmth > 0) {
      s += `sepia(${e.warmth * 0.4}%) `;
    } else if (e.warmth < 0) {
      s += `hue-rotate(${e.warmth * 0.15}deg) `;
    }
    if (e.tint !== 0) {
      s += `hue-rotate(${e.tint * 0.3}deg) `;
    }
    if (e.fade > 0) {
      s += `opacity(${100 - e.fade * 0.4}%) `;
    }
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

  // Handle simulated share flow
  const handleSharePost = () => {
    // Flush any typed-but-uncommitted tag before navigating forward
    if (tagInput.trim()) {
      const tag = tagInput.trim().startsWith('@') ? tagInput.trim() : `@${tagInput.trim()}`;
      if (!taggedUsers.includes(tag)) {
        setTaggedUsers(prev => [...prev, tag]);
      }
      setTagInput('');
    }
    // Flush any typed-but-uncommitted location before navigating forward
    if (locationInput.trim()) {
      setSelectedLocation(locationInput.trim());
      setLocationInput('');
    }
    // Flush any typed-but-uncommitted link before navigating forward
    if (linkInput.trim() && !attachedLinks.includes(linkInput.trim())) {
      setAttachedLinks(prev => [...prev, linkInput.trim()]);
      setLinkInput('');
    }
    onSharePressed();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: '100vw' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100vw' }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="fixed inset-0 z-[900] flex flex-col bg-[#050508] text-white select-none overflow-hidden"
    >
      {/* Subtle Accent Glow */}
      <div className="absolute top-[-25%] left-[-15%] w-[70%] h-[70%] rounded-full bg-[#6C63FF]/[0.03] blur-[150px] pointer-events-none z-0" />

      {/* ── Header ── */}
      <header className="h-20 flex-shrink-0 flex items-center justify-between px-8 border-b border-white/[0.05] bg-[#0D0D11]/60 backdrop-blur-md relative z-20">
        <button
          onClick={onBack}
          className="group flex items-center gap-3.5 px-5 py-2.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] active:scale-95 transition-all text-neutral-300 hover:text-white"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-[12px] font-bold font-display tracking-wider uppercase">Edit Studio</span>
        </button>

        <div className="text-center">
          <span className="font-mono text-[9px] text-[#6C63FF] tracking-[0.3em] font-black uppercase block mb-1">
            FINAL DISPATCH
          </span>
          <h1 className="text-[16px] font-black font-display tracking-tight text-white">Publish Redesign</h1>
        </div>

        <div className="w-[120px]" />
      </header>

      {/* ── main studio panel workspace ── */}
      <div className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row relative pb-28 lg:pb-0">
        
        {/* LEFT COLUMN: Visual Preview & Soundtrack */}
        <div className="w-full lg:w-[450px] xl:w-[500px] flex-shrink-0 bg-white/[0.01] border-b lg:border-b-0 lg:border-r border-white/[0.05] flex flex-col p-6 space-y-6 lg:overflow-y-auto lg:page-scroll">
          <div>
            <h3 className="text-xs font-mono font-black text-slate-500 uppercase tracking-widest">// POST MEDIA PREVIEW</h3>
            <p className="text-[10px] text-slate-600 mt-1">Review the compiled layout of assets with active filters.</p>
          </div>

          {/* Core visual canvas preview wrapper */}
          <div className="relative aspect-square rounded-2xl border border-white/[0.08] bg-[#0D0D11] flex items-center justify-center overflow-hidden shadow-2xl">
            {activeMedia.type === 'image' ? (
              <img 
                src={activeMedia.url} 
                className="max-w-full max-h-full object-contain"
                style={{
                  filter: getCSSFilters(edits as MediaEdits),
                  transform: getCSSTransforms(edits as MediaEdits)
                }}
                alt="Image preview"
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

            {/* Visual crop aspect ratio overlay indicators */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[9px] font-mono text-slate-300">
              Crop: {edits.cropAspect} | Filter: {edits.filterId !== 'original' ? edits.filterId : 'none'}
            </div>

            {/* Total items badge */}
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[9px] font-mono text-slate-300">
              {previewIdx + 1} / {selectedMedia.length}
            </div>

            {/* Text & Overlay Layers on Preview Canvas */}
            {edits.textLayers.map((layer) => (
              <div
                key={layer.id}
                className="absolute pointer-events-none select-none"
                style={{
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  transform: `translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale * 0.9})`,
                  color: layer.color,
                  opacity: layer.opacity / 100,
                  fontFamily: layer.fontFamily,
                  fontSize: `${layer.fontSize * 0.9}px`,
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

            {edits.overlayLayers.map((layer) => (
              <div
                key={layer.id}
                className="absolute pointer-events-none select-none text-xl"
                style={{
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  transform: `translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale * 0.9})`,
                  opacity: layer.opacity / 100
                }}
              >
                {layer.type === 'emoji' && <span>{layer.value}</span>}
                {layer.type === 'sticker' && <span className="filter drop-shadow-[0_0_6px_rgba(108,99,255,0.5)]">{layer.value}</span>}
                {layer.type === 'shape' && (
                  <div className="w-12 h-12 bg-[#6C63FF]/20 border border-[#6C63FF]/30 backdrop-blur-sm rounded flex items-center justify-center text-[8px] font-mono uppercase tracking-wider text-slate-300">
                    {layer.value}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Preview selector carousel */}
          {selectedMedia.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
              {selectedMedia.map((m, idx) => (
                <div
                  key={m.id}
                  onClick={() => setPreviewIdx(idx)}
                  className={clsx(
                    'w-12 h-12 rounded-xl overflow-hidden border cursor-pointer flex-shrink-0 transition-all relative',
                    idx === previewIdx ? 'border-[#6C63FF] scale-105 shadow-glow-primary' : 'border-white/10 opacity-50'
                  )}
                >
                  <img src={m.type === 'video' ? m.url : m.url} className="w-full h-full object-cover" alt="Carousel preview thumbnail" />
                  {m.type === 'video' && <Play size={8} fill="white" className="absolute top-1 right-1 text-white" />}
                </div>
              ))}
            </div>
          )}

          {/* Soundtrack overlay details card */}
          <div className="p-4 rounded-xl border border-white/[0.04] bg-[#0c0c10]/60 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Soundtrack Theme</span>
              <button 
                onClick={onBack}
                className="text-[9px] font-bold text-[#6C63FF] uppercase tracking-wider hover:underline"
              >
                Adjust settings
              </button>
            </div>

            {selectedSpotifyTrack || selectedTrackId ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedSpotifyTrack?.albumArtUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={selectedSpotifyTrack.albumArtUrl} 
                      alt="Album art" 
                      className="w-10 h-10 rounded-lg object-cover border border-white/5" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <Volume2 size={16} />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-200 truncate max-w-[180px]">
                      {selectedSpotifyTrack ? selectedSpotifyTrack.name : (selectedTrackId ? 'Custom Loop' : 'No track selected')}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate -mt-0.5 max-w-[180px]">
                      {selectedSpotifyTrack ? selectedSpotifyTrack.artist : 'Custom Artist'}
                    </p>
                    <span className="text-[9px] font-mono text-slate-500 block">
                      Trim: {musicTrimStart}s - {musicTrimEnd}s | Vol: {musicVolume}%
                    </span>
                  </div>
                </div>
                <span className="text-[8px] font-mono uppercase bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full font-bold border border-cyan-500/20">
                  Spotify Loop
                </span>
              </div>
            ) : (
              <p className="text-[10px] text-slate-600 font-mono italic">No theme music selected. Post will play original asset audio.</p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Settings / Dispatch details */}
        <div className="w-full lg:flex-1 bg-[#0D0D11] border-l border-white/[0.05] flex flex-col relative">
          
          <div className="flex-1 lg:overflow-y-auto lg:page-scroll p-6 pb-28 space-y-6">
            
            {/* 1. CAPTION INPUT */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-500 font-bold uppercase tracking-wider">// CAPTION WRITER</span>
                <span className="text-slate-500">{caption.length} / 2200</span>
              </div>
              <textarea
                placeholder="Write a futuristic description, attach tags, and hashtags..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={2200}
                className="w-full h-24 bg-white/[0.02] border border-white/[0.08] focus:border-[#6C63FF]/50 rounded-lg p-4 text-xs text-white placeholder-slate-600 outline-none resize-none transition-all focus:shadow-[0_0_20px_rgba(108,99,255,0.08)]"
              />
              <div className="flex gap-2">
                {['#futuristic', '#cyberpunk', '#verlyn', '#grid'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setCaption(prev => prev + (prev.endsWith(' ') || !prev ? '' : ' ') + tag + ' ')}
                    className="px-2.5 py-1 rounded bg-white/5 hover:bg-[#6C63FF]/10 hover:text-white transition-all border border-white/[0.04] text-[9px] font-mono text-slate-400"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. TAG PEOPLE & LOCATION CONTAINER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Tag People */}
              <div className="space-y-2 relative">
                <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">Tag People</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search or type name & press Enter..."
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value);
                      if (tagSearchTimeout.current) clearTimeout(tagSearchTimeout.current);
                      if (e.target.value.trim().length > 0) {
                        tagSearchTimeout.current = setTimeout(() => searchUsers(e.target.value), 300);
                      } else {
                        setUserSuggestions([]);
                        setTagDropdownOpen(false);
                      }
                    }}
                    onFocus={() => tagInput.length > 0 && userSuggestions.length > 0 && setTagDropdownOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tagInput.trim()) {
                        e.preventDefault();
                        const tag = tagInput.trim().startsWith('@') ? tagInput.trim() : `@${tagInput.trim()}`;
                        if (!taggedUsers.includes(tag)) {
                          setTaggedUsers(prev => [...prev, tag]);
                        }
                        setTagInput('');
                        setTagDropdownOpen(false);
                        setUserSuggestions([]);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setTagDropdownOpen(false);
                      }, 200);
                    }}
                    className="w-full bg-white/[0.03] border border-white/10 focus:border-[#6C63FF]/50 rounded-xl pl-8 pr-4 py-2 text-xs text-white placeholder-slate-600 outline-none transition-all focus:shadow-[0_0_15px_rgba(108,99,255,0.08)]"
                  />
                  <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  {tagSearchLoading && <Loader2 size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 animate-spin" />}
                </div>

                {/* Real user search dropdown */}
                <AnimatePresence>
                  {tagDropdownOpen && userSuggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-48 overflow-y-auto page-scroll bg-[#0e0e12] border border-white/[0.08] rounded-xl shadow-2xl p-1"
                    >
                      {userSuggestions
                        .filter(u => !taggedUsers.includes(`@${u.username}`))
                        .map(u => (
                          <button
                            key={u.username}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              const tag = `@${u.username}`;
                              if (!taggedUsers.includes(tag)) setTaggedUsers(prev => [...prev, tag]);
                              setTagInput('');
                              setTagDropdownOpen(false);
                              setUserSuggestions([]);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#6C63FF]/10 hover:text-white transition-all text-slate-300"
                          >
                            <img
                              src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.username}`}
                              alt={u.display_name || u.username}
                              className="w-6 h-6 rounded-full object-cover bg-neutral-800 flex-shrink-0"
                            />
                            <div className="text-left min-w-0">
                              <div className="text-xs font-semibold truncate">{u.display_name || u.username}</div>
                              <div className="text-[10px] text-slate-500 font-mono">@{u.username}</div>
                            </div>
                          </button>
                        ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tag list */}
                {taggedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {taggedUsers.map(u => (
                      <div key={u} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#6C63FF]/10 border border-[#6C63FF]/20 text-[10px] font-mono text-white animate-fade-in">
                        <span>{u}</span>
                        <button
                          onClick={() => setTaggedUsers(prev => prev.filter(x => x !== u))}
                          className="hover:text-red-400 text-slate-500 font-bold ml-1.5"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Location Selector */}
              <div className="space-y-2 relative">
                <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">Add Location</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search or type location & press Enter..."
                    value={locationInput}
                    onChange={(e) => {
                      setLocationInput(e.target.value);
                      if (locSearchTimeout.current) clearTimeout(locSearchTimeout.current);
                      if (e.target.value.trim().length >= 2) {
                        locSearchTimeout.current = setTimeout(() => searchLocations(e.target.value), 400);
                      } else {
                        setLocationSuggestions([]);
                        setLocDropdownOpen(false);
                      }
                    }}
                    onFocus={() => locationInput.length >= 2 && locationSuggestions.length > 0 && setLocDropdownOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && locationInput.trim()) {
                        e.preventDefault();
                        setSelectedLocation(locationInput.trim());
                        setLocationInput('');
                        setLocDropdownOpen(false);
                        setLocationSuggestions([]);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setLocDropdownOpen(false);
                      }, 200);
                    }}
                    className="w-full bg-white/[0.03] border border-white/10 focus:border-[#6C63FF]/50 rounded-xl pl-8 pr-4 py-2 text-xs text-white placeholder-slate-600 outline-none transition-all focus:shadow-[0_0_15px_rgba(108,99,255,0.08)]"
                  />
                  <MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  {locSearchLoading && <Loader2 size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 animate-spin" />}
                </div>

                {/* Real location search dropdown via OpenStreetMap Nominatim */}
                <AnimatePresence>
                  {locDropdownOpen && locationSuggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-52 overflow-y-auto page-scroll bg-[#0e0e12] border border-white/[0.08] rounded-xl shadow-2xl p-1"
                    >
                      {locationSuggestions.map((loc, i) => {
                        // Format: take first 2 parts of display_name (city, country)
                        const parts = loc.display_name.split(', ');
                        const primary = parts[0];
                        const secondary = parts.slice(1, 3).join(', ');
                        return (
                          <button
                            key={`${loc.lat}-${loc.lon}-${i}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSelectedLocation(primary + (secondary ? `, ${secondary}` : ''));
                              setLocationInput('');
                              setLocDropdownOpen(false);
                              setLocationSuggestions([]);
                            }}
                            className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-[#6C63FF]/10 hover:text-white transition-all text-left"
                          >
                            <MapPin size={12} className="text-cyan-500/60 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-slate-200 truncate">{primary}</div>
                              {secondary && <div className="text-[10px] text-slate-500 truncate mt-0.5">{secondary}</div>}
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Selected Location Card */}
                {selectedLocation && (
                  <div className="flex items-center justify-between px-3 py-1.5 mt-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono text-cyan-400 animate-fade-in">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={10} />
                      <span>{selectedLocation}</span>
                    </div>
                    <button
                      onClick={() => setSelectedLocation(null)}
                      className="hover:text-red-400 text-slate-500 font-bold ml-1.5"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 3. EXTERNAL LINKS */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">Attach External Link</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="url"
                    placeholder="https://example.com/project"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (linkInput && !attachedLinks.includes(linkInput)) {
                          setAttachedLinks(prev => [...prev, linkInput]);
                          setLinkInput('');
                        }
                      }
                    }}
                    className="w-full bg-white/[0.03] border border-white/10 focus:border-[#6C63FF]/50 rounded-xl pl-8 pr-4 py-2 text-xs text-white placeholder-slate-600 outline-none transition-all focus:shadow-[0_0_15px_rgba(108,99,255,0.08)]"
                  />
                  <Link size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                </div>
                <button
                  onClick={() => {
                    if (linkInput && !attachedLinks.includes(linkInput)) {
                      setAttachedLinks(prev => [...prev, linkInput]);
                      setLinkInput('');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/[0.04] text-xs font-bold text-slate-300 transition-all"
                >
                  Attach
                </button>
              </div>

              {/* Link Previews list */}
              {attachedLinks.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1.5 animate-fade-in">
                  {attachedLinks.map(lnk => (
                    <div key={lnk} className="p-3 rounded-xl border border-white/[0.04] bg-[#0c0c10]/60 flex flex-col gap-1 relative group">
                      <button
                        onClick={() => setAttachedLinks(prev => prev.filter(x => x !== lnk))}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/60 hover:bg-red-500 text-slate-400 hover:text-white flex items-center justify-center text-[10px] transition-colors border border-white/5"
                      >
                        ✕
                      </button>
                      <span className="text-[8px] font-mono text-[#6C63FF] uppercase tracking-wider font-bold">Linked URL</span>
                      <p className="text-xs font-black text-slate-200 truncate pr-6">{lnk.replace('https://', '')}</p>
                      <span className="text-[8px] text-slate-500 font-mono mt-0.5">External secure path</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. AUDIENCE SELECTOR */}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">// DISPATCH AUDIENCE</label>
                <span className="text-[8px] text-slate-600">Control which sectors can decrypt your dispatch.</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'everyone', label: 'Everyone', desc: 'Global grid public', icon: Globe },
                  { id: 'followers', label: 'Followers', desc: 'Direct subscribers', icon: Users },
                  { id: 'friends', label: 'Friends', desc: 'Mutual connections', icon: Heart },
                  { id: 'close_friends', label: 'Close Friends', desc: 'Secure encryption key', icon: Star },
                  { id: 'private', label: 'Private', desc: 'Internal vault only', icon: Lock },
                  { id: 'custom', label: 'Custom', desc: 'Targeted sector keys', icon: Settings }
                ].map(aud => {
                  const Icon = aud.icon;
                  const isSel = audience === aud.id;
                  return (
                    <button
                      key={aud.id}
                      onClick={() => setAudience(aud.id as any)}
                      className={clsx(
                        "p-3.5 rounded-xl border text-left flex flex-col gap-2 transition-all relative select-none",
                        isSel 
                          ? "border-[#6C63FF] bg-[#6C63FF]/5 text-white shadow-[0_0_15px_rgba(108,99,255,0.15)]" 
                          : "border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] text-slate-400 hover:text-slate-300"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Icon size={14} className={isSel ? "text-[#6C63FF]" : "text-slate-500"} />
                        {isSel && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#6C63FF] shadow-[0_0_6px_#6C63FF]" />
                        )}
                      </div>
                      <div>
                        <span className="text-[11px] font-bold block leading-none">{aud.label}</span>
                        <span className="text-[8px] font-mono text-slate-500 block mt-1 leading-none truncate">{aud.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. MORE OPTIONS ACCORDION */}
            <div className="border border-white/[0.04] bg-white/[0.01] rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setMoreOptionsOpen(!moreOptionsOpen)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/[0.01] transition-all outline-none"
              >
                <div className="flex items-center gap-2.5">
                  <Settings size={14} className="text-[#6C63FF]" />
                  <span className="text-xs font-bold text-slate-300">More Advanced Options</span>
                </div>
                {moreOptionsOpen ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
              </button>

              <AnimatePresence>
                {moreOptionsOpen && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 border-t border-white/[0.04] space-y-4 bg-black/10 text-xs font-mono">
                      
                      {/* Reminder Toggle */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar size={12} className="text-slate-500" />
                            <div>
                              <p className="font-bold text-slate-300 leading-none">Add Reminder</p>
                              <span className="text-[8px] text-slate-500">Notify users before event launches</span>
                            </div>
                          </div>
                          <ToggleSwitch
                            checked={hasReminder}
                            onChange={(val) => setHasReminder(val)}
                          />
                        </div>
                        {hasReminder && (
                          <input
                            type="datetime-local"
                            value={reminderDate}
                            onChange={(e) => setReminderDate(e.target.value)}
                            className="w-full bg-[#0A0A0E] border border-white/[0.08] focus:border-[#6C63FF]/50 rounded-xl px-4 py-2 text-xs text-white outline-none"
                          />
                        )}
                      </div>

                      {/* Schedule Post Toggle */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock size={12} className="text-slate-500" />
                            <div>
                              <p className="font-bold text-slate-300 leading-none">Schedule Post</p>
                              <span className="text-[8px] text-slate-500">Queue delivery to grid at specific epoch</span>
                            </div>
                          </div>
                          <ToggleSwitch
                            checked={isScheduled}
                            onChange={(val) => setIsScheduled(val)}
                          />
                        </div>
                        {isScheduled && (
                          <input
                            type="datetime-local"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            className="w-full bg-[#0A0A0E] border border-white/[0.08] focus:border-[#6C63FF]/50 rounded-xl px-4 py-2 text-xs text-white outline-none"
                          />
                        )}
                      </div>

                      {/* Comments control */}
                      <div className="flex items-center justify-between border-t border-white/[0.03] pt-3">
                        <div className="flex items-center gap-2">
                          <MessageSquare size={12} className="text-slate-500" />
                          <div>
                            <p className="font-bold text-slate-300 leading-none">Turn Off Comments</p>
                            <span className="text-[8px] text-slate-500">Disable comments block for this post</span>
                          </div>
                        </div>
                        <ToggleSwitch
                          checked={commentsOff}
                          onChange={(val) => setCommentsOff(val)}
                        />
                      </div>

                      {/* Likes count control */}
                      <div className="flex items-center justify-between border-t border-white/[0.03] pt-3">
                        <div className="flex items-center gap-2">
                          <EyeOff size={12} className="text-slate-500" />
                          <div>
                            <p className="font-bold text-slate-300 leading-none">Hide Like Count</p>
                            <span className="text-[8px] text-slate-500">Only you will see total likes</span>
                          </div>
                        </div>
                        <ToggleSwitch
                          checked={hideLikes}
                          onChange={(val) => setHideLikes(val)}
                        />
                      </div>

                      {/* Share count control */}
                      <div className="flex items-center justify-between border-t border-white/[0.03] pt-3">
                        <div className="flex items-center gap-2">
                          <Share2 size={12} className="text-slate-500" />
                          <div>
                            <p className="font-bold text-slate-300 leading-none">Hide Share Count</p>
                            <span className="text-[8px] text-slate-500">Prevent public share metrics display</span>
                          </div>
                        </div>
                        <ToggleSwitch
                          checked={hideShares}
                          onChange={(val) => setHideShares(val)}
                        />
                      </div>

                      {/* Remix Control */}
                      <div className="flex items-center justify-between border-t border-white/[0.03] pt-3">
                        <div className="flex items-center gap-2">
                          <Sparkles size={12} className="text-slate-500" />
                          <div>
                            <p className="font-bold text-slate-300 leading-none">Allow Remixing</p>
                            <span className="text-[8px] text-slate-500">Let others combine assets into stories</span>
                          </div>
                        </div>
                        <ToggleSwitch
                          checked={allowRemix}
                          onChange={(val) => setAllowRemix(val)}
                        />
                      </div>

                      {/* Download control */}
                      <div className="flex items-center justify-between border-t border-white/[0.03] pt-3">
                        <div className="flex items-center gap-2">
                          <Download size={12} className="text-slate-500" />
                          <div>
                            <p className="font-bold text-slate-300 leading-none">Allow Downloads</p>
                            <span className="text-[8px] text-slate-500">Let viewers save original media</span>
                          </div>
                        </div>
                        <ToggleSwitch
                          checked={allowDownloads}
                          onChange={(val) => setAllowDownloads(val)}
                        />
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

          {/* FOOTER: Large Share Button */}
          <div className="absolute bottom-0 left-0 right-0 h-24 border-t border-white/[0.05] bg-[#0D0D11]/90 backdrop-blur-md px-8 flex items-center justify-between z-40">
            <button
              onClick={onBack}
              className="px-5 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] text-xs font-medium text-slate-300 transition-all active:scale-[0.98]"
            >
              Back to Edits
            </button>
            <button
              onClick={handleSharePost}
              className="group flex items-center gap-3 px-8 py-2.5 rounded-lg bg-[#6C63FF] hover:bg-[#5b52f5] active:scale-[0.98] transition-all text-xs font-semibold tracking-wide text-white shadow-[0_0_20px_rgba(108,99,255,0.2)] border border-[#6C63FF]/30 select-none"
            >
              <span>Share Dispatch</span>
              <Share2 size={14} className="group-hover:rotate-12 transition-transform" />
            </button>
          </div>

        </div>
      </div>

    </motion.div>
  );
}
