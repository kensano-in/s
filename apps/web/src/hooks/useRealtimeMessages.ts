'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * useRealtimeMessages
 *
 * Extracted realtime subscription hook for Verlyn chat.
 * Invariants satisfied:
 *   I4 — receiver gets message < 300ms without refresh
 *   I5 — on reconnect, missed messages are synced via catch-up fetch
 *   I7 — deduplication via seenIds Set<string>
 *   I8 — unsubscribe on unmount / conv change prevents stale handlers
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  logWsSubscribe,
  logWsEventReceived,
  logWsReconnect,
  logStateUpdate,
  computeE2E,
} from '@/lib/chat/logger';
import { processSyncQueue } from '@/lib/sync-engine';

interface UseRealtimeMessagesOptions {
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>;
  currentUser: { id: string; display_name?: string; displayName?: string; username: string; avatar_url?: string; avatarUrl?: string } | null;
  activeConvId: string | null;
  conversations: Array<{ id: string; isGroup?: boolean }>;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  setConversations: React.Dispatch<React.SetStateAction<any[]>>;
  setIsOtherTyping: (typing: boolean) => void;
  setSettingsVersion: (fn: (v: number) => number) => void;
  setOnlineUsers: (fn: (prev: Set<string>) => Set<string>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loadConversations: (...args: any[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loadMessages: (...args: any[]) => void;
}

export function useRealtimeMessages({
  supabase,
  currentUser,
  activeConvId,
  conversations,
  setMessages,
  setConversations,
  setIsOtherTyping,
  setSettingsVersion,
  setOnlineUsers,
  loadConversations,
  loadMessages,
}: UseRealtimeMessagesOptions) {
  // Stable refs — avoid stale closures in the Supabase callback
  const convsRef = useRef(conversations);
  const activeIdRef = useRef(activeConvId);
  const loadMessagesRef = useRef(loadMessages);
  const loadConversationsRef = useRef(loadConversations);

  // Deduplication set — tracks real message IDs seen this session
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => { convsRef.current = conversations; }, [conversations]);
  useEffect(() => { activeIdRef.current = activeConvId; }, [activeConvId]);
  useEffect(() => { loadMessagesRef.current = loadMessages; }, [loadMessages]);
  useEffect(() => { loadConversationsRef.current = loadConversations; }, [loadConversations]);

  useEffect(() => {
    if (!currentUser?.id) return;

    const channelName = `chat:global:${currentUser.id}`;

    logWsSubscribe({ channel: channelName, convId: activeConvId ?? 'none' });

    const channel = supabase
      .channel(channelName)

      // ── Message INSERT ────────────────────────────────────────────────────
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload: any) => {
        const newMsg = payload.new;
        const currentConvs = convsRef.current;
        const currentActiveId = activeIdRef.current;

        logWsEventReceived({ messageId: newMsg.id, convId: newMsg.conversation_id || newMsg.sender_id });

        // Duplicate guard
        if (seenIdsRef.current.has(newMsg.id)) {
          return;
        }
        seenIdsRef.current.add(newMsg.id);

        const isTargeted = newMsg.recipient_id === currentUser.id || newMsg.sender_id === currentUser.id;
        const isGroupMsg = newMsg.conversation_id
          && !!currentConvs.find(c => c.id === newMsg.conversation_id);

        if (!isTargeted && !isGroupMsg) return;

        // For DMs: relevantId = the OTHER person in the conversation (not us)
        // If we sent it: other person = recipient_id
        // If they sent it: other person = sender_id
        const relevantId = isGroupMsg
          ? newMsg.conversation_id
          : newMsg.sender_id === currentUser.id
            ? newMsg.recipient_id   // We sent it — other person is recipient
            : newMsg.sender_id;     // They sent it — other person is sender

        // ── Active conversation: inject into message list ─────────────────
        if (relevantId === currentActiveId) {
          if (newMsg.sender_id !== currentUser.id) {
            // Other user's message: need display info
            supabase
              .from('users')
              .select('display_name, username, avatar_url')
              .eq('id', newMsg.sender_id)
              .single()
              .then(({ data }: any) => {
                const fullMsg = { ...newMsg, is_mine: false, sender: data };
                setMessages((old: any[]) => {
                  if (old.find(m => m.id === newMsg.id || (newMsg.client_temp_id && m.client_temp_id === newMsg.client_temp_id))) {
                    return old;
                  }
                  logStateUpdate('realtime', { messageId: newMsg.id });
                  // Compute E2E latency if we can find matching tempId
                  if (newMsg.client_temp_id) {
                    computeE2E(newMsg.client_temp_id, 'ws_receive');
                  }
                  return [fullMsg, ...old];
                });
              });
          } else {
            // Our own INSERT from another tab/window — reconcile with temp if needed
            setMessages((prev: any[]) => {
              // Try to replace temp by client_temp_id first
              if (newMsg.client_temp_id) {
                const hasTemp = prev.find(m => m.id === newMsg.client_temp_id);
                if (hasTemp) {
                  logStateUpdate('realtime', { reconcile: 'client_temp_id', messageId: newMsg.id });
                  return prev.map(m =>
                    m.id === newMsg.client_temp_id
                      ? { ...newMsg, is_mine: true, sender: hasTemp.sender, status: 'sent' }
                      : m
                  );
                }
              }
              // Already exists as real id → skip
              if (prev.find(m => m.id === newMsg.id)) return prev;
              // New message from another tab
              const fullMsg = {
                ...newMsg,
                is_mine: true,
                sender: {
                  display_name: currentUser.display_name || currentUser.displayName,
                  username: currentUser.username,
                  avatar_url: currentUser.avatar_url || currentUser.avatarUrl,
                },
              };
              return [fullMsg, ...prev];
            });
          }
        }

        // ── Sidebar sync: move conversation to top ────────────────────────
        setConversations((prev: any[]) => {
          const index = prev.findIndex(c => c.id === relevantId);
          if (index === -1) {
            loadConversationsRef.current(true);
            return prev;
          }
          const updatedConv = {
            ...prev[index],
            lastMessage: newMsg.content,
            updatedAt: newMsg.sent_at || new Date().toISOString(),
          };
          const others = prev.filter((_, i) => i !== index);
          return [updatedConv, ...others];
        });
      })

      // ── Participant changes (added/removed from group) ─────────────────
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversation_participants',
        filter: `user_id=eq.${currentUser.id}`,
      }, () => {
        loadConversationsRef.current(true);
      })

