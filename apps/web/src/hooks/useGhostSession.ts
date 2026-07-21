'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * useGhostSession — Enterprise-grade secure ephemeral messaging session manager
 *
 * Architecture:
 *   - Ghost messages NEVER touch the database or Zustand persist store.
 *   - All messages live in React useState (ephemeral, cleared on destroy).
 *   - Session destroyed on: visibility loss, window blur, pagehide,
 *     beforeunload, concurrent device, manual leave, or any security anomaly.
 *   - Multi-device detection via custom window events from GlobalRealtimeMonitor.
 *   - Content protection: copy block, context menu block.
 *   - Cryptographic destruction: revokeObjectURL for all media blobs.
 *
 * Event Bus (window custom events from GlobalRealtimeMonitor):
 *   verlyn:ghost_message      — incoming ghost message from partner
 *   verlyn:ghost_destroy      — partner destroyed their session
 *   verlyn:ghost_session_claim — concurrent device claimed this session
 *
 * Security Philosophy: Zero Trust. Never assume the environment is safe.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { ChatMessage } from '@/components/Chat/MessageItem';
import { realtimeBroadcastActive } from './useRealtimeMessages';
import { deleteGhostMediaDB } from '@/app/(main)/messages/actions';

// ── Types ────────────────────────────────────────────────────────────────────

export type GhostDestroyReason =
  | 'user_manual_leave'
  | 'visibility_hidden'
  | 'window_blur'
  | 'page_hide'
  | 'before_unload'
  | 'concurrent_device'
  | 'session_expired'
  | 'security_anomaly'
  | 'auth_lost';

export interface GhostSessionState {
  isActive: boolean;
  isBlurred: boolean;         // True when a lifecycle event fired — show blur shield
  sessionToken: string | null;
  messages: ChatMessage[];    // Ephemeral — never persisted
  destroyReason: GhostDestroyReason | null;
}

export interface GhostSessionActions {
  startSession: (convId: string) => void;
  destroySession: (reason: GhostDestroyReason) => void;
  addMessage: (msg: ChatMessage) => void;
  dismissBlur: () => void;
}

