"use client";

/**
 * MessageList — High-Performance Responsive Chat Engine
 */

import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import MessageItem, { ChatMessage } from "./MessageItem";
import { MessageListSkeleton } from "@/components/ui/Skeleton";
import { MessageCircle, Loader2, ChevronDown, Ghost } from "lucide-react";
import clsx from "clsx";
import { CONV_TRANSITION } from "@/lib/motion";

interface MessageListProps {
  messages: ChatMessage[];
  loading: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  onRetry: (m: ChatMessage) => void;
  onDelete: (id: string) => void;
  onDeleteForMe?: (id: string) => void;
  canDeleteOthers?: boolean;
  onReply?: (m: ChatMessage) => void;
  onEdit?: (m: ChatMessage) => void;
  onReact?: (id: string, emoji: string) => void;
  onForward?: (m: ChatMessage) => void;
  onPin?: (m: ChatMessage) => void;
  onStar?: (m: ChatMessage) => void;
  onReveal?: (messageId: string) => void;
  onOpenThread?: (m: ChatMessage) => void;
  onCancelUpload?: (messageId: string) => void;
  currentUserId?: string;
  bubbleStyle?: string;
  conversationId?: string | null;
  partnerNickname?: string | null;
  disappearingMode?: string | null;
  showEmptyState?: boolean;
  chatContext?: { type: 'community' | 'group' | 'dm'; name: string };
  chatMembers?: { id: string; display_name: string; username?: string; avatar_url?: string }[];
  activeGhostMode?: boolean;
  onToggleGhostMode?: () => void;
  typingIndicator?: string;
}

