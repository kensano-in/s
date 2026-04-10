"use client";

/**
 * MessagesPage — Perception-Controlled Reality Engine integration point.
 * Wires:
 *   Axiom 5  — conversationId key into MessageList (AnimatePresence)
 *   Axiom 7  — onPreload into ConversationItem (predictive fetch)
 *   Axiom 11 — skeleton auth state instead of spinner
 */

import { Suspense, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Search, 
  Loader2, 
  Plus,
  MessageCircle
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import clsx from "clsx";

import ChatHeader from "@/components/Chat/ChatHeader";
import MessageList from "@/components/Chat/MessageList";
import ChatInput from "@/components/Chat/ChatInput";
import ConversationItem, { DBConversation } from "@/components/Chat/ConversationItem";
import NewMessageOverlay from "@/components/Chat/NewMessageOverlay";
import CallModal from "@/components/Chat/CallModal";
import ChatSettingsModal from "@/components/Chat/ChatSettingsModal";
import ThemeBackground from "@/components/Chat/ThemeBackground";
import { PRESET_THEMES } from "@/components/Chat/CustomThemeSelector";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";

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
} from "./actions";

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams.get("user_id") || searchParams.get("group_id");
  const targetGroupId = searchParams.get("group_id");

  const supabase = useMemo(() => createClient(), []);
  const { currentUser, isAuthLoading } = useAppStore();

  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [conversations, setConversations] = useState<DBConversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [search, setSearch] = useState("");
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [isNewTxOpen, setIsNewTxOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [dmSettings, setDmSettings] = useState<any>({});

  // Stable ref — prevents loadMessages from changing reference on every sidebar update
  // which would cause: send message → sidebar refresh → loadMessages re-fires → auto-refresh
  const conversationsRef = useRef<DBConversation[]>([]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  // Axiom 7 — Prediction Engine: cache of already-preloaded conversation IDs
  // Prevents redundant fetches on repeated hover.
  const preloadedRef = useRef<Set<string>>(new Set());

  // WebRTC
  const {
    callState,
    localStream,
    remoteStream,
    incomingCall,
    acceptCall,
    rejectCall,
    hangUp,
    startCall
  } = useWebRTC({ myUserId: currentUser?.id });

  const activeConv = useMemo(() => {
    const c = conversations.find(c => c.id === activeConvId);
    if (!c) return null;
    return {
      ...c,
      isOnline: !c.isGroup && onlineUsers.has(c.id)
    };
  }, [conversations, activeConvId, onlineUsers]);

  const loadConversations = useCallback(async (silent = false) => {
    if (!currentUser?.id || isAuthLoading) return;
    if (!silent) setLoadingConvs(true);
    const res = await getConversationsDB(currentUser.id);
    if (res.success && res.data) {
      setConversations(res.data);
      if (targetId && !activeConvId) {
        setActiveConvId(targetId);
        setMobileView("chat");
      }
    }
    if (!silent) setLoadingConvs(false);
  }, [currentUser?.id, isAuthLoading, targetId, activeConvId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const loadMessages = useCallback(async (partnerId: string, cursor?: string, silent = false) => {
    if (!currentUser?.id) return;
    if (!cursor && !silent) setLoadingMsgs(true);
    else if (cursor && !silent) setLoadingMore(true);

    // Use ref, not state — so this callback stays stable when sidebar updates
    const convMeta = conversationsRef.current.find(c => c.id === partnerId);
    const isGroup = convMeta ? convMeta.isGroup : !!targetGroupId;

    const res = await getMessagesDB(currentUser.id, partnerId, isGroup, 51, cursor);
    if (res.success && res.data) {
      const formatted = res.data.slice(0, 50).map(m => ({
        ...m,
        is_mine: m.sender_id === currentUser.id
      }));
      // If it's a silent reload (likely reconnect), merge carefully to preserve optimistic msgs
      setMessages(prev => {
        if (cursor) return [...prev, ...formatted];
        if (silent) {
          // preserve temp un-sent messages and mix with fresh fetch
          const tempMsgs = prev.filter(m => m.client_temp_id && m.status === 'sending');
          // deduplicate
          const fresh = formatted.filter(f => !tempMsgs.some(t => t.client_temp_id === f.client_temp_id));
          return [...tempMsgs, ...fresh].sort((a,b) => new Date(b.sent_at).valueOf() - new Date(a.sent_at).valueOf());
        }
        return formatted;
      });
      setHasMore(res.data.length > 50);
    }
    setLoadingMsgs(false);
    setLoadingMore(false);
  // conversations removed — using conversationsRef to keep callback stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, targetGroupId]);

  // Only re-load messages when switching conversations — NOT on every sidebar state change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (activeConvId && currentUser?.id) {
      loadMessages(activeConvId);
      setMobileView("chat");
      
      const convMeta = conversationsRef.current.find(c => c.id === activeConvId);
      const isGroup = convMeta?.isGroup || !!targetGroupId;
      if (!isGroup) {
        getDMSettingsDB(currentUser.id, activeConvId).then((res) => {
          if (res.success && res.data) {
            setDmSettings(res.data);
          } else {
            setDmSettings({});
          }
        });
      } else {
        // For groups, themes might be synced differently, but we can set defaults based on convMeta
        setDmSettings({
          theme_id: convMeta?.theme_id || "midnight",
          theme_blur: convMeta?.theme_blur || 10,
        });
      }
    } else {
      setDmSettings({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId, currentUser?.id]); // intentionally drops loadMessages from deps

  const handleSendText = useCallback(async (content: string) => {
    if (!activeConvId || !currentUser?.id) return;
    const tempId = `temp-${Date.now()}`;
    const isGroup = activeConv?.isGroup || !!targetGroupId;

    // Optimistic UI
    const optimisticMsg: any = {
      id: tempId,
      client_temp_id: tempId,
      sender_id: currentUser.id,
      content,
      type: "text",
      sent_at: new Date().toISOString(),
      is_mine: true,
      status: "sending"
    };

    setMessages(prev => [optimisticMsg, ...prev]);

    const res = await sendMessageDB(
      currentUser.id,
      isGroup ? "" : activeConvId,
      content,
      "text",
      undefined, undefined, undefined,
      undefined, undefined,
      isGroup ? activeConvId : undefined,
      tempId
    );

    if (res.success && res.data) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...res.data, is_mine: true, status: "sent" } : m));
    } else {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "error" } : m));
    }
  }, [activeConvId, currentUser, activeConv?.isGroup, targetGroupId]);

  const handleSendFile = useCallback(async (url: string, fileName: string, mimeType: string) => {
    if (!activeConvId || !currentUser?.id) return;
    const tempId = `temp-f-${Date.now()}`;
    const isGroup = activeConv?.isGroup || !!targetGroupId;
    const type = mimeType.startsWith("image/") ? "image" : "file";

    const optimisticMsg: any = {
      id: tempId,
      client_temp_id: tempId,
      sender_id: currentUser.id,
      content: fileName,
      type,
      media_url: url,
      file_name: fileName,
      sent_at: new Date().toISOString(),
      is_mine: true,
      status: "sending"
    };

    setMessages(prev => [optimisticMsg, ...prev]);

    const res = await sendMessageDB(
      currentUser.id,
      isGroup ? "" : activeConvId,
      fileName,
      type as any,
      url,
      fileName,
      mimeType,
      undefined, undefined,
      isGroup ? activeConvId : undefined,
      tempId
    );

    if (res.success && res.data) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...res.data, is_mine: true, status: "sent" } : m));
    } else {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "error" } : m));
    }
  }, [activeConvId, currentUser, activeConv?.isGroup, targetGroupId]);

  const handleSendVoice = useCallback(async (url: string, duration: number) => {
    if (!activeConvId || !currentUser?.id) return;
    const tempId = `temp-v-${Date.now()}`;
    const isGroup = activeConv?.isGroup || !!targetGroupId;

    const optimisticMsg: any = {
      id: tempId,
      client_temp_id: tempId,
      sender_id: currentUser.id,
      content: `Voice note (${duration}s)`,
      type: "voice",
      media_url: url,
      sent_at: new Date().toISOString(),
      is_mine: true,
      status: "sending"
    };

    setMessages(prev => [optimisticMsg, ...prev]);

    const res = await sendMessageDB(
      currentUser.id,
      isGroup ? "" : activeConvId,
      `Voice note (${duration}s)`,
      "voice",
      url,
      undefined,
      "audio/webm",
      undefined, undefined,
      isGroup ? activeConvId : undefined,
      tempId
    );

    if (res.success && res.data) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...res.data, is_mine: true, status: "sent" } : m));
    } else {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "error" } : m));
    }
  }, [activeConvId, currentUser, activeConv?.isGroup, targetGroupId]);

  const handleDeleteMessage = useCallback(async (id: string) => {
    if (!currentUser?.id) return;
    setMessages(prev => prev.filter(m => m.id !== id));
    await deleteMessageDB(currentUser.id, id);
  }, [currentUser?.id]);

  // Realtime Integration
  useRealtimeMessages({
    supabase,
    currentUser: currentUser as any,
    activeConvId,
    conversations,
    setMessages,
    setConversations,
    setIsOtherTyping,
    setSettingsVersion: () => {},
    setOnlineUsers: setOnlineUsers as any,
    loadConversations,
    loadMessages,
  });

  const filteredConvs = conversations.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  // Axiom 11 — Latency Masking: skeleton during auth instead of bare spinner
  if (isAuthLoading) {
    return (
      <div className="flex h-full w-full bg-background overflow-hidden">
        {/* Sidebar skeleton */}
        <div className="w-full md:w-[380px] border-r border-surface-border flex flex-col gap-0">
          <div className="px-6 py-8">
            <div className="skeleton h-7 w-32 rounded-lg" />
          </div>
          <div className="px-6 mb-4">
            <div className="skeleton h-10 w-full rounded-xl" />
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3.5 px-4 py-4">
              <div className="skeleton w-12 h-12 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-28 rounded-full" />
                <div className="skeleton h-2.5 w-44 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        {/* Chat area skeleton — desktop only */}
        <div className="hidden md:flex flex-1 flex-col" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-background overflow-hidden relative">
      {/* Sidebar List */}
      <div className={clsx(
        "w-full md:w-[380px] flex flex-col border-r border-surface-border bg-background transition-all duration-300 md:block",
        mobileView === "chat" ? "hidden" : "block"
      )}>
        <div className="px-6 py-8 flex items-center justify-between">
          <h1 className="text-2xl font-black text-white tracking-tight">Messages</h1>
          <button 
            onClick={() => setIsNewTxOpen(true)}
            className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center text-primary border border-surface-border hover:bg-surface-border transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="px-6 mb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted shadow-sm" size={16} />
            <input 
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-elevated border border-surface-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-foreground-muted"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingConvs ? (
            // Axiom 11: skeleton, not spinner
            Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3.5 px-4 py-4">
                <div className="skeleton w-12 h-12 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-28 rounded-full" />
                  <div className="skeleton h-2.5 w-44 rounded-full" />
                </div>
                <div className="skeleton h-2 w-8 rounded-full" />
              </div>
            ))
          ) : filteredConvs.length > 0 ? (
            filteredConvs.map(conv => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                active={activeConvId === conv.id}
                onClick={() => {
                  setActiveConvId(conv.id);
                  setMobileView("chat");
                }}
                onPreload={(id) => {
                  // Axiom 7: only preload once per session per conversation
                  if (preloadedRef.current.has(id)) return;
                  preloadedRef.current.add(id);
                  loadMessages(id);
                }}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center px-8">
              <MessageCircle size={40} className="mb-4" />
              <p className="text-sm">No conversations yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={clsx(
        "flex-1 flex flex-col relative transition-all duration-300",
        mobileView === "list" ? "hidden md:flex" : "flex",
        !dmSettings?.theme_id ? "bg-background" : ""
      )}
      style={(() => {
        const t = PRESET_THEMES.find(t => t.id === dmSettings?.theme_id);
        return t?.style ? (t.style as any) : undefined;
      })()}
      >
        {activeConv ? (
          <>
            {dmSettings?.theme_id && (
              <ThemeBackground themeId={dmSettings.theme_id} />
            )}
            <ChatHeader 
              participant={activeConv}
              isOtherTyping={isOtherTyping}
              onBack={() => setMobileView("list")}
              onCall={() => startCall(activeConv.id, 'audio')}
              onVideoCall={() => startCall(activeConv.id, 'video')}
              onViewProfile={() => router.push(`/profile/${activeConv.username}`)}
              onSearch={() => {}}
              onBlock={async () => {
                await blockUserDB(currentUser!.id, activeConv.id);
                setConversations(prev => prev.filter(c => c.id !== activeConv.id));
                setActiveConvId(null);
                setMobileView("list");
              }}
              onReport={() => reportUserDB(currentUser!.id, activeConv.id, "Violation")}
              onClearChat={async () => {
                await clearChatDB(currentUser!.id, activeConv.id);
                setMessages([]);
              }}
              onExportChat={() => {}}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
            
            {/* Axiom 5: conversationId key drives AnimatePresence conv-switch transition */}
            <MessageList
              conversationId={activeConvId}
              messages={messages}
              loading={loadingMsgs}
              loadingMore={loadingMore}
              hasMore={hasMore}
              bubbleStyle={dmSettings?.bubble_style}
              onLoadMore={() => {
                const lastMsg = messages[messages.length - 1];
                if (lastMsg) loadMessages(activeConvId!, lastMsg.sent_at);
              }}
              onRetry={(m) => handleSendText(m.content)}
              onDelete={handleDeleteMessage}
              isOtherTyping={isOtherTyping}
              currentUserId={currentUser?.id}
            />

            <ChatInput 
              onSendText={handleSendText}
              onSendFile={handleSendFile}
              onSendVoice={handleSendVoice}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-20 text-center px-12">
            <div className="w-20 h-20 rounded-3xl bg-surface-elevated flex items-center justify-center mb-6">
              <MessageCircle size={40} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Your Space</h2>
            <p className="max-w-[280px] text-sm leading-relaxed">
              Select a conversation to start messaging. Your chats are secured and private.
            </p>
          </div>
        )}
      </div>

      <NewMessageOverlay 
        isOpen={isNewTxOpen}
        onClose={() => setIsNewTxOpen(false)}
        currentUser={currentUser}
        onSelectUser={(user) => {
          setActiveConvId(user.id);
          setIsNewTxOpen(false);
          setMobileView("chat");
        }}
        onCreated={(id) => {
          setActiveConvId(id);
          setIsNewTxOpen(false);
          setMobileView("chat");
          loadConversations();
        }}
      />

      <CallModal 
        isOpen={callState !== "idle" || incomingCall !== null}
        callType={incomingCall?.type ?? "audio"}
        callState={callState as any}
        localStream={localStream}
        remoteStream={remoteStream}
        participant={{
          name: activeConv?.name ?? activeConv?.username ?? "User",
          username: activeConv?.username ?? "",
          avatarUrl: activeConv?.avatarUrl
        }}
        onAccept={acceptCall}
        onReject={rejectCall}
        onHangUp={hangUp}
        onClose={hangUp}
      />
      <ChatSettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        partnerName={activeConv?.name || "Group"}
        partnerUsername={activeConv?.username}
        partnerAvatar={activeConv?.avatarUrl || ""}
        dmSettings={dmSettings}
        setDmSettings={async (updates) => {
          setDmSettings((prev: any) => ({ ...prev, ...updates }));
          if (currentUser?.id && activeConvId) {
             if (activeConv?.isGroup) {
               await updateGroupSettingsDB(activeConvId, updates);
             } else {
               await updateDMSettingsDB(currentUser.id, activeConvId, updates);
             }
          }
        }}
        activeConvId={activeConvId}
      />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
       <div className="flex h-[calc(100vh-80px)] items-center justify-center">
         <Loader2 className="animate-spin text-v-cyan opacity-50" />
       </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
