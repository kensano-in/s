'use client';

import { useAppStore } from '@/lib/store';
import PostCard from '@/components/features/feed/PostCard';
import { Grid3x3, Bookmark, Award, Sparkles, Lock, Loader2, UserPlus, UserCheck } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import type { User } from '@/lib/types';

function kFmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function PublicProfilePage() {
  const { username } = useParams() as { username: string };
  const router = useRouter();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { currentUser, isFollowing, toggleFollow } = useAppStore();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!username) return;

    if (currentUser?.username === username) {
      router.push('/profile');
      return;
    }

    async function fetchProfile() {
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();
        
      if (user) {
        setProfileUser({
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          avatar: user.avatar_url,
          bio: user.bio,
          isVerified: user.is_verified,
          isPrivate: user.is_private,
          karmaScore: user.karma_score || 0,
          followerCount: user.follower_count || 0,
          followingCount: user.following_count || 0,
          role: user.role || 'PUBLIC',
          createdAt: user.created_at,
        });

        // Only fetch posts if public OR if we are following them
        // In a real app we'd also check DB follows. For now we use local isFollowing
        // but we'll fetch them anyway and hide them in the UI if not following.
        const { data: posts } = await supabase
          .from('posts')
          .select('*, author:users(*)')
          .eq('author_id', user.id)
          .order('created_at', { ascending: false });

        if (posts) {
          const formatted = posts.map((dbPost: any) => ({
            id: dbPost.id,
            content: dbPost.content,
            mediaUrls: dbPost.media_urls || [],
            likeCount: dbPost.like_count || 0,
            commentCount: dbPost.comment_count || 0,
            shareCount: dbPost.share_count || 0,
            createdAt: dbPost.created_at,
            author: {
              id: dbPost.author?.id,
              username: dbPost.author?.username,
              displayName: dbPost.author?.display_name,
              avatar: dbPost.author?.avatar_url,
              role: dbPost.author?.role || 'PUBLIC',
            },
          }));
          setUserPosts(formatted);
        }
      }
      setLoading(false);
    }
    fetchProfile();
  }, [username, currentUser?.username, supabase, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-primary-light" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="glass-card p-12 text-center flex flex-col items-center">
        <h1 className="text-xl font-bold mb-2">User not found</h1>
        <p className="text-sm text-on-surface-variant">This account doesn't exist or has been deleted.</p>
      </div>
    );
  }

  const amFollowing = isFollowing(profileUser.id);
  const canSeePosts = !profileUser.isPrivate || amFollowing;

  return (
    <div className="space-y-0 animate-fade-in relative">
      {/* Banner */}
      <div className="relative mb-20">
        <div className="h-40 rounded-2xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #020617 100%)' }}>
          <div className="absolute top-4 left-8 w-24 h-24 rounded-full blur-3xl opacity-40" style={{ background: 'var(--v-violet)' }} />
          <div className="absolute bottom-2 right-16 w-32 h-32 rounded-full blur-3xl opacity-30" style={{ background: 'var(--v-cyan)' }} />
        </div>

        {/* Avatar */}
        <div className="absolute -bottom-12 left-6 z-10">
          <div className="p-[2px] rounded-full" style={{ background: 'linear-gradient(135deg, var(--v-violet), var(--v-cyan))' }}>
            <div className="p-[3px] rounded-full" style={{ background: 'var(--bg, #0a0814)' }}>
              <img
                src={profileUser.avatar || '/fallback-avatar.png'}
                alt={`${profileUser.displayName}'s avatar`}
                className="w-[88px] h-[88px] rounded-full object-cover block"
                onError={(e) => { (e.target as HTMLImageElement).src = '/fallback-avatar.png'; }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Profile info */}
      <div className="px-1 pb-4 pt-16">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
                {profileUser.displayName}
              </h1>
              {profileUser.isVerified && (
                <div className="verified-badge w-5 h-5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                </div>
              )}
              {profileUser.isPrivate && <Lock size={14} className="text-on-surface-variant ml-1" />}
            </div>
            <div className="text-sm mb-2" style={{ color: 'var(--text-tertiary)' }}>@{profileUser.username}</div>
            <p className="text-sm leading-relaxed max-w-sm" style={{ color: 'var(--text-secondary)' }}>
              {profileUser.bio || "This user hasn't written a bio yet."}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={async () => {
                toggleFollow(profileUser.id);
                // Database Follow Action will go here
                // await toggleFollowDB(profileUser.id);
              }}
              className={amFollowing ? 'btn-glass text-sm flex items-center gap-1.5' : 'btn-primary text-sm flex items-center gap-1.5 shine'}
            >
              {amFollowing ? <><UserCheck size={14}/> Following</> : <><UserPlus size={14}/> Follow</>}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{kFmt(profileUser.followerCount)}</div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Followers</div>
            </div>
            <div className="text-center">
              <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{kFmt(profileUser.followingCount)}</div>
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
        <button
          className="flex items-center gap-2 px-5 py-3 text-sm font-semibold relative transition-colors focus-visible:outline-none"
          style={{ color: 'var(--text-primary)' }}
        >
          <Grid3x3 size={15} />
          Posts
          <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: 'var(--v-violet)' }} />
        </button>
      </div>

      {/* Content */}
      <div className="pt-4 space-y-4">
        {!canSeePosts ? (
          <div className="glass-card p-12 text-center flex flex-col items-center">
            <Lock size={32} className="text-on-surface-variant mb-3 opacity-60" />
            <p className="font-bold text-on-surface mb-1">This Account is Private</p>
            <p className="text-sm text-on-surface-variant">Follow this account to see their photos and videos.</p>
          </div>
        ) : userPosts.length === 0 ? (
          <div className="glass-card p-12 text-center flex flex-col items-center">
            <Sparkles size={32} className="text-on-surface-variant mb-3 opacity-40" />
            <p className="font-bold text-on-surface mb-1">No posts yet</p>
          </div>
        ) : (
          userPosts.map((p) => <PostCard key={p.id} post={p} currentUserId={currentUser?.id || ''} />)
        )}
      </div>
    </div>
  );
}
