'use client';

import React, { useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import RightPanel from '@/components/layout/RightPanel';
import NotifPanel from '@/components/layout/NotifPanel';
import { useAppStore } from '@/lib/store';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { theme } = useAppStore();
  const pathname = usePathname();
  const isMessages = pathname.startsWith('/messages');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, [theme]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
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
