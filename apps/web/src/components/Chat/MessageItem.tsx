"use client";

import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { memo, useState, useRef, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle, Reply, Pencil, Trash2, MoreHorizontal, Forward,
  Copy, Download, FileText, MessageSquare, Check, CheckCheck,
  Clock, RefreshCw, Maximize2, X, ExternalLink, Smile, Pin, Star,
  Volume2, Languages, Loader2, Sparkles, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, Lock, Phone, PhoneOff, Video,
} from "lucide-react";
import { format } from "date-fns";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { BUBBLE_STYLES } from "./ChatSettingsModal";
import VoicePlayer from "./VoicePlayer";
import GhostBubble from "./GhostBubble";
import LocationBubble from "./LocationBubble";
import EmojiPicker from "./EmojiPicker";

function formatTime(dateStr: string): string {
  try { return format(new Date(dateStr), "HH:mm"); } catch { return ""; }
}
import { useAppStore } from "@/lib/store";

function DisappearingTimer({ expiresAt, messageId, conversationId }: { expiresAt: string; messageId?: string; conversationId?: string }) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const removeMessage = useAppStore(state => state.removeMessage);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(expiresAt).getTime() - Date.now();
      if (difference <= 0) {
        if (conversationId && messageId) {
          removeMessage(conversationId, messageId);
        }
        return "Expired";
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, messageId, conversationId, removeMessage]);

  if (!timeLeft || timeLeft === "Expired") return null;

  return (
    <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-white/30 px-2 select-none">
      <Clock size={10} className="text-white/30 animate-pulse" />
      <span>{timeLeft} left</span>
    </div>
  );
}


const isFilename = (str: string): boolean => {
  return /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]{2,5}$/.test(str) || /\.(png|jpg|jpeg|gif|webp|mp4|mov|avi|webm)$/i.test(str);
};

interface PremiumVideoPlayerProps {
  src: string;
}

function PremiumVideoPlayer({ src }: PremiumVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
    }
  };

  const toggleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    let nextRate = 1;
    if (playbackRate === 1) nextRate = 1.5;
    else if (playbackRate === 1.5) nextRate = 2;
    else nextRate = 1;

    video.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      container.requestFullscreen().catch(() => {});
    }
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    video.currentTime = percentage * duration;
    setCurrentTime(percentage * duration);
  };

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  const formatVideoTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={togglePlay}
      className="relative group/player w-[200px] sm:w-[280px] h-[160px] sm:h-[190px] overflow-hidden bg-transparent cursor-pointer flex items-center justify-center"
      style={{ borderRadius: "inherit" }}
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        className="w-full h-full object-cover block"
      />

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none z-10">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      )}

      {/* Big Center Play Button Overlay */}
      {(!isPlaying || showControls) && !isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-10 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 flex items-center justify-center text-white scale-100 hover:scale-105 active:scale-95 transition-all">
            {isPlaying ? (
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-2.5 flex flex-col gap-2 z-20 pointer-events-auto"
          >
            {/* Timeline progress bar */}
            <div 
              onClick={handleScrub}
              className="relative w-full h-1.5 bg-white/20 rounded-full cursor-pointer hover:h-2 transition-all flex items-center"
            >
              <div 
                className="h-full bg-indigo-500 rounded-full relative"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow scale-0 hover:scale-100 group-hover/player:scale-100 transition-transform" />
              </div>
            </div>

            {/* Icons row */}
            <div className="flex items-center justify-between text-white/90 text-xs">
              <div className="flex items-center gap-3">
                <button onClick={togglePlay} className="hover:text-indigo-400 transition-colors">
                  {isPlaying ? (
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                <span className="font-medium font-mono text-[10px] text-white/70 select-none">
                  {formatVideoTime(currentTime)} / {formatVideoTime(duration || 0)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={toggleSpeed} 
                  className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 hover:text-indigo-400 transition-all font-mono text-[9px] font-black uppercase tracking-wider"
                  title="Playback Speed"
                >
                  {playbackRate}x
                </button>

                <button onClick={toggleFullscreen} className="hover:text-indigo-400 transition-colors">
                  <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 20.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


const formatReplyContent = (content: string, type?: string): string => {
  if (type === 'image') return "📷 Photo";
  if (type === 'video') return "🎥 Video";
  if (type === 'voice') return "🎤 Voice message";
  if (type === 'file') return "📁 File";

  if (isFilename(content)) {
    const ext = content.split('.').pop()?.toLowerCase();
    if (ext && ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
      return "📷 Photo";
    }
    if (ext && ['mp4', 'mov', 'webm', 'avi'].includes(ext)) {
      if (content.startsWith('voice')) return "🎤 Voice message";
      return "🎥 Video";
    }
    return "📁 File";
  }

  if (content.startsWith('voice_')) return "🎤 Voice message";

  return content;
};

export type MessageStatus = "pending" | "local_sending" | "sending" | "sent" | "delivered" | "seen" | "error" | "failed";
export type MessageType = "text" | "image" | "voice" | "file" | "system" | "location" | "video" | "media_group" | "call_log";

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
  sender_display?: string;
  file_name?: string;
  mime_type?: string;
  reply_to?: { id: string; content: string; sender_display?: string; type?: string } | null;
  reply_to_id?: string | null;
  media_group_id?: string | null;
  edited_at?: string | null;
  reactions?: { emoji: string; count: number; reacted: boolean; userIds?: string[] }[];
  client_temp_id?: string | null;
  whisper_to_id?: string | null;
  view_once?: boolean;
  is_ghost?: boolean;
  is_viewed?: boolean;
  viewed_by?: string[];
  is_pinned?: boolean;
  is_starred?: boolean;
  sender?: { display_name?: string | null; username?: string; avatar_url?: string | null } | null;
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  location_live?: boolean;
  location_expires_at?: string;
  thread_root_id?: string | null;
  reply_count?: number;
  messages?: ChatMessage[];
  metadata?: {
    forwarded?: boolean;
    forwarded_from?: string;
    deleted_for_users?: string[];
    location_exact?: boolean;
  } | null;

}

interface MessageItemProps {
  message: ChatMessage;
  currentUserId?: string;
  onRetry?: (message: ChatMessage) => void;
  onDelete?: (id: string) => void;
  onDeleteForMe?: (id: string) => void;
  canDeleteOthers?: boolean;
  onReply?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onForward?: (message: ChatMessage) => void;
  onPin?: (message: ChatMessage) => void;
  onStar?: (message: ChatMessage) => void;
  onReveal?: (messageId: string) => void;
  onOpenThread?: (message: ChatMessage) => void;
  showSenderName?: boolean;
  bubbleStyle?: string;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  partnerNickname?: string | null;
  activeMenuMessageId?: string | null;
  setActiveMenuMessageId?: (id: string | null) => void;
  chatContext?: { type: 'community' | 'group' | 'dm'; name: string };
  chatMembers?: { id: string; display_name: string; username?: string; avatar_url?: string; nickname?: string | null }[];
  isLastOwnMessage?: boolean;
  viewers?: { id: string; display_name: string; username?: string; avatar_url?: string }[];
  onCancelUpload?: (clientTempId: string) => void;
}

const speakText = (text: string, langCode: string, speed = 1.0, voiceURI?: string) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  
  if (langCode === 'hi') {
    utterance.lang = 'hi-IN';
  } else if (langCode === 'en') {
    utterance.lang = 'en-US';
  } else {
    utterance.lang = langCode;
  }
  
  const voices = window.speechSynthesis.getVoices();
  let voice: SpeechSynthesisVoice | undefined;
  if (voiceURI) {
    voice = voices.find(v => v.voiceURI === voiceURI);
  }
  if (!voice) {
    voice = voices.find(v => v.lang.toLowerCase() === utterance.lang.toLowerCase());
  }
  if (!voice) {
    voice = voices.find(v => v.lang.toLowerCase().startsWith(langCode.toLowerCase()));
  }
  if (voice) {
    utterance.voice = voice;
  }
  
  utterance.rate = speed;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
};

const translateText = async (text: string, targetLang = 'en') => {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text, targetLang })
  });
  if (!res.ok) {
    throw new Error('Translation request failed');
  }
  const json = await res.json();
  return {
    translated: json.translated,
    detectedSrcLang: json.detectedSrcLang,
    transliteration: json.transliteration,
    explanation: json.explanation,
    variants: json.variants
  };
};

