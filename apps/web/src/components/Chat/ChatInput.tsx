"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Send,
  Smile,
  Mic,
  ImageIcon,
  Paperclip,
  X,
  Plus,
  Square,
  MapPin,
  Ghost,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import * as Popover from "@radix-ui/react-popover";
import EmojiPicker from "./EmojiPicker";
import { createClient } from "@/lib/supabase/client";
import TouchRipple from "@/components/ui/TouchRipple";

export interface ChatInputProps {
  onSendText: (content: string, viewOnce?: boolean) => void;
  onSendFile: (url: string, fileName: string, mimeType: string, viewOnce?: boolean) => void;
  onSendVoice?: (url: string, duration: number) => void;
  onSendLocation?: (lat: number, lng: number, address: string | null, isLive: boolean) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  replyTo?: { id: string; content: string; senderDisplay?: string } | null;
  onCancelReply?: () => void;
  isMuted?: boolean;
  muteUntil?: string | null;
}

export default function ChatInput({
  onSendText,
  onSendFile,
  onSendVoice,
  onSendLocation,
  onTyping,
  disabled = false,
  placeholder = "Message...",
  replyTo,
  onCancelReply,
  isMuted = false,
  muteUntil = null,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDur, setRecordingDur] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [sendRecoil, setSendRecoil] = useState(false);
  const [isGhostMode, setIsGhostMode] = useState(false);

  // If locally expired, clear the mute visual
  const [localMuted, setLocalMuted] = useState(isMuted);
  
  // Re-check mute
  useEffect(() => {
    if (!muteUntil) {
      setLocalMuted(isMuted);
      return;
    }
    const check = () => setLocalMuted(new Date(muteUntil) > new Date());
    check();
    const interval = setInterval(check, 1000 * 30);
    return () => clearInterval(interval);
  }, [isMuted, muteUntil]);

  const actuallyDisabled = disabled || localMuted;

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartX = useRef<number | null>(null);
  const [swipeDelta, setSwipeDelta] = useState(0);

  const hasText = text.trim().length > 0;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDur(0);
      durTimerRef.current = setInterval(() => setRecordingDur(prev => prev + 1), 1000);
    } catch (err) {
      console.error("Could not start recording:", err);
    }
  };

  const stopRecording = (cancel = false) => {
    if (!mediaRecorderRef.current) return;
    return new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        setIsRecording(false);
        if (durTimerRef.current) clearInterval(durTimerRef.current);
        mediaRecorderRef.current!.stream.getTracks().forEach(t => t.stop());
        if (!cancel && audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          setIsUploading(true);
          try {
            const supabase = createClient();
            const path = `voice-${Date.now()}-${Math.random().toString(36).slice(2)}.webm`;
            const { data, error } = await supabase.storage.from("chat-files").upload(path, blob, { cacheControl: "3600", upsert: false });
            if (error) throw error;
            const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(data.path);
            onSendVoice?.(urlData.publicUrl, recordingDur);
          } catch (err) {
            console.error("Voice upload failed", err);
          } finally {
            setIsUploading(false);
          }
        }
        resolve();
      };
      mediaRecorderRef.current!.stop();
    });
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage.from("chat-files").upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(data.path);
      onSendFile(urlData.publicUrl, file.name, file.type, isGhostMode);
      if (isGhostMode) setIsGhostMode(false);
    } catch (err: any) {
      console.error("Upload failed:", err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    onTyping?.(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping?.(false), 2000);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  };

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    setSendRecoil(true);
    setTimeout(() => setSendRecoil(false), 300);
    onSendText(trimmed, isGhostMode);
    onTyping?.(false);
    setText("");
    if (isGhostMode) setIsGhostMode(false);
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.focus();
    }
  }, [text, disabled, onSendText, isGhostMode]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setText(prev => prev + emoji);
    inputRef.current?.focus();
    setIsEmojiOpen(false);
  };

  return (
    <div className="px-3 pt-2" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 1rem))" }}>
      {/* Mute Banner */}
      <AnimatePresence>
        {localMuted && (
          <motion.div
            initial={{ opacity: 0, y: 8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 8, height: 0 }}
            className="flex items-center justify-between px-4 py-2.5 mb-2 rounded-2xl bg-red-500/10 border border-red-500/20"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-0.5">
                Action Restricted
              </span>
              <p className="text-[13px] text-white/50 truncate">
                You have been muted from sending messages here.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply Banner */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, y: 8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 8, height: 0 }}
            className="flex items-center justify-between px-4 py-2.5 mb-2 rounded-2xl border border-primary/20 bg-primary/[0.06]"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">
                Replying to {replyTo.senderDisplay}
              </span>
              <p className="text-[13px] text-white/50 truncate">{replyTo.content}</p>
            </div>
            <button onClick={onCancelReply} className="p-1.5 hover:bg-white/[0.08] rounded-full ml-3 text-white/30 hover:text-white transition-colors">
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={clsx("flex items-end gap-2 transition-opacity", actuallyDisabled ? "opacity-50 pointer-events-none" : "")}>
        {/* Attachment */}
        <Popover.Root onOpenChange={setIsAttachmentOpen}>
          <Popover.Trigger asChild>
            <motion.button
              whileHover={{ scale: 1.08, y: -1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 600, damping: 28 }}
              className="p-3 text-white/30 hover:text-white hover:bg-white/[0.07] rounded-2xl transition-colors shrink-0"
            >
              <Plus size={22} className={clsx("transition-transform duration-200", isAttachmentOpen && "rotate-45")} />
            </motion.button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="z-[200] p-2 rounded-2xl outline-none flex flex-col gap-0.5 min-w-[172px]"
              style={{
                background: "rgba(10, 10, 18, 0.95)",
                backdropFilter: "blur(32px) saturate(200%)",
                WebkitBackdropFilter: "blur(32px) saturate(200%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 16px 48px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
              sideOffset={12}
            >
              <input ref={imageInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,application/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />
              <button onClick={() => imageInputRef.current?.click()} className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.07] rounded-xl transition-all w-full text-left">
                <ImageIcon size={17} className="text-primary" /><span>Photo or Video</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.07] rounded-xl transition-all w-full text-left">
                <Paperclip size={17} className="text-emerald-400" /><span>Document</span>
              </button>
              {onSendLocation && (
                <>
                  <button
                    onClick={() => {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => onSendLocation(pos.coords.latitude, pos.coords.longitude, null, false),
                        () => alert("Location access denied.")
                      );
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.07] rounded-xl transition-all w-full text-left"
                  >
                    <MapPin size={17} className="text-orange-400" /><span>Share Location</span>
                  </button>
                  <button
                    onClick={() => {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => onSendLocation(pos.coords.latitude, pos.coords.longitude, null, true),
                        () => alert("Location access denied. Enable location in browser settings.")
                      );
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.07] rounded-xl transition-all w-full text-left"
                  >
                    <MapPin size={17} className="text-green-400" /><span>Share Live Location (1h)</span>
                  </button>
                </>
              )}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* Ghost Mode Toggle */}
        <motion.button
          whileHover={{ scale: 1.08, y: -1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 600, damping: 28 }}
          onClick={() => setIsGhostMode(v => !v)}
          title={isGhostMode ? "Ghost mode ON — next message is view-once" : "Enable ghost (view-once) mode"}
          className={clsx(
            "p-3 rounded-2xl transition-all shrink-0 relative",
            isGhostMode
              ? "text-purple-300 bg-purple-500/20"
              : "text-white/20 hover:text-white/60 hover:bg-white/[0.06]"
          )}
        >
          <Ghost size={20} />
          {isGhostMode && (
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              animate={{ boxShadow: ["0 0 0px rgba(168,85,247,0)", "0 0 12px rgba(168,85,247,0.6)", "0 0 0px rgba(168,85,247,0)"] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </motion.button>

        {/* Input + Emoji */}
        <motion.div
          layout
          animate={{
            boxShadow: isGhostMode
              ? "0 0 0 1.5px rgba(168,85,247,0.6), 0 8px 32px rgba(0,0,0,0.4)"
              : isFocused
                ? "0 0 0 1.5px rgba(98,0,238,0.5), 0 8px 32px rgba(0,0,0,0.4)"
                : "0 4px 20px rgba(0,0,0,0.3)",
          }}
          transition={{ duration: 0.15 }}
          className={clsx(
            "flex-1 flex items-end rounded-[26px] overflow-hidden border transition-colors duration-200",
            isFocused ? "border-primary/40" : "border-white/[0.06]"
          )}
          style={{
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          {isRecording ? (
            <div
              className="flex-1 flex items-center justify-between px-5 py-3.5 h-[52px] select-none"
              style={{ transform: `translateX(${Math.min(0, swipeDelta * 0.4)}px)`, opacity: swipeDelta < -30 ? Math.max(0.4, 1 + swipeDelta / 150) : 1, transition: swipeDelta === 0 ? 'transform 0.3s, opacity 0.3s' : 'none' }}
              onTouchStart={(e) => { dragStartX.current = e.touches[0].clientX; }}
              onTouchMove={(e) => {
                if (dragStartX.current === null) return;
                const delta = e.touches[0].clientX - dragStartX.current;
                setSwipeDelta(delta);
              }}
              onTouchEnd={() => {
                if (swipeDelta < -80) {
                  stopRecording(true);
                }
                dragStartX.current = null;
                setSwipeDelta(0);
              }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_12px_rgba(239,68,68,0.8)]"
                />
                <span className="text-sm font-bold tabular-nums text-red-400 w-14">
                  {Math.floor(recordingDur / 60)}:{(recordingDur % 60).toString().padStart(2, "0")}
                </span>
              </div>
              <span className="text-[10px] text-white/20 tracking-wider">
                {swipeDelta < -30 ? '← Release to cancel' : '← Slide to cancel'}
              </span>
              <button onClick={() => stopRecording(true)} className="text-[11px] font-semibold uppercase tracking-widest text-white/25 hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <>
              <textarea
                ref={inputRef}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                rows={1}
                className="flex-1 bg-transparent px-5 py-3.5 text-[15px] text-white placeholder:text-white/20 resize-none focus:outline-none max-h-[140px] leading-relaxed"
              />
              <motion.button
                type="button"
                onClick={() => setIsEmojiOpen(!isEmojiOpen)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.88 }}
                transition={{ type: "spring", stiffness: 600, damping: 28 }}
                className={clsx(
                  "p-3.5 transition-colors shrink-0",
                  isEmojiOpen ? "text-primary" : "text-white/20 hover:text-white/60"
                )}
              >
                <Smile size={20} />
              </motion.button>
              <EmojiPicker isOpen={isEmojiOpen} onClose={() => setIsEmojiOpen(false)} onEmojiSelect={handleEmojiSelect} />
            </>
          )}
        </motion.div>

        {/* Send / Mic / Stop */}
        <TouchRipple disabled={disabled || isUploading} className="rounded-full shrink-0">
          <motion.button
            onClick={() => {
              if (isRecording) stopRecording(false);
              else if (hasText) handleSend();
              else startRecording();
            }}
            disabled={disabled || isUploading}
            animate={sendRecoil ? { scale: [1, 0.85, 1.1, 1] } : {}}
            whileHover={{ scale: 1.06, y: -1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 600, damping: 28 }}
            className={clsx(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all",
              (hasText || isRecording)
                ? "text-white shadow-lg"
                : "text-white/30 hover:text-white border border-white/[0.07]"
            )}
            style={(hasText || isRecording) ? {
              background: "linear-gradient(135deg, #7c00ff, #5000df)",
              boxShadow: "0 4px 24px rgba(98,0,238,0.5), 0 0 0 1px rgba(255,255,255,0.1) inset",
            } : {
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {isRecording ? (
                <motion.div key="stop" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 600, damping: 28 }}>
                  <Square size={18} fill="white" />
                </motion.div>
              ) : hasText ? (
                <motion.div key="send" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 45 }} transition={{ type: "spring", stiffness: 600, damping: 28 }}>
                  <Send size={19} />
                </motion.div>
              ) : (
                <motion.div key="mic" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 600, damping: 28 }}>
                  <Mic size={20} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </TouchRipple>
      </div>
    </div>
  );
}
