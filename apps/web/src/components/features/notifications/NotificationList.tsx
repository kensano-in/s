'use client';

/**
 * 📜 NotificationList — Section 6: UI Components
 * 
 * Renders a paginated, animated list of notifications.
 * Handles date grouping (Today, Yesterday, Earlier) and intelligent aggregation.
 */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellOff, Compass, Users } from 'lucide-react';
import NotificationItem from './NotificationItem';
import { Notification } from '@/lib/types';
import Link from 'next/link';

interface NotificationListProps {
  notifications: Notification[];
  loading?: boolean;
  onDelete?: (id: string) => void;
  isSelectMode?: boolean;
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
}

// Client side grouping helper for follows & likes to prevent duplicate notifications spam
function groupNotifications(notifs: Notification[]) {
  const result: Notification[] = [];
  const followGroup: Notification[] = [];
  const likeGroups: Record<string, Notification[]> = {};

  notifs.forEach((n) => {
    if (n.type === 'follow') {
      followGroup.push(n);
    } else if (n.type === 'like' && n.entity_id && n.entity_type === 'post') {
      if (!likeGroups[n.entity_id]) likeGroups[n.entity_id] = [];
      likeGroups[n.entity_id].push(n);
    } else {
      result.push(n);
    }
  });

  // Group Follows
  if (followGroup.length > 0) {
    if (followGroup.length === 1) {
      result.push(followGroup[0]);
    } else {
      const primaryNotif = followGroup[0];
      // Keep only unique actors
      const uniqueActorsMap = new Map();
      followGroup.forEach(f => {
        if (f.actor) uniqueActorsMap.set(f.actor.id, f.actor);
      });
      const uniqueActors = Array.from(uniqueActorsMap.values());
      
      if (uniqueActors.length === 0) {
        // All actors are null — just show primary notification
        result.push(primaryNotif);
      } else if (uniqueActors.length === 1) {
        result.push({
          ...primaryNotif,
          actor: uniqueActors[0]
        });
      } else {
        result.push({
          ...primaryNotif,
          id: `grouped-follow-${primaryNotif.id}`,
          body: 'followed you.',
          metadata: {
            ...primaryNotif.metadata,
            actor_count: uniqueActors.length,
            actors: uniqueActors
          }
        });
      }
    }
  }

  // Group Likes per Post
  Object.entries(likeGroups).forEach(([postId, list]) => {
    if (list.length === 1) {
      result.push(list[0]);
    } else {
      const primaryNotif = list[0];
      const uniqueActorsMap = new Map();
      list.forEach(l => {
        if (l.actor) uniqueActorsMap.set(l.actor.id, l.actor);
      });
      const uniqueActors = Array.from(uniqueActorsMap.values());

      if (uniqueActors.length === 0) {
        // All actors are null — just show primary notification
        result.push(primaryNotif);
      } else if (uniqueActors.length === 1) {
        result.push({
          ...primaryNotif,
          actor: uniqueActors[0]
        });
      } else {
        result.push({
          ...primaryNotif,
          id: `grouped-like-${postId}-${primaryNotif.id}`,
          body: 'liked your post.',
          metadata: {
            ...primaryNotif.metadata,
            actor_count: uniqueActors.length,
            actors: uniqueActors
          }
        });
      }
    }
  });

  return result.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export default function NotificationList({ notifications, loading, onDelete, isSelectMode, selectedIds, onSelect }: NotificationListProps) {
  // Grouping & Date Partitioning
  const groups = useMemo(() => {
    const sections: Record<string, Notification[]> = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    const aggregated = groupNotifications(notifications);

    aggregated.forEach((n) => {
      const dateString = new Date(n.created_at).toDateString();
      if (dateString === today) sections.Today.push(n);
      else if (dateString === yesterday) sections.Yesterday.push(n);
      else sections.Earlier.push(n);
    });

    return Object.entries(sections).filter(([_, items]) => items.length > 0);
  }, [notifications]);

  // Show skeleton on initial load (loading=true AND no notifications in store yet)
  if (loading && notifications.length === 0) {
    return (
      <div className="flex flex-col space-y-3">
        <div className="bg-[#0C0C0F]/20 rounded-2xl border border-white/[0.03] overflow-hidden divide-y divide-white/[0.02] backdrop-blur-sm">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-start gap-4 px-4 py-4 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-white/[0.03] shrink-0 mt-0.5 relative">
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white/[0.02] border border-[#0A0A0A]" />
              </div>
              <div className="flex-1 space-y-2 py-0.5">
                <div className="h-3.5 bg-white/[0.03] rounded-md w-3/4" />
                <div className="h-2.5 bg-white/[0.02] rounded-md w-1/2" />
                <div className="h-2 bg-white/[0.015] rounded-md w-1/5 mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!loading && notifications.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 px-6 rounded-3xl border border-white/[0.03] bg-[#0C0C0F]/60 backdrop-blur-md text-center shadow-[0_8px_32px_0_rgba(139,92,246,0.02)] border-violet-500/[0.05]"
      >
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-violet-500/20 rounded-2xl blur-xl animate-pulse" />
          <div className="relative w-14 h-14 bg-[#111115] border border-white/[0.08] rounded-2xl flex items-center justify-center shadow-lg">
            <BellOff className="text-violet-400/80 animate-bounce" size={24} style={{ animationDuration: '3s' }} />
          </div>
        </div>
        
        <h3 className="text-[15px] font-black text-white/90">No active alerts</h3>
        <p className="text-white/40 max-w-xs mt-2 text-xs font-semibold leading-relaxed">
          You are completely caught up! We will alert you here when someone interacts with your posts or profile.
        </p>

        {/* Engagement Recovery Actions */}
        <div className="mt-8 grid grid-cols-2 gap-3 w-full max-w-[340px]">
          <Link
            href="/feed"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-[11px] font-bold text-white/80 hover:text-white transition-all hover:scale-[1.03] active:scale-95 duration-200"
          >
            <Compass size={12} />
            Explore Feed
          </Link>
          <Link
            href="/communities"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-[11px] font-bold text-violet-300 hover:text-violet-200 transition-all hover:scale-[1.03] active:scale-95 duration-200"
          >
            <Users size={12} />
            Find Groups
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col space-y-5">
      <AnimatePresence mode="popLayout" initial={false}>
        {groups.map(([title, items]) => (
          <div key={title} className="mb-1">
            <div className="flex items-center gap-2 px-1 mb-3 mt-1">
              <span className="text-[11px] text-white/30 font-medium select-none">{title}</span>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.05), transparent)' }} />
            </div>
            <div className="space-y-0.5">
              {items.map((n) => (
                <NotificationItem 
                  key={n.id} 
                  notification={n}
                  onDelete={onDelete}
                  isSelectMode={isSelectMode}
                  isSelected={selectedIds?.has(n.id)}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        ))}
      </AnimatePresence>

      {loading && (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
