import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import 'flag-icons/css/flag-icons.min.css';
import ConnectionStatus from '@/components/layout/ConnectionStatus';
import { Plus_Jakarta_Sans, Inter } from 'next/font/google';

// Fonts are self-hosted by Next.js — zero external network requests, preloaded, FOIT-free
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
  preload: true,
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});


export const metadata: Metadata = {
  title: {
    default: 'Verlyn — The Unified Social Ecosystem',
    template: '%s | Verlyn',
  },
  description: 'Verlyn is a next-generation social platform unifying real-time messaging, communities, content, and live audio. Secure, fast, and beautifully crafted.',
  keywords: ['social media', 'messaging', 'communities', 'end-to-end encryption', 'real-time', 'verlyn'],
  authors: [{ name: 'Verlyn', url: 'https://verlyn.in' }],
  creator: 'Verlyn',
  publisher: 'Verlyn',
  metadataBase: new URL('https://verlyn.in'),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' }
    ],
    apple: '/fallback-avatar.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://verlyn.in',
    siteName: 'Verlyn',
    title: 'Verlyn — The Unified Social Ecosystem',
    description: 'The next-generation social platform. Secure, real-time, and beautifully crafted.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Verlyn — The Unified Social Ecosystem',
    creator: '@Shinichirofr',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#6C63FF',
  width: 'device-width',
  initialScale: 1,
};

import QueryProvider from '@/components/providers/QueryProvider';
import VitalsCollector from '@/components/instrumentation/VitalsCollector';
import EmojiExplosion from '@/components/ui/EmojiExplosion';
import SecurityShield from '@/components/coming-soon/SecurityShield';
import GlobalScrollManager from '@/components/layout/GlobalScrollManager';
import ForensicMonitor from '@/components/instrumentation/ForensicMonitor';

import InAppConsoleBox from '@/components/ui/InAppConsoleBox';
import ErudaConsole from '@/components/ui/ErudaConsole';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${plusJakartaSans.variable} ${inter.variable}`} data-theme="midnight" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  window.addEventListener('error',function(e){if((e.message&&(e.message.indexOf('ethereum')!==-1||e.message.indexOf('defineProperty')!==-1||e.message.indexOf('evmMask')!==-1))||(e.filename&&e.filename.indexOf('chrome-extension')!==-1)){e.stopImmediatePropagation();e.preventDefault();}},true);
  window.addEventListener('unhandledrejection',function(e){if(e.reason&&e.reason.stack&&e.reason.stack.indexOf('chrome-extension')!==-1){e.stopImmediatePropagation();e.preventDefault();}},true);
  var BK='verlyn_dev_bypass';
  function bp(){try{return localStorage.getItem(BK)==='true';}catch(e){return false;}}
  try{var p=new URLSearchParams(window.location.search),dm=p.get('dev_mode');if(dm==='lock'){localStorage.removeItem(BK);window.location.href=window.location.pathname;}else if(dm){(async function(){var mb=new TextEncoder().encode(dm),hb=await crypto.subtle.digest('SHA-256',mb),ha=Array.from(new Uint8Array(hb)),hx=ha.map(function(b){return b.toString(16).padStart(2,'0');}).join('');if(hx==='56e070ea348c1db1a7819f9cb3378def986fd91b97b1772a81bd79a5e73dd50b'){localStorage.setItem(BK,'true');window.location.href=window.location.pathname;}})();}}catch(e){}
  try{if(window.self!==window.top){window.top.location=window.self.location;}}catch(e){}
  try{var s=document.createElement('style');s.textContent='@media print{body{display:none!important;}}';document.head.appendChild(s);}catch(e){}
  document.addEventListener('contextmenu',function(e){if(bp())return;e.preventDefault();},true);
  document.addEventListener('keydown',function(e){if(bp())return;if(e.keyCode===123){e.preventDefault();return false;}var ii=(e.ctrlKey&&e.shiftKey)||(e.metaKey&&e.altKey);if(ii&&(e.keyCode===73||e.keyCode===74||e.keyCode===67||e.keyCode===75)){e.preventDefault();return false;}if(e.ctrlKey&&e.keyCode===85){e.preventDefault();return false;}if((e.ctrlKey||e.metaKey)&&e.keyCode===83){e.preventDefault();return false;}if((e.ctrlKey||e.metaKey)&&e.keyCode===80){e.preventDefault();return false;}},true);
  document.addEventListener('dragstart',function(e){if(bp())return;if(e.target&&e.target.tagName==='IMG'){e.preventDefault();}},true);
})();`
          }}
        />
      </head>
      <body className="antialiased font-main bg-[#050508]" suppressHydrationWarning>
        <QueryProvider>
          <Suspense fallback={null}>
            <ForensicMonitor />
          </Suspense>
          <GlobalScrollManager />
          <SecurityShield />
          <VitalsCollector />
          <ConnectionStatus />
          {children}
          <InAppConsoleBox />
          <ErudaConsole />
        </QueryProvider>
      </body>
    </html>
  );
}
