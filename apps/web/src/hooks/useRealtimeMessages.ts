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

import { useEffect, useRef } from 'react';
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

  const seenIdsRef = useRef<Set<string>>(new Set());
  // Ref to the active channel — prevents collision on re-render
  const channelRef = useRef<any>(null);
  const syncChannelRef = useRef<any>(null); // New channel for bypassing RLS stream drop
  // RT-01: Single timer ref for typing indicator — prevents accumulation
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { convsRef.current = conversations; }, [conversations]);
  useEffect(() => { activeIdRef.current = activeConvId; }, [activeConvId]);
  useEffect(() => { loadMessagesRef.current = loadMessages; }, [loadMessages]);
  useEffect(() => { loadConversationsRef.current = loadConversations; }, [loadConversations]);

  useEffect(() => {
    if (!currentUser?.id) return;

    const channelName = `chat:global:${currentUser.id}`;
    let isMounted = true;

    logWsSubscribe({ channel: channelName, convId: activeConvId ?? 'none' });

    // KEY FIX: use async IIFE so we can AWAIT the old channel removal before
    // building the new .on() chain. Without this, React StrictMode double-fires
    // the effect and Supabase throws "cannot add callbacks after subscribe()".
    const setup = async () => {
      // Step 1: fully remove previous channel
      if (channelRef.current) {
        try { await supabase.removeChannel(channelRef.current); } catch (_) {}
        channelRef.current = null;
      }

      // Step 2: bail if cleanup already ran (StrictMode unmounted before we got here)
      if (!isMounted) return;

      // Step 3: build the entire channel chain THEN call .subscribe()
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
          if (seenIdsRef.current.has(newMsg.id)) return;
          seenIdsRef.current.add(newMsg.id);

          const isTargeted = newMsg.recipient_id === currentUser.id || newMsg.sender_id === currentUser.id;
          const isGroupMsg = newMsg.conversation_id
            && !!currentConvs.find((c: any) => c.id === newMsg.conversation_id);

          if (!isTargeted && !isGroupMsg) return;

          const relevantId = isGroupMsg
            ? newMsg.conversation_id
            : newMsg.sender_id === currentUser.id
              ? newMsg.recipient_id
              : newMsg.sender_id;

          // ── Active conversation: inject into message list ─────────────────
          if (relevantId === currentActiveId) {
            if (newMsg.thread_root_id) {
              // Thread reply — increment parent's reply_count badge only
              setMessages((prev: any[]) => prev.map((m: any) =>
                m.id === newMsg.thread_root_id
                  ? { ...m, reply_count: (m.reply_count || 0) + 1 }
                  : m
              ));
              return;
            }

            if (newMsg.sender_id !== currentUser.id) {
              supabase
                .from('users')
                .select('display_name, username, avatar_url')
                .eq('id', newMsg.sender_id)
                .single()
                .then(({ data }: any) => {
                  const fullMsg = { ...newMsg, is_mine: false, sender: data };
                  setMessages((old: any[]) => {
                    if (old.find((m: any) => m.id === newMsg.id || (newMsg.client_temp_id && m.client_temp_id === newMsg.client_temp_id))) {
                      return old;
                    }
                    logStateUpdate('realtime', { messageId: newMsg.id });
                    if (newMsg.client_temp_id) computeE2E(newMsg.client_temp_id, 'ws_receive');
                    
                    // Mark as seen or delivered instantly (Whatsapp/Signal latency)
                    const targetStatus = relevantId === currentActiveId ? 'seen' : 'delivered';
                    if (newMsg.status !== targetStatus) {
                    // Fire-and-forget server action (must use fetch since this is a client hook, or RPC)
                      void supabase.rpc('update_message_status', { p_message_ids: [newMsg.id], p_status: targetStatus });
                    }
                    
                    return [fullMsg, ...old];
                  });
                });
            } else {
              // This is our OWN message echoing back from the DB
              setMessages((prev: any[]) => {
                // Case 1: real id already applied by PostgREST .then() → skip (no-op)
                if (prev.find((m: any) => m.id === newMsg.id && m.status === 'sent')) return prev;

                // Case 2: temp_id still in list → reconcile (WS echo won the race)
                if (newMsg.client_temp_id) {
                  const tempEntry = prev.find((m: any) =>
                    m.id === newMsg.client_temp_id ||
                    m.client_temp_id === newMsg.client_temp_id
                  );
                  if (tempEntry) {
                    logStateUpdate('realtime', { reconcile: 'client_temp_id', messageId: newMsg.id });
                    return prev.map((m: any) =>
                      (m.id === newMsg.client_temp_id || m.client_temp_id === newMsg.client_temp_id)
                        ? { ...newMsg, is_mine: true, sender: tempEntry.sender, status: 'sent' }
                        : m
                    );
                  }
                }

                // Case 3: no temp entry and no real entry → add (e.g. multi-device echo)
                if (!prev.find((m: any) => m.id === newMsg.id)) {
                  return [{ ...newMsg, is_mine: true, sender: {
                    display_name: currentUser.display_name || currentUser.displayName,
                    username: currentUser.username,
                    avatar_url: currentUser.avatar_url || currentUser.avatarUrl,
                  } }, ...prev];
                }

                return prev;
              });
            }
          }

          // ── Sidebar sync ──────────────────────────────────────────────────
          setConversations((prev: any[]) => {
            const index = prev.findIndex((c: any) => c.id === relevantId);
            if (index === -1) { loadConversationsRef.current(true); return prev; }
            const updatedConv = { ...prev[index], lastMessage: newMsg.content, updatedAt: newMsg.sent_at || new Date().toISOString() };
            return [updatedConv, ...prev.filter((_: any, i: number) => i !== index)];
          });
        })

        // ── Message UPDATE (edits, view-once shatters) ────────────────────
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        }, (payload: any) => {
          const updatedMsg = payload.new;
          setMessages((prev: any[]) => prev.map((m: any) =>
            m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m
          ));
        })

        // ── Message DELETE (unsends) ──────────────────────────────────────
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
        }, (payload: any) => {
          const deletedId = payload.old.id;
          setMessages((prev: any[]) => prev.filter((m: any) => m.id !== deletedId));
        })

        // ── Participant changes ───────────────────────────────────────────
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${currentUser.id}`,
        }, () => { loadConversationsRef.current(true); })

        // ── Group metadata changes ────────────────────────────────────────
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'conversations',
        }, (payload: any) => {
          const updated = payload.new;
          setConversations((prev: any[]) =>
            prev.map((c: any) =>
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
          const updated = payload.new || payload.old;
          if (updated && (updated.partner_id === activeIdRef.current || updated.chat_id === activeIdRef.current)) {
            setSettingsVersion(v => v + 1);
          }
          loadConversationsRef.current(true);
        })

        // ── Chat Theme Changes ───────────────────────────────────────────
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'chat_theme',
        }, (payload: any) => {
          const updated = payload.new || payload.old;
          if (updated && updated.chat_id === activeIdRef.current) {
            setSettingsVersion(v => v + 1);
          }
        })

        // ── Chat Nickname Changes ─────────────────────────────────────────
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'chat_nicknames',
        }, (payload: any) => {
          const updated = payload.new || payload.old;
          if (updated && updated.chat_id === activeIdRef.current) {
            setSettingsVersion(v => v + 1);
          }
        })

        // ── Typing broadcast ──────────────────────────────────────────────
        .on('broadcast', { event: 'typing' }, (payload: any) => {
          // RT-04: Guard against malformed payload
          const data = payload?.payload ?? {};
          const { userId, convId, typing } = data;
          if (userId !== currentUser.id && convId === activeIdRef.current) {
            setIsOtherTyping(!!typing);
            // RT-01: Clear any existing timer before setting a new one
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            if (typing) {
              typingTimerRef.current = setTimeout(() => {
                setIsOtherTyping(false);
                typingTimerRef.current = null;
              }, 3000);
            }
          }
        })

        // ── Theme Apply broadcast ─────────────────────────────────────────
        .on('broadcast', { event: 'theme:apply' }, (payload: any) => {
          const { convId, theme_id, theme_blur } = payload.payload ?? {};
          if (convId === activeIdRef.current) {
            // Signal a setting refresh, simulating the DB `postgres_changes` effect instantly
            setSettingsVersion(v => v + 1);
          }
        })

        // ── Presence (online status) ──────────────────────────────────────
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState<{ user_id: string }>();
          const ids = new Set(
            Object.values(state).flat().map((p: any) => p.user_id).filter(Boolean)
          );
          setOnlineUsers(() => ids);
        })

        // ── System events (reconnect) ─────────────────────────────────────
        .on('system' as any, {}, (payload: any) => {
          if (payload?.extension === 'postgres_changes' && payload?.status === 'ok') {
            logWsReconnect({ channel: channelName });
            const activeId = activeIdRef.current;
            if (activeId) loadMessagesRef.current(activeId, undefined, true);
          }
        })

        // ── Reactions INSERT ──────────────────────────────────────────────
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions',
        }, (payload: any) => {
          const { message_id, user_id, emoji } = payload.new;
          setMessages((prev: any[]) => prev.map((m: any) => {
            if (m.id !== message_id) return m;
            const existing: any[] = m.reactions || [];
            const match = existing.find((r: any) => r.emoji === emoji);
            const isMe = user_id === currentUser.id;
            if (match) return { ...m, reactions: existing.map((r: any) => r.emoji === emoji ? { ...r, count: r.count + 1, reacted: r.reacted || isMe } : r) };
            return { ...m, reactions: [...existing, { emoji, count: 1, reacted: isMe }] };
          }));
        })

        // ── Reactions DELETE ──────────────────────────────────────────────
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'message_reactions',
        }, (payload: any) => {
          const { message_id, user_id, emoji } = payload.old;
          setMessages((prev: any[]) => prev.map((m: any) => {
            if (m.id !== message_id) return m;
            const existing: any[] = m.reactions || [];
            const isMe = user_id === currentUser.id;
            const updated = existing
              .map((r: any) => r.emoji === emoji ? { ...r, count: Math.max(0, r.count - 1), reacted: isMe ? false : r.reacted } : r)
              .filter((r: any) => r.count > 0);
            return { ...m, reactions: updated };
          }));
        })

        // ── Subscribe ─────────────────────────────────────────────────────
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ user_id: currentUser.id, online_at: new Date().toISOString() });
          }
        });

      channelRef.current = channel;
    };

    setup();

    return () => {
      isMounted = false;
      // Async cleanup — fire-and-forget is fine here
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current).catch(() => {});
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, supabase]);

  // ── Self-Healing on tab focus ─────────────────────────────────────────────
  useEffect(() => {
    const handleReconnect = () => {
      const activeId = activeIdRef.current;
      if (activeId) {
        logWsReconnect({ channel: 'visibility:reconnect' });
        loadMessagesRef.current(activeId, undefined, true);
      }
      processSyncQueue();
    };
    window.addEventListener('verlyn:reconnect', handleReconnect);
    return () => window.removeEventListener('verlyn:reconnect', handleReconnect);
  }, []);
}
