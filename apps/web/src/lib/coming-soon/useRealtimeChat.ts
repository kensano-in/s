'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/coming-soon/supabase';
import { useChatStore } from '@/lib/coming-soon/chatStore';
import type { ChatMessage, TypingIndicator } from '@/types/chat';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPING_DEBOUNCE_MS = 1500;
const PRESENCE_PING_MS   = 20_000;
const MAX_HISTORY        = 50;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRealtimeChat(caseId: string | null) {
  const {
    addMessage,
    setMessages,
    setHistoryLoaded,
    setLoadingHistory,
    setAgentTyping,
    setAgentPresence,
    setConnectionStatus,
    clearUnread,
    incrementUnread,
    activeCaseId,
    historyLoaded,
    messages,
  } = useChatStore();

  const channelRef       = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTypingRef      = useRef(false);
  const mountedRef       = useRef(true);

  // ── Load History ────────────────────────────────────────────────────────────

  const loadHistory = useCallback(async (id: string) => {
    if (historyLoaded[id]) return;
    setLoadingHistory(id, true);

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('case_id', id)
        .order('created_at', { ascending: false })
        .limit(MAX_HISTORY);

      if (error) {
        // Table might not exist yet — silently handle
        console.warn('[Realtime] History load failed:', error.message);
        setMessages(id, []);
      } else {
        setMessages(id, (data ?? []).reverse() as ChatMessage[]);
      }
      setHistoryLoaded(id, true);
    } catch (e) {
      console.error('[Realtime] Unexpected history error:', e);
    } finally {
      if (mountedRef.current) setLoadingHistory(id, false);
    }
  }, [historyLoaded, setLoadingHistory, setMessages, setHistoryLoaded]);

  // ── Ping Presence ────────────────────────────────────────────────────────────

  const pingPresence = useCallback(async (id: string) => {
    try {
      await supabase.from('user_presence').upsert(
        { case_id: id, sender: 'user', status: 'online', last_seen: new Date().toISOString() },
        { onConflict: 'case_id,sender' }
      );
    } catch { /* non-critical */ }
  }, []);

  // ── Send Typing ──────────────────────────────────────────────────────────────

  const sendTypingStart = useCallback(async (id: string) => {
    if (isTypingRef.current) return;
    isTypingRef.current = true;
    try {
      await supabase.from('typing_indicators').upsert(
        { case_id: id, sender: 'user', is_typing: true, updated_at: new Date().toISOString() },
        { onConflict: 'case_id,sender' }
      );
    } catch { /* non-critical */ }
  }, []);

  const sendTypingStop = useCallback(async (id: string) => {
    if (!isTypingRef.current) return;
    isTypingRef.current = false;
    try {
      await supabase.from('typing_indicators').upsert(
        { case_id: id, sender: 'user', is_typing: false, updated_at: new Date().toISOString() },
        { onConflict: 'case_id,sender' }
      );
    } catch { /* non-critical */ }
  }, []);

  // Debounced typing handler (call this on every keystroke)
  const handleTyping = useCallback((id: string) => {
    sendTypingStart(id);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => sendTypingStop(id), TYPING_DEBOUNCE_MS);
  }, [sendTypingStart, sendTypingStop]);

  // ── Subscribe to Realtime Channel ────────────────────────────────────────────

  useEffect(() => {
    if (!caseId) return;
    mountedRef.current = true;

    // Load history first
    loadHistory(caseId);
    pingPresence(caseId);

    setConnectionStatus('connecting');

    const channelName = `chat:${caseId}`;

    // Remove any stale channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: 'user' },
        },
      })

      // ── New Messages ──────────────────────────────────────────────────────
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `case_id=eq.${caseId}`,
        },
        (payload: RealtimePostgresChangesPayload<ChatMessage>) => {
          if (!mountedRef.current) return;
          const msg = payload.new as ChatMessage;
          if (!msg?.id) return;

          addMessage(msg);

          // If it's an agent message and we're not on this case, increment unread
          if (msg.sender === 'agent') {
            if (activeCaseId !== caseId) {
              incrementUnread(caseId);
            } else {
              // Mark seen immediately
              supabase
                .from('chat_messages')
                .update({ seen_at: new Date().toISOString() })
                .eq('id', msg.id)
                .then(() => {});
            }
          }
        }
      )

      // ── Message Updates (seen, reactions) ────────────────────────────────
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `case_id=eq.${caseId}`,
        },
        (payload: RealtimePostgresChangesPayload<ChatMessage>) => {
          if (!mountedRef.current) return;
          const updated = payload.new as ChatMessage;
          if (!updated?.id) return;

          // Update the message in store
          useChatStore.getState().updateMessageStatus(caseId, updated.id, updated);
        }
      )

      // ── Typing Indicators ─────────────────────────────────────────────────
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `case_id=eq.${caseId}`,
        },
        (payload: RealtimePostgresChangesPayload<TypingIndicator>) => {
          if (!mountedRef.current) return;
          const row = payload.new as TypingIndicator;
          if (!row || row.sender !== 'agent') return;
          setAgentTyping(caseId, row.is_typing);
        }
      )

      // ── Presence ──────────────────────────────────────────────────────────
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `case_id=eq.${caseId}`,
        },
        (payload: RealtimePostgresChangesPayload<{ sender: string; status: string; last_seen: string }>) => {
          if (!mountedRef.current) return;
          const row = payload.new as { sender: string; status: string; last_seen: string };
          if (!row || row.sender !== 'agent') return;
          
          // Consider agent offline if last_seen is >60s ago
          const lastSeen = new Date(row.last_seen).getTime();
          const isOnline = Date.now() - lastSeen < 60_000;
          setAgentPresence(caseId, isOnline ? 'online' : 'offline');
        }
      )

      .subscribe((status) => {
        if (!mountedRef.current) return;
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          clearUnread(caseId);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('reconnecting');
          // Auto-reconnect handled by Supabase client
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        }
      });

    channelRef.current = channel;

    // Presence heartbeat
    presenceTimerRef.current = setInterval(() => {
      if (mountedRef.current) pingPresence(caseId);
    }, PRESENCE_PING_MS);

    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        sendTypingStop(caseId);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (typingTimerRef.current)   clearTimeout(typingTimerRef.current);
      if (presenceTimerRef.current) clearInterval(presenceTimerRef.current);
    };
  }, [caseId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { handleTyping };
}

// ─── Standalone send function ─────────────────────────────────────────────────

export async function sendChatMessage(params: {
  caseId: string;
  content: string;
  messageType?: string;
  mediaUrl?: string;
  mediaName?: string;
  mediaSize?: number;
  replyToId?: string;
}): Promise<ChatMessage | null> {
  const idempotencyKey = `${params.caseId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      case_id:         params.caseId,
      sender:          'user',
      content:         params.content,
      message_type:    params.messageType ?? 'text',
      media_url:       params.mediaUrl ?? null,
      media_name:      params.mediaName ?? null,
      media_size:      params.mediaSize ?? null,
      reply_to_id:     params.replyToId ?? null,
      reactions:       {},
      idempotency_key: idempotencyKey,
    })
    .select()
    .single();

  if (error) {
    console.error('[sendChatMessage] Error:', error.message);
    return null;
  }

  return data as ChatMessage;
}
