'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Check, 
  ArrowRight, 
  User, 
  Upload,
  Loader2,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';
import { uploadMedia } from '@/app/(main)/feed/upload';
import { createClient } from '@/lib/supabase/client';
import { generateVectorAvatar } from '@/lib/utils';
import clsx from 'clsx';

// Canvas-based image cropper helper
const cropImage = async (file: File, zoom: number, x: number, y: number): Promise<File> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      
      const size = 400;
      canvas.width = size;
      canvas.height = size;
      
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, size, size);

      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;
      
      const scaleX = size / imgWidth;
      const scaleY = size / imgHeight;
      const baseScale = Math.max(scaleX, scaleY);
      const finalScale = baseScale * zoom;
      
      const dw = imgWidth * finalScale;
      const dh = imgHeight * finalScale;
      
      const scaleRatio = size / 128; // viewport size is 128px
      const dx = x * scaleRatio;
      const dy = y * scaleRatio;
      
      ctx.save();
      ctx.translate(size / 2 + dx, size / 2 + dy);
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], file.name, { type: file.type || 'image/jpeg' }));
        } else {
          resolve(file);
        }
      }, file.type || 'image/jpeg', 0.95);
    };
    img.onerror = () => resolve(file);
  });
};

// Canvas-based banner cropper helper (3:1 aspect ratio: 1200x400)
const cropBanner = async (file: File, zoom: number, x: number, y: number): Promise<File> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      
      const width = 1200;
      const height = 400;
      canvas.width = width;
      canvas.height = height;
      
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;
      
      const scaleX = width / imgWidth;
      const scaleY = height / imgHeight;
      const baseScale = Math.max(scaleX, scaleY);
      const finalScale = baseScale * zoom;
      
      const dw = imgWidth * finalScale;
      const dh = imgHeight * finalScale;
      
      const scaleRatioX = width / 384; // DOM width is 384px
      const scaleRatioY = height / 96;  // DOM height is 96px
      const dx = x * scaleRatioX;
      const dy = y * scaleRatioY;
      
      ctx.save();
      ctx.translate(width / 2 + dx, height / 2 + dy);
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], file.name, { type: file.type || 'image/jpeg' }));
        } else {
          resolve(file);
        }
      }, file.type || 'image/jpeg', 0.95);
    };
    img.onerror = () => resolve(file);
  });
};

