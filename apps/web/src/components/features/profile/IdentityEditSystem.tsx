'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { X, Camera, Loader2, Check, Shield, AtSign, AlignLeft, Lock, Globe } from 'lucide-react';
import { uploadMedia } from '@/app/(main)/feed/upload';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function IdentityEditSystem({ isOpen, onClose }: Props) {
  const { currentUser, updateProfile } = useAppStore();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      setDisplayName(currentUser.displayName || '');
      setUsername(currentUser.username?.toLowerCase() || '');
      setBio(currentUser.bio || '');
      setAvatar(currentUser.avatar || '');
      setIsPrivate(currentUser.isPrivate || false);
      setSelectedFile(null);
      setErrorMsg('');
      setSavedOk(false);
    }
  }, [isOpen, currentUser]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setAvatar(URL.createObjectURL(file));
  };

  const validateAndSave = async () => {
    if (username.length < 3) {
      setErrorMsg('Username is too short');
      return;
    }

    setIsSaving(true);
    let finalAvatar = avatar;

    if (selectedFile) {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('folder', 'avatars');
      const result = await uploadMedia(fd);
      if ('error' in result) {
        setErrorMsg(`Upload failed: ${result.error}`);
        setIsSaving(false);
        return;
      }
      finalAvatar = result.url;
    }

    updateProfile({ displayName, username, bio, avatar: finalAvatar, isPrivate });

    await new Promise((r) => setTimeout(r, 800));
    setIsSaving(false);
    setSavedOk(true);

    setTimeout(() => {
      setSavedOk(false);
      onClose();
    }, 1000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed inset-0 z-[100] bg-[#0A0A0A] flex flex-col md:max-w-xl md:mx-auto md:my-10 md:rounded-3xl md:border md:border-white/10 md:shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <button
              onClick={onClose}
              className="p-2 -ml-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-[15px] font-bold tracking-tight text-white/90">Identity Engine</h2>
            <div className="w-10" /> {/* Spacer */}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="px-6 py-8 space-y-10">
              
              {/* Identity Snapshot (Live Preview) */}
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-white/5 lux-shadow bg-neutral-900"
                  >
                    <img
                      src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-9 h-9 bg-white text-black rounded-full flex items-center justify-center border-4 border-[#0A0A0A] shadow-xl hover:scale-110 active:scale-90 transition-transform"
                  >
                    <Camera size={16} />
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                <div className="text-center space-y-1">
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {displayName || 'Digital Soul'}
                  </h3>
                  <p className="text-sm text-white/40 font-medium">@{username || 'identity'}</p>
                </div>
              </div>

              {/* Vertical Flow Fields */}
              <div className="space-y-6">
                <IdentityField 
                  icon={Shield} 
                  label="Display Name" 
                  value={displayName} 
                  onChange={setDisplayName} 
                  placeholder="The name others see"
                />
                
                <IdentityField 
                  icon={AtSign} 
                  label="Username" 
                  value={username} 
                  onChange={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_.]/g, ''))} 
                  placeholder="Unique ID"
                />

                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <AlignLeft size={14} className="text-white/30" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-white/30">Bio</span>
                  </div>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell your story..."
                    rows={4}
                    maxLength={160}
                    className="w-full bg-white/[0.03] text-white text-[15px] rounded-2xl p-4 border border-white/[0.06] focus:border-white/20 focus:outline-none transition-all resize-none leading-relaxed placeholder:text-white/10"
                  />
                  <div className="flex justify-end px-1">
                    <span className="text-[10px] font-medium text-white/20">{bio.length}/160</span>
                  </div>
                </div>

                {/* Privacy Control */}
                <div className="space-y-2">
                   <div className="flex items-center gap-2 px-1">
                    <Lock size={14} className="text-white/30" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-white/30">Privacy</span>
                  </div>
                  <button
                    onClick={() => setIsPrivate(!isPrivate)}
                    className="w-full flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/[0.06] hover:bg-white/[0.05] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors ${isPrivate ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40'}`}>
                        {isPrivate ? <Lock size={16} /> : <Globe size={16} />}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-white/90">
                          {isPrivate ? 'Sovereign Account' : 'Global Account'}
                        </p>
                        <p className="text-xs text-white/30">
                          {isPrivate ? 'Only followers see activity' : 'Your identity is public'}
                        </p>
                      </div>
                    </div>
                    <div className={`w-10 h-6 rounded-full relative transition-colors ${isPrivate ? 'bg-white' : 'bg-white/10'}`}>
                      <motion.div 
                        animate={{ x: isPrivate ? 20 : 4 }}
                        className={`absolute top-1 w-4 h-4 rounded-full ${isPrivate ? 'bg-black' : 'bg-white/40'}`}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </button>
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-400 font-medium px-1 flex items-center gap-2">
                  <Check size={12} className="rotate-45" />
                  {errorMsg}
                </p>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-6 border-t border-white/[0.06] bg-[#0A0A0A]">
            <button
              onClick={validateAndSave}
              disabled={isSaving || savedOk}
              className="w-full py-4 rounded-2xl bg-white text-black text-[15px] font-bold hover:bg-neutral-200 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl"
            >
              {isSaving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Syncing Identity...
                </>
              ) : savedOk ? (
                <>
                  <Check size={18} />
                  Identity Secured
                </>
              ) : (
                'Confirm Changes'
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function IdentityField({ 
  icon: Icon, 
  label, 
  value, 
  onChange, 
  placeholder 
}: { 
  icon: any; 
  label: string; 
  value: string; 
  onChange: (v: string) => void; 
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Icon size={14} className="text-white/30" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-white/30">{label}</span>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/[0.03] text-white text-[15px] rounded-2xl px-4 py-4 border border-white/[0.06] focus:border-white/20 focus:outline-none transition-all placeholder:text-white/10"
      />
    </div>
  );
}