const getTranslation = async (text: string) => {
  const firstPass = await translateText(text, 'en');
  if (firstPass.detectedSrcLang === 'en') {
    const secondPass = await translateText(text, 'hi');
    return {
      original: text,
      translated: secondPass.translated,
      srcLang: 'en',
      targetLang: 'hi',
      transliteration: secondPass.transliteration,
      explanation: secondPass.explanation,
      variants: secondPass.variants
    };
  }
  return {
    original: text,
    translated: firstPass.translated,
    srcLang: firstPass.detectedSrcLang,
    targetLang: 'en',
    transliteration: firstPass.transliteration,
    explanation: firstPass.explanation,
    variants: firstPass.variants
  };
};

const LANG_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  es: "Spanish",
  ja: "Japanese",
  fr: "French",
  de: "German",
  zh: "Chinese",
  ru: "Russian",
  it: "Italian",
  ko: "Korean",
  pt: "Portuguese",
  ar: "Arabic"
};
const getLangName = (code: string) => LANG_NAMES[code] || code.toUpperCase();

interface TranslationData {
  original: string;
  translated: string;
  srcLang: string;
  targetLang: string;
  transliteration?: string;
  explanation?: string;
  variants?: {
    professional: string;
    casual: string;
    slang: string;
  } | null;
}

interface TranslateModalProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
}

function TranslateModal({ isOpen, onClose, text }: TranslateModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TranslationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [translateOpen, setTranslateOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setError(null);

    getTranslation(text)
      .then(res => {
        if (active) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(err => {
        if (active) {
          console.error("Translation error:", err);
          setError("Failed to fetch translation. Please check connection.");
          setLoading(false);
        }
      });

    return () => { active = false; };
  }, [isOpen, text]);

  const handleCopy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.translated);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[999] flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="bg-[#0b0b10]/95 border border-white/10 w-full max-w-md rounded-3xl p-6 shadow-[0_32px_80px_rgba(0,0,0,0.85)] backdrop-blur-3xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient glow */}
        <div className="absolute -top-[30%] -left-[20%] w-[70%] h-[70%] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-[30%] -right-[20%] w-[70%] h-[70%] rounded-full bg-fuchsia-500/5 blur-[100px] pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-2">
            <Languages className="text-indigo-400 animate-pulse" size={20} />
            <h3 className="text-[14px] font-black uppercase tracking-widest text-white">Lumina AI Translation</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 min-h-[140px] relative z-10">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
              <span className="text-[11px] font-bold text-white/30 uppercase tracking-widest animate-pulse">Translating with AI...</span>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <AlertCircle className="text-rose-500 mx-auto mb-2" size={24} />
              <p className="text-sm text-neutral-400">{error}</p>
            </div>
          ) : data ? (
            <>
              {/* Original */}
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 space-y-2 group/card">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-white/30">
                    Original • {getLangName(data.srcLang)}
                  </span>
                  <button
                    onClick={() => speakText(data.original, data.srcLang)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-indigo-500/20 text-white/40 hover:text-indigo-400 transition-colors opacity-0 group-hover/card:opacity-100 focus:opacity-100"
                    title="Read Aloud"
                  >
                    <Volume2 size={13} />
                  </button>
                </div>
                <p className="text-[14px] text-white/80 leading-relaxed break-words font-medium select-text">
                  {data.original}
                </p>
              </div>

              {/* Translated */}
              <div className="bg-indigo-500/[0.02] border border-indigo-500/10 rounded-2xl p-4 space-y-2 group/card">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400/80">
                    Translation • {getLangName(data.targetLang)}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      onClick={() => speakText(data.translated, data.targetLang)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-indigo-500/20 text-white/40 hover:text-indigo-400 transition-colors"
                      title="Read Aloud"
                    >
                      <Volume2 size={13} />
                    </button>
                    <button
                      onClick={handleCopy}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-indigo-500/20 text-white/40 hover:text-indigo-400 transition-colors"
                      title="Copy translation"
                    >
                      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
                <p className="text-[14px] text-indigo-200/90 leading-relaxed break-words font-medium select-text">
                  {data.translated}
                </p>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="mt-6 flex justify-end relative z-10 border-t border-white/5 pt-4">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white font-bold text-xs transition-all active:scale-95 border border-white/5"
            >
              Done
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function isSoloEmoji(str?: string | null): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  if (!trimmed) return false;
  try {
    const segmenter = new (Intl as any).Segmenter(undefined, { granularity: "grapheme" });
    const segs = [...segmenter.segment(trimmed)];
    if (segs.length === 0 || segs.length > 3) return false;
    return segs.every(({ segment }: { segment: string }) => {
      const code = segment.codePointAt(0) ?? 0;
      return /\p{Emoji}/u.test(segment) && ((code >= 0x1f300 && code <= 0x1faff) || (code >= 0x2600 && code <= 0x27bf) || (code >= 0x231a && code <= 0x2b55) || code === 0x200d);
    });
  } catch {
    return /^(\p{Emoji}\uFE0F?\u20E3?|\p{Emoji_Presentation}){1,3}$/u.test(trimmed);
  }
}

// Premium adaptive border radius — iMessage-style grouping
function getBorderRadius(isMine: boolean, isFirst: boolean, isLast: boolean) {
  const full = "20px";
  const sq = "5px"; // tight corner for grouped messages

  if (isFirst && isLast) return { borderRadius: full };

  if (isMine) {
    return {
      borderTopLeftRadius: full,
      borderBottomLeftRadius: full,
      borderTopRightRadius: isFirst ? full : sq,
      borderBottomRightRadius: isLast ? full : sq,
    };
  }
  return {
    borderTopRightRadius: full,
    borderBottomRightRadius: full,
    borderTopLeftRadius: isFirst ? full : sq,
    borderBottomLeftRadius: isLast ? full : sq,
  };
}

function StatusOrb({ status, onRetry }: { status: MessageStatus; onRetry?: () => void }) {
  if (status === "pending" || status === "sending" || status === "local_sending") {
    return (
      <span className="inline-flex items-center transition-all duration-150 transform scale-100 opacity-100">
        <Clock size={10} className="text-white/25 animate-pulse" />
      </span>
    );
  }
  if (status === "failed" || status === "error") {
    return (
      <span className="inline-flex items-center transition-all duration-150 transform scale-100 opacity-100">
        <button type="button" onClick={(e) => { e.stopPropagation(); onRetry?.(); }} title="Tap to retry">
          <RefreshCw size={12} className="text-rose-400 hover:text-rose-300 hover:rotate-180 transition-all duration-300" />
        </button>
      </span>
    );
  }
  return null;
}

function MediaUploadingSkeleton({ type, fileName }: { type: string; fileName?: string }) {
  return (
    <div className="flex items-center gap-3 p-3.5 bg-white/[0.03] border border-white/[0.08] rounded-2xl backdrop-blur-md min-w-[210px] select-none">
      <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-white/50 relative shrink-0">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-white/90 truncate uppercase tracking-wider">
          {type === 'voice' ? 'Voice Note' : type === 'image' ? 'Image File' : type === 'video' ? 'Video File' : 'Media File'}
        </p>
        <p className="text-[11px] text-white/40 truncate mt-0.5">
          {fileName || 'Uploading...'}
        </p>
      </div>
    </div>
  );
}

const DEFAULT_REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];

function ReactionPicker({
  isMine,
  onSelect,
  onClose,
  onOpenFull,
}: {
  isMine: boolean;
  onSelect: (e: string) => void;
  onClose: () => void;
  onOpenFull?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5, y: 10 }}
      transition={{ type: "spring", stiffness: 550, damping: 28 }}
      className={clsx(
        "absolute bottom-full mb-2 z-[200] flex items-center gap-1 px-3 py-2.5 rounded-2xl bg-[#1a1a1f]/95 border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl whitespace-nowrap",
        isMine ? "right-0" : "left-0"
      )}
    >
      {DEFAULT_REACTIONS.map((emoji, i) => (
        <motion.button
          key={emoji}
          initial={{ opacity: 0, scale: 0.3, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: i * 0.035, type: "spring", stiffness: 600, damping: 26 }}
          whileHover={{ scale: 1.35, y: -3 }}
          whileTap={{ scale: 0.8 }}
          onClick={() => { onSelect(emoji); onClose(); }}
          className="text-[22px] leading-none"
        >
          {emoji}
        </motion.button>
      ))}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: DEFAULT_REACTIONS.length * 0.035 }}
        whileHover={{ scale: 1.2 }}
        onClick={onOpenFull}
        className="w-7 h-7 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 text-sm transition-colors"
        title="More"
      >+</motion.button>
    </motion.div>
  );
}

