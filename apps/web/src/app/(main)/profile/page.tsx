'use client';

import { useAppStore } from '@/lib/store';
import PostCard from '@/components/features/feed/PostCard';
import { Camera, Settings, Grid3x3, FileText, Bookmark, Award, Sparkles, Palette } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import EditProfileModal from '@/components/features/profile/EditProfileModal';
import { createClient } from '@/lib/supabase/client';
import { uploadMedia } from '@/app/(main)/feed/upload';

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
  // Banner color state — user can pick a gradient preset
  const [bannerColor, setBannerColor] = useState<string>('purple');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { currentUser, updateProfile } = useAppStore();
  // FIX 8: Memoize Supabase client — prevents new client+WebSocket per render cycle
  const supabase = useMemo(() => createClient(), []);

  const BANNER_GRADIENTS: Record<string, string> = {
    purple: 'linear-gradient(135deg, #2D1B69 0%, #1a1040 40%, #0a2060 100%)',
    violet: 'linear-gradient(135deg, #4c1d95 0%, #2e1065 50%, #1e1b4b 100%)',
    rose: 'linear-gradient(135deg, #881337 0%, #4c0519 40%, #1c1917 100%)',
    teal: 'linear-gradient(135deg, #134e4a 0%, #042f2e 40%, #0f172a 100%)',
    amber: 'linear-gradient(135deg, #78350f 0%, #451a03 40%, #1c1917 100%)',
    slate: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #020617 100%)',
    emerald: 'linear-gradient(135deg, #064e3b 0%, #022c22 40%, #0f172a 100%)',
    fuchsia: 'linear-gradient(135deg, #701a75 0%, #4a044e 40%, #1c1917 100%)',
    cyan: 'linear-gradient(135deg, #164e63 0%, #083344 40%, #0f172a 100%)',
    orange: 'linear-gradient(135deg, #9a3412 0%, #7c2d12 40%, #1c1917 100%)',
    crimson: 'linear-gradient(135deg, #9f1239 0%, #881337 40%, #1c1917 100%)',
    obsidian: 'linear-gradient(135deg, #09090b 0%, #000000 50%, #09090b 100%)',
  };

  const BANNER_LABELS: Record<string, string> = {
    purple: '#7C3AED', violet: '#8B5CF6', rose: '#E11D48',
    teal: '#0D9488', amber: '#D97706', slate: '#475569',
    emerald: '#10B981', fuchsia: '#D946EF', cyan: '#06B6D4',
    orange: '#F97316', crimson: '#E11D48', obsidian: '#18181B',
  };

  const handleAvatarUpload = async (files: FileList | null) => {
    if (!files || !files[0] || !currentUser) return;
    const file = files[0];
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

      {/* IG-style Profile Header */}
      <div className="pt-8 pb-4 px-4 sm:px-8 max-w-[800px] mx-auto">
        <div className="flex items-center gap-6 sm:gap-14 mb-6">
          {/* Avatar (Left) */}
          <div className="flex-shrink-0 relative">
            <div className="p-1 rounded-full transition-colors duration-500" style={{ background: BANNER_GRADIENTS[bannerColor] }}>
              <div className="p-[3px] bg-background rounded-full">
                <img
                  src={currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`}
                  alt={`${currentUser.displayName}'s avatar`}
                  className="w-[88px] h-[88px] sm:w-[150px] sm:h-[150px] rounded-full object-cover block cursor-pointer transition-opacity hover:opacity-90"
                  onClick={() => avatarInputRef.current?.click()}
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`; }}
                />
              </div>
            </div>
            {/* Camera icon over avatar */}
            <div className="absolute bottom-1 right-2 sm:bottom-4 sm:right-4 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 border-background cursor-pointer hover:scale-110 transition-transform shadow-lg"
                 style={{ background: 'var(--text-primary)' }}
                 onClick={() => avatarInputRef.current?.click()}>
              <Camera size={14} className="text-background" />
            </div>
          </div>

          {/* Stats & Actions (Right) */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-4">
              <h1 className="text-xl sm:text-2xl font-normal text-on-surface flex items-center gap-2">
                {currentUser.username}
                {currentUser.isVerified && (
                  <div className="verified-badge w-4 h-4 ml-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  </div>
                )}
              </h1>
              
              {/* Desktop Actions */}
              <div className="hidden sm:flex items-center gap-2 relative z-20">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-1.5 bg-surface-variant text-on-surface rounded-lg text-[14px] font-semibold hover:bg-surface-highest transition flex items-center gap-2"
                >
                  <Settings size={14} /> Edit Profile
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="px-3 py-1.5 bg-surface-variant text-on-surface rounded-lg text-[14px] font-semibold hover:bg-surface-highest transition flex items-center gap-2"
                  >
                    <Palette size={14} /> Theme
                  </button>
                  {showColorPicker && (
                    <div className="absolute top-10 right-0 grid grid-cols-4 gap-2 w-48 p-3 rounded-xl shadow-2xl animate-fade-in border border-outline-variant/30 z-[100]"
                      style={{ background: 'rgba(20,20,30,0.95)', backdropFilter: 'blur(12px)' }}>
                      {Object.entries(BANNER_LABELS).map(([key, hex]) => (
                        <button
                          key={key}
                          onClick={() => { setBannerColor(key); setShowColorPicker(false); }}
                          className="w-8 h-8 rounded-full transition-transform hover:scale-110 flex-shrink-0 relative overflow-hidden group"
                          style={{
                            background: BANNER_GRADIENTS[key],
                            outline: bannerColor === key ? `2px solid white` : '2px solid transparent',
                            outlineOffset: '2px',
                          }}
                          title={key}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

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
          <div className="sm:hidden grid grid-cols-6 gap-3 p-4 mb-4 rounded-xl shadow-2xl animate-fade-in border border-outline-variant/30 z-[100]"
            style={{ background: 'rgba(20,20,30,0.95)', backdropFilter: 'blur(12px)' }}>
            {Object.entries(BANNER_LABELS).map(([key, hex]) => (
              <button
                key={key}
                onClick={() => { setBannerColor(key); setShowColorPicker(false); }}
                className="w-8 h-8 rounded-full transition-transform hover:scale-110 flex-shrink-0"
                style={{ background: BANNER_GRADIENTS[key], outline: bannerColor === key ? `2px solid white` : '2px solid transparent', outlineOffset: '2px' }}
              />
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
