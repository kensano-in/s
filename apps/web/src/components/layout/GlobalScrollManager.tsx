'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function GlobalScrollManager() {
  const pathname = usePathname();

  useEffect(() => {
    // List of routes that represent the viewport-gated desktop-like app shell
    const APP_ROUTES = [
      '/feed',
      '/messages',
      '/communities',
      '/community',
      '/profile',
      '/settings',
      '/notifications',
      '/trending',
      '/explore',
      '/arcade',
      '/badges',
      '/shadowsession'
    ];

    const isAppRoute = APP_ROUTES.some(route => 
      pathname === route || pathname.startsWith(route + '/')
    );

    if (isAppRoute) {
      // The app shell requires overflow hidden on html/body to prevent double scrollbars
      document.documentElement.style.removeProperty('overflow');
      document.body.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('overflow-x');
      document.body.style.removeProperty('overflow-x');
    } else {
      // Public landing pages, status pages, and documents need normal scrolling
      document.documentElement.style.setProperty('overflow', 'auto', 'important');
      document.body.style.setProperty('overflow', 'auto', 'important');
      document.documentElement.style.setProperty('overflow-x', 'hidden', 'important');
      document.body.style.setProperty('overflow-x', 'hidden', 'important');
    }
  }, [pathname]);

  return null;
}
