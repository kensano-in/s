'use client';

import { useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { X, Camera, Save, TerminalSquare, Lock, Loader2, Sparkles, ShieldCheck, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { uploadMedia } from '@/app/(main)/feed/upload';
import KineticIcon from '@/components/ui/KineticIcon';

interface Props {
  onClose: () => void;
  isOpen?: boolean;
}

export default function EditProfileModal({ onClose, isOpen = true }: Props) {
  const { currentUser, updateProfile, setCustomThemeManifest } = useAppStore();
  
  // Local React state before pushing global mutation
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [username, setUsername] = useState(currentUser?.username?.toLowerCase() || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPrivate, setIsPrivate] = useState(currentUser?.isPrivate || false);
  const [errorMsg, setErrorMsg] = useState('');
  const [manifestText, setManifestText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isPrime = currentUser?.role === 'PRIME';

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const localUrl = URL.createObjectURL(file);
      setAvatar(localUrl);
    }
  };

  const handleSave = async () => {
    if (username.endsWith('.')) {
      setErrorMsg("You can't end your username with a period.");
      return;
    }

    if (!isPrime && username.length < 5) {
      setErrorMsg('Username must be at least 5 characters long.');
      return;
    }

    setIsSaving(true);
    let finalAvatar = avatar;

    // 2. Perform Upload if file was selected
    if (selectedFile) {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('folder', 'avatars');
      
      const result = await uploadMedia(fd);
      if ('error' in result) {
        setErrorMsg(`Failed to upload avatar: ${result.error}`);
        setIsSaving(false);
        return;
      }
      finalAvatar = result.url;
    }

    // 3. Perform Shadow-DOM Optimistic UI Save 
    updateProfile({
      displayName,
      username,
      bio,
      avatar: finalAvatar,
      isPrivate
    });

    // 4. Force a small delay to ensure Sync Engine initiates the request
    // This prevents the ProfilePage's refresh-fetch from hitting stale data
    await new Promise(r => setTimeout(r, 800));

    if (manifestText.trim()) {
      try {
        const manifest = JSON.parse(manifestText);
        setCustomThemeManifest(manifest);
      } catch (e) {
        // Discard silently if bad JSON
      }
    }
    
    setIsSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background Blur Overlay */}
      <div 
        className="absolute inset-0 bg-surface-lowest/80 backdrop-blur-xl"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-surface-high border border-outline-variant/20 rounded-3xl shadow-ambient overflow-hidden animate-fade-in z-10 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex flex-col">
            <h2 className="text-lg font-black italic tracking-tighter text-white uppercase leading-none">Edit Profile</h2>
            <span className="text-[8px] font-black tracking-widest text-v-cyan uppercase mt-1">Profile Information Update</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-on-surface-variant hover:bg-white/5 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Avatar Edit Zone */}
          <div className="flex flex-col items-center justify-center mb-6 relative">
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange}
            />
            <div 
              className="relative group cursor-pointer"
              onClick={handleAvatarClick}
            >
              <div className="absolute -inset-2 border border-v-cyan/20 rounded-full animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'} 
                alt="Avatar Preview" 
                className="w-24 h-24 rounded-full object-cover border-4 border-surface-lowest shadow-ambient group-hover:opacity-50 transition-all duration-300 relative z-10"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                <KineticIcon icon={Camera} size={28} color="white" pulse glow />
              </div>
            </div>
            <div className="w-full mt-4 text-center">
              <label className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 block">
                Tap image to change avatar
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-wider mb-1 block italic">Display Name</label>
              <input 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-white/[0.03] text-white rounded-2xl px-6 py-3 border border-white/5 focus:ring-1 focus:ring-v-cyan font-bold italic transition-all"
              />
            </div>
  
            <div className="flex flex-col">
              <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-wider mb-1 block italic">
                Username {isPrime && <span className="text-v-violet font-black text-[9px] px-2 py-0.5 ml-2 bg-v-violet/10 rounded-full border border-v-violet/20">VERIFIED</span>}
              </label>
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-v-cyan font-black italic">@</span>
                <input 
                  value={username}
                  onChange={(e) => {
                    const raw = e.target.value.toLowerCase();
                    // Instagram rule: Only letters, numbers, underscores and periods
                    const filtered = raw.replace(/[^a-z0-9_.]/g, '');
                    
                    if (raw !== e.target.value || raw !== filtered) {
                      setErrorMsg("Usernames can only use letters, numbers, underscores and periods.");
                    } else {
                      setErrorMsg('');
                    }
                    setUsername(filtered);
                  }}
                  className="w-full bg-white/[0.03] text-white rounded-2xl py-3 pl-12 pr-6 border border-white/5 focus:ring-1 focus:ring-v-cyan font-bold italic transition-all"
                />
              </div>
              {errorMsg && (
                <p className="mt-2 text-[9px] text-rose-500 font-black uppercase tracking-widest animate-fade-in flex items-center gap-1">
                  <AlertTriangle size={10} /> {errorMsg}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1 block italic">Bio</label>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full bg-white/[0.03] text-white rounded-2xl px-6 py-4 border border-white/5 focus:ring-1 focus:ring-v-cyan font-medium italic transition-all resize-none"
            />
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between p-6 bg-white/[0.03] rounded-3xl border border-white/5 hover:bg-white/[0.05] transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center text-v-cyan shadow-xl transition-all group-hover:scale-110">
                <KineticIcon icon={Lock} size={20} color="var(--v-cyan)" pulse={isPrivate} />
              </div>
              <div>
                <div className="text-[13px] font-black text-white uppercase italic tracking-tighter">Private Account</div>
                <div className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest opacity-40 mt-1">Only followers can see your posts</div>
              </div>
            </div>
            <button 
              onClick={() => setIsPrivate(!isPrivate)}
              className={clsx(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300",
                isPrivate ? "bg-v-cyan shadow-[0_0_15px_var(--v-cyan)]" : "bg-white/10"
              )}
            >
              <span className={clsx("inline-block h-4 w-4 transform rounded-full bg-white transition duration-300 shadow-sm", isPrivate ? "translate-x-6" : "translate-x-1")} />
            </button>
          </div>

          {/* Unhinged Visual Sovereignty Override */}
          <div className="mt-4 p-4 border border-primary-dark/40 bg-primary-dark/10 rounded-3xl relative overflow-hidden group italic">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary-light/50 to-transparent opacity-50" />
            <div className="flex items-center gap-2 mb-2">
              <TerminalSquare className="w-4 h-4 text-primary-light" />
              <label className="text-[11px] font-bold text-primary-light uppercase tracking-wider">Custom Style (JSON)</label>
            </div>
            <p className="text-[10px] text-on-surface-variant mb-2 opacity-60">
              Advanced: Directly modify the interface styling using JSON design tokens. Use with caution.
            </p>
            <textarea 
              value={manifestText}
              onChange={(e) => setManifestText(e.target.value)}
              placeholder={`{\n  "primary": "#ff0000",\n  "surface-lowest": "transparent"\n}`}
              rows={4}
              className="w-full bg-black/50 text-emerald-400 font-mono text-[10px] rounded p-3 border border-outline-variant/5 focus:ring-1 focus:ring-emerald-400/50 resize-none transition-all"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 bg-black/40 flex justify-end gap-4 items-center">
          <div className="flex-1">
            {isSaving && <span className="text-[8px] font-black uppercase tracking-[0.4em] text-v-cyan animate-pulse">Saving changes...</span>}
          </div>
          <button 
            onClick={onClose}
            className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-3 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white bg-primary-gradient shadow-[0_15px_30px_rgba(108,99,255,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <KineticIcon icon={Save} size={16} color="white" />
            )}
            {isSaving ? 'SAVING...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
