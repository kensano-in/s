'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { notificationService } from '@/services/notification.service';
import NotificationList from '@/components/features/notifications/NotificationList';
import {
  CheckCheck, Settings2, Bell, BellRing, Users, Search, X,
  Trash2, ListChecks, Heart, MessageCircle, AtSign, Star,
  Sparkles, TrendingUp, Zap, UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { fetchCommentContentForNotification, batchFetchCommentContentsForNotifications, clearReadNotifications, deleteNotifications } from '@/app/(main)/notifications/actions';
import { getIncomingFollowRequestsDB, acceptFollowRequestDB, rejectFollowRequestDB } from '@/app/(main)/profile/actions';
import { getSuggestedPeople } from '@/app/(main)/explore/actions';
import { getCommunities } from '@/app/(main)/communities/actions';
import type { Notification } from '@/lib/types';
import { getAvatarUrl } from '@/lib/utils';
import Link from 'next/link';
import clsx from 'clsx';

function getCommunityCategoryStyles(tag: string) {
  const clean = tag.toLowerCase();
  if (clean.includes('tech') || clean.includes('dev') || clean.includes('code')) return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
  if (clean.includes('design') || clean.includes('art') || clean.includes('ui')) return 'bg-sky-500/10 border-sky-500/20 text-sky-400';
  if (clean.includes('anime') || clean.includes('gaming')) return 'bg-rose-500/10 border-rose-500/20 text-rose-400';
  if (clean.includes('music') || clean.includes('audio')) return 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400';
  return 'bg-violet-500/10 border-violet-500/20 text-violet-400';
}

type FilterCategory = 'all' | 'unread' | 'social' | 'messages' | 'communities' | 'mentions' | 'security' | 'monetization' | 'important' | 'requests';

const FILTER_TABS = [
  { id: 'all' as FilterCategory,         label: 'All',       icon: Bell,          anim: { rotate: [0, -18, 14, -10, 6, 0] }, trans: { duration: 0.55 } },
  { id: 'unread' as FilterCategory,      label: 'New',        icon: BellRing,      anim: { scale: [1, 1.4, 0.85, 1.15, 1], rotate: [0, -10, 10, 0] }, trans: { duration: 0.45 } },
  { id: 'social' as FilterCategory,      label: 'Likes',      icon: Heart,         anim: { scale: [1, 1.4, 1.1, 1.35, 1] }, trans: { duration: 0.5 } },
  { id: 'mentions' as FilterCategory,    label: 'Mentions',   icon: AtSign,        anim: { rotate: [0, 360] }, trans: { duration: 0.5 } },
  { id: 'communities' as FilterCategory, label: 'Groups',     icon: Users,         anim: { y: [0, -5, 1, -3, 0] }, trans: { duration: 0.4 } },
  { id: 'messages' as FilterCategory,    label: 'DMs',        icon: MessageCircle, anim: { scale: [1, 1.35, 0.88, 1.1, 1], x: [0, 2, -1, 0] }, trans: { duration: 0.42 } },
  { id: 'requests' as FilterCategory,    label: 'Requests',   icon: UserPlus,      anim: { scale: [1, 1.2, 0.9, 1.1, 1] }, trans: { duration: 0.5 } },
  { id: 'important' as FilterCategory,   label: 'Important',  icon: Star,          anim: { rotate: [0, 30, -20, 15, 0], scale: [1, 1.3, 1.1, 1.25, 1] }, trans: { duration: 0.5 } },
];

export default function NotificationsPage() {
  useEffect(() => {
    console.log("[FORENSICS] NotificationsPage MOUNTED");
    return () => {
      console.log("[FORENSICS] NotificationsPage UNMOUNTED");
    };
  }, []);

  const currentUser = useAppStore(s => s.currentUser);
  const notifications = useAppStore(s => s.notifications);
  const setNotifications = useAppStore(s => s.setNotifications);
  const addNotification = useAppStore(s => s.addNotification);
  const removeNotification = useAppStore(s => s.removeNotification);
  const removeNotifications = useAppStore(s => s.removeNotifications);

  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [followRequests, setFollowRequests] = useState<any[]>([]);
  const [loadingFollowRequests, setLoadingFollowRequests] = useState(false);
  const isFetchingRef = useRef(false);

  const loadFollowRequests = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoadingFollowRequests(true);
    const res = await getIncomingFollowRequestsDB();
    if (res.success && res.data) {
      setFollowRequests(res.data);
    }
    setLoadingFollowRequests(false);
  }, [currentUser?.id]);

  const handleAcceptRequest = async (requesterId: string) => {
    try {
      const res = await acceptFollowRequestDB(requesterId);
      if (res.success) {
        window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: 'Follow request accepted', type: 'success' } }));
        setFollowRequests(prev => prev.filter(r => r.requester.id !== requesterId));
      } else {
        window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: res.error || 'Failed to accept request', type: 'error' } }));
      }
    } catch (e) {
      window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: 'Failed to accept request', type: 'error' } }));
    }
  };

  const handleRejectRequest = async (requesterId: string) => {
    try {
      const res = await rejectFollowRequestDB(requesterId);
      if (res.success) {
        window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: 'Follow request declined', type: 'success' } }));
        setFollowRequests(prev => prev.filter(r => r.requester.id !== requesterId));
      } else {
        window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: res.error || 'Failed to decline request', type: 'error' } }));
      }
    } catch (e) {
      window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: 'Failed to decline request', type: 'error' } }));
    }
  };

  useEffect(() => {
    if (activeCategory === 'requests') {
      loadFollowRequests();
    }
  }, [activeCategory, loadFollowRequests]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const supabase = createClient();
    const channel = supabase.channel('follow-requests-notifications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follow_requests', filter: `target_id=eq.${currentUser.id}` },
        () => {
          loadFollowRequests();
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, loadFollowRequests]);

  const load = useCallback(async () => {
    if (!currentUser?.id || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const res = await notificationService.fetchNotifications(currentUser.id, 50);
      if (res.success && res.data) {
        setNotifications(res.data);
        setLoading(false);

        const targetItems = res.data
          .filter((n: Notification) => (n.type === 'comment' || n.type === 'mention') && n.entity_id && n.actor_id)
          .map((n: Notification) => ({ notifId: n.id, postId: n.entity_id!, actorId: n.actor_id! }));

        if (targetItems.length > 0) {
          batchFetchCommentContentsForNotifications(targetItems).then((commentMap) => {
            if (Object.keys(commentMap).length > 0) {
              const current = useAppStore.getState().notifications;
              setNotifications(
                current.map((item) => {
                  const content = commentMap[item.id];
                  return content ? { ...item, commentContent: content } : item;
                })
              );
            }
          });
        }
      } else {
        setLoading(false);
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [currentUser?.id, setNotifications]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const supabase = createClient();
    const channel = supabase.channel('notifications-page-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
        async (payload: any) => {
          const { data } = await supabase.from('notifications')
            .select('*, actor:users!actor_id(id, username, display_name, avatar_url)')
            .eq('id', payload.new.id).single();
          if (data) addNotification({ ...data, isRead: data.is_read || false, priority: data.priority || 'medium' } as unknown as Notification);
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
        (payload: any) => {
          removeNotification(payload.old.id);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, addNotification, removeNotification]);

  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [activeCommunities, setActiveCommunities] = useState<any[]>([]);
  const [sidebarLoading, setSidebarLoading] = useState(true);

  useEffect(() => {
    async function fetchRealSidebarData() {
      setSidebarLoading(true);
      try {
        const people = await getSuggestedPeople();
        if (people) {
          setSuggestedUsers(people.filter((p: any) => p.id !== currentUser?.id).slice(0, 3).map((p: any) => ({
            name: p.display_name || p.username, username: p.username,
            avatar: getAvatarUrl(p.username, p.avatar_url), tag: 'Suggested'
          })));
        }
        const res = await getCommunities();
        if (res.success && res.communities) {
          setActiveCommunities(res.communities.slice(0, 3).map((c: any) => ({
            name: c.display_name || c.name, members: `${c.member_count || 0} members`, tag: c.category || 'Group'
          })));
        }
      } catch {}
      finally { setSidebarLoading(false); }
    }
    if (currentUser?.id) fetchRealSidebarData();
  }, [currentUser?.id]);

  const handleMarkAllRead = async () => {
    if (!currentUser?.id) return;
    await notificationService.markAllAsRead(currentUser.id);
    await load();
  };

  const feedNotifications = useMemo(() => {
    const all = [...notifications].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return all.filter(n => {
      if (activeCategory === 'all') return true;
      if (activeCategory === 'unread') return !n.isRead;
      if (activeCategory === 'social') return ['like', 'follow', 'comment', 'award'].includes(n.type);
      if (activeCategory === 'messages') return n.type === 'dm' || n.entity_type === 'message';
      if (activeCategory === 'communities') return n.type === 'community' || n.entity_type === 'community';
      if (activeCategory === 'mentions') return n.type === 'mention' || n.body.includes('@');
      if (activeCategory === 'security') return n.entity_type === 'security' || (n.type === 'system' && n.body.includes('security'));
      if (activeCategory === 'monetization') return n.entity_type === 'earnings' || n.type === 'award';
      if (activeCategory === 'important') return n.priority === 'critical' || n.priority === 'high';
      return true;
    }).filter(n => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        n.body.toLowerCase().includes(q) ||
        (n.actor?.display_name || '').toLowerCase().includes(q) ||
        (n.actor?.username || '').toLowerCase().includes(q) ||
        (n.commentContent || '').toLowerCase().includes(q)
      );
    });
  }, [notifications, activeCategory, searchQuery]);

  const stats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = notifications.filter(n => new Date(n.created_at).getTime() > weekAgo);
    const unread = notifications.filter(n => !n.isRead).length;
    const likes = thisWeek.filter(n => n.type === 'like').length;
    const comments = thisWeek.filter(n => n.type === 'comment' || n.type === 'mention').length;
    const follows = thisWeek.filter(n => n.type === 'follow').length;
    const readCount = notifications.filter(n => n.isRead).length;
    return { unread, likes, comments, follows, total: thisWeek.length, readCount };
  }, [notifications]);

  const handleDelete = useCallback((id: string) => { removeNotification(id); }, [removeNotification]);
  const handleSelectToggle = useCallback((id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);
  const handleSelectAll = () => {
    if (selectedIds.size === feedNotifications.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(feedNotifications.map(n => n.id)));
  };
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    const ids = Array.from(selectedIds);
    removeNotifications(ids);
    setSelectedIds(new Set());
    setIsSelectMode(false);
    await deleteNotifications(ids);
    setIsBulkDeleting(false);
    window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: `${ids.length} notification${ids.length > 1 ? 's' : ''} removed`, type: 'success' } }));
  };
  const handleClearRead = async () => {
    const readIds = notifications.filter(n => n.isRead).map(n => n.id);
    removeNotifications(readIds);
    await clearReadNotifications();
    window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: 'Read notifications cleared', type: 'success' } }));
  };

  return (
    <div
      className="text-white pb-32"
      style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(139,92,246,0.07) 0%, transparent 60%), radial-gradient(ellipse at bottom, rgba(109,40,217,0.04) 0%, transparent 50%), #09080f' }}
    >
      <div className="max-w-5xl mx-auto px-4 pt-10 grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* ── MAIN COLUMN ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* HEADER */}
          <div className="flex items-center justify-between pb-5 border-b border-white/[0.04]">
            <div className="flex items-start gap-3">
              <motion.div
                animate={stats.unread > 0 ? { rotate: [0, -15, 12, -8, 6, 0] } : { scale: [1, 1.08, 1] }}
                transition={{ duration: stats.unread > 0 ? 0.65 : 1.5, repeat: Infinity, repeatDelay: 5 }}
                className="mt-0.5"
              >
                {stats.unread > 0
                  ? <BellRing size={17} className="text-violet-300" />
                  : <CheckCheck size={17} className="text-emerald-400" />
                }
              </motion.div>
              <div>
                <h1 className="text-[18px] font-bold tracking-tight leading-tight text-white">
                  {stats.unread > 0
                    ? <><span className="text-violet-300">{stats.unread}</span> new notification{stats.unread > 1 ? 's' : ''}</>
                    : <>You&rsquo;re all caught up</>
                  }
                </h1>
                <p className="text-[12px] text-white/30 mt-0.5 font-medium">
                  {currentUser?.displayName
                    ? `Welcome back, ${currentUser.displayName.split(' ')[0]}`
                    : "Here's what's been going on"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {stats.readCount > 0 && (
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                  onClick={handleClearRead}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border border-rose-500/15 bg-rose-500/[0.08] text-rose-300/70 hover:text-rose-300 hover:bg-rose-500/[0.12] transition-all duration-200"
                >
                  <X size={10} />
                  Clear read
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border border-white/[0.06] bg-white/[0.03] text-white/45 hover:text-white/75 hover:bg-white/[0.05] transition-all duration-200"
              >
                <CheckCheck size={11} className="text-emerald-400" />
                Mark read
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                onClick={() => { setIsSelectMode(v => !v); setSelectedIds(new Set()); }}
                className={clsx(
                  'p-1.5 rounded-full border transition-all duration-200',
                  isSelectMode
                    ? 'bg-violet-500/12 border-violet-400/25 text-violet-300'
                    : 'bg-white/[0.03] border-white/[0.06] text-white/25 hover:text-white/55 hover:bg-white/[0.05]'
                )}
              >
                <ListChecks size={13} />
              </motion.button>
              <Link
                href="/settings/notifications"
                className="p-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.055] border border-white/[0.06] text-white/25 hover:text-white/55 transition-all duration-200"
              >
                <Settings2 size={13} />
              </Link>
            </div>
          </div>

          {/* STATS PILLS — compact glassmorphic row */}
          {stats.total > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="flex items-center gap-2 flex-wrap"
            >
              {[
                { icon: Sparkles, value: stats.total, label: 'this week', color: 'text-violet-300', bg: 'bg-violet-500/[0.08] border-violet-500/15' },
                ...(stats.likes > 0 ? [{ icon: Heart, value: stats.likes, label: 'likes', color: 'text-rose-300', bg: 'bg-rose-500/8 border-rose-500/15' }] : []),
                ...(stats.comments > 0 ? [{ icon: MessageCircle, value: stats.comments, label: 'comments', color: 'text-sky-300', bg: 'bg-sky-500/8 border-sky-500/15' }] : []),
                ...(stats.follows > 0 ? [{ icon: Users, value: stats.follows, label: 'follows', color: 'text-emerald-300', bg: 'bg-emerald-500/8 border-emerald-500/15' }] : []),
              ].map(({ icon: PillIcon, value, label, color, bg }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06 }}
                  className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold', bg, color)}
                >
                  <PillIcon size={10} />
                  <span className="text-white/80">{value}</span>
                  <span className="text-white/35">{label}</span>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* SEARCH */}
          <motion.div
            animate={searchFocused
              ? { boxShadow: '0 0 0 1px rgba(139,92,246,0.35), 0 4px 20px rgba(0,0,0,0.3)' }
              : { boxShadow: '0 0 0 1px rgba(255,255,255,0.04)' }
            }
            className="relative rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.025)' }}
          >
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search notifications..."
              className="w-full pl-9 pr-8 py-2.5 text-[13px] bg-transparent text-white/75 placeholder-white/20 outline-none"
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                >
                  <X size={12} />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          {/* BULK SELECT TOOLBAR */}
          <AnimatePresence>
            {isSelectMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between px-4 py-2.5 rounded-2xl text-[12px] overflow-hidden"
                style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.18)' }}
              >
                <div className="flex items-center gap-3">
                  <button onClick={handleSelectAll} className="font-semibold text-violet-300/80 hover:text-violet-200 transition-colors">
                    {selectedIds.size === feedNotifications.length ? 'Deselect all' : 'Select all'}
                  </button>
                  {selectedIds.size > 0 && <span className="text-white/30">{selectedIds.size} selected</span>}
                </div>
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0 || isBulkDeleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-rose-300/80 hover:text-rose-200 font-semibold transition-all disabled:opacity-30"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}
                >
                  <Trash2 size={11} />
                  {isBulkDeleting ? 'Removing...' : `Remove ${selectedIds.size > 0 ? selectedIds.size : ''}`}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FILTER TABS */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
            {FILTER_TABS.map(({ id, label, icon: TabIcon, anim, trans }) => {
              const isActive = activeCategory === id;
              const count = id === 'unread' ? stats.unread : id === 'requests' ? followRequests.length : 0;
              return (
                <motion.button
                  key={id}
                  onClick={() => setActiveCategory(id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.93 }}
                  className={clsx(
                    'flex items-center gap-1.5 flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors duration-200 whitespace-nowrap',
                    isActive ? 'text-white font-semibold' : 'text-white/35 hover:text-white/60'
                  )}
                  style={isActive ? {
                    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                    boxShadow: '0 2px 16px rgba(124,58,237,0.4)'
                  } : {}}
                >
                  <motion.span
                    key={`${id}-${isActive}`}
                    animate={isActive ? anim : {}}
                    transition={trans}
                  >
                    <TabIcon size={11} />
                  </motion.span>
                  {label}
                  {count > 0 && (
                    <span className={clsx(
                      'text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                      isActive ? 'bg-white/20 text-white' : 'bg-violet-500/20 text-violet-300'
                    )}>
                      {count}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* NOTIFICATION FEED */}
          {activeCategory === 'requests' ? (
            <div className="space-y-3">
              {loadingFollowRequests ? (
                <div className="flex items-center justify-center py-12 bg-[#0A0A0A] border border-white/5 rounded-2xl">
                  <span className="text-[13px] text-white/40 font-medium">Loading requests...</span>
                </div>
              ) : followRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-[#0A0A0A] border border-white/5 rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/[0.04] flex items-center justify-center text-white/30">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-white">No pending requests</h3>
                    <p className="text-[12px] text-white/40 mt-1 max-w-[280px]">Follow requests from private accounts will appear here.</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04] bg-[#0A0A0A] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                  {followRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-4 gap-4 transition-colors hover:bg-white/[0.01]">
                      <div className="flex items-center gap-3 min-w-0">
                        <Link href={`/profile/${req.requester.username}`} className="w-10 h-10 rounded-full overflow-hidden bg-neutral-900 border border-white/10 shrink-0 relative block">
                          <img
                            src={getAvatarUrl(req.requester.username, req.requester.avatar_url)}
                            alt={req.requester.display_name}
                            className="w-full h-full object-cover"
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link href={`/profile/${req.requester.username}`} className="text-[13px] font-bold text-white hover:underline truncate">
                              {req.requester.display_name}
                            </Link>
                            <span className="text-[11px] text-white/30 font-medium truncate">@{req.requester.username}</span>
                          </div>
                          <p className="text-[12px] text-white/50 mt-0.5">Requested to follow your private profile.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAcceptRequest(req.requester.id)}
                          className="px-4 py-2 rounded-full bg-white text-black hover:bg-neutral-200 text-[11px] font-bold transition-all active:scale-[0.96] cursor-pointer"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectRequest(req.requester.id)}
                          className="px-4 py-2 rounded-full bg-white/[0.04] text-white hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-bold transition-all active:scale-[0.96] cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <NotificationList
              notifications={feedNotifications}
              loading={loading}
              onDelete={handleDelete}
              isSelectMode={isSelectMode}
              selectedIds={selectedIds}
              onSelect={handleSelectToggle}
            />
          )}
        </div>

        {/* ── SIDEBAR (DESKTOP) ── */}
        <div className="hidden lg:flex flex-col gap-5">

          {/* ACTIVE TONIGHT */}
          <div
            className="rounded-2xl border p-4 space-y-3.5"
            style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-white/50 tracking-wide uppercase">Active Tonight</h3>
              <motion.span
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              />
            </div>
            <div className="space-y-3">
              {sidebarLoading
                ? [0, 1, 2].map(i => (
                  <div key={i} className="flex items-center justify-between gap-3 animate-pulse">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-white/[0.025]" />
                      <div className="space-y-1.5">
                        <div className="h-2 w-20 bg-white/[0.025] rounded" />
                        <div className="h-1.5 w-14 bg-white/[0.02] rounded" />
                      </div>
                    </div>
                    <div className="h-5 w-10 bg-white/[0.025] rounded-full" />
                  </div>
                ))
                : suggestedUsers.length === 0
                  ? <p className="text-[11px] text-white/20 text-center py-2">No suggestions yet</p>
                  : suggestedUsers.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="relative shrink-0">
                          <img src={s.avatar} alt={s.name} className="w-8 h-8 rounded-full object-cover border border-white/[0.06] bg-neutral-900" />
                          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-[#0a0908]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-white/85 truncate max-w-[100px]">{s.name}</p>
                          <p className="text-[10px] text-white/30">@{s.username}</p>
                        </div>
                      </div>
                      <Link
                        href={`/profile/${s.username}`}
                        className="px-2.5 py-1 rounded-full text-[10px] font-semibold border border-violet-500/20 bg-violet-500/8 text-violet-300 hover:text-violet-200 hover:bg-violet-500/15 transition-all duration-200 whitespace-nowrap"
                      >
                        View
                      </Link>
                    </div>
                  ))
              }
            </div>
          </div>

          {/* COMMUNITY ENERGY */}
          <div
            className="rounded-2xl border p-4 space-y-3.5"
            style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            <h3 className="text-[11px] font-bold text-white/50 tracking-wide uppercase">Community Energy</h3>
            <div className="space-y-2.5">
              {sidebarLoading
                ? [0, 1, 2].map(i => (
                  <div key={i} className="flex items-center justify-between animate-pulse">
                    <div className="space-y-1.5">
                      <div className="h-2 w-24 bg-white/[0.025] rounded" />
                      <div className="h-1.5 w-16 bg-white/[0.02] rounded" />
                    </div>
                    <div className="h-4 w-12 bg-white/[0.025] rounded-full" />
                  </div>
                ))
                : activeCommunities.length === 0
                  ? <p className="text-[11px] text-white/20 text-center py-2">No communities yet</p>
                  : activeCommunities.map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 py-1 border-b border-white/[0.025] last:border-0">
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-white/85 truncate max-w-[130px]">{c.name}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">{c.members}</p>
                      </div>
                      <span className={clsx('text-[9px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap', getCommunityCategoryStyles(c.tag))}>
                        {c.tag}
                      </span>
                    </div>
                  ))
              }
            </div>
          </div>

          {/* QUICK STATS */}
          {stats.total > 0 && (
            <div
              className="rounded-2xl border p-4 space-y-3"
              style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.12)' }}
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={13} className="text-violet-400/70" />
                <h3 className="text-[11px] font-bold text-violet-300/60 uppercase tracking-wide">This Week</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Likes', value: stats.likes, color: 'text-rose-300' },
                  { label: 'Comments', value: stats.comments, color: 'text-sky-300' },
                  { label: 'Follows', value: stats.follows, color: 'text-emerald-300' },
                  { label: 'Unread', value: stats.unread, color: 'text-violet-300' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className={clsx('text-[16px] font-bold', color)}>{value}</p>
                    <p className="text-[9px] text-white/30 font-medium uppercase tracking-wide mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
