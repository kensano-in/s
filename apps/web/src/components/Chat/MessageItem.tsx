"use client";

import { motion, AnimatePresence } from "framer-motion";
import { memo, useState, useRef, useCallback } from "react";
import {
  AlertCircle,
  Reply,
  Pencil,
  Trash2,
  MoreHorizontal,
  Forward,
  Copy,
  Download,
  FileText,
  MessageSquare,
  Check,
  CheckCheck,
  Clock,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import clsx from "clsx";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { BUBBLE_STYLES } from "./ChatSettingsModal";
import VoicePlayer from "./VoicePlayer";
import GhostBubble from "./GhostBubble";
import LocationBubble from "./LocationBubble";
import EmojiPicker from "./EmojiPicker";

export type MessageStatus = "pending" | "sending" | "sent" | "delivered" | "seen" | "error" | "failed";
export type MessageType = "text" | "image" | "voice" | "file" | "system" | "location";

export interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  recipient_id?: string;
  conversation_id?: string;
  sent_at: string;
  created_at?: string;
  is_mine: boolean;
  status: MessageStatus;
  type: MessageType;
  media_url?: string;
  file_name?: string;
  mime_type?: string;
  reply_to?: { id: string; content: string; sender_display?: string } | null;
  reply_to_id?: string | null;
  edited_at?: string | null;
  reactions?: { emoji: string; count: number; reacted: boolean; userIds?: string[] }[];
  client_temp_id?: string | null;
  // View-once
  view_once?: boolean;
  is_viewed?: boolean;
  viewed_by?: string[];
  // Pinned
  is_pinned?: boolean;
  // Sender profile (from DB join)
  sender?: { display_name?: string | null; username?: string; avatar_url?: string | null } | null;
  // Location
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  location_live?: boolean;
  location_expires_at?: string;
  // Threads
  thread_root_id?: string | null;
  reply_count?: number;
}

interface MessageItemProps {
  message: ChatMessage;
  currentUserId?: string;
  onRetry?: (message: ChatMessage) => void;
  onDelete?: (id: string) => void;
  onReply?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onForward?: (message: ChatMessage) => void;
  onReveal?: (messageId: string) => void;
  onOpenThread?: (message: ChatMessage) => void;
  showSenderName?: boolean;
  bubbleStyle?: string;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  partnerNickname?: string | null;
}

// ── Emoji detection ──────────────────────────────────────────────────────────
/** Returns true if str is ONLY emoji characters (1–3 grapheme clusters) */
function isSoloEmoji(str: string): boolean {
  const trimmed = str.trim();
  if (!trimmed) return false;
  try {
    const segmenter = new (Intl as any).Segmenter(undefined, { granularity: "grapheme" });
    const segs = [...segmenter.segment(trimmed)];
    // Allow up to 3 emoji clusters
    if (segs.length === 0 || segs.length > 3) return false;
    // Every segment must be an emoji
    return segs.every(({ segment }: { segment: string }) => {
      const code = segment.codePointAt(0) ?? 0;
      return (
        /\p{Emoji}/u.test(segment) &&
        (
          (code >= 0x1f300 && code <= 0x1faff) ||
          (code >= 0x2600  && code <= 0x27bf)  ||
          (code >= 0x231a  && code <= 0x2b55)  ||
          code === 0x200d // ZWJ sequences
        )
      );
    });
  } catch {
    // Fallback: pure-emoji regex
    return /^(\p{Emoji}\uFE0F?\u20E3?|\p{Emoji_Presentation}){1,3}$/u.test(trimmed);
  }
}

// ── Border radius logic ───────────────────────────────────────────────────────
function getBorderRadius(isMine: boolean, isFirst: boolean, isLast: boolean) {
  const full = "20px";
  const tight = "5px";
  if (isFirst && isLast)
    return { borderTopLeftRadius: full, borderTopRightRadius: full, borderBottomLeftRadius: full, borderBottomRightRadius: full };
  if (isMine)
    return {
      borderTopLeftRadius: full,
      borderTopRightRadius: isFirst ? full : tight,
      borderBottomLeftRadius: full,
      borderBottomRightRadius: isLast ? full : tight,
    };
  return {
    borderTopLeftRadius: isFirst ? full : tight,
    borderTopRightRadius: full,
    borderBottomLeftRadius: isLast ? full : tight,
    borderBottomRightRadius: full,
  };
}

