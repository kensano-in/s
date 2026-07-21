'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Bell, X } from 'lucide-react';
import { useRealtimeMessages, updateMyPresence } from '@/hooks/useRealtimeMessages';
import { useQueryClient } from '@tanstack/react-query';
import { playSound } from '@/lib/sound-generator';
import { getMessagesDB, checkMyDetailedRestrictionsDB } from '@/app/(main)/messages/actions';
import { toggleFollowDB } from '@/app/(main)/profile/actions';

// Heartbeat interval — keeps is_online = true in DB while user is on any page
const HEARTBEAT_INTERVAL_MS = 30_000;

interface Toast {
  id: number;
  senderName: string;
  senderAvatar?: string;
  convId: string;
  message: string;
  type: 'message' | 'notification';
}

export default function GlobalRealtimeMonitor() {
  const currentUser = useAppStore((s) => s.currentUser);
  const setSyncStatus = useAppStore((s) => s.setSyncStatus);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const addNotification = useAppStore((s) => s.addNotification);

  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Unified Realtime Messaging Pipeline ─────────────────────────────────────
  const handleSyncConversations = useCallback(async () => {
    if (!currentUser?.id) return;
    queryClient.invalidateQueries({ queryKey: ['conversations', currentUser.id] });
  }, [currentUser?.id, queryClient]);

  // Full message sync: fetch latest messages from DB and push to Zustand store.
  // Called by the realtime hook on reconnect, visibility-change recovery, and
  // the 4-second fallback poll when WebSocket is broken.
  const handleSyncMessages = useCallback(async (convId: string) => {
    if (!currentUser?.id || !convId) return;
    // Refresh sidebar preview
    queryClient.invalidateQueries({ queryKey: ['conversations', currentUser.id] });
    // Fetch latest messages and push into Zustand so the open chat stays live
    try {
      const state = useAppStore.getState();
      const isGroup = state.activeConversationIsGroup;
      const res = await getMessagesDB(currentUser.id, convId, isGroup, 50);
      if (res.success && res.data && res.data.length > 0) {
        const mapped = (res.data as any[]).map((m: any) => ({
          ...m,
          is_mine: m.sender_id === currentUser.id,
          status: m.status ?? 'sent',
        })).reverse(); // DB returns DESC, reverse to ASC for rendering

        const existing = useAppStore.getState().messages[convId] || [];
        const mergedMap = new Map<string, any>();

        // 1. Insert fetched (database confirmed) messages first
        mapped.forEach((msg: any) => {
          mergedMap.set(msg.id, msg);
          if (msg.client_temp_id) {
            mergedMap.set(msg.client_temp_id, msg);
          }
        });

        // 2. Retain any existing optimistic or failed messages (they haven't hit DB yet, or failed)
        existing.forEach((msg: any) => {
          const exists = mergedMap.has(msg.id) || (msg.client_temp_id && mergedMap.has(msg.client_temp_id));
          const isUnconfirmed = msg.status === 'sending' || msg.status === 'failed' || msg.status === 'error';
          if (isUnconfirmed || !exists) {
            mergedMap.set(msg.id, msg);
          }
        });

        const mergedList = Array.from(new Set(mergedMap.values()));
        mergedList.sort((a, b) => {
          const timeA = a.sent_at ? new Date(a.sent_at).getTime() : Date.now();
          const timeB = b.sent_at ? new Date(b.sent_at).getTime() : Date.now();
          return timeA - timeB;
        });

        useAppStore.getState().setMessages(convId, mergedList);
      }
    } catch (_) {/* non-fatal — realtime is primary path */}
  }, [currentUser?.id, queryClient]);

  useRealtimeMessages({
    supabase,
    onSyncConversations: handleSyncConversations,
    onSyncMessages: handleSyncMessages,
  });

  // ── Global Online Heartbeat ──────────────────────────────────────────────────
  // Keeps is_online = true in the DB every 30s while the user is active on ANY
  // page in the app. This decouples online presence from the messages page.
  // ── Global Presence, Foreground, Background & Sleep Engine ──────────────────
  useEffect(() => {
    if (!currentUser?.id) return;

    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let isIdle = false;

    let lastReset = 0;
    const resetIdleTimer = () => {
      const now = Date.now();
      if (now - lastReset < 10000 && !isIdle) return; // Throttle to max once per 10s when already active
      lastReset = now;

      if (idleTimer) clearTimeout(idleTimer);

      if (isIdle) {
        isIdle = false;
        if (document.visibilityState === 'visible') {
          void updateMyPresence({ status: 'online' });
        }
      }

      idleTimer = setTimeout(() => {
        isIdle = true;
        void updateMyPresence({ status: 'sleep' });
      }, 5 * 60 * 1000); // 5 minutes idle
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (idleTimer) clearTimeout(idleTimer);
        void updateMyPresence({ status: 'background' });
      } else {
        isIdle = false;
        void updateMyPresence({ status: 'online' });
        resetIdleTimer();
      }
    };

    resetIdleTimer();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const interactionEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    interactionEvents.forEach(evt => {
      window.addEventListener(evt, resetIdleTimer, { passive: true });
    });

    const heartbeatTimer = setInterval(() => {
      if (document.visibilityState === 'visible' && !isIdle) {
        void updateMyPresence({ status: 'online' });
      }
    }, HEARTBEAT_INTERVAL_MS);

    const handleUnload = () => {
      if (currentUser?.id) {
        navigator.sendBeacon?.(
          `/api/presence-offline`,
          JSON.stringify({ userId: currentUser.id })
        );
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      clearInterval(heartbeatTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      interactionEvents.forEach(evt => {
        window.removeEventListener(evt, resetIdleTimer);
      });
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [currentUser?.id]);

  // ── Notification Listener ────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.id) return;

    const channel = supabase
      .channel(`monitor:notifs:${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`,
        },
        async (payload: any) => {
          const notif = payload.new;

          // Push into Zustand notification store
          addNotification({
            id: notif.id,
            user_id: notif.user_id,
            actor_id: notif.actor_id,
            type: notif.type,
            entity_id: notif.entity_id,
            entity_type: notif.entity_type,
            body: notif.body,
            isRead: notif.is_read,
            priority: notif.priority || 'medium',
            created_at: notif.created_at,
            metadata: notif.data,
          } as any);

          // Build live toast
          const meta = currentUserRef.current?.metadata || {};
          const pushEnabled = meta.push_notifs_enabled !== false;

          const activeConvId = useAppStore.getState().activeConversationId;
          const isFromActiveChat = notif.type === 'new_message' && notif.data?.conversation_id && notif.data.conversation_id === activeConvId;

          let categoryAllowed = true;
          if (isFromActiveChat) {
            categoryAllowed = false; // Mute active chat alerts
          } else if (notif.type === 'new_message') {
            categoryAllowed = meta.pref_messages !== false;
          } else if (notif.type === 'mention' || notif.type === 'tag') {
            categoryAllowed = meta.pref_mentions !== false;
          } else if (notif.type === 'call' || notif.type === 'video_call') {
            categoryAllowed = meta.pref_calls !== false;
          } else if (notif.type === 'community') {
            categoryAllowed = meta.pref_communities !== false;
          }

          const shouldNotify = pushEnabled && categoryAllowed;

          const currentHour = new Date().getHours();
          const isQuietHours = meta.quietHoursActive && Array.isArray(meta.selectedQuietHours) && meta.selectedQuietHours.includes(currentHour);

          const showPreview = meta.message_preview !== false;
          const toastMessage = showPreview ? (notif.body || '') : 'Sent a message';

          const toast: Toast = {
            id: Date.now(),
            senderName: notif.title || 'New notification',
            message: toastMessage,
            convId: notif.data?.conversation_id || '',
            type: notif.type === 'new_message' ? 'message' : 'notification',
          };

          // Enrich with avatar from TanStack Query conversation cache
          if (notif.data?.conversation_id) {
            const cachedConvs: any[] = queryClient.getQueryData(['conversations', currentUserRef.current?.id]) || [];
            const matchedConv = cachedConvs.find((c: any) => c.id === notif.data.conversation_id);
            if (matchedConv?.avatarUrl) toast.senderAvatar = matchedConv.avatarUrl;
          }

          if (shouldNotify) {
            setToasts((prev) => [toast, ...prev.slice(0, 2)]); // max 3 toasts
          }

          // Play premium notification sound based on category
          try {
            let soundCategory = 'default';

            if (meta.silent_mode || isQuietHours) {
              soundCategory = 'silent';
            } else {
              if (notif.type === 'new_message') {
                if (notif.data?.is_group || notif.data?.isGroup) {
                  soundCategory = meta.sound_groups || meta.soundPreset || 'default';
                } else if (notif.data?.is_request || notif.data?.isRequest) {
                  soundCategory = meta.sound_requests || meta.soundPreset || 'default';
                } else if (notif.data?.is_secret || notif.data?.isSecret || notif.data?.ghost_mode) {
                  soundCategory = meta.sound_secret || meta.soundPreset || 'default';
                } else {
                  soundCategory = meta.sound_dms || meta.soundPreset || 'default';
                }
              } else if (notif.type === 'mention' || notif.type === 'tag') {
                soundCategory = meta.sound_mentions || meta.soundPreset || 'default';
              } else if (notif.type === 'call') {
                soundCategory = meta.sound_calls || meta.soundPreset || 'default';
              } else if (notif.type === 'video_call') {
                soundCategory = meta.sound_video_calls || meta.soundPreset || 'default';
              } else {
                soundCategory = meta.soundPreset || 'default';
              }
            }

            if (shouldNotify) {
              playSound(soundCategory as any);
            }

            // Trigger vibration patterns & intensity if enabled
            if (shouldNotify && !isQuietHours && meta.vibrate !== false && typeof navigator !== 'undefined' && navigator.vibrate) {
              let pattern: number[] = [];
              const intensityMultiplier = meta.intensity === 'low' ? 0.5 : meta.intensity === 'high' ? 1.5 : 1.0;
              const p = meta.vibrationPreset || 'heartbeat';

              if (p === 'classic') {
                pattern = [500];
              } else if (p === 'heartbeat') {
                pattern = [100, 100, 100];
              } else if (p === 'rapid') {
                pattern = [50, 50, 50, 50, 50];
              } else if (p === 'soft') {
                pattern = [30];
              } else if (p === 'long') {
                pattern = [1000];
              } else if (p === 'double') {
                pattern = [200, 100, 200];
              }

              if (pattern.length > 0) {
                const adjustedPattern = pattern.map(v => Math.round(v * intensityMultiplier));
                navigator.vibrate(adjustedPattern);
              }
            }
          } catch (_) {}

          // Auto-dismiss after 4s
          if (shouldNotify) {
            setTimeout(() => dismissToast(toast.id), 4000);
          }

          // Browser Notification API (if permitted)
          if (shouldNotify && !isQuietHours && typeof window !== 'undefined' && Notification.permission === 'granted') {
            new Notification(toast.senderName, {
              body: toast.message,
              icon: toast.senderAvatar || '/favicon.svg',
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, supabase, addNotification, queryClient, dismissToast]);

  // ── Followers Realtime Sync ──────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.id) return;

    const channel = supabase
      .channel(`monitor:followers:${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'followers',
        },
        (payload: any) => {
          const isRelated = 
            payload.new?.follower_id === currentUser.id ||
            payload.new?.following_id === currentUser.id ||
            payload.old?.follower_id === currentUser.id ||
            payload.old?.following_id === currentUser.id;

          if (isRelated) {
            console.debug('[REALTIME FOLLOW] Change detected:', payload);
            window.dispatchEvent(new CustomEvent('verlyn:follow_change', { detail: payload }));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, supabase]);

  // ── Follow Queue Sync ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.id) return;

    const handleFollowQueue = async () => {
      const w = window as any;
      if (w._isProcessingVerlynQueue) return;
      if (!w._verlynFollowQueue?.length) return;

      w._isProcessingVerlynQueue = true;
      setSyncStatus('syncing');
      const tasks = [...w._verlynFollowQueue];
      w._verlynFollowQueue = [];

      try {
        for (const task of tasks) {
          await toggleFollowDB(currentUser.id, task.userId, task.state);
        }
        const { data } = await supabase
          .from('users')
          .select('follower_count, following_count')
          .eq('id', currentUser.id)
          .single();
        if (data) updateProfile({ followerCount: data.follower_count, followingCount: data.following_count });
        setSyncStatus('idle');
      } catch (e) {
        console.error('[GlobalMonitor] Follow queue failure:', e);
        setSyncStatus('error');
      } finally {
        w._isProcessingVerlynQueue = false;
        if (w._verlynFollowQueue?.length > 0) handleFollowQueue();
      }
    };

    window.addEventListener('verlyn-follow-sync', handleFollowQueue);
    return () => window.removeEventListener('verlyn-follow-sync', handleFollowQueue);
  }, [currentUser?.id, setSyncStatus, updateProfile, supabase]);

  // ── Global Custom Toast Listener ─────────────────────────────────────────────
  useEffect(() => {
    const handleCustomToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { message, type } = customEvent.detail || {};
      const toast: Toast = {
        id: Date.now() + Math.floor(Math.random() * 100000),
        senderName: type === 'error' ? 'Security Alert' : 'System Update',
        message: message || '',
        convId: '',
        type: 'notification',
      };
      setToasts((prev) => [toast, ...prev.slice(0, 2)]);
      setTimeout(() => dismissToast(toast.id), 4000);
    };

    window.addEventListener('verlyn:toast', handleCustomToast);
    return () => window.removeEventListener('verlyn:toast', handleCustomToast);
  }, [dismissToast]);

  // ── Periodic Restriction Checker ───────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.id) return;
    const fetchRestrictions = async () => {
      try {
        const res = await checkMyDetailedRestrictionsDB();
        if (res.success && res.data) {
          const restrictions = res.data.activeRestrictions || [];
          const isSuspended = res.data.needsManualReview === true;
          const msgRest = restrictions.find((r: any) => r.restriction_type === 'messages');
          if (msgRest || isSuspended) {
            const history = res.data.history || [];
            const matchingAction = history.find((h: any) =>
              isSuspended
                ? h.action_type === 'suspend'
                : h.action_type === 'restrict'
            );
            const reason = matchingAction?.reason || 'Spamming or suspicious activity detected.';
            useAppStore.getState().setMessagesRestriction({
              isRestricted: true,
              expiresAt: msgRest?.expires_at || null,
              reason: reason,
            });
          } else {
            useAppStore.getState().setMessagesRestriction(null);
          }
        }
      } catch (err) {
        console.warn('[GlobalRealtimeMonitor] Failed to fetch restrictions:', err);
      }
    };

    fetchRestrictions();
    const interval = setInterval(fetchRestrictions, 90_000); // Check every 90 seconds
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // ── Toast UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed top-4 right-4 z-[999] flex flex-col gap-2 pointer-events-none w-[340px]" style={{ height: 'auto' }}>
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 60, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="pointer-events-auto flex items-start gap-3.5 px-4 py-3.5 rounded-2xl border border-white/[0.08] bg-[#0A0A0A]/35 backdrop-blur-2xl shadow-2xl"
            style={{ height: 'auto', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)' }}
          >
            {/* Avatar or icon */}
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-white/[0.06] flex items-center justify-center">
              {toast.senderAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={toast.senderAvatar}
                  alt={toast.senderName}
                  className="w-full h-full object-cover"
                />
              ) : (
                toast.type === 'message'
                  ? <MessageCircle size={18} className="text-primary/80" />
                  : <Bell size={18} className="text-amber-400/80" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white truncate leading-snug">{toast.senderName}</p>
              <p className="text-[12px] text-white/50 line-clamp-2 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>

            {/* Dismiss */}
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="text-white/20 hover:text-white/60 transition-colors flex-shrink-0 p-0.5"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