export default function OnboardingPortal() {
  const currentUser = useAppStore(s => s.currentUser);
  const updateProfile = useAppStore(s => s.updateProfile);
  const setUser = useAppStore(s => s.setUser);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1); // Step 1: Welcome, Step 2: Avatar, Step 3: Banner, Step 4: Details
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(0);
  const [selectedBanner, setSelectedBanner] = useState('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjQwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMGYxNzJhIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjNTgxYzg3Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEyMDAiIGhlaWdodD0iNDAwIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+');
  const [selectedBannerIndex, setSelectedBannerIndex] = useState<number | null>(0);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedBannerFile, setUploadedBannerFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Cropper states
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const lastOffset = useRef({ x: 0, y: 0 });

  // Banner cropper states
  const [bannerZoom, setBannerZoom] = useState(1);
  const [bannerPanOffset, setBannerPanOffset] = useState({ x: 0, y: 0 });
  const [isDraggingBanner, setIsDraggingBanner] = useState(false);
  const bannerDragStart = useRef({ x: 0, y: 0 });
  const lastBannerOffset = useRef({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Detect if onboarding is needed
  useEffect(() => {
    if (currentUser && currentUser.createdAt) {
      const hasOnboarded = (currentUser as any).metadata?.onboarded === true;
      
      if (!hasOnboarded) {
        setIsOpen(true);
        setDisplayName(currentUser.displayName || '');
        if (currentUser.avatar) {
          setSelectedAvatar(currentUser.avatar);
          setSelectedPresetIndex(null);
        } else {
          setSelectedPresetIndex(0);
        }
      }
    }
  }, [currentUser]);

  const seedName = displayName || currentUser?.displayName || currentUser?.username || 'User';

  const premiumPresets = [
    { type: 'initial' as const, index: 0 },
    { type: 'initial' as const, index: 1 },
    { type: 'initial' as const, index: 2 },
    { type: 'initial' as const, index: 3 },
    { type: 'silhouette' as const, index: 4 },
    { type: 'silhouette' as const, index: 5 },
    { type: 'silhouette' as const, index: 6 },
    { type: 'silhouette' as const, index: 7 },
  ];

  const avatarPool = premiumPresets.map(preset => 
    generateVectorAvatar(seedName, preset.index, preset.type)
  );

  const bannerPresets = [
    { url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjQwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMGYxNzJhIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjNTgxYzg3Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEyMDAiIGhlaWdodD0iNDAwIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+', name: 'Deep Space' },
    { url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjQwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMDIwNjE3Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMWUzYThhIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEyMDAiIGhlaWdodD0iNDAwIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+', name: 'Midnight Flow' },
    { url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjQwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMWUxYjRiIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjNzAxYTc1Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEyMDAiIGhlaWdodD0iNDAwIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+', name: 'Sunset Dusk' },
    { url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjQwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMDkwOTBiIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMjcyNzJhIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEyMDAiIGhlaWdodD0iNDAwIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+', name: 'Obsidian' }
  ];

  // Cropper Drag & Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    lastOffset.current = { ...panOffset };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const limit = 100 * zoom;
    const clamp = (val: number, max: number) => Math.min(Math.max(val, -max), max);
    setPanOffset({
      x: clamp(lastOffset.current.x + dx, limit),
      y: clamp(lastOffset.current.y + dy, limit),
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    lastOffset.current = { ...panOffset };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.current.x;
    const dy = e.touches[0].clientY - dragStart.current.y;
    const limit = 100 * zoom;
    const clamp = (val: number, max: number) => Math.min(Math.max(val, -max), max);
    setPanOffset({
      x: clamp(lastOffset.current.x + dx, limit),
      y: clamp(lastOffset.current.y + dy, limit),
    });
  };

  // Banner Cropper Drag & Pan Handlers
  const handleBannerMouseDown = (e: React.MouseEvent) => {
    setIsDraggingBanner(true);
    bannerDragStart.current = { x: e.clientX, y: e.clientY };
    lastBannerOffset.current = { ...bannerPanOffset };
  };

  const handleBannerMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingBanner) return;
    const dx = e.clientX - bannerDragStart.current.x;
    const dy = e.clientY - bannerDragStart.current.y;
    const limitX = 200 * bannerZoom;
    const limitY = 100 * bannerZoom;
    const clamp = (val: number, max: number) => Math.min(Math.max(val, -max), max);
    setBannerPanOffset({
      x: clamp(lastBannerOffset.current.x + dx, limitX),
      y: clamp(lastBannerOffset.current.y + dy, limitY),
    });
  };

  const handleBannerMouseUpOrLeave = () => {
    setIsDraggingBanner(false);
  };

  const handleBannerTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDraggingBanner(true);
    bannerDragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    lastBannerOffset.current = { ...bannerPanOffset };
  };

  const handleBannerTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingBanner || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - bannerDragStart.current.x;
    const dy = e.touches[0].clientY - bannerDragStart.current.y;
    const limitX = 200 * bannerZoom;
    const limitY = 100 * bannerZoom;
    const clamp = (val: number, max: number) => Math.min(Math.max(val, -max), max);
    setBannerPanOffset({
      x: clamp(lastBannerOffset.current.x + dx, limitX),
      y: clamp(lastBannerOffset.current.y + dy, limitY),
    });
  };

  const handleComplete = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    setErrorMsg('');

    try {
      let finalAvatar = selectedAvatar;
      let finalBanner = selectedBanner;

      // 1. Handle custom avatar upload if present
      if (uploadedFile) {
        const croppedFile = await cropImage(uploadedFile, zoom, panOffset.x, panOffset.y);
        const fd = new FormData();
        fd.append('file', croppedFile);
        fd.append('folder', 'avatars');
        const result = await uploadMedia(fd);
        if ('url' in result) {
          finalAvatar = result.url;
        }
      } else if (selectedPresetIndex !== null) {
        finalAvatar = avatarPool[selectedPresetIndex];
      }

      // 2. Handle custom banner upload if present
      if (uploadedBannerFile) {
        const croppedBanner = await cropBanner(uploadedBannerFile, bannerZoom, bannerPanOffset.x, bannerPanOffset.y);
        const fd = new FormData();
        fd.append('file', croppedBanner);
        fd.append('folder', 'banners');
        const result = await uploadMedia(fd);
        if ('url' in result) {
          finalBanner = result.url;
        }
      }

      // 3. Update DB
      const { error } = await supabase
        .from('users')
        .update({
          display_name: displayName,
          bio: bio,
          avatar_url: finalAvatar,
          banner_url: finalBanner
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      // 4. Update Auth Metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          onboarded: true
        }
      });

      if (authError) throw authError;

      // 5. Update Local Store
      updateProfile({
        displayName,
        bio,
        avatar: finalAvatar,
      });
      
      // Update metadata flag locally so it doesn't pop up again
      setUser({
        ...currentUser,
        displayName,
        bio,
        avatar: finalAvatar,
        metadata: { ...(currentUser as any).metadata, onboarded: true }
      } as any);

      setIsOpen(false);
    } catch (err: any) {
      console.error('Onboarding update failed:', err);
      setErrorMsg(err?.message || String(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !currentUser) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/45 backdrop-blur-[6px]"
        />

        {/* Portal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          className="relative w-full max-w-md bg-[#101015]/40 backdrop-blur-3xl border border-white/[0.1] rounded-3xl overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.6)] z-10"
        >
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-white/[0.04]">
            <motion.div 
              className="h-full bg-violet-500" 
              initial={{ width: '25%' }}
              animate={{ width: `${(step / 4) * 100}%` }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>

          <div className="p-6 md:p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
            
            {/* STEP 1: Welcome Note */}
            {step === 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-6 py-2 text-center flex flex-col items-center"
              >
                <div className="space-y-2 pt-4">
                  <h1 className="text-2xl font-bold tracking-tight text-white">
                    Welcome to Verlyn
                  </h1>
                  <p className="text-neutral-400 text-xs leading-relaxed max-w-xs mx-auto">
                    Your workspace in the Unified Social Ecosystem. Let's set up your profile picture, cover banner, and bio.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full py-3 bg-violet-600/90 hover:bg-violet-600 text-white rounded-xl font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition-all active:scale-[0.985] shadow-lg shadow-violet-500/10 border border-violet-400/20 mt-2"
                >
                  Begin Setup <ArrowRight size={14} />
                </button>
              </motion.div>
            )}

            {/* STEP 2: Avatar / DP Setup */}
            {step === 2 && (
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-5"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Step 2 of 4</span>
                  <h1 className="text-lg font-bold tracking-tight text-white">Set up your avatar</h1>
                  <p className="text-neutral-400 text-xs">Choose a preset style or upload a custom photo.</p>
                </div>

                {/* Cropping Workspace or Presets */}
                {uploadedFile ? (
                  <div className="space-y-4 py-2">
                    {/* Viewport/Circular Mask */}
                    <div 
                      className="w-32 h-32 rounded-full overflow-hidden border-2 border-white/20 bg-neutral-900 cursor-move relative mx-auto shadow-inner flex items-center justify-center select-none"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUpOrLeave}
                      onMouseLeave={handleMouseUpOrLeave}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleMouseUpOrLeave}
                    >
                      <img
                        src={selectedAvatar}
                        alt="Crop Avatar"
                        draggable={false}
                        className="max-w-none origin-center pointer-events-none"
                        style={{
                          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                          width: '128px',
                          height: '128px',
                          objectFit: 'cover'
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1 text-[10px] font-semibold text-neutral-400">
                        <span>Zoom</span>
                        <span>{Math.round(zoom * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
                      />
                      <p className="text-[10px] text-neutral-500 text-center">Drag image to center your face.</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFile(null);
                        setZoom(1);
                        setPanOffset({ x: 0, y: 0 });
                        setSelectedPresetIndex(0);
                        setSelectedAvatar(avatarPool[0]);
                      }}
                      className="w-full py-2 bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.04] text-neutral-300 hover:text-white rounded-xl text-[11px] font-semibold transition-all"
                    >
                      Use Presets / Choose Different Image
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Avatar Presets Grid */}
                    <div className="grid grid-cols-4 gap-2">
                      {avatarPool.map((src, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => {
                            setSelectedPresetIndex(idx);
                            setUploadedFile(null);
                            setSelectedAvatar(src);
                          }}
                          className={clsx(
                            "aspect-square rounded-xl overflow-hidden transition-all border",
                            selectedPresetIndex === idx && !uploadedFile 
                              ? "border-violet-500 ring-2 ring-violet-500/20 scale-95 opacity-100" 
                              : "border-white/[0.04] bg-white/[0.01] hover:border-white/20 opacity-70 hover:opacity-100"
                          )}
                        >
                          <img src={src} className="w-full h-full object-cover" alt="Preset Avatar" />
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 py-1">
                      <div className="h-px flex-1 bg-white/[0.06]" />
                      <span className="text-[9px] font-semibold text-neutral-600 uppercase tracking-widest">OR</span>
                      <div className="h-px flex-1 bg-white/[0.06]" />
                    </div>

                    {/* Upload Trigger */}
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/[0.06] hover:bg-white/[0.03] hover:border-white/[0.1] transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center text-neutral-400 group-hover:text-white transition-all">
                          <Camera size={16} strokeWidth={1.5} />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold text-white/90">Upload custom photo</p>
                          <p className="text-[10px] text-neutral-500 truncate max-w-[200px] mt-0.5">
                            PNG, JPG, or WEBP
                          </p>
                        </div>
                      </div>
                      <Upload size={14} className="text-neutral-500 group-hover:text-white transition-colors" />
                    </button>
                  </>
                )}

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  hidden 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadedFile(file);
                      setZoom(1);
                      setPanOffset({ x: 0, y: 0 });
                      setSelectedPresetIndex(null);
                      setSelectedAvatar(URL.createObjectURL(file));
                    }
                  }}
                />

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 bg-white/[0.03] border border-white/[0.08] text-white/90 rounded-xl font-semibold text-xs hover:bg-white/[0.06] transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-[2] py-3 bg-violet-600/90 hover:bg-violet-600 text-white rounded-xl font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition-all active:scale-[0.985] shadow-lg shadow-violet-500/10 border border-violet-400/20"
                  >
                    Continue <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Banner Setup */}
            {step === 3 && (
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-5"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Step 3 of 4</span>
                  <h1 className="text-lg font-bold tracking-tight text-white">Choose a cover banner</h1>
                  <p className="text-neutral-400 text-xs">Set a profile background from presets or upload yours.</p>
                </div>

                {/* Banner Workspace */}
                {uploadedBannerFile ? (
                  <div className="space-y-4 py-1">
                    {/* Viewport for Banner */}
                    <div 
                      className="relative w-full h-24 rounded-xl overflow-hidden border border-white/20 bg-neutral-900 cursor-move shadow-inner flex items-center justify-center select-none"
                      onMouseDown={handleBannerMouseDown}
                      onMouseMove={handleBannerMouseMove}
                      onMouseUp={handleBannerMouseUpOrLeave}
                      onMouseLeave={handleBannerMouseUpOrLeave}
                      onTouchStart={handleBannerTouchStart}
                      onTouchMove={handleBannerTouchMove}
                      onTouchEnd={handleBannerMouseUpOrLeave}
                    >
                      <img 
                        src={selectedBanner} 
                        className="max-w-none origin-center pointer-events-none" 
                        style={{
                          transform: `translate(${bannerPanOffset.x}px, ${bannerPanOffset.y}px) scale(${bannerZoom})`,
                          width: '384px',
                          height: '96px',
                          objectFit: 'cover'
                        }}
                        alt="Cover preview" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                      <span className="absolute bottom-2 left-3 text-[9px] font-semibold uppercase tracking-wider text-white/60 pointer-events-none">
                        Drag to adjust banner
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1 text-[10px] font-semibold text-neutral-400">
                        <span>Zoom</span>
                        <span>{Math.round(bannerZoom * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.05"
                        value={bannerZoom}
                        onChange={(e) => setBannerZoom(parseFloat(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setUploadedBannerFile(null);
                        setBannerZoom(1);
                        setBannerPanOffset({ x: 0, y: 0 });
                        setSelectedBannerIndex(0);
                        setSelectedBanner(bannerPresets[0].url);
                      }}
                      className="w-full py-2 bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.04] text-neutral-300 hover:text-white rounded-xl text-[11px] font-semibold transition-all"
                    >
                      Use Presets / Choose Different Image
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Live Preview for presets */}
                    <div className="relative w-full h-24 rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.01]">
                      <img 
                        src={selectedBanner} 
                        className="w-full h-full object-cover" 
                        alt="Cover preview" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <span className="absolute bottom-2.5 left-3 text-[9px] font-semibold uppercase tracking-wider text-white/60">
                        Live Banner Preview
                      </span>
                    </div>

                    {/* Banner Presets */}
                    <div className="grid grid-cols-2 gap-2">
                      {bannerPresets.map((preset, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => {
                            setSelectedBannerIndex(idx);
                            setUploadedBannerFile(null);
                            setSelectedBanner(preset.url);
                          }}
                          className={clsx(
                            "h-12 rounded-xl overflow-hidden relative transition-all border",
                            selectedBannerIndex === idx && !uploadedBannerFile 
                              ? "border-violet-500 ring-2 ring-violet-500/20 scale-[0.98]" 
                              : "border-white/[0.04] bg-white/[0.01] hover:border-white/20 opacity-70 hover:opacity-100"
                          )}
                        >
                          <img src={preset.url} className="w-full h-full object-cover" alt={preset.name} />
                          <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-white tracking-wider uppercase">{preset.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 py-1">
                      <div className="h-px flex-1 bg-white/[0.06]" />
                      <span className="text-[9px] font-semibold text-neutral-600 uppercase tracking-widest">OR</span>
                      <div className="h-px flex-1 bg-white/[0.06]" />
                    </div>

                    {/* Banner Upload */}
                    <button 
                      type="button"
                      onClick={() => bannerFileInputRef.current?.click()}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/[0.06] hover:bg-white/[0.03] hover:border-white/[0.1] transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center text-neutral-400 group-hover:text-white transition-all">
                          <ImageIcon size={16} strokeWidth={1.5} />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold text-white/90">Upload custom banner</p>
                          <p className="text-[10px] text-neutral-500 truncate max-w-[200px] mt-0.5">
                            Landscape image
                          </p>
                        </div>
                      </div>
                      <Upload size={14} className="text-neutral-500 group-hover:text-white transition-colors" />
                    </button>
                  </>
                )}

                <input 
                  type="file" 
                  ref={bannerFileInputRef} 
                  hidden 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadedBannerFile(file);
                      setBannerZoom(1);
                      setBannerPanOffset({ x: 0, y: 0 });
                      setSelectedBannerIndex(null);
                      setSelectedBanner(URL.createObjectURL(file));
                    }
                  }}
                />

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 py-3 bg-white/[0.03] border border-white/[0.08] text-white/90 rounded-xl font-semibold text-xs hover:bg-white/[0.06] transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="flex-[2] py-3 bg-violet-600/90 hover:bg-violet-600 text-white rounded-xl font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition-all active:scale-[0.985] shadow-lg shadow-violet-500/10 border border-violet-400/20"
                  >
                    Continue <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Details Setup (Display Name, Bio) */}
            {step === 4 && (
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-5"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Step 4 of 4</span>
                  <h1 className="text-lg font-bold tracking-tight text-white">Add profile details</h1>
                  <p className="text-neutral-400 text-xs">Establish your visible display identity.</p>
                </div>

                <div className="space-y-4">
                  {/* Display Name */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest px-0.5">Display Name</label>
                    <input 
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Shubh"
                      className="w-full bg-white/[0.01] border border-white/[0.08] rounded-xl px-3.5 py-3 text-white text-xs focus:outline-none focus:border-violet-500 focus:bg-white/[0.03] transition-all placeholder:text-neutral-700 font-medium"
                    />
                  </div>

                  {/* Bio */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest px-0.5">Bio (Optional)</label>
                    <textarea 
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      placeholder="Share a snippet about yourself..."
                      className="w-full bg-white/[0.01] border border-white/[0.08] rounded-xl px-3.5 py-3 text-white text-xs focus:outline-none focus:border-violet-500 focus:bg-white/[0.03] transition-all resize-none placeholder:text-neutral-700 font-medium"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] px-3.5 py-2.5 rounded-xl font-semibold">
                    {errorMsg}
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 py-3 bg-white/[0.03] border border-white/[0.08] text-white/90 rounded-xl font-semibold text-xs hover:bg-white/[0.06] transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={isSaving || !displayName}
                    className="flex-[2] py-3 bg-violet-600/90 hover:bg-violet-600 text-white rounded-xl font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-violet-500/10 border border-violet-400/20"
                  >
                    {isSaving ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <>Complete Setup <Check size={14} /></>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
