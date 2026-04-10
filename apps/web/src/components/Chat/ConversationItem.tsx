"use client";

/**
 * ConversationItem — Axiom 7: Prediction Engine
 * On pointerEnter (hover/touch), preload messages for the conversation
 * with a 150ms debounce. By the time the user clicks, messages are already
 * in-flight, making the switch feel instant.
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
  /** Optional group theme fields synced from DB */
  theme_id?: string;
  theme_blur?: number;
}

interface ConversationItemProps {
  conv: DBConversation;
  active: boolean;
  onClick: () => void;
  /** Axiom 7: called 150ms after hover to preload messages before click */
  onPreload?: (id: string) => void;
}

export default function ConversationItem({ conv, active, onClick, onPreload }: ConversationItemProps) {
  const preloadTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePointerEnter = () => {
    if (active || !onPreload) return;
    preloadTimerRef.current = setTimeout(() => {
      onPreload(conv.id);
    }, 150);
  };

  const handlePointerLeave = () => {
    if (preloadTimerRef.current) {
      clearTimeout(preloadTimerRef.current);
      preloadTimerRef.current = null;
    }
  };

  const formatTime = (iso: string) => {
    try {
      return format(new Date(iso), "HH:mm");
    } catch {
      return "";
    }
  };

  return (
    <button
      onClick={onClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={clsx(
        "w-full flex items-center gap-3.5 p-4 transition-all duration-200 group border-l-2",
        active 
          ? "bg-surface-elevated border-primary" 
          : "border-transparent hover:bg-surface/50"
      )}
    >
      <div className="relative shrink-0">
        {conv.avatarUrl ? (
          <img
            src={conv.avatarUrl}
            alt={conv.name}
            className="w-12 h-12 rounded-full object-cover border border-white/5"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-surface-border flex items-center justify-center text-foreground-muted">
            {conv.isGroup ? <Users size={20} /> : <span className="text-xl font-bold">{conv.name[0]}</span>}
          </div>
        )}
        {conv.isOnline && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-background rounded-full" />
        )}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-0.5">
          <p className={clsx(
            "text-[15px] font-bold truncate transition-colors",
            active ? "text-white" : "text-foreground group-hover:text-white"
          )}>
            {conv.name}
          </p>
          <span className="text-[10px] text-foreground-muted whitespace-nowrap ml-2">
            {formatTime(conv.updatedAt)}
          </span>
        </div>
        
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] text-foreground-muted truncate leading-tight group-hover:text-foreground/60 transition-colors">
            {conv.lastMessage || "No messages yet"}
          </p>
          {conv.unread > 0 && (
            <div className="px-2 py-0.5 rounded-full bg-primary text-[10px] font-black text-white shrink-0">
              {conv.unread}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
