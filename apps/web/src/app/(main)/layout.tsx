'use client';

import React, { useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import RightPanel from '@/components/layout/RightPanel';
import NotifPanel from '@/components/layout/NotifPanel';
import ThemeEngineProvider from '@/components/layout/ThemeEngineProvider';
import AuthProvider from '@/components/layout/AuthProvider';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMessages = pathname.startsWith('/messages');

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      <ThemeEngineProvider />
      <AuthProvider />
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className={clsx("flex-1", !isMessages && "overflow-y-auto")}>
          <div className={clsx(isMessages ? "h-full" : "max-w-[680px] mx-auto px-4 py-6")}>
            {children}
          </div>
        </main>
      </div>

      {/* Right panel (desktop only) */}
      {!isMessages && <RightPanel />}

      {/* Notification slide panel */}
      <NotifPanel />
    </div>
  );
}
