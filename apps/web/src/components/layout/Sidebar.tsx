'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, MessageCircle, Users, Search, Zap, Bell,
  Settings, ChevronLeft, TrendingUp, Plus, Radio, Activity, Cpu, ShieldCheck, Fingerprint, Ghost, Sparkles, Orbit
} from 'lucide-react';
import KineticIcon from '@/components/ui/KineticIcon';

const NAV_ITEMS = [
  { id: 'feed',          label: 'Home',              sub: 'Activity',          icon: Radio,         href: '/feed'        },
  { id: 'explore',       label: 'Discovery',         sub: 'Explore',           icon: Search,        href: '/explore'     },
  { id: 'messages',      label: 'Messages',          sub: 'Chats',             icon: MessageCircle, href: '/messages'    },
  { id: 'communities',   label: 'Communities',       sub: 'Groups',            icon: Users,         href: '/communities' },
  { id: 'trending',      label: 'Trending',          sub: 'Topics',            icon: Orbit,         href: '/trending'    },
  { id: 'funzone',       label: 'Arcade',            sub: 'Play',              icon: Zap,           href: '/funzone'     }
];

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28, mass: 0.8 };

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar, unreadNotifCount, currentUser } = useAppStore();

  const isActive = (href: string) => {
    if (href === '/feed') return pathname === '/feed' || pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <motion.aside
      layout
      transition={SPRING}
      className={clsx(
        'flex flex-col h-full flex-shrink-0 relative z-40 italic font-medium border-r border-white/5 selection:bg-v-cyan/30',
        sidebarCollapsed ? 'w-[88px]' : 'w-[280px]'
      )}
      style={{ background: 'rgba(5,5,10,0.4)', backdropFilter: 'blur(40px)' }}
    >
      {/* Background HUD Grid */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--white) 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />

      <div className="relative z-10 flex flex-col h-full py-8">
        
        {/* Identity Head */}
        <div className={clsx('flex items-center gap-4 px-6 mb-10 transition-all duration-500', sidebarCollapsed && 'justify-center px-0')}>
            <div className="relative group cursor-pointer" onClick={() => router.push('/feed')}>
                 <div className="w-11 h-11 rounded-[16px] bg-black border border-white/10 flex items-center justify-center text-white font-black text-xl shadow-2xl relative overflow-hidden group-hover:border-v-cyan/50 transition-all duration-500">
                     <KineticIcon icon={Radio} size={20} color="var(--v-cyan)" pulse glow />
                     <div className="absolute inset-0 bg-primary-gradient opacity-0 group-hover:opacity-100 transition-opacity" />
                 </div>
                 {/* Orbital Status Ring */}
                 {!sidebarCollapsed && <div className="absolute -inset-1 border border-v-cyan/10 rounded-[18px] animate-spin-slow opacity-0 group-hover:opacity-100 transition-opacity" />}
            </div>
           {!sidebarCollapsed && (
             <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col">
                <span className="text-xl font-black italic tracking-tighter text-white uppercase leading-none">Verlyn</span>
                <span className="text-[7px] font-black tracking-[0.4em] text-v-cyan uppercase mt-1">Sovereign_OS</span>
             </motion.div>
           )}
        </div>

        {/* Global Broadcast Trigger */}
        <div className={clsx('mb-10 px-4 transition-all duration-500', sidebarCollapsed && 'px-4 flex justify-center')}>
             <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/feed')}
                className={clsx(
                    'bg-primary-gradient text-white flex items-center justify-center gap-3 shadow-[0_15px_40px_rgba(108,99,255,0.3)] group relative overflow-hidden transition-all duration-500',
                    sidebarCollapsed ? 'w-12 h-12 rounded-[18px]' : 'w-full py-5 px-6 rounded-[22px]'
                )}
             >
                <KineticIcon icon={Plus} size={20} color="white" pulse={!sidebarCollapsed} />
                {!sidebarCollapsed && <span className="text-[10px] font-black uppercase tracking-[0.2em] relative z-10">Neural Broadcast</span>}
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
             </motion.button>
        </div>

        {/* Primary Neural Paths */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto hide-scrollbar">
            {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                    <Link key={item.id} href={item.href} className="block group">
                        <motion.div 
                            className={clsx(
                                'flex items-center gap-5 px-4 py-3.5 rounded-[20px] transition-all duration-500 relative overflow-hidden',
                                active ? 'bg-white/5 text-white' : 'text-on-surface-variant/40 hover:text-white',
                                sidebarCollapsed && 'justify-center px-0'
                            )}
                        >
                             <div className={clsx('relative z-10 p-0.5 transition-all duration-500', active && 'text-v-cyan scale-110')}>
                                 <KineticIcon 
                                    icon={Icon} 
                                    size={20} 
                                    active={active} 
                                    pulse={active}
                                    color={active ? 'var(--v-cyan)' : 'currentColor'} 
                                 />
                                 {item.id === 'messages' && unreadNotifCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-v-cyan rounded-full border-2 border-black" />}
                             </div>
                             
                             {!sidebarCollapsed && (
                                <div className="flex flex-col text-left">
                                    <span className={clsx('text-[13px] font-black uppercase tracking-widest relative z-10 transition-all duration-500', active ? 'opacity-100' : 'opacity-40 group-hover:opacity-100')}>
                                        {item.label}
                                    </span>
                                    <span className={clsx('text-[8px] font-black uppercase tracking-[0.4em] opacity-0 group-hover:opacity-40 transition-all transform translate-x-[-10px] group-hover:translate-x-0', active ? 'text-v-cyan opacity-40' : 'text-on-surface-variant')}>
                                        {item.sub}
                                    </span>
                                </div>
                             )}

                            {active && <motion.div layoutId="sidebar-active" className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-v-cyan rounded-full shadow-[0_0_15px_var(--v-cyan)]" />}
                        </motion.div>
                    </Link>
                )
            })}
        </nav>

        {/* Operational Terminals */}
        <div className="px-4 pt-6 border-t border-white/5 space-y-2">
            <SidebarAction icon={Settings} label="Terminals & Meta" href="/settings" active={isActive('/settings')} collapsed={sidebarCollapsed} />
            <SidebarAction 
               icon={Bell} 
               label="Signal Alerts" 
               onClick={() => {}} 
               badge={unreadNotifCount > 0} 
               collapsed={sidebarCollapsed} 
            />
        </div>

        {/* Identity Token Card */}
        <div className={clsx('px-4 mt-8', sidebarCollapsed && 'px-4 flex justify-center')}>
             <Link href="/profile" className={clsx(
                 'flex items-center gap-4 p-3 rounded-[24px] bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all transition-all duration-500 group overflow-hidden relative',
                 sidebarCollapsed ? 'w-12 h-12 justify-center' : 'w-full'
             )}>
                <div className="absolute inset-0 bg-v-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                
                <div className="relative flex-shrink-0">
                    <img 
                        src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=me`} 
                        className="w-8 h-8 rounded-[12px] object-cover border border-white/10 group-hover:scale-110 transition-transform" 
                        alt="me" 
                    />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-v-emerald rounded-full border-2 border-black animate-pulse" />
                </div>

                {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0 flex flex-col justify-center relative z-10">
                         <span className="text-[11px] font-black text-white uppercase tracking-tighter truncate leading-none mb-1 group-hover:text-v-cyan transition-colors">{currentUser?.displayName}</span>
                         <div className="flex items-center gap-1.5 opacity-40">
                             <Fingerprint size={8} />
                             <span className="text-[8px] font-black uppercase tracking-widest truncate">@{currentUser?.username}</span>
                         </div>
                    </div>
                )}
             </Link>
        </div>

      </div>

      {/* Pulse Toggle */}
      <motion.button
        transition={SPRING}
        onClick={toggleSidebar}
        className="absolute -right-3 top-24 w-6 h-6 rounded-lg bg-black border border-white/10 flex items-center justify-center hover:bg-v-cyan hover:text-black text-on-surface-variant transition-colors z-50 shadow-xl"
      >
        <motion.div animate={{ rotate: sidebarCollapsed ? 180 : 0 }} transition={SPRING}>
          <ChevronLeft size={14} />
        </motion.div>
      </motion.button>
    </motion.aside>
  );
}

function SidebarAction({ icon: Icon, label, href, active, onClick, badge, collapsed }: any) {
    const Component = href ? Link : 'button';
    return (
        <Component href={href || '#'} onClick={onClick} className={clsx(
            'flex items-center gap-5 px-4 py-3.5 rounded-[20px] transition-all duration-500 group',
            active ? 'bg-white/5 text-v-cyan' : 'text-on-surface-variant/40 hover:text-white',
            collapsed && 'justify-center px-0'
        )}>
            <div className="relative">
                <KineticIcon icon={Icon} size={18} active={active} pulse={active} color={active ? 'var(--v-cyan)' : 'currentColor'} />
                {badge && <span className="absolute -top-1 -right-1 w-2 h-2 bg-v-cyan rounded-full shadow-[0_0_8px_var(--v-cyan)]" />}
            </div>
            {!collapsed && <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>}
        </Component>
    )
}
