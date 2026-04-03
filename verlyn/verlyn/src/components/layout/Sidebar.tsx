'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { CURRENT_USER } from '@/lib/mockData';
import clsx from 'clsx';
import {
  Home, MessageCircle, Users, Search, Zap, Bell,
  Settings, ChevronLeft, Moon, Sun,
  TrendingUp, Plus, Star, Shield,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'feed',          label: 'Feed',          icon: Home,         href: '/feed' },
  { id: 'explore',       label: 'Explore',       icon: Search,       href: '/explore' },
  { id: 'messages',      label: 'Messages',      icon: MessageCircle,href: '/messages' },
  { id: 'communities',   label: 'Communities',   icon: Users,        href: '/communities' },
  { id: 'trending',      label: 'Trending',      icon: TrendingUp,   href: '/trending' },
  { id: 'funzone',       label: 'Fun Zone',      icon: Zap,          href: '/funzone' },
];

const THEME_OPTIONS = [
  { key: 'midnight', label: 'Midnight', icon: Moon },
  { key: 'oled',     label: 'OLED Dark', icon: Shield },
  { key: 'corporate',label: 'Corporate', icon: Star },
  { key: 'light',    label: 'Light',    icon: Sun },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, theme, setTheme, unreadNotifCount, setNotifPanelOpen } = useAppStore();

  const isActive = (href: string) => {
    if (href === '/feed') return pathname === '/feed' || pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={clsx(
        'flex flex-col h-full border-r flex-shrink-0 transition-all duration-300 ease-in-out relative z-30',
        sidebarCollapsed ? 'w-[72px]' : 'w-[256px]'
      )}
      style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
    >
      {/* Logo */}
      <div className={clsx('flex items-center gap-3 px-4 py-5 mb-2', sidebarCollapsed && 'justify-center px-0')}>
        <div className="relative flex-shrink-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg animate-pulse-glow"
            style={{ background: 'linear-gradient(135deg, var(--v-violet), var(--v-cyan))' }}
          >
            V
          </div>
        </div>
        {!sidebarCollapsed && (
          <div className="animate-fade-in">
            <span className="text-lg font-black tracking-tight gradient-text">Verlyn</span>
            <div className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>verlyn.in</div>
          </div>
        )}
      </div>

      {/* Create Post button */}
      {!sidebarCollapsed ? (
        <div className="px-3 mb-4">
          <button
            className="btn-primary w-full shine"
            onClick={() => {}}
          >
            <Plus size={16} />
            Create Post
          </button>
        </div>
      ) : (
        <div className="flex justify-center mb-4">
          <button
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-transform hover:scale-105"
            style={{ background: 'linear-gradient(135deg, var(--v-violet), var(--v-cyan))' }}
          >
            <Plus size={18} />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        <div className={clsx('text-[10px] font-bold uppercase tracking-widest mb-2 px-3', sidebarCollapsed && 'hidden')} style={{ color: 'var(--text-tertiary)' }}>
          Navigation
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              href={item.href}
              key={item.id}
              className={clsx(
                'sidebar-item',
                active && 'active',
                sidebarCollapsed && 'justify-center px-0 w-full'
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
              {!sidebarCollapsed && item.id === 'messages' && unreadNotifCount > 0 && (
                <span
                  className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--v-pink)', color: '#fff', fontSize: '10px' }}
                >
                  3
                </span>
              )}
            </Link>
          );
        })}

        {/* Theme Switcher */}
        {!sidebarCollapsed && (
          <div className="pt-4 pb-2">
            <div className="text-[10px] font-bold uppercase tracking-widest mb-2 px-3" style={{ color: 'var(--text-tertiary)' }}>
              Theme
            </div>
            <div className="grid grid-cols-2 gap-1.5 px-1">
              {THEME_OPTIONS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTheme(t.key)}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200',
                      theme === t.key
                        ? 'text-white'
                        : 'hover:opacity-80'
                    )}
                    style={{
                      background: theme === t.key
                        ? 'linear-gradient(135deg, var(--v-violet), var(--v-cyan))'
                        : 'var(--surface)',
                      color: theme === t.key ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${theme === t.key ? 'transparent' : 'var(--border)'}`,
                    }}
                  >
                    <Icon size={12} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom items */}
      <div className="px-2 pb-2 space-y-0.5 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
        {/* Notifications */}
        <button
          onClick={() => setNotifPanelOpen(true)}
          className={clsx('sidebar-item relative', sidebarCollapsed && 'justify-center px-0 w-full')}
        >
          <div className="relative">
            <Bell size={18} />
            {unreadNotifCount > 0 && (
              <span className="notif-dot" />
            )}
          </div>
          {!sidebarCollapsed && (
            <>
              <span>Notifications</span>
              {unreadNotifCount > 0 && (
                <span
                  className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--v-pink)', color: '#fff', fontSize: '10px' }}
                >
                  {unreadNotifCount}
                </span>
              )}
            </>
          )}
        </button>

        <Link
          href="/settings"
          className={clsx('sidebar-item', isActive('/settings') && 'active', sidebarCollapsed && 'justify-center px-0 w-full')}
        >
          <Settings size={18} />
          {!sidebarCollapsed && <span>Settings</span>}
        </Link>
      </div>

      {/* User profile card */}
      <div
        className={clsx('p-3 border-t', sidebarCollapsed && 'flex justify-center')}
        style={{ borderColor: 'var(--border)' }}
      >
        <Link
          href="/profile"
          className={clsx(
            'flex items-center gap-3 rounded-xl p-2 w-full transition-all duration-200 hover:opacity-90',
            sidebarCollapsed && 'w-auto justify-center'
          )}
          style={{ background: 'var(--surface)' }}
        >
          <div className="relative flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CURRENT_USER.avatar}
              alt={CURRENT_USER.displayName}
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="online-dot" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0 text-left animate-fade-in">
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {CURRENT_USER.displayName}
                </span>
                {CURRENT_USER.isVerified && (
                  <div className="verified-badge flex-shrink-0">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  </div>
                )}
              </div>
              <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                @{CURRENT_USER.username}
              </div>
            </div>
          )}
        </Link>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-200 hover:scale-110 z-40"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronLeft
          size={12}
          className={clsx('transition-transform duration-300', sidebarCollapsed && 'rotate-180')}
        />
      </button>
    </aside>
  );
}