// ── Status Ticks (WhatsApp-grade) ─────────────────────────────────────────────
function StatusOrb({ status, onRetry }: { status: MessageStatus; onRetry?: () => void }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={status}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: "spring", stiffness: 700, damping: 30 }}
        className="flex items-center gap-0.5"
      >
        {(status === "pending" || status === "sending") ? (
          // Clock: queued or in-flight
          <Clock size={11} className="text-white/30 animate-pulse" />
        ) : status === "sent" ? (
          // Single grey tick
          <Check size={12} className="text-white/40" strokeWidth={2.5} />
        ) : status === "delivered" ? (
          // Double grey tick
          <CheckCheck size={12} className="text-white/40" strokeWidth={2.5} />
        ) : status === "seen" ? (
          // Double cyan/blue tick (WhatsApp blue)
          <CheckCheck size={12} className="text-cyan-400" strokeWidth={2.5}
            style={{ filter: "drop-shadow(0 0 4px rgba(34,211,238,0.7))" }} />
        ) : (status === "failed" || status === "error") ? (
          // Red retry button
          <button
            onClick={(e) => { e.stopPropagation(); onRetry?.(); }}
            className="flex items-center gap-0.5 group/retry"
            title="Tap to retry"
          >
            <RefreshCw size={10}
              className="text-red-400 group-hover/retry:text-red-300 group-hover/retry:rotate-180 transition-all duration-300" />
          </button>
        ) : (
          <Check size={12} className="text-white/25" strokeWidth={2.5} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ── Reaction Picker ───────────────────────────────────────────────────────────
const DEFAULT_REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];

function ReactionPicker({
  onSelect,
  onClose,
  onOpenFull,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  onOpenFull?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.6, y: 8 }}
      transition={{ type: "spring", stiffness: 600, damping: 32 }}
      className="absolute bottom-full mb-2 z-[200] flex items-center gap-1 px-3 py-2 rounded-2xl"
      style={{
        background: "rgba(10,10,18,0.96)",
        backdropFilter: "blur(40px) saturate(200%)",
        WebkitBackdropFilter: "blur(40px) saturate(200%)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
      }}
    >
      {DEFAULT_REACTIONS.map((emoji, i) => (
        <motion.button
          key={emoji}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.04, type: "spring", stiffness: 600, damping: 30 }}
          whileHover={{ scale: 1.3 }}
          whileTap={{ scale: 0.85 }}
          onClick={() => { onSelect(emoji); onClose(); }}
          className="text-[22px] leading-none"
        >
          {emoji}
        </motion.button>
      ))}
      {/* Full picker trigger */}
      <motion.button
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: DEFAULT_REACTIONS.length * 0.04, type: "spring", stiffness: 600, damping: 30 }}
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.85 }}
        onClick={onOpenFull}
        className="w-7 h-7 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 text-[16px] transition-colors"
        title="More reactions"
      >
        +
      </motion.button>
    </motion.div>
  );
}

