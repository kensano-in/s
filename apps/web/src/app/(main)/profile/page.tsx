'use client';

import { useAppStore } from '@/lib/store';
import {
  Edit3,
  Share2,
  Grid3x3,
  Bookmark,
  Activity,
  Loader2,
  ShieldCheck,
  Heart,
  MessageCircle,
  Ghost,
  Check,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import IdentityEditSystem from '@/components/features/profile/IdentityEditSystem';
import AuraBackground from '@/components/features/profile/AuraBackground';
import { createClient } from '@/lib/supabase/client';
import { getDatabaseProfile } from './actionsCore';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

function kFmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

type Tab = 'posts' | 'saved' | 'activity';

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [dbUser, setDbUser] = useState<any>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const { currentUser } = useAppStore();
  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(async () => {
    if (!currentUser?.id) return;
    const res = await getDatabaseProfile(currentUser.id);
    if (res.success) setDbUser(res.data);
  }, [currentUser?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!currentUser?.id) return;
    async function loadPosts() {
      setLoadingPosts(true);
      const { data } = await supabase
        .from('posts')
        .select('*, author:users!posts_author_id_fkey(*)')
        .eq('author_id', currentUser!.id)
        .order('created_at', { ascending: false });
      if (data) {
        setUserPosts(
          data.map((m: any) => ({
            ...m,
            mediaUrls: m.media_urls || [],
            author: {
              id: m.author?.id,
              username: m.author?.username,
              displayName: m.author?.display_name,
              avatar: m.author?.avatar_url,
            },
          }))
        );
      }
      setLoadingPosts(false);
    }
    loadPosts();
  }, [currentUser?.id, supabase]);

  const handleShare = async () => {
    const url = `${window.location.origin}/${dbUser?.username || currentUser?.username}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Identity: ${dbUser?.display_name || currentUser?.displayName}`,
          text: `Check out my digital identity on Verlyn.`,
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  if (!currentUser) return null;

  const displayName = dbUser?.display_name || currentUser.displayName;
  const username = dbUser?.username || currentUser.username;
  const avatar =
    dbUser?.avatar_url ||
    currentUser.avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
  const bio = dbUser?.bio;
  const isVerified = dbUser?.is_verified || dbUser?.role === 'PRIME';
  const followers = dbUser?.follower_count || currentUser.followerCount || 0;
  const following = dbUser?.following_count || currentUser.followingCount || 0;
  const postCount = userPosts.length;

  return (
    <div className="min-h-screen text-white pb-32 relative">
      <AuraBackground 
        securityScore={dbUser?.security_score}
        karmaScore={dbUser?.karma_score}
        isVerified={isVerified}
      />
      
      <IdentityEditSystem
        isOpen={isEditing}
        onClose={() => {
          setIsEditing(false);
          fetchProfile();
        }}
      />

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
                src={avatar}
                alt={displayName}
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
            <h1 className="text-3xl font-bold tracking-tight text-white">{displayName}</h1>
            <p className="text-[15px] text-white/40 font-medium">@{username}</p>
            {bio && (
              <p className="text-[15px] text-white/70 leading-relaxed mt-4 max-w-[380px] mx-auto">
                {bio}
              </p>
            )}
          </div>
        </div>

        {/* ── Interactive Stats ── */}
        <div className="grid grid-cols-3 gap-8 mb-12 py-6 border-y border-white/[0.06]">
          <StatItem label="Posts" value={postCount} delay={0} />
          <StatItem label="Followers" value={followers} delay={0.1} />
          <StatItem label="Following" value={following} delay={0.2} />
        </div>

        {/* ── Primary Actions ── */}
        <div className="flex gap-4 mb-16">
          <ActionButton
            id="edit-profile-btn"
            onClick={() => setIsEditing(true)}
            icon={Edit3}
            label="Edit Identity"
            primary
          />

          <ActionButton
            id="share-profile-btn"
            onClick={handleShare}
            icon={shareCopied ? Check : Share2}
            label={shareCopied ? 'Copied' : 'Share'}
            active={shareCopied}
          />
        </div>

        {/* ── Content Tabs ── */}
        <div className="flex items-center gap-8 mb-8 border-b border-white/[0.06]">
          <TabButton active={tab === 'posts'} onClick={() => setTab('posts')} icon={Grid3x3} label="Identity" />
          <TabButton active={tab === 'saved'} onClick={() => setTab('saved')} icon={Bookmark} label="Archived" />
          <TabButton active={tab === 'activity'} onClick={() => setTab('activity')} icon={Activity} label="Vitals" />
        </div>

        {/* ── Content Feed ── */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {tab === 'posts' && (
              <motion.div 
                key="posts" 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              >
                {loadingPosts ? (
                  <PostsSkeleton />
                ) : userPosts.length === 0 ? (
                  <EmptyState
                    icon={Ghost}
                    title="Null State"
                    subtitle="Your identity contains no shared fragments."
                  />
                ) : (
                  <div className="grid grid-cols-3 gap-1">
                    {userPosts.map((p, i) => (
                      <PostGridItem key={p.id} post={p} index={i} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {tab === 'saved' && (
              <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EmptyState
                  icon={Bookmark}
                  title="Vault Empty"
                  subtitle="Saved data will appear in your private archive."
                />
              </motion.div>
            )}

            {tab === 'activity' && (
              <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EmptyState
                  icon={Activity}
                  title="No Signal"
                  subtitle="System activity is currently flat."
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
            ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
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
          layoutId="profile-tab-active"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-t-full"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  );
}

function PostGridItem({ post, index }: { post: any; index: number }) {
  const hasImage = post.mediaUrls?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02, duration: 0.4 }}
      onClick={() => (window.location.href = `/feed/${post.id}`)}
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

function PostsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-1">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="aspect-square bg-white/[0.02] animate-pulse rounded-[2px]" />
      ))}
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
