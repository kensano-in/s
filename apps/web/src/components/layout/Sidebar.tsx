'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import IdentitySwitcher from '../security/IdentitySwitcher';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import clsx from 'clsx';
import { getAvatarUrl } from '@/lib/utils';
import { getCommunities } from '@/app/(main)/communities/actions';
import {
  Home, MessageCircle, Users, Search, Zap, Bell,
  Settings, ChevronLeft, TrendingUp, Radio, User, Orbit, ArrowRightLeft,
  Plus, X, ScrollText, PenTool
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CreatePost from '../features/feed/CreatePost';

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
      // { id: 'draw',        label: 'Draw Studio', icon: PenTool,   href: '/draw' },
    ]
  },
  {
    title: 'SYSTEM',
    items: [
      { id: 'notifications', label: 'Notifications', icon: Bell,       href: '/notifications' },
      { id: 'updates',       label: 'Updates',       icon: ScrollText, href: '/updates' },
      { id: 'settings',      label: 'Settings',      icon: Settings,   href: '/settings' },
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
  const sidebarCollapsed = useAppStore(s => s.sidebarCollapsed);
  const breakpoint = useAppStore(s => s.breakpoint);
  const toggleSidebar = useAppStore(s => s.toggleSidebar);
  const unreadNotifCount = useAppStore(s => s.unreadNotifCount);
  const currentUser = useAppStore(s => s.currentUser);
  const unreadCounts = useAppStore(s => s.unreadCounts);
  const setPostCreationOpen = useAppStore(s => s.setPostCreationOpen);

  const [showSwitcher, setShowSwitcher] = useState(false);
  const [firstJoinedComm, setFirstJoinedComm] = useState<string | null>(null);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  const collapsed = isMobile ? false : (isTablet ? true : sidebarCollapsed);
  const profileCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser?.id) {
      setFirstJoinedComm(null);
      return;
    }
    const load = async () => {
      const res = await getCommunities(currentUser.id);
      if (res.success && res.communities) {
        const joined = res.communities.find((c: any) => c.isJoined);
        if (joined) {
          setFirstJoinedComm(joined.name);
        } else {
          setFirstJoinedComm(null);
        }
      }
    };
    load();
  }, [currentUser?.id]);

  // Reactive total unread — computed once per render, not inline in JSX
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const isActive = (id: string, href: string) => {
    if (id === 'feed') return pathname === '/feed' || pathname === '/';
    if (id === 'communities') return pathname.startsWith('/communities') || pathname.startsWith('/community/');
    return pathname.startsWith(href);
  };

  return (
    <>
      <motion.aside
        layout
        transition={SPRING}
        className={clsx(
          'flex flex-col h-full flex-shrink-0 relative border-r border-white/[0.04] z-40',
          isMobile ? 'bg-transparent' : 'bg-obsidian-950/45 backdrop-blur-3xl',
          // Width is controlled by CSS var tokens set in globals.css
          // The .app-shell grid controls the column width; this aside fills it
          'w-full'
        )}
      >
        <div className="flex flex-col h-full pt-5 pb-20 md:pb-5 overflow-hidden">
          
          {/* Header Logo & Post Button */}
          <div className={clsx('px-8 mb-6 flex items-center', collapsed && 'justify-center px-0')}>
              <motion.button
                type="button"
                onClick={() => setPostCreationOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-xl bg-transparent hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                title="Create Post"
              >
                <Plus size={18} strokeWidth={2.5} />
              </motion.button>
          </div>

          {/* Navigation sections */}
        <motion.nav 
            variants={navVariants}
            initial="hidden"
            animate="show"
            className="flex-1 px-4 space-y-5 scroll-area hide-scrollbar"
        >
            {SECTIONS.map((section) => (
              <div key={section.title} className="space-y-2">
                {!collapsed && (
                  <motion.h3 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.25em] mb-2"
                  >
                    {section.title}
                  </motion.h3>
                )}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.id, item.href);
                  const targetHref = (item.id === 'communities' && firstJoinedComm)
                    ? `/community/${firstJoinedComm}`
                    : item.href;
                  return (
                    <Link
                      key={item.id}
                      href={targetHref}
                      prefetch={true}
                      onMouseEnter={() => router.prefetch(targetHref)}
                      className="block group"
                    >
                      <motion.div 
                        variants={itemVariants}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={clsx(
                          'flex items-center gap-4 px-5 py-2.5 rounded-full transition-all relative overflow-hidden',
                          active ? 'text-white' : 'text-slate-500 hover:text-white',
                          collapsed && 'justify-center'
                        )}
                      >
                        {active && (
                           <motion.div 
                              layoutId="sidebar-active-bg"
                              className="absolute inset-0 bg-white/[0.05] border border-white/[0.08] shadow-lux-inner rounded-full"
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                           />
                        )}
                        <Icon size={20} strokeWidth={active ? 2.5 : 2} className={clsx("relative z-10 transition-colors", active ? "text-white" : "group-hover:text-slate-200")} />
                        {!collapsed && (
                          <span className={clsx("text-[14px] font-bold relative z-10 whitespace-nowrap tracking-tight font-display", active ? "text-white" : "text-slate-500")}>{item.label}</span>
                        )}
                        {active && (
                          <motion.div 
                             layoutId="sidebar-active-pip"
                             className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white rounded-r-full z-10 shadow-premium" 
                          />
                        )}
                        {item.id === 'messages' && totalUnread > 0 && (
                          <motion.span 
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="absolute top-3 right-3 w-4 h-4 bg-primary rounded-full border-2 border-obsidian-950 z-10 flex items-center justify-center text-[10px] font-black text-white shadow-glow-primary" 
                          >
                            {totalUnread}
                          </motion.span>
                        )}
                        {item.id === 'notifications' && unreadNotifCount > 0 && (
                          <motion.span 
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="absolute top-3 right-3 w-4 h-4 bg-primary rounded-full border-2 border-obsidian-950 z-10 flex items-center justify-center text-[10px] font-black text-white shadow-glow-primary" 
                          >
                            {unreadNotifCount}
                          </motion.span>
                        )}
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            ))}
        </motion.nav>

        {/* Profile Card Mini — clicking opens AccountSwitcher anchored here */}
        <div ref={profileCardRef} className="px-4 mt-auto py-4 flex items-center gap-2 min-h-[70px]">
          <button
            type="button"
            onClick={() => setShowSwitcher(v => !v)}
            className={clsx(
              'flex-1 flex items-center gap-4 p-3 rounded-full hover:bg-white/[0.03] transition-all group relative overflow-hidden text-left',
              collapsed && 'justify-center',
              showSwitcher && 'bg-white/[0.04]'
            )}
          >
            <div className="w-11 h-11 rounded-full overflow-hidden border border-white/[0.04] shadow-soft-depth relative z-10 flex-shrink-0 bg-obsidian-800">
              <motion.img 
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring" }}
                src={getAvatarUrl(currentUser?.username || 'user', currentUser?.avatar)} 
                className="w-full h-full object-cover" 
                alt="me" 
              />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 relative z-10">
                <p className="text-[14px] font-bold text-white truncate leading-tight mb-1 group-hover:text-white transition-colors font-display tracking-tight">{currentUser?.displayName}</p>
                <p className="text-[11px] text-slate-600 truncate font-bold tracking-widest leading-none">@{currentUser?.username}</p>
              </div>
            )}
          </button>
        </div>

        </div>

        {/* Collapse Toggle */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute -right-3.5 top-10 w-7 h-7 rounded-full bg-obsidian-900 border border-white/10 hidden xl:flex items-center justify-center text-slate-500 hover:text-white hover:bg-obsidian-800 transition-all z-50 shadow-premium"
        >
          <motion.div animate={{ rotate: sidebarCollapsed ? 180 : 0 }} transition={SPRING}>
            <ChevronLeft size={16} />
          </motion.div>
        </button>
      </motion.aside>

      <IdentitySwitcher
        isOpen={showSwitcher}
        onClose={() => setShowSwitcher(false)}
        anchorRef={profileCardRef}
      />

      {/* Create Post Modal Overlay */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isCreatePostOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[500] bg-black/85 backdrop-blur-md flex items-center justify-center p-6 cursor-pointer"
              onClick={() => setIsCreatePostOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                transition={SPRING}
                className="w-full max-w-xl bg-[#0c0c0f]/95 border border-white/[0.08] p-6 rounded-[28px] shadow-2xl relative cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsCreatePostOpen(false)}
                  className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all z-50"
                >
                  <X size={16} />
                </button>

                <div className="pt-2">
                  <CreatePost onSuccess={() => setIsCreatePostOpen(false)} />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
