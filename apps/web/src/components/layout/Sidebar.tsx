'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useState } from 'react';
import IdentitySwitcher from '../security/IdentitySwitcher';
import {
  Home, MessageCircle, Users, Search, Zap, Bell,
  Settings, ChevronLeft, TrendingUp, Radio, User, Orbit, ArrowRightLeft
} from 'lucide-react';

const SECTIONS = [
  {
    title: 'PRIMARY',
    items: [
      { id: 'feed',     label: 'Home',     icon: Home,          href: '/feed' },
      { id: 'explore',  label: 'Explore',  icon: Search,        href: '/explore' },
      { id: 'messages', label: 'Messages', icon: MessageCircle, href: '/messages' },
    ]
  },
  {
    title: 'SOCIAL',
    items: [
      { id: 'communities', label: 'Communities', icon: Users,    href: '/communities' },
      { id: 'trending',    label: 'Trending',    icon: TrendingUp, href: '/trending' },
    ]
  },
  {
    title: 'ENTERTAINMENT',
    items: [
      { id: 'arcade', label: 'Arcade', icon: Zap, href: '/arcade' },
    ]
  },
  {
    title: 'SYSTEM',
    items: [
      { id: 'notifications', label: 'Notifications', icon: Bell,     href: '/notifications' },
      { id: 'settings',      label: 'Settings',      icon: Settings, href: '/settings' },
    ]
  },
  {
    title: 'USER',
    items: [
      { id: 'profile', label: 'Profile', icon: User, href: '/profile' },
    ]
  }
];

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28, mass: 0.8 };

const navVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } }
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar, unreadNotifCount, currentUser } = useAppStore();
  const [showSwitcher, setShowSwitcher] = useState(false);

  const isActive = (href: string) => {
    if (href === '/feed') return pathname === '/feed' || pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      <motion.aside
        layout
        transition={SPRING}
        className={clsx(
          'flex flex-col h-full flex-shrink-0 relative z-40 border-r border-[#1f1f1f] bg-[#050505]',
          sidebarCollapsed ? 'w-20' : 'w-64'
        )}
      >
        <div className="flex flex-col h-full py-6">
          
          {/* Header Logo */}
          <div className={clsx('px-6 mb-8 flex items-center gap-3', sidebarCollapsed && 'justify-center px-0')}>
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                className="w-8 h-8 rounded-lg bg-blue-600 flex flex-shrink-0 items-center justify-center text-white font-bold text-lg shadow-glow-primary"
              >
                  V
              </motion.div>
              {!sidebarCollapsed && (
                <motion.span 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-lg font-bold tracking-tight text-white whitespace-nowrap"
                >
                  Verlyn
                </motion.span>
              )}
          </div>

          {/* Navigation sections */}
        <motion.nav 
            variants={navVariants}
            initial="hidden"
            animate="show"
            className="flex-1 px-3 space-y-6 overflow-y-auto custom-scrollbar"
        >
            {SECTIONS.map((section) => (
              <div key={section.title} className="space-y-1">
                {!sidebarCollapsed && (
                  <motion.h3 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="px-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2"
                  >
                    {section.title}
                  </motion.h3>
                )}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link key={item.id} href={item.href} className="block group">
                      <motion.div 
                        variants={itemVariants}
                        whileHover={{ scale: 1.02, x: 2, filter: 'brightness(1.1)' }}
                        whileTap={{ scale: 0.96 }}
                        className={clsx(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative overflow-hidden',
                          active ? 'text-white' : 'text-neutral-400 hover:text-white',
                          sidebarCollapsed && 'justify-center'
                        )}
                      >
                        {active && (
                           <motion.div 
                              layoutId="sidebar-active-bg"
                              className="absolute inset-0 bg-[#121212] border border-[#262626] rounded-lg lux-shadow"
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                           />
                        )}
                        <Icon size={20} strokeWidth={active ? 2.5 : 2} className={clsx("relative z-10", active ? "text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "")} />
                        {!sidebarCollapsed && (
                          <span className="text-sm font-semibold relative z-10 whitespace-nowrap">{item.label}</span>
                        )}
                        {active && (
                          <motion.div 
                             layoutId="sidebar-active-pip"
                             className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-md shadow-glow-primary z-10" 
                          />
                        )}
                        {item.id === 'messages' && unreadNotifCount > 0 && (
                          <motion.span 
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border border-[#050505] shadow-glow-primary z-10" 
                          />
                        )}
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            ))}
        </motion.nav>

        {/* Profile Card Mini */}
        <div className="px-3 mt-auto py-5 border-t border-[#1f1f1f] flex items-center gap-1 min-h-[80px]">
          <Link href="/profile" className={clsx(
            'flex-1 flex items-center gap-3 p-2 rounded-xl hover:bg-[#121212] transition-colors group relative overflow-hidden',
            sidebarCollapsed && 'justify-center'
          )}>
            <div className="w-9 h-9 rounded-full overflow-hidden border border-[#262626] shadow-sm relative z-10 flex-shrink-0 bg-[#121212]">
              <motion.img 
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring" }}
                src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username || 'user'}`} 
                className="w-full h-full object-cover" 
                alt="me" 
              />
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0 relative z-10">
                <p className="text-sm font-bold text-white truncate leading-none mb-1 group-hover:text-blue-400 transition-colors">{currentUser?.displayName}</p>
                <p className="text-xs text-neutral-500 truncate font-medium">@{currentUser?.username}</p>
              </div>
            )}
          </Link>
          
          {!sidebarCollapsed && (
            <button 
              onClick={() => setShowSwitcher(true)}
              className="p-2.5 text-neutral-500 hover:text-v-cyan hover:bg-white/5 rounded-xl transition-all active:scale-90"
              title="Switch Identity"
            >
              <ArrowRightLeft size={18} />
            </button>
          )}
        </div>

        </div>

        {/* Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-12 w-6 h-6 rounded-full bg-[#121212] border border-[#262626] flex items-center justify-center text-neutral-400 hover:text-white hover:shadow-glow hover:bg-[#1a1a1a] transition-all duration-normal active:scale-95 z-50"
        >
          <motion.div animate={{ rotate: sidebarCollapsed ? 180 : 0 }} transition={SPRING}>
            <ChevronLeft size={14} />
          </motion.div>
        </button>
      </motion.aside>

      <IdentitySwitcher isOpen={showSwitcher} onClose={() => setShowSwitcher(false)} />
    </>
  );
}
