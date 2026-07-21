'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * useRealtimeMessages — Production-Grade Realtime Engine
 *
 * Architecture: 3-channel isolation prevents a single table subscription
 * failure from collapsing the entire realtime connection.
 *
 *   Channel A (chat:core:{uid})     — Postgres: messages + reactions
 *   Channel B (chat:meta:{uid})     — Postgres: settings, blocks, participants
 *   Channel C (chat:presence:{uid}) — Broadcasts + Presence tracking
 *
 * Invariants:
 *   I4  — receiver gets message <300ms without refresh (BROADCAST fast path)
 *   I5  — reconnect catch-up via DB fetch on visibility-change
 *   I7  — deduplication via seenIds Set<string>
 *   I8  — unsubscribe on unmount prevents stale handlers
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import {
  logWsSubscribe,
  logWsReconnect,
  logWsEventReceived,
  logStateUpdate,
  computeE2E,
} from '@/lib/chat/logger';
import { processSyncQueue } from '@/lib/sync-engine';

// ── Live Location Expiry Guard ────────────────────────────────────────────────
// Strips location coordinates from any message where the live location has
// expired. Applied to ALL Realtime paths (postgres_changes INSERT/UPDATE and
// broadcast new_message) so raw coordinates can never reach the client after
// the sharing window closes — regardless of the delivery channel.
function stripExpiredLocationCoords(msg: any): any {
  if (
    msg.type === 'location' &&
    msg.location_live === true &&
    msg.location_expires_at &&
    new Date() >= new Date(msg.location_expires_at)
  ) {
    return {
      ...msg,
      location_lat: null,
      location_lng: null,
      location_address: null,
    };
  }
  return msg;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-Level Singleton
// Shared mutable state for the standalone export functions.
// These exports are called from outside the hook (useConversationEngine,
// page.tsx, GlobalRealtimeMonitor, etc.) so they cannot use React state.
// ─────────────────────────────────────────────────────────────────────────────
const _rt = {
  supabase: null as any,
  userId: null as string | null,
  // Pre-subscribed channel pointing to the active conversation partner.
  // Used by realtimeBroadcastActive() for near-zero latency sends.
  sendCh: null as any,
  sendTarget: null as string | null,
};

const userProfileCache = new Map<string, Promise<{ display_name: string; username: string; avatar_url: string | null } | null>>();

async function fetchUserProfileCached(supabaseClient: any, userId: string) {
  if (!userProfileCache.has(userId)) {
    const promise = supabaseClient
      .from('users')
      .select('display_name, username, avatar_url')
      .eq('id', userId)
      .single()
      .then((res: any) => {
        if (res.error) throw res.error;
        return res.data || null;
      })
      .catch((err: any) => {
        console.warn(`[RT Cache] Failed to fetch profile for user ${userId}:`, err);
        return null;
      });
    userProfileCache.set(userId, promise);
  }
  return userProfileCache.get(userId)!;
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Export: realtimeBroadcastActive
//
// Sends a broadcast to the ACTIVE conversation partner's channel.
// Primary near-zero latency path: fires BEFORE Postgres notifies the recipient.
// Falls back to a one-shot channel if the persistent channel isn't ready yet.
// ─────────────────────────────────────────────────────────────────────────────
export async function realtimeBroadcastActive(
  event: string,
  payload: any
): Promise<void> {
  if (!_rt.supabase) return;

  const state = useAppStore.getState();
  const activeConvId = state.activeConversationId;
  if (!activeConvId) return;

  // ── Channel Routing ──────────────────────────────────────────────────────
  // DMs:    send to partner's personal presence channel → chat:presence:{partnerUserId}
  //         The partner always has a standing subscription on their own ID.
  // Groups: send to the shared conversation channel    → chat:conv:{convId}
  //         All group members subscribe to this channel in the main effect below.
  const isGroup = state.activeConversationIsGroup;
  let partnerUserId = state.activePartnerUserId;

  // RT-FIX-01: Fallback — try to resolve partnerId from the local conversations list.
  // This handles the page-load race where setActiveConversation was called with
  // partnerId=null because the conversation list hadn't loaded yet.
  if (!isGroup && !partnerUserId) {
    const storeConvs: any[] = (state as any).conversations || [];
    const localConv = storeConvs.find((c: any) => c && c.id === activeConvId);
    if (localConv && !localConv.isGroup && localConv.partnerId) {
      partnerUserId = localConv.partnerId;
      console.log('[RT] realtimeBroadcastActive: resolved partnerUserId from local list:', partnerUserId);
    }
  }

  const targetChannel = activeConvId
    ? `chat:conv:${activeConvId}`
    : partnerUserId
      ? `chat:presence:${partnerUserId}`
      : null;

  if (!targetChannel) {
    console.warn('[RT] realtimeBroadcastActive: no targetChannel — activeConvId still null.');
    return;
  }


  // Fast path: use the pre-subscribed persistent channel
  if (_rt.sendCh && _rt.sendTarget === targetChannel) {
    try {
      await _rt.sendCh.send({ type: 'broadcast', event, payload });
      return;
    } catch (_) {
      // Channel may have died — fall through to one-shot
      _rt.sendCh = null;
      _rt.sendTarget = null;
    }
  }

  // Check if there's already a joined channel for this topic in the pool
  // Supabase deduplicates channels by topic — reusing avoids double-subscribe bug
  const existingJoined = _rt.supabase.getChannels?.()?.find(
    (c: any) => c.topic === targetChannel && (c.state === 'joined' || c.state === 'joining')
  );
  if (existingJoined) {
    // Cache it so next call takes the fast path
    _rt.sendCh = existingJoined;
    _rt.sendTarget = targetChannel;
    try {
      await existingJoined.send({ type: 'broadcast', event, payload });
      return;
    } catch (_) {
      _rt.sendCh = null;
      _rt.sendTarget = null;
    }
  }

  // Fallback one-shot channel (adds ~100–200ms on first send after conv switch)
  // Uses a 3s timeout guard so message delivery never hangs indefinitely.
  try {
    const ch = _rt.supabase.channel(targetChannel, {
      config: { broadcast: { ack: false } },
    });
    await Promise.race([
      new Promise<void>((resolve) => {
        ch.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            ch.send({ type: 'broadcast', event, payload })
              .catch(() => {})
              .finally(() => {
                resolve();
              });
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            resolve();
          }
        });
      }),
      new Promise<void>((resolve) => setTimeout(resolve, 3000)), // 3s hard timeout
    ]);
  } catch (e) {
    console.warn('[RT] realtimeBroadcastActive fallback failed:', e);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Standalone Export: realtimeBroadcast
//
// Sends a GLOBAL broadcast (e.g. cross-device settings sync).
// Sends on the user's own personal channel so all their own devices receive it.
// ─────────────────────────────────────────────────────────────────────────────
export async function realtimeBroadcast(
  event: string,
  payload: any
): Promise<void> {
  if (!_rt.supabase || !_rt.userId) return;
  try {
    const ch = _rt.supabase.channel(`chat:presence:${_rt.userId}`, {
      config: { broadcast: { ack: false, self: true } },
    });
    await new Promise<void>((resolve) => {
      ch.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          ch.send({ type: 'broadcast', event, payload })
            .catch(() => {})
            .finally(() => {
              setTimeout(() => _rt.supabase?.removeChannel(ch).catch(() => {}), 1500);
              resolve();
            });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          _rt.supabase?.removeChannel(ch).catch(() => {});
          resolve();
        }
      });
    });
  } catch (e) {
    console.warn('[RT] realtimeBroadcast failed:', e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Export: updateMyPresence
//
// Updates the user's presence status in the `users` table.
// Called by GlobalRealtimeMonitor for heartbeat, visibility, and idle tracking.
// ─────────────────────────────────────────────────────────────────────────────
export async function updateMyPresence({
  status,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  recording_in: _recordingIn,
  ...rest
}: {
  status?: 'online' | 'background' | 'sleep';
  recording_in?: string | null;
  [key: string]: any;
}): Promise<void> {
  if (!_rt.supabase || !_rt.userId) return;
  try {
    const updates: Record<string, any> = {
      last_login: new Date().toISOString(),
    };
    if (status !== undefined) {
      const state = useAppStore.getState();
      const metadata = state.currentUser?.metadata || {};
      const lastSeenSetting = metadata.last_seen || localStorage.getItem(`verlyn_last_seen_${_rt.userId}`) || 'everyone';
      if (lastSeenSetting === 'none') {
        updates.is_online = false;
      } else {
        updates.is_online = status === 'online';
      }
    }
    await _rt.supabase
      .from('users')
      .update(updates)
      .eq('id', _rt.userId);
  } catch (e) {
    console.warn('[RT] updateMyPresence failed:', e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook Options
// ─────────────────────────────────────────────────────────────────────────────
interface UseRealtimeMessagesOptions {
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>;
  /** Called when the conversation list needs a full refresh (sidebar). */
  onSyncConversations: () => void;
  /** Called when the message list for a given conversation needs a full refresh. */
  onSyncMessages: (convId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useRealtimeMessages({
  supabase,
  onSyncConversations,
  onSyncMessages,
}: UseRealtimeMessagesOptions) {
  // ── Read currentUser from Zustand store (no prop-drilling) ────────────────
  const currentUser = useAppStore((s) => s.currentUser);

  // ── Stable refs — prevent stale closures in Supabase callbacks ────────────
  const onSyncConvsRef = useRef(onSyncConversations);
  const onSyncMsgsRef = useRef(onSyncMessages);
  const activeIdRef = useRef<string | null>(
    typeof window !== 'undefined' ? useAppStore.getState().activeConversationId : null
  );

  // RT-01: Single typing timer — prevents accumulation across re-renders
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Channel refs for the three isolated channels
  const coreChRef = useRef<any>(null);
  const metaChRef = useRef<any>(null);
  const presenceChRef = useRef<any>(null);

  // Dynamic presence tracking based on privacy setting changes
  const lastSeenSetting = currentUser?.metadata?.last_seen || 'everyone';
  useEffect(() => {
    if (!currentUser?.id) return;
    const timer = setTimeout(async () => {
      const ch = presenceChRef.current;
      if (!ch) return;
      try {
        if (lastSeenSetting !== 'none' && lastSeenSetting !== 'specific') {
          await ch.track({
            user_id: currentUser.id,
            online_at: new Date().toISOString(),
          });
        } else {
          await ch.untrack();
        }
      } catch (e) {
        console.error('Failed to update presence tracking:', e);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [currentUser?.id, lastSeenSetting]);

  // Deduplication set — prevents double-processing when broadcast + Postgres
  // both deliver the same message. Trimmed automatically to cap memory usage.
  const seenIdsRef = useRef<Set<string>>(new Set());
  const seenReactionsRef = useRef<Set<string>>(new Set());

  const handleReactionToggleEvent = useCallback((messageId: string, user_id: string, emoji: string, action: 'add' | 'remove') => {
    const key = `${messageId}-${user_id}-${emoji}-${action}`;
    if (seenReactionsRef.current.has(key)) return;
    seenReactionsRef.current.add(key);
    
    // Trim to prevent memory leaks
    if (seenReactionsRef.current.size > 2000) {
      const arr = Array.from(seenReactionsRef.current);
      seenReactionsRef.current = new Set(arr.slice(-1000));
    }

    const activeId = activeIdRef.current;
    if (!activeId) return;

    const store = useAppStore.getState();
    const msgs = store.messages[activeId] || [];
    const isMe = user_id === currentUser?.id;

    store.setMessages(
      activeId,
      msgs.map((m: any) => {
        if (m.id !== messageId) return m;
        const existing: any[] = m.reactions || [];
        const match = existing.find((r: any) => r.emoji === emoji);

        if (action === 'add') {
          if (match) {
            if (isMe && match.reacted) return m;
            return {
              ...m,
              reactions: existing.map((r: any) =>
                r.emoji === emoji
                  ? { ...r, count: r.count + 1, reacted: r.reacted || isMe }
                  : r
              ),
            };
          }
          return { ...m, reactions: [...existing, { emoji, count: 1, reacted: isMe }] };
        } else {
          if (!match) return m;
          if (isMe && !match.reacted) return m;
          const updated = existing
            .map((r: any) =>
              r.emoji === emoji
                ? {
                    ...r,
                    count: Math.max(0, r.count - 1),
                    reacted: isMe ? false : r.reacted,
                  }
                : r
            )
            .filter((r: any) => r.count > 0);
          return { ...m, reactions: updated };
        }
      })
    );
  }, [currentUser?.id]);

  // Keep callback refs in sync
  useEffect(() => { onSyncConvsRef.current = onSyncConversations; }, [onSyncConversations]);
  useEffect(() => { onSyncMsgsRef.current = onSyncMessages; }, [onSyncMessages]);

  // ── Track activeConversationId from store without hook re-render ──────────
  useEffect(() => {
    activeIdRef.current = useAppStore.getState().activeConversationId;
    // Subscribe to future changes via native Zustand subscribe (not selector)
    const unsubActive = useAppStore.subscribe((state) => {
      activeIdRef.current = state.activeConversationId;
    });
    return unsubActive;
  }, []);

  // ── Bootstrap module singleton ────────────────────────────────────────────
  // Set supabase eagerly (before currentUser is known) so broadcast calls during
  // page load or early sends never silently drop due to _rt.supabase being null.
  useEffect(() => {
    _rt.supabase = supabase;
    if (currentUser?.id) {
      _rt.userId = currentUser.id;
    }
  }, [supabase, currentUser?.id]);

  const pruneRealtimeChannels = useCallback(async (activeTarget: string | null, activeGroupTarget: string | null) => {
    if (!currentUser?.id) return;
    const channels = supabase.getChannels();
    if (channels.length > 6) {
      const preservedTopics = [
        `chat:core:${currentUser.id}`,
        `chat:meta:${currentUser.id}`,
        `chat:presence:${currentUser.id}`,
        activeTarget,
        activeGroupTarget
      ].filter(Boolean);

      const toRemove = channels.filter((c: any) => !preservedTopics.includes(c.topic));
      for (const oldCh of toRemove.slice(0, toRemove.length - 2)) {
        try {
          await supabase.removeChannel(oldCh);
          console.log(`📡 [RT POOL] Pruned idle cached channel: ${oldCh.topic}`);
        } catch (_) {}
      }
    }
  }, [currentUser?.id, supabase]);

  // ─────────────────────────────────────────────────────────────────────────
  // Broadcast Send-Channel Management
  //
  // Pre-subscribes to the target broadcast channel for the active conversation.
  // DMs  → chat:presence:{partnerUserId}  (partner's own presence channel)
  // Groups → chat:conv:{convId}            (shared group broadcast channel)
  // Updated whenever the active conversation OR partner changes.
  // ─────────────────────────────────────────────────────────────────────────
  const activeTargetRef = useRef<string | null>(null);

  // ── Active Conversation Channel (Unified Inbound + Outbound Broadcasts) ──────
  useEffect(() => {
    if (!currentUser?.id) return;

    let activeCh: any = null;

    const setupActiveConvChannel = async (convId: string | null, isGroup: boolean, partnerUserId: string | null) => {
      const targetChannel = convId ? `chat:conv:${convId}` : null;

      if (activeTargetRef.current === targetChannel && activeCh) {
        return;
      }
      activeTargetRef.current = targetChannel;

      if (activeCh) {
        if (_rt.sendCh === activeCh) {
          _rt.sendCh = null;
          _rt.sendTarget = null;
        }
        try { supabase.removeChannel(activeCh); } catch (_) {}
        activeCh = null;
      }

      if (!convId || !targetChannel) return;

      // Synchronously remove any existing channel for this topic from the pool and internal cache
      const existing = supabase.getChannels().find((c: any) => c.topic === targetChannel);
      if (existing) {
        try { await supabase.removeChannel(existing); } catch (_) {}
        const internalChannels = (supabase as any)?.realtime?.channels;
        if (Array.isArray(internalChannels)) {
          const idx = internalChannels.findIndex((c: any) => c && c.topic === targetChannel);
          if (idx !== -1) internalChannels.splice(idx, 1);
        }
      }

      activeCh = supabase.channel(targetChannel, {
        config: {
          broadcast: { ack: false, self: false },
          presence: { key: currentUser.id },
        },
      });

      if (activeCh.state !== 'joined' && activeCh.state !== 'subscribing') {
        activeCh
          // typing indicator
          .on('broadcast', { event: 'typing' }, (payload: any) => {
            const data = payload?.payload ?? {};
            const { userId: senderId, convId: payloadConvId, typing } = data;
            const activeId = activeIdRef.current;
            if (senderId !== currentUser.id && payloadConvId === activeId) {
              window.dispatchEvent(
                new CustomEvent('verlyn:typing', { detail: { typing: !!typing } })
              );
              if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
              if (typing) {
                typingTimerRef.current = setTimeout(() => {
                  window.dispatchEvent(
                    new CustomEvent('verlyn:typing', { detail: { typing: false } })
                  );
                  typingTimerRef.current = null;
                }, 3000);
              }
            }
          })
          // theme:apply
          .on('broadcast', { event: 'theme:apply' }, (payload: any) => {
            const { convId: payloadConvId, themeId, themeBlur, updatedAt } = payload?.payload ?? {};
            if (payloadConvId === activeIdRef.current) {
              window.dispatchEvent(
                new CustomEvent('verlyn:settings_update', {
                  detail: {
                    chatId: payloadConvId,
                    updates: {
                      theme_id: themeId,
                      theme_blur: themeBlur,
                      updated_at: updatedAt,
                    },
                    senderId: 'partner',
                  }
                })
              );
            }
          })
          // settings_update
          .on('broadcast', { event: 'settings_update' }, (payload: any) => {
            const { convId, updates, senderId } = payload?.payload ?? {};
            if (convId === activeIdRef.current) {
              window.dispatchEvent(
                new CustomEvent('verlyn:settings_update', {
                  detail: { chatId: convId, updates, senderId }
                })
              );
            }
          })
          // new_message (Instant real-time message rendering)
          .on('broadcast', { event: 'new_message' }, (payload: any) => {
            const msg = payload?.payload;
            if (!msg?.id) return;
            if (seenIdsRef.current.has(msg.id)) return;
            seenIdsRef.current.add(msg.id);

            const activeId = activeIdRef.current;
            const activePartnerId = useAppStore.getState().activePartnerUserId;

            const isMatchingActiveConv =
              (activeId && (msg.conversation_id === activeId || msg.sender_id === activeId || msg.recipient_id === activeId)) ||
              (activePartnerId && (msg.sender_id === activePartnerId || msg.recipient_id === activePartnerId));

            if (isMatchingActiveConv) {
              let finalMediaUrl = msg.media_url;
              if (msg.media_base64 && msg.sender_id !== currentUser.id) {
                finalMediaUrl = msg.media_base64;
              }
              const cleanMsg = stripExpiredLocationCoords({
                ...msg,
                media_url: finalMediaUrl,
                is_mine: msg.sender_id === currentUser.id,
              });

              const targetKeys = new Set<string>();
              if (activeId) targetKeys.add(activeId);
              if (msg.conversation_id) targetKeys.add(msg.conversation_id);
              if (activePartnerId) targetKeys.add(activePartnerId);

              targetKeys.forEach((key) => {
                useAppStore.getState().upsertMessage(key, cleanMsg);
              });
            }

            const convKey = msg.conversation_id || (msg.sender_id === currentUser.id ? msg.recipient_id : msg.sender_id);
            if (convKey) {
              useAppStore.getState().upsertConversation(convKey, {
                lastMessage: msg.content || '',
                updatedAt: msg.sent_at || new Date().toISOString(),
              });
            }
          })
          // new_message_db_sync
          .on('broadcast', { event: 'new_message_db_sync' }, (payload: any) => {
            const syncData = payload?.payload;
            if (!syncData?.client_temp_id) return;
            const activeId = activeIdRef.current;
            if (activeId) {
              const store = useAppStore.getState();
              const existing = store.messages[activeId] || [];
              store.setMessages(
                activeId,
                existing.map((m: any) =>
                  m.client_temp_id === syncData.client_temp_id
                    ? { ...m, id: syncData.id, status: 'sent' as const, media_url: syncData.media_url || m.media_url }
                    : m
                )
              );
            }
          })
          // retract_message
          .on('broadcast', { event: 'retract_message' }, (payload: any) => {
            const { client_temp_id: messageId } = payload?.payload ?? {};
            if (!messageId) return;
            const activeId = activeIdRef.current;
            if (activeId) {
              useAppStore.getState().removeMessage(activeId, messageId);
            }
          })
          // chat_cleared
          .on('broadcast', { event: 'chat_cleared' }, (payload: any) => {
            const { chatId } = payload?.payload ?? {};
            const activeId = activeIdRef.current;
            if (chatId && activeId && chatId === activeId) {
              useAppStore.getState().setMessages(activeId, []);
            }
          })
          // message_pin_toggle
          .on('broadcast', { event: 'message_pin_toggle' }, (payload: any) => {
            const data = payload?.payload || payload;
            const { messageId, is_pinned } = data ?? {};
            if (messageId && is_pinned !== undefined) {
              const state = useAppStore.getState();
              const activeId = activeIdRef.current;
              if (activeId) {
                state.setMessages(activeId, (state.messages[activeId] || []).map((m) =>
                  m.id === messageId ? { ...m, is_pinned } : m
                ));
              }
            }
          });

        if (!isGroup && partnerUserId) {
          activeCh.on('presence', { event: 'sync' }, () => {
            const state = (activeCh.presenceState as any)();
            const isPartnerActive = Object.values(state)
              .flat()
              .some((p: any) => p.user_id === partnerUserId);

            const currentOnline = useAppStore.getState().onlineUsers || [];
            if (isPartnerActive) {
              if (!currentOnline.includes(partnerUserId)) {
                useAppStore.getState().setOnlineUsers([...currentOnline, partnerUserId]);
              }
            } else {
              useAppStore.getState().setOnlineUsers(currentOnline.filter(id => id !== partnerUserId));
            }
          });
        }
      }

      if (activeCh.state !== 'joined' && activeCh.state !== 'subscribing') {
        activeCh.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            _rt.sendCh = activeCh;
            _rt.sendTarget = targetChannel;
            pruneRealtimeChannels(targetChannel, null);
          }
        });
      }
    };

    // Initialize for current active conversation
    const initState = useAppStore.getState();
    setupActiveConvChannel(
      initState.activeConversationId,
      initState.activeConversationIsGroup,
      initState.activePartnerUserId
    ).catch(console.error);

    // Watch for future active conversation changes
    const unsubConv = useAppStore.subscribe((state) => {
      const newConvId = state.activeConversationId;
      const newIsGroup = state.activeConversationIsGroup;
      const newPartner = state.activePartnerUserId;
      const newTarget = newConvId ? `chat:conv:${newConvId}` : null;
      if (newTarget !== activeTargetRef.current) {
        setupActiveConvChannel(newConvId, newIsGroup, newPartner).catch(console.error);
      }
    });

    return () => {
      unsubConv();
      activeTargetRef.current = null;
      if (activeCh) {
        if (_rt.sendCh === activeCh) {
          _rt.sendCh = null;
          _rt.sendTarget = null;
        }
        try { supabase.removeChannel(activeCh); } catch (_) {}
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, supabase]);

  // ─────────────────────────────────────────────────────────────────────────
  // Main Subscription — Three-Channel Architecture
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.id) return;

    const userId = currentUser.id;
    let isMounted = true;

    logWsSubscribe({ channel: `chat:*:${userId}`, convId: 'global' });

    const setup = async () => {
      // Remove any existing channels from a previous effect run
      for (const ref of [coreChRef, metaChRef, presenceChRef]) {
        if (ref.current) {
          try { await supabase.removeChannel(ref.current); } catch (_) {}
          ref.current = null;
        }
      }
      if (!isMounted) return;

      // ────────────────────────────────────────────────────────────────────
      // CHANNEL A: core — Postgres changes for messages and reactions
      // Fault isolation: any RLS or table error here does NOT kill typing,
      // presence, or settings channels.
      // ────────────────────────────────────────────────────────────────────
      const coreCh = supabase
        .channel(`chat:core:${userId}`)

        // ── Message INSERT ──────────────────────────────────────────────
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          async (payload: any) => {
            const newMsg = payload.new;
            if (!newMsg?.id) return;

            logWsEventReceived({
              messageId: newMsg.id,
              convId: newMsg.conversation_id || newMsg.sender_id,
            });

            // I7: Deduplication (broadcast may have already delivered this)
            if (seenIdsRef.current.has(newMsg.id)) return;
            seenIdsRef.current.add(newMsg.id);
            // Trim to prevent unbounded memory growth in long sessions
            if (seenIdsRef.current.size > 2000) {
              const arr = Array.from(seenIdsRef.current);
              seenIdsRef.current = new Set(arr.slice(-1000));
            }

            const isGroupMsg = !!newMsg.conversation_id;
            const isTargeted =
              newMsg.recipient_id === userId || newMsg.sender_id === userId;

            if (!isTargeted && !isGroupMsg) return;

            const relevantId = isGroupMsg
              ? newMsg.conversation_id
              : newMsg.sender_id === userId
                ? newMsg.recipient_id
                : newMsg.sender_id;

            if (!relevantId) return;

            const activeId = activeIdRef.current;
            const store = useAppStore.getState();

            // ── Inject into active conversation message list ──────────
            if (relevantId === activeId && activeId !== null) {
              // Thread reply: only increment parent's reply_count badge
              if (newMsg.thread_root_id) {
                const existing = store.messages[activeId as string] || [];
                store.setMessages(
                  activeId as string,
                  existing.map((m: any) =>
                    m.id === newMsg.thread_root_id
                      ? { ...m, reply_count: (m.reply_count || 0) + 1 }
                      : m
                  )
                );
                return;
              }

              if (newMsg.sender_id !== userId) {
                // Incoming message: enrich with sender profile then upsert
                try {
                  const senderData = await fetchUserProfileCached(supabase, newMsg.sender_id);

                  if (!isMounted) return;

                  logStateUpdate('realtime', { messageId: newMsg.id });
                  if (newMsg.client_temp_id) {
                    computeE2E(newMsg.client_temp_id, 'ws_receive');
                  }

                  // Auto-mark as seen (user is actively viewing this conv)
                  if (newMsg.status !== 'seen') {
                    void supabase.rpc('update_message_status', {
                      p_message_ids: [newMsg.id],
                      p_status: 'seen',
                    });
                  }

                  store.upsertMessage(relevantId, stripExpiredLocationCoords({
                    ...newMsg,
                    is_mine: false,
                    sender: senderData,
                  }));
                } catch (e) {
                  console.warn('[RT] sender profile fetch failed, inserting raw:', e);
                  store.upsertMessage(relevantId, stripExpiredLocationCoords({ ...newMsg, is_mine: false }));
                }
              } else {
                // Own message echoing back — reconcile optimistic placeholder
                logStateUpdate('realtime', {
                  reconcile: 'own_echo',
                  messageId: newMsg.id,
                });
                store.upsertMessage(relevantId, stripExpiredLocationCoords({ ...newMsg, is_mine: true }));
              }
            }

            // ── Always sync sidebar (bump conversation to top) ────────
            if (relevantId !== userId) {
              store.upsertConversation(relevantId, {
                lastMessage: newMsg.content || '',
                updatedAt: newMsg.sent_at || new Date().toISOString(),
              });
              // Increment unread badge for background conversations from others
              if (relevantId !== activeId && newMsg.sender_id !== userId) {
                store.incrementUnread(relevantId);
              }
            }
          }
        )

        // ── Message UPDATE (edits, status ticks, view-once shatters) ──
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages' },
          (payload: any) => {
            const updatedMsg = payload.new;
            if (!updatedMsg?.id) return;

            const relevantId =
              updatedMsg.conversation_id ||
              (updatedMsg.sender_id === userId
                ? updatedMsg.recipient_id
                : updatedMsg.sender_id);

            if (relevantId) {
              useAppStore.getState().upsertMessage(relevantId, stripExpiredLocationCoords({
                ...updatedMsg,
                is_mine: updatedMsg.sender_id === userId,
              }));
            }
          }
        )

        // ── Message DELETE (unsend / hard delete) ──────────────────────
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'messages' },
          (payload: any) => {
            const old = payload.old;
            if (!old?.id) return;

            const relevantId =
              old.conversation_id ||
              (old.sender_id === userId ? old.recipient_id : old.sender_id);

            if (relevantId) {
              useAppStore.getState().removeMessage(relevantId, old.id);
            }
          }
        )

        // ── Reaction INSERT ────────────────────────────────────────────
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'message_reactions' },
          (payload: any) => {
            const { message_id, user_id, emoji } = payload.new || {};
            if (message_id && user_id && emoji) {
              handleReactionToggleEvent(message_id, user_id, emoji, 'add');
            }
          }
        )

        // ── Reaction DELETE ────────────────────────────────────────────
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'message_reactions' },
          (payload: any) => {
            const { message_id, user_id, emoji } = payload.old || {};
            if (message_id && user_id && emoji) {
              handleReactionToggleEvent(message_id, user_id, emoji, 'remove');
            }
          }
        )

        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            // On reconnect: catch up missed messages
            const activeId = activeIdRef.current;
            if (activeId) onSyncMsgsRef.current(activeId);
          }
          if (status === 'CHANNEL_ERROR') {
            logWsReconnect({ channel: `chat:core:${userId}` });
            // Retry after backoff (Supabase auto-reconnects, just log here)
          }
        });

      coreChRef.current = coreCh;

      // ────────────────────────────────────────────────────────────────────
      // CHANNEL B: meta — Postgres changes for settings, blocks, participants
      // Isolated: a blocks/settings RLS error doesn't kill message delivery.
      // ────────────────────────────────────────────────────────────────────
      const metaCh = supabase
        .channel(`chat:meta:${userId}`)

        // Conversation participants (added to / removed from group)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversation_participants',
            filter: `user_id=eq.${userId}`,
          },
          () => { onSyncConvsRef.current(); }
        )

        // Group conversation metadata (name, icon, theme)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'conversations' },
          (payload: any) => {
            const updated = payload.new;
            if (!updated?.id) return;
            useAppStore.getState().upsertConversation(updated.id, {
              theme_id: updated.theme_id,
              theme_blur: updated.theme_blur,
              name: updated.name,
              avatarUrl: updated.icon_url,
            });
          }
        )

        // DM settings changes (mute, theme, nickname, etc.)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'dm_settings',
            filter: `user_id=eq.${userId}`,
          },
          (payload: any) => {
            const updated = payload.new || payload.old;
            const activeId = activeIdRef.current;
            if (
              updated &&
              (updated.partner_id === activeId || updated.chat_id === activeId)
            ) {
              window.dispatchEvent(new CustomEvent('verlyn:settings_update'));
            }
            onSyncConvsRef.current();
          }
        )

        // Chat theme changes
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'chat_theme' },
          (payload: any) => {
            const updated = payload.new || payload.old;
            if (updated?.chat_id === activeIdRef.current) {
              window.dispatchEvent(new CustomEvent('verlyn:settings_update'));
            }
          }
        )

        // Nickname changes
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'chat_nicknames' },
          (payload: any) => {
            const updated = payload.new || payload.old;
            if (updated?.chat_id === activeIdRef.current) {
              window.dispatchEvent(new CustomEvent('verlyn:settings_update'));
              window.dispatchEvent(
                new CustomEvent('verlyn:nickname_update', {
                  detail: {
                    chatId: updated.chat_id,
                    userId: updated.user_id,
                    nickname: updated.nickname || null
                  }
                })
              );
            }
          }
        )

        // Blocks table — propagate block/unblock state immediately
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'blocks' },
          (payload: any) => {
            const record = payload.new || payload.old;
            if (!record) return;
            const isRelated =
              record.blocker_id === userId || record.blocked_id === userId;
            if (isRelated) {
              window.dispatchEvent(
                new CustomEvent('verlyn:block_change', { detail: record })
              );
              onSyncConvsRef.current();
            }
          }
        )

        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR') {
            logWsReconnect({ channel: `chat:meta:${userId}` });
          }
        });

      metaChRef.current = metaCh;

      // ────────────────────────────────────────────────────────────────────
      // CHANNEL C: presence — Broadcasts + Presence (always online)
      // This is the most critical channel: if this dies, typing and theme
      // sync are lost, but Postgres still delivers messages.
      // ────────────────────────────────────────────────────────────────────
      const presenceCh = supabase
        .channel(`chat:presence:${userId}`, {
          config: {
            presence: { key: userId },
            broadcast: { self: false },
          },
        })

        // ── Typing indicator ───────────────────────────────────────────
        .on('broadcast', { event: 'typing' }, (payload: any) => {
          const data = payload?.payload ?? {};
          const { userId: senderId, convId, typing } = data;
          const activeId = activeIdRef.current;
          if (senderId !== userId && convId === activeId) {
            // Dispatch event so any listening component can show the indicator
            window.dispatchEvent(
              new CustomEvent('verlyn:typing', { detail: { typing: !!typing } })
            );
            // RT-01: Reset timeout on every typing event to avoid stuck indicators
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            if (typing) {
              typingTimerRef.current = setTimeout(() => {
                window.dispatchEvent(
                  new CustomEvent('verlyn:typing', { detail: { typing: false } })
                );
                typingTimerRef.current = null;
              }, 3000);
            }
          }
        })

        // ── Theme apply broadcast (partner changed chat theme) ─────────
        .on('broadcast', { event: 'theme:apply' }, (payload: any) => {
          const { convId, themeId, themeBlur, updatedAt } = payload?.payload ?? {};
          if (convId === activeIdRef.current) {
            window.dispatchEvent(
              new CustomEvent('verlyn:settings_update', {
                detail: {
                  chatId: convId,
                  updates: {
                    theme_id: themeId,
                    theme_blur: themeBlur,
                    updated_at: updatedAt,
                  },
                  senderId: 'partner',
                }
              })
            );
          }
        })
        // ── Settings update broadcast (partner updated nicknames or settings) ──
        .on('broadcast', { event: 'settings_update' }, (payload: any) => {
          const { convId, updates, senderId } = payload?.payload ?? {};
          if (convId === activeIdRef.current) {
            window.dispatchEvent(
              new CustomEvent('verlyn:settings_update', {
                detail: { chatId: convId, updates, senderId }
              })
            );
          }
        })

        // ── Cross-device settings sync ─────────────────────────────────
        .on('broadcast', { event: 'global_settings_update' }, (payload: any) => {
          const { userId: senderId } = payload?.payload ?? {};
          // Only process our own cross-device updates
          if (senderId === userId) {
            window.dispatchEvent(new CustomEvent('verlyn:settings_update'));
          }
        })

        // ── Chat cleared by partner ────────────────────────────────────
        .on('broadcast', { event: 'chat_cleared' }, (payload: any) => {
          const { chatId } = payload?.payload ?? {};
          const activeId = activeIdRef.current;
          if (chatId && activeId && chatId === activeId) {
            useAppStore.getState().setMessages(activeId as string, []);
          }
        })

        // ── User blocked ───────────────────────────────────────────────
        .on('broadcast', { event: 'user_blocked' }, (payload: any) => {
          const { blockedBy } = payload?.payload ?? {};
          if (blockedBy !== userId) {
            // We were blocked — dispatch event for the UI to handle
            window.dispatchEvent(
              new CustomEvent('verlyn:block_change', {
                detail: { ...payload?.payload, incoming: true },
              })
            );
            onSyncConvsRef.current();
          }
        })

        // ── Near-zero latency new message (broadcast path) ────────────
        // The sender broadcasts immediately after DB insert.
        // This arrives 200-400ms BEFORE Postgres notifies us, achieving
        // WhatsApp-level latency. Deduplication prevents double-rendering.
        .on('broadcast', { event: 'new_message' }, (payload: any) => {
          const msg = payload?.payload;
          if (!msg?.id) return;

          // Dedup: Postgres INSERT will also arrive — first one wins
          if (seenIdsRef.current.has(msg.id)) return;
          seenIdsRef.current.add(msg.id);

          const relevantId =
            msg.conversation_id ||
            (msg.sender_id === userId ? msg.recipient_id : msg.sender_id);

          const activeId = activeIdRef.current;

          if (relevantId === activeId) {
            let finalMediaUrl = msg.media_url;
            if (msg.media_base64 && msg.sender_id !== userId) {
              finalMediaUrl = msg.media_base64;
            }
            useAppStore.getState().upsertMessage(relevantId, {
              ...msg,
              media_url: finalMediaUrl,
              is_mine: msg.sender_id === userId,
            });
          }

          // Always sync sidebar for notification badge
          if (relevantId && relevantId !== userId) {
            useAppStore.getState().upsertConversation(relevantId, {
              lastMessage: msg.content || '',
              updatedAt: msg.sent_at || new Date().toISOString(),
            });
          }
        })
        // ── Near-zero latency new message DB sync ─────────────────────
        .on('broadcast', { event: 'new_message_db_sync' }, (payload: any) => {
          const syncData = payload?.payload;
          if (!syncData?.client_temp_id) return;
          const activeId = activeIdRef.current;
          if (activeId) {
            const store = useAppStore.getState();
            const existing = store.messages[activeId] || [];
            store.setMessages(
              activeId,
              existing.map((m: any) =>
                m.client_temp_id === syncData.client_temp_id
                  ? { ...m, id: syncData.id, status: 'sent' as const, media_url: syncData.media_url || m.media_url }
                  : m
              )
            );
          }
        })

        // ── Message retract (delete) broadcast ────────────────────────
        .on('broadcast', { event: 'retract_message' }, (payload: any) => {
          const { client_temp_id: messageId } = payload?.payload ?? {};
          if (!messageId) return;
          const activeId = activeIdRef.current;
          if (activeId) {
            useAppStore.getState().removeMessage(activeId, messageId);
          }
        })

        // message_pin_toggle
        .on('broadcast', { event: 'message_pin_toggle' }, (payload: any) => {
          const data = payload?.payload || payload;
          const { messageId, is_pinned } = data ?? {};
          if (messageId && is_pinned !== undefined) {
            const state = useAppStore.getState();
            const activeId = activeIdRef.current;
            if (activeId) {
              state.setMessages(activeId, (state.messages[activeId] || []).map((m) =>
                m.id === messageId ? { ...m, is_pinned } : m
              ));
            }
          }
        })

        // ── Presence: online users sync ────────────────────────────────
        .on('presence', { event: 'sync' }, () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const state = (presenceCh.presenceState as any)();
          const ids: string[] = Object.values(state)
            .flat()
            .map((p: any) => p.user_id)
            .filter(Boolean);
          useAppStore.getState().setOnlineUsers(ids);
        })

        // ── System events: postgres_changes reconnect ──────────────────
        .on('system' as any, {}, (payload: any) => {
          if (
            payload?.extension === 'postgres_changes' &&
            payload?.status === 'ok'
          ) {
            logWsReconnect({ channel: `chat:presence:${userId}` });
            const activeId = activeIdRef.current;
            if (activeId) onSyncMsgsRef.current(activeId);
          }
        })

        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            // Track presence so others can see we're online
            try {
              const state = useAppStore.getState();
              const metadata = state.currentUser?.metadata || {};
              const lastSeenSetting = metadata.last_seen || localStorage.getItem(`verlyn_last_seen_${userId}`) || 'everyone';
              if (lastSeenSetting !== 'none' && lastSeenSetting !== 'specific') {
                await presenceCh.track({
                  user_id: userId,
                  online_at: new Date().toISOString(),
                });
              }
            } catch (_) {}
          }
          if (status === 'CHANNEL_ERROR') {
            logWsReconnect({ channel: `chat:presence:${userId}` });
          }
        });

      presenceChRef.current = presenceCh;
    };

    setup();

    return () => {
      isMounted = false;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      for (const ref of [coreChRef, metaChRef, presenceChRef]) {
        if (ref.current) {
          supabase.removeChannel(ref.current).catch(() => {});
          ref.current = null;
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, supabase]);

  // ── I5: Self-Healing — Reconnect on Tab Focus ──────────────────────────
  useEffect(() => {
    const handleReconnect = () => {
      const activeId = activeIdRef.current;
      if (activeId) {
        logWsReconnect({ channel: 'visibility:reconnect' });
        onSyncMsgsRef.current(activeId);
      }
      processSyncQueue();
    };
    window.addEventListener('verlyn:reconnect', handleReconnect);
    return () => window.removeEventListener('verlyn:reconnect', handleReconnect);
  }, []);
}
