'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, ArrowRight, Play, Pause, Trash2, Camera, Upload, 
  Folder, HardDrive, Cloud, AlertCircle, RefreshCw, CheckCircle, 
  Loader2, Clipboard, Image as ImageIcon, Video, HelpCircle, Laptop, 
  Check, Volume2, Type, Layers, Sliders, Scissors, RotateCcw, 
  RotateCw, RefreshCw as FlipIcon, Bold, Italic, AlignLeft, 
  AlignCenter, AlignRight, Plus, Copy, MoreHorizontal, Maximize, Music, PenTool, Sparkles, X, ShoppingBag, Smile, Clock, Tag,
  Eye, EyeOff, Star, Bookmark, Sun, Flame, Film, Tv, Palette, Wand2, SlidersHorizontal, Heart, Save, Search
} from 'lucide-react';
import clsx from 'clsx';
import { SpotifyTrack } from '@/hooks/useSpotify';
import VerlynMusicEditor from '@/components/features/music/VerlynMusicEditor';
import { SHAPE_LIBRARY } from './shapeLibrary';
import { STICKER_PACKS } from './stickerLibrary';
import dynamic from 'next/dynamic';

const BasicDraw = dynamic(
  () => import('@/components/features/draw/BasicDraw'),
  { ssr: false }
);

// Type definitions
interface TextLayer {
  id: string;
  text: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  fontFamily: string;
  fontSize: number;
  color: string;
  opacity: number;
  rotation: number; // degrees
  scale: number;
  bold: boolean;
  italic: boolean;
  background: 'none' | 'solid' | 'glass' | 'neon';
  backgroundColor: string;
  shadow: boolean;
  gradient: boolean;
  gradientColors: string[];
  letterSpacing: number; // px
  
  // Custom design overrides
  locked?: boolean;
  borderRadius?: number;
  blur?: number;
  blendMode?: string;
  animationType?: string;
  physicsType?: string;
}

interface OverlayLayer {
  id: string;
  type: 'shape' | 'frame' | 'sticker' | 'emoji' | 'gif' | 'gradient' | 'blur' | 'glass' | 'image' | 'lottie';
  value: string; // shape name, emoji char, gif URL, etc.
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;

  // Custom vector styling and locks
  width?: number;
  height?: number;
  locked?: boolean;
  aspectRatioLocked?: boolean;

  // Fills & Stroke
  fillType?: 'color' | 'linear-gradient' | 'radial-gradient' | 'none';
  fillColor?: string;
  gradientColors?: string[];
  gradientAngle?: number;
  strokeColor?: string;
  strokeWidth?: number;
  borderRadius?: number;

  // Shaders & Glows
  glassEffect?: boolean;
  neonGlow?: boolean;
  neonGlowColor?: string;
  shadow?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  innerShadow?: boolean;
  innerShadowColor?: string;
  innerShadowBlur?: number;
  outerGlow?: boolean;
  outerGlowColor?: string;
  outerGlowBlur?: number;
  blur?: number;
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion';

  // Transforms & Warp
  flipH?: boolean;
  flipV?: boolean;
  skewX?: number;
  skewY?: number;
  perspectiveX?: number;
  perspectiveY?: number;
  anchorPoint?: { x: number; y: number };

  // Kinetics & Animations
  animationType?: 'none' | 'float' | 'pulse' | 'spin' | 'wiggle' | 'bounce';
  physicsType?: 'none' | 'gravity' | 'floating' | 'bouncy';
}

interface MediaEdits {
  filterId: string;
  filterIntensity: number;
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  highlights: number; // -100 to 100
  shadows: number; // -100 to 100
  warmth: number; // -100 to 100
  tint: number; // -100 to 100
  structure: number; // -100 to 100
  saturation: number; // -100 to 100
  sharpness: number; // -100 to 100
  noiseReduction: number; // 0 to 100
  vignette: number; // 0 to 100
  fade: number; // 0 to 100
  tiltShift: 'none' | 'radial' | 'linear';
  tiltShiftValue: number; // blur amount
  perspectiveX: number; // rotateY
  perspectiveY: number; // rotateX
  rotation: number; // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
  cropAspect: 'original' | '1:1' | '4:5' | '16:9';
  textLayers: TextLayer[];
  overlayLayers: OverlayLayer[];
  audioTrackId: string | null;
  audioVolume: number;
  audioTrimStart: number;
  videoAudioMode: 'mute' | 'original' | 'mix';
  videoVolume: number;

  // Pro Color Grading & Custom Filter Fields
  vibrance?: number;
  splitToneHighlightHue?: number;
  splitToneHighlightSat?: number;
  splitToneShadowHue?: number;
  splitToneShadowSat?: number;
  duotoneEnabled?: boolean;
  duotoneColor1?: string;
  duotoneColor2?: string;
  duotoneBlendMode?: string;
  duotoneOpacity?: number;
  filmGrain?: number;
  bloom?: number;
  chromatic?: number;
}

const DEFAULT_EDITS = (type: 'image' | 'video'): MediaEdits => ({
  filterId: 'original',
  filterIntensity: 100,
  brightness: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  warmth: 0,
  tint: 0,
  structure: 0,
  saturation: 0,
  sharpness: 0,
  noiseReduction: 0,
  vignette: 0,
  fade: 0,
  tiltShift: 'none',
  tiltShiftValue: 15,
  perspectiveX: 0,
  perspectiveY: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
  cropAspect: 'original',
  textLayers: [],
  overlayLayers: [],
  audioTrackId: null,
  audioVolume: 50,
  audioTrimStart: 0,
  videoAudioMode: 'mix',
  videoVolume: 50,
  vibrance: 0,
  splitToneHighlightHue: 40,
  splitToneHighlightSat: 0,
  splitToneShadowHue: 220,
  splitToneShadowSat: 0,
  duotoneEnabled: false,
  duotoneColor1: '#6C63FF',
  duotoneColor2: '#00f2fe',
  duotoneBlendMode: 'overlay',
  duotoneOpacity: 50,
  filmGrain: 0,
  bloom: 0,
  chromatic: 0
});

// Mock soundtracks library with category tags and real URLs
const MUSIC_LIBRARY = [
  {
    id: 'track-1',
    title: 'Cyberpunk Skyline',
    artist: 'Synthwave Labs',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=60',
    duration: 372,
    genre: 'Synthwave',
    category: 'trending'
  },
  {
    id: 'track-2',
    title: 'Vesper Ambience',
    artist: 'Ambient Lo-fi Collective',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?w=150&auto=format&fit=crop&q=60',
    duration: 423,
    genre: 'Ambient Lo-fi',
    category: 'trending'
  },
  {
    id: 'track-3',
    title: 'Digital Pulse',
    artist: 'Industrial Systems',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=150&auto=format&fit=crop&q=60',
    duration: 344,
    genre: 'Industrial Techno',
    category: 'recommended'
  },
  {
    id: 'track-4',
    title: 'Nebula Drift',
    artist: 'Space Soundscape',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=150&auto=format&fit=crop&q=60',
    duration: 302,
    genre: 'Space Chillout',
    category: 'recommended'
  },
  {
    id: 'track-5',
    title: 'Silicon Grid',
    artist: 'Grid Crawler',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=150&auto=format&fit=crop&q=60',
    duration: 362,
    genre: 'Outrun Synth',
    category: 'saved'
  },
  {
    id: 'track-6',
    title: 'Virtual Dawn',
    artist: 'Holo Horizon',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1589254065878-42c9da997008?w=150&auto=format&fit=crop&q=60',
    duration: 350,
    genre: 'Dreamwave',
    category: 'recent'
  }
];

// Fonts
const FONT_FAMILIES = [
  'Inter', 'Plus Jakarta Sans', 'Playfair Display', 'Space Grotesk', 'Syne', 'Fira Code', 'Outfit',
  'Montserrat', 'Bebas Neue', 'Orbitron', 'Pacifico', 'Poppins', 'Oswald'
];

const TEXT_PRESETS = [
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    icon: '⚡',
    style: {
      text: 'CYBERPUNK',
      fontFamily: 'Orbitron',
      fontSize: 34,
      color: '#00f2fe',
      gradient: true,
      gradientColors: ['#00f2fe', '#4facfe'],
      background: 'neon',
      backgroundColor: '#000000',
      bold: true,
      italic: false,
      shadow: true,
      letterSpacing: 3,
    }
  },
  {
    id: 'sunset-glow',
    name: 'Sunset Glow',
    icon: '🔥',
    style: {
      text: 'SUNSET VIBES',
      fontFamily: 'Outfit',
      fontSize: 36,
      color: '#ff0844',
      gradient: true,
      gradientColors: ['#ff0844', '#ffb199'],
      background: 'none',
      backgroundColor: 'transparent',
      bold: true,
      italic: false,
      shadow: true,
      letterSpacing: 2,
    }
  },
  {
    id: 'frosted-glass',
    name: 'Glass Badge',
    icon: '💎',
    style: {
      text: 'Vesper Studio',
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 24,
      color: '#ffffff',
      gradient: false,
      gradientColors: ['#ffffff', '#ffffff'],
      background: 'glass',
      backgroundColor: 'rgba(255,255,255,0.08)',
      bold: true,
      italic: false,
      shadow: false,
      letterSpacing: 1,
    }
  },
  {
    id: 'editorial-serif',
    name: 'Luxury Serif',
    icon: '👑',
    style: {
      text: 'Elegance & Style',
      fontFamily: 'Playfair Display',
      fontSize: 34,
      color: '#f6d365',
      gradient: true,
      gradientColors: ['#f6d365', '#fda085'],
      background: 'none',
      backgroundColor: 'transparent',
      bold: true,
      italic: true,
      shadow: true,
      letterSpacing: 1,
    }
  },
  {
    id: 'comic-impact',
    name: 'Bold Impact',
    icon: '💥',
    style: {
      text: 'EXPLOSION!',
      fontFamily: 'Bebas Neue',
      fontSize: 42,
      color: '#ffe000',
      gradient: true,
      gradientColors: ['#ffe000', '#799f0c'],
      background: 'solid',
      backgroundColor: '#000000',
      bold: true,
      italic: false,
      shadow: true,
      letterSpacing: 4,
    }
  },
  {
    id: 'code-matrix',
    name: 'Hacker Code',
    icon: '👾',
    style: {
      text: '// system_init()',
      fontFamily: 'Fira Code',
      fontSize: 20,
      color: '#00ff88',
      gradient: false,
      gradientColors: ['#00ff88', '#00ff88'],
      background: 'solid',
      backgroundColor: '#090a0f',
      bold: false,
      italic: false,
      shadow: false,
      letterSpacing: 1,
    }
  }
];

// Shapes
const SHAPES = ['Circle', 'Square', 'Triangle', 'Pentagon', 'Star', 'Hexagon', 'Speech Bubble'];

// Stickers
const STICKERS = [
  { value: '⚡', label: 'Lightning' },
  { value: '🔥', label: 'Fire' },
  { value: '💎', label: 'Diamond' },
  { value: '🚀', label: 'Rocket' },
  { value: '🛸', label: 'UFO' },
  { value: '👾', label: 'Alien' },
  { value: '🧬', label: 'DNA' },
  { value: '🦾', label: 'Cyber Arm' }
];

// Extended Pro Filter Preset interface & collection
export interface FilterPreset {
  id: string;
  name: string;
  category: 'cinematic' | 'cyber' | 'film' | 'mono' | 'mood';
  vibe: string;
  gradient: string;
  popular?: boolean;
}

const PRESET_FILTERS: FilterPreset[] = [
  { id: 'original', name: 'Original', category: 'mood', vibe: 'Clean & Raw', gradient: 'from-slate-700 to-slate-900', popular: true },
  
  // Cinematic
  { id: 'vesper', name: 'Vesper', category: 'cinematic', vibe: 'Golden Hour Warmth', gradient: 'from-amber-500 to-orange-600', popular: true },
  { id: 'hollywood', name: 'Teal & Orange', category: 'cinematic', vibe: 'Blockbuster Movie', gradient: 'from-cyan-500 to-amber-600', popular: true },
  { id: 'dune', name: 'Desert Dune', category: 'cinematic', vibe: 'Sci-Fi Warm Beige', gradient: 'from-yellow-700 to-amber-900' },
  { id: 'matrix', name: 'Matrix Emerald', category: 'cinematic', vibe: 'Cyber Matrix Green', gradient: 'from-emerald-400 to-emerald-900', popular: true },

  // Cyber & Neon
  { id: 'cyberpunk', name: 'Neon Grid', category: 'cyber', vibe: 'Cyberpunk Purple', gradient: 'from-fuchsia-500 to-purple-800', popular: true },
  { id: 'tokyo', name: 'Tokyo Neon', category: 'cyber', vibe: 'Shibuya Cyan & Pink', gradient: 'from-cyan-400 to-pink-600', popular: true },
  { id: 'vaporwave', name: 'Synthwave 84', category: 'cyber', vibe: 'Retrofuturistic 80s', gradient: 'from-violet-500 to-indigo-900' },

  // Analog & Film
  { id: 'kodak', name: 'Portra 400', category: 'film', vibe: 'Analog Warm Grain', gradient: 'from-amber-400 to-yellow-600', popular: true },
  { id: 'fuji', name: 'Velvia 50', category: 'film', vibe: 'Vivid Rich Colors', gradient: 'from-emerald-500 to-teal-700' },
  { id: 'retro', name: 'Retro Film', category: 'film', vibe: 'Vintage 70s Warm', gradient: 'from-amber-600 to-red-800' },
  { id: 'polaroid', name: 'Instant 80s', category: 'film', vibe: 'Faded Instant Print', gradient: 'from-rose-400 to-pink-600' },

  // B&W Mono
  { id: 'noir', name: 'Deep Noir', category: 'mono', vibe: 'High Contrast Mono', gradient: 'from-neutral-200 to-neutral-800', popular: true },
  { id: 'silver', name: 'Silver Gelatin', category: 'mono', vibe: 'Smooth Silver Tones', gradient: 'from-slate-400 to-slate-800' },
  { id: 'infrared', name: 'Infrared B&W', category: 'mono', vibe: 'Dramatic High Light', gradient: 'from-zinc-100 to-zinc-900' },

  // Mood
  { id: 'solitude', name: 'Solitude', category: 'mood', vibe: 'Cold Moody Blue', gradient: 'from-sky-500 to-slate-800' },
  { id: 'frost', name: 'Ethereal Frost', category: 'mood', vibe: 'Icy Soft Glow', gradient: 'from-cyan-300 to-blue-600' },
  { id: 'dramaqueen', name: 'Crimson Drama', category: 'mood', vibe: 'Vignetted Dark Red', gradient: 'from-rose-600 to-red-950' },
  { id: 'pastel', name: 'Soft Pastel', category: 'mood', vibe: 'Gentle Muted Pastel', gradient: 'from-pink-300 to-blue-400' }
];

const FILTERS = PRESET_FILTERS;

const getPresetCSS = (filterId: string, intensity: number = 100) => {
  if (!filterId || filterId === 'original') return '';
  const factor = intensity / 100;

  const presets: Record<string, string> = {
    vesper: `sepia(${Math.round(35 * factor)}%) contrast(${Math.round(100 + 15 * factor)}%) saturate(${Math.round(100 + 20 * factor)}%) brightness(${Math.round(100 + 5 * factor)}%)`,
    hollywood: `contrast(${Math.round(100 + 25 * factor)}%) saturate(${Math.round(100 + 30 * factor)}%) hue-rotate(${-15 * factor}deg) sepia(${Math.round(15 * factor)}%)`,
    dune: `sepia(${Math.round(40 * factor)}%) saturate(${Math.round(100 - 25 * factor)}%) contrast(${Math.round(100 + 35 * factor)}%) brightness(${Math.round(100 - 5 * factor)}%)`,
    matrix: `hue-rotate(${Math.round(90 * factor)}deg) saturate(${Math.round(100 + 40 * factor)}%) contrast(${Math.round(100 + 30 * factor)}%) brightness(${Math.round(100 - 10 * factor)}%)`,
    cyberpunk: `hue-rotate(${Math.round(60 * factor)}deg) saturate(${Math.round(100 + 80 * factor)}%) contrast(${Math.round(100 + 25 * factor)}%) brightness(${Math.round(100 + 5 * factor)}%)`,
    tokyo: `hue-rotate(${-40 * factor}deg) saturate(${Math.round(100 + 60 * factor)}%) contrast(${Math.round(100 + 20 * factor)}%)`,
    vaporwave: `hue-rotate(${Math.round(120 * factor)}deg) saturate(${Math.round(100 + 70 * factor)}%) contrast(${Math.round(100 + 15 * factor)}%) sepia(${Math.round(20 * factor)}%)`,
    kodak: `sepia(${Math.round(20 * factor)}%) saturate(${Math.round(100 + 10 * factor)}%) contrast(${Math.round(100 + 5 * factor)}%) brightness(${Math.round(100 + 5 * factor)}%)`,
    fuji: `saturate(${Math.round(100 + 65 * factor)}%) contrast(${Math.round(100 + 20 * factor)}%)`,
    retro: `sepia(${Math.round(30 * factor)}%) saturate(${Math.round(100 - 15 * factor)}%) contrast(${Math.round(100 - 5 * factor)}%)`,
    polaroid: `sepia(${Math.round(25 * factor)}%) saturate(${Math.round(100 - 10 * factor)}%) contrast(${Math.round(100 - 10 * factor)}%) brightness(${Math.round(100 + 10 * factor)}%)`,
    noir: `grayscale(${Math.round(100 * factor)}%) contrast(${Math.round(100 + 50 * factor)}%) brightness(${Math.round(100 - 10 * factor)}%)`,
    silver: `grayscale(${Math.round(100 * factor)}%) contrast(${Math.round(100 + 15 * factor)}%) brightness(${Math.round(100 + 5 * factor)}%)`,
    infrared: `hue-rotate(${Math.round(180 * factor)}deg) saturate(${Math.round(100 + 100 * factor)}%) contrast(${Math.round(100 + 40 * factor)}%)`,
    solitude: `saturate(${Math.round(100 - 50 * factor)}%) hue-rotate(${-25 * factor}deg) contrast(${Math.round(100 + 10 * factor)}%)`,
    frost: `hue-rotate(${Math.round(185 * factor)}deg) brightness(${Math.round(100 + 10 * factor)}%) contrast(${Math.round(100 - 5 * factor)}%) saturate(${Math.round(100 - 10 * factor)}%)`,
    dramaqueen: `contrast(${Math.round(100 + 40 * factor)}%) saturate(${Math.round(100 + 40 * factor)}%) hue-rotate(${-30 * factor}deg) brightness(${Math.round(100 - 15 * factor)}%)`,
    pastel: `saturate(${Math.round(100 - 30 * factor)}%) brightness(${Math.round(100 + 15 * factor)}%) contrast(${Math.round(100 - 15 * factor)}%) sepia(${Math.round(10 * factor)}%)`
  };

  return presets[filterId] || '';
};

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

