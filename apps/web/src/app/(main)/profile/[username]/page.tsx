'use client';

import { useAppStore } from '@/lib/store';
import Image from 'next/image';
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
  Clock,
  Repeat2,
  Cake
} from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import type { User } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvatarUrl } from '@/lib/utils';
import {
  isFollowingDB,
  getMutualFollowersDB,
  getFollowRequestStatusDB,
  getProfilePostsDB,
  getProfileRepostsDB,
  toggleFollowDB,
  cancelFollowRequestDB,
  sendFollowRequestDB,
  acceptFollowRequestDB,
  rejectFollowRequestDB
} from '@/app/(main)/profile/actions';
import { getDatabaseProfile, logProfileVisit, getProfileMilestones, fetchPublicProfileSafe } from '@/app/(main)/profile/actionsCore';
import { blockUserDB, unblockUserDB } from '@/app/(main)/messages/actions';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Ban } from 'lucide-react';
import FollowListModal from '@/components/features/profile/FollowListModal';
import { parseBio, getStatusIcon } from '@/lib/profile-metadata';
import { ProfileMusicCard } from '@/components/features/music/ProfileMusicCard';
import ProfileActionSheet from '@/components/features/profile/ProfileActionSheet';
import IdentityBadge, { BadgeType, BADGE_CONFIG } from '@/components/ui/IdentityBadge';
import BadgeInfoModal from '@/components/ui/BadgeInfoModal';
import ProfileFrame from '@/components/ui/ProfileFrame';
import BioText from '@/components/features/profile/BioText';
import ProfileTimeline from '@/components/features/profile/ProfileTimeline';

function kFmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}



type Tab = 'posts' | 'reposts' | 'saved' | 'activity';

