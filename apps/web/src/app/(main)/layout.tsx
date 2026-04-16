'use client';

import React, { useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import RightPanel from '@/components/layout/RightPanel';
import NotifPanel from '@/components/layout/NotifPanel';
import AuthProvider from '@/components/layout/AuthProvider';
import MobileDrawer from '@/components/layout/MobileDrawer';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import clsx from 'clsx';
import GlobalRealtimeMonitor from '@/components/layout/GlobalRealtimeMonitor';
import CommandPalette from '@/components/features/command/CommandPalette';
import CommandPaletteListener from '@/components/features/command/CommandPaletteListener';
import SystemBootstrap from '@/components/layout/SystemBootstrap';
import OnboardingPortal from '@/components/features/onboarding/OnboardingPortal';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMessages = pathname.startsWith('/messages');
  const { isMobileDrawerOpen, setMobileDrawerOpen } = useAppStore();

  // Close drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname, setMobileDrawerOpen]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#0A0A0A] text-white relative z-0">
      <AuthProvider />
      <GlobalRealtimeMonitor />
      <SystemBootstrap />
      <OnboardingPortal />
      <CommandPalette />
      <CommandPaletteListener />

      {/* Mobile drawer overlay */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 md:hidden transition-opacity"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <MobileDrawer />

      {/* Left Sidebar — hidden on mobile */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Hide topbar on messages on mobile — ChatHeader replaces it */}
        <div className={clsx(isMessages && 'hidden md:block')}>
          <Topbar />
        </div>
        <main className={clsx('flex-1 min-h-0', !isMessages && 'overflow-y-auto')}>
          <div className={clsx(
            isMessages ? 'h-full flex flex-col' : 'max-w-[1200px] mx-auto px-4 py-0 md:py-6',
            !isMessages && 'pb-16 md:pb-0'  /* space for mobile bottom nav */
          )}>
            {children}
          </div>
        </main>
      </div>

      {/* Right panel — desktop only (≥1280px) */}
      {!isMessages && (
        <div className="hidden xl:block flex-shrink-0 w-80">
          <RightPanel />
        </div>
      )}

      {/* Notification slide panel */}
      <NotifPanel />

      {/* Mobile bottom navigation */}
      <MobileBottomNav />
    </div>
  );
}
