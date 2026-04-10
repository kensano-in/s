'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Search, User, Users } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

import { motion } from 'framer-motion';

const TABS = [
  { id: 'home',        label: 'Home',        icon: Home,          href: '/feed' },
  { id: 'explore',     label: 'Explore',     icon: Search,        href: '/explore' },
  { id: 'communities', label: 'Communities', icon: Users,         href: '/communities' },
  { id: 'messages',    label: 'Messages',    icon: MessageCircle, href: '/messages'  },
  { id: 'profile',     label: 'Profile',     icon: User,          href: '/profile'   },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { unreadNotifCount } = useAppStore();

  const isActive = (href: string) => {
    if (href === '/feed') return pathname === '/feed' || pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch bg-[#050505]/90 backdrop-blur-xl border-t border-[#1f1f1f]"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {TABS.map(({ id, label, icon: Icon, href }) => {
        const active = isActive(href);
        const showBadge = id === 'messages' && unreadNotifCount > 0;
        return (
          <Link
            key={id}
            href={href}
            className="flex-1 flex flex-col items-center justify-center pt-3 pb-2 gap-1 relative group active:scale-90 transition-transform duration-micro ease-spring"
          >
            {active && (
              <motion.div
                layoutId="nav-active-glow"
                className="absolute inset-0 top-0 h-[2px] bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            {active && (
              <motion.div
                layoutId="nav-active-bg"
                className="absolute inset-0 bg-gradient-to-t from-transparent to-blue-500/10"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            
            <motion.div 
               className="relative z-10"
               animate={{ scale: active ? 1.15 : 1, y: active ? -2 : 0 }}
               transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <Icon
                size={22}
                className={cn(
                  'transition-all duration-normal ease-spring',
                  active ? 'text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-neutral-500 group-hover:text-neutral-300'
                )}
                strokeWidth={active ? 2.5 : 2}
              />
              {showBadge && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-600 rounded-full border border-[#050505] shadow-glow-primary" />
              )}
            </motion.div>
            <span className={cn(
              'text-[10px] font-medium transition-colors duration-normal ease-spring z-10',
              active ? 'text-blue-500' : 'text-neutral-500'
            )}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
