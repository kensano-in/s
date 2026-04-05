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

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMessages = pathname.startsWith('/messages');
  const { isMobileDrawerOpen, setMobileDrawerOpen } = useAppStore();

  // Close drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname, setMobileDrawerOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      <ThemeEngineProvider />
      <AuthProvider />
      <GlobalRealtimeMonitor />

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
        <main className={clsx("flex-1", !isMessages && "overflow-y-auto")}>
          <div className={clsx(isMessages ? "h-full" : "max-w-[680px] mx-auto px-4 py-6")}>
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
