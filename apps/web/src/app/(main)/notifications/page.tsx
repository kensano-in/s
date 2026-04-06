'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { Bell, Heart, MessageCircle, UserPlus, Loader2, CheckCheck, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { markAllNotificationsRead } from './actions';

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
  like: 'liked your signal.',
  comment: 'reacted to your broadcast.',
  follow: 'enlisted in your network.',
  mention: 'mentioned you in a signal.',
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
        .select('*, actor:users!actor_id(username, display_name, avatar_url)')
        .eq('user_id', currentUser!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setNotifications(data || []);
      setLoading(false);

      // Mark all as read on page open
      if (data && data.some(n => !n.is_read)) {
        await markAllNotificationsRead(currentUser!.id);
        markAllNotifsRead();
      }
    }
    load();

    // Real-time: push new notifications live
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
    <div className="max-w-2xl mx-auto pb-32 animate-fade-in px-4 italic">
      <div className="flex items-center justify-between py-10">
        <div>
          <h1 className="text-5xl font-black uppercase tracking-tighter text-white leading-none mb-2">Signal Alerts</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-50">Live Notification Matrix</p>
        </div>
        <div className="w-14 h-14 rounded-[20px] bg-primary-gradient flex items-center justify-center shadow-2xl">
          <Bell size={24} className="text-white" />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 opacity-40">
          <Loader2 size={32} className="animate-spin text-v-cyan mb-4" />
          <p className="text-[10px] font-black uppercase tracking-[0.5em]">Syncing Signal Matrix...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-card p-24 text-center border-none bg-surface-lowest/40 rounded-[60px] shadow-3xl">
          <Bell size={40} className="mx-auto mb-6 text-on-surface-variant opacity-10" />
          <p className="text-xl font-black uppercase tracking-tighter text-white mb-2">Signal Void</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant opacity-40">No alerts received. The matrix is quiet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {notifications.map((n, i) => {
              const Icon = ICON_MAP[n.type] || Bell;
              const msg = MSG_MAP[n.type] || 'interacted with your node.';
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i < 10 ? i * 0.04 : 0 }}
                  className={`flex items-center gap-5 p-5 rounded-[28px] border transition-all duration-500 ${
                    n.is_read
                      ? 'bg-surface-lowest/20 border-white/5'
                      : 'bg-surface-lowest/50 border-v-cyan/10 shadow-[0_0_30px_rgba(6,182,212,0.04)]'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={n.actor?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.actor?.username}`}
                      className="w-12 h-12 rounded-[18px] object-cover border border-white/10"
                      alt="actor"
                    />
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center ${
                      n.type === 'like' ? 'bg-rose-500' :
                      n.type === 'follow' ? 'bg-v-emerald' :
                      n.type === 'comment' ? 'bg-v-cyan' : 'bg-v-violet'
                    }`}>
                      <Icon size={10} className="text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white uppercase tracking-tight leading-snug">
                      <span className="text-v-cyan">{n.actor?.display_name || n.actor?.username || 'Unknown Node'}</span>
                      {' '}{msg}
                    </p>
                    <span className="text-[9px] font-black text-on-surface-variant opacity-40 uppercase tracking-widest">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-v-cyan shadow-[0_0_8px_var(--v-cyan)] flex-shrink-0" />}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