// ── File Card ─────────────────────────────────────────────────────────────────
function FileCard({ url, name, mime, isMine }: { url?: string; name?: string; mime?: string; isMine: boolean }) {
  const ext = (name?.split(".").pop() || mime?.split("/").pop() || "file").toUpperCase();
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-2xl transition-all group/file"
      style={{
        background: isMine ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.2)",
        border: isMine ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.07)",
        minWidth: 200,
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: isMine ? "rgba(255,255,255,0.15)" : "rgba(98,0,238,0.2)" }}
      >
        <FileText size={20} className={isMine ? "text-white/80" : "text-primary"} />
      </div>
      <div className="flex flex-col overflow-hidden flex-1 min-w-0">
        <span className="text-[13px] font-semibold truncate">{name || "File"}</span>
        <span className="text-[11px] opacity-50 uppercase tracking-wide">{ext}</span>
      </div>
      <Download size={16} className="opacity-0 group-hover/file:opacity-60 transition-opacity shrink-0" />
    </a>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const MessageItem = memo(({
  message,
  currentUserId,
  onRetry,
  onDelete,
  onReply,
  onEdit,
  onReact,
  onForward,
  onReveal,
  onOpenThread,
  showSenderName = false,
  bubbleStyle = "solid",
  isFirstInGroup = true,
  isLastInGroup = true,
  partnerNickname = null,
}: MessageItemProps) => {
  const [actionsVisible, setActionsVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [fullEmojiPickerOpen, setFullEmojiPickerOpen] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const styleParams = BUBBLE_STYLES.find(b => b.id === bubbleStyle) || BUBBLE_STYLES.find(b => b.id === "solid");
  const formatTime = (dateStr: string) => { try { return format(new Date(dateStr), "HH:mm"); } catch { return ""; } };
  const handleCopy = () => { navigator.clipboard.writeText(message.content); };
  const radii = getBorderRadius(message.is_mine, isFirstInGroup, isLastInGroup);

  const isSolo = message.type === "text" && isSoloEmoji(message.content);
  const isViewed = currentUserId ? (message.viewed_by || []).includes(currentUserId) : false;

  const bubbleStyle_inline: React.CSSProperties = {
    ...radii,
    backdropFilter: "blur(16px) saturate(160%)",
    WebkitBackdropFilter: "blur(16px) saturate(160%)",
  };

  if (!isSolo) {
    if (message.is_mine) {
      bubbleStyle_inline.background = styleParams?.sentBg || "linear-gradient(135deg, #6200EE, #4a00c0)";
      bubbleStyle_inline.border = "1px solid rgba(255,255,255,0.12)";
      bubbleStyle_inline.boxShadow = "0 4px 24px -4px rgba(98,0,238,0.35), inset 0 1px 0 rgba(255,255,255,0.18)";
    } else {
      bubbleStyle_inline.background = styleParams?.recvBg || "rgba(255,255,255,0.04)";
      bubbleStyle_inline.border = "1px solid rgba(255,255,255,0.07)";
      bubbleStyle_inline.boxShadow = "0 4px 20px -4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)";
    }
    if (message.status === "error") {
      bubbleStyle_inline.background = "rgba(239,68,68,0.08)";
      bubbleStyle_inline.border = "1px solid rgba(239,68,68,0.3)";
      bubbleStyle_inline.boxShadow = "none";
    }
  }

  const isActive = actionsVisible || menuOpen;

  // Long-press handlers for reactions
  const handlePointerDown = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setReactionPickerOpen(true);
    }, 500);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const handlePointerCancel = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  if (message.type === "system") {
    return (
      <div className="flex justify-center my-2 px-4">
        <span
          className="text-[11px] text-white/30 px-3 py-1 rounded-full"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      style={{ touchAction: "pan-y" }}
      className={clsx(
        "message-row group px-3",
        message.is_mine ? "self" : "other",
        isLastInGroup ? "mb-2" : "mb-0.5"
      )}
    >
      <div className={clsx(
        "flex flex-col max-w-full",
        message.is_mine ? "items-end" : "items-start"
      )}>
      {/* Sender name */}
      {!message.is_mine && showSenderName && isFirstInGroup && (
        <motion.span
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-[11px] font-semibold text-white/40 mb-1 ml-2 tracking-wide"
        >
          {partnerNickname || (message as any).sender?.display_name || (message as any).sender?.username || "Unknown"}
        </motion.span>
      )}

      {/* Reply reference */}
      {message.reply_to && (
        <div className={clsx(
          "flex flex-col px-3 py-1.5 mb-1 text-[12px] opacity-60 border-l-2 border-primary/50 bg-white/[0.03] rounded-xl max-w-[70%]",
          message.is_mine ? "mr-1 items-end" : "ml-1 items-start"
        )}>
          <span className="font-semibold text-[10px] text-primary/80 mb-0.5">{message.reply_to.sender_display}</span>
          <span className="truncate text-white/60">{message.reply_to.content}</span>
        </div>
      )}

      <div className={clsx("flex items-end gap-2 max-w-[88%]", message.is_mine ? "flex-row-reverse" : "flex-row")}>
        {/* Context Action Button */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 600, damping: 30 }}
            >
              <DropdownMenu.Root onOpenChange={setMenuOpen}>
                <DropdownMenu.Trigger asChild>
                  <button className="w-7 h-7 flex items-center justify-center rounded-full bg-white/[0.07] hover:bg-white/[0.12] text-white/40 hover:text-white transition-all border border-white/[0.07]">
                    <MoreHorizontal size={14} />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="z-[200] min-w-[168px] p-1.5 rounded-2xl outline-none"
                    style={{
                      background: "rgba(10, 10, 18, 0.95)",
                      backdropFilter: "blur(32px) saturate(200%)",
                      WebkitBackdropFilter: "blur(32px) saturate(200%)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: "0 16px 48px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
                    }}
                    align={message.is_mine ? "end" : "start"}
                    sideOffset={6}
                  >
                    <DropdownMenu.Item onClick={() => onReply?.(message)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.07] rounded-xl cursor-pointer outline-none transition-all">
                      <Reply size={15} className="text-white/40" /><span>Reply</span>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onClick={handleCopy} className="flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.07] rounded-xl cursor-pointer outline-none transition-all">
                      <Copy size={15} className="text-white/40" /><span>Copy</span>
                    </DropdownMenu.Item>
                    {message.is_mine && message.status !== "error" && (
                      <DropdownMenu.Item onClick={() => onEdit?.(message)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.07] rounded-xl cursor-pointer outline-none transition-all">
                        <Pencil size={15} className="text-white/40" /><span>Edit</span>
                      </DropdownMenu.Item>
                    )}
                    {/* Open Thread — only for root messages (not nested replies) */}
                    {!message.thread_root_id && (message.type as string) !== "system" && (
                      <DropdownMenu.Item
                        onClick={() => onOpenThread?.(message)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.07] rounded-xl cursor-pointer outline-none transition-all"
                      >
                        <MessageSquare size={15} className="text-primary/70" />
                        <span>Open Thread</span>
                        {(message.reply_count ?? 0) > 0 && (
                          <span className="ml-auto text-[10px] text-primary/60 font-bold">{message.reply_count}</span>
                        )}
                      </DropdownMenu.Item>
                    )}
                    <DropdownMenu.Separator className="h-px bg-white/[0.06] my-1" />
                    <DropdownMenu.Item onClick={() => onDelete?.(message.id)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/[0.1] hover:text-red-300 rounded-xl cursor-pointer outline-none transition-all">
                      <Trash2 size={15} /><span>Delete</span>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Bubble */}
        <div className="relative flex flex-col">
          <AnimatePresence>
            {reactionPickerOpen && (
              <ReactionPicker
                onSelect={(emoji) => onReact?.(message.id, emoji)}
                onClose={() => setReactionPickerOpen(false)}
                onOpenFull={() => {
                  setReactionPickerOpen(false);
                  setFullEmojiPickerOpen(true);
                }}
              />
            )}
          </AnimatePresence>

          {/* Full emoji picker overlay */}
          <EmojiPicker
            isOpen={fullEmojiPickerOpen}
            onClose={() => setFullEmojiPickerOpen(false)}
            onEmojiSelect={(emoji) => {
              onReact?.(message.id, emoji);
              setFullEmojiPickerOpen(false);
            }}
          />

          {/* Ghost Bubble (view-once) — replaces all other content */}
          {message.view_once && (
            <GhostBubble
              messageId={message.id}
              mediaUrl={message.media_url}
              type={message.type === "image" ? "image" : "file"}
              isMine={message.is_mine}
              isViewed={isViewed || (message.viewed_by?.length ?? 0) > 0}
              onReveal={(id) => onReveal?.(id)}
            />
          )}

          {/* Regular bubble (skip for view-once and location) */}
          {!message.view_once && message.type !== "location" && (<>
          {isSolo ? (
            <motion.div
              className="cursor-pointer select-none px-1 py-0.5"
              style={{ fontSize: 52, lineHeight: 1.1, touchAction: "pan-y" }}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              onClick={() => setActionsVisible(v => !v)}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            >
              {message.content}
            </motion.div>
          ) : (
            <motion.div
              whileTap={{ scale: 0.982 }}
              onClick={() => setActionsVisible(v => !v)}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              animate={(message.status === "error" || message.status === "failed") ? { x: [0, -5, 5, -5, 5, 0] } : {}}
              className={clsx("chat-bubble message-bubble relative overflow-hidden cursor-pointer select-none", message.is_mine ? "text-white" : "text-white/90")}
              style={{ ...bubbleStyle_inline, touchAction: "pan-y" }}
            >
              {/* ── Image ── */}
              {message.type === "image" && message.media_url && (
                <div className="flex flex-col gap-2">
                  <motion.img
                    src={message.media_url}
                    alt="Shared image"
                    className="rounded-xl max-h-[320px] w-full object-cover block"
                    style={{ minWidth: 180 }}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    onError={(e) => {
                      // If image fails, show download link fallback
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  {message.content && message.content !== message.file_name && (
                    <p className="text-sm mt-0.5">{message.content}</p>
                  )}
                </div>
              )}

              {/* ── Voice ── */}
              {message.type === "voice" && message.media_url && (
                <VoicePlayer
                  src={message.media_url}
                  isMine={message.is_mine}
                />
              )}

              {/* ── File ── */}
              {message.type === "file" && (
                <FileCard
                  url={message.media_url}
                  name={message.file_name}
                  mime={message.mime_type}
                  isMine={message.is_mine}
                />
              )}

              {/* ── Text ── */}
              {message.type === "text" && (
                <p className="whitespace-pre-wrap break-words leading-relaxed text-[15px]">
                  {message.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) => {
                    if (part.match(/^https?:\/\//)) {
                      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{part}</a>;
                    }
                    return part;
                  })}
                </p>
              )}

              {/* Footer: time + status */}
              <div className={clsx(
                "flex items-center gap-1.5 mt-1 select-none whitespace-nowrap shrink-0",
                message.is_mine ? "justify-end" : "justify-start"
              )}>
                {message.edited_at && (
                  <span className="text-[10px] opacity-40 italic">edited</span>
                )}
                <span className="text-[10px] opacity-40 tabular-nums">
                  {formatTime(message.sent_at)}
                </span>
                {message.is_mine && <StatusOrb status={message.status} onRetry={() => onRetry?.(message)} />}
              </div>
            </motion.div>
          )}

          {/* End of regular bubble wrapper */}
          </>)}

          {/* Location Bubble */}
          {message.type === "location" && message.location_lat != null && message.location_lng != null && (
            <LocationBubble
              lat={message.location_lat}
              lng={message.location_lng}
              address={message.location_address}
              isLive={message.location_live}
              expiresAt={message.location_expires_at}
              isMine={message.is_mine}
              sentAt={message.sent_at}
            />
          )}

          {/* Reactions row */}
          {message.reactions && message.reactions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={clsx(
                "flex flex-wrap gap-1 mt-1",
                message.is_mine ? "justify-end" : "justify-start"
              )}
            >
              {message.reactions.map(r => (
                <motion.button
                  key={r.emoji}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => onReact?.(message.id, r.emoji)}
                  className={clsx(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] transition-all",
                    r.reacted
                      ? "bg-primary/20 border border-primary/40"
                      : "bg-white/[0.06] border border-white/10"
                  )}
                >
                  {r.emoji}
                  {r.count > 1 && <span className="text-white/60 text-[11px]">{r.count}</span>}
                </motion.button>
              ))}
            </motion.div>
          )}
          {/* Thread reply count badge */}
          {(message.reply_count ?? 0) > 0 && !message.thread_root_id && (
            <motion.button
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onOpenThread?.(message)}
              className={clsx(
                "flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all hover:opacity-80",
                message.is_mine ? "self-end" : "self-start",
                "bg-primary/15 border border-primary/25 text-primary/80"
              )}
            >
              <MessageSquare size={11} />
              {message.reply_count} {message.reply_count === 1 ? "reply" : "replies"}
            </motion.button>
          )}
        </div>
      </div>
      </div>
    </motion.div>
  );
});

MessageItem.displayName = "MessageItem";
export default MessageItem;
