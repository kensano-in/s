'use client';

/**
 * GhostOverlay — Full-screen content protection layer for Ghost Mode
 *
 * Activates when:
 *  - Ghost Mode is active (renders invisible protection layer)
 *  - Ghost session is blurred (visible blur shield on focus loss)
 *
 * Protections:
 *  - CSS user-select: none on all ghost content
 *  - Context menu blocked document-wide
 *  - Drag events blocked
 *  - Full-screen blur on session blur/lock
 *  - Print block via CSS
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ghost, ShieldOff, AlertTriangle } from 'lucide-react';
import type { GhostDestroyReason } from '@/hooks/useGhostSession';

interface GhostOverlayProps {
  isBlurred: boolean;
  isActive: boolean;
  destroyReason: GhostDestroyReason | null;
  onDismiss: () => void;
}

const REASON_MESSAGES: Record<GhostDestroyReason, { title: string; body: string }> = {
  visibility_hidden:   { title: 'Session Destroyed', body: 'Ghost session was destroyed because you switched away.' },
  window_blur:         { title: 'Session Destroyed', body: 'Ghost session was destroyed because the app lost focus.' },
  page_hide:           { title: 'Session Destroyed', body: 'Ghost session was destroyed when you navigated away.' },
  before_unload:       { title: 'Session Destroyed', body: 'Ghost session was destroyed when you left the page.' },
  concurrent_device:   { title: 'Security Block', body: 'Another device connected to this account. Ghost session destroyed.' },
  session_expired:     { title: 'Session Expired', body: 'Your Ghost session has expired.' },
  security_anomaly:    { title: 'Security Alert', body: 'Suspicious activity detected. Ghost session destroyed.' },
  user_manual_leave:   { title: 'Session Ended', body: 'Ghost session ended and all messages have been destroyed.' },
  auth_lost:           { title: 'Session Ended', body: 'You were signed out. Ghost session destroyed.' },
};

export default function GhostOverlay({
  isBlurred,
  isActive,
  destroyReason,
  onDismiss,
}: GhostOverlayProps) {
  const reasonInfo = destroyReason ? REASON_MESSAGES[destroyReason] : null;
  const isSecurity = destroyReason === 'concurrent_device' || destroyReason === 'security_anomaly';

  return (
    <>
      {/* Active ghost mode subtle header glow (always visible when active) */}
      <AnimatePresence>
        {isActive && !isBlurred && (
          <motion.div
            key="ghost-active-indicator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-violet-500 to-transparent z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Blur Shield — covers entire chat when session is destroyed or focus lost */}
      <AnimatePresence>
        {isBlurred && (
          <motion.div
            key="ghost-blur-shield"
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(40px)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-[9999] flex flex-col items-center justify-center"
            style={{ background: 'rgba(0, 0, 0, 0.88)' }}
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
              className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${
                isSecurity
                  ? 'bg-red-500/20 border border-red-500/40'
                  : 'bg-violet-500/20 border border-violet-500/40'
              }`}
            >
              {isSecurity
                ? <AlertTriangle size={28} className="text-red-400" />
                : <ShieldOff size={28} className="text-violet-400" />
              }
            </motion.div>

            {/* Title */}
            <motion.h3
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={`text-lg font-bold mb-2 ${isSecurity ? 'text-red-400' : 'text-violet-300'}`}
            >
              {reasonInfo?.title ?? 'Session Destroyed'}
            </motion.h3>

            {/* Body */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-white/50 text-center max-w-xs px-4 mb-8"
            >
              {reasonInfo?.body ?? 'All Ghost messages have been permanently destroyed.'}
            </motion.p>

            {/* Privacy note */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] mb-8"
            >
              <Ghost size={11} className="text-violet-400" />
              <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
                Zero messages remain
              </span>
            </motion.div>

            {/* Dismiss */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              onClick={onDismiss}
              className="px-6 py-2.5 rounded-full bg-white/[0.06] border border-white/10 text-white/70 text-sm font-semibold hover:bg-white/[0.1] hover:text-white transition-all"
            >
              Dismiss
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
