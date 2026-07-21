'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    ChevronLeft, 
    Search, 
    ChevronDown, 
    ChevronUp, 
    Command,
    Compass
} from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '@/lib/store';
import { SettingsSearch } from './components';
import { SETTINGS_REGISTRY, searchSettings, SettingsGroup, SettingsRoute } from './registry';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvatarUrl } from '@/lib/utils';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const currentUser = useAppStore(s => s.currentUser);
    
    const [searchQuery, setSearchQuery] = useState('');
    // Persist which accordion groups are expanded in sidebar
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        your_account: true,
        how_you_use: true,
    });

    const isExactSettingsIndex = pathname === '/settings';

    // Keyboard navigation helper
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '/' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                document.querySelector('input[placeholder*="Search parameters"]') instanceof HTMLInputElement && 
                (document.querySelector('input[placeholder*="Search parameters"]') as HTMLInputElement).focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    // Filters routes dynamically using search indexing
    const filteredRoutes = searchSettings(searchQuery);

    // Get current active route from path
    const activeRoute = SETTINGS_REGISTRY.flatMap(g => g.routes).find(r => pathname.startsWith(r.href));
    const activeSectionLabel = activeRoute ? activeRoute.label : 'Verlyn Settings';

    return (
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row w-full pt-5 md:pt-6 lg:py-6 pb-20 md:pb-10 px-4 sm:px-6 lg:px-8">
            
            {/* LEFT SIDEBAR - Accounts Center Nav Drawer */}
            <aside className={clsx(
                "w-full lg:w-[360px] flex-shrink-0 lg:pr-8 lg:block",
                !isExactSettingsIndex ? 'hidden' : 'block'
            )}>
                <div className="lg:sticky lg:top-6 space-y-6">
                    
                    {/* Unified Multi-Profile Identity Swapper Node */}
                    <div 
                        onClick={() => router.push('/settings/management')}
                        className="p-4 bg-[#0A0A0A] border border-white/5 hover:border-white/10 rounded-2xl flex items-center gap-3.5 transition-all duration-200 cursor-pointer group shadow-[0_4px_20px_rgba(0,0,0,0.3)] relative overflow-hidden"
                    >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-900 border border-white/10 relative shrink-0">
                            <img 
                                src={getAvatarUrl(currentUser?.username || 'user', currentUser?.avatar)} 
                                alt="User Avatar" 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-[14px] font-bold text-neutral-100 truncate group-hover:text-white transition-colors">
                                {currentUser?.displayName || 'Verlyn Member'}
                            </h4>
                            <p className="text-[12px] text-neutral-500 truncate mt-0.5">@{currentUser?.username || 'member'}</p>
                        </div>
                        <div className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-extrabold uppercase tracking-tight flex-shrink-0">
                            Profiles
                        </div>
                    </div>

                    {/* Search Field widget */}
                    <div className="relative">
                        <SettingsSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search preferences... (Ctrl + /)" />
                    </div>

                    {/* Navigation tree */}
                    <nav className="space-y-4">
                        {searchQuery.trim() !== '' ? (
                            // Search View
                            <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 overflow-hidden">
                                <div className="px-4 py-3 bg-white/[0.02] border-b border-white/5">
                                    <span className="text-[11px] font-extrabold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Command size={11} /> Search Match Results
                                    </span>
                                </div>
                                {filteredRoutes.length === 0 ? (
                                    <div className="p-8 text-center text-[13px] text-neutral-500 leading-normal">
                                        No settings parameters matched "{searchQuery}"
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {filteredRoutes.map((route) => {
                                            const Icon = route.icon;
                                            const isActive = pathname.startsWith(route.href);
                                            return (
                                                <Link key={route.id} href={route.href} className="block relative group">
                                                    <div className={clsx(
                                                        "flex items-center gap-3.5 p-4 transition-colors",
                                                        isActive ? "bg-white/[0.04]" : "hover:bg-white/[0.01]"
                                                    )}>
                                                        {isActive && (
                                                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500" />
                                                        )}
                                                        <div className={clsx(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/5",
                                                            isActive ? "bg-blue-500/10 text-blue-400" : "bg-neutral-900 text-neutral-400"
                                                        )}>
                                                            <Icon size={15} />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className={clsx(
                                                                    "text-[13px] font-bold block",
                                                                    route.destructive ? "text-red-400" : "text-neutral-200"
                                                                )}>{route.label}</span>
                                                                {route.comingSoon && (
                                                                    <span className="text-[8px] font-extrabold tracking-widest uppercase px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/5 text-neutral-500 shrink-0 select-none">
                                                                        Soon
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[11px] text-neutral-500 block truncate mt-0.5 font-medium leading-none">
                                                                {route.subtitle}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Category Accordion Groups
                            SETTINGS_REGISTRY.map((group) => {
                                const isExpanded = expandedGroups[group.id];
                                return (
                                    <div key={group.id} className="bg-[#0A0A0A] rounded-2xl border border-white/5 overflow-hidden">
                                        {/* Header */}
                                        <button 
                                            type="button"
                                            onClick={() => toggleGroup(group.id)}
                                            className="w-full px-4 py-3.5 bg-white/[0.01] hover:bg-white/[0.02] flex items-center justify-between border-b border-white/5 text-left transition-colors"
                                        >
                                            <span className="text-[11px] font-extrabold text-neutral-400 uppercase tracking-[0.1em] select-none">
                                                {group.title}
                                            </span>
                                            {isExpanded ? (
                                                <ChevronUp size={14} className="text-neutral-500" />
                                            ) : (
                                                <ChevronDown size={14} className="text-neutral-500" />
                                            )}
                                        </button>

                                        {/* Nested Accordion Children */}
                                        <AnimatePresence initial={false}>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: "auto" }}
                                                    exit={{ height: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden divide-y divide-white/5"
                                                >
                                                    {group.routes.map((route) => {
                                                        const Icon = route.icon;
                                                        const isActive = pathname.startsWith(route.href);
                                                        return (
                                                            <Link key={route.id} href={route.href} className="block relative group">
                                                                <div className={clsx(
                                                                    "flex items-center justify-between p-4 transition-colors",
                                                                    isActive ? "bg-white/[0.03]" : "hover:bg-white/[0.01]"
                                                                )}>
                                                                    {isActive && (
                                                                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500" />
                                                                    )}
                                                                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                                                        <div className={clsx(
                                                                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/5 transition-colors",
                                                                            isActive ? "bg-blue-500/10 text-blue-400 border-blue-500/15" : "bg-neutral-900 text-neutral-400 group-hover:text-neutral-300"
                                                                        )}>
                                                                            <Icon size={15} />
                                                                        </div>
                                                                         <div className="min-w-0 flex-1">
                                                                            <div className="flex items-center justify-between gap-2">
                                                                                <span className={clsx(
                                                                                    "text-[13px] font-bold block transition-colors",
                                                                                    route.destructive 
                                                                                        ? "text-red-400 group-hover:text-red-300" 
                                                                                        : (isActive ? "text-white" : "text-neutral-300 group-hover:text-neutral-200")
                                                                                )}>{route.label}</span>
                                                                                {route.comingSoon && (
                                                                                    <span className="text-[8px] font-extrabold tracking-widest uppercase px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/5 text-neutral-500 shrink-0 select-none">
                                                                                        Soon
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <span className="text-[11px] text-neutral-500 block truncate mt-0.5 font-medium leading-none">
                                                                                {route.subtitle}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        );
                                                    })}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })
                        )}
                    </nav>
                </div>
            </aside>

            {/* RIGHT CONTENT PANEL */}
            <section className={clsx(
                "flex-1 w-full lg:block lg:pl-10 lg:border-l lg:border-white/5",
                isExactSettingsIndex ? 'hidden' : 'block'
            )}>
                {/* Mobile Subpage Sticky Header with Navigation drawer triggers */}
                {!isExactSettingsIndex && (
                    <div className="flex items-center gap-3 py-3 px-4 border-b border-white/5 bg-[#080808]/90 backdrop-blur-md sticky top-0 z-30 lg:hidden mb-5 -mx-4">
                        <Link 
                            href="/settings" 
                            className="p-2 -ml-2 rounded-full hover:bg-white/5 text-neutral-400 hover:text-white transition-colors border border-transparent active:scale-95"
                        >
                            <ChevronLeft size={20} />
                        </Link>
                        <span className="text-[13px] font-black text-white uppercase tracking-wider">{activeSectionLabel}</span>
                    </div>
                )}
                
                <div className="w-full">
                    {activeRoute?.comingSoon ? (
                        <ComingSoonPanel route={activeRoute} />
                    ) : (
                        children
                    )}
                </div>
            </section>
        </div>
    );
}

// ─── COMING SOON SECTION PLACEHOLDER ──────────────────────────────────────────
import { Timer, Hammer, Lock, Bell, Shield, LifeBuoy, AlertCircle } from 'lucide-react';

function ComingSoonPanel({ route }: { route: SettingsRoute }) {
    const Icon = route.icon;
    const [notified, setNotified] = useState(false);
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="w-full max-w-2xl mx-auto py-16 px-6 flex flex-col items-center text-center select-none"
        >
            {/* Holographic Glowing Icon Frame */}
            <div className="relative mb-8">
                {/* Clean, soft ambient glow */}
                <div className="absolute -inset-8 rounded-full bg-white/[0.02] blur-2xl pointer-events-none" />
                
                {/* stacked card effect representing pipeline / modules */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                    {/* Back card (stacked) */}
                    <div className="absolute inset-0 rounded-2xl bg-white/[0.01] rotate-6 scale-95 translate-y-1" />
                    {/* Front card */}
                    <div className="absolute inset-0 rounded-2xl bg-[#09090B] flex items-center justify-center text-neutral-200 shadow-[0_12px_40px_rgba(0,0,0,0.8)] relative z-10">
                        <Icon size={32} className="text-white/80" />
                    </div>
                </div>
            </div>

            {/* Coming Soon status badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] text-white/60 text-[10px] font-black uppercase tracking-widest mb-6">
                <Timer size={11} className="shrink-0" /> Coming Soon
            </div>

            {/* Title / Description */}
            <h2 className="text-2xl font-black text-white tracking-tight mb-3">
                {route.label}
            </h2>

            <p className="text-[13px] text-neutral-400 max-w-md leading-relaxed mb-10 font-medium">
                This section is currently in active development. You will be able to manage settings related to <span className="text-white font-bold">{route.subtitle.toLowerCase()}</span> once it goes live.
            </p>

            {/* Mock Interactive Switch */}
            <div className="w-full bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 mb-12 max-w-md text-left flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <h4 className="text-[13px] font-bold text-neutral-200">Notify me when live</h4>
                    <p className="text-[11px] text-neutral-500 mt-1 leading-normal font-medium">Get an inbox alert as soon as this section is deployed.</p>
                </div>
                <button
                    type="button"
                    onClick={() => setNotified(!notified)}
                    className={clsx(
                        "w-12 h-6 rounded-full p-1 transition-all duration-300 relative shrink-0",
                        notified ? "bg-white" : "bg-neutral-800"
                    )}
                >
                    <motion.div 
                        layout
                        className={clsx("w-4 h-4 rounded-full shadow-md", notified ? "bg-black" : "bg-white")}
                        animate={{ x: notified ? 24 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                </button>
            </div>

            {/* Quick Navigation Links */}
            <div className="w-full max-w-md text-left border-t border-white/5 pt-8">
                <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-4">
                    Active settings hubs
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: 'Security & Logins', icon: Lock, href: '/settings/security', color: 'text-indigo-400 bg-indigo-500/5 border-indigo-500/10 hover:border-indigo-500/20' },
                        { label: 'Account Privacy', icon: Shield, href: '/settings/privacy', color: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/20' },
                        { label: 'Notifications', icon: Bell, href: '/settings/notifications', color: 'text-amber-400 bg-amber-500/5 border-amber-500/10 hover:border-amber-500/20' },
                        { label: 'Help Center', icon: LifeBuoy, href: '/settings/support', color: 'text-rose-400 bg-rose-500/5 border-rose-500/10 hover:border-rose-500/20' }
                    ].map((item, idx) => {
                        const ItemIcon = item.icon;
                        return (
                            <Link 
                                key={idx} 
                                href={item.href}
                                className={clsx(
                                    "flex items-center gap-3 p-3 rounded-xl border hover:bg-white/[0.02] hover:border-white/10 transition-all duration-200 group/item",
                                    item.color
                                )}
                            >
                                <ItemIcon size={14} className="shrink-0" />
                                <span className="text-[12px] font-bold text-neutral-200 truncate group-hover/item:text-white">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
}
