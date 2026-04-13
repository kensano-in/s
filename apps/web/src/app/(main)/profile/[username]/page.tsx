'use client';

import { useAppStore } from '@/lib/store';
import {
  Grid3x3,
  Bookmark,
  Lock,
  Loader2,
  ShieldCheck,
  UserPlus,
  UserCheck,
  MessageCircle,
  Heart,
  Globe,
} from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import type { User } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

function kFmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

type Tab = 'posts' | 'saved';

export default function PublicProfilePage() {
  const { username } = useParams() as { username: string };
  const router = useRouter();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [localFollowerCount, setLocalFollowerCount] = useState<number | null>(null);
  const [dbFollowing, setDbFollowing] = useState<boolean | null>(null);

  const { currentUser, isFollowing, toggleFollow } = useAppStore();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!username) return;

    // Redirect to own profile if it's the current user
    if (currentUser?.username && currentUser.username.toLowerCase() === username.toLowerCase()) {
      router.push('/profile');
      return;
    }

    async function fetchProfile() {
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .ilike('username', username)
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

        // DB-verified follow check
        if (currentUser?.id) {
          const { data: followRow } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', currentUser.id)
            .eq('following_id', user.id)
            .maybeSingle();
          setDbFollowing(!!followRow);
        } else {
          setDbFollowing(false);
        }

        const { data: posts } = await supabase
          .from('posts')
          .select('*, author:users!posts_author_id_fkey(*)')
          .eq('author_id', user.id)
          .order('created_at', { ascending: false });

        if (posts) {
          setUserPosts(
            posts.map((p: any) => ({
              id: p.id,
              content: p.content,
              mediaUrls: p.media_urls || [],
              likeCount: p.like_count || 0,
              commentCount: p.comment_count || 0,
              createdAt: p.created_at,
            }))
          );
        }
      }

      setLoading(false);
    }

    fetchProfile();
  }, [username, currentUser?.username, currentUser?.id, supabase, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-white/10" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-white/[0.03] flex items-center justify-center border border-white/[0.05]">
          <Globe size={28} className="text-white/10" />
        </div>
        <div className="space-y-1">
          <p className="text-[15px] font-bold text-white/40 uppercase tracking-widest">Null Reference</p>
          <p className="text-sm text-white/20">This digital soul does not exist in our ledger.</p>
        </div>
      </div>
    );
  }

  const amFollowing = dbFollowing !== null ? dbFollowing : isFollowing(profileUser?.id || '');
  const canSeePosts = !profileUser?.isPrivate || amFollowing;
  const displayFollowerCount = localFollowerCount ?? profileUser.followerCount ?? 0;
  const isVerified = profileUser.isVerified || profileUser.role === 'PRIME';

  const handleFollow = () => {
    if (!profileUser?.id) return;
    const willFollow = !amFollowing;
    setLocalFollowerCount((c) => (c ?? profileUser.followerCount) + (willFollow ? 1 : -1));
    setDbFollowing(willFollow);
    toggleFollow(profileUser.id);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-32">
      <div className="max-w-[640px] mx-auto px-6 pt-16 sm:pt-24">

        {/* ── Identity Block ── */}
        <div className="flex flex-col items-center mb-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mb-6"
          >
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-4 ring-white/[0.05] lux-shadow bg-neutral-900">
              <img
                src={profileUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileUser.username}`}
                alt={profileUser.displayName}
                className="w-full h-full object-cover"
              />
            </div>
            {isVerified && (
              <div className="absolute bottom-1 right-1 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center border-4 border-[#0A0A0A]">
                <ShieldCheck size={16} />
              </div>
            )}
          </motion.div>

          <div className="text-center space-y-1.5 px-4">
            <h1 className="text-3xl font-bold tracking-tight text-white">{profileUser.displayName}</h1>
            <p className="text-[15px] text-white/40 font-medium">@{profileUser.username}</p>
            {profileUser.bio && (
              <p className="text-[15px] text-white/70 leading-relaxed mt-4 max-w-[380px] mx-auto">
                {profileUser.bio}
              </p>
            )}
          </div>
        </div>

        {/* ── Interactive Stats ── */}
        <div className="grid grid-cols-3 gap-8 mb-12 py-6 border-y border-white/[0.06]">
          <StatItem label="Posts" value={userPosts.length} delay={0} />
          <StatItem label="Followers" value={displayFollowerCount} delay={0.1} />
          <StatItem label="Following" value={profileUser.followingCount} delay={0.2} />
        </div>

        {/* ── Action Bar ── */}
        <div className="flex gap-4 mb-16">
          <ActionButton
            id="follow-btn"
            onClick={handleFollow}
            icon={amFollowing ? UserCheck : UserPlus}
            label={amFollowing ? 'Following' : 'Follow'}
            primary={!amFollowing}
            active={amFollowing}
          />

          <ActionButton
            id="message-btn"
            onClick={() => router.push(`/messages/${profileUser.id}`)}
            icon={MessageCircle}
            label="Message"
          />
        </div>

        {/* ── Content Tabs ── */}
        <div className="flex items-center gap-8 mb-8 border-b border-white/[0.06]">
          <TabButton active={activeTab === 'posts'} onClick={() => setActiveTab('posts')} icon={Grid3x3} label="Identity" />
          <TabButton active={activeTab === 'saved'} onClick={() => setActiveTab('saved')} icon={Bookmark} label="Archived" />
        </div>

        {/* ── Content Feed ── */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {activeTab === 'posts' && (
              <motion.div 
                key="posts" 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="w-full"
              >
                {!canSeePosts ? (
                  <PrivateState />
                ) : userPosts.length === 0 ? (
                  <EmptyState
                    icon={Grid3x3}
                    title="Null State"
                    subtitle="This identity contains no shared fragments."
                  />
                ) : (
                  <div className="grid grid-cols-3 gap-1">
                    {userPosts.map((p, i) => (
                      <PostGridItem
                        key={p.id}
                        post={p}
                        index={i}
                        onClick={() => router.push(`/feed/${p.id}`)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'saved' && (
              <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EmptyState
                  icon={Bookmark}
                  title="Restricted"
                  subtitle="Archived fragments are strictly private."
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Components ───────────────────────────────────────────────────────────

function StatItem({ label, value, delay }: { label: string; value: number | string; delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex flex-col items-center gap-1 group cursor-pointer"
    >
      <span className="text-[20px] font-bold text-white tracking-tight">{kFmt(Number(value))}</span>
      <span className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em]">{label}</span>
    </motion.div>
  );
}

function ActionButton({ 
  id, 
  onClick, 
  icon: Icon, 
  label, 
  primary = false,
  active = false
}: { 
  id: string; 
  onClick: () => void; 
  icon: any; 
  label: string; 
  primary?: boolean;
  active?: boolean;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2.5 py-4 rounded-2xl text-[15px] font-bold transition-all active:scale-[0.97] ${
        primary 
          ? 'bg-white text-black hover:bg-neutral-200' 
          : active 
            ? 'bg-white/[0.04] text-white border border-white/[0.08] hover:bg-white/[0.08]'
            : 'bg-white/[0.04] text-white border border-white/[0.08] hover:bg-white/[0.08]'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2.5 py-4 text-[13px] font-bold transition-all ${
        active ? 'text-white' : 'text-white/30 hover:text-white/60'
      }`}
    >
      <Icon size={16} />
      <span className="uppercase tracking-widest">{label}</span>
      {active && (
        <motion.div
          layoutId="public-tab-active"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-t-full"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  );
}

function PostGridItem({
  post,
  index,
  onClick,
}: {
  post: any;
  index: number;
  onClick: () => void;
}) {
  const hasImage = post.mediaUrls?.[0];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02, duration: 0.4 }}
      onClick={onClick}
      className="aspect-square bg-white/[0.02] relative group cursor-pointer overflow-hidden rounded-[2px]"
    >
      {hasImage ? (
        <img
          src={post.mediaUrls[0]}
          alt="post"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-6 bg-white/[0.02] border border-white/[0.05]">
          <p className="text-[12px] text-white/40 line-clamp-4 text-center leading-relaxed font-medium">
            {post.content}
          </p>
        </div>
      )}
      
      {/* Modern Interaction Overlay */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-6 backdrop-blur-[2px]">
        <div className="flex flex-col items-center gap-1.5 text-white translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-75">
          <Heart size={20} className="fill-white" />
          <span className="text-[11px] font-bold">{kFmt(post.likeCount || 0)}</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 text-white translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-100">
          <MessageCircle size={20} className="fill-white" />
          <span className="text-[11px] font-bold">{kFmt(post.commentCount || 0)}</span>
        </div>
      </div>
    </motion.div>
  );
}

function PrivateState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-16 h-16 rounded-3xl bg-white/[0.03] flex items-center justify-center mb-2 border border-white/[0.05]">
        <Lock size={28} className="text-white/10" />
      </div>
      <div>
        <p className="text-[15px] font-bold text-white/40 uppercase tracking-widest">Sovereign State</p>
        <p className="text-sm text-white/20 mt-1 max-w-[240px] leading-relaxed">Follow to synchronize with their data stream.</p>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: any;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-16 h-16 rounded-3xl bg-white/[0.03] flex items-center justify-center mb-2 border border-white/[0.05]">
        <Icon size={28} className="text-white/10" />
      </div>
      <div>
        <p className="text-[15px] font-bold text-white/40 uppercase tracking-widest">{title}</p>
        <p className="text-sm text-white/20 mt-1 max-w-[240px] leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
}
