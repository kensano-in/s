'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { User, Shield, Bell, Palette, Lock, Database, LifeBuoy, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { SettingsRow } from './components';

export const SETTINGS_SECTIONS = [
    { id: 'account', label: 'Account', icon: User, href: '/settings/account' },
    { id: 'privacy', label: 'Privacy', icon: Shield, href: '/settings/privacy' },
    { id: 'notifications', label: 'Notifications', icon: Bell, href: '/settings/notifications' },
    { id: 'appearance', label: 'Appearance', icon: Palette, href: '/settings/appearance' },
    { id: 'security', label: 'Security', icon: Lock, href: '/settings/security' },
    { id: 'data-storage', label: 'Data & Storage', icon: Database, href: '/settings/data-storage' },
    { id: 'support', label: 'Support', icon: LifeBuoy, href: '/settings/support' },
    { id: 'management', label: 'Account Management', icon: AlertTriangle, href: '/settings/management', destructive: true },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    // A mobile layout check
    const isExactSettingsIndex = pathname === '/settings';

    return (
        <div className="max-w-5xl mx-auto flex w-full lg:py-10 min-h-screen pb-20">
            {/* Sidebar List - Hidden on mobile if viewing a subpage */}
            <aside className={clsx(
                "w-full lg:w-[320px] flex-shrink-0 lg:pr-8 lg:block",
                !isExactSettingsIndex ? 'hidden' : 'block'
            )}>
                <div className="px-4 py-6 lg:py-0">
                    <h1 className="text-2xl font-semibold text-neutral-100 mb-6 lg:mb-8">Settings</h1>
                    <div className="bg-[#0f0f0f] rounded-2xl border border-white/5 overflow-hidden">
                        {SETTINGS_SECTIONS.map((section) => {
                            const Icon = section.icon;
                            const isActive = pathname.startsWith(section.href);
                            return (
                                <Link 
                                    key={section.id} 
                                    href={section.href}
                                    className="block relative"
                                >
                                    <div className={clsx(
                                        "flex items-center justify-between p-4 min-h-[60px] border-b border-white/5 last:border-none transition-colors",
                                        isActive ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                                    )}>
                                        {isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-neutral-200" />}
                                        <div className="flex items-center gap-4">
                                            <Icon size={20} className={section.destructive ? "text-red-500" : (isActive ? "text-neutral-200" : "text-neutral-500")} />
                                            <span className={clsx(
                                                "text-[15px] font-medium",
                                                section.destructive ? "text-red-500" : (isActive ? "text-neutral-200" : "text-neutral-300")
                                            )}>{section.label}</span>
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </aside>

            {/* Subpage Content - Hidden on mobile if at the index */}
            <main className={clsx(
                "flex-1 w-full lg:block lg:pl-8 lg:border-l lg:border-white/5",
                isExactSettingsIndex ? 'hidden' : 'block'
            )}>
                <div className="p-4 lg:p-0">
                    {children}
                </div>
            </main>
        </div>
    );
}