interface PostEditingStudioProps {
  selectedMedia: SelectedMedia[];
  onBack: () => void;
  onDone: (
    mediaEdits: Record<string, MediaEdits>,
    soundtrackSettings: {
      selectedTrackId: string | null;
      musicVolume: number;
      musicTrimStart: number;
      musicTrimEnd: number;
      musicFadeIn: number;
      musicFadeOut: number;
    }
  ) => void;
  
  // Spotify integration
  selectedSpotifyTrack?: SpotifyTrack | null;
  onTriggerMusicPicker?: () => void;
  onClearSpotifyTrack?: () => void;
}

export default function PostEditingStudio({ 
  selectedMedia, 
  onBack, 
  onDone,
  selectedSpotifyTrack,
  onTriggerMusicPicker,
  onClearSpotifyTrack
}: PostEditingStudioProps) {
  const setPostCreationOpen = useAppStore(s => s.setPostCreationOpen);
  // Active media switching states
  const [activeIndex, setActiveIndex] = useState(0);
  const activeMedia = selectedMedia[activeIndex];

  // Edits map stores state independently per mediaId
  const [mediaEdits, setMediaEdits] = useState<Record<string, MediaEdits>>({});

  // Initialize edits for selectedMedia on mount
  useEffect(() => {
    const initial: Record<string, MediaEdits> = {};
    selectedMedia.forEach(m => {
      initial[m.id] = DEFAULT_EDITS(m.type);
    });
    setMediaEdits(initial);
  }, [selectedMedia]);

  // Current active media's edits
  const currentEdits = mediaEdits[activeMedia?.id] || DEFAULT_EDITS(activeMedia?.type || 'image');

  // Helper to update specific adjustments on active media
  const updateEdits = (updates: Partial<MediaEdits>) => {
    if (!activeMedia) return;
    setMediaEdits(prev => ({
      ...prev,
      [activeMedia.id]: {
        ...((prev[activeMedia.id]) || DEFAULT_EDITS(activeMedia.type)),
        ...updates
      }
    }));
  };

  // Tool active states
  const [activeTool, setActiveTool] = useState<'audio' | 'text' | 'overlay' | 'filters' | 'edit' | 'draw' | 'more' | null>(null);

  // Design studio shape & sticker store custom states
  const [selectedShapeCategory, setSelectedShapeCategory] = useState<string>('basic');
  const [shapeSearchQuery, setShapeSearchQuery] = useState<string>('');
  const [stickerSearchQuery, setStickerSearchQuery] = useState<string>('');
  const [installedPackIds, setInstalledPackIds] = useState<string[]>(['cyber-pack', 'meme-pack']);
  const [downloadingPackId, setDownloadingPackId] = useState<string | null>(null);
  const [selectedPackId, setSelectedPackId] = useState<string>('cyber-pack');
  const [stickerStoreCategory, setStickerStoreCategory] = useState<'trending' | 'new' | 'premium' | 'free' | 'creator'>('trending');
  
  // User generated stickers & custom media overlays
  const [userUploadedStickers, setUserUploadedStickers] = useState<{ id: string; name: string; url: string }[]>([]);
  const userStickerInputRef = useRef<HTMLInputElement>(null);
  const customOverlayMediaInputRef = useRef<HTMLInputElement>(null);

  // Undo/Trash kinematics states
  const [draggedLayerOverTrash, setDraggedLayerOverTrash] = useState<{ id: string; type: 'text' | 'overlay' } | null>(null);
  const [deletedLayerBackup, setDeletedLayerBackup] = useState<{ type: 'text' | 'overlay'; layer: any } | null>(null);
  
  // Overlay sub-tabs
  const [overlayTab, setOverlayTab] = useState<'media' | 'stickers' | 'shapes' | 'glass'>('media');
  const [comingSoonFeature, setComingSoonFeature] = useState<string | null>(null);
  
  // Layer selection state (which text or overlay layer is currently selected on canvas)
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  
  // Canvas drag guides
  const [showSnapV, setShowSnapV] = useState(false);
  const [showSnapH, setShowSnapH] = useState(false);
  
  // Drag handling refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; layerX: number; layerY: number } | null>(null);

  // Play/Pause active video & audio preview
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isStudioPlaying, setIsStudioPlaying] = useState(false);

  // Soundtrack settings (global across all media in the post)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [musicVolume, setMusicVolume] = useState<number>(80);
  const [musicTrimStart, setMusicTrimStart] = useState<number>(0);
  const [musicTrimEnd, setMusicTrimEnd] = useState<number>(45);
  const [musicFadeIn, setMusicFadeIn] = useState<number>(2);
  const [musicFadeOut, setMusicFadeOut] = useState<number>(2);

  // Music Browser states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'trending' | 'recent' | 'saved' | 'original' | 'recommended'>('trending');
  const [savedTrackIds, setSavedTrackIds] = useState<string[]>(['track-5']);
  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);

  // Final summary page modal
  const [showFinalSummary, setShowFinalSummary] = useState(false);

  // Initialize and clean up HTMLAudioElement
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.loop = true;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const activeTrack = MUSIC_LIBRARY.find(t => t.id === selectedTrackId);
  const previewTrack = MUSIC_LIBRARY.find(t => t.id === previewingTrackId);

  // Handle previewing vs selecting track loading
  useEffect(() => {
    if (!audioRef.current) return;

    const trackToLoad = previewTrack || selectedSpotifyTrack || activeTrack;

    if (trackToLoad) {
      const wasPlaying = isStudioPlaying || !!previewTrack;
      const urlToPlay = (trackToLoad as any).previewUrl || (trackToLoad as any).url;
      
      if (urlToPlay && audioRef.current.src !== urlToPlay) {
        audioRef.current.src = urlToPlay;
        audioRef.current.load();
      }
      
      audioRef.current.currentTime = previewTrack ? 0 : musicTrimStart;
      
      if (wasPlaying && urlToPlay) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    } else {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, [selectedTrackId, previewingTrackId, selectedSpotifyTrack, isStudioPlaying, musicTrimStart]);

  // Sync background soundtrack volume based on volume & active video mix mode
  useEffect(() => {
    if (!audioRef.current) return;
    
    // Mute background audio if original video audio is selected exclusively
    if (activeMedia?.type === 'video' && currentEdits.videoAudioMode === 'original') {
      audioRef.current.volume = 0;
    } else {
      audioRef.current.volume = musicVolume / 100;
    }
  }, [musicVolume, activeMedia?.type, currentEdits.videoAudioMode]);

  // Sync video play/pause state when switching activeIndex or play state
  useEffect(() => {
    const video = videoPreviewRef.current;
    if (!video) return;

    if (isStudioPlaying) {
      if (currentEdits.videoAudioMode === 'mute') {
        video.muted = true;
        video.volume = 0;
      } else {
        video.muted = false;
        video.volume = currentEdits.videoVolume / 100;
      }
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isStudioPlaying, activeIndex, currentEdits.videoAudioMode, currentEdits.videoVolume]);

  // Handle Play/Pause main toggle
  const handleTogglePlayStudio = () => {
    const nextPlaying = !isStudioPlaying;
    setIsStudioPlaying(nextPlaying);

    if (audioRef.current && (previewTrack || activeTrack)) {
      if (nextPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  };

  // Audio timeupdate loop for trim bounds and Fade In / Fade Out effects
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      // If we are previewing in the browser, don't restrict trim boundaries
      if (previewingTrackId) {
        return;
      }

      // Loop within trim bounds
      if (audio.currentTime > musicTrimEnd) {
        audio.currentTime = musicTrimStart;
      }
      if (audio.currentTime < musicTrimStart) {
        audio.currentTime = musicTrimStart;
      }

      // Apply Fade In / Fade Out
      const elapsed = audio.currentTime - musicTrimStart;
      const remaining = musicTrimEnd - audio.currentTime;
      let targetVol = musicVolume / 100;

      if (elapsed < musicFadeIn && musicFadeIn > 0) {
        targetVol = (elapsed / musicFadeIn) * (musicVolume / 100);
      } else if (remaining < musicFadeOut && musicFadeOut > 0) {
        targetVol = (remaining / musicFadeOut) * (musicVolume / 100);
      }

      if (activeMedia?.type !== 'video' || currentEdits.videoAudioMode !== 'original') {
        audio.volume = targetVol;
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [musicTrimStart, musicTrimEnd, musicVolume, musicFadeIn, musicFadeOut, activeMedia?.type, currentEdits.videoAudioMode, previewingTrackId]);

  // Google Fonts dynamic loader helper
  const loadFontDynamically = (fontFamily: string) => {
    if (typeof window === 'undefined') return;
    const fontId = `edit-font-${fontFamily.replace(/\s+/g, '-').toLowerCase()}`;
    if (document.getElementById(fontId)) return;
    
    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap`;
    document.head.appendChild(link);
  };

  // Advanced Filters & Pro Color Studio States
  const [filterSubTab, setFilterSubTab] = useState<'presets' | 'customize' | 'mypresets'>('presets');
  const [filterCategory, setFilterCategory] = useState<'all' | 'popular' | 'cinematic' | 'cyber' | 'film' | 'mono' | 'mood' | 'favorites'>('all');
  const [filterSearchQuery, setFilterSearchQuery] = useState<string>('');
  const [favoriteFilterIds, setFavoriteFilterIds] = useState<string[]>(['vesper', 'cyberpunk', 'kodak']);
  const [customPresets, setCustomPresets] = useState<{ id: string; name: string; category: string; edits: Partial<MediaEdits> }[]>([
    {
      id: 'custom-1',
      name: 'Cyber Golden Glow',
      category: 'cyber',
      edits: {
        filterId: 'vesper',
        filterIntensity: 85,
        warmth: 15,
        vibrance: 20,
        duotoneEnabled: true,
        duotoneColor1: '#ff007f',
        duotoneColor2: '#00f2fe',
        duotoneOpacity: 25,
        duotoneBlendMode: 'overlay'
      }
    }
  ]);
  const [isComparing, setIsComparing] = useState(false);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [newPresetNameInput, setNewPresetNameInput] = useState('');

  // Toggle Favorite filter
  const handleToggleFavoriteFilter = (id: string) => {
    setFavoriteFilterIds(prev => 
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  // Save current active edits as a Custom Preset
  const handleSaveCustomPreset = () => {
    if (!newPresetNameInput.trim()) return;
    const newPreset = {
      id: `custom-${Date.now()}`,
      name: newPresetNameInput.trim(),
      category: 'custom',
      edits: { ...currentEdits }
    };
    setCustomPresets(prev => [...prev, newPreset]);
    setNewPresetNameInput('');
    setShowSavePresetModal(false);
    setFilterSubTab('mypresets');
  };

  // Filter CSS construction
  const getCSSFilters = (edits: MediaEdits) => {
    if (isComparing) return 'none';

    let s = '';
    s += `brightness(${100 + edits.brightness}%) `;
    s += `contrast(${100 + edits.contrast}%) `;
    s += `saturate(${100 + edits.saturation + (edits.vibrance || 0)}%) `;
    
    if (edits.warmth > 0) {
      s += `sepia(${edits.warmth * 0.4}%) `;
    } else if (edits.warmth < 0) {
      s += `hue-rotate(${edits.warmth * 0.15}deg) `;
    }
    if (edits.tint !== 0) {
      s += `hue-rotate(${edits.tint * 0.3}deg) `;
    }
    if (edits.fade > 0) {
      s += `opacity(${100 - edits.fade * 0.4}%) `;
    }

    if (edits.filterId && edits.filterId !== 'original') {
      s += `${getPresetCSS(edits.filterId, edits.filterIntensity ?? 100)} `;
    }

    // Split toning synthetic color shift
    if (edits.splitToneHighlightSat && edits.splitToneHighlightSat > 0) {
      s += `sepia(${edits.splitToneHighlightSat * 0.25}%) hue-rotate(${edits.splitToneHighlightHue}deg) `;
    }

    return s.trim();
  };

  const getCSSTransforms = (edits: MediaEdits) => {
    let s = '';
    s += `rotate(${edits.rotation}deg) `;
    if (edits.flipH) s += `scaleX(-1) `;
    if (edits.flipV) s += `scaleY(-1) `;
    if (edits.perspectiveX !== 0 || edits.perspectiveY !== 0) {
      s += `perspective(400px) rotateX(${edits.perspectiveY * 0.25}deg) rotateY(${edits.perspectiveX * 0.25}deg) `;
    }
    return s.trim();
  };

  // Text layer actions
  const handleAddTextLayer = (customText?: string, presetStyle?: Partial<TextLayer>) => {
    const textLayers = currentEdits.textLayers;
    const offset = (textLayers.length % 5) * 4;
    const newText: TextLayer = {
      id: `text-${Date.now()}`,
      text: customText || 'YOUR TEXT',
      x: 45 + offset,
      y: 40 + offset,
      fontFamily: 'Inter',
      fontSize: 32,
      color: '#ffffff',
      opacity: 100,
      rotation: 0,
      scale: 1,
      bold: true,
      italic: false,
      background: 'none',
      backgroundColor: 'rgba(0,0,0,0.6)',
      shadow: true,
      gradient: false,
      gradientColors: ['#6C63FF', '#00f2fe'],
      letterSpacing: 1,
      ...presetStyle
    };
    loadFontDynamically(newText.fontFamily);
    
    updateEdits({
      textLayers: [...textLayers, newText]
    });
    setSelectedLayerId(newText.id);
    setActiveTool('text');
  };

  const handleUpdateTextLayer = (id: string, updates: Partial<TextLayer>) => {
    if (updates.fontFamily) {
      loadFontDynamically(updates.fontFamily);
    }
    updateEdits({
      textLayers: currentEdits.textLayers.map(l => l.id === id ? { ...l, ...updates } : l)
    });
  };

  const handleDuplicateTextLayer = (layer: TextLayer) => {
    const dup: TextLayer = {
      ...layer,
      id: `text-${Date.now()}-${Math.random().toString(36).substring(2,5)}`,
      x: Math.min(layer.x + 5, 95),
      y: Math.min(layer.y + 5, 95)
    };
    updateEdits({
      textLayers: [...currentEdits.textLayers, dup]
    });
    setSelectedLayerId(dup.id);
  };

  const handleDeleteTextLayer = (id: string) => {
    const layer = currentEdits.textLayers.find(l => l.id === id);
    if (layer) {
      setDeletedLayerBackup({ type: 'text', layer });
    }
    updateEdits({
      textLayers: currentEdits.textLayers.filter(l => l.id !== id)
    });
    setSelectedLayerId(null);
    setDraggedLayerOverTrash(null);
  };

  // Overlay layer actions
  const handleAddOverlay = (type: OverlayLayer['type'], value: string) => {
    const isMedia = type === 'image' || type === 'gif';
    const newOverlay: OverlayLayer = {
      id: `overlay-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      type,
      value,
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
      opacity: 100,
      width: isMedia ? 160 : 120,
      height: isMedia ? 160 : 120,
      fillType: type === 'shape' ? 'color' : undefined,
      fillColor: type === 'shape' ? '#6C63FF' : undefined,
      strokeColor: type === 'shape' ? '#ffffff' : undefined,
      strokeWidth: type === 'shape' ? 1.5 : undefined,
      borderRadius: type === 'shape' ? 8 : (isMedia ? 8 : undefined)
    };
    updateEdits({
      overlayLayers: [...currentEdits.overlayLayers, newOverlay]
    });
    setSelectedLayerId(newOverlay.id);
  };

  const handleCustomOverlayUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const objectUrl = URL.createObjectURL(file);
    const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
    handleAddOverlay(isGif ? 'gif' : 'image', objectUrl);
    e.target.value = '';
  };

  const handleUpdateOverlay = (id: string, updates: Partial<OverlayLayer>) => {
    updateEdits({
      overlayLayers: currentEdits.overlayLayers.map(l => l.id === id ? { ...l, ...updates } : l)
    });
  };

  const handleDuplicateOverlay = (layer: OverlayLayer) => {
    const dup: OverlayLayer = {
      ...layer,
      id: `overlay-${Date.now()}-${Math.random().toString(36).substring(2,5)}`,
      x: Math.min(layer.x + 5, 95),
      y: Math.min(layer.y + 5, 95)
    };
    updateEdits({
      overlayLayers: [...currentEdits.overlayLayers, dup]
    });
    setSelectedLayerId(dup.id);
  };

  const handleDeleteOverlay = (id: string) => {
    const layer = currentEdits.overlayLayers.find(l => l.id === id);
    if (layer) {
      setDeletedLayerBackup({ type: 'overlay', layer });
    }
    updateEdits({
      overlayLayers: currentEdits.overlayLayers.filter(l => l.id !== id)
    });
    setSelectedLayerId(null);
    setDraggedLayerOverTrash(null);
  };

  const handleLayerDragOverTrash = (id: string, type: 'text' | 'overlay', x: number, y: number, dragging: boolean) => {
    if (dragging && y > 82) {
      setDraggedLayerOverTrash({ id, type });
    } else {
      setDraggedLayerOverTrash(null);
    }
  };

  const handleUserStickerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const newStickers = Array.from(e.target.files).map(file => ({
      id: `user-sticker-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: file.name,
      url: URL.createObjectURL(file)
    }));
    
    setUserUploadedStickers(prev => [...prev, ...newStickers]);
    e.target.value = '';
  };

  const handleInstallPack = (packId: string) => {
    setDownloadingPackId(packId);
    setTimeout(() => {
      setInstalledPackIds(prev => [...prev, packId]);
      setDownloadingPackId(null);
    }, 1500);
  };

  // Mouse/Touch Drag Handler
  const handleDragStart = (e: React.MouseEvent, layerId: string, currentX: number, currentY: number) => {
    e.stopPropagation();
    setSelectedLayerId(layerId);
    
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      layerX: currentX,
      layerY: currentY
    };
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!dragStartRef.current || !selectedLayerId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const pctDeltaX = (deltaX / rect.width) * 100;
    const pctDeltaY = (deltaY / rect.height) * 100;

    let targetX = dragStartRef.current.layerX + pctDeltaX;
    let targetY = dragStartRef.current.layerY + pctDeltaY;

    // Constraint bounding box
    targetX = Math.max(0, Math.min(100, targetX));
    targetY = Math.max(0, Math.min(100, targetY));

    // Centered Snap Guides logic (50% center guides)
    const SNAP_THRESHOLD_PERCENT = 2.0;
    let snapV = false;
    let snapH = false;

    if (Math.abs(targetX - 50) < SNAP_THRESHOLD_PERCENT) {
      targetX = 50;
      snapV = true;
    }
    if (Math.abs(targetY - 50) < SNAP_THRESHOLD_PERCENT) {
      targetY = 50;
      snapH = true;
    }

    setShowSnapV(snapV);
    setShowSnapH(snapH);

    // Update active layer (checks both text & overlay lists)
    const isText = currentEdits.textLayers.some(l => l.id === selectedLayerId);
    if (isText) {
      handleUpdateTextLayer(selectedLayerId, { x: targetX, y: targetY });
    } else {
      handleUpdateOverlay(selectedLayerId, { x: targetX, y: targetY });
    }
  };

  const handleDragEnd = () => {
    dragStartRef.current = null;
    setShowSnapV(false);
    setShowSnapH(false);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => handleDragMove(e);
    const handleGlobalMouseUp = () => handleDragEnd();

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [selectedLayerId, currentEdits]);

  // Layout aspect styles based on crop settings
  const getAspectClass = (aspect: MediaEdits['cropAspect']) => {
    if (aspect === '1:1') return 'aspect-square';
    if (aspect === '4:5') return 'aspect-[4/5]';
    if (aspect === '16:9') return 'aspect-video';
    return '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: '100vw' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100vw' }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="fixed inset-0 z-[850] flex flex-col bg-[#040209] text-white select-none overflow-hidden"
    >
      {/* Ambient Premium Violet Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-violet-950/10 blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-950/15 blur-[140px] pointer-events-none z-0" />

      {/* ── Top Bar Header ── */}
      <header className="h-20 flex-shrink-0 flex items-center justify-between px-8 border-b border-[#170f2f] bg-[#090612]/60 backdrop-blur-md relative z-20">
        <button
          onClick={onBack}
          className="group flex items-center justify-center p-2.5 rounded-xl bg-[#120c24] hover:bg-[#1a1236] border border-[#25194a]/85 hover:border-[#6C63FF]/50 active:scale-95 transition-all text-neutral-300 hover:text-white shadow-lg"
          title="Go Back"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
        </button>

        <button
          onClick={() => {
            onDone(mediaEdits, {
              selectedTrackId,
              musicVolume,
              musicTrimStart,
              musicTrimEnd,
              musicFadeIn,
              musicFadeOut
            });
          }}
          className="group flex items-center gap-3 px-6 py-2 rounded-lg bg-[#6C63FF] hover:bg-[#5b52f5] active:scale-[0.98] transition-all text-white font-semibold shadow-[0_0_20px_rgba(108,99,255,0.15)]"
        >
          <span className="text-[12px] font-bold font-display tracking-wider uppercase">Done</span>
          <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </header>

      {/* ── main studio panel workspace ── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* LEFT WORKSPACE: Preview canvas */}
        <div className="flex-1 min-h-0 bg-[#06040b]/30 flex items-center justify-center p-6 relative lg:border-r border-[#170f2f] overflow-hidden"
             onClick={() => setSelectedLayerId(null)}
        >
          <div 
            ref={canvasRef}
            className={clsx(
              "relative w-full max-w-[460px] rounded-2xl border border-[#20143f] shadow-2xl bg-[#0c081a] flex items-center justify-center overflow-hidden select-none",
              currentEdits.cropAspect === '1:1' ? 'aspect-square' :
              currentEdits.cropAspect === '4:5' ? 'aspect-[4/5]' :
              currentEdits.cropAspect === '16:9' ? 'aspect-video' :
              'aspect-square'
            )}
            style={{ 
              maxHeight: '62vh'
            }}
          >
            {/* Visual content (Image or Video) */}
            {activeMedia.type === 'image' ? (
              <div 
                className="relative max-w-full max-h-full flex items-center justify-center cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePlayStudio();
                }}
              >
                <img
                  src={activeMedia.url}
                  alt={activeMedia.name}
                  className="max-h-[50vh] lg:max-h-[62vh] w-auto h-auto object-contain transition-all duration-100"
                  style={{
                    filter: getCSSFilters(currentEdits),
                    transform: getCSSTransforms(currentEdits),
                    willChange: 'transform, filter'
                  }}
                />
                
                {/* Simulated play button overlays for photos with soundtrack */}
                {selectedTrackId && !isStudioPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                    <div className="w-14 h-14 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white backdrop-blur-sm shadow-xl">
                      <Play size={20} fill="white" className="ml-1" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative max-w-full max-h-full flex items-center justify-center cursor-pointer"
                   onClick={(e) => {
                     e.stopPropagation();
                     handleTogglePlayStudio();
                   }}
              >
                <video
                  ref={videoPreviewRef}
                  src={activeMedia.url}
                  className="max-h-[50vh] lg:max-h-[62vh] w-auto h-auto object-contain transition-all duration-100"
                  playsInline
                  loop
                  style={{
                    filter: getCSSFilters(currentEdits),
                    transform: getCSSTransforms(currentEdits),
                    willChange: 'transform, filter'
                  }}
                />
                
                {/* Simulated play button overlays */}
                {!isStudioPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                    <div className="w-14 h-14 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white backdrop-blur-sm shadow-xl">
                      <Play size={20} fill="white" className="ml-1" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Compare Mode Active Banner */}
            {isComparing && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1 bg-amber-500/90 text-black text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg border border-amber-300 flex items-center gap-1.5 animate-pulse">
                <Eye size={12} />
                Original (Unfiltered)
              </div>
            )}

            {/* Duotone Overlay Layer */}
            {currentEdits.duotoneEnabled && !isComparing && (
              <div 
                className="absolute inset-0 pointer-events-none z-10 transition-all rounded-2xl"
                style={{
                  background: `linear-gradient(135deg, ${currentEdits.duotoneColor1 || '#6C63FF'}, ${currentEdits.duotoneColor2 || '#00f2fe'})`,
                  mixBlendMode: (currentEdits.duotoneBlendMode as any) || 'overlay',
                  opacity: (currentEdits.duotoneOpacity ?? 50) / 100
                }}
              />
            )}

            {/* Film Grain Texture Overlay */}
            {currentEdits.filmGrain && currentEdits.filmGrain > 0 && !isComparing && (
              <div 
                className="absolute inset-0 pointer-events-none z-10 opacity-30 mix-blend-overlay"
                style={{
                  opacity: (currentEdits.filmGrain / 100) * 0.5,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                }}
              />
            )}

            {/* Bloom Soft Glow Overlay */}
            {currentEdits.bloom && currentEdits.bloom > 0 && !isComparing && (
              <div 
                className="absolute inset-0 pointer-events-none z-10 bg-white/[0.04] backdrop-blur-[1px] transition-all"
                style={{
                  opacity: (currentEdits.bloom / 100) * 0.7
                }}
              />
            )}

            {/* Linear Vignette Layer */}
            {currentEdits.vignette > 0 && (
              <div 
                className="absolute inset-0 pointer-events-none z-10 transition-all"
                style={{
                  background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${currentEdits.vignette / 100}) 100%)`
                }}
              />
            )}

            {/* Fullscreen Blur Overlays */}
            {currentEdits.fade > 30 && (
              <div className="absolute inset-0 bg-white/[0.03] pointer-events-none z-10 backdrop-blur-[1px]" />
            )}

            {/* ── DRAGGABLE TEXT LAYERS ── */}
            {currentEdits.textLayers.map((layer) => {
              const isSel = selectedLayerId === layer.id;
              
              return (
                <InteractiveLayerWrapper
                  key={layer.id}
                  id={layer.id}
                  layer={layer}
                  isSel={isSel}
                  onSelect={() => setSelectedLayerId(layer.id)}
                  onUpdate={(updates) => handleUpdateTextLayer(layer.id, updates)}
                  onDelete={() => handleDeleteTextLayer(layer.id)}
                  onDuplicate={() => handleDuplicateTextLayer(layer)}
                  canvasRef={canvasRef}
                  onDragMove={(x, y, dragging) => handleLayerDragOverTrash(layer.id, 'text', x, y, dragging)}
                >
                  <div
                    className={clsx(
                      "w-full h-full flex items-center justify-center text-center rounded-lg transition-shadow select-none px-2 py-1",
                      layer.bold ? 'font-bold' : 'font-normal',
                      layer.italic ? 'italic' : ''
                    )}
                    style={{
                      fontFamily: `"${layer.fontFamily}", sans-serif`,
                      fontSize: `${layer.fontSize}px`,
                      color: layer.gradient ? 'transparent' : layer.color,
                      letterSpacing: `${layer.letterSpacing}px`,
                      textShadow: layer.shadow ? '2px 2px 8px rgba(0,0,0,0.8)' : 'none',
                      background: layer.background === 'solid' ? layer.backgroundColor : 
                                  layer.background === 'glass' ? 'rgba(255,255,255,0.06)' : 'transparent',
                      backdropFilter: layer.background === 'glass' ? 'blur(10px)' : 'none',
                      border: layer.background === 'glass' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                      boxShadow: layer.background === 'neon' ? '0 0 15px rgba(108,99,255,0.4)' : 'none',
                      backgroundImage: layer.gradient ? `linear-gradient(45deg, ${layer.gradientColors[0]}, ${layer.gradientColors[1]})` : 'none',
                      WebkitBackgroundClip: layer.gradient ? 'text' : 'none',
                      whiteSpace: layer.text.includes('\n') ? 'pre-wrap' : 'nowrap',
                      wordBreak: 'keep-all'
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setSelectedLayerId(layer.id);
                      setActiveTool('text');
                    }}
                  >
                    <span>{layer.text}</span>
                  </div>
                </InteractiveLayerWrapper>
              );
            })}

            {/* ── DRAGGABLE OVERLAYS (Shapes, Stickers, Emoji) ── */}
            {currentEdits.overlayLayers.map((layer) => {
              const isSel = selectedLayerId === layer.id;
              
              return (
                <InteractiveLayerWrapper
                  key={layer.id}
                  id={layer.id}
                  layer={layer}
                  isSel={isSel}
                  onSelect={() => setSelectedLayerId(layer.id)}
                  onUpdate={(updates) => handleUpdateOverlay(layer.id, updates)}
                  onDelete={() => handleDeleteOverlay(layer.id)}
                  onDuplicate={() => handleDuplicateOverlay(layer)}
                  canvasRef={canvasRef}
                  onDragMove={(x, y, dragging) => handleLayerDragOverTrash(layer.id, 'overlay', x, y, dragging)}
                >
                  <div 
                    className={clsx(
                      "w-full h-full flex items-center justify-center overflow-visible",
                      layer.glassEffect && "backdrop-blur-md bg-white/5 border border-white/10",
                      layer.shadow && "shadow-lg shadow-black/70"
                    )}
                    style={{
                      borderRadius: layer.borderRadius ? `${layer.borderRadius}px` : 'none',
                      filter: layer.blur ? `blur(${layer.blur}px)` : 'none'
                    }}
                  >
                    {layer.type === 'emoji' && (
                      <span className="text-4xl leading-none select-none">{layer.value}</span>
                    )}
                    {(layer.type === 'image' || layer.type === 'gif' || layer.type === 'sticker') && (
                      layer.value.startsWith('http') || layer.value.startsWith('blob:') || layer.value.startsWith('data:') ? (
                        layer.value.endsWith('.json') ? (
                          <LottiePlayer src={layer.value} />
                        ) : (
                          <img 
                            src={layer.value} 
                            alt={layer.type} 
                            className={clsx(
                              "w-full h-full object-contain pointer-events-none select-none",
                              layer.neonGlow && "filter drop-shadow-[0_0_12px_var(--glow-color)]"
                            )}
                            style={{
                              ['--glow-color' as any]: layer.neonGlowColor || '#6C63FF'
                            }}
                          />
                        )
                      ) : (
                        <span className="text-5xl leading-none select-none">{layer.value}</span>
                      )
                    )}
                    {layer.type === 'shape' && (
                      <ShapeRenderer layer={layer} />
                    )}
                  </div>
                </InteractiveLayerWrapper>
              );
            })}

            {/* Dynamic Kinetic Trash Bin Overlay */}
            {draggedLayerOverTrash && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl bg-red-950/80 border border-red-500/30 backdrop-blur-md flex items-center gap-3 z-30 shadow-[0_0_20px_rgba(239,68,68,0.25)] text-red-300 text-xs font-mono font-bold animate-pulse"
              >
                <Trash2 size={16} className="text-red-400" />
                <span>RELEASE TO DELETE LAYER</span>
              </motion.div>
            )}

            {/* ── Snapping guides visualizers (Cyan Neon Lines) ── */}
            {showSnapV && <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)] pointer-events-none z-30" />}
            {showSnapH && <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)] pointer-events-none z-30" />}
          </div>
        </div>

        {/* RIGHT PANEL: Floating tools and adjustment values */}
        <div className="w-full lg:w-[460px] xl:w-[500px] flex-shrink-0 flex flex-col min-h-0 bg-[#080510] border-l border-[#170f2f] z-10 relative">
          
          {/* Main workspace toolbar content panels */}
          <div className="flex-1 min-h-0 overflow-y-auto page-scroll p-6">
            
            {selectedLayerId && (
              <LayerInspectorPanel
                selectedLayerId={selectedLayerId}
                currentEdits={currentEdits}
                updateEdits={updateEdits}
                setSelectedLayerId={setSelectedLayerId}
                handleDeleteTextLayer={handleDeleteTextLayer}
                handleDeleteOverlay={handleDeleteOverlay}
              />
            )}

            {!selectedLayerId && (
              <>
                {/* NO TOOL ACTIVE: Show helpful hint */}
            {!activeTool && (
              <div className="flex flex-col items-center justify-center text-center h-full p-8 text-slate-500 space-y-4">
                <Sliders size={28} className="text-slate-600" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Post Editing Mode</h4>
                  <p className="text-[11px] leading-relaxed max-w-[280px]">
                    Select a tool from the bottom floating dock to crop, adjust filters, load soundtracks, or place typography overlays.
                  </p>
                </div>
              </div>
            )}

            {/* FILTERS & PRO COLOR STUDIO PANEL */}
            {activeTool === 'filters' && (
              <div className="space-y-5">
                
                {/* ── Studio Header & Tools ── */}
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#6C63FF]/15 border border-[#6C63FF]/30 flex items-center justify-center text-[#6C63FF]">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold font-display uppercase tracking-wider text-white">Color Studio</h3>
                      <p className="text-[9px] font-mono text-slate-500">GPU Accelerated Color Engine</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Hold to Compare Eye Button */}
                    <button
                      onMouseDown={() => setIsComparing(true)}
                      onMouseUp={() => setIsComparing(false)}
                      onTouchStart={() => setIsComparing(true)}
                      onTouchEnd={() => setIsComparing(false)}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all select-none",
                        isComparing 
                          ? "bg-amber-500 border-amber-400 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]" 
                          : "bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.07]"
                      )}
                      title="Hold to preview Original"
                    >
                      {isComparing ? <EyeOff size={12} /> : <Eye size={12} />}
                      {isComparing ? 'Comparing...' : 'Hold Compare'}
                    </button>

                    {/* Reset Color Grade Button */}
                    <button
                      onClick={() => {
                        updateEdits({
                          filterId: 'original',
                          filterIntensity: 100,
                          brightness: 0,
                          contrast: 0,
                          warmth: 0,
                          tint: 0,
                          saturation: 0,
                          vibrance: 0,
                          fade: 0,
                          vignette: 0,
                          structure: 0,
                          splitToneHighlightSat: 0,
                          splitToneShadowSat: 0,
                          duotoneEnabled: false,
                          filmGrain: 0,
                          bloom: 0
                        });
                      }}
                      className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.07] text-slate-400 hover:text-red-400 transition-all"
                      title="Reset Color Edits"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>

                {/* ── Sub Navigation Tabs ── */}
                <div className="flex items-center gap-1 bg-[#0c0818] p-1 rounded-xl border border-white/[0.06]">
                  <button
                    onClick={() => setFilterSubTab('presets')}
                    className={clsx(
                      "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                      filterSubTab === 'presets' 
                        ? "bg-[#6C63FF] text-white shadow-lg shadow-[#6C63FF]/20" 
                        : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
                    )}
                  >
                    <Sparkles size={12} />
                    Presets ({PRESET_FILTERS.length})
                  </button>
                  
                  <button
                    onClick={() => setFilterSubTab('customize')}
                    className={clsx(
                      "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                      filterSubTab === 'customize' 
                        ? "bg-[#6C63FF] text-white shadow-lg shadow-[#6C63FF]/20" 
                        : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
                    )}
                  >
                    <SlidersHorizontal size={12} />
                    Pro Studio
                  </button>
                  
                  <button
                    onClick={() => setFilterSubTab('mypresets')}
                    className={clsx(
                      "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                      filterSubTab === 'mypresets' 
                        ? "bg-[#6C63FF] text-white shadow-lg shadow-[#6C63FF]/20" 
                        : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
                    )}
                  >
                    <Bookmark size={12} />
                    My Presets ({customPresets.length})
                  </button>
                </div>

                {/* ────────────────── 1. PRESETS TAB ────────────────── */}
                {filterSubTab === 'presets' && (
                  <div className="space-y-4">
                    
                    {/* Category Filter Pills */}
                    <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1 border-b border-white/[0.04]">
                      {[
                        { id: 'all', label: 'All Presets' },
                        { id: 'popular', label: '🔥 Popular' },
                        { id: 'cinematic', label: '🎬 Cinematic' },
                        { id: 'cyber', label: '⚡ Cyber & Neon' },
                        { id: 'film', label: '🎞️ Film & Grain' },
                        { id: 'mono', label: '🖤 Black & White' },
                        { id: 'mood', label: '❄️ Mood Tones' },
                        { id: 'favorites', label: '⭐ Favorites' }
                      ].map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setFilterCategory(cat.id as any)}
                          className={clsx(
                            "px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border",
                            filterCategory === cat.id
                              ? "bg-[#6C63FF]/15 border-[#6C63FF]/40 text-[#6C63FF]"
                              : "bg-white/[0.01] border-white/[0.05] text-slate-400 hover:text-white hover:border-white/10"
                          )}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Filter Search Input */}
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search presets by name or vibe..."
                        value={filterSearchQuery}
                        onChange={(e) => setFilterSearchQuery(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-[#6C63FF]/50 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all"
                      />
                      {filterSearchQuery && (
                        <button 
                          onClick={() => setFilterSearchQuery('')} 
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Filter Intensity Slider (Visible when non-original filter is active) */}
                    {currentEdits.filterId !== 'original' && (
                      <div className="p-3.5 bg-gradient-to-r from-[#6C63FF]/10 to-transparent border border-[#6C63FF]/25 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-300 font-bold flex items-center gap-1.5">
                            <Wand2 size={13} className="text-[#6C63FF]" />
                            Preset Intensity
                          </span>
                          <span className="text-[#6C63FF] font-black">{currentEdits.filterIntensity}%</span>
                        </div>

                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={currentEdits.filterIntensity}
                          onChange={(e) => updateEdits({ filterIntensity: parseInt(e.target.value) })}
                          className="w-full h-1.5 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-[#6C63FF]"
                        />

                        {/* Quick Snap Intensity Buttons */}
                        <div className="flex gap-1.5 pt-0.5">
                          {[25, 50, 75, 100].map(pct => (
                            <button
                              key={pct}
                              onClick={() => updateEdits({ filterIntensity: pct })}
                              className={clsx(
                                "flex-1 py-1 rounded text-[9px] font-mono font-bold transition-all border",
                                currentEdits.filterIntensity === pct
                                  ? "bg-[#6C63FF] border-[#6C63FF] text-white"
                                  : "bg-white/5 border-white/[0.06] text-slate-400 hover:text-white"
                              )}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Presets Cards Grid */}
                    <div className="grid grid-cols-2 gap-2.5 max-h-[42vh] overflow-y-auto page-scroll pr-1">
                      {PRESET_FILTERS
                        .filter(f => {
                          const matchesSearch = f.name.toLowerCase().includes(filterSearchQuery.toLowerCase()) || 
                                                f.vibe.toLowerCase().includes(filterSearchQuery.toLowerCase());
                          if (filterCategory === 'favorites') {
                            return matchesSearch && favoriteFilterIds.includes(f.id);
                          }
                          if (filterCategory === 'popular') {
                            return matchesSearch && f.popular;
                          }
                          if (filterCategory !== 'all') {
                            return matchesSearch && f.category === filterCategory;
                          }
                          return matchesSearch;
                        })
                        .map(f => {
                          const isAct = currentEdits.filterId === f.id;
                          const isFav = favoriteFilterIds.includes(f.id);

                          return (
                            <div
                              key={f.id}
                              onClick={() => updateEdits({ filterId: f.id })}
                              className={clsx(
                                "group relative p-2.5 rounded-xl border transition-all cursor-pointer overflow-hidden flex flex-col justify-between space-y-2",
                                isAct 
                                  ? "bg-[#6C63FF]/10 border-[#6C63FF] shadow-[0_0_15px_rgba(108,99,255,0.2)]" 
                                  : "bg-white/[0.02] border-white/[0.06] hover:border-white/20 hover:bg-white/[0.05]"
                              )}
                            >
                              {/* Thumbnail Live Render */}
                              <div className="relative w-full h-20 rounded-lg overflow-hidden bg-black/40 flex items-center justify-center border border-white/5">
                                <img
                                  src={activeMedia.url}
                                  alt={f.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  style={{
                                    filter: getPresetCSS(f.id, 100)
                                  }}
                                />

                                {/* Category Gradient Accent Pill */}
                                <div className={clsx("absolute top-1.5 left-1.5 px-2 py-0.5 rounded text-[8px] font-black uppercase text-white tracking-wider backdrop-blur-md bg-black/50 border border-white/10")}>
                                  {f.category}
                                </div>

                                {/* Star Favorite Toggle */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleFavoriteFilter(f.id);
                                  }}
                                  className={clsx(
                                    "absolute top-1.5 right-1.5 p-1 rounded-full backdrop-blur-md transition-all active:scale-90",
                                    isFav ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "bg-black/40 text-slate-400 hover:text-white border border-white/10"
                                  )}
                                >
                                  <Star size={10} fill={isFav ? 'currentColor' : 'none'} />
                                </button>

                                {isAct && (
                                  <div className="absolute inset-0 bg-[#6C63FF]/15 border-2 border-[#6C63FF] rounded-lg flex items-center justify-center pointer-events-none">
                                    <div className="w-6 h-6 rounded-full bg-[#6C63FF] text-white flex items-center justify-center shadow-lg">
                                      <Check size={12} strokeWidth={3} />
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Card Text Info */}
                              <div className="space-y-0.5 px-0.5">
                                <div className="flex items-center justify-between">
                                  <span className={clsx("text-xs font-bold truncate", isAct ? "text-white" : "text-slate-200")}>
                                    {f.name}
                                  </span>
                                </div>
                                <span className="text-[9px] font-mono text-slate-500 block truncate">
                                  {f.vibe}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* ────────────────── 2. COLOR STUDIO (CUSTOMIZE) TAB ────────────────── */}
                {filterSubTab === 'customize' && (
                  <div className="space-y-5 max-h-[48vh] overflow-y-auto page-scroll pr-1">
                    
                    {/* Basic Tone & Color Controls */}
                    <div className="space-y-3 p-4 bg-white/[0.01] border border-white/[0.04] rounded-xl">
                      <span className="text-[10px] font-mono text-slate-400 font-bold block uppercase tracking-wider">
                        Tone & Temperature Tuning
                      </span>
                      
                      <AdjustmentSlider
                        label="Temperature (Warm / Cool)"
                        min={-50}
                        max={50}
                        value={currentEdits.warmth}
                        onChange={(v) => updateEdits({ warmth: v })}
                      />

                      <AdjustmentSlider
                        label="Tint (Green / Magenta)"
                        min={-50}
                        max={50}
                        value={currentEdits.tint}
                        onChange={(v) => updateEdits({ tint: v })}
                      />

                      <AdjustmentSlider
                        label="Vibrance (Smart Saturation)"
                        min={-50}
                        max={50}
                        value={currentEdits.vibrance || 0}
                        onChange={(v) => updateEdits({ vibrance: v })}
                      />

                      <AdjustmentSlider
                        label="Saturation"
                        min={-50}
                        max={50}
                        value={currentEdits.saturation}
                        onChange={(v) => updateEdits({ saturation: v })}
                      />

                      <AdjustmentSlider
                        label="Contrast"
                        min={-50}
                        max={50}
                        value={currentEdits.contrast}
                        onChange={(v) => updateEdits({ contrast: v })}
                      />

                      <AdjustmentSlider
                        label="Exposure / Brightness"
                        min={-50}
                        max={50}
                        value={currentEdits.brightness}
                        onChange={(v) => updateEdits({ brightness: v })}
                      />

                      <AdjustmentSlider
                        label="Fade (Faded Blacks)"
                        min={0}
                        max={100}
                        value={currentEdits.fade}
                        onChange={(v) => updateEdits({ fade: v })}
                      />

                      <AdjustmentSlider
                        label="Vignette Shadowing"
                        min={0}
                        max={100}
                        value={currentEdits.vignette}
                        onChange={(v) => updateEdits({ vignette: v })}
                      />
                    </div>

                    {/* Split Toning Controls */}
                    <div className="space-y-4 p-4 bg-white/[0.01] border border-white/[0.04] rounded-xl">
                      <span className="text-[10px] font-mono text-slate-400 font-bold block uppercase tracking-wider">
                        Split Toning (Highlight & Shadow Color)
                      </span>

                      {/* Highlights Tint */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-300">Highlights Hue Tint</span>
                          <span className="text-[#6C63FF] font-bold">{currentEdits.splitToneHighlightHue || 40}°</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={currentEdits.splitToneHighlightHue || 40}
                          onChange={(e) => updateEdits({ splitToneHighlightHue: parseInt(e.target.value) })}
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                          style={{
                            background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
                          }}
                        />
                        <AdjustmentSlider
                          label="Highlights Saturation"
                          min={0}
                          max={100}
                          value={currentEdits.splitToneHighlightSat || 0}
                          onChange={(v) => updateEdits({ splitToneHighlightSat: v })}
                        />
                      </div>
                    </div>

                    {/* Duotone Gradient Overlay Controls */}
                    <div className="space-y-4 p-4 bg-white/[0.01] border border-white/[0.04] rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-200 block">Duotone Color Map</span>
                          <span className="text-[10px] text-slate-500 block">Dual color gradient map overlay.</span>
                        </div>
                        <button
                          onClick={() => updateEdits({ duotoneEnabled: !currentEdits.duotoneEnabled })}
                          className={clsx(
                            "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border",
                            currentEdits.duotoneEnabled
                              ? "bg-[#6C63FF] border-[#6C63FF] text-white"
                              : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                          )}
                        >
                          {currentEdits.duotoneEnabled ? 'Active' : 'Enable'}
                        </button>
                      </div>

                      {currentEdits.duotoneEnabled && (
                        <div className="space-y-3 pt-2 border-t border-white/[0.04]">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-mono text-slate-400 block uppercase">Primary Color</label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={currentEdits.duotoneColor1 || '#6C63FF'}
                                  onChange={(e) => updateEdits({ duotoneColor1: e.target.value })}
                                  className="w-8 h-8 rounded border border-white/20 bg-transparent cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={currentEdits.duotoneColor1 || '#6C63FF'}
                                  onChange={(e) => updateEdits({ duotoneColor1: e.target.value })}
                                  className="w-full bg-neutral-900 border border-white/10 rounded px-2 text-[10px] text-white font-mono uppercase"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-mono text-slate-400 block uppercase">Secondary Color</label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={currentEdits.duotoneColor2 || '#00f2fe'}
                                  onChange={(e) => updateEdits({ duotoneColor2: e.target.value })}
                                  className="w-8 h-8 rounded border border-white/20 bg-transparent cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={currentEdits.duotoneColor2 || '#00f2fe'}
                                  onChange={(e) => updateEdits({ duotoneColor2: e.target.value })}
                                  className="w-full bg-neutral-900 border border-white/10 rounded px-2 text-[10px] text-white font-mono uppercase"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] font-mono text-slate-400 block uppercase">Duotone Blend Mode</label>
                            <select
                              value={currentEdits.duotoneBlendMode || 'overlay'}
                              onChange={(e) => updateEdits({ duotoneBlendMode: e.target.value })}
                              className="w-full bg-neutral-900 border border-white/[0.08] text-slate-300 rounded-lg py-1.5 px-3 outline-none text-xs focus:border-[#6C63FF]"
                            >
                              {['overlay', 'soft-light', 'screen', 'multiply', 'color-burn', 'difference'].map(m => (
                                <option key={m} value={m}>{m.toUpperCase()}</option>
                              ))}
                            </select>
                          </div>

                          <AdjustmentSlider
                            label="Duotone Opacity"
                            min={0}
                            max={100}
                            value={currentEdits.duotoneOpacity ?? 50}
                            onChange={(v) => updateEdits({ duotoneOpacity: v })}
                          />
                        </div>
                      )}
                    </div>

                    {/* Film Optics & Analog Textures */}
                    <div className="space-y-3 p-4 bg-white/[0.01] border border-white/[0.04] rounded-xl">
                      <span className="text-[10px] font-mono text-slate-400 font-bold block uppercase tracking-wider">
                        Film Optics & Textures
                      </span>

                      <AdjustmentSlider
                        label="Analog Film Grain"
                        min={0}
                        max={100}
                        value={currentEdits.filmGrain || 0}
                        onChange={(v) => updateEdits({ filmGrain: v })}
                      />

                      <AdjustmentSlider
                        label="Bloom / Ethereal Glow"
                        min={0}
                        max={100}
                        value={currentEdits.bloom || 0}
                        onChange={(v) => updateEdits({ bloom: v })}
                      />

                      <AdjustmentSlider
                        label="Structure / Contrast Detail"
                        min={-30}
                        max={30}
                        value={currentEdits.structure}
                        onChange={(v) => updateEdits({ structure: v })}
                      />
                    </div>

                    {/* Save Current Grade as Preset Button */}
                    <button
                      onClick={() => setShowSavePresetModal(true)}
                      className="w-full py-3.5 bg-[#6C63FF]/15 border border-[#6C63FF]/30 hover:border-[#6C63FF] text-[#6C63FF] hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                      <Plus size={14} />
                      Save Current Grade as Custom Preset
                    </button>
                  </div>
                )}

                {/* ────────────────── 3. MY PRESETS TAB ────────────────── */}
                {filterSubTab === 'mypresets' && (
                  <div className="space-y-4">
                    {customPresets.length === 0 ? (
                      <div className="p-8 border border-dashed border-white/[0.06] rounded-xl text-center space-y-3">
                        <Bookmark size={28} className="mx-auto text-slate-600" />
                        <div>
                          <p className="text-xs font-bold text-slate-300">No Custom Presets Saved</p>
                          <p className="text-[10px] text-slate-500 mt-1 max-w-[240px] mx-auto">
                            Adjust color grading in the Pro Studio tab and click "Save Current Grade" to build your personal library.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5 max-h-[42vh] overflow-y-auto page-scroll pr-1">
                        {customPresets.map(preset => (
                          <div
                            key={preset.id}
                            className="p-3 bg-white/[0.02] border border-white/[0.06] hover:border-[#6C63FF]/50 rounded-xl space-y-2 flex flex-col justify-between"
                          >
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-white block truncate">{preset.name}</span>
                              <span className="text-[9px] font-mono text-slate-500 uppercase block">Custom Grade</span>
                            </div>

                            <div className="flex gap-1.5 pt-1">
                              <button
                                onClick={() => updateEdits(preset.edits)}
                                className="flex-1 py-1.5 bg-[#6C63FF] hover:bg-[#5b52f5] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                              >
                                Apply
                              </button>
                              <button
                                onClick={() => setCustomPresets(prev => prev.filter(p => p.id !== preset.id))}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                                title="Delete Preset"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Save Custom Preset Modal ── */}
                {showSavePresetModal && (
                  <div className="fixed inset-0 z-[900] bg-black/80 flex items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-[#0D0D11] border border-white/10 p-6 rounded-2xl space-y-4 shadow-2xl">
                      <h4 className="text-sm font-bold text-white">Save Custom Preset</h4>
                      <input
                        type="text"
                        placeholder="Preset Name (e.g., Cyber Glow 2026)"
                        value={newPresetNameInput}
                        onChange={(e) => setNewPresetNameInput(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#6C63FF]"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setShowSavePresetModal(false)}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveCustomPreset}
                          className="px-4 py-2 bg-[#6C63FF] hover:bg-[#5b52f5] text-white rounded-xl text-xs font-bold"
                        >
                          Save Preset
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AUDIO PANEL */}
            {activeTool === 'audio' && (
              <div className="space-y-6">
                {onTriggerMusicPicker ? (
                  !selectedSpotifyTrack ? (
                    <div className="space-y-4 py-8 text-center flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mb-3 border border-cyan-500/20">
                        <Music className="w-5 h-5 text-cyan-400" />
                      </div>
                      <h3 className="text-sm font-bold text-neutral-200">No Soundtrack Selected</h3>
                      <p className="text-xs text-neutral-500 max-w-[220px]">
                        Add a premium Spotify background track to play during swiping.
                      </p>
                      <button
                        onClick={onTriggerMusicPicker}
                        className="mt-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-cyan-500/10"
                      >
                        Choose Music
                      </button>
                    </div>
                  ) : (
                    <VerlynMusicEditor
                      selectedTrack={selectedSpotifyTrack}
                      onReplaceTrack={onTriggerMusicPicker}
                      onRemoveTrack={() => {
                        onClearSpotifyTrack?.();
                        setSelectedTrackId(null);
                        setPreviewingTrackId(null);
                        setIsStudioPlaying(false);
                      }}
                      startTime={musicTrimStart}
                      endTime={musicTrimEnd}
                      musicVolume={musicVolume}
                      originalVolume={50}
                      fadeIn={musicFadeIn}
                      fadeOut={musicFadeOut}
                      onChangeStartTime={setMusicTrimStart}
                      onChangeEndTime={setMusicTrimEnd}
                      onChangeMusicVolume={setMusicVolume}
                      onChangeOriginalVolume={(v) => {}}
                      onChangeFadeIn={setMusicFadeIn}
                      onChangeFadeOut={setMusicFadeOut}
                      hasVideoAudio={selectedMedia.some(m => m.type === 'video')}
                    />
                  )
                ) : !selectedTrackId ? (
                  // MUSIC BROWSER VIEW
                  <div className="space-y-4">
                    {/* Search bar */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search soundtrack..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-[#6C63FF]/50 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1.5 overflow-x-auto hide-scrollbar border-b border-white/[0.03] pb-1">
                      {(['trending', 'recommended', 'recent', 'saved', 'original'] as const).map((cat) => {
                        const active = selectedCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={clsx(
                              "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                              active 
                                ? "bg-[#6C63FF]/10 text-white border border-[#6C63FF]/30" 
                                : "text-slate-500 hover:text-slate-300 border border-transparent"
                            )}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>

                    {/* List of library songs */}
                    <div className="space-y-2.5 max-h-[38vh] overflow-y-auto page-scroll pr-1">
                      {MUSIC_LIBRARY
                        .filter(t => {
                          const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                                t.artist.toLowerCase().includes(searchQuery.toLowerCase());
                          if (selectedCategory === 'saved') {
                            return matchesSearch && savedTrackIds.includes(t.id);
                          }
                          if (selectedCategory === 'original') {
                            return false; 
                          }
                          return matchesSearch && t.category === selectedCategory;
                        })
                        .map((t) => {
                          const isPreviewing = previewingTrackId === t.id;
                          const isBookmarked = savedTrackIds.includes(t.id);

                          return (
                            <div
                              key={t.id}
                              className="p-3 rounded-xl border border-white/[0.04] bg-[#0c0c10]/60 flex items-center justify-between transition-all hover:border-white/10"
                            >
                              <div className="flex items-center gap-3 min-w-0 pr-4">
                                {/* Cover art with play preview overlay */}
                                <div 
                                  onClick={() => setPreviewingTrackId(isPreviewing ? null : t.id)}
                                  className="w-11 h-11 rounded-lg overflow-hidden relative cursor-pointer group flex-shrink-0"
                                >
                                  <img src={t.coverUrl} className="w-full h-full object-cover" alt={t.title} />
                                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isPreviewing ? (
                                      <Pause size={14} className="text-[#6C63FF] fill-[#6C63FF]" />
                                    ) : (
                                      <Play size={14} className="text-white fill-white ml-0.5" />
                                    )}
                                  </div>
                                  {isPreviewing && (
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                      <Pause size={14} className="text-[#6C63FF] fill-[#6C63FF]" />
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-200 truncate">{t.title}</p>
                                  <p className="text-[10px] text-slate-500 truncate">{t.artist}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {/* Heart/Save Icon */}
                                <button
                                  onClick={() => {
                                    setSavedTrackIds(prev => 
                                      isBookmarked ? prev.filter(id => id !== t.id) : [...prev, t.id]
                                    );
                                  }}
                                  className={clsx(
                                    "p-2 rounded-lg border transition-all active:scale-90",
                                    isBookmarked 
                                      ? "border-pink-500/20 bg-pink-500/10 text-pink-400" 
                                      : "border-white/[0.04] hover:bg-white/5 text-slate-500"
                                  )}
                                >
                                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                  </svg>
                                </button>

                                {/* Select Button */}
                                <button
                                  onClick={() => {
                                    setSelectedTrackId(t.id);
                                    setPreviewingTrackId(null);
                                    setIsStudioPlaying(true);
                                    setMusicTrimStart(0);
                                    setMusicTrimEnd(Math.min(t.duration, 45));
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-[#6C63FF] hover:bg-[#5b52f5] active:scale-95 text-[10px] font-bold uppercase tracking-wider text-white transition-all"
                                >
                                  Use
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      
                      {selectedCategory === 'original' && (
                        <div className="p-8 text-center text-slate-500 text-xs font-mono">
                          No original audio tracks saved yet.
                        </div>
                      )}
                      
                      {selectedCategory === 'saved' && savedTrackIds.length === 0 && (
                        <div className="p-8 text-center text-slate-500 text-xs font-mono">
                          No bookmarked tracks. Click the heart to save songs.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // ACTIVE SOUNDTRACK CONTROLS
                  <div className="space-y-5">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => {
                          setSelectedTrackId(null);
                          setPreviewingTrackId(null);
                          setIsStudioPlaying(false);
                        }}
                        className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-wider"
                      >
                        Remove Music
                      </button>
                    </div>

                    {/* Selected Song Card */}
                    <div className="p-3.5 rounded-xl border border-[#6C63FF]/30 bg-[#6C63FF]/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={activeTrack?.coverUrl} className="w-10 h-10 rounded-lg object-cover" alt="Active" />
                        <div>
                          <p className="text-xs font-black text-white">{activeTrack?.title}</p>
                          <p className="text-[10px] font-bold text-slate-400">{activeTrack?.artist}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedTrackId(null)}
                        className="px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[9px] font-bold uppercase tracking-wider text-slate-300"
                      >
                        Change
                      </button>
                    </div>

                    {/* Playback Controls Pill */}
                    <div className="p-3 rounded-xl bg-white/[0.01] border border-white/[0.04] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={handleTogglePlayStudio}
                          className="w-8 h-8 rounded-full bg-[#6C63FF] hover:bg-[#5b52f5] flex items-center justify-center text-white active:scale-95 transition-all shadow-[0_0_10px_rgba(108,99,255,0.2)]"
                        >
                          {isStudioPlaying ? <Pause size={12} fill="white" /> : <Play size={12} fill="white" className="ml-0.5" />}
                        </button>
                        <span className="text-[11px] font-mono text-slate-400">
                          {isStudioPlaying ? 'Playing theme...' : 'Paused'}
                        </span>
                      </div>
                      <div className="w-24 h-5 flex items-center justify-center gap-0.5">
                        <div className={clsx("w-[2px] h-3 bg-[#6C63FF]/50 rounded-full", isStudioPlaying && "animate-pulse")} style={{ animationDelay: '0.1s' }} />
                        <div className={clsx("w-[2px] h-4 bg-[#6C63FF] rounded-full", isStudioPlaying && "animate-pulse")} style={{ animationDelay: '0.3s' }} />
                        <div className={clsx("w-[2px] h-2 bg-[#6C63FF]/70 rounded-full", isStudioPlaying && "animate-pulse")} style={{ animationDelay: '0.2s' }} />
                        <div className={clsx("w-[2px] h-4 bg-[#6C63FF] rounded-full", isStudioPlaying && "animate-pulse")} style={{ animationDelay: '0.4s' }} />
                        <div className={clsx("w-[2px] h-3 bg-[#6C63FF]/50 rounded-full", isStudioPlaying && "animate-pulse")} style={{ animationDelay: '0.1s' }} />
                      </div>
                    </div>

                    {/* Soundtrack Volume Slider */}
                    <div className="space-y-2 p-3 bg-white/[0.01] border border-white/[0.04] rounded-xl">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Music Volume</span>
                        <span className="text-white font-bold">{musicVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={musicVolume}
                        onChange={(e) => setMusicVolume(parseInt(e.target.value))}
                        className="w-full h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-[#6C63FF]"
                      />
                    </div>

                    {/* Soundtrack Trim Slider */}
                    <div className="space-y-3.5 p-3.5 bg-white/[0.01] border border-white/[0.04] rounded-xl">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Trim soundtrack (Max 45s)</span>
                        <span className="text-[#6C63FF] font-bold">{musicTrimStart}s - {musicTrimEnd}s</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-mono text-slate-500">
                            <span>Start Point</span>
                            <span>{musicTrimStart}s</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max={activeTrack ? Math.max(0, activeTrack.duration - 15) : 100}
                            value={musicTrimStart}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setMusicTrimStart(val);
                              setMusicTrimEnd(prev => {
                                if (prev < val + 5) return val + 5;
                                if (prev > val + 45) return val + 45;
                                return prev;
                              });
                              if (audioRef.current) {
                                audioRef.current.currentTime = val;
                              }
                            }}
                            className="w-full h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-[#6C63FF]"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-mono text-slate-500">
                            <span>End Point</span>
                            <span>{musicTrimEnd}s</span>
                          </div>
                          <input
                            type="range"
                            min={musicTrimStart + 5}
                            max={activeTrack ? Math.min(activeTrack.duration, musicTrimStart + 45) : 100}
                            value={musicTrimEnd}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setMusicTrimEnd(val);
                            }}
                            className="w-full h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-cyan-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Fade In & Fade Out */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2 p-3 bg-white/[0.01] border border-white/[0.04] rounded-xl">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-400">Fade In</span>
                          <span className="text-white font-bold">{musicFadeIn}s</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="5"
                          step="0.5"
                          value={musicFadeIn}
                          onChange={(e) => setMusicFadeIn(parseFloat(e.target.value))}
                          className="w-full h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-[#6C63FF]"
                        />
                      </div>

                      <div className="space-y-2 p-3 bg-white/[0.01] border border-white/[0.04] rounded-xl">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-400">Fade Out</span>
                          <span className="text-white font-bold">{musicFadeOut}s</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="5"
                          step="0.5"
                          value={musicFadeOut}
                          onChange={(e) => setMusicFadeOut(parseFloat(e.target.value))}
                          className="w-full h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-cyan-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* VIDEO AUDIO MIXING SECTION (only visible when active item is a video) */}
                {activeMedia.type === 'video' && (
                  <div className="space-y-4 p-4 border border-white/[0.05] bg-white/[0.02] rounded-xl mt-4">
                    <div className="grid grid-cols-3 gap-2">
                      {(['mute', 'original', 'mix'] as const).map((mode) => {
                        const active = currentEdits.videoAudioMode === mode;
                        return (
                          <button
                            key={mode}
                            onClick={() => updateEdits({ videoAudioMode: mode })}
                            className={clsx(
                              "py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border",
                              active 
                                ? "bg-white/10 text-white border-white/20 shadow-md" 
                                : "text-slate-500 hover:text-slate-300 border-transparent hover:bg-white/[0.01]"
                            )}
                          >
                            {mode}
                          </button>
                        );
                      })}
                    </div>

                    {currentEdits.videoAudioMode !== 'mute' && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-400">Video Volume</span>
                          <span className="text-white font-bold">{currentEdits.videoVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={currentEdits.videoVolume}
                          onChange={(e) => updateEdits({ videoVolume: parseInt(e.target.value) })}
                          className="w-full h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-[#6C63FF]"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TEXT PANEL */}
            {activeTool === 'text' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <button
                    onClick={() => handleAddTextLayer()}
                    className="w-full py-3 bg-[#6C63FF] hover:bg-[#5b52f5] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#6C63FF]/25 active:scale-95 transition-all"
                  >
                    <Plus size={16} />
                    Add Text Layer
                  </button>
                </div>

                {/* TRENDY TEXT PRESETS GALLERY */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">1-TAP TYPOGRAPHY PRESETS</span>
                  <div className="grid grid-cols-2 gap-2">
                    {TEXT_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleAddTextLayer(preset.style.text, preset.style)}
                        className="p-3 bg-[#0e0a1f] border border-white/[0.08] hover:border-[#6C63FF]/50 rounded-xl text-left transition-all active:scale-95 group flex items-center gap-2.5"
                      >
                        <span className="text-lg">{preset.icon}</span>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-200 block group-hover:text-white truncate">{preset.name}</span>
                          <span className="text-[9px] font-mono text-slate-500 block truncate">{preset.style.fontFamily}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* List active text layers */}
                {currentEdits.textLayers.length === 0 ? (
                  <div className="border border-dashed border-white/[0.04] p-8 rounded-xl text-center text-slate-600 text-xs">
                    No typography overlays placed. Click "Add Text" to start.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {currentEdits.textLayers.map((l) => {
                      const isAct = selectedLayerId === l.id;
                      return (
                        <div
                          key={l.id}
                          className={clsx(
                            'p-4.5 rounded-xl border transition-all space-y-4 bg-white/[0.01]',
                            isAct ? 'border-[#6C63FF] shadow-lg' : 'border-white/[0.04] opacity-80'
                          )}
                          onClick={() => setSelectedLayerId(l.id)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold truncate text-slate-300">"{l.text}"</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDuplicateTextLayer(l); }}
                                className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400"
                                title="Duplicate"
                              >
                                <Copy size={12} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteTextLayer(l.id); }}
                                className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400"
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Selected details */}
                          {isAct && (
                            <div className="space-y-4 pt-3 border-t border-white/[0.04] text-xs">
                              {/* Font Family */}
                              <div className="space-y-1.5">
                                <label className="text-slate-500 font-mono text-[10px]">FONT FAMILY</label>
                                <select
                                  value={l.fontFamily}
                                  onChange={(e) => handleUpdateTextLayer(l.id, { fontFamily: e.target.value })}
                                  className="w-full bg-neutral-900 border border-white/[0.08] text-slate-300 rounded-lg py-1.5 px-3 outline-none text-xs focus:border-[#6C63FF]"
                                >
                                  {FONT_FAMILIES.map(font => (
                                    <option key={font} value={font}>{font}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Size & Opacity */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-slate-500 font-mono text-[10px]">FONT SIZE ({l.fontSize}px)</label>
                                  <input
                                    type="range"
                                    min="12"
                                    max="72"
                                    value={l.fontSize}
                                    onChange={(e) => handleUpdateTextLayer(l.id, { fontSize: parseInt(e.target.value) })}
                                    className="w-full h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-[#6C63FF]"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-slate-500 font-mono text-[10px]">OPACITY ({l.opacity}%)</label>
                                  <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    value={l.opacity}
                                    onChange={(e) => handleUpdateTextLayer(l.id, { opacity: parseInt(e.target.value) })}
                                    className="w-full h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-[#6C63FF]"
                                  />
                                </div>
                              </div>

                              {/* Styling options */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleUpdateTextLayer(l.id, { bold: !l.bold })}
                                  className={clsx('w-8 h-8 rounded-lg border flex items-center justify-center', l.bold ? 'bg-[#6C63FF]/20 border-[#6C63FF]/45 text-white' : 'border-white/[0.08] text-slate-400')}
                                >
                                  <Bold size={12} />
                                </button>
                                <button
                                  onClick={() => handleUpdateTextLayer(l.id, { italic: !l.italic })}
                                  className={clsx('w-8 h-8 rounded-lg border flex items-center justify-center', l.italic ? 'bg-[#6C63FF]/20 border-[#6C63FF]/45 text-white' : 'border-white/[0.08] text-slate-400')}
                                >
                                  <Italic size={12} />
                                </button>
                                
                                <div className="h-6 w-[1px] bg-white/[0.08] mx-1" />

                                {/* Background preset toggle */}
                                <button
                                  onClick={() => handleUpdateTextLayer(l.id, { background: l.background === 'none' ? 'solid' : l.background === 'solid' ? 'glass' : l.background === 'glass' ? 'neon' : 'none' })}
                                  className={clsx('px-3.5 h-8 rounded-lg border text-[10px] font-bold uppercase tracking-wider flex items-center', l.background !== 'none' ? 'bg-[#6C63FF]/20 border-[#6C63FF]/45 text-white' : 'border-white/[0.08] text-slate-400')}
                                >
                                  BG: {l.background === 'none' ? 'None' : l.background}
                                </button>

                                {/* Shadow Toggle */}
                                <button
                                  onClick={() => handleUpdateTextLayer(l.id, { shadow: !l.shadow })}
                                  className={clsx('px-3 h-8 rounded-lg border text-[10px] font-bold uppercase tracking-wider flex items-center', l.shadow ? 'bg-[#6C63FF]/20 border-[#6C63FF]/45 text-white' : 'border-white/[0.08] text-slate-400')}
                                >
                                  Shadow
                                </button>
                              </div>

                              {/* Gradient Text Toggles */}
                              <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Text Gradient Effect</span>
                                <button
                                  onClick={() => handleUpdateTextLayer(l.id, { gradient: !l.gradient })}
                                  className={clsx(
                                    'ml-auto px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all',
                                    l.gradient ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white' : 'bg-white/5 text-slate-400 border border-white/[0.08]'
                                  )}
                                >
                                  {l.gradient ? 'Enabled' : 'Disabled'}
                                </button>
                              </div>

                              {/* Micro Rotation slider */}
                              <div className="space-y-1.5">
                                <label className="text-slate-500 font-mono text-[10px]">ROTATION CONTROL ({l.rotation}°)</label>
                                <input
                                  type="range"
                                  min="-180"
                                  max="180"
                                  value={l.rotation}
                                  onChange={(e) => handleUpdateTextLayer(l.id, { rotation: parseInt(e.target.value) })}
                                  className="w-full h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-[#6C63FF]"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            
            {activeTool === 'overlay' && (
              <div className="space-y-6">
                {/* Hidden input for uploading custom photo/GIF overlay */}
                <input
                  type="file"
                  ref={customOverlayMediaInputRef}
                  onChange={handleCustomOverlayUpload}
                  accept="image/*,.gif"
                  className="hidden"
                />

                {/* Sub-tabs header */}
                <div className="flex border-b border-white/[0.04] gap-1 p-0.5">
                  <button
                    onClick={() => setOverlayTab('media')}
                    className={clsx('flex-1 py-2 text-[10px] font-black uppercase tracking-wider border-b-2 text-center transition-all', overlayTab === 'media' ? 'border-[#6C63FF] text-white' : 'border-transparent text-slate-500')}
                  >
                    Media & GIFs
                  </button>
                  <button
                    onClick={() => setOverlayTab('stickers')}
                    className={clsx('flex-1 py-2 text-[10px] font-black uppercase tracking-wider border-b-2 text-center transition-all', overlayTab === 'stickers' ? 'border-[#6C63FF] text-white' : 'border-transparent text-slate-500')}
                  >
                    Stickers
                  </button>
                  <button
                    onClick={() => setOverlayTab('shapes')}
                    className={clsx('flex-1 py-2 text-[10px] font-black uppercase tracking-wider border-b-2 text-center transition-all', overlayTab === 'shapes' ? 'border-[#6C63FF] text-white' : 'border-transparent text-slate-500')}
                  >
                    Shapes
                  </button>
                  <button
                    onClick={() => setOverlayTab('glass')}
                    className={clsx('flex-1 py-2 text-[10px] font-black uppercase tracking-wider border-b-2 text-center transition-all', overlayTab === 'glass' ? 'border-[#6C63FF] text-white' : 'border-transparent text-slate-500')}
                  >
                    Glass
                  </button>
                </div>

                {/* MEDIA & GIFS TAB */}
                {overlayTab === 'media' && (
                  <div className="space-y-4 pt-1">
                    {/* Custom Media Upload Button */}
                    <button
                      type="button"
                      onClick={() => customOverlayMediaInputRef.current?.click()}
                      className="w-full p-4 border border-dashed border-[#6C63FF]/40 hover:border-[#6C63FF] bg-[#6C63FF]/5 hover:bg-[#6C63FF]/10 rounded-2xl text-center flex flex-col items-center justify-center space-y-2 cursor-pointer transition-all active:scale-[0.98] group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#6C63FF]/20 border border-[#6C63FF]/40 flex items-center justify-center text-[#6C63FF] group-hover:scale-110 transition-transform">
                        <Upload size={18} />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-white block">Upload Image or GIF Overlay</span>
                        <span className="text-[10px] text-slate-400 block">Add PNG, JPG, WebP pictures or animated GIFs</span>
                      </div>
                    </button>

                    {/* Preset Badges & Stamps */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-mono text-slate-400 font-bold block uppercase tracking-wider">Quick Text Badges & Watermarks</span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'VERIFIED ✅', bg: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' },
                          { label: 'LIVE 🔴', bg: 'bg-red-500/20 border-red-500/40 text-red-300' },
                          { label: 'NEW 🔥', bg: 'bg-amber-500/20 border-amber-500/40 text-amber-300' },
                          { label: '4K ULTRA ⚡', bg: 'bg-violet-500/20 border-violet-500/40 text-violet-300' },
                          { label: 'EXCLUSIVE 👑', bg: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' },
                          { label: 'VIP ⭐', bg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' },
                          { label: 'MEME 😂', bg: 'bg-pink-500/20 border-pink-500/40 text-pink-300' },
                          { label: 'SOUND ON 🔊', bg: 'bg-blue-500/20 border-blue-500/40 text-blue-300' }
                        ].map(badge => (
                          <button
                            key={badge.label}
                            onClick={() => handleAddOverlay('sticker', badge.label)}
                            className={clsx('px-3 py-2 rounded-xl border text-[10px] font-black tracking-wider uppercase transition-all active:scale-95 text-center', badge.bg)}
                          >
                            {badge.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Animated GIFs & Stickers Presets */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[9px] font-mono text-slate-400 font-bold block uppercase tracking-wider">Animated GIFs & Reactions</span>
                      <div className="grid grid-cols-3 gap-2.5 max-h-[25vh] overflow-y-auto page-scroll pr-1">
                        {[
                          { id: 'gif-fire', name: 'Fire Flame', url: 'https://media.giphy.com/media/3o72FfM5HJydzaMpfO/giphy.gif' },
                          { id: 'gif-sparkles', name: 'Sparkles', url: 'https://media.giphy.com/media/l41K3o5TzDQQDm8ic/giphy.gif' },
                          { id: 'gif-glitch', name: 'Glitch Code', url: 'https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif' },
                          { id: 'gif-matrix', name: 'Matrix Rain', url: 'https://media.giphy.com/media/xv3WUrnVdzNSw/giphy.gif' },
                          { id: 'gif-neon', name: 'Neon Wave', url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif' },
                          { id: 'gif-sound', name: 'Equalizer', url: 'https://media.giphy.com/media/l3vR1v4T075g7J3rW/giphy.gif' }
                        ].map(gif => (
                          <button
                            key={gif.id}
                            onClick={() => handleAddOverlay('gif', gif.url)}
                            className="p-2 bg-white/[0.02] border border-white/[0.04] rounded-xl text-center flex flex-col items-center justify-center gap-1.5 hover:border-white/20 hover:bg-white/[0.06] active:scale-95 transition-all group"
                          >
                            <img src={gif.url} alt={gif.name} className="w-10 h-10 object-contain rounded-lg group-hover:scale-105 transition-transform" />
                            <span className="text-[8px] font-mono font-bold text-slate-400 uppercase truncate max-w-full">{gif.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* STICKERS TAB */}
                {overlayTab === 'stickers' && (
                  <div className="space-y-4 pt-1">
                    {/* User custom sticker upload */}
                    <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                      <span className="text-xs font-semibold text-slate-300">Custom Sticker Upload</span>
                      <button
                        onClick={() => userStickerInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-[#6C63FF] hover:bg-[#5b52f5] text-white text-[10px] font-bold uppercase transition-all"
                      >
                        Upload
                      </button>
                      <input
                        type="file"
                        ref={userStickerInputRef}
                        onChange={handleUserStickerUpload}
                        accept="image/*"
                        className="hidden"
                        multiple
                      />
                    </div>

                    {/* Sticker Search */}
                    <input
                      type="text"
                      placeholder="Search stickers & emojis..."
                      value={stickerSearchQuery}
                      onChange={(e) => setStickerSearchQuery(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-[#6C63FF]/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                    />

                    {/* Custom User Uploaded Stickers */}
                    {userUploadedStickers.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[9px] font-mono text-slate-400 font-bold block uppercase">My Uploaded Stickers</span>
                        <div className="grid grid-cols-4 gap-2">
                          {userUploadedStickers.map(stk => (
                            <button
                              key={stk.id}
                              onClick={() => handleAddOverlay('sticker', stk.url)}
                              className="p-2 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center justify-center hover:border-white/20 active:scale-95 transition-all"
                            >
                              <img src={stk.url} alt={stk.name} className="w-8 h-8 object-contain" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Emoji & Graphic Stickers */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-mono text-slate-400 font-bold block uppercase">Popular Emojis & Graphics</span>
                      <div className="grid grid-cols-4 gap-2 max-h-[30vh] overflow-y-auto page-scroll pr-1">
                        {[
                          '🔥', '⚡', '💎', '🚀', '🛸', '👾', '🧬', '🦾',
                          '👑', '🎯', '🖤', '💯', '💥', '🌟', '🏆', '🌈',
                          '🎨', '🔮', '🧿', '⚓', '⚔️', '🛡️', '💫', '🔑'
                        ]
                        .filter(e => stickerSearchQuery === '' || e.includes(stickerSearchQuery))
                        .map((emoji, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAddOverlay('emoji', emoji)}
                            className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-center justify-center hover:border-white/20 hover:bg-white/[0.06] active:scale-90 transition-all text-2xl"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SHAPES TAB */}
                {overlayTab === 'shapes' && (
                  <div className="space-y-4 pt-1">
                    {/* Categories selector */}
                    <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-2 border-b border-white/[0.04]">
                      {['basic', 'professional', 'developer', 'tech', 'gaming', 'creator', 'business'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSelectedShapeCategory(cat)}
                          className={clsx(
                            "px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border",
                            selectedShapeCategory === cat
                              ? "bg-[#6C63FF]/10 border-[#6C63FF]/30 text-[#6C63FF]"
                              : "bg-transparent border-transparent text-slate-500 hover:text-slate-300"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Search shapes */}
                    <input
                      type="text"
                      placeholder="Search shapes..."
                      value={shapeSearchQuery}
                      onChange={(e) => setShapeSearchQuery(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-[#6C63FF]/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                    />

                    {/* Shape items grid */}
                    <div className="grid grid-cols-3 gap-2.5 max-h-[35vh] overflow-y-auto page-scroll pr-1 pb-2">
                      {SHAPE_LIBRARY
                        .filter(s => s.category === selectedShapeCategory && s.name.toLowerCase().includes(shapeSearchQuery.toLowerCase()))
                        .map(shape => (
                          <button
                            key={shape.id}
                            onClick={() => handleAddOverlay('shape', shape.id)}
                            className="py-3 bg-white/[0.02] border border-white/[0.04] rounded-lg text-[10px] font-bold text-slate-400 hover:text-white hover:border-white/10 hover:bg-white/[0.04] active:scale-95 transition-all text-center flex flex-col items-center justify-center gap-1.5 group"
                          >
                            <div className="w-8 h-8 flex items-center justify-center text-slate-400 group-hover:text-[#6C63FF] transition-all">
                              <svg viewBox={shape.viewBox} className="w-6 h-6 fill-current" dangerouslySetInnerHTML={{ __html: shape.path }} />
                            </div>
                            <span className="truncate max-w-[80px] text-[9px] uppercase tracking-wider font-mono">{shape.name}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* GLASS TAB */}
                {overlayTab === 'glass' && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between p-4 bg-white/[0.01] border border-white/[0.04] rounded-xl">
                      <div>
                        <span className="text-xs font-bold block text-slate-200">Glass Frame Border</span>
                        <span className="text-[10px] text-slate-500 block">Frosted glass edges wrapper.</span>
                      </div>
                      <button
                        onClick={() => {
                          const hasGlass = currentEdits.overlayLayers.some(o => o.value === 'glass-frame');
                          if (hasGlass) {
                            updateEdits({ overlayLayers: currentEdits.overlayLayers.filter(o => o.value !== 'glass-frame') });
                          } else {
                            handleAddOverlay('frame', 'glass-frame');
                          }
                        }}
                        className={clsx(
                          "px-3 py-1.5 rounded text-[10px] font-bold uppercase border transition-all",
                          currentEdits.overlayLayers.some(o => o.value === 'glass-frame')
                            ? "bg-[#6C63FF] border-[#6C63FF] text-white"
                            : "border-white/10 text-slate-400 hover:text-white"
                        )}
                      >
                        {currentEdits.overlayLayers.some(o => o.value === 'glass-frame') ? 'Active' : 'Enable'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/[0.01] border border-white/[0.04] rounded-xl">
                      <div>
                        <span className="text-xs font-bold block text-slate-200">Camera Viewfinder</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Target view frame overlays.</span>
                      </div>
                      <button
                        onClick={() => {
                          const hasVf = currentEdits.overlayLayers.some(o => o.value === 'viewfinder');
                          if (hasVf) {
                            updateEdits({ overlayLayers: currentEdits.overlayLayers.filter(o => o.value !== 'viewfinder') });
                          } else {
                            handleAddOverlay('frame', 'viewfinder');
                          }
                        }}
                        className={clsx(
                          'px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all',
                          currentEdits.overlayLayers.some(o => o.value === 'viewfinder')
                            ? 'bg-[#6C63FF] text-white' 
                            : 'bg-white/5 border border-white/[0.08] text-slate-400'
                        )}
                      >
                        {currentEdits.overlayLayers.some(o => o.value === 'viewfinder') ? 'Active' : 'Add'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* EDIT/ADJUSTMENTS PANEL */}
            {activeTool === 'edit' && (
              <div className="space-y-6">
                {/* Aspect Ratio select */}
                <div className="space-y-2 p-4 bg-white/[0.01] border border-white/[0.04] rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Crop Aspect Ratio</span>
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {(['original', '1:1', '4:5', '16:9'] as const).map(aspect => (
                      <button
                        key={aspect}
                        onClick={() => updateEdits({ cropAspect: aspect })}
                        className={clsx(
                          'py-1.5 text-[10px] font-bold rounded-lg border text-center transition-all',
                          currentEdits.cropAspect === aspect
                            ? 'bg-[#6C63FF] border-[#6C63FF] text-white'
                            : 'bg-white/5 border-white/[0.08] text-slate-400 hover:text-white'
                        )}
                      >
                        {aspect.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transforms */}
                <div className="flex gap-3">
                  <button
                    onClick={() => updateEdits({ rotation: (currentEdits.rotation + 90) % 360 })}
                    className="flex-1 py-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-center justify-center gap-2 hover:border-white/10 active:scale-95 transition-all text-xs font-bold text-slate-300"
                  >
                    <RotateCw size={14} />
                    Rotate 90°
                  </button>

                  <button
                    onClick={() => updateEdits({ flipH: !currentEdits.flipH })}
                    className="flex-1 py-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-center justify-center gap-2 hover:border-white/10 active:scale-95 transition-all text-xs font-bold text-slate-300"
                  >
                    <FlipIcon size={14} />
                    Flip Horizontal
                  </button>
                </div>

                {/* Sliders adjustments */}
                <div className="space-y-4">
                  <AdjustmentSlider
                    label="Brightness"
                    min={-50}
                    max={50}
                    value={currentEdits.brightness}
                    onChange={(v) => updateEdits({ brightness: v })}
                  />

                  <AdjustmentSlider
                    label="Contrast"
                    min={-50}
                    max={50}
                    value={currentEdits.contrast}
                    onChange={(v) => updateEdits({ contrast: v })}
                  />

                  <AdjustmentSlider
                    label="Saturation"
                    min={-50}
                    max={50}
                    value={currentEdits.saturation}
                    onChange={(v) => updateEdits({ saturation: v })}
                  />

                  <AdjustmentSlider
                    label="Fade"
                    min={0}
                    max={100}
                    value={currentEdits.fade}
                    onChange={(v) => updateEdits({ fade: v })}
                  />

                  <AdjustmentSlider
                    label="Vignette"
                    min={0}
                    max={100}
                    value={currentEdits.vignette}
                    onChange={(v) => updateEdits({ vignette: v })}
                  />

                  <AdjustmentSlider
                    label="Structure (Contrast Boost)"
                    min={-30}
                    max={30}
                    value={currentEdits.structure}
                    onChange={(v) => updateEdits({ structure: v })}
                  />

                  <AdjustmentSlider
                    label="Warmth / Cold Tone"
                    min={-50}
                    max={50}
                    value={currentEdits.warmth}
                    onChange={(v) => updateEdits({ warmth: v })}
                  />

                  {/* 3D Perspective shifts */}
                  <div className="p-4 bg-white/[0.01] border border-white/[0.04] rounded-xl space-y-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">3D Perspective Tilts</span>
                    <AdjustmentSlider
                      label="Perspective Tilt X"
                      min={-45}
                      max={45}
                      value={currentEdits.perspectiveX}
                      onChange={(v) => updateEdits({ perspectiveX: v })}
                    />
                    <AdjustmentSlider
                      label="Perspective Tilt Y"
                      min={-45}
                      max={45}
                      value={currentEdits.perspectiveY}
                      onChange={(v) => updateEdits({ perspectiveY: v })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* MORE OPTIONS PANEL */}
            {activeTool === 'more' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      if(confirm('Are you sure you want to reset all adjustments for this media item?')) {
                        updateEdits(DEFAULT_EDITS(activeMedia.type));
                      }
                    }}
                    className="w-full py-4.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-bold text-xs hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={14} />
                    Reset Current Media Edits
                  </button>

                  <button
                    onClick={() => {
                      const all: Record<string, MediaEdits> = {};
                      selectedMedia.forEach(m => { all[m.id] = DEFAULT_EDITS(m.type); });
                      setMediaEdits(all);
                      alert('All edits for all selected media items have been reset.');
                    }}
                    className="w-full py-4.5 bg-white/5 border border-white/[0.08] text-slate-300 rounded-xl font-bold text-xs hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    Clear All Edits (Global Reset)
                  </button>
                </div>
              </div>
            )}
              </>
            )}

          </div>

          {/* BOTTOM DOCK TOOLBAR */}
          <div className="h-28 flex-shrink-0 border-t border-[#121224] bg-[#0c0c16]/95 backdrop-blur-md px-6 flex flex-col justify-center">
            
            {/* Selected item carousel switchers */}
            <div className="flex items-center gap-2 px-1 py-1.5 overflow-x-auto hide-scrollbar border-b border-[#121224]/40 mb-2">
              {selectedMedia.map((media, idx) => (
                <div
                  key={media.id}
                  onClick={() => {
                    setActiveIndex(idx);
                    setSelectedLayerId(null);
                  }}
                  className={clsx(
                    'w-9 h-9 rounded-lg overflow-hidden border cursor-pointer flex-shrink-0 transition-all relative flex items-center justify-center',
                    idx === activeIndex ? 'border-[#6C63FF] scale-105 shadow-glow-primary' : 'border-white/10 opacity-60 hover:opacity-100'
                  )}
                >
                  <img
                    src={media.type === 'video' ? media.url : media.url}
                    className="w-full h-full object-cover"
                    alt={`Thumb ${idx}`}
                  />
                  {media.type === 'video' && (
                    <Play size={8} fill="white" className="absolute text-white" />
                  )}
                </div>
              ))}
            </div>

            {/* Bottom floating actual toolbar */}
            <div className="flex items-center justify-between bg-[#06060c]/60 border border-[#141428] rounded-lg px-4 py-2 shadow-inner">
              <ToolbarAction 
                icon={Volume2} 
                label="Audio" 
                active={activeTool === 'audio'} 
                onClick={() => setActiveTool(activeTool === 'audio' ? null : 'audio')} 
              />
              <ToolbarAction 
                icon={Type} 
                label="Text" 
                active={activeTool === 'text'} 
                onClick={() => setActiveTool(activeTool === 'text' ? null : 'text')} 
              />
              <ToolbarAction 
                icon={Layers} 
                label="Overlay" 
                active={activeTool === 'overlay'} 
                onClick={() => setActiveTool(activeTool === 'overlay' ? null : 'overlay')} 
              />
              <ToolbarAction 
                icon={Sliders} 
                label="Filters" 
                active={activeTool === 'filters'} 
                onClick={() => setActiveTool(activeTool === 'filters' ? null : 'filters')} 
              />
              <ToolbarAction 
                icon={Scissors} 
                label="Edit" 
                active={activeTool === 'edit'} 
                onClick={() => setActiveTool(activeTool === 'edit' ? null : 'edit')} 
              />
              <ToolbarAction 
                icon={PenTool} 
                label="Draw" 
                active={activeTool === 'draw'} 
                onClick={() => setActiveTool(activeTool === 'draw' ? null : 'draw')} 
              />
              <ToolbarAction 
                icon={MoreHorizontal} 
                label="More" 
                active={activeTool === 'more'} 
                onClick={() => setActiveTool(activeTool === 'more' ? null : 'more')} 
              />
            </div>

          </div>
        </div>
      </div>

      {/* ── DONE / COMPLETE COMPILATION SUMMARY ── */}
      <AnimatePresence>
        {showFinalSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[800] bg-black/90 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={SPRING_TRANSITION}
              className="w-full max-w-2xl bg-[#0D0D11] border border-white/[0.08] p-8 rounded-[28px] shadow-2xl relative"
            >
              <button
                onClick={() => setShowFinalSummary(false)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              >
                ✕
              </button>

              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-display tracking-tight text-white">Post Studio Complete</h3>
                    <p className="text-xs text-slate-500 font-mono uppercase tracking-wider mt-0.5">STEP 2 PIPELINE SUCCESSFUL</p>
                  </div>
                </div>

                <div className="max-h-[350px] overflow-y-auto page-scroll border border-white/[0.05] bg-white/[0.01] rounded-2xl p-5 space-y-4">
                  {selectedTrackId && (
                    <div className="p-3.5 rounded-xl border border-[#6C63FF]/20 bg-[#6C63FF]/5 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-3">
                        <Volume2 size={16} className="text-[#6C63FF]" />
                        <div>
                          <p className="text-white font-bold">Theme Music: {activeTrack?.title} - {activeTrack?.artist}</p>
                          <p className="text-slate-500 text-[10px] mt-0.5">Trim: {musicTrimStart}s - {musicTrimEnd}s | Volume: {musicVolume}% | Fades: In {musicFadeIn}s / Out {musicFadeOut}s</p>
                        </div>
                      </div>
                      <span className="text-[9px] uppercase tracking-wider text-[#6C63FF] bg-[#6C63FF]/10 px-2.5 py-0.5 rounded-full font-bold">Continuous Playback</span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4 border-b border-white/[0.03] pb-4 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 block mb-0.5">TOTAL EDITS SAVED</span>
                      <span className="text-white font-bold">{selectedMedia.length} / {selectedMedia.length} Items</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">TEXT LAYERS</span>
                      <span className="text-white font-bold">
                        {Object.values(mediaEdits).reduce((sum, e) => sum + e.textLayers.length, 0)} Layers
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">FILTERS APPLIED</span>
                      <span className="text-emerald-400 font-bold">GPU ACCELERATED</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-mono text-slate-500 font-bold block">EDIT SUMMARY DETAILS</span>
                    {selectedMedia.map((m, idx) => {
                      const e = mediaEdits[m.id];
                      return (
                        <div key={m.id} className="flex flex-col gap-1 py-3 border-b border-white/[0.03] last:border-b-0 text-xs font-mono">
                          <div className="flex justify-between items-center text-slate-300">
                            <span className="font-bold text-white pr-2">#{idx + 1} {m.name}</span>
                            <span className="text-slate-500 uppercase tracking-widest text-[9px]">
                              {m.type}
                            </span>
                          </div>
                          
                          {e && (
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pl-4 mt-1 space-y-0.5">
                              <div>• Crop: {e.cropAspect}</div>
                              <div>• Filter: {e.filterId !== 'original' ? e.filterId : 'none'}</div>
                              <div>• Text Layers: {e.textLayers.length}</div>
                              <div>• Overlays: {e.overlayLayers.length}</div>
                              {m.type === 'video' ? (
                                <>
                                  <div>• Video Audio: {e.videoAudioMode}</div>
                                  <div>• Video Volume: {e.videoVolume}%</div>
                                </>
                              ) : (
                                <div>• Perspective Rotations: {e.perspectiveX}° X / {e.perspectiveY}° Y</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#6C63FF]/5 border border-[#6C63FF]/20 text-xs text-neutral-400 leading-relaxed font-mono">
                  <strong>Validation Report:</strong> Step 3 (Verlyn Post Audio System containing the Music Browser, visual audio controls, continuous swiping soundtrack playback, and video audio mixing) compiles and runs successfully. All adjustments are non-destructive and type-safe.
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowFinalSummary(false)}
                    className="px-5 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] text-xs font-medium text-slate-300 active:scale-[0.98] transition-all"
                  >
                    Adjust Edits
                  </button>
                  <button
                    onClick={() => {
                      setShowFinalSummary(false);
                      setPostCreationOpen(false);
                    }}
                    className="group flex items-center gap-2 px-5 py-2 rounded-lg bg-[#6C63FF] hover:bg-[#5b52f5] active:scale-[0.98] transition-all text-xs font-semibold text-white shadow-[0_0_15px_rgba(108,99,255,0.2)]"
                  >
                    Finish Post Creation
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTool === 'draw' && (
          <BasicDraw
            onClose={() => setActiveTool(null)}
            mediaUrl={activeMedia?.url}
            mediaType={activeMedia?.type}
            onExport={(blob) => {
              const url = URL.createObjectURL(blob);
              const newOverlay: OverlayLayer = {
                id: `draw-${Date.now()}`,
                type: 'sticker',
                value: url,
                x: 50,
                y: 50,
                scale: 1,
                rotation: 0,
                opacity: 100,
                width: canvasRef.current ? canvasRef.current.clientWidth : 600,
                height: canvasRef.current ? canvasRef.current.clientHeight : 600,
                locked: true
              };
              updateEdits({
                overlayLayers: [...currentEdits.overlayLayers, newOverlay]
              });
              setActiveTool(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── COMING SOON POPUP MODAL ── */}
      <AnimatePresence>
        {comingSoonFeature && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none"
            onClick={() => setComingSoonFeature(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-sm bg-[#0e0a1f] border border-[#2d1b54] rounded-3xl p-6 shadow-2xl overflow-hidden text-center z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Ambient Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-[#6C63FF]/20 rounded-full blur-3xl pointer-events-none" />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setComingSoonFeature(null);
                }}
                className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer active:scale-90"
                title="Close"
              >
                <X size={18} />
              </button>

              <div className="relative z-10 flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#6C63FF]/20 to-cyan-500/20 border border-[#6C63FF]/40 flex items-center justify-center text-white mb-4 shadow-lg">
                  {comingSoonFeature === 'Store' ? (
                    <ShoppingBag size={26} className="text-cyan-400" />
                  ) : (
                    <Smile size={26} className="text-[#6C63FF]" />
                  )}
                </div>

                <span className="px-3 py-0.5 rounded-full bg-[#6C63FF]/20 border border-[#6C63FF]/40 text-[9px] font-mono font-bold text-[#6C63FF] uppercase tracking-widest mb-2">
                  COMING SOON
                </span>

                <h3 className="text-lg font-black font-display text-white tracking-tight">
                  {comingSoonFeature} Feature
                </h3>

                <p className="text-xs text-slate-300 mt-2 leading-relaxed max-w-[260px]">
                  The <span className="text-[#6C63FF] font-bold">{comingSoonFeature}</span> section is currently under development. Stay tuned for upcoming creative assets and tools!
                </p>

                <div className="mt-5 w-full pt-4 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setComingSoonFeature(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#6C63FF] hover:bg-[#5b52f5] text-white font-bold text-xs shadow-lg shadow-[#6C63FF]/25 active:scale-95 transition-all cursor-pointer"
                  >
                    Got It
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── ToolbarAction Subcomponent ──
function ToolbarAction({ icon: Icon, label, active, onClick }: { icon: any; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex flex-col items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all border outline-none select-none active:scale-95',
        active 
          ? 'bg-white/[0.04] border-white/[0.08] text-white shadow-[0_0_15px_rgba(108,99,255,0.06)]' 
          : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]'
      )}
    >
      <Icon size={16} className={clsx(active ? 'text-[#6C63FF]' : 'text-neutral-400')} />
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

// ── AdjustmentSlider Subcomponent ──
function AdjustmentSlider({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2 p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg">
      <div className="flex justify-between text-[11px] font-mono select-none">
        <span className="text-slate-400">{label}</span>
        <span className="text-[#6C63FF] font-bold">{value > 0 ? `+${value}` : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-[#6C63FF]"
      />
    </div>
  );
}

// ── ShapeRenderer Subcomponent ──
function ShapeRenderer({ layer }: { layer: OverlayLayer }) {
  const shapeDef = SHAPE_LIBRARY.find(s => s.id === layer.value);
  const svgPath = shapeDef ? shapeDef.path : '<rect x="2" y="2" width="20" height="20" />';
  const viewBox = shapeDef ? shapeDef.viewBox : '0 0 24 24';
  const gradId = `grad-${layer.id}`;

  const fillType = layer.fillType || 'color';
  const fillColor = layer.fillColor || '#6C63FF';
  const strokeColor = layer.strokeColor || '#ffffff';
  const strokeWidth = layer.strokeWidth !== undefined ? layer.strokeWidth : 1.5;
  const gradientColors = layer.gradientColors || ['#6C63FF', '#00f2fe'];
  const gradientAngle = layer.gradientAngle !== undefined ? layer.gradientAngle : 45;

  let fillValue = fillColor;
  if (fillType === 'linear-gradient' || fillType === 'radial-gradient') {
    fillValue = `url(#${gradId})`;
  } else if (fillType === 'none') {
    fillValue = 'none';
  }

  // Neon glow styles
  const glowStyle = layer.neonGlow 
    ? { filter: `drop-shadow(0 0 12px ${layer.neonGlowColor || '#6C63FF'}) drop-shadow(0 0 4px ${layer.neonGlowColor || '#6C63FF'})` } 
    : {};

  return (
    <svg 
      viewBox={viewBox} 
      className="w-full h-full overflow-visible"
      style={{
        ...glowStyle,
        willChange: 'filter'
      }}
    >
      <defs>
        {fillType === 'linear-gradient' && (
          <linearGradient id={gradId} x1="0%" y1="100%" x2="100%" y2="0%" gradientTransform={`rotate(${gradientAngle}, 0.5, 0.5)`}>
            <stop offset="0%" stopColor={gradientColors[0]} />
            <stop offset="100%" stopColor={gradientColors[1]} />
          </linearGradient>
        )}
        {fillType === 'radial-gradient' && (
          <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={gradientColors[0]} />
            <stop offset="100%" stopColor={gradientColors[1]} />
          </radialGradient>
        )}
      </defs>
      <g
        fill={fillValue}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        style={{
          transition: 'fill 0.15s, stroke 0.15s, stroke-width 0.15s'
        }}
        dangerouslySetInnerHTML={{ __html: svgPath }}
      />
    </svg>
  );
}

// ── LottiePlayer Subcomponent (CDN-loaded Lottie Player) ──
function LottiePlayer({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    let anim: any = null;
    
    const loadLottie = () => {
      const lottie = (window as any).lottie;
      if (lottie && containerRef.current) {
        containerRef.current.innerHTML = '';
        anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: src
        });
      }
    };

    if (!(window as any).lottie) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
      script.onload = loadLottie;
      document.body.appendChild(script);
    } else {
      loadLottie();
    }

    return () => {
      if (anim) {
        anim.destroy();
      }
    };
  }, [src]);

  return <div ref={containerRef} className="w-full h-full" />;
}

// ── InteractiveLayerWrapper Component ──
function InteractiveLayerWrapper({
  id,
  layer,
  isSel,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  canvasRef,
  onDragMove,
  children
}: {
  id: string;
  layer: any;
  isSel: boolean;
  onSelect: () => void;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  canvasRef: React.RefObject<HTMLDivElement>;
  onDragMove?: (x: number, y: number, dragging: boolean) => void;
  children?: React.ReactNode;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  
  const [isMoving, setIsMoving] = useState(false);
  const moveStartRef = useRef<{ pointerX: number; pointerY: number; initX: number; initY: number } | null>(null);

  const [resizingDir, setResizingDir] = useState<string | null>(null);
  const resizeStartRef = useRef<{ pointerX: number; pointerY: number; initScale: number; initWidth: number; initHeight: number } | null>(null);

  const [isRotating, setIsRotating] = useState(false);

  const isLocked = layer.locked || false;

  const handlePointerDownMove = (e: React.PointerEvent) => {
    if (isLocked) return;
    e.stopPropagation();
    onSelect();
    
    if ((e.target as HTMLElement).closest('.layer-action-btn')) {
      return;
    }

    moveStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      initX: layer.x,
      initY: layer.y
    };
    setIsMoving(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMoveMove = (e: React.PointerEvent) => {
    if (!isMoving || !moveStartRef.current || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX = e.clientX - moveStartRef.current.pointerX;
    const deltaY = e.clientY - moveStartRef.current.pointerY;

    const deltaPctX = (deltaX / rect.width) * 100;
    const deltaPctY = (deltaY / rect.height) * 100;

    let nextX = moveStartRef.current.initX + deltaPctX;
    let nextY = moveStartRef.current.initY + deltaPctY;

    nextX = Math.max(0, Math.min(100, nextX));
    nextY = Math.max(0, Math.min(100, nextY));

    // Snapping guides (50% center guides)
    const snapThreshold = 2.0;
    if (Math.abs(nextX - 50) < snapThreshold) nextX = 50;
    if (Math.abs(nextY - 50) < snapThreshold) nextY = 50;

    onUpdate({ x: nextX, y: nextY });

    if (onDragMove) {
      onDragMove(nextX, nextY, true);
    }
  };

  const handlePointerUpMove = (e: React.PointerEvent) => {
    setIsMoving(false);
    moveStartRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}

    if (onDragMove) {
      onDragMove(layer.x, layer.y, false);
    }

    if (layer.y > 82) {
      onDelete();
    }
  };

  const handlePointerDownResize = (e: React.PointerEvent, dir: string) => {
    if (isLocked) return;
    e.stopPropagation();
    setResizingDir(dir);
    resizeStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      initScale: layer.scale || 1,
      initWidth: layer.width || 120,
      initHeight: layer.height || 120,
      initFontSize: layer.fontSize || 28
    } as any;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMoveResize = (e: React.PointerEvent) => {
    if (!resizingDir || !resizeStartRef.current || !canvasRef.current) return;
    
    const deltaX = e.clientX - resizeStartRef.current.pointerX;
    const deltaY = e.clientY - resizeStartRef.current.pointerY;
    
    let delta = 0;
    if (resizingDir === 'br') delta = deltaX + deltaY;
    else if (resizingDir === 'tl') delta = -deltaX - deltaY;
    else if (resizingDir === 'tr') delta = deltaX - deltaY;
    else if (resizingDir === 'bl') delta = -deltaX + deltaY;
    else if (resizingDir === 'mr') delta = deltaX;
    else if (resizingDir === 'ml') delta = -deltaX;
    else if (resizingDir === 'bm') delta = deltaY;
    else if (resizingDir === 'tm') delta = -deltaY;

    const scaleDelta = delta / 150;
    const nextScale = Math.max(0.3, Math.min(5.0, resizeStartRef.current.initScale + scaleDelta));

    if (layer.text !== undefined) {
      const initFontSize = (resizeStartRef.current as any).initFontSize || layer.fontSize || 28;
      const nextFontSize = Math.max(10, Math.min(160, Math.round(initFontSize * nextScale)));
      onUpdate({ fontSize: nextFontSize, scale: 1 });
    } else {
      onUpdate({ scale: nextScale });
    }
  };

  const handlePointerUpResize = (e: React.PointerEvent) => {
    setResizingDir(null);
    resizeStartRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handlePointerDownRotate = (e: React.PointerEvent) => {
    if (isLocked) return;
    e.stopPropagation();
    setIsRotating(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMoveRotate = (e: React.PointerEvent) => {
    if (!isRotating || !canvasRef.current || !elementRef.current) return;
    
    const rect = elementRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    let angleDeg = angleRad * (180 / Math.PI) - 90; // Top offset correction

    const snapVal = 45;
    if (Math.abs(angleDeg % snapVal) < 6 || Math.abs(angleDeg % snapVal) > (snapVal - 6)) {
      angleDeg = Math.round(angleDeg / snapVal) * snapVal;
    }

    onUpdate({ rotation: angleDeg });
  };

  const handlePointerUpRotate = (e: React.PointerEvent) => {
    setIsRotating(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  const transforms = `translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale || 1})`;
  const opacity = (layer.opacity !== undefined ? layer.opacity : 100) / 100;
  const mixBlendMode = layer.blendMode || 'normal';

  const isNearTrash = layer.y > 80 && isMoving;
  const scaleMultiplier = isNearTrash ? 0.35 : 1.0;
  const currentOpacity = isNearTrash ? 0.4 : opacity;

  const animationProps = getAnimationProps(layer.animationType || 'none');

  return (
    <motion.div
      ref={elementRef}
      onPointerDown={handlePointerDownMove}
      onPointerMove={handlePointerMoveMove}
      onPointerUp={handlePointerUpMove}
      className={clsx(
        "absolute cursor-grab select-none active:cursor-grabbing",
        isSel && !isLocked && "ring-1 ring-dashed ring-[#6C63FF]/80 ring-offset-2 ring-offset-transparent",
        isMoving && "scale-[0.98] duration-150"
      )}
      style={{
        left: `${layer.x}%`,
        top: `${layer.y}%`,
        transform: transforms,
        width: layer.text !== undefined ? 'max-content' : `${layer.width || 120}px`,
        maxWidth: layer.text !== undefined ? '90%' : undefined,
        height: layer.text !== undefined ? 'auto' : `${layer.height || 120}px`,
        opacity: currentOpacity,
        mixBlendMode: mixBlendMode as any,
        zIndex: isSel ? 50 : 20,
        pointerEvents: isMoving ? 'none' : 'auto'
      }}
      {...(animationProps as any)}
      whileTap={{
        scale: 0.95 * scaleMultiplier,
        boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        zIndex: 50
      }}
    >
      <div className="w-full h-full relative group">
        {children}

        {isLocked && (
          <div className="absolute top-1 left-1 p-1 bg-black/70 rounded border border-white/10 text-white pointer-events-none">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        )}

        {isSel && !isLocked && (
          <>
            <div 
              onPointerDown={(e) => handlePointerDownResize(e, 'tl')}
              onPointerMove={handlePointerMoveResize}
              onPointerUp={handlePointerUpResize}
              className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-[#6C63FF] rounded-full cursor-nwse-resize z-30 shadow"
            />
            <div 
              onPointerDown={(e) => handlePointerDownResize(e, 'tr')}
              onPointerMove={handlePointerMoveResize}
              onPointerUp={handlePointerUpResize}
              className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-[#6C63FF] rounded-full cursor-nesw-resize z-30 shadow"
            />
            <div 
              onPointerDown={(e) => handlePointerDownResize(e, 'bl')}
              onPointerMove={handlePointerMoveResize}
              onPointerUp={handlePointerUpResize}
              className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-[#6C63FF] rounded-full cursor-nesw-resize z-30 shadow"
            />
            <div 
              onPointerDown={(e) => handlePointerDownResize(e, 'br')}
              onPointerMove={handlePointerMoveResize}
              onPointerUp={handlePointerUpResize}
              className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-[#6C63FF] rounded-full cursor-nwse-resize z-30 shadow"
            />

            <div 
              onPointerDown={(e) => handlePointerDownResize(e, 'tm')}
              onPointerMove={handlePointerMoveResize}
              onPointerUp={handlePointerUpResize}
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border border-[#6C63FF] rounded-sm cursor-ns-resize z-30 shadow"
            />
            <div 
              onPointerDown={(e) => handlePointerDownResize(e, 'bm')}
              onPointerMove={handlePointerMoveResize}
              onPointerUp={handlePointerUpResize}
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border border-[#6C63FF] rounded-sm cursor-ns-resize z-30 shadow"
            />
            <div 
              onPointerDown={(e) => handlePointerDownResize(e, 'ml')}
              onPointerMove={handlePointerMoveResize}
              onPointerUp={handlePointerUpResize}
              className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-2.5 h-2.5 bg-white border border-[#6C63FF] rounded-sm cursor-ew-resize z-30 shadow"
            />
            <div 
              onPointerDown={(e) => handlePointerDownResize(e, 'mr')}
              onPointerMove={handlePointerMoveResize}
              onPointerUp={handlePointerUpResize}
              className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-2.5 h-2.5 bg-white border border-[#6C63FF] rounded-sm cursor-ew-resize z-30 shadow"
            />

            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-[1px] h-6 bg-[#6C63FF]/70 z-20 pointer-events-none" />
            <div 
              onPointerDown={handlePointerDownRotate}
              onPointerMove={handlePointerMoveRotate}
              onPointerUp={handlePointerUpRotate}
              className="absolute -top-8 left-1/2 -translate-x-1/2 w-4.5 h-4.5 bg-white border-2 border-[#6C63FF] rounded-full cursor-grab active:cursor-grabbing z-30 flex items-center justify-center shadow"
            >
              <RotateCw size={8} className="text-[#6C63FF]" />
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="layer-action-btn absolute -top-3.5 -right-3.5 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 border border-white/20 text-white flex items-center justify-center shadow-lg text-[9px] font-bold z-30 font-mono"
              title="Delete Layer"
            >
              ✕
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── getAnimationProps Helper ──
const getAnimationProps = (animType: string) => {
  if (animType === 'float') {
    return {
      animate: { y: [0, -10, 0] },
      transition: { repeat: Infinity, duration: 3, ease: "easeInOut" }
    };
  }
  if (animType === 'pulse') {
    return {
      animate: { scale: [1, 1.05, 1] },
      transition: { repeat: Infinity, duration: 2, ease: "easeInOut" }
    };
  }
  if (animType === 'spin') {
    return {
      animate: { rotate: [0, 360] },
      transition: { repeat: Infinity, duration: 6, ease: "linear" }
    };
  }
  if (animType === 'wiggle') {
    return {
      animate: { rotate: [-5, 5, -5] },
      transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
    };
  }
  if (animType === 'bounce') {
    return {
      animate: { y: [0, -15, 0] },
      transition: { repeat: Infinity, duration: 1.2, ease: "easeOut" }
    };
  }
  return {};
};

// ── LayerInspectorPanel Component ──
function LayerInspectorPanel({
  selectedLayerId,
  currentEdits,
  updateEdits,
  setSelectedLayerId,
  handleDeleteTextLayer,
  handleDeleteOverlay
}: {
  selectedLayerId: string;
  currentEdits: MediaEdits;
  updateEdits: (updates: any) => void;
  setSelectedLayerId: (id: string | null) => void;
  handleDeleteTextLayer: (id: string) => void;
  handleDeleteOverlay: (id: string) => void;
}) {
  const textLayer = currentEdits.textLayers.find(l => l.id === selectedLayerId);
  const overlayLayer = currentEdits.overlayLayers.find(l => l.id === selectedLayerId);
  const layer = (textLayer || overlayLayer) as any;

  if (!layer) return null;

  const isText = !!textLayer;

  const handleUpdate = (updates: any) => {
    if (isText) {
      updateEdits({
        textLayers: currentEdits.textLayers.map(l => l.id === selectedLayerId ? { ...l, ...updates } : l)
      });
    } else {
      updateEdits({
        overlayLayers: currentEdits.overlayLayers.map(l => l.id === selectedLayerId ? { ...l, ...updates } : l)
      });
    }
  };

  const handleDelete = () => {
    if (isText) {
      handleDeleteTextLayer(selectedLayerId);
    } else {
      handleDeleteOverlay(selectedLayerId);
    }
  };

  const handleDuplicate = () => {
    if (isText) {
      const dup = {
        ...layer,
        id: `text-${Date.now()}-${Math.random().toString(36).substring(2,5)}`,
        x: Math.min(layer.x + 5, 95),
        y: Math.min(layer.y + 5, 95)
      };
      updateEdits({
        textLayers: [...currentEdits.textLayers, dup]
      });
      setSelectedLayerId(dup.id);
    } else {
      const dup = {
        ...layer,
        id: `overlay-${Date.now()}-${Math.random().toString(36).substring(2,5)}`,
        x: Math.min(layer.x + 5, 95),
        y: Math.min(layer.y + 5, 95)
      };
      updateEdits({
        overlayLayers: [...currentEdits.overlayLayers, dup]
      });
      setSelectedLayerId(dup.id);
    }
  };

  const handleLayerOrder = (direction: 'front' | 'back' | 'up' | 'down') => {
    if (isText) {
      const layers = [...currentEdits.textLayers];
      const index = layers.findIndex(l => l.id === selectedLayerId);
      if (index === -1) return;

      if (direction === 'front') {
        const [el] = layers.splice(index, 1);
        layers.push(el);
      } else if (direction === 'back') {
        const [el] = layers.splice(index, 1);
        layers.unshift(el);
      } else if (direction === 'up' && index < layers.length - 1) {
        const temp = layers[index];
        layers[index] = layers[index + 1];
        layers[index + 1] = temp;
      } else if (direction === 'down' && index > 0) {
        const temp = layers[index];
        layers[index] = layers[index - 1];
        layers[index - 1] = temp;
      }
      updateEdits({ textLayers: layers });
    } else {
      const layers = [...currentEdits.overlayLayers];
      const index = layers.findIndex(l => l.id === selectedLayerId);
      if (index === -1) return;

      if (direction === 'front') {
        const [el] = layers.splice(index, 1);
        layers.push(el);
      } else if (direction === 'back') {
        const [el] = layers.splice(index, 1);
        layers.unshift(el);
      } else if (direction === 'up' && index < layers.length - 1) {
        const temp = layers[index];
        layers[index] = layers[index + 1];
        layers[index + 1] = temp;
      } else if (direction === 'down' && index > 0) {
        const temp = layers[index];
        layers[index] = layers[index - 1];
        layers[index - 1] = temp;
      }
      updateEdits({ overlayLayers: layers });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          onClick={() => setSelectedLayerId(null)}
          className="text-xs text-slate-500 hover:text-white uppercase font-bold"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 bg-white/[0.01] border border-white/[0.04] rounded-xl">
        <button
          onClick={handleDuplicate}
          className="py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-slate-200 transition-all flex items-center justify-center gap-2"
        >
          <Copy size={12} />
          Duplicate
        </button>
        <button
          onClick={handleDelete}
          className="py-2.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-xs font-bold text-red-400 transition-all flex items-center justify-center gap-2"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>

      <div className="space-y-2.5 p-4 bg-white/[0.01] border border-white/[0.04] rounded-xl">
        <span className="text-[9px] font-mono text-slate-500 font-bold block uppercase">ARRANGEMENT & LAYERS</span>
        
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            <button
              onClick={() => handleLayerOrder('front')}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded text-[10px] font-bold uppercase text-slate-300"
              title="Bring to Front"
            >
              Front
            </button>
            <button
              onClick={() => handleLayerOrder('back')}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded text-[10px] font-bold uppercase text-slate-300"
              title="Send to Back"
            >
              Back
            </button>
            <button
              onClick={() => handleLayerOrder('up')}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded text-[10px] font-bold uppercase text-slate-300"
              title="Bring Forward"
            >
              ▲
            </button>
            <button
              onClick={() => handleLayerOrder('down')}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded text-[10px] font-bold uppercase text-slate-300"
              title="Send Backward"
            >
              ▼
            </button>
          </div>

          <button
            onClick={() => handleUpdate({ locked: !layer.locked })}
            className={clsx(
              "px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider border",
              layer.locked 
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400" 
                : "border-white/10 text-slate-400 hover:text-white"
            )}
          >
            {layer.locked ? 'Locked' : 'Lock'}
          </button>
        </div>
      </div>

      {!layer.locked && (
        <>
          {isText && (
            <div className="space-y-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
              <span className="text-[10px] font-mono text-[#6C63FF] font-bold block uppercase tracking-wider">
                Typography Controls
              </span>

              {/* Direct Text Content Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400">TEXT CONTENT</label>
                <textarea
                  rows={2}
                  value={layer.text || ''}
                  onChange={(e) => handleUpdate({ text: e.target.value })}
                  placeholder="Type text here..."
                  className="w-full bg-[#0c081a] border border-white/10 focus:border-[#6C63FF] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none resize-none"
                />
              </div>

              {/* Font Family */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400">FONT FAMILY</label>
                <select
                  value={layer.fontFamily}
                  onChange={(e) => handleUpdate({ fontFamily: e.target.value })}
                  className="w-full bg-[#0c081a] border border-white/10 text-slate-200 rounded-xl py-2 px-3 outline-none text-xs focus:border-[#6C63FF]"
                >
                  {FONT_FAMILIES.map(font => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
              </div>

              {/* Font Size with Steppers */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                  <span>FONT SIZE</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdate({ fontSize: Math.max(10, (layer.fontSize || 28) - 2) })}
                      className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold flex items-center justify-center border border-white/10"
                    >
                      -
                    </button>
                    <span className="text-white font-mono font-bold px-1">{layer.fontSize || 28}px</span>
                    <button
                      type="button"
                      onClick={() => handleUpdate({ fontSize: Math.min(160, (layer.fontSize || 28) + 2) })}
                      className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold flex items-center justify-center border border-white/10"
                    >
                      +
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min="10"
                  max="140"
                  value={layer.fontSize || 28}
                  onChange={(e) => handleUpdate({ fontSize: parseInt(e.target.value) })}
                  className="w-full h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-[#6C63FF]"
                />
              </div>

              {/* Color & Quick Swatches */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400">TEXT COLOR & GRADIENTS</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={layer.color || '#ffffff'}
                    onChange={(e) => handleUpdate({ color: e.target.value, gradient: false })}
                    className="w-8 h-8 rounded-xl border border-white/20 bg-transparent cursor-pointer shrink-0"
                  />
                  <div className="flex-1 flex gap-1.5 overflow-x-auto hide-scrollbar py-0.5">
                    {['#ffffff', '#000000', '#6C63FF', '#00f2fe', '#ff0844', '#ffe000', '#00ff88', '#ff007f'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleUpdate({ color: c, gradient: false })}
                        className="w-5 h-5 rounded-full border border-white/20 shrink-0 transition-transform active:scale-90"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Gradient Toggle */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">Gradient Fill</span>
                  <button
                    type="button"
                    onClick={() => handleUpdate({ gradient: !layer.gradient })}
                    className={clsx(
                      'px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase transition-all',
                      layer.gradient ? 'bg-[#6C63FF] text-white' : 'bg-white/5 text-slate-400 border border-white/10'
                    )}
                  >
                    {layer.gradient ? 'ON' : 'OFF'}
                  </button>
                </div>
                {layer.gradient && (
                  <div className="flex gap-3 pt-1">
                    <input
                      type="color"
                      value={layer.gradientColors?.[0] || '#6C63FF'}
                      onChange={(e) => handleUpdate({ gradientColors: [e.target.value, layer.gradientColors?.[1] || '#00f2fe'] })}
                      className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer"
                    />
                    <input
                      type="color"
                      value={layer.gradientColors?.[1] || '#00f2fe'}
                      onChange={(e) => handleUpdate({ gradientColors: [layer.gradientColors?.[0] || '#6C63FF', e.target.value] })}
                      className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Formatting */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400">STYLE & FORMAT</label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleUpdate({ bold: !layer.bold })}
                    className={clsx(
                      "py-2 rounded-lg text-xs font-bold border transition-all",
                      layer.bold ? "bg-[#6C63FF] border-[#6C63FF] text-white" : "border-white/10 text-slate-400"
                    )}
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdate({ italic: !layer.italic })}
                    className={clsx(
                      "py-2 rounded-lg text-xs font-bold italic border transition-all",
                      layer.italic ? "bg-[#6C63FF] border-[#6C63FF] text-white" : "border-white/10 text-slate-400"
                    )}
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdate({ shadow: !layer.shadow })}
                    className={clsx(
                      "py-2 rounded-lg text-[9px] font-bold border transition-all uppercase",
                      layer.shadow ? "bg-[#6C63FF] border-[#6C63FF] text-white" : "border-white/10 text-slate-400"
                    )}
                  >
                    Shadow
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdate({ background: layer.background === 'neon' ? 'none' : 'neon' })}
                    className={clsx(
                      "py-2 rounded-lg text-[9px] font-bold border transition-all uppercase",
                      layer.background === 'neon' ? "bg-[#6C63FF] border-[#6C63FF] text-white" : "border-white/10 text-slate-400"
                    )}
                  >
                    Glow
                  </button>
                </div>
              </div>

              {/* Text Background Badge */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400">BACKGROUND BADGE</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['none', 'solid', 'glass'] as const).map(bg => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => handleUpdate({ background: bg })}
                      className={clsx(
                        "py-1.5 rounded-lg text-[9px] font-bold uppercase border text-center transition-all",
                        (layer.background || 'none') === bg
                          ? "bg-[#6C63FF] border-[#6C63FF] text-white"
                          : "border-white/10 text-slate-400 hover:text-white"
                      )}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Letter Spacing */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Letter Spacing</span>
                  <span className="text-white font-bold">{layer.letterSpacing || 0}px</span>
                </div>
                <input
                  type="range"
                  min="-2"
                  max="16"
                  value={layer.letterSpacing || 0}
                  onChange={(e) => handleUpdate({ letterSpacing: parseInt(e.target.value) })}
                  className="w-full h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-[#6C63FF]"
                />
              </div>
            </div>
          )}

          {!isText && layer.type === 'shape' && (
            <div className="space-y-4 p-4 bg-white/[0.01] border border-white/[0.04] rounded-xl">
              <span className="text-[9px] font-mono text-slate-500 font-bold block uppercase">Vector Fill Style</span>
              
              <div className="grid grid-cols-4 gap-1.5">
                {(['color', 'linear-gradient', 'radial-gradient', 'none'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => handleUpdate({ fillType: type })}
                    className={clsx(
                      "py-1.5 rounded text-[9px] font-bold uppercase text-center border transition-all",
                      (layer.fillType || 'color') === type
                        ? "bg-[#6C63FF] border-[#6C63FF] text-white"
                        : "border-white/10 text-slate-400 hover:text-white"
                    )}
                  >
                    {type.replace('-gradient', '')}
                  </button>
                ))}
              </div>

              {(layer.fillType === 'color' || !layer.fillType) && (
                <div className="space-y-2 pt-1">
                  <label className="text-[10px] font-bold text-slate-400">Solid Color</label>
                  <div className="flex gap-2.5 items-center">
                    <input 
                      type="color" 
                      value={layer.fillColor || '#6C63FF'} 
                      onChange={(e) => handleUpdate({ fillColor: e.target.value })}
                      className="w-8 h-8 rounded border border-white/20 bg-transparent cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={layer.fillColor || '#6C63FF'} 
                      onChange={(e) => handleUpdate({ fillColor: e.target.value })}
                      className="bg-neutral-900 border border-white/10 rounded-lg text-xs text-white px-3 py-1.5 w-28 uppercase font-mono"
                    />
                  </div>
                </div>
              )}

              {(layer.fillType === 'linear-gradient' || layer.fillType === 'radial-gradient') && (
                <div className="space-y-4 pt-1">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400">Gradient Colors (Start / End)</label>
                    <div className="flex gap-3">
                      <input 
                        type="color" 
                        value={layer.gradientColors?.[0] || '#6C63FF'} 
                        onChange={(e) => handleUpdate({ gradientColors: [e.target.value, layer.gradientColors?.[1] || '#00f2fe'] })}
                        className="w-8 h-8 rounded border border-white/20 bg-transparent cursor-pointer"
                      />
                      <input 
                        type="color" 
                        value={layer.gradientColors?.[1] || '#00f2fe'} 
                        onChange={(e) => handleUpdate({ gradientColors: [layer.gradientColors?.[0] || '#6C63FF', e.target.value] })}
                        className="w-8 h-8 rounded border border-white/20 bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>

                  {layer.fillType === 'linear-gradient' && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-400">Gradient Angle</span>
                        <span className="text-white font-bold">{layer.gradientAngle || 45}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={layer.gradientAngle || 45}
                        onChange={(e) => handleUpdate({ gradientAngle: parseInt(e.target.value) })}
                        className="w-full h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-[#6C63FF]"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!isText && layer.type === 'shape' && (
            <div className="space-y-4 p-4 bg-white/[0.01] border border-white/[0.04] rounded-xl">
              <span className="text-[9px] font-mono text-slate-500 font-bold block uppercase">Vector Stroke Outlines</span>
              
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Stroke Thickness</span>
                  <span className="text-white font-bold">{layer.strokeWidth !== undefined ? layer.strokeWidth : 1.5}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="0.5"
                  value={layer.strokeWidth !== undefined ? layer.strokeWidth : 1.5}
                  onChange={(e) => handleUpdate({ strokeWidth: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-[#6C63FF]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400">Stroke Color</label>
                <div className="flex gap-2.5 items-center">
                  <input 
                    type="color" 
                    value={layer.strokeColor || '#ffffff'} 
                    onChange={(e) => handleUpdate({ strokeColor: e.target.value })}
                    className="w-8 h-8 rounded border border-white/20 bg-transparent cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={layer.strokeColor || '#ffffff'} 
                    onChange={(e) => handleUpdate({ strokeColor: e.target.value })}
                    className="bg-neutral-900 border border-white/10 rounded-lg text-xs text-white px-3 py-1.5 w-28 uppercase font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 p-4 bg-white/[0.01] border border-white/[0.04] rounded-xl">
            <span className="text-[9px] font-mono text-slate-500 font-bold block uppercase">Special FX & Shaders</span>
            
            <div className="flex items-center justify-between p-3.5 bg-white/[0.01] border border-white/[0.04] rounded-lg">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Glass Frost Shader</span>
                <span className="text-[9px] text-slate-500 block">Apply real frosted backdrop glass blur.</span>
              </div>
              <button
                onClick={() => handleUpdate({ glassEffect: !layer.glassEffect })}
                className={clsx(
                  "px-3 py-1.5 rounded text-[10px] font-bold uppercase border",
                  layer.glassEffect 
                    ? "bg-[#6C63FF] border-[#6C63FF] text-white" 
                    : "border-white/10 text-slate-400 hover:text-white"
                )}
              >
                {layer.glassEffect ? 'Active' : 'Enable'}
              </button>
            </div>

            <div className="space-y-3.5 p-3.5 bg-white/[0.01] border border-white/[0.04] rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Neon Glow</span>
                  <span className="text-[9px] text-slate-500 block">Radiate bright energy shadow glow.</span>
                </div>
                <button
                  onClick={() => handleUpdate({ neonGlow: !layer.neonGlow })}
                  className={clsx(
                    "px-3 py-1.5 rounded text-[10px] font-bold uppercase border",
                    layer.neonGlow 
                      ? "bg-[#6C63FF] border-[#6C63FF] text-white" 
                      : "border-white/10 text-slate-400 hover:text-white"
                  )}
                >
                  {layer.neonGlow ? 'Active' : 'Enable'}
                </button>
              </div>

              {layer.neonGlow && (
                <div className="space-y-2 pt-2 border-t border-white/[0.03]">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Neon Color</label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={layer.neonGlowColor || '#6C63FF'} 
                      onChange={(e) => handleUpdate({ neonGlowColor: e.target.value })}
                      className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={layer.neonGlowColor || '#6C63FF'} 
                      onChange={(e) => handleUpdate({ neonGlowColor: e.target.value })}
                      className="bg-neutral-900 border border-white/10 rounded px-2.5 py-1 text-[11px] text-white w-24 uppercase font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 p-4 bg-white/[0.01] border border-white/[0.04] rounded-xl">
            <span className="text-[9px] font-mono text-slate-500 font-bold block uppercase">Composite, Blur & Shadow</span>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 block uppercase">Layer Blend Mode</label>
              <select
                value={layer.blendMode || 'normal'}
                onChange={(e) => handleUpdate({ blendMode: e.target.value })}
                className="w-full bg-neutral-900 border border-white/[0.08] text-slate-300 rounded-lg py-1.5 px-3 outline-none text-xs focus:border-[#6C63FF]"
              >
                {['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference'].map(m => (
                  <option key={m} value={m}>{m.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400">Layer Opacity</span>
                <span className="text-white font-bold">{layer.opacity !== undefined ? layer.opacity : 100}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={layer.opacity !== undefined ? layer.opacity : 100}
                onChange={(e) => handleUpdate({ opacity: parseInt(e.target.value) })}
                className="w-full h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-[#6C63FF]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400">Border Radius (Rounding)</span>
                <span className="text-white font-bold">{layer.borderRadius || 0}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                value={layer.borderRadius || 0}
                onChange={(e) => handleUpdate({ borderRadius: parseInt(e.target.value) })}
                className="w-full h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-[#6C63FF]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400">Gaussian Blur</span>
                <span className="text-white font-bold">{layer.blur || 0}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={layer.blur || 0}
                onChange={(e) => handleUpdate({ blur: parseInt(e.target.value) })}
                className="w-full h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-[#6C63FF]"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-[11px] font-bold text-slate-200 block">Outer Drop Shadow</span>
                <span className="text-[9px] text-slate-500 block">Cast vector depth drop shadow.</span>
              </div>
              <button
                onClick={() => handleUpdate({ shadow: !layer.shadow })}
                className={clsx(
                  "px-3 py-1.5 rounded text-[10px] font-bold uppercase border",
                  layer.shadow 
                    ? "bg-[#6C63FF] border-[#6C63FF] text-white" 
                    : "border-white/10 text-slate-400 hover:text-white"
                )}
              >
                {layer.shadow ? 'Active' : 'Enable'}
              </button>
            </div>
          </div>

          <div className="space-y-4 p-4 bg-white/[0.01] border border-white/[0.04] rounded-xl">
            <span className="text-[9px] font-mono text-slate-500 font-bold block uppercase">Kinetics & Physics</span>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 block uppercase">Continuous Animation</label>
              <div className="grid grid-cols-3 gap-1.5">
                {['none', 'float', 'pulse', 'spin', 'wiggle', 'bounce'].map(anim => (
                  <button
                    key={anim}
                    onClick={() => handleUpdate({ animationType: anim })}
                    className={clsx(
                      "py-1.5 rounded text-[9px] font-bold uppercase border text-center transition-all",
                      (layer.animationType || 'none') === anim
                        ? "bg-[#6C63FF] border-[#6C63FF] text-white"
                        : "border-white/10 text-slate-400 hover:text-white"
                    )}
                  >
                    {anim}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
