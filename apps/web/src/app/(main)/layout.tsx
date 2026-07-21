'use client';

import React, { useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import AuthProvider from '@/components/layout/AuthProvider';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import clsx from 'clsx';
import GlobalRealtimeMonitor from '@/components/layout/GlobalRealtimeMonitor';
import SystemBootstrap from '@/components/layout/SystemBootstrap';
import CallProvider from '@/components/layout/CallProvider';
import dynamicImport from 'next/dynamic';
import BackgroundPostUploader from '@/components/features/feed/BackgroundPostUploader';
import { AnimatePresence } from 'framer-motion';
import { checkMyDetailedRestrictionsDB } from '@/app/(main)/messages/actions';

// ── Deferred layout modules (not needed on first paint) ──────────────────────
const RightPanel = dynamicImport(() => import('@/components/layout/RightPanel'), { ssr: false });
const NotifPanel = dynamicImport(() => import('@/components/layout/NotifPanel'), { ssr: false });
const MobileDrawer = dynamicImport(() => import('@/components/layout/MobileDrawer'), { ssr: false });
const CommandPalette = dynamicImport(() => import('@/components/features/command/CommandPalette'), { ssr: false });
const CommandPaletteListener = dynamicImport(() => import('@/components/features/command/CommandPaletteListener'), { ssr: false });
const OnboardingPortal = dynamicImport(() => import('@/components/features/onboarding/OnboardingPortal'), { ssr: false });
const PostCreationExperience = dynamicImport(() => import('@/components/features/feed/PostCreationExperience'), { ssr: false });

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname   = usePathname();
  const isMessages = pathname.startsWith('/messages');
  const isCommunities = pathname.startsWith('/communities') || pathname.startsWith('/community');
  const isSettings = pathname.startsWith('/settings');
  const isFullscreenApp = isMessages || isCommunities;
  const hasRightPanel = pathname.startsWith('/explore');
  const isDeepChat = isMessages && pathname.length > 10;
  const isMobileDrawerOpen = useAppStore(s => s.isMobileDrawerOpen);
  const setMobileDrawerOpen = useAppStore(s => s.setMobileDrawerOpen);
  const sidebarCollapsed = useAppStore(s => s.sidebarCollapsed);
  const breakpoint = useAppStore(s => s.breakpoint);
  const wsStatus = useAppStore(s => s.wsStatus);
  const isPostCreationOpen = useAppStore(s => s.isPostCreationOpen);
  const currentUser = useAppStore(s => s.currentUser);
  const isAuthLoading = useAppStore(s => s.isAuthLoading);
  const _hasHydrated = useAppStore(s => s._hasHydrated);

  // Mount the ResizeObserver-based breakpoint tracker once at the shell level
  useBreakpoint();

  const isMobile  = breakpoint === 'mobile';
  const isTablet  = breakpoint === 'tablet';
  const isDesktop = breakpoint === 'desktop';

  const [isSuspended, setIsSuspended] = React.useState(false);
  const [suspensionReason, setSuspensionReason] = React.useState('');
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    async function checkSuspension() {
      const res = await checkMyDetailedRestrictionsDB();
      if (res.success && res.data) {
        if (res.data.needsManualReview) {
          setIsSuspended(true);
          setSuspensionReason('Your account has been fully suspended and is currently under manual safety review due to severe community standards violations.');
        } else {
          const hasFullSuspension = res.data.activeRestrictions?.some(
            (r: any) => r.restriction_type === 'suspension'
          ) || res.data.offenseCount >= 5;
          if (hasFullSuspension) {
            setIsSuspended(true);
            setSuspensionReason('Your account has been permanently suspended after exceeding the maximum limit of safety strikes.');
          }
        }
      }
    }
    checkSuspension();
    const interval = setInterval(checkSuspension, 5 * 60 * 1000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Close drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname, setMobileDrawerOpen]);

  // ── Shell class computation ─────────────────────────────────────────────────
  const shellClasses = clsx(
    'app-shell',
    isDesktop && hasRightPanel && 'has-right-panel',
    isTablet && !sidebarCollapsed && 'sidebar-collapsed',
    isMobile && 'sidebar-hidden',
    isDesktop && sidebarCollapsed && 'sidebar-collapsed',
    isMessages && 'is-messages',
    isPostCreationOpen && 'blur-xl scale-[0.98] pointer-events-none transition-all duration-500'
  );

  const showTopbar = !isMessages;
  const showSplash = !mounted || (isAuthLoading && !currentUser);

  return (
    <>
      <AuthProvider />

      {/* ── Splash / Loading Screen ─────────────────────────────────────────── */}
      {showSplash && (
        <div 
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#000000] text-white select-none"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000000',
            color: '#ffffff',
            userSelect: 'none'
          }}
        >
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes logoDraw {
              0% {
                stroke-dashoffset: 200;
                filter: drop-shadow(0 0 6px rgba(124, 58, 237, 0.45));
              }
              50% {
                stroke-dashoffset: 0;
                filter: drop-shadow(0 0 22px rgba(139, 92, 246, 0.95));
              }
              100% {
                stroke-dashoffset: 200;
                filter: drop-shadow(0 0 6px rgba(124, 58, 237, 0.45));
              }
            }
          `}} />
          
          <div className="flex flex-col items-center gap-5">
            <div 
              className="relative w-20 h-20 flex items-center justify-center"
              style={{
                position: 'relative',
                width: '80px',
                height: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div 
                className="absolute -inset-4 bg-violet-600/15 rounded-full blur-xl animate-pulse"
                style={{
                  position: 'absolute',
                  top: '-16px',
                  left: '-16px',
                  right: '-16px',
                  bottom: '-16px',
                  backgroundColor: 'rgba(124, 58, 237, 0.15)',
                  borderRadius: '9999px',
                  filter: 'blur(24px)'
                }}
              />
              
              <svg 
                width="56"
                height="56"
                className="w-14 h-14 relative z-10 overflow-visible" 
                viewBox="0 0 100 100" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  width: '56px',
                  height: '56px',
                  position: 'relative',
                  zIndex: 10,
                  overflow: 'visible'
                }}
              >
                <path 
                  d="M22 24 L50 78 L78 24" 
                  stroke="url(#v-gradient)" 
                  strokeWidth="13" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 200,
                    animation: 'logoDraw 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite alternate'
                  }}
                />
                <defs>
                  <linearGradient id="v-gradient" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="50%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#4c1d95" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* ── Account Suspension Screen ──────────────────────────────────────── */}
      {!showSplash && isSuspended && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-[#09090f] text-white">
          <div className="relative w-full max-w-lg p-8 bg-[#13131c]/90 border border-red-500/25 rounded-3xl shadow-2xl text-center space-y-6 backdrop-blur-xl">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-pulse">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-white font-serif">Account Fully Suspended</h2>
              <p className="text-xs text-red-400 font-extrabold uppercase tracking-widest">Guideline Violation Enforcement</p>
            </div>

            <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl text-sm text-neutral-300 leading-relaxed text-left space-y-3">
              <p>{suspensionReason}</p>
              <p className="text-xs text-neutral-500 font-medium">
                We enforce safety rules to keep our community helpful and respectful. Access to direct messages, posts, comments, likes, reactions, and communities has been permanently revoked.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-4">
              <a
                href="https://verlyn.in/support"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-extrabold rounded-2xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Submit Appeal
              </a>
              <button
                onClick={async () => {
                  const { createClient } = await import('@/lib/supabase/client');
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                }}
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 active:scale-95 text-neutral-300 font-extrabold rounded-2xl text-sm transition-all border border-white/5"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Full Application Shell ───────────────────────────────────────────── */}
      {!showSplash && !isSuspended && (
        <CallProvider>
          <div
            className={shellClasses}
            style={isMessages ? { '--sidebar-w': '0px' } as React.CSSProperties : undefined}
            data-connection={wsStatus}
            data-breakpoint={breakpoint}
          >
            <GlobalRealtimeMonitor />
            <SystemBootstrap />

            <OnboardingPortal />
            <CommandPalette />
            <CommandPaletteListener />

            <MobileDrawer />

            {!isMessages && (
              <div className="app-sidebar-container hidden md:block h-full">
                <Sidebar />
              </div>
            )}

            <div className="content-container min-w-0">
              {showTopbar && <Topbar />}

              <main className={clsx(
                'flex-1 min-h-0',
                isFullscreenApp ? 'flex flex-col overflow-hidden' : 'page-scroll',
              )}>
                <div className={clsx(
                  isFullscreenApp ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : isSettings ? 'w-full' : 'max-w-[1200px] mx-auto px-4 py-0 md:py-6',
                  !isFullscreenApp && !isDeepChat && !isSettings && 'pb-16 md:pb-0',
                )}>
                  {children}
                </div>
              </main>
            </div>

            {hasRightPanel && (
              <div className="app-right-panel-container hidden xl:flex flex-col h-full overflow-hidden">
                <RightPanel />
              </div>
            )}

            <NotifPanel />

            {!isMessages && <MobileBottomNav />}
          </div>
          
          <AnimatePresence>
            {isPostCreationOpen && <PostCreationExperience />}
          </AnimatePresence>

          <BackgroundPostUploader />
        </CallProvider>
      )}
    </>
  );
}
