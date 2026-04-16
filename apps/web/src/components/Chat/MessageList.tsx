"use client";

/**
 * MessageList — Perception-Controlled Reality Engine
 *
 * Axiom 5  — Motion Continuity:   AnimatePresence keyed on conversationId
 * Axiom 6  — Scroll Invariant:    useLayoutEffect captures height before mutation
 * Axiom 11 — Latency Masking:     MessageListSkeleton on initial load
 * Axiom 13 — Memory Continuity:   scroll position cached per conversationId
 */

import { useEffect, useLayoutEffect, useRef, useMemo, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import MessageItem, { ChatMessage } from "./MessageItem";
import TypingIndicator from "./TypingIndicator";
import { MessageListSkeleton } from "@/components/ui/Skeleton";
import { MessageCircle } from "lucide-react";
import { Loader2 } from "lucide-react";
import clsx from "clsx";
import { CONV_TRANSITION } from "@/lib/motion";

interface MessageListProps {
  messages: ChatMessage[];
  loading: boolean;
  isOtherTyping: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  onRetry: (m: ChatMessage) => void;
  onDelete: (id: string) => void;
  onReply?: (m: ChatMessage) => void;
  onEdit?: (m: ChatMessage) => void;
  onReact?: (id: string, emoji: string) => void;
  onForward?: (m: ChatMessage) => void;
  onReveal?: (messageId: string) => void;
  onOpenThread?: (m: ChatMessage) => void;
  currentUserId?: string;
  bubbleStyle?: string;
  /** Used as AnimatePresence key for motion continuity on switch (Axiom 5) */
  conversationId?: string | null;
  partnerNickname?: string | null;
}

const MessageListInner = memo(function MessageListInner({
  messages,
  loading,
  isOtherTyping,
  onLoadMore,
  hasMore,
  loadingMore,
  onRetry,
  onDelete,
  onReply,
  onEdit,
  onReact,
  onForward,
  onReveal,
  onOpenThread,
  currentUserId,
  bubbleStyle,
  conversationId,
  partnerNickname,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);

  // ── Axiom 13: Memory Continuity — scroll position per conversation ─────────
  const scrollCacheRef = useRef<Map<string, number>>(new Map());
  const prevConvIdRef = useRef<string | null | undefined>(null);

  // Save scroll position when conversation changes
  useEffect(() => {
    const prev = prevConvIdRef.current;
    if (prev && prev !== conversationId && scrollRef.current) {
      scrollCacheRef.current.set(prev, scrollRef.current.scrollTop);
    }
    prevConvIdRef.current = conversationId;
  }, [conversationId]);

  // Restore scroll position when conversation and messages are loaded
  useEffect(() => {
    if (!conversationId || loading || messages.length === 0) return;
    const saved = scrollCacheRef.current.get(conversationId);
    if (saved !== undefined && scrollRef.current) {
      scrollRef.current.scrollTop = saved;
    }
  }, [conversationId, loading, messages.length]);

  // Group messages by date and sender
  const groupedMessages = useMemo(() => {
    const reversed = [...messages].reverse();
    return reversed.map((msg, i, arr) => {
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

      const showSenderName = !msg.is_mine && (!prev || prev.sender_id !== msg.sender_id || showSeparator);

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
  }, [messages]);

  // ── Axiom 6: Scroll Invariant — capture height BEFORE mutation ─────────────
  // useLayoutEffect fires synchronously before the browser paints, giving us
  // the pre-mutation scrollHeight to compute the exact delta.
  const prevScrollHeightRef = useRef<number>(0);
  const prevLoadingMoreRef = useRef<boolean>(false);

  useLayoutEffect(() => {
    const list = scrollRef.current;
    if (!list) return;

    if (loadingMore && !prevLoadingMoreRef.current) {
      // Capture height at the moment loadingMore starts (before skeleton injects)
      prevScrollHeightRef.current = list.scrollHeight;
    }

    if (!loadingMore && prevLoadingMoreRef.current && prevScrollHeightRef.current > 0) {
      // Older messages were prepended — restore scroll position (Axiom 6)
      const delta = list.scrollHeight - prevScrollHeightRef.current;
      list.scrollTop += delta;
      prevScrollHeightRef.current = 0;
    }

    prevLoadingMoreRef.current = loadingMore;
  }, [loadingMore, messages]);

  // ── Auto-scroll to bottom for new messages ─────────────────────────────────
  const isNearBottomRef = useRef<boolean>(true);

  useEffect(() => {
    const list = scrollRef.current;
    if (!list) return;
    const handleScroll = () => {
      const distanceToBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
      isNearBottomRef.current = distanceToBottom < 100;
    };
    list.addEventListener("scroll", handleScroll, { passive: true });
    return () => list.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // UI-05: Don't auto-scroll when loading older messages (loadingMore=true)
    // Only scroll to bottom for NEW messages when user is near the bottom
    if (loading || loadingMore || messages.length === 0) return;
    if (isNearBottomRef.current) {
      // Use instant scroll for immediate feedback in Phase 4 rebuild
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages, loading, loadingMore]);

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

  // ── Axiom 11: Latency Masking — skeleton on initial load ──────────────────
  if (loading) {
    return <MessageListSkeleton />;
  }

  if (messages.length === 0) {
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
    <div ref={scrollRef} className="message-container flex-1 overflow-y-auto custom-scrollbar flex flex-col pt-4">
      <div ref={topSentinelRef} className="h-4 shrink-0" />

      {/* Axiom 11: Loading older messages — subtle top spinner (scroll invariant holds via useLayoutEffect) */}
      {loadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 size={16} className="animate-spin text-primary" />
        </div>
      )}

      {groupedMessages.map((msg) => (
        <div key={msg.id}>
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
            onReply={onReply}
            onEdit={onEdit}
            onReact={onReact}
            onForward={onForward}
            onReveal={onReveal}
            onOpenThread={onOpenThread}
            showSenderName={msg.showSenderName}
            isFirstInGroup={msg.isFirstInGroup}
            isLastInGroup={msg.isLastInGroup}
            bubbleStyle={bubbleStyle}
            partnerNickname={partnerNickname}
          />
        </div>
      ))}

      {isOtherTyping && <TypingIndicator />}

      <div ref={bottomRef} className="h-8 shrink-0" />
    </div>
  );
});

/**
 * Outer wrapper provides Axiom 5 — Motion Continuity:
 * AnimatePresence with mode="wait" ensures the old list exits before the new one enters.
 * Keyed on conversationId so framer-motion treats each conversation as a distinct element.
 */
export default function MessageList(props: MessageListProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={props.conversationId ?? "no-conv"}
        {...CONV_TRANSITION}
        className="flex-1 flex flex-col min-h-0 relative overflow-hidden"
      >
        <MessageListInner {...props} />
      </motion.div>
    </AnimatePresence>
  );
}
