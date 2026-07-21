'use client';

import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { useEffect, useState, useCallback, useRef } from 'react';

type WsStatus = 'connecting' | 'connected' | 'reconnecting' | 'error' | 'disconnected';

interface StatusConfig {
  icon: React.ReactNode;
  text: string;
  color: string;
  showRetry?: boolean;
  pill: boolean; // true = pill (top center), false = full banner
}

const STATUS_CONFIGS: Record<WsStatus, StatusConfig | null> = {
  connecting: null,
  reconnecting: null,
  connected: null, // suppress — never show green pill
  error: {
    icon: <WifiOff size={14} />,
    text: 'Connection Lost',
    color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    showRetry: true,
    pill: true,
  },
  disconnected: {
    icon: <WifiOff size={14} />,
    text: 'Disconnected — actions paused',
    color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    showRetry: true,
    pill: false, // full banner when truly disconnected
  },
};

/**
 * ConnectionStatus — Real-time connection state visualizer.
 *
 * States:
 *   CONNECTING    → amber pill (initial load)
 *   CONNECTED     → green pill (auto-hides after 2 seconds)
 *   RECONNECTING  → amber pill (retrying after error)
 *   ERROR         → red pill + retry button
 *   DISCONNECTED  → full red banner + retry button (actions blocked)
 *
 * Retry button fires 'verlyn:reconnect' CustomEvent which is caught by
 * self-healing loop in sync-engine.ts.
 */
export default function ConnectionStatus() {
  const wsStatus = useAppStore((s) => s.wsStatus);
  const currentUser = useAppStore((s) => s.currentUser);
  const [visible, setVisible] = useState(false);
  // Debounce timer ref — prevents amber pill flashing on fast connect cycles
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (wsStatus === 'connected') {
      // Never show the Connected pill — hide immediately
      setVisible(false);
      return;
    }

    if (wsStatus === 'connecting' || wsStatus === 'reconnecting') {
      // Debounce: only show amber pill if the status persists for 1.5s.
      // Fast connect cycles (e.g. normal Supabase subscribe) never reach this.
      debounceRef.current = setTimeout(() => setVisible(true), 1500);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }

    // 'error' | 'disconnected' — show immediately, no debounce
    setVisible(true);
  }, [wsStatus]);

  const handleRetry = useCallback(() => {
    window.dispatchEvent(new CustomEvent('verlyn:reconnect'));
  }, []);

  const config = STATUS_CONFIGS[wsStatus];
  const shouldRender = visible && !!config;

  if (!shouldRender || !currentUser) return null;

  // Full-width disconnected banner
  if (!config.pill) {
    return (
      <AnimatePresence>
        <motion.div
          key="disconnected-banner"
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          className={clsx(
            'fixed top-0 left-0 right-0 z-[var(--z-status)] flex items-center justify-center gap-3 px-4 py-2.5',
            'border-b text-sm font-semibold',
            config.color,
            'backdrop-blur-xl'
          )}
        >
          {config.icon}
          <span className="text-[13px] font-medium tracking-tight">{config.text}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="ml-2 px-3 py-1 text-[11px] font-bold uppercase tracking-widest rounded-full border border-current opacity-70 hover:opacity-100 transition-opacity"
          >
            Retry
          </button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Standard pill
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[var(--z-status)] pointer-events-none flex items-center gap-2">
      <AnimatePresence mode="wait">
        <motion.div
          key={wsStatus}
          initial={{ y: -20, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-full border shadow-2xl backdrop-blur-xl pointer-events-auto',
            config.color
          )}
        >
          {config.icon}
          <span className="text-[13px] font-medium tracking-tight">{config.text}</span>
          {config.showRetry && (
            <button
              type="button"
              onClick={handleRetry}
              className="ml-1 text-[11px] font-bold uppercase tracking-widest opacity-70 hover:opacity-100 transition-opacity underline underline-offset-2"
            >
              Retry
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
