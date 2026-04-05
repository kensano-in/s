'use client';

import { useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { X, Camera, Save, TerminalSquare, Lock } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  onClose: () => void;
}

export default function EditProfileModal({ onClose }: Props) {
  const { currentUser, updateProfile, setCustomThemeManifest } = useAppStore();
  
  // Local React state before pushing global mutation
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [isPrivate, setIsPrivate] = useState(currentUser?.isPrivate || false);
  const [errorMsg, setErrorMsg] = useState('');
  const [manifestText, setManifestText] = useState('');

  const isPrime = currentUser?.role === 'PRIME';

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      setAvatar(localUrl);
    }
  };

  const handleSave = () => {
    // 1. Strict Namespace Deterministic Logic
    if (!isPrime && username.length < 5) {
      setErrorMsg('Namespace Access Denied: PUBLIC accounts require min_length: 5. Please contact Administrator for Elite access override.');
      return;
    }

    // Perform Shadow-DOM Optimistic UI Save 
    updateProfile({
      displayName,
      username,
      bio,
      avatar,
      isPrivate
    });

    if (manifestText.trim()) {
      try {
        const manifest = JSON.parse(manifestText);
        setCustomThemeManifest(manifest);
      } catch (e) {
        // Discard silently if bad JSON
      }
    }
    
    // (A silent async API call would trigger here requesting true DB sync, auto-retrying on fail)
    
    onClose();
  };

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
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <h2 className="text-lg font-display font-bold text-on-surface">Edit Profile</h2>
          <button onClick={onClose} className="icon-btn text-on-surface-variant hover:text-on-surface">
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} 
                alt="Avatar Preview" 
                className="w-24 h-24 rounded-full object-cover border-4 border-surface-lowest shadow-ambient group-hover:opacity-50 transition-all duration-300"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <Camera size={24} className="text-white drop-shadow-lg" />
              </div>
            </div>
            
            <div className="w-full mt-4">
              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1 block">Avatar Image URL</label>
              <input 
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="w-full bg-surface-low text-on-surface rounded-xl px-4 py-2 border border-outline-variant/10 focus:ring-1 focus:ring-primary-light"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1 block">Display Name</label>
            <input 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-surface-low text-on-surface rounded-xl px-4 py-2 border border-outline-variant/10 focus:ring-1 focus:ring-primary-light"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1 block">
              Username {isPrime && <span className="text-secondary-light font-bold text-[9px] px-1 ml-2 bg-secondary-dark/30 rounded border border-secondary-DEFAULT/30">ELITE GATEWAY BYPASS</span>}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-medium">@</span>
              <input 
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full bg-surface-low text-on-surface rounded-xl py-2 pl-9 pr-4 border border-outline-variant/10 focus:ring-1 focus:ring-primary-light"
              />
            </div>
            {errorMsg && (
              <p className="mt-2 text-xs text-error font-medium animate-fade-in">{errorMsg}</p>
            )}
          </div>

          <div>
            <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1 block">Bio / Status</label>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full bg-surface-low text-on-surface rounded-xl px-4 py-2 border border-outline-variant/10 focus:ring-1 focus:ring-primary-light resize-none"
            />
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between p-4 bg-surface-low rounded-xl border border-outline-variant/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-lowest flex items-center justify-center text-primary-light border border-outline-variant/10 shadow-ambient">
                <Lock size={18} />
              </div>
              <div>
                <div className="text-[13px] font-bold text-on-surface">Private Account</div>
                <div className="text-[11px] text-on-surface-variant max-w-[200px] leading-tight mt-0.5">When your account is private, only people you approve can see your photos and videos.</div>
              </div>
            </div>
            <button 
              onClick={() => setIsPrivate(!isPrivate)}
              className={clsx(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out custom-focus-ring flex-shrink-0 focus-visible:ring-primary-light",
                isPrivate ? "bg-primary" : "bg-surface-highest border border-outline-variant/30"
              )}
              role="switch"
              aria-checked={isPrivate}
            >
              <span className={clsx("inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out shadow-sm", isPrivate ? "translate-x-6" : "translate-x-1")} />
            </button>
          </div>

          {/* Unhinged Visual Sovereignty Override */}
          <div className="mt-4 p-4 border border-primary-dark/40 bg-primary-dark/10 rounded-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary-light/50 to-transparent opacity-50" />
            <div className="flex items-center gap-2 mb-2">
              <TerminalSquare className="w-4 h-4 text-primary-light" />
              <label className="text-[11px] font-bold text-primary-light uppercase tracking-wider">Sovereign JSON CSS Override</label>
            </div>
            <p className="text-[10px] text-on-surface-variant mb-2">
              WARNING: Unhinged Access. Inject raw CSS variables into the `:root` OM. (e.g., <code className="text-secondary-light bg-black px-1 rounded">{`{"primary": "#ff00ff"}`}</code>). Use <kbd className="font-mono bg-black rounded px-1">ESC x3</kbd> to execute Obsidian Fallback if the UI breaks.
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
        <div className="p-4 border-t border-outline-variant/10 bg-surface-highest flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-low transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-primary-gradient shadow-[0_0_20px_rgba(208,188,255,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Save size={16} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
