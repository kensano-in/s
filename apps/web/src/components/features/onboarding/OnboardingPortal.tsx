'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Check, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  User, 
  Upload,
  Loader2
} from 'lucide-react';
import { uploadMedia } from '@/app/(main)/feed/upload';
import { createClient } from '@/lib/supabase/client';
import clsx from 'clsx';

const MALE_AVATARS = [
  '/avatars/m_hoodie.png',
  '/avatars/m_sunglasses.png',
  '/avatars/m_sparkles.png',
  '/avatars/m_suit.png',
];

const FEMALE_AVATARS = [
  '/avatars/f_hoodie.png',
  '/avatars/f_sunglasses.png',
  '/avatars/f_sparkles.png',
  '/avatars/f_office.png',
];

export default function OnboardingPortal() {
  const { currentUser, updateProfile, setUser } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Detect if onboarding is needed
  useEffect(() => {
    if (currentUser && currentUser.createdAt) {
      const isNew = new Date(currentUser.createdAt).getTime() > Date.now() - 1000 * 60 * 60 * 24; // Created last 24h
      const hasOnboarded = (currentUser as any).metadata?.onboarded === true;
      
      if (!hasOnboarded) {
        setIsOpen(true);
        setSelectedAvatar(currentUser.avatar || '');
        setDisplayName(currentUser.displayName || '');
      }
    }
  }, [currentUser]);

  const gender = (currentUser as any)?.metadata?.gender || 'other';
  const avatarPool = gender === 'female' ? FEMALE_AVATARS : MALE_AVATARS;

  const handleComplete = async () => {
    if (!currentUser) return;
    setIsSaving(true);

    try {
      let finalAvatar = selectedAvatar;

      // 1. Handle custom upload if present
      if (uploadedFile) {
        const fd = new FormData();
        fd.append('file', uploadedFile);
        fd.append('folder', 'avatars');
        const result = await uploadMedia(fd);
        if ('url' in result) {
          finalAvatar = result.url;
        }
      }

      // 2. Update DB
      const { error } = await supabase
        .from('users')
        .update({
          display_name: displayName,
          bio: bio,
          avatar_url: finalAvatar,
          metadata: { 
            ...(currentUser as any).metadata, 
            onboarded: true 
          }
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      // 3. Update Local Store
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
    } catch (err) {
      console.error('Onboarding update failed:', err);
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
          className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        />

        {/* Portal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-[#0D0D0D] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
        >
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
            <motion.div 
              className="h-full bg-white" 
              initial={{ width: '50%' }}
              animate={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>

          <div className="p-8 md:p-12">
            {step === 1 ? (
              <div className="space-y-8">
                <div className="space-y-2">
                  <div className="bg-white/10 w-fit px-3 py-1 rounded-full flex items-center gap-2">
                    <Sparkles size={14} className="text-white" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white">Identity Core</span>
                  </div>
                  <h1 className="text-3xl font-bold tracking-tighter text-white">Choose your shadow.</h1>
                  <p className="text-white/40 text-sm">Pick a Noir token or upload a custom identity.</p>
                </div>

                {/* Avatar Scramble Selector */}
                <div className="grid grid-cols-4 gap-4">
                  {avatarPool.map((src) => (
                    <button
                      key={src}
                      onClick={() => {
                        setSelectedAvatar(src);
                        setUploadedFile(null);
                      }}
                      className={clsx(
                        "aspect-square rounded-2xl overflow-hidden border-2 transition-all p-1",
                        selectedAvatar === src && !uploadedFile ? "border-white bg-white/10" : "border-white/5 hover:border-white/20 bg-white/[0.02]"
                      )}
                    >
                      <img src={src} className="w-full h-full object-cover rounded-xl" alt="Option" />
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-[10px] font-bold text-white/20 uppercase">Or</span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>

                {/* Upload Trigger */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/40 group-hover:text-white group-hover:bg-white/20 transition-all">
                      <Camera size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white/90">Upload Custom PFP</p>
                      <p className="text-xs text-white/30 truncate max-w-[200px]">
                        {uploadedFile ? uploadedFile.name : 'PNG, JPG or GIF'}
                      </p>
                    </div>
                  </div>
                  <Upload size={18} className="text-white/20" />
                </button>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  hidden 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadedFile(file);
                      setSelectedAvatar(URL.createObjectURL(file));
                    }
                  }}
                />

                <button
                  onClick={() => setStep(2)}
                  className="w-full py-4 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all active:scale-[0.98]"
                >
                  Next Step <ArrowRight size={18} />
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                 <div className="space-y-2">
                  <div className="bg-white/10 w-fit px-3 py-1 rounded-full flex items-center gap-2">
                    <ShieldCheck size={14} className="text-white" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white">Final Sync</span>
                  </div>
                  <h1 className="text-3xl font-bold tracking-tighter text-white">Refine your soul.</h1>
                  <p className="text-white/40 text-sm">How should the world address you?</p>
                </div>

                <div className="space-y-6">
                  {/* Display Name */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 px-1">
                      <User size={14} className="text-white/30" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Display Name</span>
                    </label>
                    <input 
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Satoshi"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-white/30 transition-all"
                    />
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 px-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Bio</span>
                    </label>
                    <textarea 
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      placeholder="Short and mysterious..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-white/30 transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                   <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 bg-white/5 text-white/60 rounded-2xl font-bold hover:bg-white/10 transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={isSaving}
                    className="flex-[2] py-4 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>Initialize Identity <Check size={18} /></>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