// ── Session token generator ──────────────────────────────────────────────────
function generateSessionToken(): string {
  const arr = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Main hook ────────────────────────────────────────────────────────────────

export function useGhostSession(convId: string | null, currentUserId: string | null) {
  const [state, setState] = useState<GhostSessionState>({
    isActive: false,
    isBlurred: false,
    sessionToken: null,
    messages: [],
    destroyReason: null,
  });

  // Stable refs to avoid stale closure issues in event listeners
  const sessionTokenRef  = useRef<string | null>(null);
  const convIdRef        = useRef<string | null>(convId);
  const isActiveRef      = useRef(false);
  const mediaBlobUrls    = useRef<string[]>([]);   // Track all object URLs for cleanup
  const uploadedMediaUrls = useRef<string[]>([]);  // Track all uploaded public URLs for storage deletion

  // ── Cryptographic session destruction ────────────────────────────────────────
  const destroySession = useCallback((reason: GhostDestroyReason) => {
    if (!isActiveRef.current) return;

    console.warn(`[GhostSession] Destroying session. Reason: ${reason}`);

    // 1. Mark inactive immediately (before any async work)
    isActiveRef.current = false;
    sessionTokenRef.current = null;

    // 2. Revoke all media object URLs (frees memory, makes blobs unrecoverable)
    for (const url of mediaBlobUrls.current) {
      try { URL.revokeObjectURL(url); } catch (_) {}
    }
    mediaBlobUrls.current = [];

    // Delete any uploaded media from Supabase Storage immediately
    if (uploadedMediaUrls.current.length > 0) {
      void deleteGhostMediaDB([...uploadedMediaUrls.current]);
      uploadedMediaUrls.current = [];
    }

    // 3. Broadcast destruction to partner (no userId to avoid leaking identity)
    if (convIdRef.current) {
      realtimeBroadcastActive('ghost_destroy', {
        convId: convIdRef.current,
        reason,
      });
    }

    // 4. Update UI state — messages wiped, blur shown
    setState({
      isActive: false,
      isBlurred: true,
      sessionToken: null,
      messages: [],
      destroyReason: reason,
    });
  }, []);

  // Keep track of active convId and detect conversation switches
  const prevConvIdRef = useRef<string | null>(convId);

  useEffect(() => {
    const prevId = prevConvIdRef.current;
    if (prevId && prevId !== convId && isActiveRef.current) {
      console.log(`[GhostSession] Switching from ${prevId} to ${convId}. Wiping session.`);
      destroySession('user_manual_leave');
    }
    prevConvIdRef.current = convId;
    convIdRef.current = convId;
  }, [convId, destroySession]);

  // ── Start session ────────────────────────────────────────────────────────────
  const startSession = useCallback((cId: string) => {
    if (isActiveRef.current) return; // Already active

    const token = generateSessionToken();
    sessionTokenRef.current = token;
    isActiveRef.current = true;

    setState({
      isActive: true,
      isBlurred: false,
      sessionToken: token,
      messages: [],
      destroyReason: null,
    });

    // Broadcast session claim — other devices of this user will receive this
    // and must destroy their local ghost session immediately
    realtimeBroadcastActive('ghost_session_claim', {
      convId: cId,
      sessionToken: token,
      userId: currentUserId,
      timestamp: Date.now(),
    });

    console.log(`[GhostSession] Session started. Token: ${token.substring(0, 8)}...`);
  }, [currentUserId]);

  // ── Add message (zero DB storage) ────────────────────────────────────────────
  const addMessage = useCallback((msg: ChatMessage) => {
    if (!isActiveRef.current) return;

    if (msg.media_url && msg.media_url.startsWith('blob:')) {
      mediaBlobUrls.current.push(msg.media_url);
    } else if (msg.media_url && msg.media_url.startsWith('https://')) {
      uploadedMediaUrls.current.push(msg.media_url);
    }

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, msg],
    }));
  }, []);

  // ── Dismiss blur ─────────────────────────────────────────────────────────────
  const dismissBlur = useCallback(() => {
    setState(prev => ({ ...prev, isBlurred: false, destroyReason: null }));
  }, []);

  // ── Incoming ghost message handler ───────────────────────────────────────────
  const handleIncomingMessage = useCallback((msg: ChatMessage) => {
    if (!isActiveRef.current) return;

    if (msg.media_url && msg.media_url.startsWith('blob:')) {
      mediaBlobUrls.current.push(msg.media_url);
    } else if (msg.media_url && msg.media_url.startsWith('https://')) {
      uploadedMediaUrls.current.push(msg.media_url);
    }

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, { ...msg, is_ghost: true }],
    }));
  }, []);

  // ── Incoming ghost_destroy handler (partner wiped session) ───────────────────
  const handleIncomingDestroy = useCallback((data: { convId: string }) => {
    if (!isActiveRef.current) return;
    if (data.convId !== convIdRef.current) return;

    console.warn('[GhostSession] Partner destroyed session. Wiping local.');
    isActiveRef.current = false;
    sessionTokenRef.current = null;
    for (const url of mediaBlobUrls.current) {
      try { URL.revokeObjectURL(url); } catch (_) {}
    }
    mediaBlobUrls.current = [];

    if (uploadedMediaUrls.current.length > 0) {
      void deleteGhostMediaDB([...uploadedMediaUrls.current]);
      uploadedMediaUrls.current = [];
    }

    setState({
      isActive: false,
      isBlurred: true,
      sessionToken: null,
      messages: [],
      destroyReason: 'user_manual_leave',
    });
  }, []);

  // ── Incoming ghost_session_claim (concurrent device detection) ───────────────
  const handleIncomingClaim = useCallback((data: {
    convId: string;
    sessionToken: string;
    userId: string | null;
    timestamp: number;
  }) => {
    if (!isActiveRef.current) return;
    if (data.convId !== convIdRef.current) return;
    if (data.sessionToken === sessionTokenRef.current) return; // Our own claim echo

    // A different device is claiming this ghost session — destroy immediately
    console.warn('[GhostSession] Concurrent session detected. Destroying.');
    destroySession('concurrent_device');
  }, [destroySession]);

  // ── Window event bus listeners (from GlobalRealtimeMonitor) ─────────────────
  useEffect(() => {
    const onGhostMessage = (e: Event) => {
      const msg = (e as CustomEvent).detail;
      if (!msg) return;
      handleIncomingMessage(msg);
    };

    const onGhostDestroy = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (!data) return;
      handleIncomingDestroy(data);
    };

    const onGhostClaim = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (!data) return;
      handleIncomingClaim(data);
    };

    window.addEventListener('verlyn:ghost_message', onGhostMessage);
    window.addEventListener('verlyn:ghost_destroy', onGhostDestroy);
    window.addEventListener('verlyn:ghost_session_claim', onGhostClaim);

    return () => {
      window.removeEventListener('verlyn:ghost_message', onGhostMessage);
      window.removeEventListener('verlyn:ghost_destroy', onGhostDestroy);
      window.removeEventListener('verlyn:ghost_session_claim', onGhostClaim);
    };
  }, [handleIncomingMessage, handleIncomingDestroy, handleIncomingClaim]);

  // ── Lifecycle event listeners (destroy on focus loss / lock) ─────────────────
  useEffect(() => {
    if (!state.isActive) return;

    const onVisibilityChange = () => {
      if (document.hidden) {
        destroySession('visibility_hidden');
      }
    };

    const onWindowBlur = () => {
      // 300ms grace to avoid false triggers from in-page focus switches
      setTimeout(() => {
        if (!document.hasFocus()) {
          destroySession('window_blur');
        }
      }, 300);
    };

    const onPageHide = () => destroySession('page_hide');
    const onBeforeUnload = () => destroySession('before_unload');

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [state.isActive, destroySession]);

  // ── Copy / clipboard interception (active during ghost session) ──────────────
  useEffect(() => {
    if (!state.isActive) return;

    const blockCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Suppress context menu (right-click) globally during ghost session
    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('copy', blockCopy, true);
    document.addEventListener('contextmenu', blockContextMenu, true);

    return () => {
      document.removeEventListener('copy', blockCopy, true);
      document.removeEventListener('contextmenu', blockContextMenu, true);
    };
  }, [state.isActive]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (isActiveRef.current) {
        destroySession('user_manual_leave');
      }
    };
  }, [destroySession]);

  return {
    state,
    actions: {
      startSession,
      destroySession,
      addMessage,
      dismissBlur,
    } as GhostSessionActions,
  };
}
