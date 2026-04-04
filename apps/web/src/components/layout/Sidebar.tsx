'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
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

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, unreadNotifCount, setNotifPanelOpen, currentUser } = useAppStore();

  const isActive = (href: string) => {
    if (href === '/feed') return pathname === '/feed' || pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={clsx(
        'flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-in-out relative z-30',
        sidebarCollapsed ? 'w-[72px]' : 'w-[256px]'
      )}
    >
      <div className="absolute inset-0 bg-surface-highest/60 backdrop-blur-2xl border-r border-outline-variant/15 shadow-ambient"></div>
      
      <div className="relative z-10 flex flex-col h-full py-4">
        {/* Logo */}
        <div className={clsx('flex items-center gap-3 px-4 mb-6', sidebarCollapsed && 'justify-center px-0')}>
          <div className="relative flex-shrink-0 w-10 h-10 rounded-xl bg-primary-gradient flex items-center justify-center text-white font-display font-black text-xl shadow-ambient">
            V
          </div>
          {!sidebarCollapsed && (
            <div className="animate-fade-in flex flex-col justify-center">
              <span className="text-xl font-display font-black tracking-tight text-on-surface">Verlyn</span>
            </div>
          )}
        </div>

        {/* Create Post */}
        {!sidebarCollapsed ? (
          <div className="px-4 mb-6">
            <button 
              onClick={() => alert("The Compose Terminal is initializing...")}
              className="w-full bg-primary-gradient text-white rounded-full py-3 px-4 font-semibold text-sm transition-transform hover:scale-[0.98] shadow-ambient flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Create Post
            </button>
          </div>
        ) : (
          <div className="flex justify-center mb-6">
            <button 
              onClick={() => alert("The Compose Terminal is initializing...")}
              className="w-10 h-10 rounded-full bg-primary-gradient text-white flex items-center justify-center transition-transform hover:scale-105 shadow-ambient"
            >
              <Plus size={18} />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto hide-scrollbar">
          {!sidebarCollapsed && (
            <div className="text-[11px] font-display font-semibold uppercase tracking-[0.15em] mb-3 px-3 text-on-surface-variant">
              Navigation
            </div>
          )}
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                href={item.href}
                key={item.id}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-[16px] transition-all duration-300 group',
                  active ? 'bg-surface-high text-primary-light shadow-[inset_0_0_20px_1px_rgba(255,255,255,0.02)]' : 'text-on-surface hover:bg-surface-low',
                  sidebarCollapsed && 'justify-center px-0'
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <div className={clsx("p-1.5 rounded-xl transition-all duration-300 flex-shrink-0 flex items-center justify-center", active ? 'bg-primary-dark/30 shadow-[0_0_12px_var(--primary-glow)]' : 'bg-surface-lowest group-hover:bg-surface-high group-hover:shadow-ambient')}>
                  <Icon size={18} className="icon-burst" />
                </div>
                {!sidebarCollapsed && <span className="font-medium text-sm">{item.label}</span>}
                {!sidebarCollapsed && item.id === 'messages' && unreadNotifCount > 0 && (
                  <span className="ml-auto bg-secondary-DEFAULT text-surface-lowest text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadNotifCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="px-3 pt-4 border-t border-outline-variant/15 mt-2 space-y-1 text-on-surface">
          <button
            onClick={() => setNotifPanelOpen(true)}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-[16px] hover:bg-surface-low transition-colors w-full',
              sidebarCollapsed && 'justify-center px-0'
            )}
            title="Notifications"
          >
            <div className="relative">
              <Bell size={20} />
              {unreadNotifCount > 0 && (
                <span className="absolute top-0 -right-1 w-2.5 h-2.5 bg-secondary-light rounded-full" />
              )}
            </div>
            {!sidebarCollapsed && <span className="font-medium text-sm truncate">Notifications</span>}
          </button>

          <Link
            href="/settings"
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-[16px] hover:bg-surface-low transition-colors w-full',
              isActive('/settings') && 'bg-surface-high text-primary-light',
              sidebarCollapsed && 'justify-center px-0'
            )}
            title="Settings"
          >
            <Settings size={20} />
            {!sidebarCollapsed && <span className="font-medium text-sm truncate">Settings</span>}
          </Link>
        </div>

        {/* User Card */}
        <div className={clsx('px-4 mt-4', sidebarCollapsed && 'px-2')}>
          <Link
            href="/profile"
            className="flex items-center gap-3 p-2 rounded-2xl bg-surface-low hover:bg-surface-high transition-colors border border-outline-variant/10 group"
          >
            <div className="relative flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentUser?.avatar}
                alt={currentUser?.displayName}
                className="w-10 h-10 rounded-full object-cover"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-secondary-light border-2 border-surface-low rounded-full" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="text-[13px] font-bold leading-tight text-on-surface truncate pb-0.5">
                  {currentUser?.displayName}
                </div>
                <div className="text-[11px] leading-tight text-on-surface-variant truncate">
                  @{currentUser?.username}
                </div>
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-[70px] w-6 h-6 rounded-full bg-surface-high border border-outline-variant/30 flex items-center justify-center transition-all duration-300 hover:bg-surface-highest text-on-surface-variant hover:text-on-surface z-40"
      >
        <ChevronLeft
          size={14}
          className={clsx('transition-transform duration-300', sidebarCollapsed && 'rotate-180')}
        />
      </button>
    </aside>
  );
}
