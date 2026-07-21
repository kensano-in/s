"use client";

/**
 * InboxTabBar — Production-quality inbox navigation
 *
 * Design goals:
 *  • Full-width — zero dead space on any screen width
 *  • Spring-animated underline via framer-motion layoutId
 *  • Auto-scrolls active tab into view (smooth, centered)
 *  • Gradient edge-fade indicates scrollability
 *  • 44px minimum touch target on every tab
 *  • Momentum + snap scrolling, no visible scrollbar
 *  • No layout shift, no CLS, hardware-accelerated
 *  • Compact badge pills that never push row height
 */

import { useRef, useEffect, memo, useCallback } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

export type InboxTabId = 'primary' | 'requests' | 'spam' | 'archived' | 'blocked';

interface InboxTabBarProps {
  activeTab: InboxTabId;
  onTabChange: (tab: InboxTabId, resetRequest: boolean) => void;
  counts: {
    requests: number;
    spam: number;
    archived: number;
  };
}

const TABS: { id: InboxTabId; label: string }[] = [
  { id: 'primary',  label: 'Chats'    },
  { id: 'requests', label: 'Requests' },
  { id: 'spam',     label: 'Spam'     },
  { id: 'archived', label: 'Archived' },
  { id: 'blocked',  label: 'Blocked'  },
];

const InboxTabBar = memo(function InboxTabBar({
  activeTab,
  onTabChange,
  counts,
}: InboxTabBarProps) {
  const scrollRef  = useRef<HTMLDivElement>(null);
  const tabRefs    = useRef<(HTMLButtonElement | null)[]>([]);

  // Smoothly centers the active tab in the scroll container
  const scrollActiveIntoView = useCallback((tabId: InboxTabId) => {
    const idx = TABS.findIndex(t => t.id === tabId);
    const tabEl = tabRefs.current[idx];
    const container = scrollRef.current;
    if (!tabEl || !container) return;

    const containerW = container.offsetWidth;
    const tabLeft    = tabEl.offsetLeft;
    const tabW       = tabEl.offsetWidth;
    const target     = tabLeft - containerW / 2 + tabW / 2;

    container.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, []);

  useEffect(() => {
    // Use rAF so layout is settled before measuring
    const raf = requestAnimationFrame(() => scrollActiveIntoView(activeTab));
    return () => cancelAnimationFrame(raf);
  }, [activeTab, scrollActiveIntoView]);

  return (
    <div className="relative shrink-0 border-b border-white/[0.04]" aria-label="Inbox tabs">

      {/* Left edge fade — visible when scrolled right */}
      <div
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to right, #0a0a10 0%, transparent 100%)',
        }}
      />
      {/* Right edge fade */}
      <div
        aria-hidden
        className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to left, #0a0a10 0%, transparent 100%)',
        }}
      />

      {/* Scrollable rail */}
      <div
        ref={scrollRef}
        role="tablist"
        className="flex w-full overflow-x-auto scrollbar-none"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'x proximity',
        }}
      >
        {TABS.map(({ id, label }, index) => {
          const isActive = activeTab === id;
          const count =
            id === 'requests' ? counts.requests :
            id === 'spam'     ? counts.spam     :
            id === 'archived' ? counts.archived : 0;

          return (
            <button
              key={id}
              ref={el => { tabRefs.current[index] = el; }}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(id, true)}
              /* flex-1 makes tabs share width equally when they all fit.
                 min-w-fit ensures text never wraps or clips on small screens. */
              className={clsx(
                "relative flex-1 min-w-fit shrink-0",
                "flex flex-col items-center justify-center gap-0",
                "px-4 select-none",
                "transition-colors duration-150 focus-visible:outline-none",
                // 44px touch target
              )}
              style={{ minHeight: '44px', scrollSnapAlign: 'center' }}
            >
              {/* Label + badge row */}
              <div className="flex items-center gap-1.5 pb-[10px] pt-[10px]">
                <span
                  className={clsx(
                    "whitespace-nowrap transition-all duration-200",
                    "text-[13px] leading-none tracking-tight",
                    isActive
                      ? "font-semibold text-white"
                      : "font-medium text-white/45"
                  )}
                >
                  {label}
                </span>

                {count > 0 && (
                  <span
                    className={clsx(
                      "min-w-[16px] h-4 px-1 rounded-full",
                      "text-[9px] font-black leading-none",
                      "flex items-center justify-center shrink-0",
                      isActive
                        ? "bg-indigo-500 text-white"
                        : "bg-white/[0.08] text-white/40"
                    )}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </div>

              {/* Animated underline — spring-shared across tabs via layoutId */}
              {isActive && (
                <motion.span
                  layoutId="inbox-tab-underline"
                  className="absolute bottom-0 inset-x-3 h-[2px] rounded-full bg-indigo-400"
                  style={{
                    boxShadow: '0 0 8px rgba(99,102,241,0.55), 0 0 16px rgba(99,102,241,0.2)',
                    willChange: 'transform',
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 42, mass: 0.8 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

InboxTabBar.displayName = 'InboxTabBar';
export default InboxTabBar;
