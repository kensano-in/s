'use client';

import React, { useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import RightPanel from '@/components/layout/RightPanel';
import NotifPanel from '@/components/layout/NotifPanel';
import ThemeEngineProvider from '@/components/layout/ThemeEngineProvider';
import AuthProvider from '@/components/layout/AuthProvider';
import MobileDrawer from '@/components/layout/MobileDrawer';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import clsx from 'clsx';
import GlobalRealtimeMonitor from '@/components/layout/GlobalRealtimeMonitor';
import CommandPalette from '@/components/features/command/CommandPalette';
import CommandPaletteListener from '@/components/features/command/CommandPaletteListener';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMessages = pathname.startsWith('/messages');
  const { isMobileDrawerOpen, setMobileDrawerOpen } = useAppStore();

  // Close drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname, setMobileDrawerOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#050505] text-on-surface relative z-0">
      <div className="fixed inset-0 z-[-1] pointer-events-none opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
      <ThemeEngineProvider />
      <AuthProvider />
      <GlobalRealtimeMonitor />
      <CommandPalette />
      <CommandPaletteListener />

      {/* Mobile drawer overlay */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden animate-fade-in"
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
        <Topbar />
        <main className={clsx("flex-1 min-h-0", !isMessages && "overflow-y-auto")}>
          <div className={clsx(isMessages ? "h-full flex flex-col" : "max-w-[680px] mx-auto px-4 py-6")}>
            {children}
          </div>
        </main>
      </div>

      {/* Right panel — desktop only (≥1280px) */}
      {!isMessages && (
        <div className="hidden xl:block flex-shrink-0">
          <RightPanel />
        </div>
      )}

      {/* Notification slide panel */}
      <NotifPanel />
    </div>
  );
}
