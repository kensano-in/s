"use client";

import { motion, AnimatePresence } from "framer-motion";
import { memo, useState } from "react";
import { SPRING } from "@/lib/motion";
import { 
  Check, 
  CheckCheck, 
  Loader2, 
  AlertCircle, 
  Reply, 
  Pencil, 
  Trash2, 
  MoreHorizontal,
  Forward,
  Copy,
  Flag
} from "lucide-react";
import { format } from "date-fns";
import clsx from "clsx";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { BUBBLE_STYLES } from "./ChatSettingsModal";

export type MessageStatus = "sending" | "sent" | "delivered" | "seen" | "error";
export type MessageType = "text" | "image" | "voice" | "file" | "system";

export interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  sent_at: string;
  is_mine: boolean;
  status: MessageStatus;
  type: MessageType;
  media_url?: string;
  file_name?: string;
  mime_type?: string;
  reply_to?: { id: string; content: string; sender_display?: string } | null;
  edited_at?: string | null;
  reactions?: { emoji: string; count: number; reacted: boolean }[];
  client_temp_id?: string | null;
}

interface MessageItemProps {
  message: ChatMessage;
  onRetry?: (message: ChatMessage) => void;
  onDelete?: (id: string) => void;
  onReply?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onForward?: (message: ChatMessage) => void;
  showSenderName?: boolean;
  bubbleStyle?: string;
}

