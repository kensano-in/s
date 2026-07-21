'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import CommandPalette from './CommandPalette';

export default function CommandPaletteWrapper() {
  const pathname = usePathname();
  
  if (!pathname) return null;

  // Only render the coming-soon command palette on public landing/support pages
  const isLandingPage = pathname === '/' || 
                        pathname === '/coming-soon' || 
                        pathname === '/verify' || 
                        pathname === '/support' || 
                        pathname === '/terms' || 
                        pathname === '/privacy' || 
                        pathname === '/trust-center' || 
                        pathname === '/access-model' || 
                        pathname === '/status' || 
                        pathname === '/agreements' || 
                        pathname === '/help' || 
                        pathname === '/report' || 
                        pathname === '/security' || 
                        pathname === '/shadowsession' || 
                        pathname === '/transparency' || 
                        pathname === '/whitepaper' ||
                        pathname.startsWith('/shadowsession/');

  if (!isLandingPage) return null;
  return <CommandPalette />;
}