export default function PublicProfilePage() {
  const { username } = useParams() as { username: string };
  const router = useRouter();

  const [profileUser, setProfileUser] = useState<any | null>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [localFollowerCount, setLocalFollowerCount] = useState<number | null>(null);
  const [dbFollowing, setDbFollowing] = useState<boolean | null>(null);
  const [isFollower, setIsFollower] = useState<boolean>(false);
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [mutuals, setMutuals] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [reposts, setReposts] = useState<any[]>([]);
  const [loadingReposts, setLoadingReposts] = useState(false);

  // Advanced Block states
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [hasBlockedMe, setHasBlockedMe] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showUnblockConfirm, setShowUnblockConfirm] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [followRequestStatus, setFollowRequestStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [incomingFollowRequestStatus, setIncomingFollowRequestStatus] = useState<'pending' | 'none'>('none');
  const [showUnfollowPrivateConfirm, setShowUnfollowPrivateConfirm] = useState(false);

  const [selectedBadgeForModal, setSelectedBadgeForModal] = useState<BadgeType | null>(null);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [badgesExpanded, setBadgesExpanded] = useState(false);

  useEffect(() => {
    if (!badgesExpanded) return;
    const timer = setTimeout(() => {
      setBadgesExpanded(false);
    }, 15000);
    return () => clearTimeout(timer);
  }, [badgesExpanded]);

  const currentUser = useAppStore(s => s.currentUser);
  const isFollowing = useAppStore(s => s.isFollowing);
  const toggleFollow = useAppStore(s => s.toggleFollow);
  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(async () => {
    if (!username) return;

    if (currentUser?.username && currentUser.username.toLowerCase() === username.toLowerCase()) {
      router.push('/profile');
      return;
    }

    const res = await fetchPublicProfileSafe(currentUser?.id, username);
    if (!res.success) {
      setLoading(false);
      return;
    }

    if (res.hasBlockedMe) {
      setHasBlockedMe(true);
      setLoading(false);
      return;
    }

    if (res.isBlockedByMe) {
      setIsBlockedByMe(true);
    } else {
      setIsBlockedByMe(false);
      setHasBlockedMe(false);
    }

    const user = res.user;
    if (user) {
      const statsRes = await getDatabaseProfile(user.id);
      const followerCount = statsRes.success && statsRes.data ? statsRes.data.follower_count : (user.follower_count || 0);
      const followingCount = statsRes.success && statsRes.data ? statsRes.data.following_count : (user.following_count || 0);
      
      setProfileUser({
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar_url,
        bio: user.bio,
        isVerified: user.is_verified,
        isPrivate: user.is_private,
        karmaScore: user.karma_score || 0,
        followerCount: followerCount,
        followingCount: followingCount,
        role: user.role || 'PUBLIC',
        createdAt: user.created_at,
        bannerUrl: statsRes.success && statsRes.data ? statsRes.data.banner_url : null,
        pronouns: statsRes.success && statsRes.data ? statsRes.data.pronouns : null,
        customLink: statsRes.success && statsRes.data ? statsRes.data.custom_link : null,
        pinnedTrackId: statsRes.success && statsRes.data ? statsRes.data.pinned_track_id : null,
        pinnedTrackName: statsRes.success && statsRes.data ? statsRes.data.pinned_track_name : null,
        pinnedTrackArtist: statsRes.success && statsRes.data ? statsRes.data.pinned_track_artist : null,
        pinnedTrackArtwork: statsRes.success && statsRes.data ? statsRes.data.pinned_track_artwork : null,
        pinnedTrackSource: statsRes.success && statsRes.data ? statsRes.data.pinned_track_source : null,
        securityScore: statsRes.success && statsRes.data ? statsRes.data.security_score : 0,
        quote: statsRes.success && statsRes.data ? statsRes.data.quote : null,
        presenceStatus: statsRes.success && statsRes.data ? statsRes.data.presence_status : null,
        expertiseTags: statsRes.success && statsRes.data ? statsRes.data.expertise_tags : [],
      });

      setLoadingMilestones(true);
      const mRes = await getProfileMilestones(user.id);
      if (mRes.success && mRes.data) {
        setMilestones(mRes.data);
      }
      setLoadingMilestones(false);

      if (currentUser?.id) {
        const amFollowing = await isFollowingDB(currentUser.id, user.id);
        setDbFollowing(amFollowing);

        if (user.is_private && !amFollowing) {
          const reqStatusRes = await getFollowRequestStatusDB(user.id);
          setFollowRequestStatus(reqStatusRes.status);
        }

        const isFollowerRes = await isFollowingDB(user.id, currentUser.id);
        setIsFollower(isFollowerRes);

        // Check if this user has requested to follow me
        const { data: incomingReq } = await supabase
          .from('follow_requests')
          .select('status')
          .eq('requester_id', user.id)
          .eq('target_id', currentUser.id)
          .eq('status', 'pending')
          .maybeSingle();

        setIncomingFollowRequestStatus(incomingReq ? 'pending' : 'none');

        const mutualsRes = await getMutualFollowersDB(currentUser.id, user.id);
        if (mutualsRes.success) {
          setMutuals(mutualsRes.data);
        }
      } else {
        setDbFollowing(false);
        setIsFollower(false);
      }

      if (!res.isBlockedByMe) {
        const postsRes = await getProfilePostsDB(user.id);
        if (postsRes.success && postsRes.posts) {
          setUserPosts(
            postsRes.posts.map((p: any) => ({
              id: p.id,
              content: p.content,
              mediaUrls: p.mediaUrls || [],
              likeCount: p.likeCount || 0,
              commentCount: p.commentCount || 0,
              isPinned: p.isPinned || false,
              createdAt: p.createdAt,
            }))
          );
        } else {
          setUserPosts([]);
        }
      } else {
        setUserPosts([]);
      }
    }

    setLoading(false);
  }, [username, currentUser?.username, currentUser?.id, supabase, router]);

  const loadReposts = useCallback(async () => {
    if (!profileUser?.id) return;
    setLoadingReposts(true);
    const res = await getProfileRepostsDB(profileUser.id);
    if (res.success && res.posts) {
      setReposts(res.posts);
    } else {
      setReposts([]);
    }
    setLoadingReposts(false);
  }, [profileUser?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (activeTab === 'reposts') {
      loadReposts();
    }
  }, [activeTab, loadReposts]);

  useEffect(() => {
    if (!profileUser?.id) return;

    // Consolidated single realtime channel for the public profile page
    const channel = supabase
      .channel(`public_profile_page_realtime:${profileUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${profileUser.id}`,
        },
        (payload: any) => {
          console.log('[REALTIME PUBLIC PROFILE] Update received:', payload.new);
          setLocalFollowerCount(null); // Clear local count override
          setProfileUser((prev: any) => {
            if (!prev) return null;
            return {
              ...prev,
              displayName: payload.new.display_name ?? prev.displayName,
              username: payload.new.username ?? prev.username,
              avatar: payload.new.avatar_url ?? prev.avatar,
              bio: payload.new.bio ?? prev.bio,
              isVerified: payload.new.is_verified ?? prev.isVerified,
              isPrivate: payload.new.is_private ?? prev.isPrivate,
              role: payload.new.role ?? prev.role,
              bannerUrl: payload.new.banner_url ?? prev.bannerUrl,
              pronouns: payload.new.pronouns ?? prev.pronouns,
              customLink: payload.new.custom_link ?? prev.customLink,
              pinnedTrackId: payload.new.pinned_track_id ?? prev.pinnedTrackId,
              pinnedTrackName: payload.new.pinned_track_name ?? prev.pinnedTrackName,
              pinnedTrackArtist: payload.new.pinned_track_artist ?? prev.pinnedTrackArtist,
              pinnedTrackArtwork: payload.new.pinned_track_artwork ?? prev.pinnedTrackArtwork,
              pinnedTrackSource: payload.new.pinned_track_source ?? prev.pinnedTrackSource,
              securityScore: payload.new.security_score ?? prev.securityScore,
              quote: payload.new.quote ?? prev.quote,
              presenceStatus: payload.new.presence_status ?? prev.presenceStatus,
              expertiseTags: payload.new.expertise_tags ?? prev.expertiseTags,
              followerCount: payload.new.follower_count ?? prev.followerCount,
              followingCount: payload.new.following_count ?? prev.followingCount,
            };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'followers',
          filter: `following_id=eq.${profileUser.id}`,
        },
        async (payload: any) => {
          const isRelated = 
            payload.eventType === 'DELETE' || // Fallback for DELETE events
            payload.new?.follower_id === profileUser.id ||
            payload.new?.following_id === profileUser.id ||
            payload.old?.follower_id === profileUser.id ||
            payload.old?.following_id === profileUser.id ||
            (currentUser?.id && (
              payload.new?.follower_id === currentUser.id ||
              payload.new?.following_id === currentUser.id ||
              payload.old?.follower_id === currentUser.id ||
              payload.old?.following_id === currentUser.id
            ));

          if (isRelated) {
            console.log('[REALTIME PUBLIC FOLLOWS] Change received, refetching stats...');
            setLocalFollowerCount(null); // Clear local count override
            const statsRes = await getDatabaseProfile(profileUser.id);
            if (statsRes.success && statsRes.data) {
              setProfileUser((prev: any) => {
                if (!prev) return null;
                return {
                  ...prev,
                  followerCount: statsRes.data.follower_count,
                  followingCount: statsRes.data.following_count,
                };
              });
            }

            if (currentUser?.id) {
              const amFollowing = await isFollowingDB(currentUser.id, profileUser.id);
              setDbFollowing(amFollowing);

              const isFollowerRes = await isFollowingDB(profileUser.id, currentUser.id);
              setIsFollower(isFollowerRes);

              const mutualsRes = await getMutualFollowersDB(currentUser.id, profileUser.id);
              if (mutualsRes.success) {
                setMutuals(mutualsRes.data);
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follow_requests',
        },
        async (payload: any) => {
          if (!currentUser?.id) return;
          const isRelated = 
            (payload.new?.requester_id === currentUser.id && payload.new?.target_id === profileUser.id) ||
            (payload.old?.requester_id === currentUser.id && payload.old?.target_id === profileUser.id) ||
            (payload.new?.requester_id === profileUser.id && payload.new?.target_id === currentUser.id) ||
            (payload.old?.requester_id === profileUser.id && payload.old?.target_id === currentUser.id);

          if (isRelated) {
            console.log('[REALTIME PUBLIC REQUESTS] Change received, updating follow request states...');
            
            // Check follow request status from me to them
            const reqStatusRes = await getFollowRequestStatusDB(profileUser.id);
            setFollowRequestStatus(reqStatusRes.status);
            
            // Check incoming follow request status from them to me
            const { data: incomingReq } = await supabase
              .from('follow_requests')
              .select('status')
              .eq('requester_id', profileUser.id)
              .eq('target_id', currentUser.id)
              .eq('status', 'pending')
              .maybeSingle();

            setIncomingFollowRequestStatus(incomingReq ? 'pending' : 'none');

            if (payload.new?.status === 'accepted') {
              // Request accepted → immediately move to FOLLOWING state
              setDbFollowing(true);
              // Reset to 'none' — amFollowing=true now drives the button, not followRequestStatus
              setFollowRequestStatus('none');
              window.dispatchEvent(new CustomEvent('verlyn:toast', {
                detail: {
                  message: `@${profileUser.username} accepted your follow request`,
                  type: 'success',
                },
              }));
              // Sync counts from DB (followers realtime channel will also fire)
              const statsRes = await getDatabaseProfile(profileUser.id);
              if (statsRes.success && statsRes.data) {
                setLocalFollowerCount(null);
                setProfileUser((prev: any) => prev ? {
                  ...prev,
                  followerCount: statsRes.data.follower_count,
                  followingCount: statsRes.data.following_count,
                } : null);
              }
              loadReposts();
            } else if (payload.eventType === 'DELETE' || payload.new?.status === 'rejected') {
              // Request cancelled or rejected → back to NOT_FOLLOWING, NO count change
              setDbFollowing(false);
              setFollowRequestStatus('none');
            }

            // Authoritative DB sync after a delay long enough for the followers INSERT to commit
            setTimeout(async () => {
              const nowFollowing = await isFollowingDB(currentUser.id, profileUser.id);
              setDbFollowing(nowFollowing);
              const nowFollower = await isFollowingDB(profileUser.id, currentUser.id);
              setIsFollower(nowFollower);
            }, 1500);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_milestones',
          filter: `user_id=eq.${profileUser.id}`,
        },
        async () => {
          console.log('[REALTIME PUBLIC MILESTONES] Change received, refetching...');
          const mRes = await getProfileMilestones(profileUser.id);
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
          table: 'posts',
          filter: `author_id=eq.${profileUser.id}`,
        },
        () => {
          console.log('[REALTIME PUBLIC POSTS] Change received, reloading visitor feed and reposts...');
          fetchProfile();
          loadReposts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileUser?.id, currentUser?.id, fetchProfile, loadReposts, supabase]);



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
          <p className="text-[15px] font-bold text-white/40 uppercase tracking-widest">Profile Not Found</p>
          <p className="text-sm text-white/20">This account does not exist or has been deleted.</p>
        </div>
      </div>
    );
  }

  if (hasBlockedMe) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-6 px-6 text-center select-none">
        <div className="w-16 h-16 rounded-3xl bg-white/[0.03] flex items-center justify-center border border-white/[0.05] shadow-lg">
          <Lock size={28} className="text-white/20" />
        </div>
        <div className="space-y-1.5 max-w-sm">
          <p className="text-[15px] font-bold text-white/50 uppercase tracking-widest leading-none">User Unavailable</p>
          <p className="text-xs text-white/35 leading-relaxed">This account is private, unavailable, or you have been blocked from viewing it.</p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="mt-2 px-6 py-2.5 bg-white text-black font-semibold rounded-full hover:bg-neutral-200 transition-all text-xs active:scale-[0.98] cursor-pointer shadow-md"
        >
          Go Back Home
        </button>
      </div>
    );
  }

  const isBot = !!(profileUser?.username && (
    profileUser.username.toLowerCase() === 'verlyn' ||
    profileUser.username.toLowerCase() === 'developer' ||
    profileUser.username.toLowerCase().includes('system') ||
    profileUser.username.toLowerCase().includes('bot')
  ));

  const amFollowing = dbFollowing !== null ? dbFollowing : isFollowing(profileUser?.id || '');
  const canSeePosts = (!profileUser?.isPrivate || amFollowing || isBot) && !isBlockedByMe;
  const displayFollowerCount = localFollowerCount ?? profileUser.followerCount ?? 0;
  const isVerified = profileUser.isVerified || profileUser.role === 'PRIME';

  // ── Public-only follow/unfollow with optimistic update ──
  // NEVER call this for private accounts — use the request flow instead
  const performUnfollowOrFollow = async (willFollow: boolean) => {
    if (!profileUser?.id) return;
    if (profileUser.isPrivate && !isBot) return; // safety guard
    // Optimistic UI update
    setLocalFollowerCount((c) => Math.max(0, (c ?? profileUser.followerCount) + (willFollow ? 1 : -1)));
    setDbFollowing(willFollow);
    toggleFollow(profileUser.id);
    // Fire server action (non-blocking, realtime will sync if needed)
    const res = await toggleFollowDB(currentUser!.id, profileUser.id, willFollow);
    if (!res.success) {
      // Rollback on error
      setLocalFollowerCount((c) => Math.max(0, (c ?? profileUser.followerCount) + (willFollow ? -1 : 1)));
      setDbFollowing(!willFollow);
      toggleFollow(profileUser.id);
      window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: res.error || 'Action failed', type: 'error' } }));
    }
  };

  // ── Private account confirmed unfollow ──
  const performPrivateUnfollow = async () => {
    if (!profileUser?.id || !currentUser?.id) return;
    setShowUnfollowPrivateConfirm(false);
    // Optimistic update
    setDbFollowing(false);
    setLocalFollowerCount((c) => Math.max(0, (c ?? profileUser.followerCount) - 1));
    toggleFollow(profileUser.id);
    const res = await toggleFollowDB(currentUser.id, profileUser.id, false);
    if (!res.success) {
      // Rollback
      setDbFollowing(true);
      setLocalFollowerCount((c) => (c ?? profileUser.followerCount) + 1);
      toggleFollow(profileUser.id);
      window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: res.error || 'Unfollow failed', type: 'error' } }));
    }
  };

  // ── Main follow button handler — proper state machine ──
  const handleFollow = async () => {
    if (!profileUser?.id || !currentUser?.id) return;

    // PRIVATE ACCOUNT FLOW
    if (profileUser.isPrivate && !isBot) {
      if (amFollowing) {
        // Already following → show unfollow confirmation
        setShowUnfollowPrivateConfirm(true);
        return;
      }
      // Not following → request flow only. NO fake follow state.
      if (followRequestStatus === 'pending') {
        // Cancel the existing request
        setFollowRequestStatus('none');
        const res = await cancelFollowRequestDB(profileUser.id);
        if (!res.success) {
          setFollowRequestStatus('pending'); // rollback
          window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: res.error || 'Failed to cancel request', type: 'error' } }));
        }
      } else {
        // Send request — button immediately shows "Requested"
        setFollowRequestStatus('pending');
        const res = await sendFollowRequestDB(profileUser.id);
        if (!res.success) {
          setFollowRequestStatus('none'); // rollback
          window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: res.error || 'Failed to send request', type: 'error' } }));
        }
      }
      return;
    }

    // PUBLIC ACCOUNT FLOW — optimistic follow/unfollow
    await performUnfollowOrFollow(!amFollowing);
  };

  const handleAcceptIncomingRequest = async () => {
    if (!profileUser?.id) return;
    try {
      const res = await acceptFollowRequestDB(profileUser.id);
      if (res.success) {
        window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: 'Follow request accepted', type: 'success' } }));
        setIncomingFollowRequestStatus('none');
        setIsFollower(true);
        // DO NOT touch localFollowerCount here — accepting their request means profileUser
        // is now following currentUser (profileUser.followingCount changes, not followerCount).
        // The realtime followers channel will sync the correct count from DB.
      } else {
        window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: res.error || 'Failed to accept request', type: 'error' } }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectIncomingRequest = async () => {
    if (!profileUser?.id) return;
    try {
      const res = await rejectFollowRequestDB(profileUser.id);
      if (res.success) {
        window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: 'Follow request declined', type: 'success' } }));
        setIncomingFollowRequestStatus('none');
      } else {
        window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: res.error || 'Failed to decline request', type: 'error' } }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBlockToggle = async (shouldBlock: boolean) => {
    if (!currentUser?.id || !profileUser?.id) return;
    setBlockLoading(true);
    try {
      if (shouldBlock) {
        const res = await blockUserDB(currentUser.id, profileUser.id);
        if (!res.success) throw new Error(res.error || 'Failed to block user');
        setIsBlockedByMe(true);
        if (dbFollowing) {
          setDbFollowing(false);
          setLocalFollowerCount((c) => Math.max(0, (c ?? profileUser.followerCount) - 1));
        }
        window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: `Blocked @${profileUser.username}`, type: 'success' } }));
      } else {
        const res = await unblockUserDB(currentUser.id, profileUser.id);
        if (!res.success) throw new Error(res.error || 'Failed to unblock user');
        setIsBlockedByMe(false);
        window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: `Unblocked @${profileUser.username}`, type: 'success' } }));
      }

      // Broadcast event in real-time
      const syncPayload = {
        blockedBy: currentUser.id,
        blockedTarget: profileUser.id,
        isBlocked: shouldBlock
      };
      
      const me = currentUser;
      const supabaseClient = createClient();
      const channel = supabaseClient.channel('chat:presence:global');
      await channel.send({
        type: 'broadcast',
        event: 'user_blocked',
        payload: syncPayload
      });
      supabaseClient.removeChannel(channel);

      const channelActive = supabaseClient.channel(`chat:conversations:${me.id}`);
      await channelActive.send({
        type: 'broadcast',
        event: 'user_blocked',
        payload: syncPayload
      });
      supabaseClient.removeChannel(channelActive);

    } catch (err: any) {
      console.error('[BlockToggle] Error:', err);
      window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: err.message || 'Action failed', type: 'error' } }));
    } finally {
      setBlockLoading(false);
    }
  };

  // Metadata parsing
  const { visibleBio, metadata } = parseBio(profileUser.bio);
  const statusIconConfig = getStatusIcon(metadata.statusEmoji);

  const isMutual = !!(dbFollowing && isFollower);
  const checkVisibility = (fieldKey: string) => {
    const setting = metadata.privacySettings?.[fieldKey as keyof typeof metadata.privacySettings] || 'public';
    if (setting === 'public') return true;
    if (setting === 'followers') return !!dbFollowing;
    if (setting === 'mutuals') return isMutual;
    if (setting === 'private' || setting === 'only_me') return false;
    return true;
  };

  // Pinned vs normal posts split
  const pinnedPosts = userPosts.filter(p => p.isPinned);
  const normalPosts = userPosts.filter(p => !p.isPinned);

  // Pinned music object construction
  const pinnedTrack = profileUser.pinnedTrackId ? {
    id: profileUser.pinnedTrackId,
    name: profileUser.pinnedTrackName || '',
    artist: profileUser.pinnedTrackArtist || '',
    artwork: profileUser.pinnedTrackArtwork || '',
    source: profileUser.pinnedTrackSource || 'spotify',
    embedId: profileUser.pinnedTrackId.split('_')[1] || profileUser.pinnedTrackId
  } : null;

  // Joined date formatting
  const joinedDate = profileUser.createdAt
    ? new Date(profileUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently';

  const getActiveBadges = (user: any): BadgeType[] => {
    if (!user) return [];
    const badges: BadgeType[] = [];
    const isS = user.username?.toLowerCase() === 's';

    // ── SINGULARITY ─────────────────────────────────────────────
    if (isS) badges.push('white_heart');

    // ── VERIFICATION ──────────────────────────────────────────
    if (!isS && (user.isVerified || user.role === 'PRIME')) badges.push('sovereign');
    if (!isS && (user.role === 'ADMIN' || user.role === 'DEVELOPER')) badges.push('architect');
    if (!isS && ((user.securityScore && user.securityScore > 80))) badges.push('guardian');
    if (!isS && (user.createdAt && new Date(user.createdAt).getFullYear() <= 2025)) badges.push('founding');

    // ── STREAK ───────────────────────────────────────────────
    const streak = user.metadata?.streak ?? user.metadata?.loginStreak ?? user.streakCount ?? 0;
    if (streak >= 365) badges.push('streak_365');
    else if (streak >= 100) badges.push('streak_100');
    else if (streak >= 30)  badges.push('streak_30');
    else if (streak >= 7)   badges.push('streak_7');
    else if (streak >= 3)   badges.push('streak_3');

    // ── FOLLOWERS ───────────────────────────────────────────
    const fc = user.followerCount ?? 0;
    if (fc >= 1000) badges.push('legend');
    else if (fc >= 500) badges.push('influencer');
    else if (fc >= 100) badges.push('popular');
    else if (fc >= 10)  badges.push('connected');
    else if (fc >= 1)   badges.push('first_follower');

    // ── PROFILE ─────────────────────────────────────────────
    if (user.avatar) badges.push('avatar_set');
    if (user.bio && user.bio.trim().length > 0) badges.push('bio_written');
    if (user.bannerUrl) badges.push('banner_hero');

    // ── COMMUNITY ───────────────────────────────────────────
    const joinedAt = user.createdAt ? new Date(user.createdAt) : null;
    const now = new Date();
    if (joinedAt && (now.getTime() - joinedAt.getTime()) > 365 * 24 * 60 * 60 * 1000)
      badges.push('veteran');
    if (joinedAt && joinedAt <= new Date('2025-02-01')) badges.push('early_adopter');

    return badges;
  };

  const RARITY_PRIORITY: Record<string, number> = {
    singularity: 0, mythic: 1, legendary: 2, epic: 3, rare: 4, common: 5,
  };
  const prioritiseBadges = (list: BadgeType[]) => {
    const sorted = [...list].sort((a, b) =>
      (RARITY_PRIORITY[BADGE_CONFIG[a]?.rarity ?? 'common'] ?? 5) -
      (RARITY_PRIORITY[BADGE_CONFIG[b]?.rarity ?? 'common'] ?? 5)
    );
    const meta = profileUser?.bio ? parseBio(profileUser.bio).metadata : {};
    const primaryOverride = meta.selectedPrimaryBadge;
    if (primaryOverride && list.includes(primaryOverride as BadgeType)) {
      const filtered = sorted.filter(b => b !== primaryOverride);
      return [primaryOverride as BadgeType, ...filtered];
    }
    return sorted;
  };

  return (
    <div className="profile-page-root text-white pb-32 relative bg-[#0A0A0A]">
      <BadgeInfoModal 
        isOpen={isBadgeModalOpen}
        onClose={() => setIsBadgeModalOpen(false)}
        type={selectedBadgeForModal}
      />
      <ProfileActionSheet
        isOpen={actionSheetOpen}
        onClose={() => setActionSheetOpen(false)}
        userId={profileUser.id}
        username={profileUser.username}
        displayName={profileUser.displayName}
        isOwner={false}
        avatarUrl={getAvatarUrl(profileUser.username, profileUser.avatar)}
        isBlocked={isBlockedByMe}
        onBlockToggle={(shouldBlock) => {
          if (shouldBlock) {
            setShowBlockConfirm(true);
          } else {
            setShowUnblockConfirm(true);
          }
        }}
      />

      {/* ── Banners System (Preset or Uploaded) ── */}
      <div className="w-full h-44 sm:h-56 md:h-64 relative overflow-hidden bg-neutral-900 border-b border-white/[0.04] md:rounded-b-[24px]">
        {profileUser.bannerUrl ? (
          <Image
            src={profileUser.bannerUrl}
            alt="Profile Banner"
            fill
            priority
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-indigo-950 via-neutral-950 to-purple-950 flex items-center justify-center opacity-70">
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
                  badges={getActiveBadges(profileUser)}
                  selectedFrameBadge={metadata.selectedFrameBadge}
                  className="absolute -inset-4 z-10"
                /> */}
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-4 ring-[#0A0A0A] lux-shadow bg-neutral-950 relative">
                  <Image
                    src={getAvatarUrl(profileUser.username, profileUser.avatar)}
                    alt={profileUser.displayName}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Stats Panel next to avatar (below the banner area) */}
              <div className="flex lg:hidden flex-1 items-center justify-around gap-2 max-w-[280px] sm:max-w-none px-2 sm:px-6 mb-2 translate-y-4">
                <div className="text-center cursor-default">
                  <div className="text-[17px] font-black text-white">{userPosts.length}</div>
                  <div className="text-[10px] font-bold text-white/35 uppercase tracking-widest mt-0.5">Posts</div>
                </div>
                <div className="text-center cursor-pointer" onClick={() => setFollowModal('followers')}>
                  <div className="text-[17px] font-black text-white">{displayFollowerCount}</div>
                  <div className="text-[10px] font-bold text-white/35 uppercase tracking-widest mt-0.5">Followers</div>
                </div>
                <div className="text-center cursor-pointer" onClick={() => setFollowModal('following')}>
                  <div className="text-[17px] font-black text-white">{profileUser.followingCount}</div>
                  <div className="text-[10px] font-bold text-white/35 uppercase tracking-widest mt-0.5">Following</div>
                </div>
              </div>
            </div>

            {/* Profile Text Block */}
            <div className="space-y-2.5 sm:pt-10">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-extrabold tracking-tight text-white">{profileUser.displayName}</h1>
                
                {profileUser.pronouns && checkVisibility('pronouns') && (
                  <span className="text-[14px] font-medium text-white/40 lowercase ml-1">
                    {profileUser.pronouns}
                  </span>
                )}

                {/* Premium Identity Badges — top 1 shown, rest collapsed inside custom expander */}
                {(() => {
                  const meta = profileUser?.bio ? parseBio(profileUser.bio).metadata : {};
                  if (meta.hideBadgesFromProfile) return null;

                  const allBadges = prioritiseBadges(getActiveBadges(profileUser));
                  if (allBadges.length === 0) return null;

                  const isCountHidden = meta.hideBadgeCount;
                  const shown = (badgesExpanded && !isCountHidden) ? allBadges : allBadges.slice(0, 1);
                  const extra = isCountHidden ? 0 : (allBadges.length - shown.length);
                  const firstBadge = allBadges[0];
                  const hasGlow = meta.badgeGlowAura;
                  const hasChroma = meta.chromaBorder;

                  return (
                    <div 
                      style={(hasGlow && firstBadge && !hasChroma) ? {
                        boxShadow: `0 0 10px ${BADGE_CONFIG[firstBadge]?.glowColor.replace(/[\d.]+\)$/, '0.35)') || 'rgba(255,255,255,0.15)'}`,
                        borderColor: BADGE_CONFIG[firstBadge]?.primaryColor || 'rgba(255,255,255,0.08)'
                      } : {}}
                      className={`flex items-center gap-1.5 backdrop-blur-md px-1.5 py-0.5 rounded-full relative overflow-visible shrink-0 transition-all duration-300 ${
                        hasChroma ? 'border border-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-[length:200%_200%] animate-[pulse_3s_infinite]' :
                        'border border-white/[0.04] bg-neutral-950/40'
                      }`}
                    >
                      <AnimatePresence mode="popLayout">
                        {shown.map((badgeType, idx) => {
                          const isFirst = idx === 0;
                          const pulseAnim = (meta.heartbeatPulse && isFirst) ? {
                            scale: [1, 1.08, 0.96, 1.08, 1],
                          } : { scale: 1 };
                          const pulseTrans = (meta.heartbeatPulse && isFirst) ? {
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
                    </div>
                  );
                })()}
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <p className="text-[13.5px] text-white/30 font-semibold tracking-wide">@{profileUser.username}</p>
              </div>

              {/* Biography content shifted here */}
              {visibleBio && checkVisibility('bio') && (
                <p className="md:hidden text-[15px] text-white/80 leading-relaxed font-medium mt-1">
                  <BioText bio={visibleBio} profileUsername={profileUser.username} />
                </p>
              )}



              {/* Expertise Tags Block */}
              {profileUser.expertiseTags && profileUser.expertiseTags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {profileUser.expertiseTags.map((tag: string, idx: number) => (
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

              {/* Mutual Followers */}
              {mutuals.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-white/45 font-semibold pt-1">
                  <div className="flex -space-x-1.5">
                    {mutuals.slice(0, 3).map((m: any) => (
                      <img
                        key={m.id}
                        src={getAvatarUrl(m.username, m.avatar_url)}
                        alt={m.display_name}
                        className="w-5 h-5 rounded-full border-2 border-black object-cover bg-neutral-900"
                      />
                    ))}
                  </div>
                  <span>
                    Followed by{' '}
                    {mutuals.slice(0, 2).map((m: any) => `@${m.username}`).join(', ')}
                    {mutuals.length > 2 && ` and ${mutuals.length - 2} others`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-3 w-full lg:w-auto lg:pt-0 lg:justify-end">
            {isBlockedByMe ? (
              <button
                type="button"
                id="unblock-btn"
                onClick={() => setShowUnblockConfirm(true)}
                disabled={blockLoading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-[14px] font-bold transition-all active:scale-[0.97] bg-rose-500 hover:bg-rose-600 text-white cursor-pointer"
              >
                {blockLoading ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" /> : <Ban size={15} />}
                Unblock
              </button>
            ) : (
              <button
                type="button"
                id="follow-btn"
                onClick={handleFollow}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-[14px] font-bold transition-all active:scale-[0.97] cursor-pointer ${
                  amFollowing || (profileUser?.isPrivate && followRequestStatus === 'pending')
                    ? 'bg-white/[0.04] text-white border border-white/[0.08] hover:bg-white/[0.08]' 
                    : 'bg-white text-black hover:bg-neutral-200'
                }`}
              >
                {amFollowing ? (
                  <UserCheck size={15} />
                ) : profileUser?.isPrivate && followRequestStatus === 'pending' ? (
                  <Clock size={15} />
                ) : (
                  <UserPlus size={15} />
                )}
                <span>
                  {amFollowing 
                    ? 'Following' 
                    : profileUser?.isPrivate && followRequestStatus === 'pending' 
                    ? 'Requested' 
                    : 'Follow'}
                </span>
              </button>
            )}

            {!isBlockedByMe && (
              <button
                type="button"
                id="message-btn"
                onClick={() => {
                  const avatarUrl = getAvatarUrl(profileUser.username, profileUser.avatar);
                  router.push(
                    `/messages/${profileUser.id}?name=${encodeURIComponent(
                      profileUser.displayName || ""
                    )}&username=${encodeURIComponent(
                      profileUser.username || ""
                    )}&avatar=${encodeURIComponent(avatarUrl || "")}`
                  );
                }}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-white/[0.04] text-white border border-white/[0.08] hover:bg-white/[0.08] transition-all active:scale-[0.97] shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
              >
                <MessageCircle size={15} />
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
          </div>
        </div>

        {/* ── Incoming Follow Request Action Banner ── */}
        {incomingFollowRequestStatus === 'pending' && (
          <div className="p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                <UserPlus size={18} />
              </div>
              <div className="text-center sm:text-left">
                <h4 className="text-[13px] font-bold text-white">Follow Request</h4>
                <p className="text-[12px] text-white/50 mt-0.5">@{profileUser.username} requested to follow your private profile.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleAcceptIncomingRequest}
                className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 text-[12px] font-bold transition-all active:scale-[0.97] cursor-pointer"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={handleRejectIncomingRequest}
                className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-white/[0.04] text-white hover:bg-white/[0.08] border border-white/[0.08] text-[12px] font-bold transition-all active:scale-[0.97] cursor-pointer"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* ── Responsive Two Column Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
          
          {/* ── LEFT COLUMN: Posts feed & tab navigation ── */}
          <div className="space-y-8 min-w-0 order-2 lg:order-1">
            {/* Biography content (Desktop only) */}
            {visibleBio && checkVisibility('bio') && (
              <div className="hidden md:block space-y-2">
                <h3 className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest leading-none">About</h3>
                <p className="text-[15px] text-white/80 leading-relaxed font-medium">
                  <BioText bio={visibleBio} profileUsername={profileUser.username} />
                </p>
              </div>
            )}
            {isBlockedByMe ? (
              <BlockedState />
            ) : !canSeePosts ? (
              <PrivateState />
            ) : (
              <>
                {/* Pinned Posts Area */}
                {pinnedPosts.length > 0 && activeTab === 'posts' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5 text-blue-400">
                      <Pin size={13} className="rotate-45 fill-current" />
                      <span className="text-[11px] font-bold uppercase tracking-widest">Pinned Archives</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {pinnedPosts.map((post) => (
                        <div 
                          key={post.id}
                          className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.08] hover:border-white/20 transition-all relative group shadow-lg cursor-pointer"
                          onClick={() => window.location.href = `/feed/${post.id}`}
                        >
                          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block mb-3">Pinned</span>
                          <p className="text-[13.5px] text-white/80 line-clamp-3 leading-relaxed mb-4">
                            {post.content}
                          </p>
                          {post.mediaUrls?.[0] && (
                            <div className="h-28 rounded-xl overflow-hidden mb-4 border border-white/5 bg-neutral-950">
                              <img src={post.mediaUrls[0]} alt="media" className="w-full h-full object-cover" />
                            </div>
                          )}
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
                  <TabButton active={activeTab === 'posts'} onClick={() => setActiveTab('posts')} icon={Grid3x3} label="Posts" />
                  <TabButton active={activeTab === 'reposts'} onClick={() => setActiveTab('reposts')} icon={Repeat2} label="Reposts" />
                  <TabButton active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} icon={Calendar} label="Timeline" />
                </div>

                {/* Content lists */}
                <div className="min-h-[300px]">
                  <AnimatePresence mode="wait">
                    {activeTab === 'posts' && (
                      <motion.div 
                        key="posts" 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="w-full"
                      >
                        {normalPosts.length === 0 && pinnedPosts.length === 0 ? (
                          <EmptyState
                            icon={Grid3x3}
                            title="No posts yet"
                            subtitle="This account has no shared posts."
                          />
                        ) : (
                          <div className="grid grid-cols-3 gap-1">
                            {normalPosts.map((p, i) => (
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

                    {activeTab === 'reposts' && (
                      <motion.div 
                        key="reposts" 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="w-full"
                      >
                        {loadingReposts ? (
                          <PostsSkeleton />
                        ) : reposts.length === 0 ? (
                          <EmptyState
                            icon={Repeat2}
                            title="No reposts yet"
                            subtitle="Posts they reposted will appear here."
                          />
                        ) : (
                          <div className="grid grid-cols-3 gap-1">
                            {reposts.map((p, i) => (
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

                    {activeTab === 'activity' && (
                      <motion.div 
                        key="activity" 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="w-full"
                      >
                        <ProfileTimeline milestones={milestones} loading={loadingMilestones} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>

          {/* ── RIGHT COLUMN: Metadata details, music, tags ── */}
          <div className="space-y-8 lg:sticky lg:top-24 h-fit order-1 lg:order-2">
            
            {/* Interactive Stats Panel */}
            <div className="hidden lg:grid p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] grid-cols-3 gap-4 text-center">
              <StatItem label="Posts" value={userPosts.length} onClick={null} />
              <StatItem label="Followers" value={displayFollowerCount} onClick={() => setFollowModal('followers')} />
              <StatItem label="Following" value={profileUser.followingCount} onClick={() => setFollowModal('following')} />
            </div>

            {/* Followers / Following list modal overlay */}
            {followModal && (
              <FollowListModal
                userId={profileUser.id}
                type={followModal}
                onClose={() => setFollowModal(null)}
              />
            )}

            {/* Profile Music System */}
            {/* Profile Music System */}
            {canSeePosts && pinnedTrack && (
              <div className="space-y-2">
                <h3 className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest leading-none">Identity Track</h3>
                <ProfileMusicCard track={pinnedTrack} />
              </div>
            )}

            {/* Interest Tags */}
            {canSeePosts && metadata.tags && metadata.tags.length > 0 && (
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
              
              {!canSeePosts ? (
                <div className="flex flex-col items-center justify-center py-4 gap-2 text-center text-white/30">
                  <Lock size={16} />
                  <p className="text-[11px] font-bold tracking-wider uppercase">Private Information</p>
                </div>
              ) : (
                <div className="space-y-3.5 text-[13.5px] font-semibold text-white/70">
                  {metadata.occupation && checkVisibility('occupation') && (
                    <div className="flex items-center gap-3">
                      <Briefcase size={15} className="text-white/30 shrink-0" />
                      <span>{metadata.occupation}</span>
                    </div>
                  )}
                  {metadata.education && checkVisibility('education') && (
                    <div className="flex items-center gap-3">
                      <GraduationCap size={15} className="text-white/30 shrink-0" />
                      <span>{metadata.education}</span>
                    </div>
                  )}
                  {metadata.location && checkVisibility('location') && (
                    <div className="flex items-center gap-3">
                      <MapPin size={15} className="text-white/30 shrink-0" />
                      <span>{metadata.location}</span>
                    </div>
                  )}
                  {profileUser.customLink && checkVisibility('customLink') && (
                    <div className="flex items-center gap-3">
                      <Link2 size={15} className="text-white/30 shrink-0" />
                      <a
                        href={profileUser.customLink.startsWith('http') ? profileUser.customLink : `https://${profileUser.customLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline truncate hover:text-blue-300"
                      >
                        {profileUser.customLink.replace(/^https?:\/\/(www\.)?/, '')}
                      </a>
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
                      <div className="flex items-center gap-3">
                        <Cake size={15} className="text-white/30 shrink-0" />
                        <span>Born {dateStr}</span>
                      </div>
                    );
                  })()}
                  <div className="flex items-center gap-3 text-white/40 font-medium">
                    <Calendar size={15} className="text-white/20 shrink-0" />
                    <span>Joined {joinedDate}</span>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Block Confirm Modal */}
      <ConfirmModal
        isOpen={showBlockConfirm}
        title="Block User"
        message={`Are you sure you want to block @${profileUser.username}? They will no longer be able to message you, view your profile, or interact with your posts.`}
        confirmLabel="Block"
        cancelLabel="Cancel"
        danger={true}
        onConfirm={() => {
          setShowBlockConfirm(false);
          handleBlockToggle(true);
        }}
        onCancel={() => setShowBlockConfirm(false)}
      />

      {/* Unblock Confirm Modal */}
      <ConfirmModal
        isOpen={showUnblockConfirm}
        title="Unblock User"
        message={`Are you sure you want to unblock @${profileUser.username}? This will restore their ability to view your profile and message you.`}
        confirmLabel="Unblock"
        cancelLabel="Cancel"
        danger={false}
        onConfirm={() => {
          setShowUnblockConfirm(false);
          handleBlockToggle(false);
        }}
        onCancel={() => setShowUnblockConfirm(false)}
      />

      {/* Unfollow Private Confirm Modal */}
      <ConfirmModal
        isOpen={showUnfollowPrivateConfirm}
        title="Unfollow?"
        message={`You will stop seeing @${profileUser.username}'s posts and stories. Since this is a private account, you'll need to send a new follow request if you want to follow them again.`}
        confirmLabel="Unfollow"
        cancelLabel="Cancel"
        danger={true}
        minimal={true}
        onConfirm={performPrivateUnfollow}
        onCancel={() => setShowUnfollowPrivateConfirm(false)}
      />
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
      transition={{ delay: index * 0.01, duration: 0.3 }}
      onClick={onClick}
      className="aspect-square bg-white/[0.02] relative group cursor-pointer overflow-hidden rounded-xl border border-white/[0.03] hover:border-white/10"
    >
      {hasImage ? (
        <img
          src={post.mediaUrls[0]}
          alt="post"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-5 bg-white/[0.01]">
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
      <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-1.5 text-white translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-[50ms]">
          <Heart size={18} className="fill-white" />
          <span className="text-[11px] font-bold">{kFmt(post.likeCount || 0)}</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 text-white translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-[100ms]">
          <MessageCircle size={18} className="fill-white" />
          <span className="text-[11px] font-bold">{kFmt(post.commentCount || 0)}</span>
        </div>
      </div>
    </motion.div>
  );
}

function PrivateState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center bg-white/[0.01] border border-white/[0.03] rounded-2xl p-6">
      <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-1 border border-white/[0.05]">
        <Lock size={24} className="text-white/20" />
      </div>
      <div>
        <p className="text-[14px] font-extrabold text-white/50 uppercase tracking-widest">Private Account</p>
        <p className="text-xs text-white/25 mt-1 max-w-[260px] leading-relaxed font-semibold">Follow to see their posts and archives.</p>
      </div>
    </div>
  );
}

function BlockedState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center bg-rose-500/[0.01] border border-rose-500/[0.05] rounded-2xl p-6">
      <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-1 border border-rose-500/20">
        <Ban size={24} className="text-rose-400" />
      </div>
      <div>
        <p className="text-[14px] font-extrabold text-rose-400 uppercase tracking-widest">Blocked User</p>
        <p className="text-xs text-white/30 mt-1 max-w-[260px] leading-relaxed font-semibold">You have blocked this user. Unblock them to restore interaction.</p>
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

function PostsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="aspect-square bg-white/[0.02] border border-white/[0.04] animate-pulse rounded-xl" />
      ))}
    </div>
  );
}
