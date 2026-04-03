import type { Metadata, Viewport } from 'next';
import './globals.css';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" data-theme="midnight" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
