'use client';

import { useAppStore } from '@/lib/store';
import PostCard from '@/components/features/feed/PostCard';
import { Edit3, Share2, Camera, Calendar, Award, Grid, Bookmark, Save, Loader2, CheckCircle2, AlertCircle, Database, Settings, Grid3x3, FileText, Sparkles, Palette } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import EditProfileModal from '@/components/features/profile/EditProfileModal';
import { createClient } from '@/lib/supabase/client';
import { getDatabaseProfile } from './actionsCore';
import { uploadMedia } from '@/app/(main)/feed/upload';
import clsx from 'clsx';

function kFmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function ProfilePage() {
  const [tab, setTab] = useState<'posts' | 'saved' | 'awards'>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [bannerColor, setBannerColor] = useState<string>('purple');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { currentUser, updateProfile, syncStatus, setSyncStatus } = useAppStore();
  // FIX 8: Memoize Supabase client — prevents new client+WebSocket per render cycle
  const supabase = useMemo(() => createClient(), []);

  const THEME_PRESETS = [
    { id: 'purple', name: 'Nebula Core',  gradient: 'linear-gradient(135deg, #2D1B69 0%, #1a1040 40%, #0a2060 100%)', badge: 'DEFAULT' },
    { id: 'fuchsia', name: 'Cyberpunk', gradient: 'linear-gradient(135deg, #701a75 0%, #4a044e 40%, #1c1917 100%)', badge: 'PREMIUM' },
    { id: 'obsidian', name: 'Obsidian Void', gradient: 'linear-gradient(135deg, #09090b 0%, #000000 50%, #09090b 100%)', badge: 'ELITE' },
    { id: 'teal', name: 'Quantum Matrix',  gradient: 'linear-gradient(135deg, #134e4a 0%, #042f2e 40%, #0f172a 100%)' },
    { id: 'rose', name: 'Crimson Dawn',    gradient: 'linear-gradient(135deg, #881337 0%, #4c0519 40%, #1c1917 100%)' },
    { id: 'orange', name: 'Solar Flare',   gradient: 'linear-gradient(135deg, #9a3412 0%, #7c2d12 40%, #1c1917 100%)' }
  ];
  const getCurrentGradient = () => THEME_PRESETS.find(t => t.id === bannerColor)?.gradient || THEME_PRESETS[0].gradient;

  const handleVerifySync = async () => {
    if (!currentUser?.id) return;
    setSyncStatus('syncing');
    const result = await getDatabaseProfile(currentUser.id);
    if (result.success && result.data) {
      if (result.data.avatar_url === currentUser.avatar) {
        setSyncStatus('idle'); // Actual confirmed success
        alert('✅ Sync Verified: Your database state matches your local state. The world sees exactly what you see.');
      } else {
        setSyncStatus('error');
        alert('⚠️ Sync Desync Detected: Database has OLD avatar. Attempting forced re-sync...');
        updateProfile({ avatar: currentUser.avatar }); // Trigger re-sync
      }
    } else {
      setSyncStatus('error');
      alert(`❌ Sync Check Failed: ${result.error}`);
    }
  };

  const handleAvatarUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    
    setSyncStatus('syncing');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'avatars');
    
    const result = await uploadMedia(fd);
    if ('error' in result) {
      console.error('Avatar upload error:', result.error);
      return;
    }
    updateProfile({ avatar: result.url });
  };

  // Fetch only THIS user's posts from DB
  useEffect(() => {
    if (!currentUser?.id) return;
    const user = currentUser!; // narrowed: we checked id above
    async function loadPosts() {
      setLoadingPosts(true);
      const { data } = await supabase
        .from('posts')
        .select('*, author:users(*)')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        const formatted = data.map((dbPost: any) => ({
          id: dbPost.id,
          content: dbPost.content,
          mediaUrls: dbPost.media_urls || [],
          likeCount: dbPost.like_count || 0,
          commentCount: dbPost.comment_count || 0,
          shareCount: dbPost.share_count || 0,
          createdAt: dbPost.created_at,
          author: {
            id: dbPost.author?.id,
            username: dbPost.author?.username || user.username,
            displayName: dbPost.author?.display_name || user.displayName,
            avatar: dbPost.author?.avatar_url || user.avatar,
            role: dbPost.author?.role || 'PUBLIC',
          },
        }));
        setUserPosts(formatted);
      }
      setLoadingPosts(false);
    }
    loadPosts();
  }, [currentUser?.id, supabase]);

  if (!currentUser) return null;

  return (
    <div className="space-y-0 animate-fade-in relative pb-12">
      {isEditing && (
        <EditProfileModal onClose={() => setIsEditing(false)} />
      )}

      {/* Hidden avatar file input */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleAvatarUpload(e.target.files)}
        aria-label="Upload avatar"
      />
            {/* Global Sync Status Badge */}
            {syncStatus !== 'idle' && (
              <div className={clsx(
                "absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border backdrop-blur-md shadow-lg transition-all animate-in fade-in slide-in-from-top-2",
                syncStatus === 'syncing' && "bg-amber-500/10 border-amber-500/50 text-amber-300",
                syncStatus === 'error' && "bg-red-500/10 border-red-500/50 text-red-300"
              )}>
                {syncStatus === 'syncing' ? (
                  <>
                    <Loader2 size={10} className="animate-spin" />
                    Syncing to DB...
                  </>
                ) : (
                  <>
                    <AlertCircle size={10} />
                    Sync Failed
                  </>
                )}
              </div>
            )}

            {syncStatus === 'idle' && currentUser && (
               <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border bg-emerald-500/10 border-emerald-500/50 text-emerald-300 backdrop-blur-md shadow-lg transition-all animate-in fade-in slide-in-from-top-2">
                  <CheckCircle2 size={10} />
                  Synced to DB
               </div>
            )}

      {/* IG-style Profile Header */}
      <div className="pt-8 pb-4 px-4 sm:px-8 max-w-[800px] mx-auto">
        <div className="flex items-center gap-6 sm:gap-14 mb-6">
          {/* Avatar (Left) */}
          <div className="flex-shrink-0 relative group">
            <div className="p-1.5 rounded-full transition-all duration-1000 shadow-[0_0_30px_rgba(0,0,0,0.5)]" style={{ background: getCurrentGradient() }}>
              <div className="p-[4px] bg-background rounded-full relative overflow-hidden">
                <img
                  src={currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`}
                  alt={`${currentUser.displayName}'s avatar`}
                  className="w-[88px] h-[88px] sm:w-[150px] sm:h-[150px] rounded-full object-cover block transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`; }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                  <Camera size={32} className="text-white drop-shadow-lg scale-75 group-hover:scale-100 transition-transform duration-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Stats & Actions (Right) */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-4">
              
             <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white">
                {currentUser?.displayName || currentUser?.username}
              </h1>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white hover:bg-white/10 transition-all"
                >
                  <Edit3 size={16} /> Edit Profile
                </button>
                <button 
                   onClick={handleVerifySync}
                   title="Force Verify Sync"
                   className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-white/40 hover:text-white transition-all hover:bg-white/10"
                >
                  <Database size={16} />
                </button>
              </div>
            </div>
              
              {/* Desktop Actions */}
              <div className="hidden sm:flex items-center gap-2 relative z-20">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl text-[14px] font-bold tracking-wide hover:bg-white/10 transition flex items-center gap-2 shadow-lg backdrop-blur-md"
                >
                  <Palette size={16} /> Theme Override
                </button>
              </div>
            </div>

            {/* Futuristic Theme Picker Panel (Desktop) */}
            {showColorPicker && (
              <div className="absolute top-[220px] right-8 grid grid-cols-2 gap-3 w-80 p-4 rounded-2xl shadow-2xl animate-fade-in border border-outline-variant/30 z-[100]"
                style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)' }}>
                <div className="col-span-2 flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Select Visual Signature</h4>
                  <button onClick={() => setShowColorPicker(false)} className="opacity-50 hover:opacity-100 text-xs">✕</button>
                </div>
                {THEME_PRESETS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setBannerColor(t.id); setShowColorPicker(false); }}
                    className="relative text-left p-3 rounded-xl border transition-all duration-300 group overflow-hidden"
                    style={{
                      borderColor: bannerColor === t.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      background: 'rgba(0,0,0,0.2)'
                    }}
                  >
                    <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity" style={{ background: t.gradient }} />
                    <div className="relative z-10 flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-white uppercase tracking-wider">{t.name}</span>
                      {t.badge && <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/10 text-white w-max">{t.badge}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Desktop Stats */}
            <div className="hidden sm:flex items-center gap-10 mb-4 text-[15px]">
              <div><span className="font-semibold text-on-surface">{userPosts.length}</span> posts</div>
              <div><span className="font-semibold text-on-surface">{kFmt(currentUser.followerCount ?? 0)}</span> followers</div>
              <div><span className="font-semibold text-on-surface">{kFmt(currentUser.followingCount ?? 0)}</span> following</div>
            </div>

            {/* Desktop Bio */}
            <div className="hidden sm:block">
              <div className="font-bold text-[15px] mb-1 text-on-surface">{currentUser.displayName}</div>
              <p className="text-[15px] whitespace-pre-wrap text-on-surface leading-snug">
                {currentUser.bio || "You haven't written a bio yet."}
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Bio */}
        <div className="sm:hidden px-2 mb-4">
          <div className="font-bold text-[14px] mb-1 text-on-surface">{currentUser.displayName}</div>
          <p className="text-[14px] whitespace-pre-wrap text-on-surface leading-snug">
            {currentUser.bio || "You haven't written a bio yet."}
          </p>
        </div>

        {/* Mobile Stats */}
        <div className="sm:hidden flex items-center justify-around py-3 mb-2 border-t border-outline-variant/30 text-[14px]">
          <div className="text-center flex flex-col"><span className="font-bold text-on-surface">{userPosts.length}</span> <span className="text-on-surface-variant text-[13px]">posts</span></div>
          <div className="text-center flex flex-col"><span className="font-bold text-on-surface">{kFmt(currentUser.followerCount ?? 0)}</span> <span className="text-on-surface-variant text-[13px]">followers</span></div>
          <div className="text-center flex flex-col"><span className="font-bold text-on-surface">{kFmt(currentUser.followingCount ?? 0)}</span> <span className="text-on-surface-variant text-[13px]">following</span></div>
        </div>

        {/* Mobile Actions */}
        <div className="sm:hidden flex items-center gap-2 mb-6">
          <button
            onClick={() => setIsEditing(true)}
            className="flex-1 py-1.5 bg-surface-variant text-on-surface rounded-lg text-sm font-semibold transition"
          >
            Edit Profile
          </button>
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="px-4 py-1.5 bg-surface-variant text-on-surface rounded-lg text-sm font-semibold transition"
          >
            <Palette size={16} />
          </button>
        </div>
        {/* Mobile color picker dropdown */}
        {showColorPicker && (
          <div className="sm:hidden grid grid-cols-2 gap-3 p-4 mb-4 rounded-xl shadow-2xl animate-fade-in border border-outline-variant/30 z-[100]"
            style={{ background: 'rgba(20,20,30,0.95)', backdropFilter: 'blur(12px)' }}>
            <div className="col-span-2 flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Visual Theme</span>
            </div>
            {THEME_PRESETS.map((t) => (
              <button
                key={t.id}
                onClick={() => { setBannerColor(t.id); setShowColorPicker(false); }}
                className="relative text-left p-2 rounded-xl border transition-all duration-300 group overflow-hidden"
                style={{
                  borderColor: bannerColor === t.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                  background: 'rgba(0,0,0,0.2)'
                }}
              >
                <div className="absolute inset-0 opacity-20" style={{ background: t.gradient }} />
                <span className="relative z-10 text-[10px] font-bold text-white uppercase tracking-wider">{t.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-t border-outline-variant/30 justify-center max-w-[900px] mx-auto gap-4 sm:gap-12">
        {([
          { key: 'posts', label: 'POSTS', icon: Grid3x3 },
          { key: 'saved', label: 'SAVED', icon: Bookmark },
          { key: 'awards', label: 'AWARDS', icon: Award },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-2 sm:px-4 py-4 text-[12px] sm:text-[13px] font-bold uppercase tracking-wider relative transition-colors focus-visible:outline-none ${tab === key ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            style={tab === key ? { color: 'var(--text-primary)' } : {}}
          >
            <Icon size={14} />
            {label}
            {tab === key && <span className="absolute top-0 left-0 right-0 h-[2px] bg-primary transition-all" />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-[900px] mx-auto min-h-[400px]">
        {tab === 'posts' && (
          loadingPosts ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-primary-light border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            </div>
          ) : userPosts.length === 0 ? (
            <div className="p-12 mt-12 text-center flex flex-col items-center">
              <div className="w-20 h-20 rounded-full border-2 border-outline-variant/50 flex items-center justify-center mb-6">
                <Sparkles size={32} className="text-on-surface-variant opacity-40" />
              </div>
              <p className="font-bold text-[18px] text-on-surface mb-2">No Posts Yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 sm:gap-4 mt-1">
              {userPosts.map((p) => {
                const mainMedia = p.mediaUrls && p.mediaUrls.length > 0 ? p.mediaUrls[0] : null;
                return (
                  <div key={p.id} className="aspect-square bg-surface-variant relative group overflow-hidden cursor-pointer" onClick={() => window.location.href = `/feed/${p.id}`}>
                    {mainMedia ? (
                      <img src={mainMedia} alt="thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex p-3 items-center justify-center text-[10px] sm:text-[14px] break-words text-center font-medium opacity-80">
                        {p.content.slice(0, 100)}{p.content.length > 100 ? '...' : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
        {tab === 'saved' && (
          <div className="p-12 mt-12 text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-full border-2 border-outline-variant/50 flex items-center justify-center mb-6">
              <Bookmark size={32} className="text-on-surface-variant opacity-40" />
            </div>
            <p className="font-bold text-[18px] text-on-surface mb-2">Saved posts coming soon</p>
          </div>
        )}
        {tab === 'awards' && (
          <div className="p-12 mt-12 text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-full border-2 border-outline-variant/50 flex items-center justify-center mb-6">
              <div className="text-4xl">🏆</div>
            </div>
            <p className="font-bold text-[18px] text-on-surface mb-2">Awards & Achievements</p>
            <p className="text-[14px] text-on-surface-variant">Community recognition coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