const MessageItem = memo(({
  message,
  onRetry,
  onDelete,
  onReply,
  onEdit,
  onReact,
  onForward,
  showSenderName = false,
  bubbleStyle = "solid"
}: MessageItemProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const styleParams = BUBBLE_STYLES.find(b => b.id === bubbleStyle) || BUBBLE_STYLES.find(b => b.id === 'solid');

  const formatTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "HH:mm");
    } catch {
      return "";
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SPRING.primary}
      className={clsx(
        "flex flex-col w-full mb-1 group px-4",
        message.is_mine ? "items-end" : "items-start"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Sender Name for Groups */}
      {!message.is_mine && showSenderName && (
        <span className="text-[11px] font-bold text-foreground-muted mb-1 ml-1 uppercase tracking-wider">
          {(message as any).sender?.display_name || (message as any).sender?.username || "Unknown"}
        </span>
      )}

      {/* Reply Reference */}
      {message.reply_to && (
        <motion.div layout className={clsx(
          "flex flex-col px-3 py-1 mb-[-8px] text-[12px] opacity-60 border-l-2 border-primary/40 bg-surface rounded-t-lg max-w-[70%]",
          message.is_mine ? "mr-1 items-end" : "ml-1 items-start"
        )}>
          <span className="font-bold text-[10px]">{message.reply_to.sender_display}</span>
          <span className="truncate">{message.reply_to.content}</span>
        </motion.div>
      )}

      <div className={clsx("flex items-end gap-2 max-w-[85%]", message.is_mine ? "flex-row-reverse" : "flex-row")}>
        {/* Main Bubble */}
        <motion.div 
          layout
          whileTap={{ scale: 0.98 }}
          animate={message.status === "error" ? { x: [0, -4, 4, -4, 4, 0] } : {}}
          transition={SPRING.micro}
          className={clsx(
            "chat-bubble transition-all relative overflow-hidden",
            message.is_mine ? "chat-blue text-white shadow-glow-primary rounded-[20px] rounded-br-[4px]" : "chat-bubble-received lux-shadow rounded-[20px] rounded-bl-[4px]",
            message.status === "error" && "border-red-500/50 border bg-red-500/10"
          )}
          style={{
            background: message.is_mine ? styleParams?.sentBg : styleParams?.recvBg,
            border: `1px solid ${message.is_mine ? styleParams?.sentBorder : "transparent"}`,
            backdropFilter: styleParams?.filter !== "none" ? styleParams?.filter : undefined,
            WebkitBackdropFilter: styleParams?.filter !== "none" ? styleParams?.filter : undefined,
            boxShadow: message.is_mine && styleParams?.neonShadow ? styleParams.neonShadow : undefined,
          }}
        >
          {/* Content Renderers */}
          {message.type === "image" && message.media_url ? (
            <div className="flex flex-col gap-2">
              <img 
                src={message.media_url} 
                alt="Shared media" 
                className="rounded-lg max-h-[400px] w-full object-cover transition-opacity duration-300"
                onLoad={(e) => (e.currentTarget.style.opacity = "1")}
                style={{ opacity: 0 }}
              />
              {message.content && <p className="mt-1">{message.content}</p>}
            </div>
          ) : message.type === "voice" && message.media_url ? (
            <div className="flex flex-col min-w-[200px] p-1">
              <audio 
                controls 
                src={message.media_url} 
                className="w-full h-10 outline-none"
              />
            </div>
          ) : message.type === "file" ? (
            <a 
              href={message.media_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-2 bg-black/20 rounded-lg hover:bg-black/30 transition-colors"
            >
              <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center">
                <Forward size={20} className="text-primary" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold truncate">{message.file_name}</span>
                <span className="text-[10px] opacity-60 uppercase">{message.mime_type?.split('/')[1] || 'file'}</span>
              </div>
            </a>
          ) : (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}

          {/* Bottom Row: Time + Status */}
          <div className={clsx(
            "flex items-center gap-1.5 mt-1.5 text-[10px]",
            message.is_mine ? "text-white/70 justify-end" : "text-white/40 justify-start"
          )}>
            {message.edited_at && <span className="italic opacity-60">edited</span>}
            <span>{formatTime(message.sent_at)}</span>
            {message.is_mine && (
              <div className="flex items-center overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={message.status}
                    initial={{ scale: 0.5, opacity: 0, y: 5 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={SPRING.micro}
                  >
                    {message.status === "sending" ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : message.status === "error" ? (
                      <AlertCircle size={10} className="text-red-300" />
                    ) : message.status === "seen" ? (
                      <CheckCheck size={12} className="text-white drop-shadow-md" />
                    ) : message.status === "delivered" ? (
                      <CheckCheck size={12} className="text-white/60" />
                    ) : (
                      <Check size={12} className="text-white/40" />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>

        {/* Message Actions Trigger (Only on hover, mobile touch handles differently) */}
        <div className={clsx(
          "transition-opacity duration-200",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-foreground-muted">
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenu.Trigger>
            
            <DropdownMenu.Portal>
              <DropdownMenu.Content 
                className="z-[100] min-w-[160px] bg-[#121212] border border-[#262626] rounded-xl p-1 lux-shadow animate-fade-in"
                align={message.is_mine ? "end" : "start"}
              >
                <DropdownMenu.Item 
                  onClick={() => onReply?.(message)}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-white/80 hover:bg-white/5 rounded-lg cursor-pointer outline-none transition-colors"
                >
                  <Reply size={16} />
                  Reply
                </DropdownMenu.Item>
                
                <DropdownMenu.Item 
                  onClick={handleCopy}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-white/80 hover:bg-white/5 rounded-lg cursor-pointer outline-none transition-colors"
                >
                  <Copy size={16} />
                  Copy Text
                </DropdownMenu.Item>

                {message.is_mine && message.status !== "error" && (
                  <DropdownMenu.Item 
                    onClick={() => onEdit?.(message)}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-white/80 hover:bg-white/5 rounded-lg cursor-pointer outline-none transition-colors"
                  >
                    <Pencil size={16} />
                    Edit
                  </DropdownMenu.Item>
                )}

                <DropdownMenu.Separator className="h-px bg-[#262626] my-1" />

                <DropdownMenu.Item 
                  onClick={() => onDelete?.(message.id)}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer outline-none transition-colors"
                >
                  <Trash2 size={16} />
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {/* Error Retry Logic */}
      {message.status === "error" && message.is_mine && (
        <button 
          onClick={() => onRetry?.(message)}
          className="mt-1 flex items-center gap-1 text-[10px] text-red-500 font-bold hover:underline"
        >
          <AlertCircle size={10} />
          Failed to send. Click to retry.
        </button>
      )}
    </motion.div>
  );
});

MessageItem.displayName = "MessageItem";

export default MessageItem;
