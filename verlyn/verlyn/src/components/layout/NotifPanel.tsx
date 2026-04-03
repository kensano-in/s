'use client';

import { useAppStore } from '@/lib/store';
import { X, Bell, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

const PRIORITY_COLORS = {
  critical: 'var(--v-red)',
  high: 'var(--v-violet)',
  medium: 'var(--v-cyan)',
  low: 'var(--text-tertiary)',
};

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

export default function NotifPanel() {
  const { isNotifPanelOpen, setNotifPanelOpen, notifications, markNotifRead, markAllNotifsRead } = useAppStore();

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
        className={clsx(
          'fixed right-0 top-0 h-full w-full sm:w-[380px] z-50 flex flex-col transition-transform duration-300 ease-out border-l',
        )}
        style={{
          background: 'var(--bg-elevated)',
          borderColor: 'var(--border)',
          transform: isNotifPanelOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Bell size={18} style={{ color: 'var(--v-violet)' }} />
            <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Notifications</h2>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost text-xs" onClick={markAllNotifsRead}>
              <CheckCheck size={14} />
              Mark all read
            </button>
            <button className="icon-btn" onClick={() => setNotifPanelOpen(false)}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-3" style={{ borderColor: 'var(--border)' }}>
          {['All', 'Mentions', 'DMs', 'Communities'].map((tab, i) => (
            <button
              key={tab}
              className={clsx(
                'px-3 py-3 text-sm font-medium transition-colors duration-200 relative',
                i === 0 ? 'tab-active' : ''
              )}
              style={{ color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            >
              {tab}
              {i === 0 && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: 'var(--v-violet)' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Bell size={32} style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>You&apos;re all caught up!</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markNotifRead(n.id)}
                className={clsx(
                  'flex items-start gap-3 px-4 py-3 cursor-pointer transition-all duration-200 hover:opacity-90',
                )}
                style={{
                  background: n.isRead ? 'transparent' : 'rgba(108,99,255,0.05)',
                  borderLeft: n.isRead ? 'none' : `3px solid ${PRIORITY_COLORS[n.priority]}`,
                }}
              >
                {/* Icon / Avatar */}
                <div className="flex-shrink-0">
                  {n.fromUser ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={n.fromUser.avatar} alt={n.fromUser.displayName} className="w-10 h-10 rounded-full object-cover" />
                      <span
                        className="absolute -bottom-1 -right-1 text-sm"
                        style={{ fontSize: '14px', lineHeight: 1 }}
                      >
                        {TYPE_ICONS[n.type]}
                      </span>
                    </div>
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                      style={{ background: 'var(--surface)' }}
                    >
                      {TYPE_ICONS[n.type]}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                      {n.body}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </span>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: PRIORITY_COLORS[n.priority] }}
                    >
                      {n.priority}
                    </span>
                  </div>
                </div>

                {/* Read indicator */}
                {!n.isRead && (
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
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
