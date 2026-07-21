"use client";

/**
 * ConversationItem v3 — Emotional Interaction Design
 *
 * Interaction philosophy:
 *   - Hover = 80ms background reveal (instant feel, not sluggish)
 *   - Press = spring scale to 0.97 (tactile, not cheap)
 *   - Active bar = layoutId spring (cohesive, not jumpy)
 *   - Preload on pointerEnter (150ms debounce, prediction engine)
 *   - Online pulse = 2s ease, NOT 60fps strobe
 */

import { memo, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";
import Image from "next/image";
import TouchRipple from "@/components/ui/TouchRipple";
import { useAppStore } from "@/lib/store";

function formatTime(iso: string) {
  try { return format(new Date(iso), "HH:mm"); } catch { return ""; }
}

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
  joinCode?: string;
  theme_id?: string;
  theme_blur?: number;
  member_count?: number;
  partnerId?: string;
  presenceExpiresAt?: string | null;
  /** Per-user nickname — shown instead of name if set */
  nickname?: string;
  invisibleMode?: boolean;
}

interface ConversationItemProps {
  conv: DBConversation;
  active: boolean;
  onClick: () => void;
  onPreload?: (id: string) => void;
}

// Deterministic hue from name — stable across renders
function nameToHue(name: string): number {
  if (!name?.length) return 270;
  return (name.charCodeAt(0) * 47 + (name.charCodeAt(1) || 0) * 11) % 360;
}

const ConversationItem = memo(function ConversationItem({
  conv, active, onClick, onPreload,
}: ConversationItemProps) {
  const preloadTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentUser = useAppStore(state => state.currentUser);
  const hiddenWords = useMemo(() => {
    return currentUser?.metadata?.hidden_words || [];
  }, [currentUser?.metadata?.hidden_words]);

  const displayLastMessage = useMemo(() => {
    const msg = conv.lastMessage || "";
    if (!msg || hiddenWords.length === 0) return msg;
    
    let filtered = msg;
    for (const word of hiddenWords) {
      if (!word) continue;
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedWord, 'gi');
      filtered = filtered.replace(regex, '***');
    }
    return filtered;
  }, [conv.lastMessage, hiddenWords]);

  const handlePointerEnter = () => {
    if (active || !onPreload) return;
    preloadTimerRef.current = setTimeout(() => { onPreload(conv.id); }, 150);
  };
  const handlePointerLeave = () => {
    if (preloadTimerRef.current) { clearTimeout(preloadTimerRef.current); preloadTimerRef.current = null; }
  };

  const hue = nameToHue(conv.name || conv.username || "Unknown");

  return (
    <motion.button
      onClick={onClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      // Emotional spring: stiff enough to feel instant, damped enough to not bounce
      whileTap={{ scale: 0.975 }}
      transition={{ type: "spring", stiffness: 600, damping: 38 }}
      className={clsx(
        "w-full flex items-center gap-3.5 px-3.5 py-3 rounded-[18px] mx-2 group relative overflow-hidden text-left",
        // Transition only background and border — NOT transform (framer handles that)
        "transition-[background,border-color] duration-[80ms] ease-out",
        active
          ? "bg-white/[0.07] border border-white/[0.10]"
          : "border border-transparent hover:bg-white/[0.04] hover:border-white/[0.05]"
      )}
      style={
        active
          ? {
              // Use solid color instead of backdrop-filter: blur() — visually identical
              // on dark backgrounds, but eliminates GPU compositing cost per item
              boxShadow: "0 4px 24px -4px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
            }
          : undefined
      }
    >
      <TouchRipple color="rgba(255,255,255,0.10)" />

      {/* Active indicator — uses layoutId for cross-item shared animation */}
      {active && (
        <motion.div
          layoutId="conv-active-bar"
          className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-indigo-400"
          style={{ boxShadow: "0 0 10px rgba(99,102,241,0.6), 0 0 20px rgba(99,102,241,0.2)" }}
          transition={{ type: "spring", stiffness: 500, damping: 36 }}
        />
      )}

      {/* Avatar */}
      <div className="relative shrink-0 z-10">
        {conv.avatarUrl ? (
          <Image
            src={conv.avatarUrl}
            alt={conv.name}
            width={44}
            height={44}
            unoptimized
            loading="lazy"
            className={clsx(
              "w-11 h-11 rounded-full object-cover avatar",
              "transition-[box-shadow] duration-[80ms] ease-out",
              conv.isOnline
                ? "shadow-[0_0_0_2px_rgba(52,211,153,0.55),0_0_0_3px_rgba(0,0,0,0.5)]"
                : "shadow-[0_0_0_1px_rgba(255,255,255,0.07)]"
            )}
          />
        ) : (
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white/90 font-bold text-[17px]"
            style={{
              background: `linear-gradient(145deg, hsl(${hue}, 55%, 28%), hsl(${(hue + 40) % 360}, 45%, 18%))`,
              boxShadow: conv.isOnline
                ? "0 0 0 2px rgba(52,211,153,0.5), 0 0 0 3px rgba(0,0,0,0.5)"
                : "0 0 0 1px rgba(255,255,255,0.07)",
            }}
          >
            {conv.isGroup ? <Users size={18} strokeWidth={1.5} /> : (conv.name?.[0] || conv.username?.[0] || "?").toUpperCase()}
          </div>
        )}

        {/* Online dot — subtle pulse, not a strobe */}
        {conv.isOnline && (
          <motion.div
            className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full"
            style={{ border: "2px solid #050508", boxShadow: "0 0 6px rgba(52,211,153,0.5)" }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", times: [0, 0.5, 1] }}
          />
        )}
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex items-baseline justify-between mb-[3px]">
          <p className={clsx(
            "text-[14.5px] font-semibold truncate tracking-tight transition-colors duration-[80ms]",
            active ? "text-white" : "text-white/75 group-hover:text-white/90",
            conv.unread > 0 && "font-bold text-white/90",
          )}>
            {conv.nickname || conv.name}
          </p>
          <span className={clsx(
            "text-[11px] whitespace-nowrap ml-2 tabular-nums font-medium transition-colors duration-[80ms]",
            active ? "text-white/40" : "text-white/20 group-hover:text-white/30",
          )}>
            {formatTime(conv.updatedAt)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className={clsx(
            "text-[12.5px] truncate leading-tight transition-colors duration-[80ms]",
            active
              ? "text-white/45"
              : "text-white/30 group-hover:text-white/45",
            conv.unread > 0 && "text-white/50 font-medium",
          )}>
            {displayLastMessage || (conv.isGroup && conv.member_count
              ? `${conv.member_count} members`
              : "No messages yet")}
          </p>

          {/* Unread badge — scale-in on appear */}
          {conv.unread > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 550, damping: 26 }}
              className="min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-500 text-[10px] font-black text-white shrink-0 flex items-center justify-center"
              style={{ boxShadow: "0 0 10px rgba(99,102,241,0.45)" }}
            >
              {conv.unread > 99 ? "99+" : conv.unread}
            </motion.div>
          )}
        </div>
      </div>
    </motion.button>
  );
});

ConversationItem.displayName = "ConversationItem";
export default ConversationItem;
