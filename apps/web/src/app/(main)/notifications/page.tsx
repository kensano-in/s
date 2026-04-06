'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { Bell, Heart, MessageCircle, UserPlus, Loader2, CheckCheck, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { markAllNotificationsRead } from './actions';
import KineticIcon from '@/components/ui/KineticIcon';
import clsx from 'clsx';

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
  like: 'resonated with your signal.',
  comment: 'echoed your broadcast.',
  follow: 'joined your frequency.',
  mention: 'pinged your node.',
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
          <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-none mb-2">Activity Stream</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60 italic">Network Resonance Matrix</p>
        </div>
        <div className="w-16 h-16 rounded-[24px] bg-primary-gradient flex items-center justify-center shadow-2xl group cursor-pointer hover:scale-105 transition-all">
          <KineticIcon icon={Bell} size={28} color="white" pulse glow active />
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
              const active = !n.is_read;
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -30, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ delay: i < 10 ? i * 0.05 : 0, type: 'spring', bounce: 0.3 }}
                  className={clsx(
                      'group flex items-center gap-6 p-6 rounded-[32px] border transition-all duration-700 relative overflow-hidden italic',
                      active 
                        ? 'bg-surface-lowest/60 border-v-cyan/20 shadow-[0_15px_30px_rgba(6,182,212,0.08)]' 
                        : 'bg-surface-lowest/20 border-white/5 hover:bg-white/[0.03]'
                  )}
                >
                  {active && (
                    <div className="absolute inset-0 bg-v-cyan/5 animate-pulse" />
                  )}
                  
                  <div className="relative flex-shrink-0 z-10">
                    <img
                      src={n.actor?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.actor?.username}`}
                      className="w-14 h-14 rounded-[20px] object-cover border-2 border-white/5 group-hover:border-white/20 transition-all"
                      alt="actor"
                    />
                    <div className={clsx(
                        'absolute -bottom-2 -right-2 w-7 h-7 rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform',
                        n.type === 'like' ? 'bg-rose-500' :
                        n.type === 'follow' ? 'bg-v-emerald' :
                        n.type === 'comment' ? 'bg-v-cyan' : 'bg-v-violet'
                    )}>
                      <KineticIcon icon={Icon} size={14} color="white" active pulse />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 z-10">
                    <p className="text-sm font-black text-white uppercase tracking-tight leading-snug group-hover:text-v-cyan transition-colors">
                      <span className="text-v-cyan">@{n.actor?.username || 'Unknown Node'}</span>
                      {' '}{msg}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 opacity-40">
                      <span className="text-[9px] font-black uppercase tracking-widest">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </span>
                      <div className="w-1 h-1 rounded-full bg-white/20" />
                      <span className="text-[7px] font-black uppercase tracking-[0.2em]">{n.type}_SIGNAL</span>
                    </div>
                  </div>

                  {active && (
                    <div className="relative flex flex-col items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-v-cyan shadow-[0_0_15px_var(--v-cyan)] animate-pulse" />
                        <span className="text-[6px] font-black uppercase text-v-cyan opacity-40 tracking-widest">Live</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
