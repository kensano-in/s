"use client";

/**
 * ThreadPanel — Discord-style side reply thread panel
 * Slides in from right on desktop, bottom sheet on mobile
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Loader2, MessageSquare } from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";

interface ThreadMessage {
  id: string;
  content: string;
  sender_id: string;
  sender?: { display_name?: string; username: string; avatar_url?: string };
  sent_at: string;
  is_mine: boolean;
  type: string;
  media_url?: string;
}

interface ThreadPanelProps {
  isOpen: boolean;
  rootMessage: ThreadMessage | null;
  currentUser: { id: string; display_name?: string; username: string; avatar_url?: string } | null;
  onClose: () => void;
  onSendReply: (threadRootId: string, content: string) => Promise<void>;
}

export default function ThreadPanel({
  isOpen,
  rootMessage,
  currentUser,
  onClose,
  onSendReply,
}: ThreadPanelProps) {
  const [replies, setReplies] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadThread = useCallback(async () => {
    if (!rootMessage?.id) return;
    setLoading(true);
    try {
      const { getThreadMessagesDB } = await import("@/app/(main)/messages/actions");
      const res = await getThreadMessagesDB(rootMessage.id);
      if (res.success && res.data) {
        setReplies(res.data.map((m: any) => ({ ...m, is_mine: m.sender_id === currentUser?.id })));
      }
    } catch (e) {
      console.error("[ThreadPanel]", e);
    }
    setLoading(false);
  }, [rootMessage?.id, currentUser?.id]);

  useEffect(() => {
    if (isOpen && rootMessage) {
      loadThread();
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      setReplies([]);
      setInput("");
    }
  }, [isOpen, rootMessage?.id, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  const handleSend = async () => {
    if (!input.trim() || !rootMessage || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    // Optimistic
    const tempReply: ThreadMessage = {
      id: `temp-${Date.now()}`,
      content: text,
      sender_id: currentUser?.id ?? "",
      sender: currentUser
        ? { display_name: currentUser.display_name, username: currentUser.username, avatar_url: currentUser.avatar_url }
        : undefined,
      sent_at: new Date().toISOString(),
      is_mine: true,
      type: "text",
    };
    setReplies((prev) => [...prev, tempReply]);

    try {
      await onSendReply(rootMessage.id, text);
      await loadThread(); // Refresh to get real IDs
    } catch (e) {
      console.error("[ThreadPanel send]", e);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (d: string) => { try { return format(new Date(d), "HH:mm"); } catch { return ""; } };

  return (
    <AnimatePresence>
      {isOpen && rootMessage && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] md:hidden bg-black/50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 38 }}
            className={clsx(
              "fixed top-0 right-0 h-dvh z-[70] flex flex-col",
              "w-full md:w-[380px]"
            )}
            style={{
              background: "rgba(8,8,16,0.98)",
              backdropFilter: "blur(40px) saturate(180%)",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "-24px 0 80px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <MessageSquare size={15} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-[14px] font-bold text-white">Thread</h2>
                  <p className="text-[11px] text-white/40">
                    {replies.length} {replies.length === 1 ? "reply" : "replies"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/50 hover:text-white transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Root message */}
            <div
              className="px-5 py-4 border-b border-white/[0.06]"
              style={{ background: "rgba(98,0,238,0.04)" }}
            >
              <div className="flex items-start gap-3">
                <Avatar user={rootMessage.sender} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[13px] font-semibold text-white">
                      {rootMessage.sender?.display_name || rootMessage.sender?.username || "User"}
                    </span>
                    <span className="text-[10px] text-white/30">{formatTime(rootMessage.sent_at)}</span>
                  </div>
                  <p className="text-[13px] text-white/70 break-words leading-relaxed">{rootMessage.content}</p>
                </div>
              </div>
            </div>

            {/* Replies list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 flex flex-col gap-3">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="animate-spin text-primary/40" size={22} />
                </div>
              ) : replies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 opacity-25 text-center">
                  <MessageSquare size={32} />
                  <p className="text-sm">No replies yet.<br />Be the first.</p>
                </div>
              ) : (
                replies.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={clsx("flex items-start gap-3", r.is_mine && "flex-row-reverse")}
                  >
                    {!r.is_mine && <Avatar user={r.sender} size={28} />}
                    <div className={clsx("max-w-[80%]", r.is_mine && "items-end flex flex-col")}>
                      {!r.is_mine && (
                        <span className="text-[11px] text-white/40 mb-1 ml-1">
                          {r.sender?.display_name || r.sender?.username}
                        </span>
                      )}
                      <div
                        className="px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed break-words"
                        style={{
                          background: r.is_mine
                            ? "linear-gradient(135deg, #6200EE, #4a00c0)"
                            : "rgba(255,255,255,0.05)",
                          border: r.is_mine
                            ? "1px solid rgba(255,255,255,0.12)"
                            : "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        {r.content}
                      </div>
                      <span className="text-[10px] text-white/25 mt-1 mx-1">{formatTime(r.sent_at)}</span>
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div
              className="px-4 py-4 border-t border-white/[0.06]"
              style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
            >
              <div
                className="flex items-end gap-3 px-4 py-3 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Reply in thread..."
                  rows={1}
                  className="flex-1 bg-transparent text-[14px] text-white placeholder:text-white/25 resize-none outline-none leading-relaxed"
                  style={{ maxHeight: 120 }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className={clsx(
                    "w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0",
                    input.trim() && !sending
                      ? "bg-primary text-white shadow-lg shadow-primary/30"
                      : "bg-white/[0.06] text-white/20"
                  )}
                >
                  {sending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Avatar({ user, size }: { user?: any; size: number }) {
  const initials = (user?.display_name || user?.username || "U")[0].toUpperCase();
  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full shrink-0 flex items-center justify-center text-white font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: "linear-gradient(135deg, #6200EE, #3700B3)",
      }}
    >
      {initials}
    </div>
  );
}