function FileCard({ url, name, mime, isMine }: { url?: string; name?: string; mime?: string; isMine: boolean }) {
  const ext = (name?.split(".").pop() || mime?.split("/").pop() || "file").toUpperCase();
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className={clsx("flex items-center gap-3 p-3 rounded-2xl transition-all group/file min-w-[200px]",
        isMine ? "bg-white/[0.07] border border-white/10 hover:bg-white/10" : "bg-black/20 border border-white/[0.06] hover:bg-black/30"
      )}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: isMine ? "rgba(255,255,255,0.12)" : "rgba(99,102,241,0.2)" }}>
        <FileText size={18} className={isMine ? "text-white/70" : "text-indigo-400"} />
      </div>
      <div className="flex flex-col overflow-hidden flex-1 min-w-0">
        <span className="text-[13px] font-semibold text-white truncate">{name || "File"}</span>
        <span className="text-[10px] text-white/40 uppercase tracking-wide">{ext}</span>
      </div>
      <Download size={14} className="opacity-0 group-hover/file:opacity-50 transition-opacity shrink-0 text-white" />
    </a>
  );
}

const getProxiedImageUrl = (url: string): string => {
  if (url.startsWith('blob:')) return url;
  
  try {
    const parsed = new URL(url);
    if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
      return url;
    }
    
    // 1. Supabase Storage Detection
    if (url.includes('/storage/v1/object/public/')) {
      const parts = url.split('/public/');
      if (parts.length > 1) {
        return `/api/media?storage=supabase&file=${encodeURIComponent(parts[1])}`;
      }
    }
    
    // 2. Cloudflare R2 Storage Fallback
    const fileKey = parsed.pathname.startsWith('/') ? parsed.pathname.substring(1) : parsed.pathname;
    return `/api/media?storage=r2&file=${encodeURIComponent(fileKey)}`;
  } catch (e) {
    return url;
  }
};

const handleDownload = async (url: string, defaultName: string) => {
  try {
    const proxiedUrl = getProxiedImageUrl(url);
    const link = document.createElement("a");
    link.href = proxiedUrl;
    link.download = defaultName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Download failed, opening fallback link:", error);
    window.open(url, "_blank");
  }
};

const getCustomDownloadName = (
  chatContext: { type: 'community' | 'group' | 'dm'; name: string } | undefined,
  message: ChatMessage
): string => {
  const ext = message.file_name?.split('.').pop() || (message.type === 'video' ? 'mp4' : 'png');
  const d = new Date(message.sent_at || Date.now());
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const timeStr = `${year}-${month}-${date}_${hours}-${minutes}-${seconds}`;
  const shortId = message.id ? message.id.substring(0, 4) : Math.random().toString(36).substring(2, 6);
  const prefix = chatContext ? `${chatContext.type}_${chatContext.name.replace(/[^a-zA-Z0-9_-]/g, '')}` : 'chat';
  return `Verlyn_${prefix}_${timeStr}_${shortId}.${ext}`;
};