const MessageListInner = memo(function MessageListInner({
  messages,
  loading,
  onLoadMore,
  hasMore,
  loadingMore,
  onRetry,
  onDelete,
  onDeleteForMe,
  canDeleteOthers = false,
  onReply,
  onEdit,
  onReact,
  onForward,
  onPin,
  onStar,
  onReveal,
  onOpenThread,
  onCancelUpload,
  currentUserId,
  bubbleStyle,
  conversationId,
  partnerNickname,
  disappearingMode,
  showEmptyState = true,
  chatContext,
  chatMembers,
  activeGhostMode = false,
  onToggleGhostMode,
  typingIndicator,
}: MessageListProps) {
  const renderCountRef = useRef(0);
  renderCountRef.current++;
  console.log(`[FORENSICS-RENDER] MessageList rendered. Total renders = ${renderCountRef.current}`);

  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);

  // ── Windowed rendering — only mount VISIBLE_WINDOW messages in the DOM ──────
  // Keeps scroll logic intact while capping DOM nodes regardless of chat length.
  const VISIBLE_WINDOW = 60; // render at most 60 items; expand as user scrolls up
  const [windowStart, setWindowStart] = useState(0);

  // Real-time client-side vanishing filter
  // Only start timer if chat actually contains expiring location messages (0ms overhead for normal chats)
  const hasExpiringLocationMessages = useMemo(() => {
    return messages.some((m) => !!m.location_expires_at);
  }, [messages]);

  const [nowTime, setNowTime] = useState(Date.now());

  useEffect(() => {
    if (!hasExpiringLocationMessages) return;
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 10_000);
    return () => clearInterval(timer);
  }, [hasExpiringLocationMessages]);

  const activeMessages = useMemo(() => {
    if (!hasExpiringLocationMessages) return messages;
    return messages.filter((m) => {
      if (!m.location_expires_at) return true;
      return new Date(m.location_expires_at).getTime() > nowTime;
    });
  }, [messages, hasExpiringLocationMessages, nowTime]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);

  // ── Swipe Up to enter/exit Ghost Mode ──
  const [pullY, setPullY] = useState(0);
  const dragStartYRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  const handleStart = useCallback((clientY: number) => {
    if (chatContext?.type !== 'dm') return;
    const container = scrollRef.current;
    if (!container) return;

    // Check if scrolled to bottom
    const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
    if (isAtBottom) {
      dragStartYRef.current = clientY;
      isDraggingRef.current = true;
    }
  }, [chatContext]);

  const handleMove = useCallback((clientY: number, e?: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingRef.current || dragStartYRef.current === null) return;
    const deltaY = dragStartYRef.current - clientY;
    if (deltaY > 0) {
      if (e && e.cancelable) e.preventDefault(); // Stop browser text selection / drag behavior
      setPullY(Math.min(120, deltaY));
    } else {
      setPullY(0);
    }
  }, []);

  const handleEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    dragStartYRef.current = null;

    if (pullY >= 80) {
      onToggleGhostMode?.();
    }
    setPullY(0);
  }, [pullY, onToggleGhostMode]);

  // Reset active menu when switching conversations
  useEffect(() => {
    setActiveMenuMessageId(null);
  }, [conversationId]);

  const pendingInitialScrollRef = useRef(true);
  const conversationLoadTimeRef = useRef(0);
  const isInteractingRef = useRef(false);
  const prevLoadingRef = useRef(loading);

  const scrollCacheRef = useRef<Map<string, number>>(new Map());
  const prevConvIdRef = useRef<string | null | undefined>(null);

  // Save scroll position when conversation changes
  useEffect(() => {
    const prev = prevConvIdRef.current;
    if (prev && prev !== conversationId && scrollRef.current) {
      scrollCacheRef.current.set(prev, scrollRef.current.scrollTop);
    }
    prevConvIdRef.current = conversationId;
    pendingInitialScrollRef.current = true;
  }, [conversationId]);

  // Reset conversationLoadTimeRef when loading completes
  useEffect(() => {
    if (prevLoadingRef.current && !loading) {
      conversationLoadTimeRef.current = Date.now();
    }
    prevLoadingRef.current = loading;
  }, [loading]);

  // Restore scroll position when conversation and messages are loaded (only if not initial load)
  useEffect(() => {
    if (!conversationId || loading || activeMessages.length === 0) return;
    if (pendingInitialScrollRef.current) return;
    const saved = scrollCacheRef.current.get(conversationId);
    if (saved !== undefined && scrollRef.current) {
      scrollRef.current.scrollTop = saved;
    }
  }, [conversationId, loading, activeMessages.length]);

  // Listen to user interactions to distinguish manual vs programmatic scrolls
  useEffect(() => {
    const list = scrollRef.current;
    if (!list) return;

    const setInteracting = () => { isInteractingRef.current = true; };
    const unsetInteracting = () => { isInteractingRef.current = false; };

    list.addEventListener('touchstart', setInteracting, { passive: true });
    list.addEventListener('touchend', unsetInteracting, { passive: true });
    list.addEventListener('mousedown', setInteracting, { passive: true });
    list.addEventListener('mouseup', unsetInteracting, { passive: true });
    list.addEventListener('wheel', setInteracting, { passive: true });

    return () => {
      list.removeEventListener('touchstart', setInteracting);
      list.removeEventListener('touchend', unsetInteracting);
      list.removeEventListener('mousedown', setInteracting);
      list.removeEventListener('mouseup', unsetInteracting);
      list.removeEventListener('wheel', setInteracting);
    };
  }, [loading]);

  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const isNearBottomRef = useRef(true);

  // Scroll event handler
  useEffect(() => {
    const list = scrollRef.current;
    if (!list) return;

    const handleScroll = () => {
      const distanceToBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
      isNearBottomRef.current = distanceToBottom < 250;

      const timeSinceLoad = Date.now() - conversationLoadTimeRef.current;
      if (distanceToBottom > 250 && (isInteractingRef.current || timeSinceLoad > 800)) {
        pendingInitialScrollRef.current = false;
      }

      setShowScrollButton(distanceToBottom > 300);
      if (isNearBottomRef.current) {
        setUnreadCount(0);
      }
    };

    list.addEventListener('scroll', handleScroll, { passive: true });
    return () => list.removeEventListener('scroll', handleScroll);
  }, [loading]);

  // ResizeObserver on the content container to handle size changes (reflow, image load, etc.)
  useEffect(() => {
    const list = scrollRef.current;
    if (!list) return;

    const content = list.firstElementChild as HTMLElement;
    if (!content) return;

    const resizeObserver = new ResizeObserver(() => {
      if (pendingInitialScrollRef.current || isNearBottomRef.current) {
        list.scrollTop = list.scrollHeight;
      }
    });

    resizeObserver.observe(content);
    return () => resizeObserver.disconnect();
  }, [loading]);

  // Snap to bottom on load / new messages
  const prevMsgCountRef = useRef(activeMessages.length);

  useLayoutEffect(() => {
    if (loading || activeMessages.length === 0) return;

    const container = scrollRef.current;
    if (!container) return;

    const prevCount = prevMsgCountRef.current;
    const curCount = activeMessages.length;
    prevMsgCountRef.current = curCount;

    if (pendingInitialScrollRef.current) {
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight;
          isNearBottomRef.current = true;
        }
      });
    } else if (curCount > prevCount) {
      const lastMsg = activeMessages[activeMessages.length - 1];
      const isMyNewMessage = lastMsg && lastMsg.sender_id === currentUserId;

      if (isNearBottomRef.current || isMyNewMessage) {
        isNearBottomRef.current = true; // Force stickiness before the layout fully updates
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight;
            isNearBottomRef.current = true;
          }
        });
        if (isMyNewMessage) {
          setUnreadCount(0);
        }
      } else {
        setUnreadCount(prev => prev + (curCount - prevCount));
      }
    }
  }, [activeMessages, loading]);

  // Group messages by date and sender
  const groupedMessages = useMemo(() => {
    const result: any[] = [];
    let currentMediaGroup: any[] = [];
    let currentGroupId: string | null = null;

    for (let i = 0; i < activeMessages.length; i++) {
      const msg = activeMessages[i];

      if (msg.media_group_id && (msg.type === "image" || msg.type === "video")) {
        if (currentGroupId === msg.media_group_id) {
          currentMediaGroup.push(msg);
        } else {
          // Flush previous group
          if (currentMediaGroup.length > 0) {
            if (currentMediaGroup.length === 1) {
              result.push(currentMediaGroup[0]);
            } else {
              result.push({
                id: currentMediaGroup[0].id,
                type: "media_group",
                media_group_id: currentGroupId,
                messages: currentMediaGroup,
                sender_id: currentMediaGroup[0].sender_id,
                sent_at: currentMediaGroup[0].sent_at,
                is_mine: currentMediaGroup[0].is_mine,
                sender: currentMediaGroup[0].sender,
                reply_to: currentMediaGroup[0].reply_to,
                reply_to_id: currentMediaGroup[0].reply_to_id,
                reactions: currentMediaGroup[0].reactions,
                content: currentMediaGroup[0].content,
                file_name: currentMediaGroup[0].file_name,
              });
            }
          }
          currentMediaGroup = [msg];
          currentGroupId = msg.media_group_id;
        }
      } else {
        // Flush previous media group
        if (currentMediaGroup.length > 0) {
          if (currentMediaGroup.length === 1) {
            result.push(currentMediaGroup[0]);
          } else {
            result.push({
              id: currentMediaGroup[0].id,
              type: "media_group",
              media_group_id: currentGroupId,
              messages: currentMediaGroup,
              sender_id: currentMediaGroup[0].sender_id,
              sent_at: currentMediaGroup[0].sent_at,
              is_mine: currentMediaGroup[0].is_mine,
              sender: currentMediaGroup[0].sender,
              reply_to: currentMediaGroup[0].reply_to,
              reply_to_id: currentMediaGroup[0].reply_to_id,
              reactions: currentMediaGroup[0].reactions,
              content: currentMediaGroup[0].content,
              file_name: currentMediaGroup[0].file_name,
            });
          }
          currentMediaGroup = [];
          currentGroupId = null;
        }
        result.push(msg);
      }
    }

    // Flush final group
    if (currentMediaGroup.length > 0) {
      if (currentMediaGroup.length === 1) {
        result.push(currentMediaGroup[0]);
      } else {
        result.push({
          id: currentMediaGroup[0].id,
          type: "media_group",
          media_group_id: currentGroupId,
          messages: currentMediaGroup,
          sender_id: currentMediaGroup[0].sender_id,
          sent_at: currentMediaGroup[0].sent_at,
          is_mine: currentMediaGroup[0].is_mine,
          sender: currentMediaGroup[0].sender,
          reply_to: currentMediaGroup[0].reply_to,
          reply_to_id: currentMediaGroup[0].reply_to_id,
          reactions: currentMediaGroup[0].reactions,
          content: currentMediaGroup[0].content,
          file_name: currentMediaGroup[0].file_name,
        });
      }
    }

    return result.map((msg, i, arr) => {
      const prev = arr[i - 1];
      const next = arr[i + 1];

      const currDate = new Date(msg.sent_at).toDateString();
      const prevDate = prev ? new Date(prev.sent_at).toDateString() : null;
      const showSeparator = currDate !== prevDate;

      let separatorLabel = currDate;
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      if (currDate === today) separatorLabel = "Today";
      else if (currDate === yesterday) separatorLabel = "Yesterday";

      const showSenderName = chatContext?.type !== "dm" && !msg.is_mine && (!prev || prev.sender_id !== msg.sender_id || showSeparator);

      // Smart Grouping (Axiom: Luxury Flow)
      const sameAsPrev = prev && prev.sender_id === msg.sender_id && !showSeparator;
      const sameAsNext = next && next.sender_id === msg.sender_id && (new Date(next.sent_at).toDateString() === currDate);
      
      const isFirstInGroup = !sameAsPrev;
      const isLastInGroup = !sameAsNext;

      return { 
        ...msg, 
        showSeparator, 
        separatorLabel, 
        showSenderName,
        isFirstInGroup,
        isLastInGroup
      };
    });
  }, [activeMessages]);

  // Update window when grouped messages list changes (new messages at bottom or load-more at top)
  const prevGroupedLengthRef = useRef(0);
  useEffect(() => {
    const cur = groupedMessages.length;
    const prev = prevGroupedLengthRef.current;
    if (cur > prev && prev > 0) {
      // New messages appended at bottom — keep window near the end
      if (isNearBottomRef.current) {
        setWindowStart(Math.max(0, cur - VISIBLE_WINDOW));
      }
    } else if (cur > prev && prev === 0) {
      // Initial load — show the tail
      setWindowStart(Math.max(0, cur - VISIBLE_WINDOW));
    }
    prevGroupedLengthRef.current = cur;
  }, [groupedMessages.length]);

  // Expand window upward when scrolled near top (lazy load more DOM nodes)
  const handleWindowedScroll = useCallback(() => {
    const list = scrollRef.current;
    if (!list) return;
    if (list.scrollTop < 400 && windowStart > 0) {
      setWindowStart(prev => Math.max(0, prev - 30));
    }
  }, [windowStart]);

  // Attach windowed scroll handler separately (passive)
  useEffect(() => {
    const list = scrollRef.current;
    if (!list) return;
    list.addEventListener('scroll', handleWindowedScroll, { passive: true });
    return () => list.removeEventListener('scroll', handleWindowedScroll);
  }, [handleWindowedScroll, loading]);

  // Sliced view — only the visible window
  const visibleMessages = useMemo(() => {
    return groupedMessages.slice(windowStart);
  }, [groupedMessages, windowStart]);

  // Height of messages above the window (approximate spacer to preserve scroll anchor)
  const topSpacerCount = windowStart;

  // ── Axiom 6: Scroll Invariant — capture height BEFORE mutation ─────────────
  const prevScrollHeightRef = useRef<number>(0);
  const prevLoadingMoreRef = useRef<boolean>(false);

  useLayoutEffect(() => {
    const list = scrollRef.current;
    if (!list) return;

    if (loadingMore && !prevLoadingMoreRef.current) {
      prevScrollHeightRef.current = list.scrollHeight;
    }

    if (!loadingMore && prevLoadingMoreRef.current && prevScrollHeightRef.current > 0) {
      const delta = list.scrollHeight - prevScrollHeightRef.current;
      list.scrollTop += delta;
      prevScrollHeightRef.current = 0;
    }

    prevLoadingMoreRef.current = loadingMore;
  }, [loadingMore, activeMessages]);

  // ── Infinite Scroll Observer ───────────────────────────────────────────────
  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) onLoadMore(); },
      { threshold: 0.1 }
    );
    const el = topSentinelRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [hasMore, loading, loadingMore, onLoadMore]);

  if (loading) {
    return <MessageListSkeleton />;
  }

  if (activeMessages.length === 0) {
    if (!showEmptyState) {
      return (
        <div ref={scrollRef} className="message-container flex-1 overflow-y-auto custom-scrollbar flex flex-col pt-4">
          <div ref={bottomRef} className="h-16 shrink-0" />
        </div>
      );
    }
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center opacity-40">
        <div className="w-16 h-16 rounded-full bg-surface-border/20 flex items-center justify-center">
          <MessageCircle size={32} />
        </div>
        <p className="text-sm font-medium">No messages yet. Start the conversation.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <AnimatePresence>
        {disappearingMode && disappearingMode !== "off" && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-4 my-2 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md flex items-center gap-3 shrink-0 z-[15] shadow-lg shadow-indigo-500/5"
          >
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Ghost size={14} className="animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-white/90">Disappearing Messages Active</p>
              <p className="text-[10px] text-white/50 leading-relaxed mt-0.5">
                New messages will automatically vanish {disappearingMode === '24h' ? '24 hours' : disappearingMode === '7d' ? '7 days' : disappearingMode === '30d' ? '30 days' : '90 days'} after they are read by the recipient.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div
        ref={scrollRef}
        className="message-container flex-1 overflow-y-auto custom-scrollbar"
        style={{
          scrollBehavior: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
        onTouchStart={(e) => handleStart(e.touches[0].clientY)}
        onTouchMove={(e) => handleMove(e.touches[0].clientY, e)}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => handleStart(e.clientY)}
        onMouseMove={(e) => {
          if (e.buttons === 1) handleMove(e.clientY, e);
        }}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
      >
        <div className="flex flex-col min-h-full pt-4 relative">
          <div ref={topSentinelRef} className="h-4 shrink-0" />

          {/* Virtual top spacer — preserves scroll position for messages above the window */}
          {topSpacerCount > 0 && (
            <div
              aria-hidden
              style={{ height: `${topSpacerCount * 72}px`, flexShrink: 0 }}
            />
          )}

          {loadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 size={16} className="animate-spin text-primary" />
            </div>
          )}

          {(() => {
            // 1. Calculate the latest active message ID for each user (sent or seen)
            const latestActiveMsgId: Record<string, string> = {};
            const userLatestIndex: Record<string, number> = {};

            // Use full groupedMessages for seen indicator calc (don't break seen UX)
            groupedMessages.forEach((msg, idx) => {
              userLatestIndex[msg.sender_id] = idx;
              latestActiveMsgId[msg.sender_id] = msg.id;
              if (msg.viewed_by) {
                msg.viewed_by.forEach((uid: string) => {
                  if (idx > (userLatestIndex[uid] ?? -1)) {
                    userLatestIndex[uid] = idx;
                    latestActiveMsgId[uid] = msg.id;
                  }
                });
              }
            });

            // Find the last own message ID
            let lastOwnMessageId: string | null = null;
            for (let i = groupedMessages.length - 1; i >= 0; i--) {
              if (groupedMessages[i].is_mine) { lastOwnMessageId = groupedMessages[i].id; break; }
            }

            // Render only the visible window slice
            return visibleMessages.map((msg) => {
              const viewers = chatMembers ? Object.keys(latestActiveMsgId)
                .filter(uid => latestActiveMsgId[uid] === msg.id && msg.sender_id !== uid && uid !== currentUserId)
                .map(uid => chatMembers.find(m => m.id === uid))
                .filter(Boolean) as { id: string; display_name: string; username?: string; avatar_url?: string }[]
                : [];

              return (
                <div
                  key={msg.id}
                  id={`msg-${msg.id}`}
                  className="message-item-wrapper"
                  style={{ overflow: "visible" }}
                >
                  {msg.showSeparator && (
                    <div className="flex justify-center my-8">
                      <span className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-[10px] font-bold text-foreground-muted uppercase tracking-widest">
                        {msg.separatorLabel}
                      </span>
                    </div>
                  )}
                  <MessageItem
                    message={msg}
                    currentUserId={currentUserId}
                    onRetry={onRetry}
                    onDelete={onDelete}
                    onDeleteForMe={onDeleteForMe}
                    canDeleteOthers={canDeleteOthers}
                    onReply={onReply}
                    onEdit={onEdit}
                    onReact={onReact}
                    onForward={onForward}
                    onPin={onPin}
                    onStar={onStar}
                    onReveal={onReveal}
                    onOpenThread={onOpenThread}
                    onCancelUpload={onCancelUpload}
                    showSenderName={msg.showSenderName}
                    isFirstInGroup={msg.isFirstInGroup}
                    isLastInGroup={msg.isLastInGroup}
                    bubbleStyle={bubbleStyle}
                    partnerNickname={partnerNickname}
                    activeMenuMessageId={activeMenuMessageId}
                    setActiveMenuMessageId={setActiveMenuMessageId}
                    chatContext={chatContext}
                    chatMembers={chatMembers}
                    isLastOwnMessage={msg.id === lastOwnMessageId}
                    viewers={viewers}
                  />
                </div>
              );
            });
          })()}
          {/* Vanish / Ghost Mode Pull Up Indicator */}
          {chatContext?.type === 'dm' && pullY > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-4 w-full text-violet-400 select-none pointer-events-none"
              style={{
                transform: `translateY(${Math.max(0, 10 - pullY * 0.15)}px)`,
                opacity: Math.min(1, pullY / 80)
              }}
            >
              <Ghost className={clsx(
                "w-6 h-6 mb-1 transition-transform duration-200", 
                pullY >= 80 ? "scale-125 text-violet-300 animate-bounce" : "scale-100"
              )} />
              <span className="text-[11px] font-bold tracking-wider uppercase text-violet-300/80">
                {pullY >= 80 
                  ? "Release to toggle Ghost Mode" 
                  : activeGhostMode 
                    ? "Swipe up to exit Ghost Mode" 
                    : "Swipe up to enter Ghost Mode"}
              </span>
            </motion.div>
          )}

          <div ref={bottomRef} className="h-16 shrink-0" />
        </div>
      </div>

      {showScrollButton && (
        <button
          onClick={() => {
            const container = scrollRef.current;
            if (container) {
              container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            }
            setUnreadCount(0);
          }}
          className="absolute bottom-5 right-5 z-20 flex items-center justify-center w-9 h-9 rounded-full bg-[#121218]/95 hover:bg-[#1c1c24] text-neutral-400 hover:text-white border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 group"
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="w-4 h-4 transition-transform duration-200 group-hover:translate-y-0.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-black text-white ring-2 ring-[#0d0d12] shadow-sm">
              {unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
});

export default function MessageList(props: MessageListProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={props.conversationId ?? "no-conv"}
        {...CONV_TRANSITION}
        className="flex-1 flex flex-col min-h-0 relative"
      >
        <MessageListInner {...props} />
      </motion.div>
    </AnimatePresence>
  );
}
