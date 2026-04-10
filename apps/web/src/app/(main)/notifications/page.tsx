'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { Bell, Heart, MessageCircle, UserPlus, Zap, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { markAllNotificationsRead } from './actions';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface DBNotification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention';
  actor_id: string;
  entity_id: string;
  is_read: boolean;
  created_at: string;
  actor?: { username: string; display_name: string; avatar_url: string };
}

const ICON_MAP: Record<string, any> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  mention: Zap,
};

const MSG_MAP: Record<string, string> = {
  like: 'liked your post.',
  comment: 'commented on your post.',
  follow: 'started following you.',
  mention: 'mentioned you.',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, markAllNotifsRead } = useAppStore();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!currentUser?.id) { setLoading(false); return; }

    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('*, actor:users!notifications_actor_id_fkey(username, display_name, avatar_url)')
        .eq('user_id', currentUser!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setNotifications(data || []);
      setLoading(false);

      if (data && data.some(n => !n.is_read)) {
        await markAllNotificationsRead(currentUser!.id);
        markAllNotifsRead();
      }
    }
    load();

    const channel = supabase.channel('notif_live')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUser.id}`,
      }, async (payload) => {
        const { data: actor } = await supabase
          .from('users')
          .select('username, display_name, avatar_url')
          .eq('id', (payload.new as any).actor_id)
          .single();
        setNotifications(prev => [{ ...payload.new as DBNotification, actor: actor || undefined }, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, supabase, markAllNotifsRead]);

  return (
    <div className="max-w-2xl mx-auto pb-32 pt-8 animate-fade-in px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-100">Notifications</h1>
          <p className="text-[14px] text-neutral-500 mt-1">Your recent activity and interactions.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
          <div className="w-6 h-6 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-[14px] text-neutral-400">Loading...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-24 text-center">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-500">
            <CheckCircle2 size={28} />
          </div>
          <p className="text-lg font-medium text-neutral-300">You're all caught up</p>
          <p className="text-[14px] text-neutral-500 mt-1">No new notifications right now.</p>
        </div>
      ) : (
        <div className="bg-[#0f0f0f] rounded-2xl border border-white/5 overflow-hidden">
          <AnimatePresence initial={false}>
            {notifications.map((n, i) => {
              const Icon = ICON_MAP[n.type] || Bell;
              const msg = MSG_MAP[n.type] || 'interacted with your profile.';
              const active = !n.is_read;
              
              // Direct navigation logic: Follows go to profile, others to post.
              const href = n.type === 'follow' ? `/${n.actor?.username}` : `/post/${n.entity_id}`;
              
              return (
                <Link key={n.id} href={href} className="block relative focus:outline-none focus:bg-white/[0.04]">
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className={clsx(
                        'group flex items-center gap-4 p-4 min-h-[72px] border-b border-white/5 last:border-none transition-colors w-full cursor-pointer overflow-hidden',
                        active ? 'bg-blue-500/[0.03] hover:bg-blue-500/[0.06]' : 'hover:bg-white/[0.02]'
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={n.actor?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.actor?.username}`}
                        className="w-12 h-12 rounded-full object-cover bg-neutral-800"
                        alt="avatar"
                      />
                      <div className={clsx(
                          'absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0A0A0A]',
                          n.type === 'like' ? 'bg-red-500' :
                          n.type === 'follow' ? 'bg-emerald-500' :
                          n.type === 'comment' ? 'bg-blue-500' : 'bg-neutral-500'
                      )}>
                        <Icon size={10} className="text-white" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-[15px] text-neutral-300 leading-snug">
                          <span className="font-semibold text-neutral-100">{n.actor?.display_name || n.actor?.username}</span>
                          {' '}{msg}
                        </p>
                        {active && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                      </div>
                      <span className="text-[13px] text-neutral-500 mt-0.5">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

