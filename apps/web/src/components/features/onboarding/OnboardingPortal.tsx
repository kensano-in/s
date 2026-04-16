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
  const [errorMsg, setErrorMsg] = useState('');

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
    setErrorMsg('');

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
          avatar_url: finalAvatar
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      // 2.5 Update Auth Metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          onboarded: true
        }
      });

      if (authError) throw authError;

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
                  <div className="bg-white/5 border border-white/10 w-fit px-3 py-1.5 rounded-full flex items-center gap-2">
                    <User size={14} className="text-white/70" />
                    <span className="text-[10px] font-medium uppercase tracking-widest text-white/70">Step 1 of 2</span>
                  </div>
                  <h1 className="text-3xl font-semibold tracking-tight text-white mb-1">Set up your profile</h1>
                  <p className="text-white/50 text-sm">Select an avatar or upload your own photo.</p>
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
                        "aspect-square rounded-[18px] overflow-hidden transition-all",
                        selectedAvatar === src && !uploadedFile 
                          ? "ring-2 ring-white ring-offset-2 ring-offset-[#0D0D0D] opacity-100" 
                          : "border border-white/10 hover:border-white/30 bg-white/[0.02] opacity-60 hover:opacity-100"
                      )}
                    >
                      <img src={src} className="w-full h-full object-cover" alt="Option" />
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">OR</span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>

                {/* Upload Trigger */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-between p-4 rounded-[18px] bg-[#141414] border border-white/10 hover:bg-[#1C1C1C] hover:border-white/20 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 group-hover:text-white transition-all">
                      <Camera size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-[14px] font-medium text-white/90">Upload Custom Photo</p>
                      <p className="text-[12px] text-white/40 truncate max-w-[200px] mt-0.5">
                        {uploadedFile ? uploadedFile.name : 'PNG, JPG or GIF'}
                      </p>
                    </div>
                  </div>
                  <Upload size={16} className="text-white/20 group-hover:text-white/60 transition-colors" />
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
                  className="w-full py-4 bg-white text-black rounded-xl font-medium tracking-wide flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all active:scale-[0.98]"
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                 <div className="space-y-2">
                  <div className="bg-white/5 border border-white/10 w-fit px-3 py-1.5 rounded-full flex items-center gap-2">
                    <User size={14} className="text-white/70" />
                    <span className="text-[10px] font-medium uppercase tracking-widest text-white/70">Step 2 of 2</span>
                  </div>
                  <h1 className="text-3xl font-semibold tracking-tight text-white mb-1">Profile Details</h1>
                  <p className="text-white/50 text-sm">Add your name and a brief bio.</p>
                </div>

                <div className="space-y-5">
                  {/* Display Name */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 px-1">
                      <span className="text-[11px] font-medium text-white/50">Display Name</span>
                    </label>
                    <input 
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3.5 text-white text-[15px] focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all placeholder:text-white/20"
                    />
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 px-1">
                      <span className="text-[11px] font-medium text-white/50">Bio (Optional)</span>
                    </label>
                    <textarea 
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      placeholder="Tell us a bit about yourself..."
                      className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3.5 text-white text-[15px] focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all resize-none placeholder:text-white/20"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[13px] px-4 py-3 rounded-xl font-medium">
                    {errorMsg}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                   <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 bg-white/5 text-white/60 rounded-xl font-medium hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={isSaving}
                    className="flex-[2] py-4 bg-white text-black rounded-xl font-medium tracking-wide flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>Complete Setup <Check size={16} /></>
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
