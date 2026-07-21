/**
 * ═══════════════════════════════════════════════════════════════════════════
 * useWsMessaging — React integration for the WsClient
 *
 * This hook is the single integration point between the reliable WS protocol
 * and the Verlyn React component tree.  It:
 *
 *   • Creates / destroys the WsClient singleton per user session.
 *   • Bridges WsClient events into the Zustand store (upsertMessage,
 *     updateMessageStatus, setTypingUser, etc.).
 *   • Exposes a stable `sendMessage` API for ChatInput to call.
 *   • Reports WS status changes to the store (wsStatus).
 *   • Handles reconnect replays by merging missed messages.
 *
 * Usage:
 * ```tsx
 * // In a provider that wraps the messages layout:
 * const { sendMessage, sendTyping } = useWsMessaging({
 *   userId: currentUser.id,
 *   activeConvId,
 * });
 * ```
 * ═══════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { WsClient } from './ws-client';
import type { MessageEnvelope } from './ws-protocol';
import type { ChatMessage } from '@/components/Chat/MessageItem';
import { logger } from '@/utils/logger';

// ── Module-level singleton ────────────────────────────────────────────────────
// One WsClient per browser session regardless of how many times the hook mounts.
let _wsClient: WsClient | null = null;

function getOrCreateClient(userId: string): WsClient | null {
  // Only start the custom WsClient when NEXT_PUBLIC_WS_URL is explicitly set.
  // Without a WS server configured, connecting to localhost:4001 causes a
  // constant connect→fail→reconnect loop that flaps the status pill.
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (!wsUrl) {
    // No custom WS server — Supabase Realtime handles messaging.
    return null;
  }
  if (_wsClient) return _wsClient;
  _wsClient = new WsClient(wsUrl, userId);
  _wsClient.connect();
  return _wsClient;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseWsMessagingOptions {
  userId: string | null;
  activeConvId: string | null;
}

interface UseWsMessagingReturn {
  /** Send a text/media message. Returns the client-side temp message id. */
  sendMessage: (convoId: string, payload: unknown) => string | null;
  /** The underlying client for advanced use (avoid direct use in components). */
  client: WsClient | null;
}

export function useWsMessaging({
  userId,
  activeConvId,
}: UseWsMessagingOptions): UseWsMessagingReturn {
  const upsertMessage = useAppStore((s) => s.upsertMessage);
  const updateMessageStatus = useAppStore((s) => s.updateMessageStatus);
  const setWsStatus = useAppStore((s) => s.setWsStatus);
  const setMessages = useAppStore((s) => s.setMessages);
  const allMessages = useAppStore((s) => s.messages);

  // Hold a ref so event callbacks always see the latest value without re-subscribing.
  const activeConvIdRef = useRef(activeConvId);
  activeConvIdRef.current = activeConvId;

  // ── Client lifecycle ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const client = getOrCreateClient(userId);

    // No custom WS server configured — Supabase Realtime handles messaging.
    // Immediately report as 'connected' so the status pill never shows amber.
    if (!client) {
      setWsStatus('connected');
      return;
    }

    // ── connect / disconnect ───────────────────────────────────────────────
    const unConnect = client.on('connect', () => {
      setWsStatus('connected');
      logger.info('WsMessaging', 'ws:connected', { userId });
    });

    const unDisconnect = client.on('disconnect', ({ code, reason }) => {
      setWsStatus('reconnecting');
      logger.warn('WsMessaging', 'ws:disconnected', { code, reason });
    });

    // ── delivered (sender receives ACK) ───────────────────────────────────
    const unDelivered = client.on('delivered', ({ id, seq, tsServer }) => {
      // Reconcile: mark the message as 'delivered' in the store.
      // The upsertMessage call will update any matching optimistic entry.
      updateMessageStatus(id, 'delivered');
      logger.info('WsMessaging', 'msg:delivered', { id, seq });
    });

    // ── seen (sender receives read receipt) ───────────────────────────────
    const unSeen = client.on('seen', ({ id }) => {
      updateMessageStatus(id, 'seen');
      logger.info('WsMessaging', 'msg:seen', { id });
    });

    // ── message (recipient receives server push) ───────────────────────────
    const unMessage = client.on('message', (frame) => {
      const msg = envelopeToMessage(frame, userId);
      upsertMessage(frame.convoId, msg);
      logger.info('WsMessaging', 'msg:received', { id: frame.id, convoId: frame.convoId });
    });

    // ── replay (server sends missed messages after reconnect) ──────────────
    const unReplay = client.on('replay', ({ convoId, messages }) => {
      logger.info('WsMessaging', 'msg:replay', { convoId, count: messages.length });

      const existing = allMessages[convoId] ?? [];
      const existingIds = new Set(existing.map(m => m.id));

      // Merge replayed messages into the store — sort by seq ascending.
      const incoming = messages
        .filter(m => !existingIds.has(m.id))
        .map(m => envelopeToMessage(m, userId))
        .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));

      if (incoming.length > 0) {
        const merged = [...incoming, ...existing].sort(
          (a, b) => new Date(a.sent_at ?? 0).getTime() - new Date(b.sent_at ?? 0).getTime(),
        );
        setMessages(convoId, merged);
      }
    });

    return () => {
      unConnect();
      unDisconnect();
      unDelivered();
      unSeen();
      unMessage();
      unReplay();
    };
  }, [userId]); // Re-register only when user changes.

  // ── Exposed API ────────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    (convoId: string, payload: unknown): string | null => {
      if (!userId || !_wsClient) return null;
      return _wsClient.sendMessage(convoId, payload);
    },
    [userId],
  );

  return { sendMessage, client: _wsClient };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a raw MessageEnvelope into the app's ChatMessage shape. */
function envelopeToMessage(
  frame: MessageEnvelope,
  currentUserId: string,
): ChatMessage & { seq?: number } {
  const body = frame.payload as any;
  return {
    id: frame.id,
    client_temp_id: frame.id,
    sender_id: frame.senderId,
    conversation_id: frame.convoId,
    content: body?.content ?? '',
    type: body?.type ?? 'text',
    media_url: body?.mediaUrl ?? null,
    sent_at: body?.sentAt ?? new Date(frame.tsClient).toISOString(),
    status: 'delivered',
    is_mine: frame.senderId === currentUserId,
    reactions: [],
    reply_to_id: body?.replyToId ?? null,
    seq: frame.seq,
    sender: body?.sender ?? null,
  } as any;
}

// ── Singleton teardown (call on logout) ──────────────────────────────────────

/**
 * Disconnect and destroy the WsClient singleton.
 * Call this when the user logs out to prevent stale connections.
 */
export function teardownWsClient(): void {
  _wsClient?.disconnect();
  _wsClient = null;
}