      // ── Group metadata changes (theme, name, etc.) ────────────────────
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
      }, (payload: any) => {
        const updated = payload.new;
        setConversations((prev: any[]) =>
          prev.map(c =>
            c.id === updated.id
              ? { ...c, theme_id: updated.theme_id, theme_blur: updated.theme_blur, name: updated.name, avatarUrl: updated.icon_url }
              : c
          )
        );
      })

      // ── DM settings changes ───────────────────────────────────────────
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'dm_settings',
        filter: `user_id=eq.${currentUser.id}`,
      }, (payload: any) => {
        const updated = payload.new;
        if (updated.partner_id === activeIdRef.current) {
          setSettingsVersion(v => v + 1);
        }
        loadConversationsRef.current(true);
      })

      // ── Typing broadcast ──────────────────────────────────────────────
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        const { userId, convId, typing } = payload.payload ?? {};
        if (userId !== currentUser.id && convId === activeIdRef.current) {
          setIsOtherTyping(typing);
          if (typing) {
            // Auto-clear typing indicator after 3s (safety net)
            setTimeout(() => setIsOtherTyping(false), 3000);
          }
        }
      })

      // ── Presence (online status) ──────────────────────────────────────
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ user_id: string }>();
        const ids = new Set(
          Object.values(state)
            .flat()
            .map((p: any) => p.user_id)
            .filter(Boolean)
        );
        setOnlineUsers(() => ids);
      })

      // ── System events (reconnect detection) ───────────────────────────
      .on('system' as any, {}, (payload: any) => {
        if (payload?.extension === 'postgres_changes' && payload?.status === 'ok') {
          // Supabase re-established realtime connection — catch up on missed msgs
          logWsReconnect({ channel: channelName });
          const activeId = activeIdRef.current;
          if (activeId) {
            loadMessagesRef.current(activeId, undefined, true);
          }
        }
      })

      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: currentUser.id, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    currentUser?.id,
    supabase,
    setMessages,
    setConversations,
    setIsOtherTyping,
    setSettingsVersion,
    setOnlineUsers,
    // activeConvId intentionally OMITTED — channel is global per-user, not per-conv.
    // Conversation switching is handled via activeIdRef WITHOUT tearing down the socket.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]);

  // ── Axiom 15: Self-Healing on tab focus ───────────────────────────────────
  // The sync-engine emits 'verlyn:reconnect' on visibilitychange.
  // We catch that here and trigger a catch-up fetch for the active conversation.
  useEffect(() => {

    const handleReconnect = () => {
      const activeId = activeIdRef.current;
      if (activeId) {
        logWsReconnect({ channel: 'visibility:reconnect' });
        loadMessagesRef.current(activeId, undefined, true);
      }
      // Also drain any pending messages from the SyncQueue
      processSyncQueue();
    };

    window.addEventListener('verlyn:reconnect', handleReconnect);
    return () => window.removeEventListener('verlyn:reconnect', handleReconnect);
  }, []); // Stable refs — no deps needed

}
