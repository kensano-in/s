"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, AlertTriangle } from "lucide-react";

interface VoicePlayerProps {
  src: string;
  /** Pre-computed duration in seconds (from sender) */
  duration?: number;
  isMine?: boolean;
}

const BAR_COUNT = 28;

export default function VoicePlayer({ src, duration = 0, isMine = false }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1
  const [currentTime, setCurrentTime] = useState(0);
  const [actualDuration, setActualDuration] = useState(duration);
  const [loadFailed, setLoadFailed] = useState(false);
  const animFrameRef = useRef<number | null>(null);

  // Pseudo-random waveform heights (stable per src)
  const bars = useRef<number[]>(
    Array.from({ length: BAR_COUNT }, (_, i) => {
      const seed = src.charCodeAt(i % src.length) + i * 17;
      return 0.2 + (Math.abs(Math.sin(seed)) * 0.8);
    })
  );

  useEffect(() => {
    // Reset failure state when src changes
    setLoadFailed(false);
    setPlaying(false);
    setProgress(0);
    setCurrentTime(0);

    const audio = new Audio(src);
    audioRef.current = audio;
    // UI-06: Track mount state so we don't set state on unmounted component
    let mounted = true;
    audio.onloadedmetadata = () => {
      if (mounted && audio.duration && isFinite(audio.duration)) {
        setActualDuration(Math.ceil(audio.duration));
      }
    };
    audio.onended = () => {
      if (!mounted) return;
      setPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
    audio.onerror = () => {
      if (!mounted) return;
      // FIX-VOICE-6: Downgraded from console.error → console.warn so Next.js
      // dev overlay doesn't surface this as a blocking error panel.
      // Root cause when src is data:... = old base64 fallback wrote a truncated
      // data URI into the DB; those messages are now permanently unplayable.
      const srcDisplay = src.startsWith("data:")
        ? `data:... (${src.length} chars — likely base64 overflow from old upload fallback)`
        : src;
      console.warn("[VoicePlayer] Audio load failed:", {
        src: srcDisplay,
        errorCode: audio.error?.code,
        networkState: audio.networkState,  // 0=EMPTY 1=IDLE 2=LOADING 3=NO_SOURCE
        readyState: audio.readyState,       // 0=NOTHING 1=METADATA 2=CURRENT 3=ENOUGH
      });
      setLoadFailed(true);
      setPlaying(false);
    };
    return () => {
      mounted = false;
      audio.pause();
      audio.src = "";
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        // UI-06: Null out ref so stale tick() callback won't re-schedule
        animFrameRef.current = null;
      }
    };
  }, [src]);

  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setCurrentTime(audio.currentTime);
    setProgress(audio.currentTime / audio.duration);
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || loadFailed) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    } else {
      if (audio.ended) {
        audio.currentTime = 0;
        setProgress(0);
      }
      audio.play().then(() => {
        setPlaying(true);
        animFrameRef.current = requestAnimationFrame(tick);
      }).catch(err => {
        console.warn("[VoicePlayer] Playback failed:", err.message);
        setLoadFailed(true);
        setPlaying(false);
      });
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  // ── Degraded state: corrupted or unloadable audio ──────────────────────────
  // Renders for messages that have a broken/truncated base64 data URI as media_url.
  // These were created by the old upload fallback (now removed). The message is
  // permanently unplayable; we show a clear "unavailable" indicator instead of
  // a broken silent player.
  if (loadFailed) {
    return (
      <div className="flex items-center gap-2.5 min-w-[200px] max-w-[260px] py-2 px-3 rounded-2xl select-none"
        style={{
          background: isMine ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.15)",
          border: "1px solid rgba(255,100,100,0.2)",
        }}
      >
        <AlertTriangle size={14} className="text-rose-400/70 shrink-0" />
        <span className="text-[12px] text-white/40 italic">Voice note unavailable</span>
      </div>
    );
  }

  const progressBars = Math.round(progress * BAR_COUNT);
  const accentColor = isMine ? "rgba(255,255,255,0.9)" : "rgba(98,0,238,0.9)";
  const dimColor = isMine ? "rgba(255,255,255,0.25)" : "rgba(98,0,238,0.25)";

  return (
    <div className="flex items-center gap-3 min-w-[200px] max-w-[260px] py-1 select-none">
      {/* Circular Play/Pause */}
      <motion.button
        onClick={togglePlay}
        whileTap={{ scale: 0.88 }}
        transition={{ type: "spring", stiffness: 700, damping: 30 }}
        className="relative w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
        style={{
          background: isMine
            ? "rgba(255,255,255,0.18)"
            : "rgba(98,0,238,0.18)",
          border: isMine
            ? "1px solid rgba(255,255,255,0.25)"
            : "1px solid rgba(98,0,238,0.35)",
        }}
      >
        {/* Ripple on play */}
        <AnimatePresence>
          {playing && (
            <motion.div
              key="ripple"
              initial={{ scale: 0, opacity: 0.6 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 rounded-full"
              style={{
                background: isMine
                  ? "rgba(255,255,255,0.3)"
                  : "rgba(98,0,238,0.3)",
              }}
            />
          )}
        </AnimatePresence>
        {playing ? (
          <Pause size={16} className={isMine ? "text-white" : "text-primary"} />
        ) : (
          <Play size={16} className={`ml-0.5 ${isMine ? "text-white" : "text-primary"}`} />
        )}
      </motion.button>

      {/* Waveform bars — click to seek */}
      <div
        className="flex items-center gap-[2px] flex-1 h-8 cursor-pointer"
        onClick={(e) => {
          const audio = audioRef.current;
          if (!audio || !audio.duration || loadFailed) return;
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          const clampedRatio = Math.max(0, Math.min(1, ratio));
          audio.currentTime = clampedRatio * audio.duration;
          setProgress(clampedRatio);
          setCurrentTime(clampedRatio * audio.duration);
          // Start playing if not already
          if (!playing) {
            audio.play().then(() => {
              setPlaying(true);
              animFrameRef.current = requestAnimationFrame(tick);
            }).catch(err => {
              console.warn("Playback seek failed:", err.message);
              setLoadFailed(true);
              setPlaying(false);
            });
          }
        }}
      >
        {bars.current.map((h, i) => {
          const isPlayed = i < progressBars;
          const isActive = playing && Math.abs(i - progressBars) <= 2;
          return (
            <motion.div
              key={i}
              animate={{
                height: isActive
                  ? `${Math.max(h * 100, 40)}%`
                  : `${h * 70}%`,
                opacity: isPlayed ? 1 : 0.45,
              }}
              transition={{ duration: 0.08, ease: "easeOut" }}
              className="rounded-full flex-1 min-w-[2px]"
              style={{
                background: isPlayed ? accentColor : dimColor,
              }}
            />
          );
        })}
      </div>

      {/* Duration */}
      <span
        className="text-[11px] font-mono tabular-nums shrink-0 opacity-80"
        style={{ color: "rgba(255,255,255,0.9)" }}
      >
        {playing ? formatTime(currentTime) : formatTime(actualDuration)}
      </span>
    </div>
  );
}
