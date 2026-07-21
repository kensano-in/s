'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserCheck, UserPlus, Loader2, Users } from 'lucide-react';
import { getFollowListDB, sendFollowRequestDB, cancelFollowRequestDB, type FollowListUser } from '@/app/(main)/profile/actions';
import { useAppStore } from '@/lib/store';
import { getAvatarUrl } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Props {
  /** The user whose followers/following we're viewing */
  userId: string;
  type: 'followers' | 'following';
  onClose: () => void;
}

export default function FollowListModal({ userId, type, onClose }: Props) {
  const [users, setUsers] = useState<FollowListUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);
  const isFollowing = useAppStore(s => s.isFollowing);
  const toggleFollow = useAppStore(s => s.toggleFollow);
  const currentUser = useAppStore(s => s.currentUser);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!currentUser?.id) return;
    supabase
      .from('follow_requests')
      .select('target_id')
      .eq('requester_id', currentUser.id)
      .eq('status', 'pending')
      .then((res: any) => {
        if (res.data) setPendingRequests(res.data.map((r: any) => r.target_id));
      });
  }, [currentUser, supabase]);

  const handleFollowClick = async (targetUser: FollowListUser) => {
    const following = isFollowing(targetUser.id);
    if (following) {
      toggleFollow(targetUser.id);
      return;
    }

    if (targetUser.is_private) {
      const isRequested = pendingRequests.includes(targetUser.id);
      if (isRequested) {
        setPendingRequests(prev => prev.filter(id => id !== targetUser.id));
        const res = await cancelFollowRequestDB(targetUser.id);
        if (!res.success) {
          setPendingRequests(prev => [...prev, targetUser.id]);
          window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: res.error || 'Failed to cancel request', type: 'error' } }));
        }
      } else {
        setPendingRequests(prev => [...prev, targetUser.id]);
        const res = await sendFollowRequestDB(targetUser.id);
        if (!res.success) {
          setPendingRequests(prev => prev.filter(id => id !== targetUser.id));
          window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: res.error || 'Failed to send request', type: 'error' } }));
        }
      }
    } else {
      toggleFollow(targetUser.id);
    }
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await getFollowListDB(userId, type);
    if (res.success) setUsers(res.data);
    setLoading(false);
  }, [userId, type]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const channel = supabase
      .channel(`modal:followers:${userId}:${type}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'followers',
        },
        (payload: any) => {
          const isRelated = 
            payload.eventType === 'DELETE' || // Fallback for DELETE events
            payload.new?.follower_id === userId ||
            payload.new?.following_id === userId ||
            payload.old?.follower_id === userId ||
            payload.old?.following_id === userId;

          if (isRelated) {
            console.log('[MODAL FOLLOW] Change detected, refetching...');
            // Fetch users without setting full loading state to prevent flickering
            getFollowListDB(userId, type).then((res) => {
              if (res.success) setUsers(res.data);
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, type, supabase]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleRemoveFollower = async (targetUserId: string) => {
    if (!currentUser?.id) return;
    try {
      const { error } = await supabase
        .from('followers')
        .delete()
        .eq('follower_id', targetUserId)
        .eq('following_id', currentUser.id);
      
      if (error) throw error;
      
      setUsers(prev => prev.filter(u => u.id !== targetUserId));
      
      window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: 'Follower removed', type: 'success' } }));
    } catch (e: any) {
      console.error(e);
      window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: e.message || 'Failed to remove follower', type: 'error' } }));
    }
  };

  const title = type === 'followers' ? 'Followers' : 'Following';

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="follow-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/35 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        key="follow-modal-sheet"
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
      >
        <div
          className="w-full max-w-[420px] max-h-[80vh] sm:max-h-[75vh] bg-[#0A0A0A]/35 backdrop-blur-3xl border border-white/[0.08] rounded-[32px] overflow-hidden flex flex-col pointer-events-auto shadow-[0_24px_80px_rgba(0,0,0,0.95)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
            <div className="w-10" />
            <h2 className="text-[15px] font-bold text-white tracking-tight">{title}</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/[0.06] transition-colors"
              aria-label="Close"
            >
              <X size={18} className="text-white/50" />
            </button>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={22} className="animate-spin text-white/20" />
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                  <Users size={22} className="text-white/20" />
                </div>
                <p className="text-sm text-white/30 font-medium">
                  {type === 'followers' ? 'No followers yet' : 'Not following anyone'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {users.map((user) => {
                  const isMe = user.id === currentUser?.id;
                  const following = isFollowing(user.id);
                  return (
                    <motion.li
                      key={user.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex items-center gap-3 px-5 py-3.5"
                    >
                      {/* Avatar */}
                      <Link href={`/profile/${user.username}`} onClick={onClose} className="shrink-0">
                        <div className="w-11 h-11 rounded-full overflow-hidden ring-1 ring-white/[0.06] bg-neutral-900">
                          <img
                            src={getAvatarUrl(user.username, user.avatar_url)}
                            alt={user.display_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </Link>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/profile/${user.username}`} onClick={onClose}>
                          <p className="text-[14px] font-bold text-white truncate leading-snug">
                            {user.display_name}
                          </p>
                          <p className="text-[12px] text-white/40 truncate">@{user.username}</p>
                        </Link>
                      </div>

                      {/* Follow button — only show if not looking at yourself */}
                      {!isMe && (
                        <>
                          {userId === currentUser?.id && type === 'followers' ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveFollower(user.id)}
                              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold transition-all bg-white/[0.04] text-white/60 border border-white/[0.08] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 active:scale-95 cursor-pointer"
                            >
                              Remove
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleFollowClick(user)}
                              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold transition-all active:scale-95 ${
                                following
                                  ? 'bg-white/[0.06] text-white/60 border border-white/[0.08] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                                  : pendingRequests.includes(user.id)
                                    ? 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                                    : 'bg-white text-black hover:bg-neutral-200'
                              }`}
                            >
                              {following ? (
                                <>
                                  <UserCheck size={13} />
                                  Following
                                </>
                              ) : pendingRequests.includes(user.id) ? (
                                <>
                                  <Loader2 size={13} className="animate-spin text-white/45" />
                                  Requested
                                </>
                              ) : (
                                <>
                                  <UserPlus size={13} />
                                  Follow
                                </>
                              )}
                            </button>
                          )}
                        </>
                      )}
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
