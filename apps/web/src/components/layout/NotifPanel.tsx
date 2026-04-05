'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { X, Bell, CheckCheck, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '@/app/(main)/notifications/actions';
import type { DBNotification } from '@/app/(main)/notifications/actions';
import { createClient } from '@/lib/supabase/client';

const TYPE_ICONS: Record<string, string> = {
  like: '❤️',
  comment: '💬',
  follow: '👤',
  mention: '📣',
  dm: '✉️',
  community: '🏘️',
  system: '⚙️',
  award: '🏆',
};

const TYPE_COLORS: Record<string, string> = {
  like: '#ef4444',
  comment: '#6c63ff',
  follow: '#06b6d4',
  mention: '#f97316',
  dm: '#8b5cf6',
  community: '#10b981',
  system: '#94a3b8',
  award: '#f59e0b',
};

export default function NotifPanel() {
  const { isNotifPanelOpen, setNotifPanelOpen, currentUser } = useAppStore();
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'mentions' | 'dms' | 'communities'>('all');

  const load = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    const data = await fetchNotifications(currentUser.id);
    setNotifications(data);
    setLoading(false);
  }, [currentUser?.id]);

  // Fetch when panel opens
  useEffect(() => {
    if (isNotifPanelOpen) load();
  }, [isNotifPanelOpen, load]);

  // Real-time subscription — new notifications appear instantly
  useEffect(() => {
    if (!currentUser?.id) return;
    const supabase = createClient();
    const channel = supabase
      .channel('notif-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
        (payload) => {
          setNotifications(prev => [payload.new as DBNotification, ...prev]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id]);

  const handleMarkRead = async (id: string) => {
    if (!currentUser?.id) return;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await markNotificationRead(id, currentUser.id);
  };

  const handleMarkAllRead = async () => {
    if (!currentUser?.id) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await markAllNotificationsRead(currentUser.id);
  };

  const filteredNotifs = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'mentions') return n.type === 'mention';
    if (activeTab === 'dms') return n.type === 'dm';
    if (activeTab === 'communities') return n.type === 'community';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <>
      {/* Backdrop */}
      {isNotifPanelOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setNotifPanelOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full w-full sm:w-[380px] z-50 flex flex-col transition-transform duration-300 ease-out border-l"
        style={{
          background: 'var(--bg-elevated)',
          borderColor: 'var(--border)',
          transform: isNotifPanelOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Bell size={18} style={{ color: 'var(--v-violet)' }} />
            <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Notifications</h2>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: 'var(--v-violet)' }}>
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost text-xs flex items-center gap-1" onClick={handleMarkAllRead}>
              <CheckCheck size={14} />
              Mark all read
            </button>
            <button className="icon-btn" onClick={() => setNotifPanelOpen(false)}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-3 flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          {(['all', 'mentions', 'dms', 'communities'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx('px-3 py-3 text-sm font-medium transition-colors duration-200 relative capitalize')}
              style={{ color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: 'var(--v-violet)' }} />
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--v-violet)' }} />
            </div>
          ) : filteredNotifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Bell size={32} style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>You&apos;re all caught up!</p>
            </div>
          ) : (
            filteredNotifs.map((n) => (
              <div
                key={n.id}
                onClick={() => handleMarkRead(n.id)}
                className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-all duration-200 hover:bg-white/[0.03]"
                style={{
                  background: n.is_read ? 'transparent' : 'rgba(108,99,255,0.04)',
                  borderLeft: `3px solid ${n.is_read ? 'transparent' : (TYPE_COLORS[n.type] || 'var(--v-violet)')}`,
                }}
              >
                {/* Actor avatar + type icon */}
                <div className="flex-shrink-0 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      n.actor?.avatar_url ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.actor?.username || 'system'}`
                    }
                    alt={n.actor?.display_name || 'System'}
                    className="w-10 h-10 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=fallback`;
                    }}
                  />
                  <span
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[11px]"
                    style={{ background: 'var(--bg-elevated)', border: '2px solid var(--bg-elevated)' }}
                  >
                    {TYPE_ICONS[n.type] || '🔔'}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                    <span className="font-bold">{n.actor?.display_name || 'Someone'}</span>{' '}
                    {n.body}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: TYPE_COLORS[n.type] || 'var(--text-tertiary)' }}
                    >
                      {n.type}
                    </span>
                  </div>
                </div>

                {/* Unread dot */}
                {!n.is_read && (
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                    style={{ background: 'var(--v-violet)', boxShadow: '0 0 6px var(--v-violet)' }}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
