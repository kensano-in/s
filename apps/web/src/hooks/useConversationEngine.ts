'use client';

/**
 * useConversationEngine - Single source of truth for the Messaging system (v1)
 * See implementation_plan.md for full CE-01 through CE-12 fix documentation.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { realtimeBroadcastActive } from './useRealtimeMessages';
import type { DBConversation } from '@/components/Chat/ConversationItem';
import type { ChatMessage } from '@/components/Chat/MessageItem';
import {
  getConversationsDB,
  getConversationById,
  getMessagesDB,
  getDMSettingsDB,
  getOrCreateDMConversationDB,
  markMessagesSeenDB,
  getMyMuteStatusDB,
  clearChatDB,
  leaveGroupDB,
  blockUserDB,
  markAsSeenDB,
  editMessageDB,
  deleteMessageDB,
  addReactionDB,
  removeReactionDB,
  sendMessageDB,
  pinMessageDB,
  starMessageDB,
  resolveChatRouteDB,
  getDMPartnerIdDB,
} from '@/app/(main)/messages/actions';
import { supabase } from '@/lib/supabase/client';

const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(reader.error?.message ?? 'FileReader error'));
    reader.readAsDataURL(file);
  });
};

const compressImageToMax200kb = async (file: File | Blob): Promise<string> => {
  if (file.size < 150 * 1024) {
    return fileToBase64(file);
  }
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const canvas = document.createElement('canvas');
      const maxDim = 400;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      resolve(dataUrl);
    };
    img.onerror = () => {
      resolve('');
    };
  });
};

export interface ConversationEngine {
  conversations: DBConversation[];
  activeConvId: string | null;
  activeConv: DBConversation | null;
  messages: ChatMessage[];
  loadingConvs: boolean;
  loadingMsgs: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  dmSettings: any;
  setDmSettings: React.Dispatch<React.SetStateAction<any>>;
  isMuted: boolean;
  muteUntil: string | null;
  selectConversation: (convId: string, isGroup: boolean, partnerId?: string | null) => void;
  createDM: (otherUserId: string) => Promise<{ convId: string; conv: DBConversation } | null>;
  loadMoreMessages: () => void;
  refreshConversations: () => Promise<void>;
  clearChat: (convId: string) => Promise<void>;
  leaveGroup: (convId: string) => Promise<boolean>;
  blockUser: (convId: string) => Promise<void>;
  removeConversation: (convId: string) => void;
  upsertConversationInList: (conv: Partial<DBConversation> & { id: string }) => void;
  cancelUpload: (messageId: string) => void;
  sendMessage: (
    content: string,
    type?: 'text' | 'image' | 'voice' | 'file' | 'video' | 'location',
    file?: File | Blob,
    options?: {
      fileName?: string;
      mimeType?: string;
      viewOnce?: boolean;
      mediaGroupId?: string;
      replyToId?: string;
      recipientId?: string;
    }
  ) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  reactToMessage: (messageId: string, emoji: string) => Promise<boolean>;
  forwardMessage: (message: ChatMessage, targetConvId: string) => Promise<boolean>;
  pinMessage: (message: ChatMessage) => Promise<boolean>;
  starMessage: (message: ChatMessage) => Promise<boolean>;
  pendingDMTarget: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
  } | null;
  setPendingDMTarget: React.Dispatch<React.SetStateAction<{
    id: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
  } | null>>;
}

// Module-level caches for files and active upload tasks
export const uploadFilesMap = new Map<string, File | Blob>();
export const activeXHRs = new Map<string, XMLHttpRequest>();

export function useConversationEngine(routeId: string | null): ConversationEngine {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useAppStore(s => s.currentUser);
  const storeMessages = useAppStore(s => s.messages);
  const setActiveConversation = useAppStore(s => s.setActiveConversation);

  const [conversations, setConversations] = useState<DBConversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [activeConvId, setLocalActiveConvId] = useState<string | null>(routeId ?? null);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dmSettings, setDmSettings] = useState<any>({});
  const [isMuted, setIsMuted] = useState(false);
  const [muteUntil, setMuteUntil] = useState<string | null>(null);

  const [pendingDMTarget, setPendingDMTarget] = useState<{
    id: string;
    name: string;
    username: string;
    avatarUrl?: string | null;
  } | null>(null);

  // CE-02: AbortController per load operation
  const loadAbortRef = useRef<AbortController | null>(null);
  // CE-06: Route tracking guard
  const lastRouteIdRef = useRef<string | null>(null);
  const manualSelectionRef = useRef<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const activeConvIdRef = useRef<string | null>(routeId ?? null);

  const refreshConvsLoadingRef = useRef(false);
  const loadMessagesLoadingRef = useRef<Record<string, boolean>>({});

  const activeConv = useMemo(
    () => conversations.find((c) => c && c.id === activeConvId) ?? null,
    [conversations, activeConvId]
  );
  const isGroup = activeConv?.isGroup ?? false;
  const messages: ChatMessage[] = activeConvId ? (storeMessages[activeConvId] || []) : [];

  const refreshConversations = useCallback(async () => {
    if (!currentUser?.id || refreshConvsLoadingRef.current) return;
    refreshConvsLoadingRef.current = true;
    if (conversations.length === 0) {
      setLoadingConvs(true);
    }
    try {
      const { success, data } = await getConversationsDB(currentUser.id);
      if (success && data) {
        setConversations((prev) => {
          const activeId = activeConvIdRef.current;
          const activeInPrev = activeId ? prev.find(c => c && c.id === activeId) : null;
          const nextList = [...(data as DBConversation[])];
          if (activeInPrev && !nextList.some(c => c.id === activeId)) {
            nextList.push(activeInPrev);
          }
          return nextList;
        });
      }
    } catch (e) {
      console.error('[ConvEngine] refreshConversations:', e);
    } finally {
      refreshConvsLoadingRef.current = false;
      setLoadingConvs(false);
    }
  }, [currentUser?.id, conversations.length]);

  const mergeMessages = useCallback((existing: ChatMessage[], fetched: ChatMessage[], isInitial: boolean): ChatMessage[] => {
    const mergedMap = new Map<string, ChatMessage>();

    if (isInitial) {
      for (const msg of fetched) {
        mergedMap.set(msg.id, msg);
        if (msg.client_temp_id) {
          mergedMap.set(msg.client_temp_id, msg);
        }
      }
      for (const msg of existing) {
        const exists = mergedMap.has(msg.id) || (msg.client_temp_id && mergedMap.has(msg.client_temp_id));
        const isUnconfirmed = msg.status === 'sending' || msg.status === 'failed' || msg.status === 'error' || msg.status === 'local_sending';
        if (isUnconfirmed || !exists) {
          mergedMap.set(msg.id, msg);
        }
      }
    } else {
      for (const msg of existing) {
        mergedMap.set(msg.id, msg);
        if (msg.client_temp_id) {
          mergedMap.set(msg.client_temp_id, msg);
        }
      }
      for (const msg of fetched) {
        const exists = mergedMap.has(msg.id) || (msg.client_temp_id && mergedMap.has(msg.client_temp_id));
        if (!exists) {
          mergedMap.set(msg.id, msg);
        }
      }
    }

    const uniqueList = Array.from(new Set(mergedMap.values()));
    uniqueList.sort((a, b) => {
      const timeA = a.sent_at ? new Date(a.sent_at).getTime() : Date.now();
      const timeB = b.sent_at ? new Date(b.sent_at).getTime() : Date.now();
      return timeA - timeB;
    });
    return uniqueList;
  }, []);

  const loadMessages = useCallback(
    async (convId: string, group: boolean, cursorSentAt?: string, signal?: AbortSignal) => {
      if (!currentUser?.id || !convId) return;

      const requestKey = `${convId}:${cursorSentAt || 'initial'}`;
      if (loadMessagesLoadingRef.current[requestKey]) return;
      loadMessagesLoadingRef.current[requestKey] = true;

      const existingMsgs = useAppStore.getState().messages[convId] || [];
      if (!cursorSentAt && existingMsgs.length === 0) setLoadingMsgs(true);
      else if (cursorSentAt) setLoadingMore(true);
      const startMs = performance.now();
      try {
        const { success, data } = await getMessagesDB(currentUser.id, convId, group, 50, cursorSentAt);
        // CE-02: Discard if aborted or user navigated away
        if (signal?.aborted || activeConvIdRef.current !== convId) return;
        if (success && data) {
          const mapped: ChatMessage[] = (data as any[]).map((m) => ({
            ...m,
            is_mine: m.sender_id === currentUser.id,
            status: m.status ?? 'sent',
          }));
          
          const existing = useAppStore.getState().messages[convId] || [];
          const merged = mergeMessages(existing, mapped, !cursorSentAt);
          useAppStore.getState().setMessages(convId, merged);
          
          const durationMs = Math.round(performance.now() - startMs);
          console.log(`💬 [MSG-LOAD] Loaded ${mapped.length} messages for conv ${convId} in ${durationMs}ms`);

          setHasMore(mapped.length === 50);
          cursorRef.current = mapped.length > 0 ? mapped[mapped.length - 1].sent_at : null;
        }
      } catch (e: any) {
        if (e?.name === 'AbortError' || signal?.aborted) return;
        console.error('[ConvEngine] loadMessages:', e);
      } finally {
        delete loadMessagesLoadingRef.current[requestKey];
        if (!signal?.aborted && activeConvIdRef.current === convId) {
          setLoadingMsgs(false);
          setLoadingMore(false);
        }
      }
    },
    [currentUser?.id, mergeMessages]
  );

  const loadSettings = useCallback(async (convId: string, group: boolean) => {
    if (!currentUser?.id || !convId) return;
    try {
      const { success, data } = await getDMSettingsDB(currentUser.id, convId);
      if (success && data) setDmSettings(data);
      else setDmSettings({});
    } catch { setDmSettings({}); }
  }, [currentUser?.id]);

  const loadMuteStatus = useCallback(async (convId: string, group: boolean) => {
    if (!group || !currentUser?.id) { setIsMuted(false); setMuteUntil(null); return; }
    try {
      const res = await getMyMuteStatusDB(currentUser.id, convId);
      if (res.success && res.data) { setIsMuted(res.data.isMuted); setMuteUntil(res.data.muteUntil); }
      else { setIsMuted(false); setMuteUntil(null); }
    } catch { setIsMuted(false); setMuteUntil(null); }
  }, [currentUser?.id]);

  const selectConversation = useCallback(
    (convId: string, group: boolean, partnerId?: string | null) => {
      console.log('[DEBUG-TAP] selectConversation invoked. Target convId:', convId, 'activeConvIdRef:', activeConvIdRef.current, 'activeConvId:', activeConvId);

      if (activeConvIdRef.current === convId && activeConvId === convId && typeof window !== 'undefined' && window.location.pathname === `/messages/${convId}`) {
        console.log('[DEBUG-TAP] selectConversation early exit: conversation already active & matching URL');
        return;
      }

      // CE-02: Cancel previous in-flight load
      if (loadAbortRef.current) loadAbortRef.current.abort();
      const controller = new AbortController();
      loadAbortRef.current = controller;

      // Reset loading map for new conversation
      loadMessagesLoadingRef.current = {};

      // RT-FIX-01: Eagerly resolve partnerId for DMs so the broadcast channel
      // routing can target chat:presence:{partnerUserId} immediately.
      // Priority: 1) caller-supplied partnerId, 2) local conversations list,
      // 3) store.conversations, 4) async DB lookup (background, non-blocking).
      let resolvedPartnerId = group ? null : (partnerId ?? null);

      if (!group && !resolvedPartnerId) {
        // Check local conversations list first (O(1), always try this first)
        const localConv =
          conversations.find((c) => c && c.id === convId) ||
          useAppStore.getState().conversations?.find?.((c: any) => c && c.id === convId);
        if (localConv && !localConv.isGroup && (localConv as any).partnerId) {
          resolvedPartnerId = (localConv as any).partnerId;
        }
      }

      // CE-09/CE-11: Sync store (also wipes previous conv messages via store fix)
      // Pass resolvedPartnerId so realtimeBroadcastActive knows which channel to send on
      setActiveConversation(convId, group, resolvedPartnerId);

      if (!group && !resolvedPartnerId) {
        getDMPartnerIdDB(convId)
          .then((res) => {
            if (res.success && res.data?.partnerId) {
              const state = useAppStore.getState();
              if (state.activeConversationId === convId && !state.activePartnerUserId) {
                setActiveConversation(convId, false, res.data.partnerId);
              }
            }
          })
          .catch((err) => {
            console.warn('[ConvEngine] RT-FIX-01b: getDMPartnerIdDB failed:', err);
          });
      }

      const isDifferentConv = activeConvIdRef.current !== convId;

      console.log('[DEBUG-TAP] Applying state update: setLocalActiveConvId ->', convId);
      setLocalActiveConvId(convId);
      activeConvIdRef.current = convId;
      manualSelectionRef.current = convId;
      lastRouteIdRef.current = convId;
      cursorRef.current = null;
      setHasMore(false);
      setLoadingMsgs(false);
      setLoadingMore(false);

      if (isDifferentConv) {
        setDmSettings({});
        setIsMuted(false);
        setMuteUntil(null);
      }

      if (typeof window !== 'undefined' && window.location.pathname !== `/messages/${convId}`) {
        console.log('[DEBUG-TAP] router.replace navigating to:', `/messages/${convId}`);
        router.replace(`/messages/${convId}`, { scroll: false });
      }
      if (!group && currentUser?.id) {
        markMessagesSeenDB(currentUser.id, convId).catch((err) => {
          console.warn('[ConvEngine] Failed to mark messages as seen:', err);
        });
      }

      loadMessages(convId, group, undefined, controller.signal).catch((err) => {
        console.warn('[ConvEngine] Failed to load messages:', err);
      });
      loadSettings(convId, group).catch((err) => {
        console.warn('[ConvEngine] Failed to load settings:', err);
      });
      loadMuteStatus(convId, group).catch((err) => {
        console.warn('[ConvEngine] Failed to load mute status:', err);
      });
    },
    [router, currentUser?.id, setActiveConversation, loadMessages, loadSettings, loadMuteStatus, conversations, activeConvId]
  );

  const loadMoreMessages = useCallback(() => {
    if (!activeConvId || loadingMore || !hasMore || !cursorRef.current) return;
    void loadMessages(activeConvId, isGroup, cursorRef.current);
  }, [activeConvId, loadingMore, hasMore, isGroup, loadMessages]);

  const createDM = useCallback(async (otherUserId: string) => {
    if (!currentUser?.id) return null;
    try {
      const { success, data } = await getOrCreateDMConversationDB(currentUser.id, otherUserId);
      if (!success || !data) return null;
      const convId = data.conversationId;
      const dmConv: DBConversation = {
        id: convId,
        name: data.user?.name || 'Direct Message',
        username: data.user?.username || '',
        avatarUrl: data.user?.avatarUrl || null,
        isOnline: data.user?.isOnline || false,
        isGroup: false,
        lastMessage: '',
        updatedAt: new Date().toISOString(),
        unread: 0,
        partnerId: data.user?.id,
      };
      setConversations((prev) => {
        if (prev.find((c) => c && c.id === convId)) return prev;
        return [dmConv, ...prev];
      });
      return { convId, conv: dmConv };
    } catch (e) { console.error('[ConvEngine] createDM:', e); return null; }
  }, [currentUser?.id]);

  const removeConversation = useCallback((convId: string) => {
    setConversations((prev) => prev.filter((c) => c && c.id !== convId));
  }, []);

  const upsertConversationInList = useCallback((conv: Partial<DBConversation> & { id: string }) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c && c.id === conv.id);
      if (idx === -1) return [conv as DBConversation, ...prev];
      const updated = [...prev];
      updated[idx] = { ...updated[idx], ...conv };
      return updated;
    });
  }, []);

  const clearChat = useCallback(async (convId: string) => {
    if (!currentUser?.id) return;
    await clearChatDB(currentUser.id, convId);
    useAppStore.getState().setMessages(convId, []);
    realtimeBroadcastActive('chat_cleared', {
      chatId: convId,
      clearedBy: currentUser.id,
    });
  }, [currentUser?.id]);

  const leaveGroup = useCallback(async (convId: string) => {
    if (!currentUser?.id) return false;
    const { success } = await leaveGroupDB(currentUser.id, convId);
    if (success) {
      removeConversation(convId);
      setLocalActiveConvId(null);
      activeConvIdRef.current = null;
      setActiveConversation(null);
      router.replace('/messages', { scroll: false });
    }
    return success;
  }, [currentUser?.id, removeConversation, setActiveConversation, router]);

  const blockUser = useCallback(async (convId: string) => {
    if (!currentUser?.id) return;
    // Prefer activePartnerUserId set by setActiveConversation (most reliable)
    // Fall back to the partnerId stored in the conversations list
    const state = useAppStore.getState();
    const partnerId =
      state.activePartnerUserId ||
      state.conversations.find((c) => c.id === convId)?.partnerId ||
      null;

    if (!partnerId) {
      console.error('[blockUser] Cannot resolve partnerId for convId', convId);
      return;
    }

    await blockUserDB(currentUser.id, partnerId);

    realtimeBroadcastActive('user_blocked', {
      chatId: convId,
      blockedBy: currentUser.id,
      blockedTarget: partnerId,
    });

    removeConversation(convId);
    setLocalActiveConvId(null);
    activeConvIdRef.current = null;
    setActiveConversation(null);
    router.replace('/messages', { scroll: false });
  }, [currentUser?.id, removeConversation, setActiveConversation, router]);


  const cancelUpload = useCallback((messageId: string) => {
    const xhr = activeXHRs.get(messageId);
    if (xhr) {
      xhr.abort();
      activeXHRs.delete(messageId);
    }
    if (activeConvIdRef.current) {
      useAppStore.getState().removeMessage(activeConvIdRef.current, messageId);
    }
    useAppStore.getState().removeMediaUpload(messageId);
    uploadFilesMap.delete(messageId);
    if (typeof window !== 'undefined') {
      import('@/lib/offlineFiles').then(({ deleteOfflineFile }) => {
        void deleteOfflineFile(messageId);
      });
    }
  }, []);

  const sendMessage = useCallback(async (
    content: string,
    type: 'text' | 'image' | 'voice' | 'file' | 'video' | 'location' = 'text',
    file?: File | Blob,
    options?: {
      fileName?: string;
      mimeType?: string;
      viewOnce?: boolean;
      mediaGroupId?: string;
      replyToId?: string;
      recipientId?: string;
    }
  ) => {
    const targetKey = activeConvId || options?.recipientId;
    if (!currentUser?.id || !targetKey) return;

    const restriction = useAppStore.getState().messagesRestriction;
    if (restriction?.isRestricted) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('verlyn:toast', {
            detail: { message: 'You are restricted from sending messages due to spamming.', type: 'error' },
          })
        );
      }
      return;
    }

    const tempId = Math.random().toString(36).substring(7);

    // 1. Resolve file properties and build optimistic message
    const finalFileName = options?.fileName || (file instanceof File ? file.name : `${type === 'voice' ? 'voice-note' : 'file'}`);
    const finalMimeType = options?.mimeType || (file instanceof File ? file.type : (type === 'voice' ? 'audio/webm' : 'application/octet-stream'));

    const isBlobUrl = content.startsWith('blob:');
    const cleanContent = type === 'text' ? content : (isBlobUrl ? '' : content);

    const isMedia = type !== 'text' && type !== 'location';
    let replyToObj = null;
    if (options?.replyToId) {
      const parentMsg = (useAppStore.getState().messages[targetKey] || []).find(m => m.id === options.replyToId);
      if (parentMsg) {
        replyToObj = {
          id: parentMsg.id,
          content: parentMsg.content,
          type: parentMsg.type,
          sender_display: parentMsg.sender?.display_name || parentMsg.sender?.username || (parentMsg.is_mine ? 'You' : 'Them'),
        };
      }
    }

    const optimisticMessage: ChatMessage = {
      id: tempId,
      client_temp_id: tempId,
      sender_id: currentUser.id,
      recipient_id: options?.recipientId || activeConv?.partnerId || '',
      conversation_id: activeConvId || '',
      content: cleanContent,
      type,
      media_url: isMedia ? (file ? URL.createObjectURL(file) : content) : undefined,
      file_name: finalFileName,
      mime_type: finalMimeType,
      reply_to_id: options?.replyToId,
      reply_to: replyToObj,
      view_once: options?.viewOnce,
      media_group_id: options?.mediaGroupId,
      sent_at: new Date().toISOString(),
      is_mine: true,
      status: file ? 'sending' : 'sent',
    };

    // Append optimistic message
    useAppStore.getState().setMessages(targetKey, [...(useAppStore.getState().messages[targetKey] || []), optimisticMessage]);

    // Update sidebar preview immediately if conversation exists
    if (activeConvId) {
      useAppStore.getState().upsertConversation(activeConvId, {
        lastMessage: type === 'text' ? cleanContent : `[${type}]`,
        updatedAt: optimisticMessage.sent_at,
      });
      useAppStore.getState().clearDraft(activeConvId);
    }

    // Compute base64 encoding of image/audio for zero-latency recipient rendering
    let mediaBase64: string | undefined = undefined;
    if (file) {
      try {
        if (type === 'image') {
          mediaBase64 = await compressImageToMax200kb(file);
        } else if (type === 'voice') {
          mediaBase64 = await fileToBase64(file);
        }
      } catch (err) {
        console.warn('[ConvEngine] Failed to generate zero-latency base64 preview:', err);
      }
    }

    // Broadcast the optimistic message immediately to give instant feedback to both parties
    if (activeConvId) {
      const broadcastMsg = {
        ...optimisticMessage,
        media_base64: mediaBase64,
        sender: {
          display_name: currentUser.displayName,
          username: currentUser.username,
          avatar_url: currentUser.avatar,
        },
      };
      void realtimeBroadcastActive('new_message', broadcastMsg);
    }

    // Save file to memory map and IndexedDB for retry capability
    if (file) {
      uploadFilesMap.set(tempId, file);
      if (typeof window !== 'undefined') {
        import('@/lib/offlineFiles').then(({ storeOfflineFile }) => {
          if (file instanceof File) {
            void storeOfflineFile(tempId, file);
          }
        });
      }
    }

    const payload = {
      clientTempId: tempId,
      content,
      type,
      fileName: finalFileName,
      mimeType: finalMimeType,
      replyToId: options?.replyToId,
      viewOnce: options?.viewOnce,
      mediaGroupId: options?.mediaGroupId,
    };

    // 2. Offline check
    if (typeof window !== 'undefined' && !navigator.onLine) {
      console.debug('[ConvEngine] Client offline, queuing message:', tempId);
      useAppStore.getState().setMessages(targetKey, (useAppStore.getState().messages[targetKey] || []).map((m) =>
        m.client_temp_id === tempId ? { ...m, status: 'failed' as const } : m
      ));
      useAppStore.getState().addToOfflineQueue(targetKey, payload);
      return;
    }

    // 3. Media Upload (if file provided)
    let finalMediaUrl = content;
    if (file) {
      try {
        useAppStore.getState().setMediaUpload(tempId, { progress: 0, status: 'uploading' });

        const uploadUrl = await new Promise<string>((resolvePromise, rejectPromise) => {
          const xhr = new XMLHttpRequest();
          activeXHRs.set(tempId, xhr);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              useAppStore.getState().setMediaUpload(tempId, { progress: percent });
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                if (response.url) resolvePromise(response.url);
                else rejectPromise(new Error('Invalid upload response'));
              } catch (_) {
                rejectPromise(new Error('Invalid JSON response'));
              }
            } else {
              rejectPromise(new Error(`Upload failed: ${xhr.status}`));
            }
          };

          xhr.onerror = () => rejectPromise(new Error('Network error'));
          xhr.onabort = () => rejectPromise(new Error('Cancelled'));

          const formData = new FormData();
          formData.append('file', file);
          formData.append('fileName', finalFileName || 'file');
          formData.append('folder', 'chat-files');

          xhr.open('POST', '/api/upload', true);
          xhr.send(formData);
        });

        finalMediaUrl = uploadUrl;
        useAppStore.getState().setMediaUpload(tempId, { progress: 100, status: 'complete', url: uploadUrl });
        activeXHRs.delete(tempId);

      } catch (uploadErr: any) {
        console.warn('[ConvEngine] upload failed, falling back:', uploadErr);
        activeXHRs.delete(tempId);

        if (uploadErr?.message === 'Cancelled') {
          useAppStore.getState().removeMessage(targetKey, tempId);
          useAppStore.getState().removeMediaUpload(tempId);
          uploadFilesMap.delete(tempId);
          if (typeof window !== 'undefined') {
            import('@/lib/offlineFiles').then(({ deleteOfflineFile }) => {
              void deleteOfflineFile(tempId);
            });
          }
          return;
        }

        // Fallback upload (Supabase Storage direct)
        try {
          const { supabase } = await import('@/lib/supabase/client');
          const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${finalFileName?.split('.').pop() || 'bin'}`;
          const { data, error } = await supabase.storage.from("chat-files").upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: finalMimeType,
          });
          if (error) throw error;
          const { data: ud } = supabase.storage.from("chat-files").getPublicUrl(data.path);
          if (ud.publicUrl) {
            finalMediaUrl = ud.publicUrl;
            useAppStore.getState().setMediaUpload(tempId, { progress: 100, status: 'complete', url: ud.publicUrl });
          } else {
            throw new Error('Fallback upload: public url not retrieved');
          }
        } catch (fallbackErr: any) {
          console.warn('[ConvEngine] Fallback upload failed:', fallbackErr);
          useAppStore.getState().setMediaUpload(tempId, { status: 'error' });
          useAppStore.getState().setMessages(targetKey, (useAppStore.getState().messages[targetKey] || []).map((m) =>
            m.client_temp_id === tempId ? { ...m, status: 'failed' as const } : m
          ));
          if (activeConvId) {
            void realtimeBroadcastActive('retract_message', { client_temp_id: tempId });
          }
          return;
        }
      }
    }

    // Optimistic broadcast for media messages (now that upload is complete)
    if (file && activeConvId) {
      const broadcastMsg = {
        ...optimisticMessage,
        media_url: finalMediaUrl,
        sender: {
          display_name: currentUser.displayName,
          username: currentUser.username,
          avatar_url: currentUser.avatar,
        },
      };
      void realtimeBroadcastActive('new_message', broadcastMsg);
    }

    // 4. Send to database via server action
    try {
      const res = await sendMessageDB({
        recipientId: options?.recipientId || activeConv?.partnerId,
        conversationId: activeConvId || undefined,
        content: type === 'text' ? cleanContent : (cleanContent || finalMediaUrl),
        type,
        mediaUrl: type !== 'text' ? finalMediaUrl : undefined,
        fileName: finalFileName,
        mimeType: finalMimeType,
        replyToId: options?.replyToId,
        clientTempId: tempId,
        viewOnce: options?.viewOnce,
        mediaGroupId: options?.mediaGroupId,
      });

      if (!res.success || !res.data) {
        console.warn('[ConvEngine] sendMessageDB rejected:', res.error);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('verlyn:toast', {
              detail: { message: res.error || 'Failed to send message.', type: 'error' },
            })
          );
        }
        useAppStore.getState().setMessages(targetKey, (useAppStore.getState().messages[targetKey] || []).map((m) =>
          m.client_temp_id === tempId ? { ...m, status: 'failed' as const } : m
        ));
        if (activeConvId) {
          void realtimeBroadcastActive('retract_message', { client_temp_id: tempId });
        }
      } else {
        const dbMsg = res.data;
        const newConvId = dbMsg.conversation_id;

        if (!activeConvId && newConvId) {
          console.log('[DEBUG] Conversation created. newConvId:', newConvId);
          // Transfer optimistic messages under the resolved new conversation ID
          useAppStore.getState().setMessages(newConvId, [
            ...(useAppStore.getState().messages[newConvId] || []),
            { ...optimisticMessage, id: dbMsg.id, status: 'sent', conversation_id: newConvId }
          ]);
          useAppStore.getState().setMessages(targetKey, []);
          setPendingDMTarget(null);
          void refreshConversations();
          selectConversation(newConvId, false, options?.recipientId);
        } else {
          useAppStore.getState().setMessages(targetKey, (useAppStore.getState().messages[targetKey] || []).map((m) =>
            m.client_temp_id === tempId
              ? { ...m, id: dbMsg.id, status: 'sent' as const, media_url: dbMsg.media_url || m.media_url }
              : m
          ));
        }
        
        if (activeConvId) {
          void realtimeBroadcastActive('new_message_db_sync', {
            client_temp_id: tempId,
            id: dbMsg.id,
            media_url: dbMsg.media_url,
          });
        }

        uploadFilesMap.delete(tempId);
        if (typeof window !== 'undefined') {
          import('@/lib/offlineFiles').then(({ deleteOfflineFile }) => {
            void deleteOfflineFile(tempId);
          });
        }
      }
    } catch (err) {
      console.error('[ConvEngine] sendMessageDB exception:', err);
      useAppStore.getState().setMessages(targetKey, (useAppStore.getState().messages[targetKey] || []).map((m) =>
        m.client_temp_id === tempId ? { ...m, status: 'failed' as const } : m
      ));
    }
  }, [currentUser, activeConvId, activeConv, refreshConversations, selectConversation]);

  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!currentUser?.id || !activeConvId) return false;

    useAppStore.getState().setMessages(activeConvId, (useAppStore.getState().messages[activeConvId] || []).map((m) =>
      m.id === messageId ? { ...m, content: newContent, edited_at: new Date().toISOString() } : m
    ));

    const res = await editMessageDB(currentUser.id, messageId, newContent);
    if (!res.success) {
      console.warn('[ConvEngine] editMessage failed:', res.error);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('verlyn:toast', {
            detail: { message: res.error || 'Failed to edit message.', type: 'error' },
          })
        );
      }
      void loadMessages(activeConvId, isGroup);
    }
    return res.success;
  }, [currentUser?.id, activeConvId, isGroup, loadMessages]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!currentUser?.id || !activeConvId) return false;

    useAppStore.getState().removeMessage(activeConvId, messageId);

    const res = await deleteMessageDB(currentUser.id, messageId);
    if (!res.success) {
      console.warn('[ConvEngine] deleteMessage failed:', res.error);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('verlyn:toast', {
            detail: { message: res.error || 'Failed to delete message.', type: 'error' },
          })
        );
      }
      void loadMessages(activeConvId, isGroup);
    } else {
      // Broadcast deletion immediately to active channel
      realtimeBroadcastActive('retract_message', { client_temp_id: messageId });
    }
    return res.success;
  }, [currentUser?.id, activeConvId, isGroup, loadMessages]);

  const pinMessage = useCallback(async (message: ChatMessage) => {
    if (!currentUser?.id || !activeConvId) return false;
    const nextPinState = !message.is_pinned;

    // Optimistic UI update in the store
    useAppStore.getState().setMessages(activeConvId, (useAppStore.getState().messages[activeConvId] || []).map((m) =>
      m.id === message.id ? { ...m, is_pinned: nextPinState } : m
    ));

    try {
      const res = await pinMessageDB(message.id, nextPinState);
      if (!res.success) {
        console.warn('[ConvEngine] pinMessage failed:', res.error);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('verlyn:toast', {
              detail: { message: res.error || 'Failed to pin message.', type: 'error' },
            })
          );
        }
        // Rollback optimistic update
        useAppStore.getState().setMessages(activeConvId, (useAppStore.getState().messages[activeConvId] || []).map((m) =>
          m.id === message.id ? { ...m, is_pinned: !nextPinState } : m
        ));
        return false;
      }
      // Broadcast pin toggle to active channel immediately
      realtimeBroadcastActive('message_pin_toggle', { messageId: message.id, is_pinned: nextPinState });
      return true;
    } catch (err) {
      console.error('[ConvEngine] pinMessage failed:', err);
      // Rollback optimistic update
      useAppStore.getState().setMessages(activeConvId, (useAppStore.getState().messages[activeConvId] || []).map((m) =>
        m.id === message.id ? { ...m, is_pinned: !nextPinState } : m
      ));
      return false;
    }
  }, [currentUser?.id, activeConvId]);

  const starMessage = useCallback(async (message: ChatMessage) => {
    if (!currentUser?.id || !activeConvId) return false;
    const nextStarState = !message.is_starred;

    // Optimistic UI update in the store
    useAppStore.getState().setMessages(activeConvId, (useAppStore.getState().messages[activeConvId] || []).map((m) =>
      m.id === message.id ? { ...m, is_starred: nextStarState } : m
    ));

    try {
      const res = await starMessageDB(message.id, nextStarState);
      if (!res.success) {
        console.warn('[ConvEngine] starMessage failed:', res.error);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('verlyn:toast', {
              detail: { message: res.error || 'Failed to star message.', type: 'error' },
            })
          );
        }
        // Rollback optimistic update
        useAppStore.getState().setMessages(activeConvId, (useAppStore.getState().messages[activeConvId] || []).map((m) =>
          m.id === message.id ? { ...m, is_starred: !nextStarState } : m
        ));
        return false;
      }
      return true;
    } catch (err) {
      console.error('[ConvEngine] starMessage failed:', err);
      // Rollback optimistic update
      useAppStore.getState().setMessages(activeConvId, (useAppStore.getState().messages[activeConvId] || []).map((m) =>
        m.id === message.id ? { ...m, is_starred: !nextStarState } : m
      ));
      return false;
    }
  }, [currentUser?.id, activeConvId]);

  const reactToMessage = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUser?.id || !activeConvId) return false;

    const existingMsgs = useAppStore.getState().messages[activeConvId] || [];
    const msg = existingMsgs.find((m) => m.id === messageId);
    if (!msg) return false;

    // Prevent reacting to sending/optimistic messages to avoid DB "Message not found" errors
    if (msg.status === 'sending' || msg.id.startsWith('temp_') || msg.id.startsWith('client_temp_')) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('verlyn:toast', {
            detail: { message: 'Wait for the message to send before reacting.', type: 'info' },
          })
        );
      }
      return false;
    }

    const currentReactions = msg.reactions || [];
    const hadEmoji = currentReactions.some((r) => r.emoji === emoji && r.reacted);

    const updatedReactions = hadEmoji
      ? currentReactions.map((r) => r.emoji === emoji ? { ...r, count: Math.max(0, r.count - 1), reacted: false, userIds: (r.userIds || []).filter((id) => id !== currentUser.id) } : r).filter((r) => r.count > 0)
      : (() => {
          const next = currentReactions.map((r) => r.reacted ? { ...r, count: Math.max(0, r.count - 1), reacted: false, userIds: (r.userIds || []).filter((id) => id !== currentUser.id) } : r).filter((r) => r.count > 0);
          const foundEmojiIdx = next.findIndex((r) => r.emoji === emoji);
          if (foundEmojiIdx > -1) {
            next[foundEmojiIdx] = { ...next[foundEmojiIdx], count: next[foundEmojiIdx].count + 1, reacted: true, userIds: [...(next[foundEmojiIdx].userIds || []), currentUser.id] };
          } else {
            next.push({ emoji, count: 1, reacted: true, userIds: [currentUser.id] });
          }
          return next;
        })();

    useAppStore.getState().setMessages(activeConvId, existingMsgs.map((m) =>
      m.id === messageId ? { ...m, reactions: updatedReactions } : m
    ));

    // Broadcast reaction change immediately for near-zero latency delivery
    void realtimeBroadcastActive('reaction_toggle', {
      messageId,
      userId: currentUser.id,
      emoji,
      action: hadEmoji ? 'remove' : 'add',
    });

    const res = hadEmoji
      ? await removeReactionDB(messageId, currentUser.id, emoji)
      : await addReactionDB(messageId, currentUser.id, emoji);

    if (!res.success) {
      console.warn('[ConvEngine] reaction failed:', res.error);
      void loadMessages(activeConvId, isGroup);
    }
    return res.success;
  }, [currentUser?.id, activeConvId, isGroup, loadMessages]);

  const forwardMessage = useCallback(async (message: ChatMessage, targetConvId: string) => {
    if (!currentUser?.id) return false;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    // Deeply resolve the original sender's profile
    let forwardedFrom = 'Unknown';
    if (message.sender_id === currentUser.id) {
      const dispName = currentUser.displayName || 'You';
      const usrName = currentUser.username;
      forwardedFrom = dispName + (usrName ? ` (@${usrName})` : '');
    } else if (message.sender?.display_name || message.sender?.username) {
      const dispName = message.sender.display_name || 'Unknown';
      const usrName = message.sender.username;
      forwardedFrom = dispName + (usrName ? ` (@${usrName})` : '');
    } else {
      // Direct query from users table to get the original author's display name and username
      try {
        const { data: authorData } = await supabase
          .from('users')
          .select('display_name, username')
          .eq('id', message.sender_id)
          .single();
        if (authorData) {
          const dispName = authorData.display_name || 'Unknown';
          const usrName = authorData.username;
          forwardedFrom = dispName + (usrName ? ` (@${usrName})` : '');
        } else {
          // Fallback if user not found in DB
          if (!isGroup && activeConv && message.sender_id === activeConv.partnerId) {
            const dispName = activeConv.nickname || activeConv.name || 'Partner';
            const usrName = activeConv.username;
            forwardedFrom = dispName + (usrName ? ` (@${usrName})` : '');
          }
        }
      } catch (_) {
        // Fallback on DB query error
        if (!isGroup && activeConv && message.sender_id === activeConv.partnerId) {
          const dispName = activeConv.nickname || activeConv.name || 'Partner';
          const usrName = activeConv.username;
          forwardedFrom = dispName + (usrName ? ` (@${usrName})` : '');
        }
      }
    }

    const metadata = { forwarded: true, forwarded_from: forwardedFrom };
    
    if (targetConvId === activeConvIdRef.current) {
      const optimisticMsg: ChatMessage = {
        id: tempId,
        client_temp_id: tempId,
        sender_id: currentUser.id,
        content: message.content,
        type: message.type,
        media_url: message.media_url,
        file_name: message.file_name,
        mime_type: message.mime_type,
        sent_at: new Date().toISOString(),
        status: 'sending',
        is_mine: true,
        sender: {
          display_name: currentUser.displayName,
          username: currentUser.username,
          avatar_url: currentUser.avatar,
        },
        metadata,
      };
      useAppStore.getState().setMessages(targetConvId, [
        ...(useAppStore.getState().messages[targetConvId] || []),
        optimisticMsg,
      ]);
    }

    try {
      const res = await sendMessageDB({
        conversationId: targetConvId,
        content: message.content,
        type: message.type as any,
        mediaUrl: message.media_url,
        fileName: message.file_name,
        mimeType: message.mime_type,
        clientTempId: tempId,
        metadata,
      });

      if (res.success && res.data) {
        if (targetConvId === activeConvIdRef.current) {
          const dbMsg = res.data;
          useAppStore.getState().setMessages(targetConvId, (useAppStore.getState().messages[targetConvId] || []).map((m) =>
            m.client_temp_id === tempId
              ? { ...m, id: dbMsg.id, status: 'sent' as const, metadata: dbMsg.metadata || m.metadata }
              : m
          ));
        }
        return true;
      }
    } catch (err) {
      console.error('[ConvEngine] forwardMessage failed:', err);
    }
    
    if (targetConvId === activeConvIdRef.current) {
      useAppStore.getState().setMessages(targetConvId, (useAppStore.getState().messages[targetConvId] || []).map((m) =>
        m.client_temp_id === tempId ? { ...m, status: 'failed' as const } : m
      ));
    }
    return false;
  }, [currentUser, activeConv, isGroup]);

  // ─── Automated Seen Receipts Effect ───────────────────────────────────
  useEffect(() => {
    if (!currentUser?.id || !activeConvId || messages.length === 0) return;

    const unseenIds = messages
      .filter((m) => m.sender_id !== currentUser.id && m.status !== 'seen')
      .map((m) => m.id);

    if (unseenIds.length > 0) {
      markAsSeenDB(currentUser.id, unseenIds).then((res) => {
        if (res.success) {
          unseenIds.forEach((id) => {
            useAppStore.getState().updateMessageStatus?.(id, 'seen', activeConvId);
          });
        }
      });
    }
  }, [messages, activeConvId, currentUser?.id]);

  // ─── Restore Offline Files from IndexedDB ─────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const restoreFiles = async () => {
      try {
        const { getAllOfflineKeys, getOfflineFile } = await import('@/lib/offlineFiles');
        const keys = await getAllOfflineKeys();
        for (const key of keys) {
          const file = await getOfflineFile(key);
          if (file) {
            uploadFilesMap.set(key, file);
          }
        }
        // Hydrate trigger for queue drain if restored files match queue items
        const { offlineQueue } = useAppStore.getState();
        if (offlineQueue.length > 0 && navigator.onLine) {
          window.dispatchEvent(new Event('online'));
        }
      } catch (err) {
        console.warn('[ConvEngine] Failed to restore offline files:', err);
      }
    };
    void restoreFiles();
  }, []);

  // ─── Offline Queue Auto-Drain Effect ──────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const drainQueue = async () => {
      const { offlineQueue, removeFromOfflineQueue, setMessages } = useAppStore.getState();
      if (!currentUser?.id || !navigator.onLine) return;

      if (offlineQueue.length > 0) {
        console.debug(`[Offline Queue] Starting drain of ${offlineQueue.length} messages`);

        for (const item of offlineQueue) {
          const { convId, payload } = item;
          
          // If there is an in-memory file for this message, retry sending it fully (with progress/upload)
          const inMemoryFile = uploadFilesMap.get(payload.clientTempId);
          if (inMemoryFile) {
            useAppStore.getState().removeMessage(convId, payload.clientTempId);
            removeFromOfflineQueue(payload.clientTempId);
            void sendMessage(payload.content, payload.type, inMemoryFile, {
              fileName: payload.fileName,
              mimeType: payload.mimeType,
              viewOnce: payload.viewOnce,
              mediaGroupId: payload.mediaGroupId,
              replyToId: payload.replyToId,
            });
            continue;
          }

          try {
            const res = await sendMessageDB({
              recipientId: activeConv?.partnerId,
              conversationId: convId,
              content: payload.content,
              type: payload.type,
              mediaUrl: payload.mediaUrl,
              fileName: payload.fileName,
              mimeType: payload.mimeType,
              replyToId: payload.replyToId,
              clientTempId: payload.clientTempId,
              viewOnce: payload.viewOnce,
              mediaGroupId: payload.mediaGroupId,
            });

            if (res.success && res.data) {
              const dbMsg = res.data;
              setMessages(convId, (useAppStore.getState().messages[convId] || []).map((m) =>
                m.client_temp_id === payload.clientTempId
                  ? { ...m, id: dbMsg.id, status: 'sent' }
                  : m
              ));
              removeFromOfflineQueue(payload.clientTempId);
            } else {
              console.error('[Offline Queue] Failed to send queued message:', res.error);
              if (res.error?.includes('spam') || res.error?.includes('cannot message')) {
                setMessages(convId, (useAppStore.getState().messages[convId] || []).map((m) =>
                  m.client_temp_id === payload.clientTempId
                    ? { ...m, status: 'error' as const }
                    : m
                ));
                removeFromOfflineQueue(payload.clientTempId);
              }
            }
          } catch (err) {
            console.error('[Offline Queue] Error processing queued message:', err);
          }
        }
      }
    };

    window.addEventListener('online', drainQueue);
    if (navigator.onLine) {
      void drainQueue();
    }

    return () => {
      window.removeEventListener('online', drainQueue);
    };
  }, [currentUser?.id, activeConv?.partnerId, sendMessage]);

  // Load conversation list on mount / user change
  useEffect(() => {
    if (currentUser?.id) void refreshConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const resolvingRouteRef = useRef<string | null>(null);

  // CE-06: Route tracking initialization — fires when routeId changes or initial convs load
  useEffect(() => {
    if (!routeId || !currentUser?.id || loadingConvs) {
      if (!routeId) {
        lastRouteIdRef.current = null;
        resolvingRouteRef.current = null;
      }
      return;
    }

    console.log('[DEBUG-TAP] Route tracking effect. routeId:', routeId, 'activeConvIdRef:', activeConvIdRef.current);

    // Check if current active conversation matches this routeId (either by conv.id or conv.partnerId)
    const currentActiveConv = conversations.find((c) => c && c.id === activeConvIdRef.current);
    const isCurrentActiveMatching =
      activeConvIdRef.current &&
      (activeConvIdRef.current === routeId ||
        (currentActiveConv && !currentActiveConv.isGroup && (currentActiveConv as any).partnerId === routeId));

    if (isCurrentActiveMatching) {
      console.log('[DEBUG-TAP] Route tracking early exit: current active matches routeId:', routeId);
      manualSelectionRef.current = null;
      lastRouteIdRef.current = routeId;
      resolvingRouteRef.current = null;
      return;
    }

    // Guard against overriding manual user selections while router.replace is navigating in-flight
    if (manualSelectionRef.current) {
      if (manualSelectionRef.current === activeConvIdRef.current) {
        console.log('[DEBUG-TAP] Route tracking early exit: waiting for routeId to catch up with manualSelectionRef:', manualSelectionRef.current);
        return;
      } else {
        manualSelectionRef.current = null;
      }
    }

    // Check local conversations cache
    const convById = conversations.find((c) => c && c.id === routeId);
    const convByPartner = conversations.find((c) => c && !c.isGroup && c.partnerId === routeId);
    const conv = convById || convByPartner;

    if (conv) {
      lastRouteIdRef.current = routeId;
      resolvingRouteRef.current = null;
      setPendingDMTarget(null);
      if (activeConvIdRef.current !== conv.id) {
        selectConversation(conv.id, !!conv.isGroup, (conv as any).partnerId ?? null);
      }
      return;
    }

    if (lastRouteIdRef.current === routeId || resolvingRouteRef.current === routeId) {
      return;
    }

    // Zero-latency client-side pending composer from query parameters
    const queryName = searchParams?.get('name');
    const queryUsername = searchParams?.get('username');
    const queryAvatar = searchParams?.get('avatar');

    if (queryName && queryUsername) {
      lastRouteIdRef.current = routeId;
      resolvingRouteRef.current = null;
      setPendingDMTarget({
        id: routeId,
        name: queryName,
        username: queryUsername,
        avatarUrl: queryAvatar || null,
      });
      setLocalActiveConvId(null);
      activeConvIdRef.current = null;
      return;
    }

    resolvingRouteRef.current = routeId;

    // Fallback: Resolve routeId asynchronously from the database
    resolveChatRouteDB(routeId)
      .then(({ success, data }) => {
        if (resolvingRouteRef.current !== routeId) return;
        if (success && data) {
          lastRouteIdRef.current = routeId;
          if (data.type === 'existing' && data.conversation) {
            setConversations((prev) => {
              if (prev.find((c) => c && c.id === data.conversation.id)) return prev;
              return [data.conversation as DBConversation, ...prev];
            });
            if (activeConvIdRef.current !== data.conversation.id) {
              selectConversation(
                data.conversation.id,
                !!data.conversation.isGroup,
                data.conversation.partnerId ?? null
              );
            }
            setPendingDMTarget(null);
          } else if (data.type === 'pending' && data.user) {
            setPendingDMTarget(data.user);
            setLocalActiveConvId(null);
            activeConvIdRef.current = null;
          }
        }
      })
      .catch((err) => {
        console.error('[ConvEngine] resolveChatRouteDB failed:', err);
      })
      .finally(() => {
        if (resolvingRouteRef.current === routeId) {
          resolvingRouteRef.current = null;
        }
      });
  }, [loadingConvs, currentUser?.id, routeId, selectConversation, searchParams]);

  const refreshConversationsRef = useRef(refreshConversations);
  const loadMessagesRef = useRef(loadMessages);
  const loadSettingsRef = useRef(loadSettings);
  const currentUserIdRef = useRef(currentUser?.id);
  const isGroupRef = useRef(isGroup);

  useEffect(() => {
    refreshConversationsRef.current = refreshConversations;
    loadMessagesRef.current = loadMessages;
    loadSettingsRef.current = loadSettings;
    currentUserIdRef.current = currentUser?.id;
    isGroupRef.current = isGroup;
  }, [refreshConversations, loadMessages, loadSettings, currentUser?.id, isGroup]);

  // ─── Realtime Event Listeners ─────────────────────────────────────────
  useEffect(() => {
    const handleSyncConvs = () => {
      void refreshConversationsRef.current();
    };

    const handleSyncMsgs = (e: Event) => {
      const { convId } = (e as CustomEvent).detail || {};
      if (convId === activeConvIdRef.current) {
        void loadMessagesRef.current(convId, isGroupRef.current);
      }
    };

    const handleSettingsUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.chatId && detail?.updates) {
        // Specific patch: merge provided updates into local state immediately
        if (detail.chatId === activeConvIdRef.current) {
          const isFromPartner = detail.senderId && detail.senderId !== currentUserIdRef.current;
          if (isFromPartner) {
            setDmSettings((prev: any) => ({
              ...prev,
              theme_id: detail.updates.theme_id ?? prev.theme_id,
              theme_blur: detail.updates.theme_blur ?? prev.theme_blur,
              updated_at: detail.updates.updated_at ?? prev.updated_at,
            }));
          } else {
            setDmSettings((prev: any) => ({ ...prev, ...detail.updates }));
          }
        }
        setConversations((prev) =>
          prev.map((c) => (c.id === detail.chatId ? {
            ...c,
            theme_id: detail.updates.theme_id ?? c.theme_id,
            theme_blur: detail.updates.theme_blur ?? c.theme_blur,
          } : c))
        );
      } else {
        // Generic reload signal (no detail) — re-fetch settings from DB so
        // theme changes, nicknames, and DM settings sync in real time.
        const convId = activeConvIdRef.current;
        if (convId) {
          void loadSettingsRef.current(convId, false);
        }
      }
    };

    const handleNicknameUpdate = (e: Event) => {
      const { chatId, userId, nickname } = (e as CustomEvent).detail || {};
      if (chatId === activeConvIdRef.current) {
        setDmSettings((prev: any) => {
          if (!prev) return prev;
          if (userId === currentUserIdRef.current) {
            return { ...prev, my_nickname: nickname };
          } else {
            return { ...prev, their_nickname: nickname, partner_nickname: nickname };
          }
        });
      }
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === chatId && !c.isGroup && c.partnerId === userId) {
            return { ...c, partnerNickname: nickname, nickname: nickname };
          }
          return c;
        })
      );
    };

    const handleConvUpdate = (e: Event) => {
      const data = (e as CustomEvent).detail || {};
      setConversations((prev) =>
        prev.map((c) => (c.id === data.id ? { 
          ...c, 
          name: data.name ?? c.name, 
          avatarUrl: data.icon_url ?? c.avatarUrl,
          theme_id: data.theme_id ?? c.theme_id,
          theme_blur: data.theme_blur ?? c.theme_blur,
        } : c))
      );
    };

    const handleChatCleared = (e: Event) => {
      const { chatId } = (e as CustomEvent).detail || {};
      useAppStore.getState().setMessages(chatId, []);
    };

    const handleUserBlocked = (e: Event) => {
      const { chatId, blockedBy } = (e as CustomEvent).detail || {};
      // The blocker already handled removal locally in blockUser() — skip self-trigger
      if (blockedBy === currentUserIdRef.current) return;
      removeConversation(chatId);
      if (chatId === activeConvIdRef.current) {
        setLocalActiveConvId(null);
        activeConvIdRef.current = null;
        setActiveConversation(null);
        router.replace('/messages', { scroll: false });
      }
    };

    const handleParticipantsChange = () => {
      void refreshConversationsRef.current();
    };

    window.addEventListener('verlyn:sync_conversations', handleSyncConvs);
    window.addEventListener('verlyn:sync_messages', handleSyncMsgs);
    window.addEventListener('verlyn:settings_update', handleSettingsUpdate);
    window.addEventListener('verlyn:nickname_update', handleNicknameUpdate);
    window.addEventListener('verlyn:conversation_update', handleConvUpdate);
    window.addEventListener('verlyn:chat_cleared', handleChatCleared);
    window.addEventListener('verlyn:user_blocked', handleUserBlocked);
    window.addEventListener('verlyn:participants_change', handleParticipantsChange);

    return () => {
      window.removeEventListener('verlyn:sync_conversations', handleSyncConvs);
      window.removeEventListener('verlyn:sync_messages', handleSyncMsgs);
      window.removeEventListener('verlyn:settings_update', handleSettingsUpdate);
      window.removeEventListener('verlyn:nickname_update', handleNicknameUpdate);
      window.removeEventListener('verlyn:conversation_update', handleConvUpdate);
      window.removeEventListener('verlyn:chat_cleared', handleChatCleared);
      window.removeEventListener('verlyn:user_blocked', handleUserBlocked);
      window.removeEventListener('verlyn:participants_change', handleParticipantsChange);
    };
  }, [router]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => { if (loadAbortRef.current) loadAbortRef.current.abort(); };
  }, []);

  return {
    conversations, activeConvId, activeConv, messages,
    loadingConvs, loadingMsgs, hasMore, loadingMore,
    dmSettings, setDmSettings, isMuted, muteUntil,
    selectConversation, createDM, loadMoreMessages, refreshConversations,
    clearChat, leaveGroup, blockUser, removeConversation, upsertConversationInList,
    sendMessage, editMessage, deleteMessage, reactToMessage, forwardMessage, pinMessage, starMessage, cancelUpload,
    pendingDMTarget, setPendingDMTarget,
  };
}
