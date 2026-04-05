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
  };

  const BANNER_LABELS: Record<string, string> = {
    purple: '#7C3AED', violet: '#8B5CF6', rose: '#E11D48',
    teal: '#0D9488', amber: '#D97706', slate: '#475569',
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
    <div className="space-y-0 animate-fade-in relative">
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

      {/* Banner — no overflow-hidden so avatar is never clipped */}
      <div className="relative mb-20">
        {/* Background layer (clipped) */}
        <div
          className="h-40 rounded-2xl overflow-hidden relative"
          style={{ background: BANNER_GRADIENTS[bannerColor] }}
        >
          <div className="absolute top-4 left-8 w-24 h-24 rounded-full blur-3xl opacity-40" style={{ background: 'var(--v-violet)' }} />
          <div className="absolute bottom-2 right-16 w-32 h-32 rounded-full blur-3xl opacity-30" style={{ background: 'var(--v-cyan)' }} />

          {/* Banner controls */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {/* Color picker toggle */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(v => !v)}
                className="btn-glass text-xs px-3 py-1.5 flex items-center gap-1.5"
                id="change-color-btn"
                aria-label="Change banner color"
              >
                <Palette size={12} />
                Color
              </button>
              {showColorPicker && (
                <div className="absolute bottom-9 right-0 flex gap-2 p-3 rounded-2xl shadow-2xl animate-fade-in"
                  style={{ background: 'rgba(10,8,20,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {Object.entries(BANNER_LABELS).map(([key, hex]) => (
                    <button
                      key={key}
                      onClick={() => { setBannerColor(key); setShowColorPicker(false); }}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110 flex-shrink-0"
                      style={{
                        background: hex,
                        outline: bannerColor === key ? `2px solid white` : '2px solid transparent',
                        outlineOffset: '2px',
                      }}
                      aria-label={`Set ${key} banner`}
                      title={key}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Avatar — positioned outside the overflow-hidden banner */}
        <div className="absolute -bottom-12 left-6 z-10">
          <div
            className="p-[2px] rounded-full"
            style={{ background: 'linear-gradient(135deg, var(--v-violet), var(--v-cyan))' }}
          >
            <div className="p-[3px] rounded-full" style={{ background: 'var(--bg, #0a0814)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentUser.avatar || '/fallback-avatar.png'}
                alt={`${currentUser.displayName}'s avatar`}
                width={88} height={88}
                className="w-22 h-22 rounded-full object-cover block"
                style={{ width: 88, height: 88, display: 'block', borderRadius: '9999px' }}
                onError={(e) => { (e.target as HTMLImageElement).src = '/fallback-avatar.png'; }}
              />
            </div>
          </div>
          {/* Camera button */}
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="absolute bottom-1 right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 cursor-pointer hover:opacity-90 transition-opacity"
            style={{ background: 'var(--v-violet)', borderColor: 'var(--bg, #0a0814)' }}
            id="change-avatar-btn"
            aria-label="Change avatar"
          >
            <Camera size={12} color="white" />
          </button>
        </div>
      </div>

      {/* Profile info — pt-16 clears the avatar that overlaps from the banner */}
      <div className="px-1 pb-4 pt-16">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
                {currentUser.displayName}
              </h1>
              {currentUser.isVerified && (
                <div className="verified-badge w-5 h-5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                </div>
              )}
            </div>
            <div className="text-sm mb-2" style={{ color: 'var(--text-tertiary)' }}>@{currentUser.username}</div>
            <p className="text-sm leading-relaxed max-w-sm" style={{ color: 'var(--text-secondary)' }}>
              {currentUser.bio || "This user hasn't written a bio yet."}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              className="btn-glass text-sm flex items-center gap-1.5"
              id="edit-profile-btn"
              onClick={() => setIsEditing(true)}
            >
              <Settings size={14} />
              Edit Profile
            </button>
          </div>
        </div>

        {/* Karma + Stats */}
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          <div className="karma-badge">
            ⚡ {kFmt(currentUser.karmaScore ?? 0)} Karma
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center cursor-pointer hover:opacity-80 transition-opacity">
              <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{kFmt(currentUser.followerCount ?? 0)}</div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Followers</div>
            </div>
            <div className="text-center cursor-pointer hover:opacity-80 transition-opacity">
              <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{kFmt(currentUser.followingCount ?? 0)}</div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Following</div>
            </div>
            <div className="text-center">
              <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{userPosts.length}</div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Posts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
        {([
          { key: 'posts', label: 'Posts', icon: Grid3x3 },
          { key: 'saved', label: 'Saved', icon: Bookmark },
          { key: 'awards', label: 'Awards', icon: Award },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex items-center gap-2 px-5 py-3 text-sm font-semibold relative transition-colors focus-visible:outline-none"
            style={{ color: tab === key ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            <Icon size={15} />
            {label}
            {tab === key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: 'var(--v-violet)' }} />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="pt-4 space-y-4">
        {tab === 'posts' && (
          loadingPosts ? (
            <div className="glass-card p-12 text-center">
              <div className="w-8 h-8 border-2 border-primary-light border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-on-surface-variant">Loading your posts...</p>
            </div>
          ) : userPosts.length === 0 ? (
            <div className="glass-card p-12 text-center flex flex-col items-center">
              <Sparkles size={32} className="text-on-surface-variant mb-3 opacity-40" />
              <p className="font-bold text-on-surface mb-1">No posts yet</p>
              <p className="text-sm text-on-surface-variant">Share your first thought with the world.</p>
            </div>
          ) : (
            userPosts.map((p) => <PostCard key={p.id} post={p} currentUserId={currentUser.id} />)
          )
        )}
        {tab === 'saved' && (
          <div className="glass-card p-8 text-center">
            <Bookmark size={28} className="mx-auto mb-3 text-on-surface-variant opacity-40" />
            <p className="font-bold text-on-surface mb-1">Saved posts coming soon</p>
          </div>
        )}
        {tab === 'awards' && (
          <div className="glass-card p-6 text-center">
            <div className="text-4xl mb-3">🏆</div>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Awards & Achievements</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Community recognition for outstanding contributions</p>
          </div>
        )}
      </div>
    </div>
  );
}