const MessageItem = memo(({
  message,
  currentUserId,
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
  showSenderName = false,
  bubbleStyle = "solid",
  isFirstInGroup = true,
  isLastInGroup = true,
  partnerNickname = null,
  activeMenuMessageId,
  setActiveMenuMessageId,
  chatContext,
  chatMembers,
  isLastOwnMessage = false,
  viewers: viewersProp,
}: MessageItemProps) => {
  const router = useRouter();
  const isMine = message.is_mine || message.sender_id === currentUserId;

  const viewers = useMemo(() => {
    if (viewersProp) return viewersProp;
    if (!message.viewed_by || !chatMembers) return [];
    return message.viewed_by
      .filter(uid => uid !== message.sender_id)
      .map(uid => chatMembers.find(m => m.id === uid))
      .filter(Boolean) as { id: string; display_name: string; username?: string; avatar_url?: string }[];
  }, [viewersProp, message.viewed_by, chatMembers, message.sender_id]);

  const currentUser = useAppStore(state => state.currentUser);
  const hiddenWords = useMemo(() => {
    return currentUser?.metadata?.hidden_words || [];
  }, [currentUser?.metadata?.hidden_words]);

  const displayContent = useMemo(() => {
    const content = message.content || "";
    if (message.type === "system") return content;
    if (!content || hiddenWords.length === 0) return content;
    
    let filtered = content;
    for (const word of hiddenWords) {
      if (!word) continue;
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedWord, 'gi');
      filtered = filtered.replace(regex, '***');
    }
    return filtered;
  }, [message.content, message.type, hiddenWords]);

  const [actionsVisible, setActionsVisible] = useState(false);
  const menuOpen = activeMenuMessageId === message.id;
  const setMenuOpen = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    if (!setActiveMenuMessageId) return;
    if (typeof val === 'function') {
      const nextVal = val(activeMenuMessageId === message.id);
      setActiveMenuMessageId(nextVal ? message.id : null);
    } else {
      setActiveMenuMessageId(val ? message.id : null);
    }
  }, [activeMenuMessageId, message.id, setActiveMenuMessageId]);
  const [menuDirection, setMenuDirection] = useState<"up" | "down">("up");
  const [showMoreActions, setShowMoreActions] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [fullEmojiPickerOpen, setFullEmojiPickerOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadingInline, setLoadingInline] = useState(false);
  const [inlineTranslation, setInlineTranslation] = useState<string | null>(null);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [showLangSelector, setShowLangSelector] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const dragX = useMotionValue(0);
  const dragXAbs = useTransform(dragX, (x) => Math.abs(x));
  const replyIconOpacity = useTransform(dragXAbs, [0, 60], [0, 1]);
  const replyIconScale = useTransform(dragXAbs, [0, 60], [0.5, 1.1]);
  const replyIconRotate = useTransform(dragX, (x) => {
    if (x === 0) return 0;
    const progress = Math.min(Math.abs(x) / 60, 1);
    const startAngle = x > 0 ? -30 : 30;
    return startAngle * (1 - progress);
  });
  const hasVibratedRef = useRef(false);

  const handleReplyClick = useCallback(() => {
    if (!message.reply_to?.id) return;
    const target = document.getElementById(`msg-${message.reply_to.id}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("reply-highlight-pulse");
      setTimeout(() => {
        target.classList.remove("reply-highlight-pulse");
      }, 1600);
    }
  }, [message.reply_to?.id]);

  useEffect(() => {
    setMounted(true);
    // If the message is new (sent within the last 4 seconds)
    const timeDiff = Date.now() - new Date(message.sent_at).getTime();
    if (timeDiff < 4000) {
      const targetEmojis = ["🎉", "🔥", "❤️", "😂", "🚀"];
      const found = targetEmojis.find(e => message.content && message.content.includes(e));
      if (found) {
        window.dispatchEvent(new CustomEvent("emoji-explosion", { detail: { emoji: found } }));
      }
    }
    return () => setMounted(false);
  }, [message.sent_at, message.content]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClose = (e: MouseEvent) => {
      if (menuButtonRef.current?.contains(e.target as Node)) return;
      if ((e.target as HTMLElement).closest('[data-menu-dropdown]')) return;
      setMenuOpen(false);
    };
    window.addEventListener("mousedown", handleClose);
    return () => window.removeEventListener("mousedown", handleClose);
  }, [menuOpen]);

  useEffect(() => {
    if (!reactionPickerOpen) return;
    const handleClose = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('[title="Add reaction"]')) return;
      if ((e.target as HTMLElement).closest('[data-reaction-picker]')) return;
      setReactionPickerOpen(false);
    };
    window.addEventListener("mousedown", handleClose);
    return () => window.removeEventListener("mousedown", handleClose);
  }, [reactionPickerOpen]);

  useEffect(() => {
    if (!menuOpen && !reactionPickerOpen && !actionsVisible) return;
    const handleScroll = () => {
      setMenuOpen(false);
      setReactionPickerOpen(false);
      setActionsVisible(false);
    };
    window.addEventListener("scroll", handleScroll, { capture: true });
    return () => window.removeEventListener("scroll", handleScroll, { capture: true });
  }, [menuOpen, reactionPickerOpen, actionsVisible]);

  useEffect(() => {
    if (!actionsVisible) return;
    const handleClose = (e: MouseEvent) => {
      const container = document.getElementById(`msg-${message.id}`);
      if (container?.contains(e.target as Node)) return;
      setActionsVisible(false);
    };
    window.addEventListener("mousedown", handleClose);
    return () => window.removeEventListener("mousedown", handleClose);
  }, [actionsVisible, message.id]);

  const copyToClipboard = useCallback(async (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch (err) {
        console.error("Clipboard API failed, trying fallback", err);
      }
    }
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Fallback copy failed", err);
    }
    document.body.removeChild(textArea);
  }, []);



  const copyImageToClipboard = async (url: string) => {
    try {
      const proxiedUrl = getProxiedImageUrl(url);
      const response = await fetch(proxiedUrl);
      const blob = await response.blob();
      
      let pngBlob = blob;
      if (blob.type !== 'image/png') {
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Load fail"));
        });
        
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas 2D fail");
        ctx.drawImage(img, 0, 0);
        
        const converted = await new Promise<Blob | null>((resBlob) => {
          canvas.toBlob((b) => resBlob(b), 'image/png');
        });
        if (!converted) throw new Error("Blob conversion fail");
        pngBlob = converted;
        URL.revokeObjectURL(img.src);
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          [pngBlob.type]: pngBlob
        })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      window.dispatchEvent(
        new CustomEvent('verlyn:toast', {
          detail: { message: 'Image copied to clipboard!', type: 'success' },
        })
      );
    } catch (err: any) {
      console.warn("Direct image binary copy failed:", err);
      window.dispatchEvent(
        new CustomEvent('verlyn:toast', {
          detail: { message: `Failed to copy: ${err.message || err}`, type: 'error' },
        })
      );
    }
  };

  const handleCopy = useCallback((text: string, forceImage = false) => {
    const isImageLink = forceImage || (typeof text === 'string' && (
      text.startsWith('blob:') ||
      (/^https?:\/\//.test(text) && /\.(png|jpg|jpeg|gif|webp)/i.test(text)) ||
      text.includes('/storage/v1/object/public/')
    ));
    if (isImageLink) {
      copyImageToClipboard(text);
    } else {
      copyToClipboard(text);
    }
  }, [copyToClipboard]);


  const styleParams = useMemo(
    () => BUBBLE_STYLES.find(b => b.id === bubbleStyle) || BUBBLE_STYLES.find(b => b.id === 'solid'),
    [bubbleStyle]
  );

  const radii = useMemo(
    () => getBorderRadius(isMine, isFirstInGroup, isLastInGroup),
    [isMine, isFirstInGroup, isLastInGroup]
  );
  // PERF: Memoize isSoloEmoji — runs a Segmenter regex on every render without this
  const isSolo = useMemo(
    () => message.type === 'text' && isSoloEmoji(displayContent),
    [message.type, displayContent]
  );
  const isViewed = currentUserId ? (message.viewed_by || []).includes(currentUserId) : false;
  const isFailed = message.status === "error" || message.status === "failed";

  const isImageOnly = useMemo(() => {
    return (message.type === "image" || message.type === "media_group" || message.type === "video") && (
      !displayContent ||
      displayContent === message.file_name ||
      /^https?:\/\//.test(displayContent)
    );
  }, [message.type, displayContent, message.file_name]);

  const bubbleInlineStyle: React.CSSProperties = useMemo(() => {
    if (message.is_ghost) {
      return {
        ...radii,
        backdropFilter: "blur(12px) saturate(180%)",
        WebkitBackdropFilter: "blur(12px) saturate(180%)",
        background: "rgba(18, 14, 28, 0.78)", // Premium dark violet/purple translucent
        borderColor: "rgba(139, 92, 246, 0.45)", // Violet border
        borderWidth: 1,
        boxShadow: "0 0 18px rgba(139, 92, 246, 0.22)", // Vibrant ghost mode violet glow
      };
    }
    const isImg = isImageOnly;
    return {
      ...radii,
      backdropFilter: isImg ? "none" : (styleParams?.filter || "blur(12px) saturate(180%)"),
      WebkitBackdropFilter: isImg ? "none" : (styleParams?.filter || "blur(12px) saturate(180%)"),
      background: isImg
        ? (isFailed ? "rgba(239, 68, 68, 0.04)" : "rgba(255, 255, 255, 0.02)")
        : (isFailed
          ? "rgba(239,68,68,0.08)"
          : (isMine ? styleParams?.sentBg : styleParams?.recvBg)),
      borderColor: isFailed
        ? "rgba(239,68,68,0.4)"
        : (isImg
          ? "rgba(255, 255, 255, 0.08)"
          : (isMine ? styleParams?.sentBorder : "rgba(255,255,255,0.05)")),
      borderWidth: 1,
      boxShadow: isFailed
        ? "0 0 14px rgba(239,68,68,0.2)"
        : (isImg
          ? "0 4px 20px rgba(0, 0, 0, 0.4)"
          : (!isFailed && styleParams?.neonShadow && isMine)
            ? styleParams.neonShadow
            : isMine
              ? "0 2px 12px rgba(0,0,0,0.2)"
              : "0 2px 8px rgba(0,0,0,0.15)"),
    };
  }, [styleParams, isMine, isFailed, radii, isImageOnly]);

  const isActive = actionsVisible || menuOpen || reactionPickerOpen;

  const handlePointerDown = useCallback(() => {
    longPressTimer.current = setTimeout(() => setReactionPickerOpen(true), 480);
  }, []);
  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  // System message
  if (message.type === "system") {
    return (
      <div className="flex justify-center my-3 px-4">
        <span className="text-[11px] text-white/30 px-4 py-1.5 rounded-full font-medium"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
          {message.content}
        </span>
      </div>
    );
  }

  // Spacing between groups vs within groups
  const marginBottom = isLastInGroup ? "mb-3" : "mb-[3px]";

  return (
    <div
      style={{ touchAction: "pan-y" }}
      className={clsx(
        "group px-3 sm:px-4 relative",
        (menuOpen || reactionPickerOpen) && "menu-open",
        menuOpen ? "z-[50]" : "z-auto",
        isMine ? "flex flex-col items-end" : "flex flex-col items-start",
        marginBottom
      )}
    >
      {!isMine && showSenderName && isFirstInGroup && (
        <span className="text-[11px] font-semibold text-white/40 mb-1.5 ml-3 tracking-wide">
          {(() => {
            const member = chatMembers?.find((m) => m.id === message.sender_id);
            return member?.nickname || member?.display_name || message.sender?.display_name || message.sender?.username || "Unknown";
          })()}
        </span>
      )}

      {/* Forwarded from indicator */}
      {message.metadata?.forwarded && (
        <div className={clsx(
          "flex items-center gap-1 text-[10px] text-white/40 mb-1 italic font-medium px-1.5 select-none",
          isMine ? "justify-end pr-3" : "justify-start pl-3"
        )}>
          <Forward size={10} className="opacity-60" />
          <span>Forwarded {message.metadata.forwarded_from ? `from ${message.metadata.forwarded_from}` : ""}</span>
        </div>
      )}

      {/* Reply context strip */}
      {message.reply_to && (
        <div 
          onClick={handleReplyClick}
          className={clsx("flex flex-col mb-1.5 max-w-[78%] cursor-pointer hover:opacity-85 active:scale-[0.99] transition-all", isMine ? "items-end pr-3" : "items-start pl-3")}
        >
          <div className="flex items-center gap-1.5 mb-1 opacity-40">
            <Reply size={9} className={isMine ? "rotate-180" : ""} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{message.reply_to.sender_display}</span>
          </div>
          <div className={clsx(
            "px-3 py-1.5 text-[12px] rounded-xl border-l-2 max-w-full",
            isMine ? "bg-white/[0.04] border-white/20" : "bg-white/[0.04] border-indigo-400/50"
          )}>
            <span className="truncate block text-white/50 italic leading-snug">{formatReplyContent(message.reply_to.content, message.reply_to.type)}</span>
          </div>
        </div>
      )}

      {/* Bubble row */}
      <div className={clsx("flex items-end gap-2 w-fit min-w-0 relative overflow-visible", isMine ? "flex-row-reverse" : "flex-row", "max-w-[88%] sm:max-w-[76%]")}>

        {/* Main bubble */}
        <motion.div
          drag={message.is_ghost ? false : "x"}
          dragConstraints={isMine ? { left: -55, right: 0 } : { left: 0, right: 55 }}
          dragElastic={isMine ? { left: 0.08, right: 0 } : { left: 0, right: 0.08 }}
          dragSnapToOrigin={true}
          style={{ x: dragX }}
          onDragStart={() => {
            hasVibratedRef.current = false;
            if (longPressTimer.current) {
              clearTimeout(longPressTimer.current);
            }
          }}
          onDrag={(event, info) => {
            const isTriggered = isMine ? info.offset.x < -35 : info.offset.x > 35;
            if (isTriggered && !hasVibratedRef.current) {
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(10);
              }
              hasVibratedRef.current = true;
            } else if (!isTriggered) {
              hasVibratedRef.current = false;
            }
          }}
          onDragEnd={(event, info) => {
            const isTriggered = isMine ? info.offset.x < -35 : info.offset.x > 35;
            if (isTriggered) {
              onReply?.(message);
            }
            animate(dragX, 0, { type: "spring", stiffness: 300, damping: 30 });
          }}
          className="relative flex flex-col w-fit max-w-full shrink min-w-0"
        >
          {onReply && (
            <motion.div
              style={{
                opacity: replyIconOpacity,
                scale: replyIconScale,
                rotate: replyIconRotate,
              }}
              className={clsx(
                "absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-indigo-400 pointer-events-none z-0 shadow-lg backdrop-blur-md",
                isMine ? "right-[-42px]" : "left-[-42px]"
              )}
            >
              <Reply size={15} className={isMine ? "rotate-180" : ""} />
            </motion.div>
          )}

          {/* Reaction picker */}
          <AnimatePresence>
            {reactionPickerOpen && (
              <div data-reaction-picker>
                <ReactionPicker
                  isMine={isMine}
                  onSelect={(emoji) => onReact?.(message.id, emoji)}
                  onClose={() => setReactionPickerOpen(false)}
                  onOpenFull={() => { setReactionPickerOpen(false); setFullEmojiPickerOpen(true); }}
                />
              </div>
            )}
          </AnimatePresence>

          {/* PERF: EmojiPicker lazy-mounts — only render when actually opened.
               Previously it rendered for EVERY message, creating N heavy portals.
               Now we unmount when closed and only the active message has it. */}
          {fullEmojiPickerOpen && (
            <EmojiPicker
              isOpen={fullEmojiPickerOpen}
              isMine={isMine}
              onClose={() => setFullEmojiPickerOpen(false)}
              onEmojiSelect={(emoji) => { onReact?.(message.id, emoji); setFullEmojiPickerOpen(false); }}
            />
          )}

          {/* View-once */}
          {message.view_once && (
            <GhostBubble
              messageId={message.id}
              mediaUrl={message.media_url}
              content={message.content}
              type={message.type}
              isMine={isMine}
              isViewed={isViewed || (message.viewed_by?.length ?? 0) > 0}
              onReveal={(id) => onReveal?.(id)}
            />
          )}

          {/* Regular bubble */}
          {!message.view_once && message.type !== "location" && (<>
            {isSolo ? (
              <div
                className="cursor-pointer select-none px-1 py-1 active:scale-95 transition-transform duration-100"
                style={{ fontSize: 54, lineHeight: 1.1, touchAction: "pan-y" }}
                onClick={() => setActionsVisible(v => !v)}
                onDoubleClick={() => onReact?.(message.id, "❤️")}
                onPointerDown={handlePointerDown}
                onPointerUp={clearLongPress}
                onPointerCancel={clearLongPress}
              >
                {displayContent}
              </div>
            ) : (
              <div
                onClick={message.is_ghost ? undefined : () => setActionsVisible(v => !v)}
                onDoubleClick={message.is_ghost ? undefined : () => onReact?.(message.id, "❤️")}
                onPointerDown={message.is_ghost ? undefined : handlePointerDown}
                onPointerUp={message.is_ghost ? undefined : clearLongPress}
                onPointerCancel={message.is_ghost ? undefined : clearLongPress}
                className={clsx(
                  "chat-bubble relative overflow-hidden transition-all duration-150 active:scale-[0.985] will-change-transform origin-center w-fit max-w-full shrink min-w-0 select-none",
                  message.is_ghost ? "cursor-default" : "cursor-pointer",
                  actionsVisible && "ring-2 ring-indigo-400/30 ring-offset-1 ring-offset-transparent",
                  isFailed && "animate-shake"
                )}
                style={{
                  ...bubbleInlineStyle,
                  padding: isImageOnly ? "0px" : (message.is_starred ? "10px 28px 14px 14px" : "10px 14px"),
                  touchAction: "pan-y",
                }}
              >
                {/* Media Group Collage Grid */}
                {message.type === "media_group" && message.messages && (
                  <div className="flex flex-col gap-2 relative group/image overflow-hidden" style={{ borderRadius: "inherit" }}>
                    {(() => {
                      const items = message.messages || [];
                      const count = items.length;
                      if (count === 2) {
                        return (
                          <div className="grid grid-cols-2 gap-0.5 max-w-[200px] sm:max-w-[280px]">
                            {items.map((item, idx) => (
                              <img
                                key={item.id}
                                src={item.media_url}
                                alt="Group image"
                                className="w-full h-[140px] sm:h-[180px] object-cover cursor-zoom-in hover:scale-[1.01] transition-transform duration-300"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxIndex(idx);
                                  setIsLightboxOpen(true);
                                }}
                              />
                            ))}
                          </div>
                        );
                      } else if (count === 3) {
                        return (
                          <div className="grid grid-cols-2 gap-0.5 max-w-[200px] sm:max-w-[280px] h-[170px] sm:h-[220px]">
                            <div className="col-span-1 h-full">
                              <img
                                src={items[0].media_url}
                                alt="Group image"
                                className="w-full h-full object-cover cursor-zoom-in hover:scale-[1.01] transition-transform duration-300"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxIndex(0);
                                  setIsLightboxOpen(true);
                                }}
                              />
                            </div>
                            <div className="col-span-1 grid grid-rows-2 gap-0.5 h-full">
                              <img
                                src={items[1].media_url}
                                alt="Group image"
                                className="w-full h-full object-cover cursor-zoom-in hover:scale-[1.01] transition-transform duration-300"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxIndex(1);
                                  setIsLightboxOpen(true);
                                }}
                              />
                              <img
                                src={items[2].media_url}
                                alt="Group image"
                                className="w-full h-full object-cover cursor-zoom-in hover:scale-[1.01] transition-transform duration-300"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxIndex(2);
                                  setIsLightboxOpen(true);
                                }}
                              />
                            </div>
                          </div>
                        );
                      } else {
                        // 4 or more items collage
                        return (
                          <div className="grid grid-cols-2 gap-0.5 max-w-[200px] sm:max-w-[280px] h-[170px] sm:h-[220px]">
                            {items.slice(0, 4).map((item, idx) => {
                              const isLast = idx === 3;
                              const hasMore = count > 4;
                              return (
                                <div 
                                  key={item.id} 
                                  className="relative w-full h-full overflow-hidden cursor-zoom-in"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxIndex(idx);
                                    setIsLightboxOpen(true);
                                  }}
                                >
                                  <img
                                    src={item.media_url}
                                    alt="Group image"
                                    className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-300"
                                  />
                                  {isLast && hasMore && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                                      <span className="text-xl sm:text-2xl font-black text-white">+{count - 3}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                    })()}

                    {/* Hover action toolbar */}
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200 z-20">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const first = message.messages?.[0];
                          if (first?.media_url) {
                            handleDownload(first.media_url, getCustomDownloadName(chatContext, first));
                          }
                        }}
                        className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 flex items-center justify-center text-white transition-all scale-90 hover:scale-100 active:scale-95"
                        title="Download first"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxIndex(0);
                          setIsLightboxOpen(true);
                        }}
                        className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 flex items-center justify-center text-white transition-all scale-90 hover:scale-100 active:scale-95"
                        title="View Gallery"
                      >
                        <Maximize2 size={14} />
                      </button>
                    </div>

                    {displayContent && displayContent !== message.file_name && !isFilename(displayContent) && (
                      <div className="px-3.5 pb-2 space-y-1 pt-1.5">
                        <p className="text-[14px] text-white leading-relaxed">{displayContent}</p>
                        {(loadingInline || inlineTranslation) && (
                          <div className="mt-1.5 pt-1.5 border-t border-white/[0.06] flex flex-col gap-0.5 text-[12px] text-indigo-200/90 select-text">
                            <div className="flex items-center gap-1 text-[8px] font-extrabold uppercase tracking-widest text-indigo-400/85 select-none">
                              <Languages size={9} />
                              <span>AI Translation</span>
                            </div>
                            {loadingInline ? (
                              <div className="flex items-center gap-1 py-0.5 text-white/40">
                                <Loader2 size={10} className="animate-spin text-indigo-400" />
                                <span className="text-[9px] uppercase font-bold tracking-wider animate-pulse">Translating...</span>
                              </div>
                            ) : (
                              <p className="leading-relaxed break-words">{inlineTranslation}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Image */}
                {message.type === "image" && message.media_url && (
                  !isMine && message.media_url.startsWith("blob:") ? (
                    <MediaUploadingSkeleton type="image" fileName={message.file_name} />
                  ) : (
                    <div className="flex flex-col gap-2 relative group/image overflow-hidden" style={{ borderRadius: "inherit" }}>
                      <img
                        src={message.media_url}
                        alt="Shared image"
                        className="max-h-[160px] sm:max-h-[190px] max-w-[200px] sm:max-w-[280px] w-auto h-auto object-cover block cursor-zoom-in hover:scale-[1.015] transition-all duration-300"
                        style={{ minWidth: 120, borderRadius: "inherit" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsLightboxOpen(true);
                        }}
                      />
                    {/* Hover action toolbar */}
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200 z-20">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(message.media_url!, getCustomDownloadName(chatContext, message));
                        }}
                        className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 flex items-center justify-center text-white transition-all scale-90 hover:scale-100 active:scale-95"
                        title="Download image"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(message.media_url!, true);
                        }}
                        className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 flex items-center justify-center text-white transition-all scale-90 hover:scale-100 active:scale-95"
                        title={copied ? "Copied Link!" : "Copy image"}
                      >
                        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsLightboxOpen(true);
                        }}
                        className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 flex items-center justify-center text-white transition-all scale-90 hover:scale-100 active:scale-95"
                        title="Expand image"
                      >
                        <Maximize2 size={14} />
                      </button>
                    </div>
                    {displayContent && displayContent !== message.file_name && !isFilename(displayContent) && (
                      <div className="px-3.5 pb-2 space-y-1">
                        <p className="text-[14px] text-white leading-relaxed">{displayContent}</p>
                        {(loadingInline || inlineTranslation) && (
                          <div className="mt-1.5 pt-1.5 border-t border-white/[0.06] flex flex-col gap-0.5 text-[12px] text-indigo-200/90 select-text">
                            <div className="flex items-center gap-1 text-[8px] font-extrabold uppercase tracking-widest text-indigo-400/85 select-none">
                              <Languages size={9} />
                              <span>AI Translation</span>
                            </div>
                            {loadingInline ? (
                              <div className="flex items-center gap-1 py-0.5 text-white/40">
                                <Loader2 size={10} className="animate-spin text-indigo-400" />
                                <span className="text-[9px] uppercase font-bold tracking-wider animate-pulse">Translating...</span>
                              </div>
                            ) : (
                              <p className="leading-relaxed break-words">{inlineTranslation}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  )
                )}

                {/* Video */}
                {message.type === "video" && message.media_url && (
                  !isMine && message.media_url.startsWith("blob:") ? (
                    <MediaUploadingSkeleton type="video" fileName={message.file_name} />
                  ) : (
                    <div className="flex flex-col gap-2 relative group/video overflow-hidden" style={{ borderRadius: "inherit" }}>
                      <PremiumVideoPlayer src={message.media_url} />
                    {displayContent && displayContent !== message.file_name && !isFilename(displayContent) && (
                      <div className="px-3.5 py-2.5 space-y-1 bg-[#0f0f14]/65 backdrop-blur-md border-t border-white/5">
                        <p className="text-[14px] text-white leading-relaxed">{displayContent}</p>
                        {(loadingInline || inlineTranslation) && (
                          <div className="mt-1.5 pt-1.5 border-t border-white/[0.06] flex flex-col gap-0.5 text-[12px] text-indigo-200/90 select-text">
                            <div className="flex items-center gap-1 text-[8px] font-extrabold uppercase tracking-widest text-indigo-400/85 select-none">
                              <Languages size={9} />
                              <span>AI Translation</span>
                            </div>
                            {loadingInline ? (
                              <div className="flex items-center gap-1 py-0.5 text-white/40">
                                <Loader2 size={10} className="animate-spin text-indigo-400" />
                                <span className="text-[9px] uppercase font-bold tracking-wider animate-pulse">Translating...</span>
                              </div>
                            ) : (
                              <p className="leading-relaxed break-words">{inlineTranslation}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  )
                )}


                {/* Voice */}
                {message.type === "voice" && message.media_url && (
                  <VoicePlayer
                    src={message.media_url}
                    isMine={isMine}
                    duration={(() => {
                      const match = message.content?.match(/^voice_(\d+)s$/);
                      return match ? parseInt(match[1], 10) : undefined;
                    })()}
                  />
                )}

                {/* Call Log */}
                {message.type === "call_log" && (
                  <div className="flex items-center gap-3 py-1 px-1">
                    <div className={clsx(
                      "w-9 h-9 rounded-xl flex items-center justify-center border",
                      message.content.includes("Missed") 
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    )}>
                      {message.content.includes("Video") 
                        ? <Video size={16} /> 
                        : (message.content.includes("Missed") ? <PhoneOff size={16} /> : <Phone size={16} />)
                      }
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white leading-tight">
                        {message.content}
                      </span>
                      <span className="text-[10px] text-white/50 font-mono uppercase tracking-wider mt-0.5">
                        {message.content.includes("Missed") ? "No answer" : "Completed"}
                      </span>
                    </div>
                  </div>
                )}

                {/* File */}
                {message.type === "file" && (
                  <FileCard url={message.media_url} name={message.file_name} mime={message.mime_type} isMine={isMine} />
                )}

                {/* Text */}
                {message.type === "text" && (
                  <div className="space-y-1.5">
                    {message.whisper_to_id && (
                      <div className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest text-amber-400 select-none">
                        <Lock size={10} className="text-amber-400 animate-pulse" />
                        <span>
                          {message.sender_id === currentUserId ? (
                            `Private Whisper to @${chatMembers?.find(m => m.id === message.whisper_to_id)?.username || 'user'}`
                          ) : (
                            'Private Whisper to you'
                          )}
                        </span>
                      </div>
                    )}
                    <p 
                      className="whitespace-pre-wrap break-words text-[15px] leading-[1.55] font-[400]"
                      style={{ color: isMine ? (styleParams?.sentTextColor || '#ffffff') : (styleParams?.recvTextColor || '#ffffff') }}
                    >
                      {(() => {
                        const parts = displayContent.split(/(https?:\/\/[^\s]+|@[\w.]+)/g);
                        return parts.map((part, i) => {
                          if (part.match(/^https?:\/\//)) {
                            return (
                              <a
                                key={i}
                                href={part}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline underline-offset-2 opacity-80 hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {part}
                              </a>
                            );
                          }
                          if (part.startsWith('@')) {
                            const username = part.slice(1);
                            return (
                              <span
                                key={i}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/profile/${username}`);
                                }}
                                className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer bg-indigo-500/10 px-1 py-0.5 rounded transition-colors"
                              >
                                {part}
                              </span>
                            );
                          }
                          return part;
                        });
                      })()}
                    </p>
                    
                    {/* Inline translation indicator / translation text */}
                    {(loadingInline || inlineTranslation) && (
                      <div className="mt-2 pt-2 border-t border-white/[0.06] flex flex-col gap-1 text-[13px] text-indigo-200/90 select-text">
                        <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-indigo-400/85 select-none">
                          <Languages size={10} className="animate-pulse" />
                          <span>AI Translation</span>
                        </div>
                        {loadingInline ? (
                          <div className="flex items-center gap-1.5 py-0.5 text-white/40">
                            <Loader2 size={12} className="animate-spin text-indigo-400" />
                            <span className="text-[10px] uppercase font-bold tracking-wider animate-pulse">Translating...</span>
                          </div>
                        ) : (
                          <p className="leading-relaxed whitespace-pre-wrap break-words">{inlineTranslation}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}


                {message.is_starred && (
                  <div 
                    className="absolute bottom-1 right-1.5 flex items-center justify-center p-0.5 rounded-full bg-black/40 backdrop-blur-sm z-10 border border-white/5"
                    title="Starred message"
                  >
                    <Star size={10} className="fill-yellow-400 text-yellow-400" />
                  </div>
                )}
              </div>
            )}
          </>)}

          {!message.view_once && message.location_expires_at && (
            <div className={clsx("flex w-full mb-1", isMine ? "justify-end" : "justify-start")}>
              <DisappearingTimer expiresAt={message.location_expires_at} messageId={message.id} conversationId={message.conversation_id} />
            </div>
          )}

          {/* Location */}
          {message.type === "location" && message.location_lat != null && message.location_lng != null && (
            <LocationBubble
              lat={message.location_lat} lng={message.location_lng}
              address={message.location_address} isLive={message.location_live}
              expiresAt={message.location_expires_at} isMine={isMine} sentAt={message.sent_at}
              isExact={message.metadata?.location_exact === true}
            />
          )}


          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className={clsx("flex flex-wrap gap-1 mt-1.5", isMine ? "justify-end" : "justify-start")}>
              {message.reactions.map(r => (
                <button
                  key={r.emoji}
                  onClick={() => onReact?.(message.id, r.emoji)}
                  className={clsx(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] transition-all border active:scale-95 duration-75 hover:scale-105",
                    r.reacted
                      ? "bg-indigo-500/20 border-indigo-400/40 shadow-[0_0_8px_rgba(99,102,241,0.2)]"
                      : "bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.08]"
                  )}
                >
                  {r.emoji}
                  {r.count > 1 && <span className="text-white/60 text-[10px] font-semibold">{r.count}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Thread reply badge */}
          {(message.reply_count ?? 0) > 0 && !message.thread_root_id && (
            <button
              onClick={() => onOpenThread?.(message)}
              className={clsx(
                "flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all hover:opacity-80 active:scale-95 duration-75",
                isMine ? "self-end" : "self-start",
                "bg-indigo-500/10 border border-indigo-400/20 text-indigo-300/80"
              )}
            >
              <MessageSquare size={10} />
              {message.reply_count} {message.reply_count === 1 ? "reply" : "replies"}
            </button>
          )}
        </motion.div>

        {isFailed && (
          <div className="text-rose-500 shrink-0 self-center" title="Failed to send. Click red refresh icon to retry.">
            <AlertCircle size={16} className="animate-pulse" />
          </div>
        )}

        {/* Quick Actions Toolbar */}
        {!message.is_ghost && (
          <div
            className={clsx(
              "absolute top-full mt-2 z-[30] select-none flex items-center py-1 overflow-visible transition-all duration-200",
              isMine ? "right-3" : "left-3",
              isActive
                ? "opacity-100 scale-100 visible pointer-events-auto"
                : "opacity-0 scale-95 invisible pointer-events-none"
            )}
          >
            <div className="flex items-center gap-2 overflow-visible">
              {/* Quick Reaction Button */}
              {onReact && (
                <motion.button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReactionPickerOpen(v => !v);
                  }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{ scale: reactionPickerOpen ? 1.08 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className={clsx(
                    "w-8 h-8 flex items-center justify-center rounded-full transition-all border shrink-0 shadow-md backdrop-blur-sm outline-none",
                    reactionPickerOpen
                      ? "bg-indigo-600/35 border-indigo-500/50 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                      : "bg-neutral-900/80 hover:bg-neutral-950 text-white/80 hover:text-white border-white/10"
                  )}
                  title="Add reaction"
                >
                  <Smile size={14} />
                </motion.button>
              )}

              {/* Quick Reply Button */}
              {onReply && (
                <motion.button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReply(message);
                  }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-900/80 hover:bg-neutral-950 text-white/80 hover:text-white transition-all border border-white/10 backdrop-blur-sm shrink-0 shadow-md outline-none"
                  title="Reply"
                >
                  <Reply size={14} />
                </motion.button>
              )}

              {/* Three-Dot Menu (Custom Dropdown) */}
              <div className="relative shrink-0">
                <motion.button
                  type="button"
                  ref={menuButtonRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (menuButtonRef.current) {
                      const rect = menuButtonRef.current.getBoundingClientRect();
                      const viewportHeight = window.innerHeight;
                      if (rect.top < viewportHeight * 0.45) {
                        setMenuDirection("down");
                      } else {
                        setMenuDirection("up");
                      }
                    }
                    setMenuOpen(v => !v);
                    setShowMoreActions(false);
                    setShowLangSelector(false);
                  }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{ scale: menuOpen ? 1.08 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className={clsx(
                    "w-8 h-8 flex items-center justify-center rounded-full transition-all border shrink-0 shadow-md backdrop-blur-sm outline-none",
                    menuOpen
                      ? "bg-indigo-600/35 border-indigo-500/50 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                      : "bg-neutral-900/80 hover:bg-neutral-950 text-white/80 hover:text-white border-white/10"
                  )}
                  title="More actions"
                >
                  <MoreHorizontal size={14} />
                </motion.button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      data-menu-dropdown
                      initial={{ opacity: 0, scale: 0.95, y: menuDirection === "up" ? 8 : -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: menuDirection === "up" ? 8 : -8 }}
                      transition={{ type: "spring", stiffness: 500, damping: 28 }}
                      className={clsx(
                        "absolute z-[200] min-w-[172px] p-1.5 rounded-2xl outline-none bg-[#0f0f14]/95 border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.7)] backdrop-blur-3xl flex flex-col gap-0.5",
                        menuDirection === "up" ? "bottom-full mb-2" : "top-full mt-2",
                        isMine ? "right-0" : "left-0"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Timestamp header — always at the top */}
                      <div className="flex items-center gap-1.5 px-3 pt-1.5 pb-2 border-b border-white/[0.06] mb-1">
                        <span className="text-[11px] font-semibold text-white/60">{formatTime(message.sent_at)}</span>
                        {message.edited_at && <span className="text-[9px] italic text-white/35">· edited</span>}
                        {isMine && <StatusOrb status={message.status} onRetry={() => onRetry?.(message)} />}
                      </div>

                      {isMine ? (
                        /* Simplified flat menu for sender's own messages */
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(message.media_url || displayContent, message.type === "image");
                              setMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] rounded-xl cursor-pointer outline-none transition-all text-left"
                          >
                            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-white/40" strokeWidth={2} />}
                            <span>{copied ? "Copied!" : (message.media_url ? "Copy Image" : "Copy Text")}</span>
                          </button>

                          {onForward && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onForward(message);
                                setMenuOpen(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white rounded-xl cursor-pointer outline-none transition-all text-left"
                            >
                              <Forward size={14} className="text-white/40" />
                              <span>Forward Message</span>
                            </button>
                          )}

                          {onEdit && message.status !== "error" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(message);
                                setMenuOpen(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white rounded-xl cursor-pointer outline-none transition-all text-left"
                            >
                              <Pencil size={14} className="text-white/40" />
                              <span>Edit Message</span>
                            </button>
                          )}

                          {onPin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPin(message);
                                setMenuOpen(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white rounded-xl cursor-pointer outline-none transition-all text-left"
                            >
                              <Pin size={14} className="text-white/40" />
                              <span>{message.is_pinned ? "Unpin Message" : "Pin Message"}</span>
                            </button>
                          )}

                          {onStar && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onStar(message);
                                setMenuOpen(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white rounded-xl cursor-pointer outline-none transition-all text-left"
                            >
                              <Star size={14} className={message.is_starred ? "text-yellow-400 fill-yellow-400" : "text-white/40"} />
                              <span>{message.is_starred ? "Unstar Message" : "Star Message"}</span>
                            </button>
                          )}

                          {(onDelete || onDeleteForMe) && (
                            <div className="h-px bg-white/[0.06] my-1" />
                          )}

                          {onDelete && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(message.id);
                                setMenuOpen(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl cursor-pointer outline-none transition-all text-left font-semibold"
                            >
                              <Trash2 size={14} strokeWidth={2} />
                              <span>Delete for Everyone</span>
                            </button>
                          )}

                          {onDeleteForMe && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteForMe(message.id);
                                setMenuOpen(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white rounded-xl cursor-pointer outline-none transition-all text-left"
                            >
                              <Trash2 size={14} strokeWidth={2} className="text-white/40" />
                              <span>Delete for Me</span>
                            </button>
                          )}
                        </>
                      ) : showLangSelector ? (
                        /* Language selector sub-menu */
                        <div className="flex flex-col gap-0.5 max-h-[260px] overflow-y-auto select-none">
                          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/[0.06] mb-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowLangSelector(false);
                              }}
                              className="p-1 rounded-lg hover:bg-white/[0.06] text-white/70 hover:text-white transition-all cursor-pointer"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <span className="text-xs font-semibold text-white/80">Translate to</span>
                          </div>
                          {[
                            { code: 'en', name: 'English' },
                            { code: 'hi', name: 'Hindi' },
                            { code: 'es', name: 'Spanish' },
                            { code: 'fr', name: 'French' },
                            { code: 'de', name: 'German' },
                            { code: 'ja', name: 'Japanese' },
                            { code: 'zh', name: 'Chinese' },
                            { code: 'ko', name: 'Korean' },
                            { code: 'ru', name: 'Russian' },
                            { code: 'ar', name: 'Arabic' },
                            { code: 'pt', name: 'Portuguese' },
                            { code: 'it', name: 'Italian' },
                            { code: 'tr', name: 'Turkish' },
                            { code: 'vi', name: 'Vietnamese' },
                            { code: 'pl', name: 'Polish' },
                            { code: 'nl', name: 'Dutch' },
                            { code: 'id', name: 'Indonesian' },
                            { code: 'th', name: 'Thai' },
                            { code: 'fa', name: 'Persian' },
                            { code: 'bn', name: 'Bengali' },
                          ].map(({ code, name }) => (
                            <button
                              type="button"
                              key={code}
                              onClick={async (e) => {
                                e.stopPropagation();
                                setMenuOpen(false);
                                setShowLangSelector(false);
                                setLoadingInline(true);
                                try {
                                  const res = await translateText(displayContent, code);
                                  setInlineTranslation(res.translated);
                                } catch (err) {
                                  console.error(err);
                                } finally {
                                  setLoadingInline(false);
                                }
                              }}
                              className="w-full flex items-center justify-between px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/[0.06] rounded-xl cursor-pointer outline-none transition-all text-left"
                            >
                              <span>{name}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        /* Complete actions list for partner's messages */
                        <>
                          {/* Primary actions */}
                          {[
                            ...(onReply ? [{ label: "Reply", icon: Reply, action: () => onReply(message) }] : []),
                            {
                              label: copied ? "Copied!" : (message.media_url ? "Copy Image" : "Copy Text"),
                              icon: copied ? Check : Copy,
                              action: () => handleCopy(message.media_url || displayContent, message.type === "image"),
                            },
                          ].map(({ label, icon: Icon, action }) => (
                            <button
                              key={label}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                action();
                                setMenuOpen(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] rounded-xl cursor-pointer outline-none transition-all text-left"
                            >
                              <Icon size={14} className="text-white/40" strokeWidth={2} />
                              <span>{label}</span>
                            </button>
                          ))}

                          {/* Toggle "More Actions" / secondary actions */}
                          {!showMoreActions ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMoreActions(true);
                              }}
                              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-white/[0.04] rounded-xl cursor-pointer outline-none transition-all text-left"
                            >
                              <span>More Actions</span>
                              <ChevronDown size={12} className="text-indigo-400" />
                            </button>
                          ) : (
                            <>
                              <div className="h-px bg-white/[0.06] my-1" />
                              {[
                                ...(message.media_url ? [{
                                    label: "Download",
                                    icon: Download,
                                    action: () => handleDownload(message.media_url!, getCustomDownloadName(chatContext, message))
                                  }] : []),
                                {
                                  label: "Forward Message",
                                  icon: Forward,
                                  action: () => {
                                    if (onForward) onForward(message);
                                  }
                                },
                                {
                                  label: message.is_pinned ? "Unpin Message" : "Pin Message",
                                  icon: Pin,
                                  action: () => {
                                    if (onPin) onPin(message);
                                  }
                                },
                                ...(onStar ? [{
                                  label: message.is_starred ? "Unstar Message" : "Star Message",
                                  icon: Star,
                                  action: () => onStar(message)
                                }] : []),
                                {
                                  label: inlineTranslation ? "Hide Translation" : "Translate Inline",
                                  icon: Languages,
                                  keepOpen: !inlineTranslation,
                                  action: async () => {
                                    if (inlineTranslation) {
                                      setInlineTranslation(null);
                                      return;
                                    }
                                    setShowLangSelector(true);
                                  }
                                }
                              ].map(({ label, icon: Icon, action, keepOpen }) => (
                                <button
                                  type="button"
                                  key={label}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    action();
                                    if (!keepOpen) {
                                      setMenuOpen(false);
                                    }
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] rounded-xl cursor-pointer outline-none transition-all text-left"
                                >
                                  <Icon size={14} className="text-white/40" strokeWidth={2} />
                                  <span>{label}</span>
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowMoreActions(false);
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-white/[0.04] rounded-xl cursor-pointer outline-none transition-all text-left"
                              >
                                <span>Show Less</span>
                                <ChevronUp size={12} className="text-indigo-400" />
                              </button>
                            </>
                          )}

                          {/* Deletion actions for partner's messages (if allowed) */}
                          {(onDelete || onDeleteForMe) && (
                            <>
                              <div className="h-px bg-white/[0.06] my-1" />
                              {onDelete && canDeleteOthers && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(message.id);
                                    setMenuOpen(false);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl cursor-pointer outline-none transition-all text-left font-semibold"
                                >
                                  <Trash2 size={14} strokeWidth={2} />
                                  <span>Delete for Everyone</span>
                                </button>
                              )}
                              {onDeleteForMe && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteForMe(message.id);
                                    setMenuOpen(false);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white rounded-xl cursor-pointer outline-none transition-all text-left"
                                >
                                  <Trash2 size={14} strokeWidth={2} className="text-white/40" />
                                  <span>Delete for Me</span>
                                </button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {mounted && typeof window !== "undefined" && createPortal(
        <AnimatePresence>
          {isLightboxOpen && message.media_url && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md select-none"
              onClick={() => setIsLightboxOpen(false)}
            >
              {/* Header / Actions bar */}
              <div 
                className="absolute top-0 left-0 right-0 h-16 px-6 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[14px] font-bold text-white/90 truncate max-w-[240px] sm:max-w-md">
                    {message.file_name || "Shared Image"}
                  </span>
                  <span className="text-[11px] text-white/40 font-mono">
                    {formatTime(message.sent_at)}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleDownload(message.media_url!, message.file_name || "image.png")}
                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-90"
                    title="Download"
                  >
                    <Download size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(message.media_url!, true)}
                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-90"
                    title={copied ? "Copied Image!" : "Copy Image"}
                  >
                    {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(false)}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition-all active:scale-90"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Img frame */}
              <motion.div
                initial={{ scale: 0.9, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 15 }}
                transition={{ type: "spring", damping: 25, stiffness: 260 }}
                className="relative max-w-[94vw] max-h-[82dvh] overflow-hidden rounded-2xl flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={message.media_url}
                  alt={message.file_name || "Preview"}
                  className="max-w-full max-h-[82dvh] object-contain rounded-2xl select-none pointer-events-none"
                />
              </motion.div>
             </motion.div>
           )}
         </AnimatePresence>,
         document.body
       )}

      {mounted && typeof window !== "undefined" && createPortal(
        <AnimatePresence>
          {translateOpen && (
            <TranslateModal
              isOpen={translateOpen}
              onClose={() => setTranslateOpen(false)}
              text={message.content}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
});

MessageItem.displayName = "MessageItem";
export default MessageItem;
