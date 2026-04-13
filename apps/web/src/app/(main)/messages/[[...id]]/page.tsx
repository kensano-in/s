"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  Suspense,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import { useWebRTC } from "@/hooks/useWebRTC";
import { Plus, MessageCircle, Search } from "lucide-react";
import clsx from "clsx";

// ── Chat Components ──────────────────────────────────────────────────────────
import ChatHeader from "@/components/Chat/ChatHeader";
import MessageList from "@/components/Chat/MessageList";
import ChatInput from "@/components/Chat/ChatInput";
import ConversationItem, { DBConversation } from "@/components/Chat/ConversationItem";
import NewMessageOverlay from "@/components/Chat/NewMessageOverlay";
import CallModal from "@/components/Chat/CallModal";
import ChatSettingsModal from "@/components/Chat/ChatSettingsModal";
import ThemeBackground from "@/components/Chat/ThemeBackground";
import ConfirmModal from "@/components/ui/ConfirmModal";
import MediaVaultModal from "@/components/Chat/MediaVaultModal";
import ThreadPanel from "@/components/Chat/ThreadPanel";
import SummarySheet from "@/components/Chat/SummarySheet";
import { ChatMessage } from "@/components/Chat/MessageItem";

// ── Actions ──────────────────────────────────────────────────────────────────
import {
  getConversationsDB,
  sendMessageDB,
  getMessagesDB,
  clearChatDB,
  blockUserDB,
  reportUserDB,
  deleteMessageDB,
  leaveGroupDB,
  getDMSettingsDB,
  updateDMSettingsDB,
  updateGroupSettingsDB,
  getOrCreateDMConversationDB,
  addReactionDB,
  removeReactionDB,
  markViewedDB,
  sendThreadReplyDB,
  sendLocationDB,
  markMessagesSeenDB,
  getMyMuteStatusDB,
} from "../actions";

