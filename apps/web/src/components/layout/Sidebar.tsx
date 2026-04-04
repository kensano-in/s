'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, MessageCircle, Users, Search, Zap, Bell,
  Settings, ChevronLeft, TrendingUp, Plus,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'feed',          label: 'Feed',          icon: Home,          href: '/feed'        },
  { id: 'explore',       label: 'Explore',       icon: Search,        href: '/explore'     },
  { id: 'messages',      label: 'Messages',      icon: MessageCircle, href: '/messages'    },
  { id: 'communities',   label: 'Communities',   icon: Users,         href: '/communities' },
  { id: 'trending',      label: 'Trending',      icon: TrendingUp,    href: '/trending'    },
  { id: 'funzone',       label: 'Fun Zone',      icon: Zap,           href: '/funzone'     },
];

// Damped spring config — matches the Harmonic Oscillator spec
const SPRING = { type: 'spring' as const, stiffness: 380, damping: 26, mass: 0.8 };
const SPRING_SOFT = { type: 'spring' as const, stiffness: 260, damping: 24 };

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar, unreadNotifCount, setNotifPanelOpen, currentUser } = useAppStore();

  const isActive = (href: string) => {
    if (href === '/feed') return pathname === '/feed' || pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <motion.aside
      layout
      transition={SPRING_SOFT}
      className={clsx(
        'flex flex-col h-full flex-shrink-0 relative z-30',
        sidebarCollapsed ? 'w-[72px]' : 'w-[256px]'
      )}
    >
      <div className="absolute inset-0 bg-surface-highest/60 backdrop-blur-2xl border-r border-outline-variant/15 shadow-ambient" />
      
      <div className="relative z-10 flex flex-col h-full py-4">
        {/* Logo */}
        <div className={clsx('flex items-center gap-3 px-4 mb-6', sidebarCollapsed && 'justify-center px-0')}>
          <motion.div
            whileHover={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 0.5 }}
            className="relative flex-shrink-0 w-10 h-10 rounded-xl bg-primary-gradient flex items-center justify-center text-white font-display font-black text-xl shadow-ambient"
          >
            V
          </motion.div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                key="logo-text"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={SPRING}
                className="flex flex-col justify-center overflow-hidden"
              >
                <span className="text-xl font-display font-black tracking-tight text-on-surface">Verlyn</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Create Post */}
        <div className={clsx('mb-6', sidebarCollapsed ? 'flex justify-center' : 'px-4')}>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            transition={SPRING}
            onClick={() => router.push('/feed')}
            className={clsx(
              'bg-primary-gradient text-white font-semibold text-sm shadow-ambient flex items-center justify-center gap-2',
              sidebarCollapsed ? 'w-10 h-10 rounded-full' : 'w-full rounded-full py-3 px-4'
            )}
          >
            <Plus size={18} />
            {!sidebarCollapsed && 'Create Post'}
          </motion.button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto hide-scrollbar">

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <motion.div
                key={item.id}
                whileHover={{ x: sidebarCollapsed ? 0 : 3, scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                transition={SPRING}
              >
                <Link
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-[16px] transition-colors duration-200 group',
                    active ? 'bg-surface-high text-primary-light shadow-[inset_0_0_20px_1px_rgba(255,255,255,0.02)]' : 'text-on-surface hover:bg-surface-low',
                    sidebarCollapsed && 'justify-center px-0'
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <motion.div
                    whileHover={{ rotate: active ? 0 : 12 }}
                    transition={SPRING}
                    className={clsx(
                      'p-1.5 rounded-xl transition-colors duration-200 flex-shrink-0 flex items-center justify-center',
                      active
                        ? 'bg-primary-dark/30 shadow-[0_0_12px_var(--primary-glow)]'
                        : 'bg-surface-lowest group-hover:bg-surface-high group-hover:shadow-ambient'
                    )}
                  >
                    <Icon size={18} />
                  </motion.div>
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        key={`label-${item.id}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={SPRING}
                        className="font-medium text-sm"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {!sidebarCollapsed && item.id === 'messages' && unreadNotifCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 15 }}
                      className="ml-auto bg-secondary-DEFAULT text-surface-lowest text-[10px] font-bold px-2 py-0.5 rounded-full"
                    >
                      {unreadNotifCount}
                    </motion.span>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="px-3 pt-4 border-t border-outline-variant/15 mt-2 space-y-1 text-on-surface">
          <motion.button
            whileHover={{ x: sidebarCollapsed ? 0 : 3 }}
            whileTap={{ scale: 0.97 }}
            transition={SPRING}
            onClick={() => setNotifPanelOpen(true)}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-[16px] hover:bg-surface-low transition-colors w-full',
              sidebarCollapsed && 'justify-center px-0'
            )}
          >
            <div className="relative">
              <Bell size={20} />
              {unreadNotifCount > 0 && (
                <span className="absolute top-0 -right-1 w-2.5 h-2.5 bg-secondary-light rounded-full animate-pulse" />
              )}
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-medium text-sm">
                  Notifications
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          <motion.div whileHover={{ x: sidebarCollapsed ? 0 : 3 }} whileTap={{ scale: 0.97 }} transition={SPRING}>
            <Link
              href="/settings"
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-[16px] hover:bg-surface-low transition-colors w-full',
                isActive('/settings') && 'bg-surface-high text-primary-light',
                sidebarCollapsed && 'justify-center px-0'
              )}
            >
              <Settings size={20} />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-medium text-sm">
                    Settings
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </motion.div>
        </div>

        {/* User Card */}
        <div className={clsx('px-4 mt-4', sidebarCollapsed && 'px-2')}>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={SPRING}>
            <Link
              href="/profile"
              className="flex items-center gap-3 p-2 rounded-2xl bg-surface-low hover:bg-surface-high transition-colors border border-outline-variant/10"
            >
              <div className="relative flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=default`}
                  alt={currentUser?.displayName || 'Profile'}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-secondary-light border-2 border-surface-low rounded-full" />
              </div>
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={SPRING}
                    className="flex-1 min-w-0 flex flex-col justify-center"
                  >
                    <div className="text-[13px] font-bold leading-tight text-on-surface truncate pb-0.5">
                      {currentUser?.displayName || 'Loading...'}
                    </div>
                    <div className="text-[11px] leading-tight text-on-surface-variant truncate">
                      @{currentUser?.username || '...'}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Collapse toggle */}
      <motion.button
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.9 }}
        transition={SPRING}
        onClick={toggleSidebar}
        className="absolute -right-3 top-[70px] w-6 h-6 rounded-full bg-surface-high border border-outline-variant/30 flex items-center justify-center hover:bg-surface-highest text-on-surface-variant hover:text-on-surface z-40"
      >
        <motion.div
          animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
          transition={SPRING}
        >
          <ChevronLeft size={14} />
        </motion.div>
      </motion.button>
    </motion.aside>
  );
}
