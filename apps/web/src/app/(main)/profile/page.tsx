'use client';

import { useAppStore } from '@/lib/store';
import Image from 'next/image';
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
  MapPin,
  Briefcase,
  GraduationCap,
  Link2,
  Calendar,
  Sparkles,
  Music,
  Hash,
  Pin,
  MoreHorizontal,
  Compass,
  Award,
  Globe,
  UserCheck,
  Users,
  EyeOff,
  Repeat2,
  Cake
} from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import IdentityEditSystem from '@/components/features/profile/IdentityEditSystem';
import IdentityBadge, { BadgeType, BADGE_CONFIG } from '@/components/ui/IdentityBadge';
import BadgeInfoModal from '@/components/ui/BadgeInfoModal';
import ProfileFrame from '@/components/ui/ProfileFrame';
import AuraBackground from '@/components/features/profile/AuraBackground';
import FollowListModal from '@/components/features/profile/FollowListModal';
import FollowRequestsModal from '@/components/features/profile/FollowRequestsModal';
import { getIncomingFollowRequestsDB, getSavedPostsDB, getProfilePostsDB, getProfileRepostsDB } from './actions';
import { createClient } from '@/lib/supabase/client';
import { getDatabaseProfile, getProfileMilestones, checkAndNotifyAwardedBadges, submitProfileUpdateDB } from './actionsCore';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { getAvatarUrl } from '@/lib/utils';
import { parseBio, getStatusIcon, serializeBio } from '@/lib/profile-metadata';
import { ProfileMusicCard } from '@/components/features/music/ProfileMusicCard';
import { togglePinPostDB } from '@/app/(main)/feed/actions';
import ProfileActionSheet from '@/components/features/profile/ProfileActionSheet';
import BioText from '@/components/features/profile/BioText';
import ProfileTimeline from '@/components/features/profile/ProfileTimeline';

function kFmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}



