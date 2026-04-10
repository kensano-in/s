"use client";

import { useState, useRef } from "react";
import { 
  Send, 
  Smile, 
  Mic, 
  ImageIcon,
  Paperclip,
  X,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import * as Popover from "@radix-ui/react-popover";
import EmojiPicker from "./EmojiPicker";
import { createClient } from "@/lib/supabase/client";
import { SPRING } from "@/lib/motion";
import TouchRipple from "@/components/ui/TouchRipple";

export interface ChatInputProps {
  onSendText: (content: string, scheduledAt?: Date) => void;
  onSendFile: (url: string, fileName: string, mimeType: string, scheduledAt?: Date) => void;
  onSendVoice?: (url: string, duration: number) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  replyTo?: { id: string; content: string; senderDisplay?: string } | null;
  onCancelReply?: () => void;
}

export default function ChatInput({
  onSendText,
  onSendFile,
  onSendVoice,
  onTyping,
  disabled = false,
  placeholder = "Message...",
  replyTo,
  onCancelReply,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDur, setRecordingDur] = useState(0);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDur(0);
      
      durTimerRef.current = setInterval(() => {
        setRecordingDur(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Could not start recording:', err);
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
           const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
           setIsUploading(true);
           try {
             const supabase = createClient();
             const path = `voice-${Date.now()}-${Math.random().toString(36).slice(2)}.webm`;
             const { data, error } = await supabase.storage.from('chat-files').upload(path, blob, { cacheControl: '3600', upsert: false });
             if (error) throw error;
             const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(data.path);
             onSendVoice?.(urlData.publicUrl, recordingDur);
           } catch(err) {
              console.error('Voice upload failed', err);
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
      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage.from('chat-files').upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(data.path);
      onSendFile(urlData.publicUrl, file.name, file.type);
    } catch (err: any) {
      console.error('Upload failed:', err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    
    // Typing indicator logic
    onTyping?.(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping?.(false), 2000);

    // Auto-resize
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    
    onSendText(trimmed);
    setText("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="px-6 py-4 bg-background border-t border-surface-border">
      {/* Reply Banner */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={SPRING.primary}
            className="flex items-center justify-between px-4 py-3 mb-3 bg-surface-elevated border border-surface-border rounded-xl"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                Replying to {replyTo.senderDisplay}
              </span>
              <p className="text-sm text-foreground-muted truncate">{replyTo.content}</p>
            </div>
            <button onClick={onCancelReply} className="p-1 hover:bg-white/5 rounded-full">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-3 max-w-6xl mx-auto">
        {/* Attachment Menu */}
        <Popover.Root onOpenChange={setIsAttachmentOpen}>
          <Popover.Trigger asChild>
            <button className="p-3 text-foreground-muted hover:text-white hover:bg-white/5 rounded-full transition-all shrink-0">
              <Plus size={24} className={clsx("transition-transform duration-normal ease-spring", isAttachmentOpen && "rotate-45")} />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content 
              className="z-[100] bg-surface-elevated border border-surface-border rounded-2xl p-2 shadow-2xl animate-fade-in flex flex-col gap-1 min-w-[160px]"
              sideOffset={10}
            >
              <div className="flex flex-col">
                {/* Hidden inputs */}
                <input ref={imageInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value=''; }} />
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,application/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value=''; }} />
                <button onClick={() => imageInputRef.current?.click()} className="stagger-item flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:bg-white/5 rounded-lg cursor-pointer transition-colors w-full">
                  <ImageIcon size={18} className="text-primary" />
                  <span>Photo or Video</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="stagger-item flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:bg-white/5 rounded-lg cursor-pointer transition-colors w-full">
                  <Paperclip size={18} className="text-emerald-500" />
                  <span>Document</span>
                </button>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* Input Field or Recording Bar */}
        <motion.div 
          layout
          className="flex-1 flex items-end bg-[#121212] border border-[#262626] rounded-[24px] overflow-hidden focus-within:border-blue-500/50 focus-within:shadow-glow-primary"
          style={{ transition: 'border-color 100ms ease, box-shadow 100ms ease' }}
        >
          {isRecording ? (
            <div className="flex-1 flex items-center justify-between px-5 py-3.5 h-[50px]">
               <div className="flex items-center gap-3">
                  <motion.div 
                     animate={{ opacity: [1, 0.4, 1] }} 
                     transition={{ repeat: Infinity, duration: 1.5 }}
                     className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)]" 
                  />
                  <span className="text-sm font-black tracking-widest text-red-500 w-16">
                     {Math.floor(recordingDur / 60)}:{(recordingDur % 60).toString().padStart(2, '0')}
                  </span>
               </div>
               <button 
                  onClick={() => stopRecording(true)} 
                  className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors"
               >
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
                placeholder={placeholder}
                rows={1}
                className="flex-1 bg-transparent px-5 py-3.5 text-[15px] text-white placeholder:text-foreground-muted resize-none focus:outline-none max-h-[160px]"
              />
              
              <motion.button 
                type="button" 
                onClick={() => setIsEmojiOpen(!isEmojiOpen)}
                whileTap={{ scale: 0.85 }}
                transition={SPRING.micro}
                className="p-3.5 text-foreground-muted hover:text-white transition-colors shrink-0 active:scale-95 duration-micro ease-spring"
              >
                <Smile size={20} />
              </motion.button>
              
              <EmojiPicker 
                isOpen={isEmojiOpen} 
                onClose={() => setIsEmojiOpen(false)} 
                onEmojiSelect={handleEmojiSelect} 
              />
            </>
          )}
        </motion.div>

        {/* Action Button — TouchRipple provides Axiom 14: Interaction Field */}
        <TouchRipple disabled={disabled || isUploading} className="rounded-full shrink-0">
          <motion.button
            layout
            whileTap={{ scale: 0.9 }}
            onClick={() => {
               if (isRecording) stopRecording(false);
               else if (text.trim()) handleSend();
               else startRecording();
            }}
            disabled={disabled || isUploading}
            className={clsx(
              "p-3.5 rounded-full transition-all flex items-center justify-center",
              (text.trim() || isRecording)
                ? "bg-blue-600 text-white shadow-glow-primary hover:bg-blue-500" 
                : "bg-[#121212] border border-[#262626] text-foreground-muted hover:bg-[#1f1f1f] hover:text-white"
            )}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {(text.trim() || isRecording) ? (
                <motion.div
                  key="send"
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  transition={SPRING.micro}
                >
                  {isUploading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                </motion.div>
              ) : (
                <motion.div
                  key="mic"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={SPRING.micro}
                >
                  <Mic size={24} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </TouchRipple>
      </div>
    </div>
  );
}
