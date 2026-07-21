'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Undo, Redo, MoreHorizontal, Image as ImageIcon, 
  Globe, Users, Lock as LockIcon, Check, Loader2, 
  Sparkles, Camera, Download, Plus, Trash2, Copy, Lock, Unlock,
  Grid, Eye, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Bold as BoldIcon, Italic as ItalicIcon, Underline as UnderlineIcon,
  ChevronDown, ArrowUp, ArrowDown, RotateCcw, Palette, Type, RefreshCw
} from 'lucide-react';
import { createStory } from '@/app/(main)/feed/story-actions';
import { uploadMedia } from '@/app/(main)/feed/upload';
import clsx from 'clsx';

interface StoryCreatorStudioProps {
  currentUserId?: string;
  currentUser: any;
  onClose: () => void;
  onSuccess: () => void;
}

// -------------------------------------------------------------
// Font Categories & 100+ Premium Google Fonts
// -------------------------------------------------------------
const FONT_CATEGORIES = {
  Modern: [
    'Inter', 'Roboto', 'Montserrat', 'Poppins', 'Outfit', 'Sora', 'Syne', 
    'Plus Jakarta Sans', 'Lexend', 'DM Sans', 'Urbanist', 'Space Grotesk', 
    'Readex Pro', 'Manrope', 'Host Grotesk', 'Albert Sans', 'Figtree', 
    'Spline Sans', 'Schibsted Grotesk', 'Instrument Sans', 'Bricolage Grotesque', 'Jost'
  ],
  Classic: [
    'Playfair Display', 'Merriweather', 'Prata', 'Lora', 'Cinzel', 
    'Cormorant Garamond', 'EB Garamond', 'Bodoni Moda', 'PT Serif', 'Crimson Pro', 
    'Noto Serif', 'Libre Baskerville', 'Cardo', 'Domine', 'Castoro', 'Unna'
  ],
  Minimal: [
    'Inter', 'DM Sans', 'Lexend', 'Manrope', 'Albert Sans', 'Public Sans', 
    'Figtree', 'Plus Jakarta Sans', 'Work Sans', 'Epilogue', 'Hanken Grotesk', 
    'Commissioner', 'Jost', 'Onest', 'Outfit'
  ],
  Poster: [
    'Anton', 'Bebas Neue', 'Lilita One', 'Bungee', 'Alfa Slab One', 'Black Ops One', 
    'Rammetto One', 'Archivo Black', 'Titan One', 'Shrikhand', 'Bowlby One SC', 
    'Righteous', 'Passion One', 'Rowdy', 'Payne', 'Sigmar'
  ],
  Bubble: [
    'Fredoka', 'Sniglet', 'Baloo 2', 'Comfortaa', 'Modak', 'Chewy', 'Jua', 
    'Patrick Hand', 'Mali', 'Quicksand', 'Dosis', 'Concert One', 'Spicy Rice', 
    'Luckiest Guy', 'Carter One'
  ],
  Typewriter: [
    'Courier Prime', 'Special Elite', 'Cutive Mono', 'Share Tech Mono', 'Space Mono', 
    'Major Mono Display', 'Anonymous Pro', 'VT323', 'Source Code Pro', 'IBM Plex Mono', 
    'JetBrains Mono', 'Fira Code', 'Inconsolata'
  ],
  Signature: [
    'Great Vibes', 'Alex Brush', 'Sacramento', 'Allura', 'Monsieur La Doulaise', 
    'Pinyon Script', 'Parisienne', 'Mr De Haviland', 'Petit Formal Script', 
    'Rochester', 'Herr Von Muellerhoff', 'Arizonia', 'Tangerine', 'Clicker Script', 
    'Whisper', 'Meow Script', 'Birthstone', 'Allison', 'WindSong', 'Yesteryear'
  ],
  Elegant: [
    'Cormorant', 'Cinzel Decorative', 'Marcellus', 'Bodoni Moda', 'Cardo', 
    'Montserrat Alternates', 'Oranienbaum', 'Italiana', 'Tenor Sans', 'Syncopate', 
    'Playfair Display', 'Cinzel', 'Prata'
  ],
  Strong: [
    'Montserrat', 'Anton', 'Bebas Neue', 'Archivo Black', 'Titan One', 'Oswald', 
    'Rubik Mono One', 'Russo One', 'Lilita One', 'Rowdy', 'Kanit', 'Syncopate', 
    'Bungee', 'Black Ops One', 'Payne', 'Sigmar'
  ]
};

const SOLID_COLORS = [
  '#09090b', '#1e1b4b', '#172554', '#022c22', '#311042', 
  '#4c0519', '#701a75', '#1e3a8a', '#115e59', '#3f2b96'
];

const GRADIENTS = [
  'linear-gradient(to bottom right, #0f172a, #1e1b4b)',
  'linear-gradient(to bottom right, #311042, #701a75)',
  'linear-gradient(to bottom right, #172554, #1e3a8a)',
  'linear-gradient(to bottom right, #022c22, #115e59)',
  'linear-gradient(to bottom right, #4c0519, #881337)',
  'linear-gradient(to bottom right, #09090b, #27272a)'
];

const PRESET_TEXT_COLORS = [
  '#ffffff', '#000000', '#ff2a5f', '#7f00ff', '#00f2fe', '#f5af19', '#38ef7d', '#ff007f', '#a855f7', '#6366f1'
];

const PRESET_TEXT_GRADIENTS = [
  'linear-gradient(45deg, #ff007f, #7f00ff)',
  'linear-gradient(45deg, #00f2fe, #4facfe)',
  'linear-gradient(45deg, #ff0844, #ffb199)',
  'linear-gradient(45deg, #f12711, #f5af19)',
  'linear-gradient(45deg, #b20a2c, #fffbd5)',
  'linear-gradient(45deg, #00dbde, #fc00ff)',
  'linear-gradient(45deg, #11998e, #38ef7d)',
  'linear-gradient(45deg, #ff9a9e, #fecfef)'
];

// Helper to inject font dynamically
const loadGoogleFont = (fontFamily: string) => {
  if (typeof window === 'undefined') return;
  const id = `google-font-${fontFamily.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap`;
  document.head.appendChild(link);
};

interface TextLayer {
  id: string;
  text: string;
  x: number; // percentage from left
  y: number; // percentage from top
  scale: number;
  rotation: number;
  opacity: number;
  fontFamily: string;
  fontCategory: keyof typeof FONT_CATEGORIES;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right' | 'justify';
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textTransform: 'none' | 'uppercase' | 'lowercase';
  letterSpacing: number; // px
  lineHeight: number;
  
  // Effects
  effectType: 'none' | 'gradient' | 'glow' | 'shadow' | 'outline';
  effectColor: string;
  effectValue: string; // custom gradient/shadow blur
  
  // Background
  backgroundType: 'none' | 'glass' | 'blur' | 'rounded' | 'color';
  backgroundColor: string;
  backgroundBlur: number;
  backgroundPadding: number;
  borderRadius: number;
  
  // Animation
  animationType: 'none' | 'typing' | 'fade' | 'slide' | 'bounce' | 'scale' | 'flicker' | 'glitch';
  isLocked: boolean;
}