// ── Temp ID ───────────────────────────────────────────────────────────────────
function makeTempId() {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Page ─────────────────────────────────────────────────────────────────────

function MessagesContent() {
  const router = useRouter();
  const params = useParams();
  const rawId = params?.id;
  const routeId = Array.isArray(rawId) ? rawId[0] : rawId ?? null;

  const supabase = useMemo(() => createClient(), []);
  const { currentUser, isAuthLoading } = useAppStore();

  // ── Navigation ─────────────────────────────────────────────────────────────
  const [mobileView, setMobileView] = useState<"list" | "chat">(
    routeId ? "chat" : "list"
  );

  // ── Conversations ──────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<DBConversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [activeConvId, setActiveConvId] = useState<string | null>(routeId ?? null);
  const [search, setSearch] = useState("");

  // ── Messages ───────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Typing / Presence ──────────────────────────────────────────────────────
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  // onlineUsers is managed by useRealtimeMessages — not duplicated here

  // ── In-chat search ─────────────────────────────────────────────────────────
  const [msgSearch, setMsgSearch] = useState("");
  const [msgSearchActive, setMsgSearchActive] = useState(false);

  // ── Modals & Panels ────────────────────────────────────────────────────────
  const [isNewTxOpen, setIsNewTxOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [leaveGroupConfirm, setLeaveGroupConfirm] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [threadRootMsg, setThreadRootMsg] = useState<ChatMessage | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // ── DM / Group Settings  ───────────────────────────────────────────────────
  const [dmSettings, setDmSettings] = useState<any>({});
  const [settingsVersion, setSettingsVersion] = useState(0);

  // ── Mute State ─────────────────────────────────────────────────────────────
  const [isMuted, setIsMuted] = useState(false);
  const [muteUntil, setMuteUntil] = useState<string | null>(null);

  // ── Calls ──────────────────────────────────────────────────────────────────
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [isCallOpen, setIsCallOpen] = useState(false);

  const {
    callState,
    localStream,
    remoteStream,
    incomingCall,
    startCall,
    acceptCall,
    rejectCall,
    hangUp,
  } = useWebRTC({ myUserId: currentUser?.id });

  // Open call modal on incoming call
  useEffect(() => {
    if (incomingCall) {
      setCallType(incomingCall.type);
      setIsCallOpen(true);
    }
  }, [incomingCall]);

  // Auto-close call modal when call ends
  useEffect(() => {
    if (callState === "idle") setIsCallOpen(false);
  }, [callState]);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const seenIdsRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeConv = conversations.find((c) => c.id === activeConvId);
  const isGroup = activeConv?.isGroup ?? false;

  const filteredConvs = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const displayedMessages = useMemo(() => {
    if (!msgSearch.trim()) return messages;
    const q = msgSearch.toLowerCase();
    return messages.filter((m) => m.content?.toLowerCase().includes(q));
  }, [messages, msgSearch]);

  const themeId = isGroup
    ? dmSettings?.theme_id ?? activeConv?.theme_id
    : dmSettings?.theme_id;

  const bubbleStyle = dmSettings?.bubble_style;

  // ── Load conversations ─────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoadingConvs(true);
    try {
      const { success, data } = await getConversationsDB(currentUser.id);
      if (success && data) setConversations(data as DBConversation[]);
    } catch (e) {
      console.error("[MessagesPage] loadConversations:", e);
    } finally {
      setLoadingConvs(false);
    }
  }, [currentUser?.id]);

  // ── Load messages ──────────────────────────────────────────────────────────
  const loadMessages = useCallback(
    async (convId: string, group: boolean, cursorSentAt?: string) => {
      if (!currentUser?.id || !convId) return;

      if (!cursorSentAt) {
        setLoadingMsgs(true);
        seenIdsRef.current = new Set();
      } else {
        setLoadingMore(true);
      }

      try {
        const { success, data } = await getMessagesDB(
          currentUser.id,
          convId,
          group,
          50,
          cursorSentAt
        );
        if (success && data) {
          const mapped: ChatMessage[] = (data as any[]).map((m) => ({
            ...m,
            is_mine: m.sender_id === currentUser.id,
            status: m.status ?? "sent",
          }));
          if (!cursorSentAt) {
            mapped.forEach((m) => seenIdsRef.current.add(m.id));
            setMessages(mapped);
            setHasMore(mapped.length === 50);
          } else {
            mapped.forEach((m) => seenIdsRef.current.add(m.id));
            setMessages((prev) => [...prev, ...mapped]);
            setHasMore(mapped.length === 50);
          }
        }
      } catch (e) {
        console.error("[MessagesPage] loadMessages:", e);
      } finally {
        setLoadingMsgs(false);
        setLoadingMore(false);
      }
    },
    [currentUser?.id]
  );

  // ── Load DM settings ───────────────────────────────────────────────────────
  const loadDMSettings = useCallback(
    async (convId: string, group: boolean, groupConv?: { theme_id?: string; theme_blur?: number }) => {
      if (!currentUser?.id || !convId) return;
      try {
        if (group) {
          // ST-03: Accept groupConv as param to avoid stale conversations closure
          setDmSettings({ theme_id: groupConv?.theme_id, theme_blur: groupConv?.theme_blur });
        } else {
          const { success, data } = await getDMSettingsDB(currentUser.id, convId);
          if (success && data) setDmSettings(data);
          else setDmSettings({});
        }
      } catch (e) {
        console.error("[MessagesPage] loadDMSettings:", e);
      }
    },
    [currentUser?.id] // ST-03: conversations removed from deps to prevent reload storm
  );

  // ── Mark seen ──────────────────────────────────────────────────────────────
  const markSeen = useCallback(
    (convId: string, group: boolean) => {
      if (!currentUser?.id || group) return;
      void markMessagesSeenDB(currentUser.id, convId);
    },
    [currentUser?.id]
  );

  // ── Realtime — messages ────────────────────────────────────────────────────
  const setupRealtime = useCallback(
    (convId: string, group: boolean) => {
      if (!currentUser?.id) return;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channelName = group
        ? `rt:group:${convId}:${currentUser.id}`
        : `rt:dm:${currentUser.id}:${convId}`;

      const handleInsert = (payload: any) => {
        const raw = payload.new as any;
        if (!raw?.id) return;
        if (raw.thread_root_id) return;

        // BUG-11 FIX: Exclude group messages that bleed into DM subscriptions.
        // Group messages have conversation_id set; DM messages do not.
        if (!group && raw.conversation_id) return;

        if (!group) {
          const between =
            (raw.sender_id === currentUser!.id && raw.recipient_id === convId) ||
            (raw.sender_id === convId && raw.recipient_id === currentUser!.id);
          if (!between) return;
        }

        if (seenIdsRef.current.has(raw.id)) {
          setMessages((prev) =>
            prev.map((m) =>
              m.client_temp_id && m.client_temp_id === raw.client_temp_id
                ? { ...m, id: raw.id, status: "sent" as const, client_temp_id: null }
                : m
            )
          );
          return;
        }
        seenIdsRef.current.add(raw.id);

        const incoming: ChatMessage = {
          id: raw.id,
          sender_id: raw.sender_id,
          recipient_id: raw.recipient_id,
          conversation_id: raw.conversation_id,
          content: raw.content,
          type: raw.type ?? "text",
          media_url: raw.media_url,
          file_name: raw.file_name,
          mime_type: raw.mime_type,
          status: "sent",
          sent_at: raw.sent_at || raw.created_at || new Date().toISOString(),
          created_at: raw.created_at,
          is_mine: raw.sender_id === currentUser!.id,
          client_temp_id: raw.client_temp_id,
          reactions: [],
          sender: raw.sender,
          reply_to_id: raw.reply_to_id,
          view_once: raw.view_once,
          is_viewed: raw.is_viewed,
        };

        setMessages((prev) => {
          if (raw.client_temp_id) {
            const hasOpt = prev.some(
              (m) => m.client_temp_id === raw.client_temp_id && m.id !== raw.id
            );
            if (hasOpt) {
              return prev.map((m) =>
                m.client_temp_id === raw.client_temp_id ? { ...incoming } : m
              );
            }
          }
          return [incoming, ...prev];
        });

        void loadConversations();
      };

      let channel: ReturnType<typeof supabase.channel>;

      if (group) {
        channel = supabase
          .channel(channelName)
          .on("postgres_changes", {
            event: "INSERT", schema: "public", table: "messages",
            filter: `conversation_id=eq.${convId}`,
          }, handleInsert)
          .subscribe();
      } else {
        // BUG-03 FIX: Subscribe only to recipient_id filter.
        // Sent messages are handled optimistically + reconciled via client_temp_id.
        // Subscribing to sender_id caused every outgoing message to appear twice.
        channel = supabase
          .channel(channelName)
          .on("postgres_changes", {
            event: "INSERT", schema: "public", table: "messages",
            filter: `recipient_id=eq.${currentUser.id}`,
          }, handleInsert)
          .subscribe();
      }

      channelRef.current = channel;
    },
    [currentUser?.id, supabase, loadConversations]
  );

  // ── Realtime — typing ──────────────────────────────────────────────────────
  const setupTypingChannel = useCallback(
    (convId: string) => {
      if (!currentUser?.id || !convId) return;
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
        typingChannelRef.current = null;
      }
      const tc = supabase
        .channel(`typing:${convId}`)
        .on("broadcast", { event: "typing" }, (payload) => {
          if (payload.payload?.userId !== currentUser.id) {
            setIsOtherTyping(true);
            setTimeout(() => setIsOtherTyping(false), 3000);
          }
        })
        .subscribe();
      typingChannelRef.current = tc;
    },
    [currentUser?.id, supabase]
  );

  // ── Select conversation ────────────────────────────────────────────────────
  const selectConversation = useCallback(
    (convId: string, group: boolean) => {
      setActiveConvId(convId);
      setMessages([]);
      setReplyTo(null);
      setMsgSearch("");
      setMsgSearchActive(false);
      setIsOtherTyping(false);
      setMobileView("chat");
      loadMessages(convId, group);
      setupRealtime(convId, group);
      setupTypingChannel(convId);
      // ST-03: Pass the conv object directly to avoid stale closure in loadDMSettings
      const conv = conversations.find((c) => c.id === convId);
      loadDMSettings(convId, group, group ? conv : undefined);
      markSeen(convId, group);

      if (group && currentUser?.id) {
        getMyMuteStatusDB(currentUser.id, convId).then((res) => {
          if (res.success && res.data) {
            setIsMuted(res.data.isMuted);
            setMuteUntil(res.data.muteUntil);
          } else {
            setIsMuted(false);
            setMuteUntil(null);
          }
        });
      } else {
        setIsMuted(false);
        setMuteUntil(null);
      }

      router.replace(`/messages/${convId}`, { scroll: false });
    },
    [conversations, loadMessages, setupRealtime, setupTypingChannel, loadDMSettings, markSeen, router, currentUser?.id]
  );

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (
      content: string,
      type: "text" | "image" | "file" | "voice" = "text",
      mediaUrl?: string,
      fileName?: string,
      mimeType?: string,
      viewOnce = false
    ) => {
      if (!activeConvId || !currentUser?.id) return;
      if (!content.trim() && !mediaUrl) return;

      const tempId = makeTempId();

      const optimistic: ChatMessage = {
        id: tempId,
        sender_id: currentUser.id,
        recipient_id: isGroup ? undefined : activeConvId,
        conversation_id: isGroup ? activeConvId : undefined,
        content,
        type,
        media_url: mediaUrl,
        file_name: fileName,
        mime_type: mimeType,
        status: "sending",
        sent_at: new Date().toISOString(),
        is_mine: true,
        client_temp_id: tempId,
        reactions: [],
        view_once: viewOnce,
        sender: {
          display_name: currentUser.displayName,
          username: currentUser.username,
          avatar_url: currentUser.avatar,
        },
        reply_to_id: replyTo?.id,
      };

      setMessages((prev) => [optimistic, ...prev]);
      setReplyTo(null);

      try {
        const result = await sendMessageDB(
          currentUser.id,
          isGroup ? currentUser.id : activeConvId,
          content,
          type,
          mediaUrl,
          fileName,
          mimeType,
          replyTo?.id,
          undefined,
          isGroup ? activeConvId : undefined,
          tempId,
          viewOnce
        );

        if (!result || !result.success) {
          throw new Error(result?.error || "Failed to send message via DB");
        }

        // We don't reconcile ID here because the Server Action triggers a Realtime INSERT event via RLS bypass,
        // which useRealtimeMessages handles automatically to apply the final `id` and set it to 'sent'.
      } catch (err: any) {
        console.error("[MessagesPage] sendMessageDB failed:", err);
        // Mark optimistic message as failed so user can see and retry
        setMessages((prev) =>
          prev.map((m) =>
            m.client_temp_id === tempId ? { ...m, status: "failed" as const, content: m.content + " ✓" } : m
          )
        );
      }
    },
    [activeConvId, currentUser, isGroup, replyTo]
  );

  // ── Delete message ─────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (id: string) => {
      if (!currentUser?.id) return;
      setMessages((prev) => prev.filter((m) => m.id !== id));
      try { await deleteMessageDB(currentUser.id, id); } catch (e) {
        console.error("[MessagesPage] deleteMessageDB:", e);
      }
    },
    [currentUser?.id]
  );

  // ── React to message ───────────────────────────────────────────────────────
  const handleReact = useCallback(
    async (messageId: string, emoji: string) => {
      if (!currentUser?.id) return;
      const msg = messages.find((m) => m.id === messageId);
      const existing = msg?.reactions?.find((r: any) => r.emoji === emoji);

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = m.reactions || [];
          if (existing?.reacted) {
            return {
              ...m,
              reactions: reactions
                .map((r: any) => r.emoji === emoji ? { ...r, count: r.count - 1, reacted: false } : r)
                .filter((r: any) => r.count > 0),
            };
          }
          if (existing) {
            return { ...m, reactions: reactions.map((r: any) => r.emoji === emoji ? { ...r, count: r.count + 1, reacted: true } : r) };
          }
          return { ...m, reactions: [...reactions, { emoji, count: 1, reacted: true }] };
        })
      );

      try {
        if (existing?.reacted) {
          await removeReactionDB(messageId, currentUser.id, emoji);
        } else {
          await addReactionDB(messageId, currentUser.id, emoji);
        }
      } catch (e) {
        console.error("[MessagesPage] reaction:", e);
      }
    },
    [currentUser?.id, messages]
  );

  // ── Typing indicator ───────────────────────────────────────────────────────
  const handleTyping = useCallback((isTyping: boolean = true) => {
    if (!activeConvId || !currentUser?.id) return;
    void typingChannelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUser.id, typing: isTyping },
    });
  }, [activeConvId, currentUser?.id]);

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
      if (isGroup) {
        await updateGroupSettingsDB(activeConvId, updates);
        setDmSettings((prev: any) => ({ ...prev, ...updates }));
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConvId ? { ...c, ...updates } : c))
        );
      } else {
        const { data } = await updateDMSettingsDB(currentUser.id, activeConvId, updates);
        if (data) setDmSettings(data);
        else setDmSettings((prev: any) => ({ ...prev, ...updates }));
      }
      setSettingsVersion((v) => v + 1);
    },
    [currentUser?.id, activeConvId, isGroup]
  );

  // ── Leave group ────────────────────────────────────────────────────────────
  const handleLeaveGroup = useCallback(async () => {
    if (!currentUser?.id || !activeConvId) return;
    const { success } = await leaveGroupDB(currentUser.id, activeConvId);
    if (success) {
      setConversations((prev) => prev.filter((c) => c.id !== activeConvId));
      setActiveConvId(null);
      setMessages([]);
      setMobileView("list");
      router.replace("/messages", { scroll: false });
    }
    setLeaveGroupConfirm(false);
  }, [currentUser?.id, activeConvId, router]);

  // ── Block user ─────────────────────────────────────────────────────────────
  const handleBlock = useCallback(async () => {
    if (!currentUser?.id || !activeConvId) return;
    await blockUserDB(currentUser.id, activeConvId);
    setConversations((prev) => prev.filter((c) => c.id !== activeConvId));
    setActiveConvId(null);
    setMessages([]);
    setMobileView("list");
    router.replace("/messages", { scroll: false });
  }, [currentUser?.id, activeConvId, router]);

  // ── Clear chat ─────────────────────────────────────────────────────────────
  const handleClearChat = useCallback(async () => {
    if (!currentUser?.id || !activeConvId) return;
    await clearChatDB(currentUser.id, activeConvId);
    setMessages([]);
  }, [currentUser?.id, activeConvId]);

  // ── Reveal view-once ───────────────────────────────────────────────────────
  const handleReveal = useCallback(
    async (messageId: string) => {
      if (!currentUser?.id) return;
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, is_viewed: true } : m));
      await markViewedDB(messageId, currentUser.id);
    },
    [currentUser?.id]
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
    if (!activeConvId || loadingMore || !hasMore) return;
    const oldest = messages[messages.length - 1];
    if (oldest) void loadMessages(activeConvId, isGroup, oldest.sent_at);
  }, [activeConvId, loadingMore, hasMore, messages, isGroup, loadMessages]);

  // ── Voice ──────────────────────────────────────────────────────────────────
  const handleSendVoice = useCallback(
    (url: string, _dur: number) => void sendMessage("", "voice", url),
    [sendMessage]
  );

  // ── Location ───────────────────────────────────────────────────────────────
  const handleSendLocation = useCallback(
    async (lat: number, lng: number, address: string | null, isLive: boolean) => {
      if (!currentUser?.id || !activeConvId) return;
      try {
        await sendLocationDB(
          currentUser.id,
          activeConvId,
          isGroup,
          lat, lng, address, isLive
        );
      } catch (e) { console.error("[MessagesPage] sendLocation:", e); }
    },
    [currentUser?.id, activeConvId, isGroup]
  );

  // ── Calls ──────────────────────────────────────────────────────────────────
  const handleStartVoiceCall = useCallback(() => {
    if (!activeConvId || isGroup) return;
    setCallType("audio");
    setIsCallOpen(true);
    void startCall(activeConvId, "audio");
  }, [activeConvId, isGroup, startCall]);

  const handleStartVideoCall = useCallback(() => {
    if (!activeConvId || isGroup) return;
    setCallType("video");
    setIsCallOpen(true);
    void startCall(activeConvId, "video");
  }, [activeConvId, isGroup, startCall]);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthLoading && !currentUser) router.replace("/login");
  }, [isAuthLoading, currentUser, router]);

  useEffect(() => {
    if (currentUser?.id) void loadConversations();
  }, [currentUser?.id, loadConversations]);

  useEffect(() => {
    if (routeId && currentUser?.id && conversations.length > 0 && messages.length === 0 && !loadingMsgs) {
      const conv = conversations.find((c) => c.id === routeId);
      selectConversation(routeId, conv?.isGroup ?? false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations.length, routeId, currentUser?.id]);

  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (typingChannelRef.current) supabase.removeChannel(typingChannelRef.current);
    };
  }, [supabase]);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  if (isAuthLoading) {
    return <div className="flex items-center justify-center h-screen bg-[#09090f] text-white/20 text-sm">Loading…</div>;
  }
  if (!currentUser) return null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[100dvh] bg-[#09090f] overflow-hidden">

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
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.06] shrink-0">
          <h1 className="text-[17px] font-semibold text-white">Messages</h1>
          <button
            id="new-message-btn"
            onClick={() => setIsNewTxOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white transition-colors"
            aria-label="New message"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
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

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
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
                  onClick={() => selectConversation(conv.id, conv.isGroup)}
                />
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* ── Chat panel ── */}
      <main className={clsx(
        "flex flex-col flex-1 min-w-0 overflow-hidden relative",
        mobileView === "list" ? "hidden md:flex" : "flex"
      )}>
        {!activeConvId || !activeConv ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-white/20">
            <MessageCircle size={56} strokeWidth={1} />
            <p className="text-sm">Select a conversation to start messaging</p>
          </div>
        ) : (
          <>
            {/* Theme — strictly scoped */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              <ThemeBackground themeId={themeId} />
            </div>

            {/* Header */}
            <div className="relative z-10 shrink-0">
              <ChatHeader
                participant={{
                  id: activeConvId,
                  name: activeConv.name,
                  username: activeConv.username,
                  avatarUrl: activeConv.avatarUrl,
                  isOnline: activeConv.isOnline,
                  isGroup,
                  joinCode: activeConv.joinCode,
                }}
                isOtherTyping={isOtherTyping}
                onBack={() => setMobileView("list")}
                onCall={handleStartVoiceCall}
                onVideoCall={handleStartVideoCall}
                onViewProfile={() => router.push(`/profile/${activeConvId}`)}
                onSearch={() => setMsgSearchActive((v) => !v)}
                onBlock={handleBlock}
                onReport={async () => {
                  if (currentUser?.id && activeConvId)
                    await reportUserDB(currentUser.id, activeConvId, "inappropriate");
                }}
                onClearChat={handleClearChat}
                onExportChat={handleExportChat}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onLeaveGroup={isGroup ? () => setLeaveGroupConfirm(true) : undefined}
                onOpenVault={() => setIsVaultOpen(true)}
                onCatchUp={() => setIsSummaryOpen(true)}
                showBack
              />
            </div>

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

            {/* Messages */}
            <div className="relative z-10 flex-1 overflow-hidden">
              <MessageList
                messages={displayedMessages}
                loading={loadingMsgs}
                isOtherTyping={isOtherTyping}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
                loadingMore={loadingMore}
                onRetry={(m) => void sendMessage(m.content, m.type as any, m.media_url, m.file_name, m.mime_type)}
                onDelete={handleDelete}
                onReply={(m) => setReplyTo(m)}
                onEdit={undefined}
                onReact={handleReact}
                onReveal={handleReveal}
                onOpenThread={(m) => setThreadRootMsg(m)}
                currentUserId={currentUser.id}
                bubbleStyle={bubbleStyle}
                conversationId={activeConvId}
                partnerNickname={dmSettings?.partner_nickname}
              />
            </div>

            {/* Input */}
            <div className="relative z-10 shrink-0">
              <ChatInput
                onSendText={(content, viewOnce) =>
                  void sendMessage(content, "text", undefined, undefined, undefined, viewOnce)
                }
                onSendFile={(url, fileName, mimeType, viewOnce) => {
                  const type: "image" | "file" = mimeType?.startsWith("image/") ? "image" : "file";
                  void sendMessage(url, type, url, fileName, mimeType, viewOnce);
                }}
                onSendVoice={handleSendVoice}
                onSendLocation={handleSendLocation}
                onTyping={handleTyping}
                replyTo={replyTo ? {
                  id: replyTo.id,
                  content: replyTo.content,
                  senderDisplay: replyTo.sender?.display_name || replyTo.sender?.username,
                } : null}
                onCancelReply={() => setReplyTo(null)}
                isMuted={isMuted}
                muteUntil={muteUntil}
              />
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

      {/* ── Modals ── */}

      {/* New message */}
      <NewMessageOverlay
        isOpen={isNewTxOpen}
        currentUser={currentUser}
        onClose={() => setIsNewTxOpen(false)}
        onSelectUser={async (user: any) => {
          setIsNewTxOpen(false);
          const userId = user?.id ?? user;
          if (!userId) return;
          await loadConversations();
          selectConversation(userId, false);
        }}
        onCreated={(groupId: string) => {
          setIsNewTxOpen(false);
          void loadConversations().then(() => selectConversation(groupId, true));
        }}
      />

      {/* Call */}
      {isCallOpen && (
        <CallModal
          isOpen={isCallOpen}
          callType={callType}
          callState={callState === "idle" ? "ended" : callState}
          localStream={localStream}
          remoteStream={remoteStream}
          participant={{
            name: activeConv?.name ?? (incomingCall
              ? conversations.find((c) => c.id === incomingCall.from)?.name ?? "Incoming"
              : "Unknown"),
            username: activeConv?.username ?? "",
            avatarUrl: activeConv?.avatarUrl,
          }}
          onHangUp={() => void hangUp()}
          onAccept={(type) => void acceptCall(type)}
          onReject={() => void rejectCall()}
          onClose={() => setIsCallOpen(false)}
        />
      )}

      {/* Chat Settings */}
      {isSettingsOpen && activeConvId && activeConv && (
        <ChatSettingsModal
          key={`${activeConvId}-${settingsVersion}`}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          partnerName={activeConv.name}
          partnerUsername={activeConv.username}
          partnerAvatar={activeConv.avatarUrl}
          dmSettings={dmSettings}
          setDmSettings={setDmSettings}
          onLeaveGroup={isGroup ? () => setLeaveGroupConfirm(true) : undefined}
          onBlock={!isGroup ? handleBlock : undefined}
          onReport={async () => {
            if (currentUser?.id && activeConvId)
              await reportUserDB(currentUser.id, activeConvId, "inappropriate");
          }}
          onClearChat={handleClearChat}
          onSearch={() => { setIsSettingsOpen(false); setMsgSearchActive(true); }}
          activeConvId={activeConvId}
          groupJoinCode={activeConv.joinCode}
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
