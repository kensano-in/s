"use client";

/**
 * ConversationItem — Axiom 7: Prediction Engine
 * On pointerEnter (hover/touch), preload messages for the conversation
 * with a 150ms debounce. Rebuilt with Liquid Glass design language.
 */

import { useRef } from "react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";

export interface DBConversation {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  lastMessage: string;
  updatedAt: string;
  unread: number;
  isOnline: boolean;
  isGroup: boolean;
  isTyping?: boolean;
  /** Group invite code */
  joinCode?: string;
  /** Optional group theme fields synced from DB */
  theme_id?: string;
  theme_blur?: number;
  /** Group member count */
  member_count?: number;
}

interface ConversationItemProps {
  conv: DBConversation;
  active: boolean;
  onClick: () => void;
  onPreload?: (id: string) => void;
}

export default function ConversationItem({ conv, active, onClick, onPreload }: ConversationItemProps) {
  const preloadTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePointerEnter = () => {
    if (active || !onPreload) return;
    preloadTimerRef.current = setTimeout(() => { onPreload(conv.id); }, 150);
  };

  const handlePointerLeave = () => {
    if (preloadTimerRef.current) {
      clearTimeout(preloadTimerRef.current);
      preloadTimerRef.current = null;
    }
  };

  const formatTime = (iso: string) => {
    try { return format(new Date(iso), "HH:mm"); } catch { return ""; }
  };

  return (
    <motion.button
      onClick={onClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      whileHover={{ scale: 1.01, x: 2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      className={clsx(
        "w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl mx-2 transition-all duration-200 group relative overflow-hidden",
        "text-left",
        active
          ? "bg-white/[0.08] shadow-lg border border-white/[0.12]"
          : "border border-transparent hover:bg-white/[0.04] hover:border-white/[0.06]"
      )}
      style={{
        backdropFilter: active ? "blur(20px)" : undefined,
        WebkitBackdropFilter: active ? "blur(20px)" : undefined,
        boxShadow: active
          ? "0 4px 24px rgba(98,0,238,0.15), inset 0 1px 1px rgba(255,255,255,0.08)"
          : undefined,
      }}
    >
      {/* Active left accent bar */}
      {active && (
        <motion.div
          layoutId="conv-active-bar"
          className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full bg-primary shadow-[0_0_12px_rgba(98,0,238,0.8)]"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}

      {/* Avatar */}
      <div className="relative shrink-0">
        {conv.avatarUrl ? (
          <img
            src={conv.avatarUrl}
            alt={conv.name}
            className={clsx(
              "w-12 h-12 rounded-full object-cover transition-all duration-300",
              conv.isOnline ? "ring-2 ring-emerald-500/60 ring-offset-1 ring-offset-transparent" : "ring-1 ring-white/10"
            )}
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{
              // UI-03: Guard against empty name to avoid charCodeAt crash
              background: conv.name?.length > 0
                ? `linear-gradient(135deg, hsl(${conv.name.charCodeAt(0) * 5}, 70%, 30%), hsl(${conv.name.charCodeAt(0) * 5 + 60}, 60%, 20%))`
                : `linear-gradient(135deg, hsl(270, 70%, 30%), hsl(330, 60%, 20%))`,
              boxShadow: "inset 0 1px 1px rgba(255,255,255,0.15)",
            }}
          >
            {conv.isGroup ? <Users size={20} /> : conv.name[0]?.toUpperCase()}
          </div>
        )}
        {conv.isOnline && (
          <motion.div
            className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-background rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className={clsx(
            "text-[15px] font-semibold truncate transition-colors",
            active ? "text-white" : "text-white/80 group-hover:text-white",
            conv.unread > 0 && "font-bold"
          )}>
            {conv.name}
          </p>
          <span className="text-[11px] text-white/25 whitespace-nowrap ml-2 tabular-nums">
            {formatTime(conv.updatedAt)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className={clsx(
            "text-[13px] truncate leading-tight transition-colors",
            conv.isTyping ? "text-primary font-medium italic" : "text-white/35 group-hover:text-white/50"
          )}>
          {conv.isTyping ? "typing..." : (conv.lastMessage || (conv.isGroup && conv.member_count ? `${conv.member_count} members` : "No messages yet"))}
          </p>
          {conv.unread > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-[10px] font-black text-white shrink-0 flex items-center justify-center shadow-[0_0_12px_rgba(98,0,238,0.5)]"
            >
              {conv.unread > 99 ? "99+" : conv.unread}
            </motion.div>
          )}
        </div>
      </div>
    </motion.button>
  );
}
