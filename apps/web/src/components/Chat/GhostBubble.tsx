"use client";

/**
 * GhostBubble — View-Once (Ghost) Message Component
 * The message reveals itself on tap, then self-destructs after 5 seconds.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Ghost } from "lucide-react";
import clsx from "clsx";

interface GhostBubbleProps {
  messageId: string;
  mediaUrl?: string;
  type: "image" | "file";
  isMine: boolean;
  isViewed: boolean;
  onReveal: (messageId: string) => void; // calls markViewedDB
}

export default function GhostBubble({
  messageId,
  mediaUrl,
  type,
  isMine,
  isViewed,
  onReveal,
}: GhostBubbleProps) {
  const [revealed, setRevealed] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [shattered, setShattered] = useState(isViewed);

  useEffect(() => {
    if (!revealed) return;
    // Start 5-second countdown then shatter
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setShattered(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [revealed]);

  const handleReveal = () => {
    if (revealed || shattered || isViewed) return;
    setRevealed(true);
    onReveal(messageId);
  };

  // Already viewed / shattered state
  if (shattered || isViewed) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        className={clsx(
          "flex items-center gap-2 px-4 py-3 rounded-2xl text-sm opacity-40 select-none",
          isMine ? "bg-white/10" : "bg-white/5"
        )}
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <Ghost size={14} />
        <span>{isMine ? "Opened by recipient" : "You opened this"}</span>
      </motion.div>
    );
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {!revealed ? (
          // ── Unrevealed: blurred ghost ─────────────────────────────────
          <motion.button
            key="ghost"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            onClick={handleReveal}
            className="relative overflow-hidden rounded-2xl cursor-pointer group"
            style={{
              width: 220,
              height: 160,
              background: isMine
                ? "linear-gradient(135deg, rgba(98,0,238,0.6), rgba(74,0,192,0.4))"
                : "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 0 40px rgba(98,0,238,0.3), inset 0 0 40px rgba(98,0,238,0.1)",
            }}
          >
            {/* Ghost shimmer overlay */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background:
                  "repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.05) 8px, rgba(255,255,255,0.05) 9px)",
              }}
            />

            {/* Pulsing center icon */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(98,0,238,0.3)",
                  border: "1px solid rgba(98,0,238,0.6)",
                  boxShadow: "0 0 24px rgba(98,0,238,0.5)",
                }}
              >
                <Eye size={22} className="text-white" />
              </motion.div>
              <span className="text-[11px] text-white/60 font-medium tracking-wide">
                Tap to reveal
              </span>
              <span className="text-[10px] text-white/30">
                {type === "image" ? "📷 Photo" : "📎 File"} · View once
              </span>
            </div>

            {/* Hover glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "rgba(98,0,238,0.1)" }}
            />
          </motion.button>
        ) : (
          // ── Revealed: show media with countdown ───────────────────────
          <motion.div
            key="revealed"
            initial={{ opacity: 0, scale: 0.95, filter: "blur(20px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{
              opacity: 0,
              scale: [1, 1.05, 0.3],
              filter: "blur(30px)",
              transition: { duration: 0.6 }
            }}
            className="relative rounded-2xl overflow-hidden"
          >
            {type === "image" && mediaUrl && (
              <img
                src={mediaUrl}
                alt="View-once"
                className="max-h-[300px] max-w-[280px] object-cover rounded-2xl"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
              />
            )}

            {/* Countdown overlay */}
            <div
              className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold"
              style={{
                background: "rgba(0,0,0,0.7)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,60,60,0.4)",
                color: countdown <= 2 ? "#ff4444" : "#ffffff",
              }}
            >
              <EyeOff size={11} />
              {countdown}s
            </div>

            {/* Progress bar */}
            <motion.div
              className="absolute bottom-0 left-0 h-[3px] rounded-full"
              style={{ background: "rgba(98,0,238,0.8)" }}
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 5, ease: "linear" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
