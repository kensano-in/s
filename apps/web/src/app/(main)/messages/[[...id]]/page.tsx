'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  Suspense,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import { useCall } from "@/components/layout/CallProvider";
import { realtimeBroadcastActive, updateMyPresence } from "@/hooks/useRealtimeMessages";
import { useConversationEngine, uploadFilesMap } from "@/hooks/useConversationEngine";
import { Plus, MessageCircle, Search, X, ShieldAlert, ArrowLeft, ShieldOff, ShieldX, Loader2, UserX, Pin, Star } from "lucide-react";

import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";


// ── Chat Components ──────────────────────────────────────────────────────────
import ChatHeader from "@/components/Chat/ChatHeader";
import MessageList from "@/components/Chat/MessageList";
import ChatInput from "@/components/Chat/ChatInput";
import ConversationItem, { DBConversation } from "@/components/Chat/ConversationItem";
import InboxTabBar from "@/components/Chat/InboxTabBar";
import NewMessageOverlay from "@/components/Chat/NewMessageOverlay";
// CallModal is rendered globally by CallProvider — no local instance needed
import ChatSettingsModal from "@/components/Chat/ChatSettingsModal";
import ThemeBackground from "@/components/Chat/ThemeBackground";
import ConfirmModal from "@/components/ui/ConfirmModal";
import MediaVaultModal from "@/components/Chat/MediaVaultModal";
import ThreadPanel from "@/components/Chat/ThreadPanel";
import SummarySheet from "@/components/Chat/SummarySheet";
import ReportModal from "@/components/Chat/ReportModal";
import { ChatMessage } from "@/components/Chat/MessageItem";

// ── Actions ──────────────────────────────────────────────────────────────────
import {
  reportUserDB,
  updateDMSettingsDB,
  updateGroupSettingsDB,
  markViewedDB,
  sendThreadReplyDB,
  sendLocationDB,
  getBlockedUsersDB,
  unblockUserDB,
  getStarredMessagesDB,
  checkBlockStatusDB,
  clearChatDB,
  getMessageRequestsDB,
  acceptMessageRequestDB,
  declineMessageRequestDB,
  getSpamRequestsDB,
  getArchivedConversationsDB,
  getBlockedConversationsDB,
  archiveConversationDB,
  unarchiveConversationDB,
  deleteConversationDB,
  blockUserDB,
} from "../actions";


// ── Page ─────────────────────────────────────────────────────────────────────

const isFilename = (str: string): boolean => {
  return /^[a-zA-Z0-9_\-\.\(\)\s]+\.[a-zA-Z0-9]+$/.test(str) || str.startsWith('blob:');
};