export default function StoryCreatorStudio({ currentUserId, currentUser, onClose, onSuccess }: StoryCreatorStudioProps) {
  // Base background configuration
  const [backgroundType, setBackgroundType] = useState<'color' | 'gradient' | 'image' | 'video' | 'camera'>('gradient');
  const [backgroundValue, setBackgroundValue] = useState(GRADIENTS[0]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'close_friends'>('public');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Text layer management
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'font' | 'style' | 'effects' | 'background' | 'motion' | 'layers'>('font');
  const [fontSearch, setFontSearch] = useState('');
  const [selectedFontCategory, setSelectedFontCategory] = useState<keyof typeof FONT_CATEGORIES>('Modern');
  
  // Interaction states
  const [showGrid, setShowGrid] = useState(false);
  const [gridSnap, setGridSnap] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [activeGuides, setActiveGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; layerId: string } | null>(null);

  // Undo/Redo history
  const [history, setHistory] = useState<TextLayer[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Watch layers changes to update history
  const recordHistory = (newLayers: TextLayer[]) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(JSON.parse(JSON.stringify(newLayers)));
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setTextLayers(JSON.parse(JSON.stringify(history[prevIndex])));
      setSelectedLayerId(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setTextLayers(JSON.parse(JSON.stringify(history[nextIndex])));
      setSelectedLayerId(null);
    }
  };

  // Add a new text layer
  const handleAddTextLayer = () => {
    const newLayer: TextLayer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: 'New Text',
      x: 50,
      y: 40 + textLayers.length * 5,
      scale: 1.0,
      rotation: 0,
      opacity: 1.0,
      fontFamily: 'Inter',
      fontCategory: 'Modern',
      fontSize: 28,
      color: '#ffffff',
      align: 'center',
      fontWeight: 'bold',
      fontStyle: 'normal',
      textDecoration: 'none',
      textTransform: 'none',
      letterSpacing: 0,
      lineHeight: 1.2,
      effectType: 'none',
      effectColor: '#000000',
      effectValue: '2px',
      backgroundType: 'none',
      backgroundColor: 'rgba(0,0,0,0.6)',
      backgroundBlur: 10,
      backgroundPadding: 12,
      borderRadius: 12,
      animationType: 'none',
      isLocked: false
    };

    const newLayers = [...textLayers, newLayer];
    setTextLayers(newLayers);
    setSelectedLayerId(newLayer.id);
    recordHistory(newLayers);
    loadGoogleFont(newLayer.fontFamily);
  };

  // Duplicate layer
  const handleDuplicateLayer = (layerId: string) => {
    const layer = textLayers.find(l => l.id === layerId);
    if (!layer) return;
    const duplicated: TextLayer = {
      ...JSON.parse(JSON.stringify(layer)),
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: Math.min(90, layer.x + 5),
      y: Math.min(90, layer.y + 5),
    };
    const newLayers = [...textLayers, duplicated];
    setTextLayers(newLayers);
    setSelectedLayerId(duplicated.id);
    recordHistory(newLayers);
    setContextMenu(null);
  };

  // Delete layer
  const handleDeleteLayer = (layerId: string) => {
    const newLayers = textLayers.filter(l => l.id !== layerId);
    setTextLayers(newLayers);
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
      setIsEditingText(false);
    }
    recordHistory(newLayers);
    setContextMenu(null);
  };

  // Lock/Unlock layer
  const handleToggleLock = (layerId: string) => {
    const newLayers = textLayers.map(l => l.id === layerId ? { ...l, isLocked: !l.isLocked } : l);
    setTextLayers(newLayers);
    recordHistory(newLayers);
    setContextMenu(null);
  };

  // Move layer depth
  const handleMoveDepth = (layerId: string, direction: 'front' | 'back' | 'up' | 'down') => {
    const index = textLayers.findIndex(l => l.id === layerId);
    if (index === -1) return;
    const newLayers = [...textLayers];
    const [layer] = newLayers.splice(index, 1);
    
    if (direction === 'front') {
      newLayers.push(layer);
    } else if (direction === 'back') {
      newLayers.unshift(layer);
    } else if (direction === 'up') {
      const newIndex = Math.min(newLayers.length, index + 1);
      newLayers.splice(newIndex, 0, layer);
    } else if (direction === 'down') {
      const newIndex = Math.max(0, index - 1);
      newLayers.splice(newIndex, 0, layer);
    }
    
    setTextLayers(newLayers);
    recordHistory(newLayers);
    setContextMenu(null);
  };

  // Update specific layer property
  const handleUpdateLayer = (layerId: string, updatedFields: Partial<TextLayer>) => {
    const updated = textLayers.map(l => l.id === layerId ? { ...l, ...updatedFields } : l);
    setTextLayers(updated);
  };

  const handleUpdateLayerComplete = () => {
    recordHistory(textLayers);
  };

  // Dynamic font injections
  useEffect(() => {
    textLayers.forEach(l => {
      loadGoogleFont(l.fontFamily);
    });
  }, [textLayers]);

  // Click out to close context menu or deselect
  useEffect(() => {
    const handleClickOut = (e: MouseEvent) => {
      if (contextMenu) setContextMenu(null);
    };
    window.addEventListener('click', handleClickOut);
    return () => window.removeEventListener('click', handleClickOut);
  }, [contextMenu]);

  // Drag and drop background triggers
  const handleMediaSelect = (file: File) => {
    const isVideo = file.type.startsWith('video/');
    setMediaFile(file);
    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    setBackgroundType(isVideo ? 'video' : 'image');
  };

  // Keyboard paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
          const file = item.getAsFile();
          if (file) handleMediaSelect(file);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleToggleCamera = async () => {
    if (backgroundType === 'camera') {
      setBackgroundType('gradient');
      setBackgroundValue(GRADIENTS[0]);
      if (videoPreviewRef.current && videoPreviewRef.current.srcObject) {
        const stream = videoPreviewRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      return;
    }

    try {
      setBackgroundType('camera');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('Camera permission denied or camera not available.');
      setBackgroundType('gradient');
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (videoPreviewRef.current && videoPreviewRef.current.srcObject) {
        const stream = videoPreviewRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Live typing animation effect loop
  function TypingTextEffect({ layer }: { layer: TextLayer }) {
    const [displayed, setDisplayed] = useState('');
    useEffect(() => {
      if (layer.animationType !== 'typing') return;
      let idx = 0;
      setDisplayed('');
      const interval = setInterval(() => {
        setDisplayed((prev) => prev + layer.text.charAt(idx));
        idx++;
        if (idx >= layer.text.length) {
          setTimeout(() => {
            setDisplayed('');
            idx = 0;
          }, 2000);
        }
      }, 120);
      return () => clearInterval(interval);
    }, [layer.text, layer.animationType]);

    return (
      <span>
        {displayed}
        <span className="border-r-2 border-white ml-0.5 animate-pulse" />
      </span>
    );
  }

  // Generate compiled 1080x1920 preview for publishing
  const compileStoryCanvas = async (): Promise<Blob | null> => {
    return new Promise(async (resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      // 1. Render backdrop background
      if (backgroundType === 'color') {
        ctx.fillStyle = backgroundValue;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (backgroundType === 'gradient') {
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        const matches = backgroundValue.match(/#[0-9a-fA-F]{6}/g);
        if (matches && matches.length >= 2) {
          grad.addColorStop(0, matches[0]);
          grad.addColorStop(1, matches[1]);
        } else {
          grad.addColorStop(0, '#0f172a');
          grad.addColorStop(1, '#1e1b4b');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if ((backgroundType === 'image' || backgroundType === 'video' || backgroundType === 'camera') && mediaUrl) {
        let mediaElement: HTMLImageElement | HTMLVideoElement | null = null;
        if (backgroundType === 'image') {
          mediaElement = new Image();
          mediaElement.src = mediaUrl;
          await new Promise((r) => { mediaElement!.onload = r; mediaElement!.onerror = r; });
        } else {
          mediaElement = videoPreviewRef.current;
        }

        if (mediaElement) {
          const cw = canvas.width;
          const ch = canvas.height;
          let mw = 0;
          let mh = 0;
          if (mediaElement instanceof HTMLImageElement) {
            mw = mediaElement.naturalWidth;
            mh = mediaElement.naturalHeight;
          } else if (mediaElement instanceof HTMLVideoElement) {
            mw = mediaElement.videoWidth;
            mh = mediaElement.videoHeight;
          }

          if (mw && mh) {
            const ratio = Math.max(cw / mw, ch / mh);
            const x = (cw - mw * ratio) / 2;
            const y = (ch - mh * ratio) / 2;
            ctx.drawImage(mediaElement, x, y, mw * ratio, mh * ratio);
          } else {
            ctx.drawImage(mediaElement, 0, 0, cw, ch);
          }
        }
      } else {
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 2. Draw Text layers
      for (const layer of textLayers) {
        ctx.save();

        const px = (layer.x / 100) * canvas.width;
        const py = (layer.y / 100) * canvas.height;

        ctx.translate(px, py);
        ctx.rotate((layer.rotation * Math.PI) / 180);

        const editorFrame = document.getElementById('editor-canvas-frame');
        const editorHeight = editorFrame ? editorFrame.clientHeight : 720;
        const scaleFactor = 1920 / editorHeight;
        const finalFontSize = layer.fontSize * scaleFactor * layer.scale;

        ctx.globalAlpha = layer.opacity;

        const italic = layer.fontStyle === 'italic' ? 'italic ' : '';
        const bold = layer.fontWeight === 'bold' ? 'bold ' : '';
        ctx.font = `${italic}${bold}${finalFontSize}px "${layer.fontFamily}", sans-serif`;
        ctx.textAlign = layer.align === 'justify' ? 'center' : layer.align as CanvasTextAlign;
        ctx.textBaseline = 'middle';

        let textVal = layer.text;
        if (layer.textTransform === 'uppercase') textVal = textVal.toUpperCase();
        if (layer.textTransform === 'lowercase') textVal = textVal.toLowerCase();
        
        const lines = textVal.split('\n');
        const lineHeightPx = finalFontSize * layer.lineHeight;

        let maxLineWidth = 0;
        lines.forEach(line => {
          const w = ctx.measureText(line).width;
          if (w > maxLineWidth) maxLineWidth = w;
        });
        const totalHeight = lines.length * lineHeightPx;
        const pad = layer.backgroundPadding * scaleFactor;
        const boxWidth = maxLineWidth + pad * 2;
        const boxHeight = totalHeight + pad * 2;
        const radius = layer.borderRadius * scaleFactor;

        // Background render
        if (layer.backgroundType !== 'none') {
          ctx.save();
          if (layer.backgroundType === 'glass') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 2;
          } else if (layer.backgroundType === 'blur') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;
          } else {
            ctx.fillStyle = layer.backgroundColor;
          }

          const bx = -boxWidth / 2;
          const by = -boxHeight / 2;
          ctx.beginPath();
          ctx.moveTo(bx + radius, by);
          ctx.lineTo(bx + boxWidth - radius, by);
          ctx.quadraticCurveTo(bx + boxWidth, by, bx + boxWidth, by + radius);
          ctx.lineTo(bx + boxWidth, by + boxHeight - radius);
          ctx.quadraticCurveTo(bx + boxWidth, by + boxHeight, bx + boxWidth - radius, by + boxHeight);
          ctx.lineTo(bx + radius, by + boxHeight);
          ctx.quadraticCurveTo(bx, by + boxHeight, bx, by + boxHeight - radius);
          ctx.lineTo(bx, by + radius);
          ctx.quadraticCurveTo(bx, by, bx + radius, by);
          ctx.closePath();
          ctx.fill();

          if (layer.backgroundType === 'glass' || layer.backgroundType === 'blur') {
            ctx.stroke();
          }
          ctx.restore();
        }

        // Draw shadow/glow effects
        if (layer.effectType === 'shadow' && layer.effectColor) {
          ctx.shadowColor = layer.effectColor;
          ctx.shadowBlur = 4 * scaleFactor;
          ctx.shadowOffsetX = 3 * scaleFactor;
          ctx.shadowOffsetY = 3 * scaleFactor;
        } else if (layer.effectType === 'glow' && layer.effectColor) {
          ctx.shadowColor = layer.effectColor;
          ctx.shadowBlur = 10 * scaleFactor;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }

        // Text fill gradient or solid
        if (layer.effectType === 'gradient' && layer.effectValue) {
          const textGrad = ctx.createLinearGradient(-maxLineWidth / 2, 0, maxLineWidth / 2, 0);
          const matches = layer.effectValue.match(/#[0-9a-fA-F]{6}/g);
          if (matches && matches.length >= 2) {
            textGrad.addColorStop(0, matches[0]);
            textGrad.addColorStop(1, matches[1]);
          } else {
            textGrad.addColorStop(0, '#ffffff');
            textGrad.addColorStop(1, '#cccccc');
          }
          ctx.fillStyle = textGrad;
        } else {
          ctx.fillStyle = layer.color;
        }

        // Output text
        lines.forEach((line, index) => {
          const ly = -totalHeight / 2 + index * lineHeightPx + lineHeightPx / 2;
          
          if (layer.effectType === 'outline' && layer.effectColor) {
            ctx.strokeStyle = layer.effectColor;
            ctx.lineWidth = 2 * scaleFactor;
            ctx.strokeText(line, 0, ly);
          }
          
          ctx.fillText(line, 0, ly);
        });

        ctx.restore();
      }

      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.9);
    });
  };

  const handlePublish = async () => {
    if (publishing || !currentUserId) return;
    setPublishing(true);

    try {
      let finalFile: File | null = null;
      const compiledBlob = await compileStoryCanvas();
      if (compiledBlob) {
        finalFile = new File([compiledBlob], 'story_composed.jpg', { type: 'image/jpeg' });
      }

      if (!finalFile) {
        throw new Error('Canvas compilation failed.');
      }

      const fd = new FormData();
      fd.append('file', finalFile);
      fd.append('folder', 'stories');
      const uploadResult = await uploadMedia(fd);
      if ('url' in uploadResult) {
        const res = await createStory(currentUserId, uploadResult.url, 'image');
        if (res.success) {
          onSuccess();
        } else {
          alert(`Publishing failed: ${res.error}`);
        }
      } else {
        alert('Media upload failed');
      }
    } catch (err: any) {
      alert(`Story creation error: ${err.message || err}`);
    } finally {
      setPublishing(false);
    }
  };

  // Build filtered Google Font search list
  const filteredFonts = useMemo(() => {
    const categoryFonts = FONT_CATEGORIES[selectedFontCategory] || [];
    if (!fontSearch) return categoryFonts;
    return categoryFonts.filter(f => f.toLowerCase().includes(fontSearch.toLowerCase()));
  }, [selectedFontCategory, fontSearch]);

  return (
    <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center font-sans select-none overflow-hidden animate-fade-in pointer-events-auto">
      {/* Dynamic Keyframe style sheet */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes flicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
            text-shadow: 0 0 4px #fff, 0 0 10px currentColor, 0 0 20px currentColor;
            opacity: 1;
          }
          20%, 24%, 55% {
            text-shadow: none;
            opacity: 0.7;
          }
        }
        @keyframes glitch {
          0% {
            text-shadow: 1.5px 1.5px 0px #ff00c1, -1.5px -1.5px 0px #00fff0;
            transform: translate(0);
          }
          20% {
            text-shadow: -2px 1.5px 0px #ff00c1, 2px -1.5px 0px #00fff0;
            transform: translate(-1px, 1px);
          }
          40% {
            text-shadow: 1.5px -2px 0px #ff00c1, -1.5px 2px 0px #00fff0;
            transform: translate(1px, -1.5px);
          }
          60% {
            text-shadow: 2px 2px 0px #ff00c1, -2px -2px 0px #00fff0;
            transform: translate(-1.5px, -1.5px);
          }
          80% {
            text-shadow: -1.5px -1.5px 0px #ff00c1, 1.5px 1.5px 0px #00fff0;
            transform: translate(1.5px, 1.5px);
          }
          100% {
            text-shadow: 1.5px 1.5px 0px #ff00c1, -1.5px -1.5px 0px #00fff0;
            transform: translate(0);
          }
        }
      `}} />

      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*,video/*" 
        className="hidden" 
        onChange={e => e.target.files && handleMediaSelect(e.target.files[0])} 
      />

      <div className="relative w-full max-w-[480px] h-full sm:max-h-[92vh] bg-[#0c0c0f] flex flex-col sm:rounded-[36px] overflow-hidden border border-white/[0.06] transition-all duration-300 shadow-[0_0_80px_rgba(0,0,0,0.8)]">
        
        {/* Top navbar controls */}
        <div className="absolute top-0 left-0 right-0 p-6 z-[60] flex items-center justify-between bg-gradient-to-b from-black/85 to-transparent">
          <button 
            type="button" 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95"
          >
            <X size={18} />
          </button>

          {/* Undo/Redo */}
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/[0.06]">
            <button 
              type="button"
              disabled={historyIndex === 0}
              onClick={handleUndo}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-20 transition-all"
              title="Undo"
            >
              <Undo size={14} />
            </button>
            <button 
              type="button"
              disabled={historyIndex === history.length - 1}
              onClick={handleRedo}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-20 transition-all"
              title="Redo"
            >
              <Redo size={14} />
            </button>
            
            <div className="w-[1px] h-4 bg-white/10 mx-1.5" />
            
            {/* Grid display toggle */}
            <button 
              type="button"
              onClick={() => { setShowGrid(!showGrid); setGridSnap(!gridSnap); }}
              className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                showGrid ? "text-violet-400 bg-white/5" : "text-slate-500 hover:text-slate-200"
              )}
              title="Toggle Grid Alignment"
            >
              <Grid size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[9px] font-black uppercase tracking-wider text-slate-200 transition-all"
            >
              Import
            </button>
            <button 
              type="button" 
              onClick={() => setSelectedLayerId(null)}
              className={clsx(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                selectedLayerId ? "bg-white/10 text-white" : "bg-white/5 text-slate-300 hover:text-white"
              )}
              title="Canvas Focus"
            >
              <Eye size={18} />
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div 
          onClick={() => { setSelectedLayerId(null); setIsEditingText(false); }}
          className="flex-1 relative overflow-hidden bg-[#050507] flex items-center justify-center p-6 border-b border-white/[0.04]"
        >
          <div 
            ref={canvasRef}
            id="editor-canvas-frame"
            className="relative aspect-[9/16] h-full max-h-full max-w-full bg-[#09090b] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] border border-white/[0.06] transition-all rounded-[16px]"
          >
            {/* Render Backdrop background */}
            {backgroundType === 'color' && (
              <div className="absolute inset-0 transition-all duration-300" style={{ backgroundColor: backgroundValue }} />
            )}
            {backgroundType === 'gradient' && (
              <div className="absolute inset-0 transition-all duration-300" style={{ background: backgroundValue }} />
            )}
            {backgroundType === 'camera' && (
              <div className="absolute inset-0 bg-black">
                <video ref={videoPreviewRef} className="w-full h-full object-cover scale-x-[-1]" autoPlay playsInline muted />
              </div>
            )}
            {backgroundType === 'image' && mediaUrl && (
              <div className="absolute inset-0 flex items-center justify-center">
                <img src={mediaUrl} className="w-full h-full object-cover" alt="story media" />
              </div>
            )}
            {backgroundType === 'video' && mediaUrl && (
              <div className="absolute inset-0 flex items-center justify-center">
                <video src={mediaUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
              </div>
            )}

            {/* Scanlines visual overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/25 pointer-events-none z-10" />

            {/* Grid alignment mesh */}
            {showGrid && (
              <div className="absolute inset-0 grid grid-cols-10 grid-rows-[repeat(16,minmax(0,1fr))] pointer-events-none opacity-20 z-20 border-r border-b border-white/5">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={`col-${i}`} className="border-l border-white/10 h-full" style={{ gridColumnStart: i + 2 }} />
                ))}
                {Array.from({ length: 15 }).map((_, i) => (
                  <div key={`row-${i}`} className="border-t border-white/10 w-full" style={{ gridRowStart: i + 2 }} />
                ))}
              </div>
            )}

            {/* Drag alignment Snap Guides */}
            {activeGuides.x !== null && (
              <div 
                className="absolute top-0 bottom-0 border-l border-dashed border-violet-500 z-40 pointer-events-none opacity-80"
                style={{ left: `${activeGuides.x}%` }}
              />
            )}
            {activeGuides.y !== null && (
              <div 
                className="absolute left-0 right-0 border-t border-dashed border-violet-500 z-40 pointer-events-none opacity-80"
                style={{ top: `${activeGuides.y}%` }}
              />
            )}

            {/* Text Layer Node Elements */}
            {textLayers.map((layer) => {
              const isSelected = selectedLayerId === layer.id;
              
              // Custom CSS styling parameters mapped to React structure
              const getLayerStyle = (l: TextLayer): React.CSSProperties => {
                const styles: React.CSSProperties = {
                  fontFamily: `"${l.fontFamily}", sans-serif`,
                  fontSize: `${l.fontSize}px`,
                  textAlign: l.align,
                  fontWeight: l.fontWeight,
                  fontStyle: l.fontStyle,
                  textDecoration: l.textDecoration,
                  textTransform: l.textTransform,
                  letterSpacing: `${l.letterSpacing}px`,
                  lineHeight: l.lineHeight,
                  opacity: l.opacity,
                };

                // Text Color/Gradient
                if (l.effectType === 'gradient' && l.effectValue) {
                  styles.backgroundImage = l.effectValue;
                  styles.WebkitBackgroundClip = 'text';
                  styles.WebkitTextFillColor = 'transparent';
                  styles.color = 'transparent';
                } else {
                  styles.color = l.color;
                  styles.backgroundImage = 'none';
                  styles.WebkitBackgroundClip = 'initial';
                  styles.WebkitTextFillColor = 'initial';
                }

                // Text styling effects
                if (l.effectType === 'glow' && l.effectColor) {
                  styles.textShadow = `0 0 6px ${l.effectColor}, 0 0 15px ${l.effectColor}`;
                } else if (l.effectType === 'shadow' && l.effectColor) {
                  styles.textShadow = `2px 2px 4px ${l.effectColor}`;
                } else if (l.effectType === 'outline' && l.effectColor) {
                  styles.WebkitTextStroke = `${l.effectValue || '1.5px'} ${l.effectColor}`;
                } else {
                  styles.textShadow = 'none';
                  styles.WebkitTextStroke = 'initial';
                }

                // Background modifiers
                styles.padding = `${l.backgroundPadding}px`;
                styles.borderRadius = `${l.borderRadius}px`;

                if (l.backgroundType === 'glass') {
                  styles.backdropFilter = `blur(${l.backgroundBlur}px)`;
                  styles.WebkitBackdropFilter = `blur(${l.backgroundBlur}px)`;
                  styles.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                  styles.border = '1px solid rgba(255, 255, 255, 0.2)';
                } else if (l.backgroundType === 'blur') {
                  styles.backdropFilter = `blur(${l.backgroundBlur}px)`;
                  styles.WebkitBackdropFilter = `blur(${l.backgroundBlur}px)`;
                  styles.backgroundColor = 'rgba(0, 0, 0, 0.45)';
                  styles.border = '1px solid rgba(255, 255, 255, 0.05)';
                } else if (l.backgroundType === 'rounded' || l.backgroundType === 'color') {
                  styles.backgroundColor = l.backgroundColor;
                  styles.backdropFilter = 'none';
                  styles.WebkitBackdropFilter = 'none';
                  styles.border = 'none';
                } else {
                  styles.backgroundColor = 'transparent';
                  styles.backdropFilter = 'none';
                  styles.WebkitBackdropFilter = 'none';
                  styles.border = 'none';
                }

                return styles;
              };

              // Drag implementation
              const onDragStart = (e: React.PointerEvent) => {
                if (layer.isLocked) return;
                if (isEditingText && isSelected) return;
                e.preventDefault();
                e.stopPropagation();
                setSelectedLayerId(layer.id);

                const el = e.currentTarget as HTMLElement;
                el.setPointerCapture(e.pointerId);

                const rect = canvasRef.current!.getBoundingClientRect();
                const initX = layer.x;
                const initY = layer.y;
                const startCX = e.clientX;
                const startCY = e.clientY;

                const onPointerMove = (moveEv: PointerEvent) => {
                  const dx = moveEv.clientX - startCX;
                  const dy = moveEv.clientY - startCY;

                  let nX = initX + (dx / rect.width) * 100;
                  let nY = initY + (dy / rect.height) * 100;

                  // Snap to grid
                  if (gridSnap) {
                    nX = Math.round(nX / 5) * 5;
                    nY = Math.round(nY / 5) * 5;
                  }

                  // Snap coordinates
                  let guideX: number | null = null;
                  let guideY: number | null = null;
                  const snapRange = 2.0;

                  if (Math.abs(nX - 50) < snapRange) {
                    nX = 50;
                    guideX = 50;
                  }
                  if (Math.abs(nY - 50) < snapRange) {
                    nY = 50;
                    guideY = 50;
                  }

                  textLayers.forEach(other => {
                    if (other.id === layer.id) return;
                    if (Math.abs(nX - other.x) < snapRange) {
                      nX = other.x;
                      guideX = other.x;
                    }
                    if (Math.abs(nY - other.y) < snapRange) {
                      nY = other.y;
                      guideY = other.y;
                    }
                  });

                  setActiveGuides({ x: guideX, y: guideY });
                  handleUpdateLayer(layer.id, { x: nX, y: nY });
                };

                const onPointerUp = (upEv: PointerEvent) => {
                  el.releasePointerCapture(upEv.pointerId);
                  document.removeEventListener('pointermove', onPointerMove);
                  document.removeEventListener('pointerup', onPointerUp);
                  setActiveGuides({ x: null, y: null });
                  handleUpdateLayerComplete();
                };

                document.addEventListener('pointermove', onPointerMove);
                document.addEventListener('pointerup', onPointerUp);
              };

              // Resize scale handles
              const onResizeStart = (e: React.PointerEvent) => {
                if (layer.isLocked) return;
                e.preventDefault();
                e.stopPropagation();

                const el = e.currentTarget as HTMLElement;
                el.setPointerCapture(e.pointerId);

                const layerContent = document.getElementById(`layer-content-${layer.id}`);
                if (!layerContent) return;

                const lRect = layerContent.getBoundingClientRect();
                const lCX = lRect.left + lRect.width / 2;
                const lCY = lRect.top + lRect.height / 2;

                const initScale = layer.scale;
                const initDist = Math.hypot(e.clientX - lCX, e.clientY - lCY);

                const onPointerMove = (moveEv: PointerEvent) => {
                  const curDist = Math.hypot(moveEv.clientX - lCX, moveEv.clientY - lCY);
                  const nScale = Math.max(0.3, Math.min(4.5, initScale * (curDist / (initDist || 1))));
                  handleUpdateLayer(layer.id, { scale: parseFloat(nXScaleFixed(nScale)) });
                };

                const nXScaleFixed = (val: number) => val.toFixed(2);

                const onPointerUp = (upEv: PointerEvent) => {
                  el.releasePointerCapture(upEv.pointerId);
                  document.removeEventListener('pointermove', onPointerMove);
                  document.removeEventListener('pointerup', onPointerUp);
                  handleUpdateLayerComplete();
                };

                document.addEventListener('pointermove', onPointerMove);
                document.addEventListener('pointerup', onPointerUp);
              };

              // Rotation handler
              const onRotateStart = (e: React.PointerEvent) => {
                if (layer.isLocked) return;
                e.preventDefault();
                e.stopPropagation();

                const el = e.currentTarget as HTMLElement;
                el.setPointerCapture(e.pointerId);

                const layerContent = document.getElementById(`layer-content-${layer.id}`);
                if (!layerContent) return;

                const lRect = layerContent.getBoundingClientRect();
                const lCX = lRect.left + lRect.width / 2;
                const lCY = lRect.top + lRect.height / 2;

                const onPointerMove = (moveEv: PointerEvent) => {
                  const dx = moveEv.clientX - lCX;
                  const dy = moveEv.clientY - lCY;
                  let angle = Math.atan2(dy, dx);
                  let deg = (angle * 180) / Math.PI - 90;
                  
                  if (moveEv.shiftKey) {
                    deg = Math.round(deg / 45) * 45;
                  }
                  handleUpdateLayer(layer.id, { rotation: Math.round(deg) });
                };

                const onPointerUp = (upEv: PointerEvent) => {
                  el.releasePointerCapture(upEv.pointerId);
                  document.removeEventListener('pointermove', onPointerMove);
                  document.removeEventListener('pointerup', onPointerUp);
                  handleUpdateLayerComplete();
                };

                document.addEventListener('pointermove', onPointerMove);
                document.addEventListener('pointerup', onPointerUp);
              };

              const handleContextMenuOpen = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedLayerId(layer.id);
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  layerId: layer.id
                });
              };

              // Double tap mobile detection
              let lastTap = 0;
              const handleTouchStart = (e: React.TouchEvent) => {
                const now = Date.now();
                if (now - lastTap < 300) {
                  e.stopPropagation();
                  if (!layer.isLocked) {
                    setIsEditingText(true);
                  }
                }
                lastTap = now;
              };

              return (
                <div
                  key={layer.id}
                  onPointerDown={onDragStart}
                  onContextMenu={handleContextMenuOpen}
                  onTouchStart={handleTouchStart}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (!layer.isLocked) setIsEditingText(true);
                  }}
                  className={clsx(
                    "absolute cursor-move select-none z-30 transition-[box-shadow] duration-200",
                    isSelected && !layer.isLocked && "ring-1.5 ring-violet-500 ring-offset-2 ring-offset-black/50"
                  )}
                  style={{
                    left: `${layer.x}%`,
                    top: `${layer.y}%`,
                    transform: `translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale})`,
                    transformOrigin: 'center center',
                  }}
                >
                  {/* Layer text content */}
                  <div 
                    id={`layer-content-${layer.id}`}
                    className={clsx(
                      "whitespace-pre-wrap transition-transform duration-200 max-w-[280px]",
                      // CSS Keyframe animations preview
                      layer.animationType === 'flicker' && "animate-[flicker_2s_infinite]",
                      layer.animationType === 'glitch' && "animate-[glitch_0.8s_infinite]"
                    )}
                    style={getLayerStyle(layer)}
                  >
                    {isEditingText && isSelected ? (
                      <textarea
                        ref={textareaRef}
                        value={layer.text}
                        onChange={(e) => handleUpdateLayer(layer.id, { text: e.target.value })}
                        onBlur={() => { setIsEditingText(false); handleUpdateLayerComplete(); }}
                        autoFocus
                        className="bg-transparent border-none outline-none resize-none overflow-hidden p-0 w-full min-w-[120px] focus:ring-0 focus:outline-none text-center"
                        style={{
                          fontFamily: `"${layer.fontFamily}", sans-serif`,
                          fontSize: `${layer.fontSize}px`,
                          color: layer.color,
                          fontWeight: layer.fontWeight,
                          fontStyle: layer.fontStyle,
                          letterSpacing: `${layer.letterSpacing}px`,
                          lineHeight: layer.lineHeight,
                          textAlign: layer.align,
                        }}
                      />
                    ) : (
                      <div className="relative">
                        {layer.animationType === 'typing' ? (
                          <TypingTextEffect layer={layer} />
                        ) : layer.animationType === 'fade' ? (
                          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2.2 }}>
                            {layer.text}
                          </motion.div>
                        ) : layer.animationType === 'bounce' ? (
                          <motion.div animate={{ y: [-4, 4, -4] }} transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}>
                            {layer.text}
                          </motion.div>
                        ) : layer.animationType === 'scale' ? (
                          <motion.div animate={{ scale: [0.96, 1.04, 0.96] }} transition={{ repeat: Infinity, duration: 2.0 }}>
                            {layer.text}
                          </motion.div>
                        ) : layer.animationType === 'slide' ? (
                          <motion.div animate={{ x: [-8, 8, -8] }} transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}>
                            {layer.text}
                          </motion.div>
                        ) : (
                          layer.text
                        )}
                      </div>
                    )}
                  </div>

                  {/* Active transformation handles */}
                  {isSelected && !layer.isLocked && !isEditingText && (
                    <>
                      {/* Rotation dial */}
                      <div 
                        onPointerDown={onRotateStart}
                        className="absolute -top-7 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-violet-600 border border-white flex items-center justify-center cursor-alias shadow-lg active:scale-110 transition-all hover:bg-violet-500 z-50"
                        title="Rotate Layer"
                      >
                        <RefreshCw size={10} className="text-white" />
                      </div>
                      
                      {/* Scale resizing pip */}
                      <div 
                        onPointerDown={onResizeStart}
                        className="absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full bg-violet-600 border border-white cursor-se-resize shadow-lg active:scale-115 transition-all hover:bg-violet-500 z-50"
                        title="Resize Layer"
                      />

                      {/* Lock indicator status */}
                      <div className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-md bg-zinc-800 border border-white/20 flex items-center justify-center shadow-lg text-slate-400">
                        <Unlock size={8} />
                      </div>
                    </>
                  )}

                  {/* Lock Indicator when selected */}
                  {isSelected && layer.isLocked && (
                    <div 
                      onClick={() => handleToggleLock(layer.id)}
                      className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-red-950 border border-red-500/50 flex items-center justify-center shadow-lg text-red-400 cursor-pointer"
                      title="Locked layer. Click to unlock."
                    >
                      <Lock size={9} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty canvas guide placard */}
            {textLayers.length === 0 && !mediaUrl && backgroundType !== 'camera' && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center z-20 pointer-events-none">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mx-auto text-violet-400">
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                  <div className="space-y-1 mt-4 max-w-[240px]">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Story Creator Canvas</h4>
                    <p className="text-[9px] text-slate-500 leading-relaxed">
                      Tap "Add Text" or import media layouts to begin composition.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Context menu overlay */}
        {contextMenu && (
          <div 
            className="fixed z-[999] bg-[#121215] border border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.5)] rounded-2xl p-1.5 min-w-[150px] animate-fade-in"
            style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              type="button" 
              onClick={() => handleDuplicateLayer(contextMenu.layerId)}
              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              <Copy size={12} /> Duplicate
            </button>
            <button 
              type="button" 
              onClick={() => handleToggleLock(contextMenu.layerId)}
              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              {textLayers.find(l => l.id === contextMenu.layerId)?.isLocked ? <Unlock size={12} /> : <Lock size={12} />}
              {textLayers.find(l => l.id === contextMenu.layerId)?.isLocked ? 'Unlock' : 'Lock Layer'}
            </button>
            <div className="h-[1px] bg-white/5 my-1" />
            <button 
              type="button" 
              onClick={() => handleMoveDepth(contextMenu.layerId, 'front')}
              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-left uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              Bring to Front
            </button>
            <button 
              type="button" 
              onClick={() => handleMoveDepth(contextMenu.layerId, 'back')}
              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-left uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              Send to Back
            </button>
            <div className="h-[1px] bg-white/5 my-1" />
            <button 
              type="button" 
              onClick={() => handleDeleteLayer(contextMenu.layerId)}
              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        )}

        {/* Settings Panels & Styling Controls */}
        <div className="shrink-0 border-t border-white/[0.06] bg-[#09090b] z-50">
          
          {selectedLayerId ? (
            /* ACTIVE TEXT LAYER EDITING DASHBOARD */
            <div className="flex flex-col bg-[#0c0c0f]">
              {/* Tab options bar */}
              <div className="flex border-b border-white/[0.05] overflow-x-auto hide-scrollbar">
                {[
                  { id: 'font', label: 'Font' },
                  { id: 'style', label: 'Style' },
                  { id: 'effects', label: 'Effects' },
                  { id: 'background', label: 'Backing' },
                  { id: 'motion', label: 'Motion' },
                  { id: 'layers', label: 'Arrange' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id as any)}
                    className={clsx(
                      "px-5 py-3.5 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all flex-shrink-0",
                      activeTab === t.id ? "text-violet-400 border-violet-500 bg-white/[0.02]" : "text-slate-500 border-transparent hover:text-slate-200"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab content area */}
              <div className="p-6 max-h-[170px] overflow-y-auto custom-scrollbar min-h-[170px]">
                
                {/* 1. FONT SELECTION TAB */}
                {activeTab === 'font' && (
                  <div className="space-y-4">
                    {/* Category Selector */}
                    <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
                      {(Object.keys(FONT_CATEGORIES) as Array<keyof typeof FONT_CATEGORIES>).map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedFontCategory(cat)}
                          className={clsx(
                            "px-3 py-1.5 text-[8px] font-black uppercase tracking-wider rounded-lg border transition-all flex-shrink-0",
                            selectedFontCategory === cat ? "bg-violet-600/10 border-violet-500/40 text-violet-300" : "bg-white/[0.02] border-white/[0.05] text-slate-400 hover:text-slate-200"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Search & Horizontal Fonts Grid */}
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Search 100+ Fonts..."
                        value={fontSearch}
                        onChange={(e) => setFontSearch(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-1.5 text-[10px] text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
                      />
                      
                      <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
                        {filteredFonts.map(font => {
                          const isSelected = textLayers.find(l => l.id === selectedLayerId)?.fontFamily === font;
                          return (
                            <button
                              key={font}
                              type="button"
                              onClick={() => {
                                loadGoogleFont(font);
                                handleUpdateLayer(selectedLayerId, { fontFamily: font });
                                handleUpdateLayerComplete();
                              }}
                              className={clsx(
                                "px-4 py-2.5 rounded-xl border text-center transition-all flex-shrink-0 min-w-[90px]",
                                isSelected ? "bg-violet-600 border-violet-500 text-white" : "bg-white/[0.02] border-white/[0.05] text-slate-300 hover:bg-white/[0.04]"
                              )}
                              style={{ fontFamily: `"${font}", sans-serif` }}
                            >
                              <span className="text-[11px] block">{font}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Font dimensions sliders */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[8px] uppercase tracking-widest text-slate-500">
                          <span>Font Size</span>
                          <span>{textLayers.find(l => l.id === selectedLayerId)?.fontSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="12"
                          max="80"
                          value={textLayers.find(l => l.id === selectedLayerId)?.fontSize || 28}
                          onChange={(e) => handleUpdateLayer(selectedLayerId, { fontSize: parseInt(e.target.value) })}
                          onMouseUp={handleUpdateLayerComplete}
                          onTouchEnd={handleUpdateLayerComplete}
                          className="w-full accent-violet-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[8px] uppercase tracking-widest text-slate-500">
                          <span>Letter Spacing</span>
                          <span>{textLayers.find(l => l.id === selectedLayerId)?.letterSpacing}px</span>
                        </div>
                        <input
                          type="range"
                          min="-3"
                          max="15"
                          value={textLayers.find(l => l.id === selectedLayerId)?.letterSpacing || 0}
                          onChange={(e) => handleUpdateLayer(selectedLayerId, { letterSpacing: parseInt(e.target.value) })}
                          onMouseUp={handleUpdateLayerComplete}
                          onTouchEnd={handleUpdateLayerComplete}
                          className="w-full accent-violet-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. STYLE OPTIONS TAB */}
                {activeTab === 'style' && (
                  <div className="space-y-4">
                    {/* Basic alignments & formatting row */}
                    <div className="flex items-center justify-between gap-4">
                      {/* Bold / Italic / Underline */}
                      <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.05] p-1 rounded-xl">
                        {[
                          { id: 'bold', icon: <BoldIcon size={12} />, active: textLayers.find(l => l.id === selectedLayerId)?.fontWeight === 'bold', toggle: () => handleUpdateLayer(selectedLayerId, { fontWeight: textLayers.find(l => l.id === selectedLayerId)?.fontWeight === 'bold' ? 'normal' : 'bold' }) },
                          { id: 'italic', icon: <ItalicIcon size={12} />, active: textLayers.find(l => l.id === selectedLayerId)?.fontStyle === 'italic', toggle: () => handleUpdateLayer(selectedLayerId, { fontStyle: textLayers.find(l => l.id === selectedLayerId)?.fontStyle === 'italic' ? 'normal' : 'italic' }) },
                          { id: 'underline', icon: <UnderlineIcon size={12} />, active: textLayers.find(l => l.id === selectedLayerId)?.textDecoration === 'underline', toggle: () => handleUpdateLayer(selectedLayerId, { textDecoration: textLayers.find(l => l.id === selectedLayerId)?.textDecoration === 'underline' ? 'none' : 'underline' }) }
                        ].map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => { opt.toggle(); handleUpdateLayerComplete(); }}
                            className={clsx(
                              "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                              opt.active ? "bg-violet-600 text-white" : "text-slate-400 hover:text-slate-200"
                            )}
                          >
                            {opt.icon}
                          </button>
                        ))}
                      </div>

                      {/* Alignments */}
                      <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.05] p-1 rounded-xl">
                        {[
                          { id: 'left', icon: <AlignLeft size={12} /> },
                          { id: 'center', icon: <AlignCenter size={12} /> },
                          { id: 'right', icon: <AlignRight size={12} /> },
                          { id: 'justify', icon: <AlignJustify size={12} /> }
                        ].map(alignOpt => (
                          <button
                            key={alignOpt.id}
                            type="button"
                            onClick={() => { handleUpdateLayer(selectedLayerId, { align: alignOpt.id as any }); handleUpdateLayerComplete(); }}
                            className={clsx(
                              "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                              textLayers.find(l => l.id === selectedLayerId)?.align === alignOpt.id ? "bg-violet-600 text-white" : "text-slate-400 hover:text-slate-200"
                            )}
                          >
                            {alignOpt.icon}
                          </button>
                        ))}
                      </div>

                      {/* Text Transform Cases */}
                      <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.05] p-1 rounded-xl">
                        {[
                          { id: 'none', label: 'Aa' },
                          { id: 'uppercase', label: 'AA' },
                          { id: 'lowercase', label: 'aa' }
                        ].map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { handleUpdateLayer(selectedLayerId, { textTransform: c.id as any }); handleUpdateLayerComplete(); }}
                            className={clsx(
                              "px-2 h-7 text-[8px] font-bold rounded-lg flex items-center justify-center transition-all",
                              textLayers.find(l => l.id === selectedLayerId)?.textTransform === c.id ? "bg-violet-600 text-white" : "text-slate-400 hover:text-slate-200"
                            )}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Opacity and Line height sliders */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[8px] uppercase tracking-widest text-slate-500">
                          <span>Opacity</span>
                          <span>{Math.round((textLayers.find(l => l.id === selectedLayerId)?.opacity || 1) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={Math.round((textLayers.find(l => l.id === selectedLayerId)?.opacity || 1) * 100)}
                          onChange={(e) => handleUpdateLayer(selectedLayerId, { opacity: parseFloat(e.target.value) / 100 })}
                          onMouseUp={handleUpdateLayerComplete}
                          onTouchEnd={handleUpdateLayerComplete}
                          className="w-full accent-violet-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[8px] uppercase tracking-widest text-slate-500">
                          <span>Line Height</span>
                          <span>{textLayers.find(l => l.id === selectedLayerId)?.lineHeight}</span>
                        </div>
                        <input
                          type="range"
                          min="8"
                          max="25"
                          value={Math.round((textLayers.find(l => l.id === selectedLayerId)?.lineHeight || 1.2) * 10)}
                          onChange={(e) => handleUpdateLayer(selectedLayerId, { lineHeight: parseFloat(e.target.value) / 10 })}
                          onMouseUp={handleUpdateLayerComplete}
                          onTouchEnd={handleUpdateLayerComplete}
                          className="w-full accent-violet-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. TEXT EFFECTS TAB */}
                {activeTab === 'effects' && (
                  <div className="space-y-4">
                    {/* Effect selection tabs */}
                    <div className="flex gap-1 overflow-x-auto hide-scrollbar pb-1 border-b border-white/5">
                      {[
                        { id: 'none', label: 'Plain' },
                        { id: 'gradient', label: 'Gradient' },
                        { id: 'glow', label: 'Glow' },
                        { id: 'shadow', label: 'Shadow' },
                        { id: 'outline', label: 'Outline' }
                      ].map(eff => (
                        <button
                          key={eff.id}
                          type="button"
                          onClick={() => { handleUpdateLayer(selectedLayerId, { effectType: eff.id as any }); handleUpdateLayerComplete(); }}
                          className={clsx(
                            "px-3 py-1.5 text-[8.5px] font-bold uppercase tracking-wider rounded-lg transition-all",
                            textLayers.find(l => l.id === selectedLayerId)?.effectType === eff.id ? "bg-violet-600/10 text-violet-300" : "text-slate-400 hover:text-slate-200"
                          )}
                        >
                          {eff.label}
                        </button>
                      ))}
                    </div>

                    {/* Gradient presets color pickers */}
                    {textLayers.find(l => l.id === selectedLayerId)?.effectType === 'gradient' && (
                      <div className="space-y-2">
                        <span className="text-[7.5px] uppercase tracking-widest text-slate-500">Text Gradients</span>
                        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
                          {PRESET_TEXT_GRADIENTS.map(grad => (
                            <button
                              key={grad}
                              type="button"
                              onClick={() => { handleUpdateLayer(selectedLayerId, { effectValue: grad }); handleUpdateLayerComplete(); }}
                              className={clsx(
                                "w-6 h-6 rounded-lg transition-all flex-shrink-0",
                                textLayers.find(l => l.id === selectedLayerId)?.effectValue === grad ? "scale-110 ring-2 ring-violet-500" : "opacity-75 hover:opacity-100"
                              )}
                              style={{ background: grad }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Effect color & range slider modifiers */}
                    {['glow', 'shadow', 'outline'].includes(textLayers.find(l => l.id === selectedLayerId)?.effectType || '') && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[7.5px] uppercase tracking-widest text-slate-500">Effect Color</span>
                          <div className="flex gap-1">
                            {PRESET_TEXT_COLORS.map(c => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => { handleUpdateLayer(selectedLayerId, { effectColor: c }); handleUpdateLayerComplete(); }}
                                className={clsx(
                                  "w-4 h-4 rounded-full border border-white/10",
                                  textLayers.find(l => l.id === selectedLayerId)?.effectColor === c ? "scale-110 ring-1 ring-violet-500" : "opacity-80"
                                )}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>

                        {textLayers.find(l => l.id === selectedLayerId)?.effectType === 'outline' && (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[8px] uppercase tracking-widest text-slate-500">
                              <span>Outline Thickness</span>
                              <span>{textLayers.find(l => l.id === selectedLayerId)?.effectValue || '1.5px'}</span>
                            </div>
                            <input
                              type="range"
                              min="5"
                              max="30"
                              value={parseFloat(textLayers.find(l => l.id === selectedLayerId)?.effectValue || '1.5') * 10}
                              onChange={(e) => handleUpdateLayer(selectedLayerId, { effectValue: `${parseFloat(e.target.value) / 10}px` })}
                              onMouseUp={handleUpdateLayerComplete}
                              onTouchEnd={handleUpdateLayerComplete}
                              className="w-full accent-violet-500"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Simple flat solid color picker */}
                    {textLayers.find(l => l.id === selectedLayerId)?.effectType !== 'gradient' && (
                      <div className="space-y-1.5">
                        <span className="text-[7.5px] uppercase tracking-widest text-slate-500">Flat Text Color</span>
                        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
                          {PRESET_TEXT_COLORS.map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => { handleUpdateLayer(selectedLayerId, { color: c }); handleUpdateLayerComplete(); }}
                              className={clsx(
                                "w-6 h-6 rounded-lg transition-all flex-shrink-0",
                                textLayers.find(l => l.id === selectedLayerId)?.color === c ? "scale-110 ring-2 ring-violet-500" : "opacity-75 hover:opacity-100"
                              )}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. BACKGROUND FORMATTING TAB */}
                {activeTab === 'background' && (
                  <div className="space-y-4">
                    {/* Background Type selection */}
                    <div className="flex gap-1 overflow-x-auto hide-scrollbar pb-1 border-b border-white/5">
                      {[
                        { id: 'none', label: 'No Backdrop' },
                        { id: 'glass', label: 'Glass' },
                        { id: 'blur', label: 'Blur' },
                        { id: 'rounded', label: 'Rounded Box' },
                        { id: 'color', label: 'Solid Box' }
                      ].map(bg => (
                        <button
                          key={bg.id}
                          type="button"
                          onClick={() => { handleUpdateLayer(selectedLayerId, { backgroundType: bg.id as any }); handleUpdateLayerComplete(); }}
                          className={clsx(
                            "px-3 py-1.5 text-[8.5px] font-bold uppercase tracking-wider rounded-lg transition-all",
                            textLayers.find(l => l.id === selectedLayerId)?.backgroundType === bg.id ? "bg-violet-600/10 text-violet-300" : "text-slate-400 hover:text-slate-200"
                          )}
                        >
                          {bg.label}
                        </button>
                      ))}
                    </div>

                    {/* Controls if backdrop is active */}
                    {textLayers.find(l => l.id === selectedLayerId)?.backgroundType !== 'none' && (
                      <div className="space-y-3">
                        {['rounded', 'color'].includes(textLayers.find(l => l.id === selectedLayerId)?.backgroundType || '') && (
                          <div className="flex items-center justify-between">
                            <span className="text-[7.5px] uppercase tracking-widest text-slate-500">Box Color</span>
                            <div className="flex gap-1">
                              {['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.85)', 'rgba(255,255,255,0.9)', 'rgba(127,0,255,0.6)', 'rgba(255,42,95,0.6)'].map(c => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => { handleUpdateLayer(selectedLayerId, { backgroundColor: c }); handleUpdateLayerComplete(); }}
                                  className={clsx(
                                    "w-4 h-4 rounded-full border border-white/10",
                                    textLayers.find(l => l.id === selectedLayerId)?.backgroundColor === c ? "scale-110 ring-1 ring-violet-500" : "opacity-80"
                                  )}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] uppercase tracking-widest text-slate-500">
                              <span>Padding</span>
                              <span>{textLayers.find(l => l.id === selectedLayerId)?.backgroundPadding}px</span>
                            </div>
                            <input
                              type="range"
                              min="4"
                              max="32"
                              value={textLayers.find(l => l.id === selectedLayerId)?.backgroundPadding || 12}
                              onChange={(e) => handleUpdateLayer(selectedLayerId, { backgroundPadding: parseInt(e.target.value) })}
                              onMouseUp={handleUpdateLayerComplete}
                              onTouchEnd={handleUpdateLayerComplete}
                              className="w-full accent-violet-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] uppercase tracking-widest text-slate-500">
                              <span>Rounding</span>
                              <span>{textLayers.find(l => l.id === selectedLayerId)?.borderRadius}px</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="32"
                              value={textLayers.find(l => l.id === selectedLayerId)?.borderRadius || 12}
                              onChange={(e) => handleUpdateLayer(selectedLayerId, { borderRadius: parseInt(e.target.value) })}
                              onMouseUp={handleUpdateLayerComplete}
                              onTouchEnd={handleUpdateLayerComplete}
                              className="w-full accent-violet-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. MOTION ANIMATIONS TAB */}
                {activeTab === 'motion' && (
                  <div className="space-y-3">
                    <span className="text-[7.5px] uppercase tracking-widest text-slate-500 block">Live Preview Animations</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'none', label: 'None' },
                        { id: 'typing', label: 'Typewriter' },
                        { id: 'fade', label: 'Fade' },
                        { id: 'slide', label: 'Slide' },
                        { id: 'bounce', label: 'Bounce' },
                        { id: 'scale', label: 'Scale' },
                        { id: 'flicker', label: 'Flicker' },
                        { id: 'glitch', label: 'Glitch' }
                      ].map(anim => (
                        <button
                          key={anim.id}
                          type="button"
                          onClick={() => { handleUpdateLayer(selectedLayerId, { animationType: anim.id as any }); handleUpdateLayerComplete(); }}
                          className={clsx(
                            "py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider border text-center transition-all",
                            textLayers.find(l => l.id === selectedLayerId)?.animationType === anim.id ? "bg-violet-600 border-violet-500 text-white" : "bg-white/[0.02] border-white/[0.05] text-slate-400 hover:bg-white/[0.04]"
                          )}
                        >
                          {anim.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. LAYERS ARRANGE TAB */}
                {activeTab === 'layers' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-[8px] uppercase tracking-widest text-slate-500">
                      <span>Arrange Layer depth</span>
                      <span>{textLayers.length} Layers Total</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleMoveDepth(selectedLayerId, 'front')}
                        className="flex-1 py-2.5 bg-white/[0.02] border border-white/[0.05] rounded-xl text-[9px] font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1"
                      >
                        <ArrowUp size={10} /> Front
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDepth(selectedLayerId, 'back')}
                        className="flex-1 py-2.5 bg-white/[0.02] border border-white/[0.05] rounded-xl text-[9px] font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1"
                      >
                        <ArrowDown size={10} /> Back
                      </button>
                    </div>

                    <div className="flex gap-2 justify-between items-center bg-white/[0.02] p-3 rounded-2xl border border-white/[0.05]">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Layer status</span>
                      <button
                        type="button"
                        onClick={() => handleToggleLock(selectedLayerId)}
                        className={clsx(
                          "px-4 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1 transition-all",
                          textLayers.find(l => l.id === selectedLayerId)?.isLocked ? "bg-red-950/20 border-red-500/30 text-red-400" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                        )}
                      >
                        {textLayers.find(l => l.id === selectedLayerId)?.isLocked ? <Lock size={10} /> : <Unlock size={10} />}
                        {textLayers.find(l => l.id === selectedLayerId)?.isLocked ? 'Locked' : 'Lock Layer'}
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* Selection actions footer controls */}
              <div className="border-t border-white/[0.05] bg-black/30 px-6 py-3.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDuplicateLayer(selectedLayerId)}
                  className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                >
                  <Copy size={12} /> Duplicate
                </button>
                
                <button
                  type="button"
                  onClick={() => setSelectedLayerId(null)}
                  className="px-4 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-200 transition-all"
                >
                  Finish
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteLayer(selectedLayerId)}
                  className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-all"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ) : (
            /* GENERAL CANVAS / STORY CONFIGURATION */
            <div className="flex flex-col">
              {/* Backdrops pip palettes */}
              <div className="px-6 py-4 border-b border-white/[0.03] flex items-center justify-between bg-black/20">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 font-mono">Backdrops</span>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar max-w-[280px]">
                  {GRADIENTS.slice(0, 4).map((g, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => { setMediaUrl(null); setMediaFile(null); setBackgroundType('gradient'); setBackgroundValue(g); }}
                      className={clsx(
                        "w-6 h-6 rounded-lg transition-all flex-shrink-0",
                        backgroundType === 'gradient' && backgroundValue === g && !mediaUrl ? "scale-110 ring-2 ring-violet-500" : "opacity-75 hover:opacity-100"
                      )}
                      style={{ background: g }}
                    />
                  ))}
                  {SOLID_COLORS.slice(0, 4).map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => { setMediaUrl(null); setMediaFile(null); setBackgroundType('color'); setBackgroundValue(c); }}
                      className={clsx(
                        "w-6 h-6 rounded-lg transition-all flex-shrink-0",
                        backgroundType === 'color' && backgroundValue === c && !mediaUrl ? "scale-110 ring-2 ring-violet-500" : "opacity-75 hover:opacity-100"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Canvas controls pips */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-9 h-9 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-slate-300 hover:text-white transition-all animate-pulse-subtle"
                    title="Import Media"
                  >
                    <ImageIcon size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleCamera}
                    className={clsx(
                      "w-9 h-9 rounded-xl border flex items-center justify-center transition-all",
                      backgroundType === 'camera' ? "bg-violet-600 text-white border-violet-500" : "bg-white/[0.03] border-white/[0.08] text-slate-300 hover:text-white"
                    )}
                    title="Live Camera"
                  >
                    <Camera size={16} />
                  </button>

                  <div className="w-[1px] h-5 bg-white/10 mx-1" />

                  {/* Add Text Layer trigger */}
                  <button
                    type="button"
                    onClick={handleAddTextLayer}
                    className="flex items-center gap-1.5 px-4 py-2 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 hover:border-violet-500/40 rounded-xl text-[9px] font-black uppercase tracking-wider text-violet-300 transition-all active:scale-95 shadow-premium"
                  >
                    <Plus size={11} /> Add Text
                  </button>
                </div>

                {/* Visibility/Privacy settings and Publish */}
                <div className="flex items-center gap-2.5">
                  <button 
                    type="button"
                    onClick={() => setShowPrivacyModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-300 hover:text-white transition-all"
                  >
                    {privacy === 'public' && <Globe size={11} className="text-cyan-400" />}
                    {privacy === 'friends' && <Users size={11} className="text-violet-400" />}
                    {privacy === 'close_friends' && <LockIcon size={11} className="text-emerald-400" />}
                    Privacy
                  </button>

                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={publishing}
                    className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-black text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-premium flex items-center gap-1.5"
                  >
                    {publishing ? <Loader2 size={12} className="animate-spin" /> : 'Publish'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Visibility options overlay modal */}
        <AnimatePresence>
          {showPrivacyModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] bg-black/90 flex flex-col justify-end p-6"
            >
              <div className="space-y-5 bg-[#121215] border border-white/[0.08] p-6 rounded-3xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Story Visibility</h3>
                  <button 
                    type="button" 
                    onClick={() => setShowPrivacyModal(false)}
                    className="text-slate-500 hover:text-white"
                  >
                    Close
                  </button>
                </div>

                <div className="space-y-2">
                  {[
                    { id: 'public', title: 'Public', desc: 'Anyone on Verlyn can view this story.', color: 'text-cyan-400' },
                    { id: 'friends', title: 'Followers Only', desc: 'Only your active follower nodes can view.', color: 'text-violet-400' },
                    { id: 'close_friends', title: 'Close Friends', desc: 'Securely isolated to trusted connections.', color: 'text-emerald-400' }
                  ].map(opt => (
                    <div 
                      key={opt.id}
                      onClick={() => { setPrivacy(opt.id as any); setShowPrivacyModal(false); }}
                      className={clsx(
                        "p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between",
                        privacy === opt.id ? "bg-white/[0.03] border-white/20" : "bg-transparent border-white/[0.04] hover:bg-white/[0.01]"
                      )}
                    >
                      <div>
                        <h4 className={clsx("text-xs font-black uppercase tracking-wider", opt.color)}>{opt.title}</h4>
                        <p className="text-[10px] text-slate-500 leading-normal mt-0.5">{opt.desc}</p>
                      </div>
                      {privacy === opt.id && <Check size={14} className="text-white" />}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
