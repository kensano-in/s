'use client';

import { useAppStore } from '@/lib/store';
import PostCard from '@/components/features/feed/PostCard';
import { Grid3x3, Bookmark, Award, Sparkles, Lock, Loader2, UserPlus, UserCheck, Activity, Globe, ShieldCheck, MessageCircle, MoreHorizontal } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import KineticIcon from '@/components/ui/KineticIcon';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import clsx from 'clsx';
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
  const [localFollowerCount, setLocalFollowerCount] = useState<number | null>(null);
  
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
          .select('*, author:users!posts_author_id_fkey(*), community:communities(display_name)')
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

  const amFollowing = isFollowing(profileUser?.id || '');
  const canSeePosts = !profileUser?.isPrivate || amFollowing;
  const displayFollowerCount = localFollowerCount ?? profileUser?.followerCount ?? 0;

  const handleFollow = () => {
    if (!profileUser?.id) return;
    const willFollow = !amFollowing;
    setLocalFollowerCount(c => (c ?? profileUser.followerCount) + (willFollow ? 1 : -1));
    toggleFollow(profileUser.id);
  };

  return (
    <div className="space-y-12 animate-fade-in pb-32 max-w-7xl mx-auto p-6 italic">
      
      {/* Sovereign Profile HUD */}
      <div className="glass-card p-12 bg-surface-lowest/40 border-none rounded-[60px] shadow-[0_0_100px_rgba(0,255,255,0.05)] relative overflow-hidden group">
         <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(var(--white) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
         <div className="absolute -inset-20 bg-v-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity blur-[100px] -z-10" />
         
         <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-shrink-0 relative group">
                <div className="absolute -inset-4 bg-primary-gradient rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="w-[180px] h-[180px] rounded-full p-1 bg-white/10 relative z-10">
                    <img
                      src={profileUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileUser.username}`}
                      alt="profile"
                      className="w-full h-full rounded-full object-cover border-4 border-black group-hover:scale-105 transition-transform duration-700"
                    />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-v-emerald p-2 rounded-2xl shadow-[0_0_20px_var(--v-emerald)] z-20">
                    <KineticIcon icon={ShieldCheck} size={20} color="white" active pulse />
                </div>
            </div>

            <div className="flex-1 space-y-6 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-4">
                    <div className="flex items-center gap-3 opacity-60">
                        <Activity size={14} className="text-v-cyan animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Identity_Node_Active</span>
                    </div>
                </div>
                <h1 className="text-5xl sm:text-7xl font-black italic tracking-tighter text-white uppercase leading-none">
                    {profileUser?.displayName || 'Unnamed Profile'} <br/><span className="text-v-cyan">@{profileUser?.username || username}</span>
                </h1>
                <p className="text-sm font-bold text-on-surface-variant opacity-60 max-w-xl italic">
                    {profileUser?.bio || "Identity story pending inclusion in the collective."}
                </p>
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 pt-4">
                    <button 
                        onClick={handleFollow}
                        className={clsx(
                            "px-10 py-4 rounded-[22px] font-black text-[11px] uppercase tracking-[0.2em] transition-all transform active:scale-95 italic",
                            amFollowing ? "bg-surface-high/60 text-white border border-white/10" : "bg-white text-black hover:bg-v-cyan shadow-2xl"
                        )}
                    >
                        {amFollowing ? 'Joined' : 'Join Node'}
                    </button>
                    <button 
                        onClick={() => router.push(`/messages?user_id=${profileUser.id}`)}
                        className="px-10 py-4 bg-surface-lowest/40 border border-white/5 rounded-[22px] font-black text-[11px] uppercase tracking-[0.2em] text-white hover:bg-white/5 transition-all italic"
                    >
                        Message
                    </button>
                </div>
            </div>

            <div className="hidden lg:grid grid-cols-2 gap-4">
                {[
                    { label: 'Posts', val: userPosts.length, icon: Grid3x3 },
                    { label: 'Followers', val: kFmt(displayFollowerCount), icon: UserPlus },
                    { label: 'Following', val: kFmt(profileUser.followingCount), icon: Globe },
                    { label: 'Karma', val: kFmt(profileUser.karmaScore), icon: Award }
                ].map((stat) => (
                    <div key={stat.label} className="glass-card p-6 bg-white/[0.02] border-none rounded-[32px] flex flex-col items-center gap-2 hover:bg-white/[0.05] transition-all group">
                        <KineticIcon icon={stat.icon} size={18} color="var(--v-cyan)" active />
                        <span className="text-xl font-black italic text-white leading-none">{stat.val}</span>
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-30">{stat.label}</span>
                    </div>
                ))}
            </div>
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