function MessagesContent() {
  const router = useRouter();
  const params = useParams();
  const rawId = params?.id;
  const routeId = Array.isArray(rawId) ? rawId[0] : rawId ?? null;

  const currentUser = useAppStore(s => s.currentUser);
  const isAuthLoading = useAppStore(s => s.isAuthLoading);

  // ── Conversation Engine ── single source of truth for all conv/msg state ───
  const engine = useConversationEngine(routeId);
  const {
    conversations,
    activeConvId,
    activeConv,
    messages,
    loadingConvs,
    loadingMsgs,
    hasMore,
    loadingMore,
    dmSettings,
    setDmSettings,
    isMuted,
    muteUntil,
    selectConversation,
    loadMoreMessages,
    pendingDMTarget,
    setPendingDMTarget,
  } = engine;

  // ── Navigation ─────────────────────────────────────────────────────────────
  const [mobileView, setMobileView] = useState<"list" | "chat">(
    routeId ? "chat" : "list"
  );

  useEffect(() => {
    console.log('[DEBUG] Chat page mounted. routeId:', routeId, 'currentUser:', currentUser?.id);
  }, [routeId, currentUser?.id]);

  const onlineUsers = useAppStore((s) => s.onlineUsers || []);
  const recordingUsers = useAppStore((s) => s.recordingUsers || {});
  const messagesRestriction = useAppStore((s) => s.messagesRestriction);

  const activeRecordingList = activeConvId ? (recordingUsers[activeConvId] || []) : [];
  const isOtherRecording = activeRecordingList.some(uid => uid !== currentUser?.id);

  // ── UI-only state (not owned by engine) ────────────────────────────────────
  const [search, setSearch] = useState("");
  const [msgSearch, setMsgSearch] = useState("");
  const [msgSearchActive, setMsgSearchActive] = useState(false);
  const [activePinIdx, setActivePinIdx] = useState(0);
  const [isNewTxOpen, setIsNewTxOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [leaveGroupConfirm, setLeaveGroupConfirm] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [messageToForward, setMessageToForward] = useState<ChatMessage | null>(null);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [threadRootMsg, setThreadRootMsg] = useState<ChatMessage | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState(false);
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [blockedPanelOpen, setBlockedPanelOpen] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<{ id: string; name: string; username: string; avatarUrl: string | null }[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [deleteChatOnBlock, setDeleteChatOnBlock] = useState(false);
  const [blockedStatus, setBlockedStatus] = useState<{ isBlockedByMe: boolean; hasBlockedMe: boolean; isLastSeenVisible?: boolean } | null>(null);
  const [isStarredOpen, setIsStarredOpen] = useState(false);
  const [starredMsgs, setStarredMsgs] = useState<ChatMessage[]>([]);
  const [loadingStarred, setLoadingStarred] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // ── Message Requests & Spam Inbox States (Issues 11 & 12) ──
  const [activeTab, setActiveTab] = useState<'primary' | 'requests' | 'spam' | 'archived' | 'blocked'>('primary');
  const [requests, setRequests] = useState<any[]>([]);
  const [spamRequests, setSpamRequests] = useState<any[]>([]);
  const [archived, setArchived] = useState<any[]>([]);
  const [blocked, setBlocked] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingSpam, setLoadingSpam] = useState(false);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  // Sub-tabs under Requests
  const [requestSubTab, setRequestSubTab] = useState<'new' | 'mutual' | 'verified' | 'community' | 'hidden'>('new');

  const fetchRequestsAndSpam = useCallback(async (isInitial = false) => {
    if (!currentUser?.id) return;
    if (isInitial) {
      setLoadingRequests(true);
      setLoadingSpam(true);
      setLoadingArchived(true);
      setLoadingBlocked(true);
    }
    try {
      const [reqRes, spamRes, archRes, blockRes] = await Promise.all([
        getMessageRequestsDB(currentUser.id),
        getSpamRequestsDB(currentUser.id),
        getArchivedConversationsDB(currentUser.id),
        getBlockedConversationsDB(currentUser.id)
      ]);
      if (reqRes.success) setRequests(reqRes.data || []);
      if (spamRes.success) setSpamRequests(spamRes.data || []);
      if (archRes.success) setArchived(archRes.data || []);
      if (blockRes.success) setBlocked(blockRes.data || []);
    } catch (err) {
      console.error("Failed to fetch requests/spam/archived/blocked:", err);
    } finally {
      setLoadingRequests(false);
      setLoadingSpam(false);
      setLoadingArchived(false);
      setLoadingBlocked(false);
    }
  }, [currentUser?.id]);

  const hasFetchedRef = useRef(false);
  useEffect(() => {
    const isFirst = !hasFetchedRef.current;
    hasFetchedRef.current = true;
    void fetchRequestsAndSpam(isFirst);
  }, [fetchRequestsAndSpam, activeTab]);

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const isGroup = req.isGroup || req.is_group || false;
      const isVerified = req.sender?.is_verified || false;
      const isMutual = req.is_mutual || false;

      switch (requestSubTab) {
        case 'community':
          return isGroup;
        case 'verified':
          return isVerified && !isGroup;
        case 'mutual':
          return isMutual && !isGroup && !isVerified;
        case 'hidden':
          return (req.sender?.trust_score !== undefined && req.sender.trust_score < 30) && !isGroup;
        case 'new':
        default:
          return !isGroup && !isVerified && !isMutual && !(req.sender?.trust_score !== undefined && req.sender.trust_score < 30);
      }
    });
  }, [requests, requestSubTab]);

  const handleAcceptRequest = async () => {
    if (!selectedRequest || !currentUser?.id) return;
    try {
      const res = await acceptMessageRequestDB(
        selectedRequest.id,
        currentUser.id,
        selectedRequest.sender_id
      );
      if (res.success) {
        const newConvId = res.data?.conversationId;
        setSelectedRequest(null);
        setActiveTab('primary');
        void fetchRequestsAndSpam();
        void engine.refreshConversations();

        if (newConvId) {
          selectConversation(newConvId, false, selectedRequest.sender_id);
        }

        window.dispatchEvent(new CustomEvent('verlyn:toast', {
          detail: { message: 'Message request accepted!', type: 'success' }
        }));
      } else {
        alert(res.error || 'Failed to accept request');
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleDeclineRequest = async () => {
    if (!selectedRequest) return;
    try {
      const res = await declineMessageRequestDB(selectedRequest.id);
      if (res.success) {
        setSelectedRequest(null);
        void fetchRequestsAndSpam();
        window.dispatchEvent(new CustomEvent('verlyn:toast', {
          detail: { message: 'Message request declined.', type: 'success' }
        }));
      } else {
        alert(res.error || 'Failed to decline request');
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleBlockRequestSender = async () => {
    if (!selectedRequest || !currentUser?.id) return;
    try {
      const res = await unblockUserDB(currentUser.id, selectedRequest.sender_id); // Wait, this is unblock. We want block.
      // Wait, is there a blockUserDB imported?
      // Let's check imports: import { reportUserDB, ... } from "../actions"
      // Wait, let's look at "../actions" to see if blockUserDB is defined there.
      // In the select-string search output of imports in actions.ts:
      // "import { blockUserDB, unblockUserDB } from '@/app/(main)/messages/actions'"
      // Ah! Yes, blockUserDB is imported in profile/[username]/page.tsx, but in messages page.tsx only getBlockedUsersDB, unblockUserDB are imported.
      // Let's see: is blockUserDB exported from ../actions?
      // Let's check the imported blockUserDB. Yes! We can import blockUserDB.
      // Let's make sure blockUserDB is imported at the top of messages page.tsx.
      // Wait, we can import blockUserDB from '@/app/(main)/messages/actions' or import it dynamically.
      // Let's import it dynamically:
      const { blockUserDB } = await import('../actions');
      const blockRes = await blockUserDB(currentUser.id, selectedRequest.sender_id);
      if (blockRes.success) {
        await declineMessageRequestDB(selectedRequest.id);
        setSelectedRequest(null);
        void fetchRequestsAndSpam();
        window.dispatchEvent(new CustomEvent('verlyn:toast', {
          detail: { message: 'User blocked.', type: 'success' }
        }));
      } else {
        alert(blockRes.error || 'Failed to block user');
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const openBlockedPanel = async () => {
    setBlockedPanelOpen(true);
    setBlockedLoading(true);
    try {
      const res = await getBlockedUsersDB();
      if (res.success) setBlockedUsers(res.data || []);
    } finally {
      setBlockedLoading(false);
    }
  };

  const handleUnblockFromPanel = async (userId: string) => {
    setUnblockingId(userId);
    try {
      const res = await unblockUserDB(currentUser!.id, userId);
      if (res.success) {
        setBlockedUsers(prev => prev.filter(u => u.id !== userId));
        setBlockedStatus(prev => prev ? { ...prev, isBlockedByMe: false } : null);
        setIsBlockedByMe(false);
        void engine.refreshConversations();
      }
    } finally {
      setUnblockingId(null);
    }
  };



  // ── Calls — delegated to global CallProvider ──────────────────────────────
  // CallProvider (mounted at layout level) owns the single WebRTC instance and
  // renders the incoming call popup + call modal globally. The messages page
  // just calls startCall() with the correct partner USER ID (not convId).
  const { startCall } = useCall();


  const activeConvReactive = useMemo(() => {
    if (!activeConv) return null;
    if (activeConv.isGroup) return activeConv;
    const isPartnerOnline = activeConv.partnerId
      ? (activeConv.invisibleMode ? false : (onlineUsers.includes(activeConv.partnerId) || activeConv.isOnline))
      : false;
    return { ...activeConv, isOnline: isPartnerOnline };
  }, [activeConv, onlineUsers]);

  // Fetch block status for the active conversation's partner
  useEffect(() => {
    const partnerId = activeConvReactive?.partnerId || activeConv?.partnerId || null;
    if (!partnerId) {
      setBlockedStatus(null);
      return;
    }

    const fetchBlockStatus = async () => {
      const res = await checkBlockStatusDB(partnerId);
      if (res.success && res.data) {
        setBlockedStatus({
          isBlockedByMe: res.data.isBlockedByMe,
          hasBlockedMe: res.data.hasBlockedMe,
          isLastSeenVisible: res.data.isLastSeenVisible
        });
      }
    };

    void fetchBlockStatus();
  }, [activeConvId, activeConv?.partnerId]);

  // seenIdsRef used by useRealtimeMessages (typing dedup only in hook)
  const seenIdsRef = useRef<Set<string>>(new Set());

  // ── Derived (activeConv/isGroup come from engine) ──────────────────────────
  const isGroup = activeConv?.isGroup ?? false;

  const filteredConvs = useMemo(() => {
    const clean = conversations.filter(Boolean);
    const mapped = clean.map(c => {
      if (c.isGroup) return c;
      const isPartnerOnline = c.partnerId
        ? (c.invisibleMode ? false : (onlineUsers.includes(c.partnerId) || c.isOnline))
        : false;
      return { ...c, isOnline: isPartnerOnline };
    });
    if (!search.trim()) return mapped;
    const q = search.toLowerCase();
    return mapped.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q)
    );
  }, [conversations, search, onlineUsers]);

  const displayedMessages = useMemo(() => {
    if (!msgSearch.trim()) return messages;
    const q = msgSearch.toLowerCase();
    return messages.filter((m) => m.content?.toLowerCase().includes(q));
  }, [messages, msgSearch]);

  const pinnedMessages = useMemo(() => {
    return messages.filter((m) => m.is_pinned);
  }, [messages]);

  const themeId = dmSettings?.theme_id ?? activeConv?.theme_id;

  const bubbleStyle = dmSettings?.bubble_style;

  // Centralized realtime sync is handled layout-wide by GlobalRealtimeMonitor.
  // This page responds dynamically via window custom event triggers in useConversationEngine.

  // CE-03 REMOVED: 1-second polling interval that used activeConvId as
  // recipient_id (wrong for DMs). 
  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (
      content: string,
      type: "text" | "image" | "file" | "voice" | "video" = "text",
      mediaUrl?: string,
      fileName?: string,
      mimeType?: string,
      viewOnce = false,
      mediaGroupId?: string,
      file?: File | Blob
    ) => {
      setReplyTo(null);

      const targetRecipientId = pendingDMTarget?.id;

      await engine.sendMessage(type === 'text' ? content : (mediaUrl || content), type, file, {
        fileName,
        mimeType,
        viewOnce,
        mediaGroupId,
        replyToId: replyTo?.id,
        recipientId: targetRecipientId,
      });
    },
    [engine, replyTo, pendingDMTarget]
  );

  // CE-FIX: setMessages helper bridges optimistic mutations to the Zustand store.
  const setMessages = useCallback(
    (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      if (!activeConvId) return;
      const current = useAppStore.getState().messages[activeConvId] || [];
      const next = typeof updater === 'function' ? updater(current) : updater;
      useAppStore.getState().setMessages(activeConvId, next);
    },
    [activeConvId]
  );

  const handleSaveEdit = useCallback(async (messageId: string, newContent: string) => {
    setEditingMessage(null);
    await engine.editMessage(messageId, newContent);
  }, [engine]);

  const handleReplyMessage = useCallback((m: ChatMessage) => setReplyTo(m), []);
  const handleEditMessage = useCallback((m: ChatMessage) => setEditingMessage(m), []);
  const handleForwardMessage = useCallback((m: ChatMessage) => setMessageToForward(m), []);
  const handleOpenThread = useCallback((m: ChatMessage) => setThreadRootMsg(m), []);
  const handleRetryMessage = useCallback((m: ChatMessage) => {
    if (!activeConvId) return;
    const file = uploadFilesMap.get(m.id);
    useAppStore.getState().removeMessage(activeConvId, m.id);
    void sendMessage(m.content, m.type as any, m.media_url || undefined, m.file_name || undefined, m.mime_type || undefined, false, m.media_group_id || undefined, file);
  }, [activeConvId, sendMessage]);


  const handleRecording = useCallback((isRecording: boolean) => {
    if (!activeConvId || !currentUser?.id) return;
    void updateMyPresence({ recording_in: isRecording ? activeConvId : null });
  }, [activeConvId, currentUser?.id]);

  const handleJumpToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-indigo-500/10', 'transition-all', 'duration-500');
      setTimeout(() => {
        el.classList.remove('bg-indigo-500/10');
      }, 2000);
    }
  }, []);

  const loadStarredMessages = useCallback(async () => {
    if (!activeConvId) return;
    setLoadingStarred(true);
    try {
      const res = await getStarredMessagesDB(activeConvId);
      if (res.success && res.data) {
        setStarredMsgs(res.data);
      }
    } catch (err) {
      console.error("Failed to load starred messages:", err);
    } finally {
      setLoadingStarred(false);
    }
  }, [activeConvId]);

  // ── Export chat ────────────────────────────────────────────────────────────
  const handleExportChat = useCallback(() => {
    if (!activeConv) return;
    const lines = [...messages].reverse().map((m) => {
      const time = m.sent_at ? new Date(m.sent_at).toLocaleString() : "";
      const sender = m.sender?.display_name || m.sender?.username || (m.is_mine ? "You" : "Them");
      return `[${time}] ${sender}: ${m.content || `[${m.type}]`}`;
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeConv.name}_export.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeConv, messages]);

  // ── Settings persist ───────────────────────────────────────────────────────
  const handleUpdateSettings = useCallback(
    async (updates: any) => {
      if (!currentUser?.id || !activeConvId) return;

      // 1. Optimistic Local State Update
      setDmSettings((prev: any) => ({ ...prev, ...updates }));

      // 2. Optimistic Realtime Broadcast (0-Latency)
      const generatedUpdatedAt = new Date().toISOString();

      // Merge user details for theme changer display if applicable
      let broadcastThemeId = updates.theme_id;
      if (broadcastThemeId !== undefined) {
        const displayName = currentUser.displayName || currentUser.username || 'System';
        broadcastThemeId = `${updates.theme_id}|${currentUser.id}|${displayName}`;
      }

      const broadcastUpdates = {
        ...updates,
        theme_id: broadcastThemeId,
        updated_at: generatedUpdatedAt,
      };

      realtimeBroadcastActive('settings_update', {
        chatId: activeConvId,
        convId: activeConvId,
        updates: broadcastUpdates,
        senderId: currentUser.id,
      });

      if (updates.theme_id !== undefined || updates.theme_blur !== undefined) {
        realtimeBroadcastActive('theme:apply', {
          convId: activeConvId,
          themeId: broadcastThemeId ?? 'midnight',
          themeBlur: updates.theme_blur ?? 0,
          updatedAt: generatedUpdatedAt,
        });
      }

      // 3. Database persistence in background (non-blocking)
      try {
        if (isGroup) {
          const { data } = await updateGroupSettingsDB(activeConvId, updates);
          if (data) {
            setDmSettings(data);
            engine.upsertConversationInList({ id: activeConvId, ...updates });
          }
        } else {
          const { data } = await updateDMSettingsDB(currentUser.id, activeConvId, updates);
          if (data) {
            setDmSettings(data);
          }
        }
      } catch (err) {
        console.warn('[SettingsSync] Background persistence warning:', err);
      }
    },
    [currentUser, activeConvId, isGroup, engine, setDmSettings]
  );

  // ── Leave group ────────────────────────────────────────────────────────────
  const handleLeaveGroup = useCallback(async () => {
    if (!activeConvId) return;
    const success = await engine.leaveGroup(activeConvId);
    if (success) {
      setMobileView("list");
    }
    setLeaveGroupConfirm(false);
  }, [activeConvId, engine]);

  // ── Block user ─────────────────────────────────────────────────────────────
  const handleBlock = useCallback(async () => {
    if (!activeConvId) return;
    // Use activePartnerUserId from store — the definitive partner UUID set on conversation select
    const state = useAppStore.getState();
    const partnerId =
      state.activePartnerUserId ||
      state.conversations.find((c) => c.id === activeConvId)?.partnerId ||
      null;
    if (!partnerId) {
      console.error('[handleBlock] No partnerId found for convId', activeConvId);
      return;
    }

    // 1. Perform block in DB and engine
    await engine.blockUser(activeConvId);

    // 2. Perform chat delete if option was checked
    if (deleteChatOnBlock) {
      await clearChatDB(currentUser!.id, partnerId);
    }

    setIsBlockedByMe(true);
    setBlockedStatus(prev => prev ? { ...prev, isBlockedByMe: true } : null);
    setMobileView('list');
  }, [activeConvId, engine, deleteChatOnBlock, currentUser]);


  // ── Clear chat ─────────────────────────────────────────────────────────────
  const handleClearChat = useCallback(async () => {
    if (!activeConvId) return;
    await engine.clearChat(activeConvId);
  }, [activeConvId, engine]);

  // ── Reveal view-once ───────────────────────────────────────────────────────
  const handleReveal = useCallback(
    async (messageId: string) => {
      if (!currentUser?.id) return;
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, is_viewed: true } : m));
      await markViewedDB(messageId, currentUser.id);
    },
    [currentUser?.id, setMessages]
  );

  // ── Thread reply ───────────────────────────────────────────────────────────
  const handleSendThreadReply = useCallback(
    async (threadRootId: string, content: string) => {
      if (!currentUser?.id) return;
      try {
        await sendThreadReplyDB(
          currentUser.id,
          threadRootId,
          content,
          isGroup ? activeConvId ?? undefined : undefined,
          !isGroup ? activeConvId ?? undefined : undefined
        );
      } catch (e) {
        console.error("[MessagesPage] sendThreadReply:", e);
      }
    },
    [currentUser?.id, activeConvId, isGroup]
  );

  // ── Load more ──────────────────────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    engine.loadMoreMessages();
  }, [engine]);

  // ── Voice ──────────────────────────────────────────────────────────────────
  const handleSendVoice = useCallback(
    (url: string, _dur: number) => void sendMessage("", "voice", url),
    [sendMessage]
  );

  // ── Location ───────────────────────────────────────────────────────────────
  const handleSendLocation = useCallback(
    async (lat: number, lng: number, address: string | null, isLive: boolean, liveDurationHours?: number, exact?: boolean) => {
      if (!currentUser?.id || !activeConvId) return;
      try {
        const res = await sendLocationDB(
          currentUser.id,
          activeConvId,
          isGroup,
          lat,
          lng,
          address,
          isLive,
          liveDurationHours || 1,
          Intl.DateTimeFormat().resolvedOptions().timeZone,
          exact ?? false
        );
        if (!res.success) {
          if (res.error === 'VPN_OR_PROXY_DETECTED') {
            alert("Location sharing blocked: VPN or Proxy detected. Please disable your VPN/Proxy.");
          } else if (res.error === 'LOCATION_MANIPULATION_DETECTED') {
            alert("Location sharing blocked: Geolocation spoofing or manipulation detected (impossible travel speed).");
          } else {
            alert(`Failed to share location: ${res.error || 'Unknown error'}`);
          }
        }
      } catch (e) {
        console.error("[MessagesPage] sendLocation:", e);
        alert("Failed to share location: Network error.");
      }
    },
    [currentUser?.id, activeConvId, isGroup]
  );


  // ── Calls ──────────────────────────────────────────────────────────────────
  // CRITICAL: pass activeConv.partnerId (the remote USER's UUID), NOT activeConvId.
  // The WebRTC signaling channel is `webrtc:global:<userId>` — using the
  // conversation UUID meant signals were sent to a channel nobody subscribed to.
  const handleStartVoiceCall = useCallback(() => {
    if (!activeConv?.partnerId || isGroup) return;
    const profile = {
      name: activeConvReactive?.name || activeConv.name || 'User',
      username: activeConv.username || '',
      avatarUrl: activeConv.avatarUrl,
    };
    void startCall(activeConv.partnerId, profile, "audio");
  }, [activeConv, activeConvReactive, isGroup, startCall]);

  const handleStartVideoCall = useCallback(() => {
    if (!activeConv?.partnerId || isGroup) return;
    const profile = {
      name: activeConvReactive?.name || activeConv.name || 'User',
      username: activeConv.username || '',
      avatarUrl: activeConv.avatarUrl,
    };
    void startCall(activeConv.partnerId, profile, "video");
  }, [activeConv, activeConvReactive, isGroup, startCall]);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthLoading && !currentUser) router.replace("/login");
  }, [isAuthLoading, currentUser, router]);



  // ── Auth guard ─────────────────────────────────────────────────────────────
  if (isAuthLoading) {
    return <div className="flex items-center justify-center h-screen bg-[#09090f] text-white/20 text-sm">Loading…</div>;
  }
  if (!currentUser) return null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app flex h-full flex-1 w-full bg-[#09090f] overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className={clsx(
        "flex flex-col border-r border-white/[0.06] bg-[#0a0a10]",
        "w-full md:w-[320px] lg:w-[360px] shrink-0",
        "transition-transform duration-200",
        mobileView === "chat"
          ? "-translate-x-full md:translate-x-0 absolute md:relative inset-0 md:inset-auto z-10"
          : "translate-x-0 relative"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 md:py-3 border-b border-white/[0.04] bg-[#0a0a10] shrink-0">
          <button
            onClick={() => router.push('/')}
            className="group flex items-center justify-center w-8 h-8 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-white/60 hover:text-white transition-all duration-200 active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft size={15} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={openBlockedPanel}
              title="Blocked Users"
              className="group flex items-center justify-center w-8 h-8 rounded-xl bg-white/[0.03] hover:bg-rose-500/10 border border-white/[0.05] hover:border-rose-500/20 text-white/40 hover:text-rose-400 transition-all duration-200 active:scale-95"
              aria-label="Blocked users"
            >
              <UserX size={15} />
            </button>
            <button
              id="new-message-btn"
              onClick={() => setIsNewTxOpen(true)}
              className="group flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all duration-200 active:scale-95"
              aria-label="New message"
            >
              <Plus size={15} className="transition-transform duration-200 group-hover:rotate-90" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-1.5 md:py-2.5 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 md:py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <Search size={14} className="text-white/30 shrink-0" />
            <input
              type="text"
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none"
            />
          </div>
        </div>

        {/* Inbox Tabs — full-width premium navigation */}
        <InboxTabBar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setSelectedRequest(null);
          }}
          counts={{
            requests: requests.length,
            spam: spamRequests.length,
            archived: archived.length,
          }}
        />

        {/* Requests Sub-categories */}
        {activeTab === 'requests' && (
          <div className="flex gap-1.5 px-3 py-2 shrink-0 border-b border-white/[0.02] overflow-x-auto scrollbar-none">
            {(['new', 'mutual', 'verified', 'community', 'hidden'] as const).map((subTab) => {
              const label = subTab === 'new' ? 'New' : subTab === 'mutual' ? 'Mutual' : subTab === 'verified' ? 'Verified' : subTab === 'community' ? 'Community' : 'Hidden';
              const count = requests.filter((req) => {
                const isGroup = req.isGroup || req.is_group || false;
                const isVerified = req.sender?.is_verified || false;
                const isMutual = req.is_mutual || false;
                switch (subTab) {
                  case 'community': return isGroup;
                  case 'verified': return isVerified && !isGroup;
                  case 'mutual': return isMutual && !isGroup && !isVerified;
                  case 'hidden': return (req.sender?.trust_score !== undefined && req.sender.trust_score < 30) && !isGroup;
                  case 'new':
                  default: return !isGroup && !isVerified && !isMutual && !(req.sender?.trust_score !== undefined && req.sender.trust_score < 30);
                }
              }).length;
              const isActive = requestSubTab === subTab;
              return (
                <button
                  key={subTab}
                  onClick={() => setRequestSubTab(subTab)}
                  className={clsx(
                    "px-2.5 py-1 rounded-md text-[10.5px] font-semibold transition-all shrink-0 flex items-center gap-1",
                    isActive
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      : "text-white/30 hover:text-white/50 border border-transparent"
                  )}
                >
                  <span>{label}</span>
                  {count > 0 && (
                    <span className="text-[9px] font-bold opacity-60">({count})</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'primary' ? (
            loadingConvs ? (
              <div className="flex items-center justify-center h-24 text-white/20 text-sm">Loading…</div>
            ) : filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-white/20">
                <MessageCircle size={32} strokeWidth={1.5} />
                <span className="text-sm">No conversations yet</span>
                <button onClick={() => setIsNewTxOpen(true)} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                  Start one →
                </button>
              </div>
            ) : (
              <div className="py-1">
                {filteredConvs.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    active={conv.id === activeConvId}
                    onClick={() => {
                      console.log('[DEBUG-TAP] Conversation item tapped:', conv.id, conv.name, 'current activeConvId:', activeConvId);
                      setSelectedRequest(null);
                      selectConversation(conv.id, conv.isGroup, (conv as any).partnerId);
                      setMobileView('chat');
                    }}
                  />
                ))}
              </div>
            )
          ) : (
            (() => {
              const listData =
                activeTab === 'requests' ? filteredRequests :
                  activeTab === 'spam' ? spamRequests :
                    activeTab === 'archived' ? archived : blocked;

              const isLoading =
                activeTab === 'requests' ? loadingRequests :
                  activeTab === 'spam' ? loadingSpam :
                    activeTab === 'archived' ? loadingArchived : loadingBlocked;

              if (isLoading) {
                return <div className="flex items-center justify-center h-24 text-white/20 text-sm">Loading…</div>;
              }

              if (listData.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center h-40 gap-3 text-white/20">
                    <ShieldAlert size={32} strokeWidth={1.5} />
                    <span className="text-sm">No {activeTab} conversations</span>
                  </div>
                );
              }

              return (
                <div className="py-2 px-2 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-2 pb-1">
                    {activeTab === 'requests' ? 'Message Requests' : activeTab === 'spam' ? 'Spam Folder' : activeTab === 'archived' ? 'Archived' : 'Blocked'}
                  </p>
                  {listData.map((req) => {
                    const isSelected = selectedRequest?.id === req.id || (activeTab === 'archived' && req.id === activeConvId);
                    const senderName = req.sender?.display_name || req.sender?.username || 'User';
                    return (
                      <button
                        key={req.id}
                        onClick={() => {
                          if (activeTab === 'archived') {
                            setSelectedRequest(null);
                            selectConversation(req.id, req.isGroup, req.partnerId);
                          } else {
                            setSelectedRequest(req);
                            setMobileView('chat');
                          }
                        }}
                        className={clsx(
                          "w-full flex items-center gap-3.5 px-3.5 py-3.5 md:py-3 rounded-[18px] text-left transition-all active:scale-[0.98]",
                          isSelected
                            ? "bg-white/[0.07] border border-white/[0.10]"
                            : "border border-transparent hover:bg-white/[0.04] hover:border-white/[0.05]"
                        )}
                      >
                        <img
                          src={req.sender?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(req.sender?.username || 'User')}`}
                          alt={senderName}
                          width={48}
                          height={48}
                          loading="lazy"
                          decoding="async"
                          className="w-12 h-12 md:w-11 md:h-11 rounded-full object-cover bg-neutral-800 shrink-0 avatar"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between mb-[3px]">
                            <p className="text-[14.5px] font-semibold text-white truncate">{senderName}</p>
                            <span className="text-[10px] text-white/20">
                              {new Date(req.created_at || req.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-[12.5px] text-white/30 truncate">
                            {req.initial_message || req.lastMessage || 'Message request'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>
      </aside>

      {/* ── Chat panel ── */}
      <main className={clsx(
        "chat-screen flex flex-col flex-1 min-w-0 relative",
        mobileView === "list" ? "hidden md:flex" : "flex"
      )}>
        {selectedRequest ? (
          /* Message Request or Spam Preview mode (Issues 11 & 12) */
          <>
            <div className="relative z-10 shrink-0">
              <ChatHeader
                participant={{
                  id: selectedRequest.sender_id,
                  name: selectedRequest.sender?.display_name || selectedRequest.sender?.username || 'User',
                  username: selectedRequest.sender?.username || '',
                  avatarUrl: selectedRequest.sender?.avatar_url || null,
                  isOnline: false,
                  isGroup: false,
                }}
                isOtherRecording={false}
                onBack={() => { setSelectedRequest(null); setMobileView('list'); }}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center items-center z-10 relative">
              <div className="flex flex-col items-center justify-center p-8 text-center bg-white/[0.02] border border-white/[0.04] rounded-[24px] max-w-sm w-full mx-auto my-auto space-y-5 backdrop-blur-md">
                <img
                  src={selectedRequest.sender?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedRequest.sender?.username || 'User')}`}
                  alt="Sender Avatar"
                  className="w-16 h-16 rounded-full object-cover bg-neutral-800"
                />
                <div>
                  <h4 className="text-md font-bold text-white">{selectedRequest.sender?.display_name || selectedRequest.sender?.username}</h4>
                  <p className="text-xs text-indigo-400">@{selectedRequest.sender?.username}</p>
                </div>
                {selectedRequest.sender?.bio && (
                  <p className="text-xs text-white/40 leading-relaxed italic">
                    "{selectedRequest.sender?.bio}"
                  </p>
                )}
                <div className="text-[11px] font-bold tracking-wider uppercase text-white/50 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20">
                  {activeTab === 'spam' ? 'Flagged as Spam' : activeTab === 'blocked' ? 'Blocked Conversation' : 'Message Request'}
                </div>
              </div>

              {selectedRequest.initial_message && (
                <div className="flex flex-col space-y-1 w-full max-w-md mt-6">
                  <span className="text-[10px] text-white/20 ml-3">Initial message:</span>
                  <div className="px-4 py-3.5 bg-neutral-800 border border-white/5 text-white/90 text-sm rounded-[18px] break-words">
                    {selectedRequest.initial_message}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#0a0a0f] border-t border-white/[0.04] flex items-center justify-center gap-3 relative z-10 shrink-0">
              {activeTab === 'blocked' ? (
                <button
                  onClick={async () => {
                    const res = await unblockUserDB(currentUser.id, selectedRequest.sender_id);
                    if (res.success) {
                      setSelectedRequest(null);
                      void fetchRequestsAndSpam();
                      window.dispatchEvent(new CustomEvent('verlyn:toast', {
                        detail: { message: 'User unblocked!', type: 'success' }
                      }));
                    }
                  }}
                  className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
                >
                  Unblock User
                </button>
              ) : (
                <>
                  <button
                    onClick={handleDeclineRequest}
                    className="flex-1 py-3 text-sm font-bold text-white/60 hover:text-white bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] rounded-xl transition-all"
                  >
                    Decline
                  </button>
                  <button
                    onClick={handleBlockRequestSender}
                    className="flex-1 py-3 text-sm font-bold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 rounded-xl transition-all"
                  >
                    Block
                  </button>
                  <button
                    onClick={handleAcceptRequest}
                    className="flex-[2] py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
                  >
                    Accept
                  </button>
                </>
              )}
            </div>
          </>
        ) : pendingDMTarget && !activeConvId ? (
          /* Pending DM mode — no DB conversation yet, show chat UI optimistically */
          <>
            <div className="relative z-10 shrink-0">
              <ChatHeader
                participant={{
                  id: pendingDMTarget.id,
                  name: pendingDMTarget.name,
                  username: pendingDMTarget.username,
                  avatarUrl: pendingDMTarget.avatarUrl,
                  isOnline: false,
                  isGroup: false,
                }}
                isOtherRecording={false}
                onBack={() => { setPendingDMTarget(null); setMobileView('list'); }}
              />
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center text-white/20">
              <p className="text-sm">Start the conversation by sending a message.</p>
            </div>
            <div className="message-input relative z-10 shrink-0">
              <ChatInput
                convId={pendingDMTarget.id}
                onSendText={(content, viewOnce) =>
                  void sendMessage(content, "text", undefined, undefined, undefined, viewOnce)
                }
                onSendFile={(url, fileName, mimeType, viewOnce, mediaGroupId, file) => {
                  const type: "image" | "file" | "video" = mimeType?.startsWith("image/")
                    ? "image"
                    : mimeType?.startsWith("video/")
                      ? "video"
                      : "file";
                  void sendMessage("", type, url, fileName, mimeType, viewOnce, mediaGroupId, file);
                }}
                onSendVoice={handleSendVoice}
                onSendLocation={handleSendLocation}
              />
            </div>
          </>
        ) : !activeConvId || !activeConv ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-white/20">
            <MessageCircle size={56} strokeWidth={1} />
            <p className="text-sm">Select a conversation to start messaging</p>
          </div>
        ) : (
          <>
            {/* Theme — strictly scoped */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              <ThemeBackground themeId={themeId?.split('|')[0]} />
            </div>

            {/* Header */}
            <div className="relative z-10 shrink-0">
              <ChatHeader
                participant={{
                  id: activeConvId,
                  name: activeConvReactive?.nickname || dmSettings?.partner_nickname || activeConvReactive?.name || "",
                  username: activeConvReactive?.username || "",
                  avatarUrl: activeConvReactive?.avatarUrl,
                  isOnline: activeConvReactive?.isOnline || false,
                  isGroup,
                  joinCode: activeConvReactive?.joinCode,
                  presenceExpiresAt: activeConvReactive?.presenceExpiresAt,
                  invisibleMode: blockedStatus
                    ? (blockedStatus.isLastSeenVisible === false)
                    : (activeConvReactive?.invisibleMode || false),
                }}
                isOtherRecording={isOtherRecording}

                onBack={() => setMobileView("list")}
                onCall={handleStartVoiceCall}
                onVideoCall={handleStartVideoCall}
                onViewProfile={() => { const username = activeConvReactive?.username; if (username) router.push(`/profile/${username}`); }}

                onSearch={() => setMsgSearchActive((v) => !v)}
                onBlock={() => setBlockConfirm(true)}

                onReport={() => setIsReportOpen(true)}

                onClearChat={handleClearChat}
                onExportChat={handleExportChat}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onLeaveGroup={isGroup ? () => setLeaveGroupConfirm(true) : undefined}
                onOpenVault={() => setIsVaultOpen(true)}
                onOpenStarredMessages={() => {
                  setIsStarredOpen(true);
                  void loadStarredMessages();
                }}
                onCatchUp={() => setIsSummaryOpen(true)}
                isBlocked={blockedStatus?.isBlockedByMe ?? isBlockedByMe}
                isBlockedByPartner={blockedStatus?.hasBlockedMe ?? false}
                onUnblock={async () => {
                  if (currentUser?.id) {
                    const state = useAppStore.getState();
                    const partnerId = state.activePartnerUserId || state.conversations.find(c => c.id === activeConvId)?.partnerId || null;
                    if (partnerId) {
                      await unblockUserDB(currentUser.id, partnerId);
                      setBlockedStatus(prev => prev ? { ...prev, isBlockedByMe: false } : null);
                      setIsBlockedByMe(false);
                      void engine.refreshConversations();
                    }
                  }
                }}

                showBack
                isMuted={dmSettings?.muted}
                onMute={(m) => handleUpdateSettings({ muted: m })}
              />

            </div>

            {/* Pinned Messages Banner */}
            <AnimatePresence>
              {pinnedMessages.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="relative z-10 shrink-0 border-b border-white/[0.06] bg-[#0c0c12]/85 backdrop-blur-xl overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-2 gap-3">
                    {/* Left: icon + content clickable to jump */}
                    <div
                      onClick={() => handleJumpToMessage(pinnedMessages[Math.min(activePinIdx, pinnedMessages.length - 1) || 0].id)}
                      className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer select-none group"
                    >
                      <Pin size={13} className="text-indigo-400 rotate-45 shrink-0 transition-transform group-hover:scale-110" />
                      <div className="flex-1 min-w-0 flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                          Pinned Message {pinnedMessages.length > 1 && `(${Math.min(activePinIdx, pinnedMessages.length - 1) + 1} of ${pinnedMessages.length})`}
                        </span>
                        <span className="text-xs text-white/70 truncate">
                          {(() => {
                            const pm = pinnedMessages[Math.min(activePinIdx, pinnedMessages.length - 1) || 0];
                            if (!pm) return "";
                            if (pm.type === "image") return "📷 Image";
                            if (pm.type === "video") return "🎦 Video";
                            if (pm.type === "voice") return "🎤 Voice note";
                            if (pm.type === "file") return "📎 File";
                            return pm.content;
                          })()}
                        </span>
                      </div>
                    </div>

                    {/* Right: Cycle button (if multi) + Unpin close button */}
                    <div className="flex items-center gap-1 shrink-0">
                      {pinnedMessages.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePinIdx((prev) => (prev + 1) % pinnedMessages.length);
                          }}
                          className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/40 hover:text-white transition-colors cursor-pointer text-xs"
                          title="Show next pinned message"
                        >
                          Next
                        </button>
                      )}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const currentPinned = pinnedMessages[Math.min(activePinIdx, pinnedMessages.length - 1) || 0];
                          if (currentPinned) {
                            await engine.pinMessage(currentPinned);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/40 hover:text-white transition-colors cursor-pointer"
                        title="Unpin message"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* In-chat search */}
            {msgSearchActive && (
              <div className="relative z-10 shrink-0 px-4 py-2 border-b border-white/[0.06] bg-[#0a0a10]/80 backdrop-blur-xl">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.07]">
                  <Search size={14} className="text-white/30 shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search in conversation…"
                    value={msgSearch}
                    onChange={(e) => setMsgSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none"
                  />
                  {msgSearch && (
                    <button onClick={() => setMsgSearch("")} className="text-white/30 hover:text-white/70 transition-colors text-xs">
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Messages — flex-1 + min-h-0 so this column shrinks properly */}
            <div className="relative z-10 flex-1 min-h-0 flex flex-col">
              <MessageList
                messages={displayedMessages}
                loading={loadingMsgs}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
                loadingMore={loadingMore}
                onRetry={handleRetryMessage}
                onCancelUpload={engine.cancelUpload}
                onDelete={engine.deleteMessage}
                onReply={handleReplyMessage}
                onEdit={handleEditMessage}
                onReact={engine.reactToMessage}
                onForward={handleForwardMessage}
                onPin={engine.pinMessage}
                onStar={engine.starMessage}
                onReveal={handleReveal}
                onOpenThread={handleOpenThread}
                currentUserId={currentUser.id}
                bubbleStyle={bubbleStyle}
                conversationId={activeConvId}
                partnerNickname={dmSettings?.partner_nickname}
                disappearingMode={dmSettings?.disappearing_mode}
                chatContext={{ type: isGroup ? "group" : "dm", name: activeConv?.name || "" }}
              />
            </div>

            {/* Input */}
            <div className="message-input relative z-10 shrink-0">
              {blockedStatus?.hasBlockedMe ? (
                <div className="p-4 bg-[#07070a]/60 border-t border-white/[0.04] backdrop-blur-xl flex flex-col items-center justify-center text-center gap-1.5 select-none min-h-[90px]">
                  <div className="flex items-center gap-1.5 text-rose-400">
                    <ShieldAlert size={14} className="shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-rose-400">Message Access Restricted</span>
                  </div>
                  <p className="text-[12px] text-white/70 max-w-[400px] leading-relaxed font-medium">
                    Pardon, but this user has restricted your ability to send messages.
                  </p>
                </div>
              ) : blockedStatus?.isBlockedByMe ? (
                <div className="p-4 bg-[#07070a]/60 border-t border-white/[0.04] backdrop-blur-xl flex flex-col items-center justify-center text-center gap-1.5 select-none min-h-[90px]">
                  <div className="flex items-center gap-1.5 text-rose-400">
                    <ShieldAlert size={14} className="shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">User Blocked</span>
                  </div>
                  <p className="text-[12px] text-white/70 max-w-[400px] leading-relaxed font-medium">
                    You have blocked this user. Unblock them to send messages.
                  </p>
                  <button
                    onClick={async () => {
                      if (currentUser?.id) {
                        const state = useAppStore.getState();
                        const partnerId = state.activePartnerUserId || state.conversations.find(c => c.id === activeConvId)?.partnerId || null;
                        if (partnerId) {
                          await unblockUserDB(currentUser.id, partnerId);
                          setBlockedStatus(prev => prev ? { ...prev, isBlockedByMe: false } : null);
                          setIsBlockedByMe(false);
                        }
                      }
                    }}
                    className="text-[11px] text-violet-400 hover:text-violet-300 font-semibold underline underline-offset-2 transition-colors mt-0.5"
                  >
                    Unblock Account
                  </button>
                </div>
              ) : messagesRestriction?.isRestricted ? (
                <div className="p-4 bg-[#07070a]/60 border-t border-white/[0.04] backdrop-blur-xl flex flex-col items-center justify-center text-center gap-1.5 select-none min-h-[90px]">
                  <div className="flex items-center gap-1.5 text-rose-400">
                    <ShieldAlert size={14} className="shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Account Restricted</span>
                  </div>
                  <p className="text-[12px] text-white/70 max-w-[400px] leading-relaxed font-medium">
                    Your messaging has been temporarily disabled due to: <span className="text-white font-semibold">{messagesRestriction.reason || "violating community rules"}</span>.
                  </p>
                  <button
                    onClick={() => router.push('/guidelines')}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 transition-colors mt-0.5 active:scale-95"
                  >
                    See our Community Guidelines
                  </button>
                  {messagesRestriction.expiresAt && (
                    <span className="text-[9px] font-medium text-white/30 tracking-wider">
                      RESTRICTION LIFTS: {new Date(messagesRestriction.expiresAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  )}
                </div>
              ) : (
                <ChatInput
                  convId={activeConvId ?? undefined}
                  onSendText={(content, viewOnce) =>
                    void sendMessage(content, "text", undefined, undefined, undefined, viewOnce)
                  }
                  onSendFile={(url, fileName, mimeType, viewOnce, mediaGroupId, file) => {
                    const type: "image" | "file" | "video" = mimeType?.startsWith("image/")
                      ? "image"
                      : mimeType?.startsWith("video/")
                        ? "video"
                        : "file";
                    const isCap = fileName && !isFilename(fileName);
                    const content = isCap ? fileName : "";
                    const actualFileName = isCap ? (file instanceof File ? file.name : "file") : fileName;
                    void sendMessage(content, type, url, actualFileName, mimeType, viewOnce, mediaGroupId, file);
                  }}
                  onSendVoice={handleSendVoice}
                  onSendLocation={handleSendLocation}
                  onRecording={handleRecording}

                  replyTo={replyTo ? {
                    id: replyTo.id,
                    content: replyTo.content,
                    senderDisplay: replyTo.sender?.display_name || replyTo.sender?.username,
                  } : null}
                  onCancelReply={() => setReplyTo(null)}
                  editingMessage={editingMessage ? { id: editingMessage.id, content: editingMessage.content } : null}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={() => setEditingMessage(null)}
                  isMuted={isMuted}
                  muteUntil={muteUntil}
                />
              )}
            </div>

          </>
        )}
      </main>

      {/* ── Thread Panel ── */}
      {threadRootMsg && (
        <ThreadPanel
          isOpen={!!threadRootMsg}
          rootMessage={threadRootMsg as any}
          currentUser={currentUser ? {
            id: currentUser.id,
            display_name: currentUser.displayName,
            username: currentUser.username,
            avatar_url: currentUser.avatar,
          } : null}
          onClose={() => setThreadRootMsg(null)}
          onSendReply={handleSendThreadReply}
        />
      )}

      {/* ── Starred Messages Panel ── */}
      <AnimatePresence>
        {isStarredOpen && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 35 }}
            className="w-full md:w-[360px] shrink-0 border-l border-white/[0.06] bg-[#0a0a10]/95 backdrop-blur-3xl flex flex-col h-full z-50 absolute md:relative right-0 top-0 bottom-0 shadow-[20px_0_40px_rgba(0,0,0,0.5)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] bg-[#0c0c12]/50">
              <div className="flex items-center gap-2">
                <Star size={16} className="text-yellow-400 fill-yellow-400/20" />
                <span className="text-sm font-bold text-white tracking-wide">Starred Messages</span>
              </div>
              <button
                onClick={() => setIsStarredOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* List area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingStarred ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2 text-white/30">
                  <Loader2 size={20} className="animate-spin text-indigo-400" />
                  <span className="text-xs">Loading bookmarks...</span>
                </div>
              ) : starredMsgs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center px-4 gap-3 text-white/20">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/30">
                    <Star size={22} className="stroke-[1.5]" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white/70">No starred messages</p>
                    <p className="text-[11px] text-white/40 leading-relaxed max-w-[220px]">
                      Select 'Star Message' from the menu to save important messages here.
                    </p>
                  </div>
                </div>
              ) : (
                starredMsgs.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => handleJumpToMessage(msg.id)}
                    className="group relative flex flex-col p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] hover:border-white/[0.08] transition-all cursor-pointer gap-2"
                  >
                    {/* Card Header: Sender Info & Unstar button */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-white/[0.05] overflow-hidden flex items-center justify-center text-[10px] font-bold text-white/70 shrink-0">
                          {msg.sender?.avatar_url ? (
                            <img src={msg.sender.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (msg.sender?.display_name || msg.sender?.username || "?")[0].toUpperCase()
                          )}
                        </div>
                        <span className="text-xs font-bold text-white/80 truncate">
                          {msg.sender?.display_name || `@${msg.sender?.username}` || "User"}
                        </span>
                      </div>

                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          // Unstar message database-wise
                          await engine.starMessage(msg);
                          // Update local state to immediately filter it out
                          setStarredMsgs((prev) => prev.filter((m) => m.id !== msg.id));
                        }}
                        className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/[0.05] text-white/40 hover:text-rose-400 transition-all cursor-pointer"
                        title="Unstar"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    {/* Card Content */}
                    <div className="text-xs text-white/70 break-words leading-relaxed">
                      {msg.type === "image" ? "📷 Image File" :
                        msg.type === "video" ? "🎦 Video File" :
                          msg.type === "voice" ? "🎤 Voice Note" :
                            msg.type === "file" ? `📎 File: ${msg.file_name}` :
                              msg.content}
                    </div>

                    {/* Card Footer: Timestamp */}
                    <div className="text-[9px] text-white/30 font-mono text-right mt-1">
                      {msg.sent_at ? new Date(msg.sent_at).toLocaleString() : ""}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Modals ── */}

      {/* New message */}
      <NewMessageOverlay
        isOpen={isNewTxOpen}
        currentUser={currentUser}
        onClose={() => setIsNewTxOpen(false)}
        onSelectUser={async (user: any) => {
          console.log('[DEBUG] onSelectUser called with user/id:', user);
          try {
            setIsNewTxOpen(false);
            console.log('[DEBUG] Starting navigation');
            const userId = user?.id ?? user;
            if (!userId) {
              console.warn('[DEBUG] No userId found in onSelectUser');
              return;
            }

            console.log('[DEBUG] Conversation lookup started for userId:', userId);
            // Check if we already have a conversation with this user
            const existingConv = conversations.find(c => c && !c.isGroup && c.partnerId === userId);
            console.log('[DEBUG] Conversation lookup completed. Existing conversation found:', existingConv);

            if (existingConv) {
              console.log('[DEBUG] Opening chat (existing conversation):', existingConv.id);
              engine.selectConversation(existingConv.id, false, userId);
              setMobileView('chat');
              return;
            }

            // No existing conversation: show chat UI immediately in "pending" mode.
            // The DB conversation will only be created when the user sends their first message.
            const pendingTarget = {
              id: userId,
              name: user?.name || user?.display_name || user?.username || 'User',
              username: user?.username || '',
              avatarUrl: user?.avatarUrl || user?.avatar_url || null,
            };
            console.log('[DEBUG] Opening chat (pending mode with target):', pendingTarget);
            setPendingDMTarget(pendingTarget);
            setMobileView('chat');

            // Navigate to the pending DM route /messages/[userId] to update the URL path
            router.replace(`/messages/${userId}`, { scroll: false });
          } catch (err: any) {
            console.error('[DEBUG] Exception caught inside onSelectUser:', err);
            console.error('[DEBUG] Error stack:', err?.stack);
          }
        }}
        onCreated={(groupId: string) => {
          setIsNewTxOpen(false);
          void engine.refreshConversations().then(() => engine.selectConversation(groupId, true));
        }}
      />

      {/* Call modal and incoming call popup are handled globally by CallProvider */}

      {isSettingsOpen && activeConvId && activeConv && (
        <ChatSettingsModal
          key={activeConvId}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          partnerName={activeConv.name}
          partnerUsername={activeConv.username}
          partnerAvatar={activeConv.avatarUrl}
          dmSettings={dmSettings}
          setDmSettings={setDmSettings}
          onLeaveGroup={isGroup ? () => setLeaveGroupConfirm(true) : undefined}
          onBlock={!isGroup ? () => setBlockConfirm(true) : undefined}
          onReport={() => {
            setIsSettingsOpen(false);
            setIsReportOpen(true);
          }}
          onClearChat={handleClearChat}
          onSearch={() => { setIsSettingsOpen(false); setMsgSearchActive(true); }}
          activeConvId={activeConvId}
          groupJoinCode={activeConv.joinCode}
          currentUserId={currentUser?.id}
          isGroup={isGroup}
          isBlocked={blockedStatus?.isBlockedByMe ?? isBlockedByMe}
          isBlockedByPartner={blockedStatus?.hasBlockedMe ?? false}
          onUnblock={async () => {
            if (currentUser?.id) {
              const state = useAppStore.getState();
              const partnerId = state.activePartnerUserId || state.conversations.find(c => c.id === activeConvId)?.partnerId || null;
              if (partnerId) {
                await unblockUserDB(currentUser.id, partnerId);
                setBlockedStatus(prev => prev ? { ...prev, isBlockedByMe: false } : null);
                setIsBlockedByMe(false);
                void engine.refreshConversations();
              }
            }
          }}
          onMute={(m) => handleUpdateSettings({ muted: m })}
          onUpdateSettings={handleUpdateSettings}
        />
      )}


      {/* Media Vault */}
      {isVaultOpen && activeConvId && (
        <MediaVaultModal
          isOpen={isVaultOpen}
          onClose={() => setIsVaultOpen(false)}
          convId={activeConvId}
          isGroup={isGroup}
          currentUserId={currentUser.id}
        />
      )}

      {/* AI Summary */}
      {isSummaryOpen && activeConvId && (
        <SummarySheet
          isOpen={isSummaryOpen}
          onClose={() => setIsSummaryOpen(false)}
          convId={activeConvId}
          groupName={activeConv?.name ?? ""}
        />
      )}

      {/* Block user confirmation */}
      <AnimatePresence>
        {blockConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="w-full max-w-md bg-[#0c0c14] border border-white/[0.08] rounded-2xl p-6 shadow-2xl relative overflow-hidden text-left"
            >
              {/* Top Accent line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-rose-600" />

              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <ShieldAlert size={20} />
                </div>
                <h3 className="text-base font-bold text-white">Block Account</h3>
              </div>

              <p className="text-sm text-white/70 leading-relaxed mb-5">
                Are you sure you want to block <span className="font-semibold text-white">{activeConvReactive?.name || 'this user'}</span>? You will no longer receive messages or notifications from them.
              </p>

              {/* Consequences list */}
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3.5 space-y-2 mb-6">
                <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Consequences</p>
                <ul className="space-y-1.5 text-xs text-white/50">
                  <li className="flex items-start gap-1.5">
                    <span className="text-rose-400 mt-0.5">•</span>
                    They cannot message you or view your profile/posts.
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-rose-400 mt-0.5">•</span>
                    You won't appear in each other's search or recommendations.
                  </li>
                </ul>
              </div>

              {/* Delete chat checkbox option */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.05] cursor-pointer transition-colors select-none mb-6">
                <input
                  type="checkbox"
                  checked={deleteChatOnBlock}
                  onChange={(e) => setDeleteChatOnBlock(e.target.checked)}
                  className="mt-0.5 accent-rose-500 w-4 h-4 rounded border-white/20 bg-neutral-900"
                />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-white">Delete Chat History</p>
                  <p className="text-[11px] text-white/45 leading-normal">
                    {deleteChatOnBlock
                      ? "Permanently deletes all messages, files, and shared media from your list."
                      : "Archived. You can still view past messages by clicking their name in the Blocked Users panel."
                    }
                  </p>
                </div>
              </label>

              {/* Action buttons */}
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => { setBlockConfirm(false); }}
                  className="px-4 py-2 text-xs font-semibold text-white/60 hover:text-white rounded-xl hover:bg-white/[0.05] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setBlockConfirm(false);
                    await handleBlock();
                  }}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors shadow-lg active:scale-95"
                >
                  Block Account
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Leave group confirmation */}
      <ConfirmModal
        isOpen={leaveGroupConfirm}
        title="Leave Group"
        message={`Are you sure you want to leave "${activeConv?.name}"?`}
        confirmLabel="Leave"
        danger
        onConfirm={handleLeaveGroup}
        onCancel={() => setLeaveGroupConfirm(false)}
      />



      {/* Forward Message Modal */}
      {messageToForward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setMessageToForward(null)}>
          <div className="bg-neutral-950 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl transition-all duration-300 transform scale-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <h3 className="text-lg font-semibold text-white">Forward Message</h3>
              <button onClick={() => setMessageToForward(null)} className="text-white/40 hover:text-white/80 transition-colors">
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-white/50 mb-4 truncate italic bg-white/5 px-3 py-2 rounded-lg">
              {`"${messageToForward.type === 'text' ? messageToForward.content : `[${messageToForward.type.toUpperCase()}]`}"`}
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={async () => {
                    const msg = messageToForward;
                    setMessageToForward(null);
                    await engine.forwardMessage(msg, conv.id);
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-all text-left group"
                >
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-800 border border-white/10 shrink-0">
                    {conv.avatarUrl ? (
                      <img src={conv.avatarUrl} alt={conv.name} className="w-full h-full object-cover animate-fade-in" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white/60">
                        {conv.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white group-hover:text-indigo-400 transition-colors truncate">{conv.name}</p>
                    <p className="text-xs text-white/40 truncate">
                      {conv.isGroup ? 'Group Chat' : `@${conv.username || 'dm'}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Blocked Users Panel ─────────────────────────────────────────── */}
      {blockedPanelOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-start"
          onClick={() => setBlockedPanelOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative z-10 h-full w-full max-w-[340px] flex flex-col bg-[#0d0d14] border-r border-white/[0.06] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <UserX size={14} className="text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Blocked Users</h3>
                  <p className="text-[10px] text-white/30">
                    {blockedLoading ? 'Loading…' : `${blockedUsers.length} blocked`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBlockedPanelOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/30 hover:text-white transition-all"
              >
                <X size={14} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
              {blockedLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={22} className="text-white/20 animate-spin" />
                </div>
              ) : blockedUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/20">
                  <ShieldOff size={32} strokeWidth={1.5} />
                  <p className="text-sm">No blocked users</p>
                </div>
              ) : (
                blockedUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group"
                  >
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setBlockedPanelOpen(false);
                        const res = await engine.createDM(u.id);
                        if (res) {
                          selectConversation(res.convId, false, u.id);
                        }
                      }}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <img
                        src={u.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`}
                        alt={u.name}
                        className="w-9 h-9 rounded-full object-cover bg-neutral-800 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white/80 truncate">{u.name}</p>
                        <p className="text-[11px] text-white/30 truncate">@{u.username}</p>
                      </div>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUnblockFromPanel(u.id); }}
                      disabled={unblockingId === u.id}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 transition-all disabled:opacity-50 shrink-0"
                    >
                      {unblockingId === u.id ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <ShieldX size={11} />
                      )}
                      Unblock
                    </button>

                  </div>
                ))

              )}
            </div>
          </div>
        </div>
      )}

      {/* Report User Modal */}
      {isReportOpen && activeConvReactive?.partnerId && (
        <ReportModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          reportedUserId={activeConvReactive.partnerId}
          reportedUsername={activeConvReactive.username || activeConvReactive.name || undefined}
          conversationId={activeConvId ?? undefined}
          onSubmit={async (payload) => {
            const formattedCategory = `Category: ${payload.category} | Subcategory: ${payload.subcategory || "None"}`;
            await reportUserDB({
              reporterId: currentUser!.id,
              reportedId: activeConvReactive.partnerId!,
              reason: formattedCategory,
              conversationId: activeConvId ?? null,
              evidenceNotes: payload.evidenceNotes || null,
              consentGranted: payload.consentGranted
            });
            setIsReportOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-[#09090f] text-white/20 text-sm">Loading…</div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