type Tab = 'posts' | 'reposts' | 'saved' | 'activity';

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [dbUser, setDbUser] = useState<any>(null);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [loadingSavedPosts, setLoadingSavedPosts] = useState(false);
  const [reposts, setReposts] = useState<any[]>([]);
  const [loadingReposts, setLoadingReposts] = useState(false);

  const [selectedBadgeForModal, setSelectedBadgeForModal] = useState<BadgeType | null>(null);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [badgesExpanded, setBadgesExpanded] = useState(false);
  const [isPrimaryBadgeDropdownOpen, setIsPrimaryBadgeDropdownOpen] = useState(false);

  useEffect(() => {
    if (!badgesExpanded) return;
    const timer = setTimeout(() => {
      setBadgesExpanded(false);
    }, 15000);
    return () => clearTimeout(timer);
  }, [badgesExpanded]);

  const currentUser = useAppStore(s => s.currentUser);
  const updateProfile = useAppStore(s => s.updateProfile);
  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(async () => {
    if (!currentUser?.id) return;
    const res = await getDatabaseProfile(currentUser.id);
    if (res.success && res.data) {
      setDbUser(res.data);
      updateProfile({
        followingCount: res.data.following_count ?? 0,
        followerCount: res.data.follower_count ?? 0,
      });
      const reqs = await getIncomingFollowRequestsDB();
      if (reqs.success && reqs.data) {
        setPendingRequestsCount(reqs.data.length);
      }
    }

    setLoadingMilestones(true);
    const mRes = await getProfileMilestones(currentUser.id);
    if (mRes.success && mRes.data) {
      setMilestones(mRes.data);
    }
    setLoadingMilestones(false);
  }, [currentUser?.id, updateProfile]);

  const loadPosts = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoadingPosts(true);
    const res = await getProfilePostsDB(currentUser.id);
    if (res.success && res.posts) {
      setUserPosts(res.posts);
    } else {
      setUserPosts([]);
    }
    setLoadingPosts(false);
  }, [currentUser?.id]);

  const loadSavedPosts = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoadingSavedPosts(true);
    const res = await getSavedPostsDB();
    if (res.success && res.posts) {
      setSavedPosts(res.posts);
    } else {
      setSavedPosts([]);
    }
    setLoadingSavedPosts(false);
  }, [currentUser?.id]);

  const loadReposts = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoadingReposts(true);
    const res = await getProfileRepostsDB(currentUser.id);
    if (res.success && res.posts) {
      setReposts(res.posts);
    } else {
      setReposts([]);
    }
    setLoadingReposts(false);
  }, [currentUser?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const checkBadges = async () => {
      try {
        const badgeRes = await checkAndNotifyAwardedBadges(currentUser.id);
        if (badgeRes.success && badgeRes.newBadges && badgeRes.newBadges.length > 0) {
          const badgeConfigs = await import('@/components/ui/IdentityBadge');
          for (const badge of badgeRes.newBadges) {
            const config = badgeConfigs.BADGE_CONFIG[badge];
            const badgeLabel = config ? config.label : badge;
            window.dispatchEvent(new CustomEvent('verlyn:toast', {
              detail: {
                message: `✨ Achievement Unlocked: ${badgeLabel}! Check your notifications.`,
                type: 'success'
              }
            }));
          }
          fetchProfile();
        }
      } catch (err) {
        console.error('[BadgeCheck] Error:', err);
      }
    };
    checkBadges();
  }, [currentUser?.id, fetchProfile]);

  const handleSelectPrimaryBadge = async (badgeKey: string | null) => {
    try {
      if (!currentUser?.id || !dbUser) return;
      const updatedMetadata = {
        ...metadata,
        selectedPrimaryBadge: badgeKey || undefined,
      };
      if (!badgeKey) {
        delete updatedMetadata.selectedPrimaryBadge;
      }
      const serialized = serializeBio(parseBio(dbUser.bio).visibleBio || '', updatedMetadata);
      const res = await submitProfileUpdateDB(currentUser.id, { bio: serialized });
      if (res.success) {
        window.dispatchEvent(new CustomEvent('verlyn:toast', {
          detail: {
            message: badgeKey
              ? `✨ Featured badge updated to: ${BADGE_CONFIG[badgeKey as BadgeType]?.label}`
              : '✨ Featured badge set to Auto.',
            type: 'success'
          }
        }));
        fetchProfile();
      } else {
        window.dispatchEvent(new CustomEvent('verlyn:toast', {
          detail: { message: `Failed to update: ${res.error}`, type: 'error' }
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPrimaryBadgeDropdownOpen(false);
    }
  };

  const handleToggleMetadataOption = async (optionKey: 'hideBadgesFromProfile' | 'hideBadgeCount' | 'badgeGlowAura' | 'chromaBorder' | 'heartbeatPulse') => {
    try {
      if (!currentUser?.id || !dbUser) return;
      const updatedMetadata = {
        ...metadata,
        [optionKey]: !metadata[optionKey],
      };
      const serialized = serializeBio(parseBio(dbUser.bio).visibleBio || '', updatedMetadata);
      const res = await submitProfileUpdateDB(currentUser.id, { bio: serialized });
      if (res.success) {
        window.dispatchEvent(new CustomEvent('verlyn:toast', {
          detail: {
            message: `✨ Customization setting updated successfully.`,
            type: 'success'
          }
        }));
        fetchProfile();
      } else {
        window.dispatchEvent(new CustomEvent('verlyn:toast', {
          detail: { message: `Failed to update: ${res.error}`, type: 'error' }
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;

    // Consolidated single realtime channel for the profile page
    const channel = supabase
      .channel(`profile_page_realtime:${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${currentUser.id}`,
        },
        async () => {
          console.log('[REALTIME PROFILE] Change received, refetching...');
          fetchProfile();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'followers',
        },
        async (payload: any) => {
          const isRelated = 
            payload.eventType === 'DELETE' || 
            payload.new?.follower_id === currentUser.id ||
            payload.new?.following_id === currentUser.id ||
            payload.old?.follower_id === currentUser.id ||
            payload.old?.following_id === currentUser.id;

          if (isRelated) {
            console.log('[REALTIME FOLLOWERS] Change received, refetching...');
            fetchProfile();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_milestones',
          filter: `user_id=eq.${currentUser.id}`,
        },
        async () => {
          console.log('[REALTIME MILESTONES] Change received, refetching...');
          const mRes = await getProfileMilestones(currentUser.id);
          if (mRes.success && mRes.data) {
            setMilestones(mRes.data);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follow_requests',
          filter: `target_id=eq.${currentUser.id}`,
        },
        async () => {
          console.log('[REALTIME FOLLOW REQUESTS] Change received, refetching...');
          const reqs = await getIncomingFollowRequestsDB();
          if (reqs.success && reqs.data) {
            setPendingRequestsCount(reqs.data.length);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
        },
        () => {
          console.log('[REALTIME POSTS] Change received, reloading all profile tabs...');
          loadPosts();
          loadReposts();
          loadSavedPosts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saves',
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => {
          console.log('[REALTIME SAVES] Change received, reloading saved posts...');
          loadSavedPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, fetchProfile, loadPosts, loadReposts, loadSavedPosts, supabase]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (tab === 'saved') {
      loadSavedPosts();
    } else if (tab === 'reposts') {
      loadReposts();
    }
  }, [tab, loadSavedPosts, loadReposts]);

  const handleTogglePin = async (postId: string, currentPinStatus: boolean) => {
    const res = await togglePinPostDB(postId, !currentPinStatus);
    if (res.success) {
      window.dispatchEvent(new CustomEvent('verlyn:toast', {
        detail: { message: currentPinStatus ? 'Post unpinned' : 'Post pinned to profile', type: 'success' }
      }));
      loadPosts();
    } else {
      window.dispatchEvent(new CustomEvent('verlyn:toast', {
        detail: { message: res.error || 'Failed to update pin status', type: 'error' }
      }));
    }
  };

  if (!currentUser) return null;

  const displayName = dbUser?.display_name || currentUser.displayName;
  const username = dbUser?.username || currentUser.username;
  const avatar = getAvatarUrl(username || 'user', dbUser?.avatar_url || currentUser.avatar);
  const isVerified = dbUser?.is_verified || dbUser?.role === 'PRIME';
  const followers = dbUser?.follower_count ?? currentUser?.followerCount ?? 0;
  const following = dbUser?.following_count ?? currentUser?.followingCount ?? 0;
  const postCount = userPosts.length;

  // Metadata parsing
  const { visibleBio, metadata } = parseBio(dbUser?.bio);
  const statusIconConfig = getStatusIcon(metadata.statusEmoji);

  // Pinned vs Normal posts split
  const pinnedPosts = userPosts.filter(p => p.isPinned);
  const normalPosts = userPosts.filter(p => !p.isPinned);

  // Profile Completion Calculation
  const completionFields = [
    { label: 'Profile Photo', value: !!dbUser?.avatar_url },
    { label: 'Cover Banner', value: !!dbUser?.banner_url },
    { label: 'Biography', value: !!visibleBio },
    { label: 'Custom Status', value: !!metadata.statusText },
    { label: 'Interest Tags', value: !!metadata.tags && metadata.tags.length > 0 },
    { label: 'Pronouns Tag', value: !!dbUser?.pronouns },
    { label: 'Website / Link', value: !!dbUser?.custom_link },
    { label: 'Occupation/Education', value: !!metadata.occupation || !!metadata.education },
  ];
  const completedCount = completionFields.filter(f => f.value).length;
  const completionPercent = Math.round((completedCount / completionFields.length) * 100);

  // Pinned music object construction
  const pinnedTrack = dbUser?.pinned_track_id ? {
    id: dbUser.pinned_track_id,
    name: dbUser.pinned_track_name || '',
    artist: dbUser.pinned_track_artist || '',
    artwork: dbUser.pinned_track_artwork || '',
    source: dbUser.pinned_track_source || 'spotify',
    embedId: dbUser.pinned_track_id.split('_')[1] || dbUser.pinned_track_id
  } : null;

  // Joined date formatting
  const joinedDate = dbUser?.created_at
    ? new Date(dbUser.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently';

  const renderPrivacyBadge = (fieldKey: string) => {
    const setting = metadata.privacySettings?.[fieldKey as keyof typeof metadata.privacySettings] || 'public';
    let Icon = Globe;
    let title = 'Public';
    if (setting === 'followers') {
      Icon = UserCheck;
      title = 'Followers Only';
    } else if (setting === 'mutuals') {
      Icon = Users;
      title = 'Mutuals Only';
    } else if (setting === 'private') {
      Icon = EyeOff;
      title = 'Private';
    }
    return (
      <span className="inline-flex items-center ml-auto text-[10px] text-white/20 hover:text-white/40 font-medium gap-1 cursor-help shrink-0" title={`Visibility: ${title}`}>
        <Icon size={11} className="opacity-60" />
      </span>
    );
  };

  const getActiveBadges = (user: any): BadgeType[] => {
    if (!user) return [];
    const badges: BadgeType[] = [];
    const isS = user.username?.toLowerCase() === 's';

    // ── SINGULARITY — one person ever ─────────────────────
    if (isS) badges.push('white_heart');

    // ── VERIFICATION ──────────────────────────────────────
    if (!isS && (user.is_verified || user.role === 'PRIME')) badges.push('sovereign');
    if (!isS && (user.role === 'ADMIN' || user.role === 'DEVELOPER')) badges.push('architect');
    if (!isS && ((user.security_score && user.security_score > 80))) badges.push('guardian');
    if (!isS && (user.created_at && new Date(user.created_at).getFullYear() <= 2025)) badges.push('founding');

    // ── STREAK — check metadata.streak or streak_count ────
    const streak = user.metadata?.streak ?? user.metadata?.loginStreak ?? user.streak_count ?? 0;
    if (streak >= 365) badges.push('streak_365');
    else if (streak >= 100) badges.push('streak_100');
    else if (streak >= 30)  badges.push('streak_30');
    else if (streak >= 7)   badges.push('streak_7');
    else if (streak >= 3)   badges.push('streak_3');

    // ── FOLLOWERS ─────────────────────────────────────────
    const fc = user.follower_count ?? 0;
    if (fc >= 1000) badges.push('legend');
    else if (fc >= 500) badges.push('influencer');
    else if (fc >= 100) badges.push('popular');
    else if (fc >= 10)  badges.push('connected');
    else if (fc >= 1)   badges.push('first_follower');

    // ── PROFILE completion ────────────────────────────────
    if (user.avatar_url) badges.push('avatar_set');
    if (user.bio && user.bio.trim().length > 0) badges.push('bio_written');
    if (user.banner_url) badges.push('banner_hero');
    const profileComplete = user.avatar_url && user.bio && user.banner_url
      && user.location && user.website;
    if (profileComplete) badges.push('complete_profile');

    // ── COMMUNITY ─────────────────────────────────────────
    const joinedAt = user.created_at ? new Date(user.created_at) : null;
    const now = new Date();
    if (joinedAt && (now.getTime() - joinedAt.getTime()) > 365 * 24 * 60 * 60 * 1000)
      badges.push('veteran');
    if (joinedAt && joinedAt <= new Date('2025-02-01')) badges.push('early_adopter');
    if (!user.violation_count || user.violation_count === 0) badges.push('peacekeeper');

    // ── CONTENT ───────────────────────────────────────────
    const postCount = user.post_count ?? 0;
    if (postCount >= 100) badges.push('post_100');
    else if (postCount >= 50) badges.push('post_50');
    else if (postCount >= 10) badges.push('post_10');
    else if (postCount >= 1) badges.push('first_post');

    return badges;
  };

  // ── Returns top N by rarity priority ──────────────────────────────────────
  const RARITY_PRIORITY: Record<string, number> = {
    singularity: 0, mythic: 1, legendary: 2, epic: 3, rare: 4, common: 5,
  };
  const prioritiseBadges = (list: BadgeType[]) => {
    const sorted = [...list].sort((a, b) =>
      (RARITY_PRIORITY[BADGE_CONFIG[a]?.rarity ?? 'common'] ?? 5) -
      (RARITY_PRIORITY[BADGE_CONFIG[b]?.rarity ?? 'common'] ?? 5)
    );
    const primaryOverride = metadata.selectedPrimaryBadge;
    if (primaryOverride && list.includes(primaryOverride as BadgeType)) {
      const filtered = sorted.filter(b => b !== primaryOverride);
      return [primaryOverride as BadgeType, ...filtered];
    }
    return sorted;
  };

  return (
    <div className="profile-page-root text-white pb-32 relative bg-[#0A0A0A]">
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

      <BadgeInfoModal 
        isOpen={isBadgeModalOpen}
        onClose={() => setIsBadgeModalOpen(false)}
        type={selectedBadgeForModal}
      />

      <ProfileActionSheet
        isOpen={actionSheetOpen}
        onClose={() => setActionSheetOpen(false)}
        userId={currentUser.id}
        username={username}
        displayName={displayName}
        isOwner={true}
        avatarUrl={avatar}
      />

      {/* Sleek Primary Badge Selection Popover */}
      <AnimatePresence>
        {isPrimaryBadgeDropdownOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPrimaryBadgeDropdownOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[340px] rounded-2xl bg-neutral-900 border border-white/[0.06] shadow-[0_24px_50px_rgba(0,0,0,0.85)] p-5 z-10 space-y-4 text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30 monospace">Customize Badge Preview</span>
                <button
                  onClick={() => setIsPrimaryBadgeDropdownOpen(false)}
                  className="text-white/40 hover:text-white text-xs select-none"
                >
                  ✕
                </button>
              </div>
              
              <p className="text-[11px] text-white/45 leading-relaxed font-semibold">
                Select which badge is featured on your profile header when collapsed.
              </p>
              
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto scrollbar-none pr-1">
                <button
                  type="button"
                  onClick={() => handleSelectPrimaryBadge(null)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs font-bold transition-all text-left uppercase tracking-wider ${
                    !metadata.selectedPrimaryBadge
                      ? 'bg-white text-black border-white'
                      : 'bg-white/[0.02] border-white/[0.04] text-white/60 hover:bg-white/[0.05]'
                  }`}
                >
                  <span>Auto (Highest Rarity)</span>
                  <span className="text-[9px] opacity-50">Default</span>
                </button>
                
                {prioritiseBadges(getActiveBadges(dbUser)).map((badge) => {
                  const isSelected = metadata.selectedPrimaryBadge === badge;
                  const cfg = BADGE_CONFIG[badge];
                  if (!cfg) return null;
                  return (
                    <button
                      key={badge}
                      type="button"
                      onClick={() => handleSelectPrimaryBadge(badge)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-xs font-bold transition-all text-left ${
                        isSelected
                          ? 'bg-white text-black border-white'
                          : 'bg-white/[0.02] border-white/[0.04] text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      <IdentityBadge type={badge} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold truncate uppercase text-[10.5px] leading-tight">{cfg.label}</p>
                        <p className={`text-[8.5px] font-black uppercase tracking-widest leading-none mt-0.5`} style={{ color: isSelected ? 'inherit' : cfg.rarityColor }}>{cfg.rarityLabel}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="h-[1px] bg-white/[0.06] my-2" />

              {/* Advanced logic controls */}
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/30 monospace block">Visibility & Prestige Toggles</span>

                {/* Toggle 1: Hide badges completely */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-white/80 uppercase tracking-wide">Hide Badges from Public</p>
                    <p className="text-[8.5px] text-white/30 font-semibold leading-relaxed mt-0.5">Completely hide badges from other users' visits.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleMetadataOption('hideBadgesFromProfile')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none shrink-0 ${
                      metadata.hideBadgesFromProfile ? 'bg-rose-500' : 'bg-white/[0.08]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                        metadata.hideBadgesFromProfile ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Toggle 2: Hide counts */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-white/80 uppercase tracking-wide">Hide Badge Count (+N)</p>
                    <p className="text-[8.5px] text-white/30 font-semibold leading-relaxed mt-0.5">Show only featured badge, hiding the count indicator.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleMetadataOption('hideBadgeCount')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none shrink-0 ${
                      metadata.hideBadgeCount ? 'bg-amber-500' : 'bg-white/[0.08]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                        metadata.hideBadgeCount ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Toggle 3: Glow Aura */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-white/80 uppercase tracking-wide">Prestige Glow Aura</p>
                    <p className="text-[8.5px] text-white/30 font-semibold leading-relaxed mt-0.5">Adds a colored ambient glow aura to the badge container.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleMetadataOption('badgeGlowAura')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none shrink-0 ${
                      metadata.badgeGlowAura ? 'bg-[#10b981]' : 'bg-white/[0.08]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                        metadata.badgeGlowAura ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Toggle 4: Chroma Border */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-white/80 uppercase tracking-wide">Chroma Aura Border</p>
                    <p className="text-[8.5px] text-white/30 font-semibold leading-relaxed mt-0.5">Applies a premium moving rainbow border around the badges pill.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleMetadataOption('chromaBorder')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none shrink-0 ${
                      metadata.chromaBorder ? 'bg-indigo-500' : 'bg-white/[0.08]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                        metadata.chromaBorder ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Toggle 5: Heartbeat Pulse */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-white/80 uppercase tracking-wide">Heartbeat Pulse</p>
                    <p className="text-[8.5px] text-white/30 font-semibold leading-relaxed mt-0.5">Forces the primary badge to pulse gently on hover.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleMetadataOption('heartbeatPulse')}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none shrink-0 ${
                      metadata.heartbeatPulse ? 'bg-fuchsia-500' : 'bg-white/[0.08]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                        metadata.heartbeatPulse ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Banners System (Preset or Uploaded) ── */}
      <div className="w-full h-44 sm:h-56 md:h-64 relative overflow-hidden bg-neutral-900 border-b border-white/[0.04] md:rounded-b-[24px]">
        {dbUser?.banner_url ? (
          <Image
            src={dbUser.banner_url}
            alt="Profile Banner"
            fill
            priority
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-violet-950 via-neutral-950 to-indigo-950 flex items-center justify-center opacity-70">
            <Compass className="w-16 h-16 text-white/5 animate-pulse" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      </div>

      <div className="max-w-[1000px] mx-auto px-6 relative -mt-16 sm:-mt-20">
        
        {/* ── Header Information Block ── */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 pb-8 border-b border-white/[0.06]">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5 w-full lg:w-auto">
            {/* Wrapper for Avatar + Stats next to it on mobile (aligned to bottom edge of avatar, below banner) */}
            <div className="flex items-end justify-between sm:justify-start gap-6 w-full sm:w-auto shrink-0 relative z-10">
              {/* Elevated Avatar Layering */}
              <div className="relative group shrink-0">
                {/* ProfileFrame temporarily hidden — revisit later */}
                {/* <ProfileFrame
                  badges={getActiveBadges(dbUser)}
                  selectedFrameBadge={metadata.selectedFrameBadge}
                  className="absolute -inset-4 z-10"
                /> */}
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-4 ring-[#0A0A0A] lux-shadow bg-neutral-950 relative">
                  <Image
                    src={avatar}
                    alt={displayName}
                    fill
                    sizes="(max-width: 640px) 112px, 128px"
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Stats Panel next to avatar (below the banner area) */}
              <div className="flex lg:hidden flex-1 items-center justify-around gap-2 max-w-[280px] sm:max-w-none px-2 sm:px-6 mb-2 translate-y-4">
                <div className="text-center cursor-default">
                  <div className="text-[17px] font-black text-white">{postCount}</div>
                  <div className="text-[10px] font-bold text-white/35 uppercase tracking-widest mt-0.5">Posts</div>
                </div>
                <div className="text-center cursor-pointer" onClick={() => setFollowModal('followers')}>
                  <div className="text-[17px] font-black text-white">{followers}</div>
                  <div className="text-[10px] font-bold text-white/35 uppercase tracking-widest mt-0.5">Followers</div>
                </div>
                <div className="text-center cursor-pointer" onClick={() => setFollowModal('following')}>
                  <div className="text-[17px] font-black text-white">{following}</div>
                  <div className="text-[10px] font-bold text-white/35 uppercase tracking-widest mt-0.5">Following</div>
                </div>
              </div>
            </div>

            {/* Profile Text Block */}
            <div className="space-y-2.5 sm:pt-10">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-extrabold tracking-tight text-white">{displayName}</h1>

                {dbUser?.pronouns && (
                  <span className="text-[14px] font-medium text-white/40 lowercase ml-1">
                    {dbUser.pronouns}
                  </span>
                )}
                


                {/* Premium Identity Badges — top 1 shown, rest collapsed inside custom expander */}
                {(() => {
                  const allBadges = prioritiseBadges(getActiveBadges(dbUser));
                  if (allBadges.length === 0) return null;

                  const isCountHidden = metadata.hideBadgeCount;
                  const shown = (badgesExpanded && !isCountHidden) ? allBadges : allBadges.slice(0, 1);
                  const extra = isCountHidden ? 0 : (allBadges.length - shown.length);
                  const firstBadge = allBadges[0];
                  const hasGlow = metadata.badgeGlowAura;
                  const isHidden = metadata.hideBadgesFromProfile;

                  const hasChroma = metadata.chromaBorder;

                  return (
                    <div 
                      style={(hasGlow && firstBadge && !hasChroma) ? {
                        boxShadow: `0 0 10px ${BADGE_CONFIG[firstBadge]?.glowColor.replace(/[\d.]+\)$/, '0.35)') || 'rgba(255,255,255,0.15)'}`,
                        borderColor: BADGE_CONFIG[firstBadge]?.primaryColor || 'rgba(255,255,255,0.08)'
                      } : {}}
                      className={`flex items-center gap-1.5 backdrop-blur-md px-1.5 py-0.5 rounded-full relative overflow-visible shrink-0 transition-all duration-300 ${
                        isHidden ? 'border-dashed border-rose-500/30 opacity-70 bg-neutral-950/40' : 
                        hasChroma ? 'border border-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-[length:200%_200%] animate-[pulse_3s_infinite]' :
                        'border border-white/[0.04] bg-neutral-950/40'
                      }`}
                    >
                      {isHidden && (
                        <span className="text-[7.5px] font-black text-rose-400 uppercase tracking-widest px-1 py-0.5 rounded bg-rose-500/10 scale-90 border border-rose-500/20">
                          Hidden
                        </span>
                      )}
                      <AnimatePresence mode="popLayout">
                        {shown.map((badgeType, idx) => {
                          const isFirst = idx === 0;
                          const pulseAnim = (metadata.heartbeatPulse && isFirst) ? {
                            scale: [1, 1.08, 0.96, 1.08, 1],
                          } : { scale: 1 };
                          const pulseTrans = (metadata.heartbeatPulse && isFirst) ? {
                            repeat: Infinity,
                            duration: 2.0,
                            ease: 'easeInOut'
                          } : undefined;

                          return (
                            <motion.div
                              key={badgeType}
                              layoutId={`badge-${badgeType}`}
                              initial={{ opacity: 0, scale: 0.8, x: -6 }}
                              animate={{ opacity: 1, x: 0, ...pulseAnim }}
                              exit={{ opacity: 0, scale: 0.8, x: -6 }}
                              transition={pulseTrans || { type: 'spring', stiffness: 350, damping: 25 }}
                            >
                            <IdentityBadge
                              type={badgeType}
                              onClick={(type) => {
                                setSelectedBadgeForModal(type);
                                setIsBadgeModalOpen(true);
                              }}
                              size="sm"
                            />
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>

                      {!badgesExpanded && extra > 0 && (
                        <motion.button
                          type="button"
                          onClick={() => setBadgesExpanded(true)}
                          className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] active:scale-95 transition-all text-[8.5px] font-black text-white/50 hover:text-white uppercase tracking-wider cursor-pointer select-none"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                        >
                          +{extra}
                        </motion.button>
                      )}

                      {badgesExpanded && (
                        <motion.button
                          type="button"
                          onClick={() => setBadgesExpanded(false)}
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.10] active:scale-95 transition-all text-[8px] font-black text-white/50 hover:text-white uppercase cursor-pointer select-none"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                        >
                          ✕
                        </motion.button>
                      )}

                      {/* Mobile customize trigger */}
                      <button
                        type="button"
                        id="customize-badge-btn-mobile"
                        onClick={() => setIsPrimaryBadgeDropdownOpen(p => !p)}
                        className="sm:hidden w-4 h-4 flex items-center justify-center rounded-full bg-amber-500/20 hover:bg-amber-500/35 text-amber-400 border border-amber-500/30 active:scale-95 transition-all outline-none"
                        title="Customize Badge Preview"
                      >
                        <Award size={9} />
                      </button>
                    </div>
                  );
                })()}
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <p className="text-[13.5px] text-white/30 font-semibold tracking-wide">@{username}</p>
              </div>

              {/* Biography content shifted here */}
              {visibleBio && (
                <p className="md:hidden text-[15px] text-white/80 leading-relaxed font-medium mt-1">
                  <BioText bio={visibleBio} profileUsername={username} />
                </p>
              )}



              {/* Expertise Tags Block */}
              {dbUser?.expertise_tags && dbUser.expertise_tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {dbUser.expertise_tags.map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10.5px] font-extrabold uppercase tracking-wider text-indigo-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Dynamic Status Badging */}
              {metadata.statusText && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] text-xs font-bold text-white/85 shadow-inner">
                  {statusIconConfig && (
                    <statusIconConfig.icon size={13} className={`${statusIconConfig.color} ${statusIconConfig.animationClass} shrink-0`} />
                  )}
                  <span>{metadata.statusText}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-3 w-full lg:w-auto lg:pt-0 lg:justify-end">
            <button
              type="button"
              id="edit-profile-btn"
              onClick={() => setIsEditing(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-[14px] font-bold bg-white text-black hover:bg-neutral-200 transition-all active:scale-[0.97]"
            >
              <Edit3 size={15} />
              Edit Profile
            </button>

            {(dbUser?.is_private || pendingRequestsCount > 0) && (
              <button
                type="button"
                id="requests-btn"
                onClick={() => setShowRequestsModal(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-[14px] font-bold bg-white/[0.04] text-white border border-white/[0.08] hover:bg-white/[0.08] transition-all active:scale-[0.97] relative"
              >
                <Users size={15} />
                <span>Requests</span>
                {pendingRequestsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center border border-[#0A0A0A] lux-shadow">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              id="options-profile-btn"
              onClick={() => setActionSheetOpen(true)}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-white/[0.04] text-white border border-white/[0.08] hover:bg-white/[0.08] transition-all active:scale-[0.97] shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
            >
              <MoreHorizontal size={18} />
            </button>

            <button
              type="button"
              id="customize-badge-btn-desktop"
              onClick={() => setIsPrimaryBadgeDropdownOpen(p => !p)}
              title="Select Featured Badge"
              className="hidden sm:flex w-11 h-11 items-center justify-center rounded-full bg-[#10b981]/25 hover:bg-[#10b981]/40 text-[#10b981] border border-[#10b981]/30 transition-all active:scale-[0.97] shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
            >
              <Award size={18} />
            </button>
          </div>
        </div>

        {/* ── Responsive Two Column Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
          
          {/* ── LEFT COLUMN: Posts feed & tab navigation ── */}
          <div className="space-y-8 min-w-0 order-2 lg:order-1">
            {/* Biography content (Desktop only) */}
            {visibleBio && (
              <div className="hidden md:block space-y-2">
                <h3 className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest leading-none">About</h3>
                <p className="text-[15px] text-white/80 leading-relaxed font-medium">
                  <BioText bio={visibleBio} profileUsername={username} />
                </p>
              </div>
            )}
            {/* Pinned Posts Area */}
            {pinnedPosts.length > 0 && tab === 'posts' && (
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-blue-400">
                  <Pin size={13} className="rotate-45 fill-current" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">Pinned Archives</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pinnedPosts.map((post) => (
                    <div 
                      key={post.id}
                      className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.08] hover:border-white/20 transition-all relative group shadow-lg"
                    >
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Pinned</span>
                        <button
                          type="button"
                          onClick={() => handleTogglePin(post.id, true)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-neutral-900 border border-white/10 text-white/50 hover:text-white transition-all"
                          title="Unpin Post"
                        >
                          <Pin size={11} className="fill-current" />
                        </button>
                      </div>
                      <p className="text-[13.5px] text-white/80 line-clamp-3 leading-relaxed mb-4 cursor-pointer" onClick={() => window.location.href = `/feed/${post.id}`}>
                        {post.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs font-bold text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Heart size={13} className="fill-neutral-500/10" />
                          {post.likeCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle size={13} />
                          {post.commentCount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab navigation */}
            <div className="flex items-center gap-8 border-b border-white/[0.06]">
              <TabButton active={tab === 'posts'} onClick={() => setTab('posts')} icon={Grid3x3} label="Posts" />
              <TabButton active={tab === 'reposts'} onClick={() => setTab('reposts')} icon={Repeat2} label="Reposts" />
              <TabButton active={tab === 'saved'} onClick={() => setTab('saved')} icon={Bookmark} label="Saved" />
              <TabButton active={tab === 'activity'} onClick={() => setTab('activity')} icon={Calendar} label="Timeline" />
            </div>

            {/* Content lists */}
            <div className="min-h-[600px]" style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}>
              <AnimatePresence mode="wait">
                {tab === 'posts' && (
                  <motion.div 
                    key="posts" 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {loadingPosts ? (
                      <PostsSkeleton />
                    ) : normalPosts.length === 0 && pinnedPosts.length === 0 ? (
                      <EmptyState
                        icon={Ghost}
                        title="No posts yet"
                        subtitle="Your shared posts and creations will appear here."
                      />
                    ) : (
                      <div className="grid grid-cols-3 gap-1">
                        {normalPosts.map((p, i) => (
                          <PostGridItem 
                            key={p.id} 
                            post={p} 
                            index={i} 
                            isOwner={true}
                            onTogglePin={() => handleTogglePin(p.id, p.isPinned)}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {tab === 'reposts' && (
                  <motion.div 
                    key="reposts" 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {loadingReposts ? (
                      <PostsSkeleton />
                    ) : reposts.length === 0 ? (
                      <EmptyState
                        icon={Repeat2}
                        title="No reposts yet"
                        subtitle="Posts you repost will appear here."
                      />
                    ) : (
                      <div className="grid grid-cols-3 gap-1">
                        {reposts.map((p, i) => (
                          <PostGridItem 
                            key={p.id} 
                            post={p} 
                            index={i} 
                            isOwner={false}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {tab === 'saved' && (
                  <motion.div 
                    key="saved" 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {loadingSavedPosts ? (
                      <PostsSkeleton />
                    ) : savedPosts.length === 0 ? (
                      <EmptyState
                        icon={Bookmark}
                        title="Vault Empty"
                        subtitle="Saved data will appear in your private archive."
                      />
                    ) : (
                      <div className="grid grid-cols-3 gap-1">
                        {savedPosts.map((p, i) => (
                          <PostGridItem 
                            key={p.id} 
                            post={p} 
                            index={i} 
                            isOwner={false}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {tab === 'activity' && (
                  <motion.div 
                    key="activity" 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ProfileTimeline milestones={milestones} loading={loadingMilestones} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Metadata details, music, tags, completion ── */}
          <div className="space-y-8 lg:sticky lg:top-24 h-fit order-1 lg:order-2">
            
            {/* Interactive Stats Panel */}
            <div className="hidden lg:grid p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] grid grid-cols-3 gap-4 text-center">
              <StatItem label="Posts" value={postCount} onClick={null} />
              <StatItem label="Followers" value={followers} onClick={() => setFollowModal('followers')} />
              <StatItem label="Following" value={following} onClick={() => setFollowModal('following')} />
            </div>

            {/* Followers / Following list modal overlay */}
            {followModal && (
              <FollowListModal
                userId={currentUser.id}
                type={followModal}
                onClose={() => setFollowModal(null)}
              />
            )}

            {/* Profile Music System */}
            {pinnedTrack && (
              <div className="space-y-2">
                <h3 className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest leading-none">Identity Track</h3>
                <ProfileMusicCard track={pinnedTrack} />
              </div>
            )}

            {/* Profile Completion level */}
            {completionPercent < 100 && (
              <div className="p-4 rounded-xl bg-white/[0.015] border border-white/[0.05] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <Compass size={12} className="text-neutral-500" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Complete Profile</span>
                  </div>
                  <span className="text-[10px] font-bold text-neutral-400 tabular-nums">{completionPercent}%</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercent}%` }}
                    className="h-full bg-indigo-500 rounded-full"
                  />
                </div>
                <ul className="text-[10px] text-neutral-500 space-y-1.5 leading-relaxed">
                  {completionFields.filter(f => !f.value).slice(0, 2).map((field, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-neutral-600" />
                      Add your {field.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Interest Tags */}
            {metadata.tags && metadata.tags.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest leading-none">Interests</h3>
                <div className="flex flex-wrap gap-1.5">
                  {metadata.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-xs font-bold text-white/70 transition-colors cursor-default"
                    >
                      <Hash size={11} className="text-white/30" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Profile Information Card */}
            <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/[0.05] space-y-4">
              <h3 className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest leading-none mb-2">Details</h3>
              
              <div className="space-y-3.5 text-[13.5px] font-semibold text-white/70">
                {metadata.occupation && (
                  <div className="flex items-center gap-3 w-full">
                    <Briefcase size={15} className="text-white/30 shrink-0" />
                    <span className="truncate">{metadata.occupation}</span>
                    {renderPrivacyBadge('occupation')}
                  </div>
                )}
                {metadata.education && (
                  <div className="flex items-center gap-3 w-full">
                    <GraduationCap size={15} className="text-white/30 shrink-0" />
                    <span className="truncate">{metadata.education}</span>
                    {renderPrivacyBadge('education')}
                  </div>
                )}
                {metadata.location && (
                  <div className="flex items-center gap-3 w-full">
                    <MapPin size={15} className="text-white/30 shrink-0" />
                    <span className="truncate">{metadata.location}</span>
                    {renderPrivacyBadge('location')}
                  </div>
                )}
                {dbUser?.custom_link && (
                  <div className="flex items-center gap-3 w-full">
                    <Link2 size={15} className="text-white/30 shrink-0" />
                    <a
                      href={dbUser.custom_link.startsWith('http') ? dbUser.custom_link : `https://${dbUser.custom_link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline truncate hover:text-blue-300"
                    >
                      {dbUser.custom_link.replace(/^https?:\/\/(www\.)?/, '')}
                    </a>
                    {renderPrivacyBadge('customLink')}
                  </div>
                )}
                {metadata.birthday && metadata.birthdayVisible !== false && (() => {
                  let dateStr = '';
                  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                  const parts = metadata.birthday.split('-');
                  const mode = metadata.birthdayMode || 'date_month_year';
                  if (parts.length === 3) {
                    const year = parts[0];
                    const month = months[parseInt(parts[1], 10) - 1];
                    const day = parseInt(parts[2], 10);
                    if (mode === 'date_month') {
                      dateStr = `${month} ${day}`;
                    } else {
                      dateStr = `${month} ${day}, ${year}`;
                    }
                  } else if (parts.length === 2) {
                    const month = months[parseInt(parts[0], 10) - 1];
                    const day = parseInt(parts[1], 10);
                    dateStr = `${month} ${day}`;
                  }
                  if (!dateStr) return null;
                  return (
                    <div className="flex items-center gap-3 w-full">
                      <Cake size={15} className="text-white/30 shrink-0" />
                      <span className="truncate">Born {dateStr}</span>
                    </div>
                  );
                })()}
                <div className="flex items-center gap-3 text-white/40 font-medium">
                  <Calendar size={15} className="text-white/20 shrink-0" />
                  <span>Joined {joinedDate}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {showRequestsModal && (
        <FollowRequestsModal
          onClose={() => setShowRequestsModal(false)}
          onUpdate={fetchProfile}
        />
      )}
    </div>
  );
}

// ── Supporting Subcomponents ───────────────────────────────────────────────────

function StatItem({ label, value, onClick }: { label: string; value: number | string; onClick: (() => void) | null }) {
  const content = (
    <div className="flex flex-col items-center gap-0.5 group">
      <motion.span key={String(value)} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[19px] font-extrabold text-white tracking-tight">{kFmt(Number(value))}</motion.span>
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/30 group-hover:text-white/50 transition-colors">{label}</span>
    </div>
  );

  if (onClick) {
    return (
      <button 
        type="button"
        onClick={onClick}
        className="flex-1 py-1 rounded-xl hover:bg-white/[0.02] active:scale-95 transition-all outline-none"
      >
        {content}
      </button>
    );
  }

  return <div className="flex-1 py-1">{content}</div>;
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button type="button"
      onClick={onClick}
      className={`relative flex items-center gap-2.5 py-4 text-[12px] font-bold transition-all ${
        active ? 'text-white' : 'text-white/30 hover:text-white/60'
      }`}
    >
      <Icon size={15} />
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

function PostGridItem({ 
  post, 
  index, 
  isOwner = false,
  onTogglePin 
}: { 
  post: any; 
  index: number; 
  isOwner?: boolean;
  onTogglePin?: () => void;
}) {
  const hasImage = post.mediaUrls?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.01, duration: 0.3 }}
      className="aspect-square bg-white/[0.02] relative group cursor-pointer overflow-hidden rounded-xl border border-white/[0.03] hover:border-white/10"
    >
      {hasImage ? (
        <img
          src={post.mediaUrls[0]}
          alt="post"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          loading="lazy"
          onClick={() => (window.location.href = `/feed/${post.id}`)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-5 bg-white/[0.01]" onClick={() => (window.location.href = `/feed/${post.id}`)}>
          <p className="text-[12px] text-white/50 line-clamp-4 text-center leading-relaxed font-semibold">
            {post.content}
          </p>
        </div>
      )}

      {/* Pin badge overlay */}
      {post.isPinned && (
        <div className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/80 border border-white/10 text-blue-400 z-10">
          <Pin size={11} className="fill-current rotate-45" />
        </div>
      )}

      {/* Modern Interaction Overlay */}
      <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-6 pointer-events-none">
        <div className="flex flex-col items-center gap-1.5 text-white translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-[50ms]">
          <Heart size={18} className="fill-white" />
          <span className="text-[11px] font-bold">{kFmt(post.likeCount || 0)}</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 text-white translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-[100ms]">
          <MessageCircle size={18} className="fill-white" />
          <span className="text-[11px] font-bold">{kFmt(post.commentCount || 0)}</span>
        </div>
      </div>

      {/* Owner Pin Action Button */}
      {isOwner && onTogglePin && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-neutral-900 border border-white/10 text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-all z-20"
          title={post.isPinned ? "Unpin post" : "Pin post"}
        >
          <Pin size={11} className={post.isPinned ? "fill-current text-blue-400" : ""} />
        </button>
      )}
    </motion.div>
  );
}

function PostsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="aspect-square bg-white/[0.02] border border-white/[0.04] animate-pulse rounded-xl" />
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
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center bg-white/[0.01] border border-white/[0.03] rounded-2xl p-6">
      <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-1 border border-white/[0.05]">
        <Icon size={24} className="text-white/20" />
      </div>
      <div>
        <p className="text-[14px] font-extrabold text-white/50 uppercase tracking-widest">{title}</p>
        <p className="text-xs text-white/25 mt-1 max-w-[260px] leading-relaxed font-semibold">{subtitle}</p>
      </div>
    </div>
  );
}
