'use client';

import { useAppStore } from '@/lib/store';
import PostCard from '@/components/features/feed/PostCard';
import { Camera, Settings, Grid3x3, FileText, Bookmark, Award, Sparkles } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import EditProfileModal from '@/components/features/profile/EditProfileModal';
import { createClient } from '@/lib/supabase/client';

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
  const { currentUser } = useAppStore();
  // FIX 8: Memoize Supabase client — prevents new client+WebSocket per render cycle
  const supabase = useMemo(() => createClient(), []);

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
        <EditProfileModal
          onClose={() => setIsEditing(false)}
        />
      )}

      {/* Banner */}
      <div
        className="h-36 rounded-2xl relative overflow-hidden mb-16"
        style={{ background: 'linear-gradient(135deg, #2D1B69 0%, #1a1040 40%, #0a2060 100%)' }}
      >
        <div className="absolute top-4 left-8 w-20 h-20 rounded-full blur-2xl opacity-40" style={{ background: 'var(--v-violet)' }} />
        <div className="absolute bottom-2 right-12 w-28 h-28 rounded-full blur-2xl opacity-30" style={{ background: 'var(--v-cyan)' }} />
        <button
          className="absolute bottom-3 right-3 btn-glass text-xs px-3 py-1.5 flex items-center gap-1.5"
          id="edit-banner-btn"
          aria-label="Edit profile banner"
        >
          <Camera size={12} />
          Edit
        </button>

        {/* Avatar */}
        <div className="absolute -bottom-14 left-6">
          <div
            className="p-0.5 rounded-full"
            style={{ background: 'linear-gradient(135deg, var(--v-violet), var(--v-cyan))' }}
          >
            <div className="p-1 rounded-full" style={{ background: 'var(--bg)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentUser.avatar || '/fallback-avatar.png'}
                alt={`${currentUser.displayName}'s avatar`}
                width={80} height={80}
                className="w-20 h-20 rounded-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = '/fallback-avatar.png'; }}
              />
            </div>
          </div>
          <button
            className="absolute bottom-1 right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 cursor-pointer"
            style={{ background: 'var(--v-violet)', borderColor: 'var(--bg)' }}
            id="change-avatar-btn"
            aria-label="Change avatar"
          >
            <Camera size={12} color="white" />
          </button>
        </div>
      </div>

      {/* Profile info */}
      <div className="px-1 pb-4">
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
