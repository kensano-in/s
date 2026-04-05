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
    <div className="space-y-0 animate-fade-in pb-12">
      {/* IG-style Profile Header */}
      <div className="pt-8 pb-4 px-4 sm:px-8 max-w-[800px] mx-auto">
        <div className="flex items-center gap-6 sm:gap-14 mb-6">
          {/* Avatar (Left) */}
          <div className="flex-shrink-0">
            <div className="p-1 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500">
              <div className="p-[3px] bg-background rounded-full">
                <img
                  src={profileUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileUser.username}`}
                  alt={`${profileUser.displayName}'s avatar`}
                  className="w-[88px] h-[88px] sm:w-[150px] sm:h-[150px] rounded-full object-cover block"
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileUser.username}`; }}
                />
              </div>
            </div>
          </div>

          {/* Stats & Actions (Right) */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-4">
              <h1 className="text-xl sm:text-2xl font-normal text-on-surface flex items-center gap-2">
                {profileUser.username}
                {profileUser.isVerified && (
                  <div className="verified-badge w-4 h-4 ml-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  </div>
                )}
                {profileUser.isPrivate && <Lock size={14} className="text-on-surface-variant ml-1" />}
              </h1>
              
              {/* Desktop Actions */}
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={async () => {
                    toggleFollow(profileUser.id);
                    const { toggleFollowDB } = await import('../actions');
                    await toggleFollowDB(currentUser?.id || '', profileUser.id, !amFollowing);
                  }}
                  className={amFollowing ? 'px-4 py-1.5 bg-surface-variant text-on-surface rounded-lg text-[14px] font-semibold hover:bg-surface-highest transition' : 'px-4 py-1.5 bg-primary text-on-primary rounded-lg text-[14px] font-semibold hover:bg-primary-light transition'}
                >
                  {amFollowing ? 'Following' : 'Follow'}
                </button>
                <button 
                  onClick={() => router.push(`/messages?user_id=${profileUser.id}`)}
                  className="px-4 py-1.5 bg-surface-variant text-on-surface rounded-lg text-[14px] font-semibold hover:bg-surface-highest transition"
                >
                  Message
                </button>
              </div>
            </div>

            {/* Desktop Stats */}
            <div className="hidden sm:flex items-center gap-10 mb-4 text-[15px]">
              <div><span className="font-semibold text-on-surface">{userPosts.length}</span> posts</div>
              <div><span className="font-semibold text-on-surface">{kFmt(profileUser.followerCount)}</span> followers</div>
              <div><span className="font-semibold text-on-surface">{kFmt(profileUser.followingCount)}</span> following</div>
            </div>

            {/* Desktop Bio */}
            <div className="hidden sm:block">
              <div className="font-bold text-[15px] mb-1 text-on-surface">{profileUser.displayName}</div>
              <p className="text-[15px] whitespace-pre-wrap text-on-surface leading-snug">
                {profileUser.bio || "This user hasn't written a bio yet."}
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Bio */}
        <div className="sm:hidden px-2 mb-4">
          <div className="font-bold text-[14px] mb-1 text-on-surface">{profileUser.displayName}</div>
          <p className="text-[14px] whitespace-pre-wrap text-on-surface leading-snug">
            {profileUser.bio || "This user hasn't written a bio yet."}
          </p>
        </div>

        {/* Mobile Stats */}
        <div className="sm:hidden flex items-center justify-around py-3 mb-2 border-t border-outline-variant/30 text-[14px]">
          <div className="text-center flex flex-col"><span className="font-bold text-on-surface">{userPosts.length}</span> <span className="text-on-surface-variant text-[13px]">posts</span></div>
          <div className="text-center flex flex-col"><span className="font-bold text-on-surface">{kFmt(profileUser.followerCount)}</span> <span className="text-on-surface-variant text-[13px]">followers</span></div>
          <div className="text-center flex flex-col"><span className="font-bold text-on-surface">{kFmt(profileUser.followingCount)}</span> <span className="text-on-surface-variant text-[13px]">following</span></div>
        </div>

        {/* Mobile Actions */}
        <div className="sm:hidden flex items-center gap-2 mb-6">
          <button
            onClick={async () => {
              toggleFollow(profileUser.id);
              const { toggleFollowDB } = await import('../actions');
              await toggleFollowDB(currentUser?.id || '', profileUser.id, !amFollowing);
            }}
            className={amFollowing ? 'flex-1 py-1.5 bg-surface-variant text-on-surface rounded-lg text-sm font-semibold transition' : 'flex-1 py-1.5 bg-primary text-on-primary rounded-lg text-sm font-semibold transition'}
          >
            {amFollowing ? 'Following' : 'Follow'}
          </button>
          <button 
            onClick={() => router.push(`/messages?user_id=${profileUser.id}`)}
            className="flex-1 py-1.5 bg-surface-variant text-on-surface rounded-lg text-sm font-semibold transition"
          >
            Message
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-t border-outline-variant/30 justify-center max-w-[900px] mx-auto gap-12">
        <button
          className="flex items-center gap-2 px-1 py-4 text-[13px] font-bold uppercase tracking-wider relative transition-colors focus-visible:outline-none"
          style={{ color: 'var(--text-primary)' }}
        >
          <Grid3x3 size={14} />
          POSTS
          <span className="absolute top-0 left-0 right-0 h-[2px] bg-primary transition-all" />
        </button>
        <button
          className="flex items-center gap-2 px-1 py-4 text-[13px] font-bold uppercase tracking-wider relative transition-colors text-on-surface-variant hover:text-on-surface focus-visible:outline-none"
        >
          <Bookmark size={14} />
          SAVED
        </button>
      </div>

      {/* Content */}
      <div className="max-w-[900px] mx-auto min-h-[400px]">
        {!canSeePosts ? (
          <div className="p-12 mt-12 text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-full border-2 border-outline-variant/50 flex items-center justify-center mb-6">
              <Lock size={32} className="text-on-surface-variant opacity-60" />
            </div>
            <p className="font-bold text-[18px] text-on-surface mb-2">This Account is Private</p>
            <p className="text-[14px] text-on-surface-variant">Follow this account to see their photos and videos.</p>
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
                <div key={p.id} className="aspect-square bg-surface-variant relative group overflow-hidden cursor-pointer" onClick={() => router.push(`/feed/${p.id}`)}>
                  {mainMedia ? (
                    <img src={mainMedia} alt="Post thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex p-3 items-center justify-center text-[11px] sm:text-[14px] break-words text-center font-medium opacity-80">
                      {p.content.slice(0, 100)}{p.content.length > 100 ? '...' : ''}
                    </div>
                  )}
                  {/* Hover overlay with likes/comments */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4 sm:gap-6 text-white font-bold">
                    <div className="flex items-center gap-1.5"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> {kFmt(p.likeCount)}</div>
                    <div className="flex items-center gap-1.5"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg> {kFmt(p.commentCount)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
