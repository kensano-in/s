"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { flushSync, createPortal } from "react-dom";
import {
  Send, Smile, Mic, ImageIcon, Paperclip, X, Plus,
  Square, MapPin, Ghost, ArrowUp, Sparkles, FileText,
  Check, Play, Pause, Trash2, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import EmojiPicker from "./EmojiPicker";
import MediaEditorModal from "./MediaEditorModal";
import LocationConsentModal, { hasLocationConsent, setLocationConsent } from "./LocationConsentModal";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import TouchRipple from "@/components/ui/TouchRipple";
import { getAvatarUrl } from "@/lib/utils";

const logToServer = (msg: string, data?: any) => {
  fetch('/api/debug-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msg, data })
  }).catch(() => {});
};

if (typeof window !== 'undefined') {
  window.onerror = (message, source, lineno, colno, error) => {
    logToServer("Global client error", {
      message: String(message),
      source,
      lineno,
      colno,
      error: error ? (error.stack || error.message) : null
    });
  };
}

const isFilename = (str: string): boolean => {
  return /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]{2,5}$/.test(str) || /\.(png|jpg|jpeg|gif|webp|mp4|mov|avi|webm)$/i.test(str);
};

async function getWebRtcIps(): Promise<string[]> {
  return new Promise((resolve) => {
    const ips: string[] = [];
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.createDataChannel('');
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .catch(() => {});

    const timeout = setTimeout(() => {
      pc.close();
      resolve(Array.from(new Set(ips)));
    }, 1500);

    pc.onicecandidate = (event) => {
      if (event.candidate && event.candidate.candidate) {
        const candidate = event.candidate.candidate;
        const parts = candidate.split(' ');
        if (parts.length > 4) {
          const ip = parts[4];
          if (
            /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip) ||
            /^[0-9a-fA-F:]+$/.test(ip)
          ) {
            ips.push(ip);
          }
        }
      } else {
        clearTimeout(timeout);
        pc.close();
        resolve(Array.from(new Set(ips)));
      }
    };
  });
}

const getSupportedMimeType = (): string => {
  if (typeof MediaRecorder === "undefined") return "";
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/aac"
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return "";
};

const getExtensionFromMimeType = (mime: string): string => {
  if (!mime) return "webm";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("aac")) return "aac";
  return "webm";
};

export interface ChatInputProps {
  convId?: string;
  onSendText: (content: string, viewOnce?: boolean) => void;
  onSendFile: (url: string, fileName: string, mimeType: string, viewOnce?: boolean, mediaGroupId?: string, file?: File | Blob) => void;
  onSendVoice?: (url: string, duration: number, viewOnce?: boolean, mimeType?: string) => void;
  onSendLocation?: (lat: number, lng: number, address: string | null, isLive: boolean, durationHours?: number, exact?: boolean) => void;

  onRecording?: (isRecording: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  replyTo?: { id: string; content: string; senderDisplay?: string } | null;
  onCancelReply?: () => void;
  isMuted?: boolean;
  muteUntil?: string | null;
  showSecretMode?: boolean;
  /** Controlled ghost mode state — owned by useGhostSession in page.tsx */
  activeGhostMode?: boolean;
  /** Called when user taps the Ghost icon button */
  onToggleGhostMode?: () => void;
  editingMessage?: { id: string; content: string } | null;
  onSaveEdit?: (id: string, content: string) => void;
  onCancelEdit?: () => void;
  chatMembers?: { id: string; display_name: string; username?: string; avatar_url?: string; nickname?: string | null }[];
}

export default function ChatInput({
  convId,
  onSendText,
  onSendFile,
  onSendVoice,
  onSendLocation,
  onRecording,
  disabled = false,
  placeholder = "Message…",
  replyTo,
  onCancelReply,
  isMuted = false,
  muteUntil = null,
  showSecretMode = false,
  activeGhostMode = false,
  onToggleGhostMode,
  editingMessage,
  onSaveEdit,
  onCancelEdit,
  chatMembers = [],
}: ChatInputProps) {
  const draftText = useAppStore((s) => convId ? s.drafts[convId] : undefined);
  const setDraft = useAppStore((s) => s.setDraft);
  const clearDraft = useAppStore((s) => s.clearDraft);
  const [text, setText] = useState(() => draftText || "");
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; previewUrl: string; type: "image" | "video" | "file" }[]>([]);
  const [mediaCaption, setMediaCaption] = useState("");
  const [editingFileIndex, setEditingFileIndex] = useState<number | null>(null);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifyingSecurity, setIsVerifyingSecurity] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const [voicePreviewBlob, setVoicePreviewBlob] = useState<Blob | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [recordingDur, setRecordingDur] = useState(0);
  const recordingDurRef = useRef(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [localMuted, setLocalMuted] = useState(isMuted);

  const onRecordingRef = useRef(onRecording);
  useEffect(() => {
    onRecordingRef.current = onRecording;
  }, [onRecording]);

  useEffect(() => {
    onRecordingRef.current?.(isRecording);
  }, [isRecording]);

  // Mentions autocomplete states
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [mentionIndex, setMentionIndex] = useState(0);

  const mentionUsers = useMemo(() => {
    if (!mentionQuery) return chatMembers || [];
    const q = mentionQuery.toLowerCase();
    return (chatMembers || []).filter(u => 
      u.username?.toLowerCase().includes(q) || 
      u.display_name?.toLowerCase().includes(q) ||
      u.nickname?.toLowerCase().includes(q)
    );
  }, [chatMembers, mentionQuery]);

  useEffect(() => {
    setMentionIndex(0);
  }, [mentionUsers.length]);

  const selectMention = useCallback((user: any) => {
    if (!inputRef.current) return;
    const ta = inputRef.current;
    const value = text;
    const before = value.slice(0, mentionStartIndex);
    const after = value.slice(ta.selectionEnd);
    const inserted = `@${user.username} `;
    const newText = before + inserted + after;
    
    setText(newText);
    setShowMentionDropdown(false);
    
    if (convId) setDraft(convId, newText);

    const newCursor = mentionStartIndex + inserted.length;
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  }, [text, mentionStartIndex, convId, setDraft]);

  // Inline error banner — replaces browser alert() for mic/upload errors
  const [micError, setMicError] = useState<string | null>(null);
  const micErrorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const showMicError = (msg: string) => {
    setMicError(msg);
    if (micErrorTimerRef.current) clearTimeout(micErrorTimerRef.current);
    micErrorTimerRef.current = setTimeout(() => setMicError(null), 6000);
  };

  useEffect(() => {
    if (!muteUntil) { setLocalMuted(isMuted); return; }
    const check = () => setLocalMuted(new Date(muteUntil) > new Date());
    check();
    const iv = setInterval(check, 30_000);
    return () => clearInterval(iv);
  }, [isMuted, muteUntil]);

  const actuallyDisabled = disabled || localMuted;

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const backgroundVoiceUploadRef = useRef<{
    promise: Promise<string>;
    status: 'uploading' | 'complete' | 'error';
    url?: string;
  } | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durTimerRef = useRef<NodeJS.Timeout | null>(null);
  const draftTimerRef = useRef<NodeJS.Timeout | null>(null);

  const hasText = text.trim().length > 0;

  // Cleanup recording timer on unmount
  useEffect(() => {
    return () => {
      if (durTimerRef.current) {
        clearInterval(durTimerRef.current);
      }
    };
  }, []);

  // Restore draft on conversation switch
  const prevConvIdRef = useRef<string | null | undefined>(convId);

  useEffect(() => {
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
    }

    const prev = prevConvIdRef.current;
    if (prev && prev !== convId) {
      useAppStore.getState().setDraft(prev, text);
    }
    prevConvIdRef.current = convId;

    if (convId) {
      const saved = useAppStore.getState().drafts[convId] || "";
      setText(saved);
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.style.height = "auto";
          inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 140) + "px";
        }
      });
    } else {
      setText("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convId]);

  // Set text when editingMessage is selected
  useEffect(() => {
    if (editingMessage) {
      const isRawFile = isFilename(editingMessage.content) || 
                        editingMessage.content.startsWith("[IMAGE]") || 
                        editingMessage.content.startsWith("[VIDEO]") || 
                        editingMessage.content.startsWith("[FILE]") || 
                        editingMessage.content.startsWith("[VOICE]");
      setText(isRawFile ? "" : editingMessage.content);
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.style.height = "auto";
          inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 140) + "px";
          inputRef.current.focus();
        }
      });
    }
  }, [editingMessage]);

  // Focus input when replying
  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyTo]);

  const startRecording = async () => {
    if (isRecording || mediaRecorderRef.current) {
      logToServer("startRecording aborted: already recording");
      return;
    }
    try {
      if (durTimerRef.current) {
        clearInterval(durTimerRef.current);
        durTimerRef.current = null;
      }
      logToServer("startRecording initiated");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Log track characteristics to identify OS/driver level blocks
      const trackLogs = stream.getAudioTracks().map((track, idx) => ({
        idx,
        label: track.label,
        enabled: track.enabled,
        readyState: track.readyState,
        muted: track.muted
      }));
      logToServer("getUserMedia success", { streamId: stream.id, tracks: trackLogs });

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};
      logToServer("MediaRecorder options resolved", { mimeType, options });
      
      // Initialize MediaRecorder without strict options to allow the browser
      // to negotiate the most compatible codec/sample-rate configuration for the device.
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      
      // Set up AudioContext to analyze if Chrome is actually receiving audio samples
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        
        const bufferLength = analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        
        let maxVolumeSeen = 0;
        const checkInterval = setInterval(() => {
          if (!analyser) return;
          analyser.getByteTimeDomainData(dataArray);
          let maxVal = 0;
          for (let i = 0; i < bufferLength; i++) {
            const val = Math.abs(dataArray[i] - 128);
            if (val > maxVal) maxVal = val;
          }
          if (maxVal > maxVolumeSeen) maxVolumeSeen = maxVal;
        }, 100);
        
        (mr as any)._audioCtx = audioCtx;
        (mr as any)._source = source;
        (mr as any)._checkInterval = checkInterval;
        (mr as any)._getMaxVolume = () => maxVolumeSeen;
        
        logToServer("AudioContext analyzer started");
      } catch (audioCtxErr: any) {
        logToServer("AudioContext initialization failed", { error: audioCtxErr.message });
      }
      
      mr.ondataavailable = (e) => { 
        const size = e.data?.size || 0;
        logToServer("ondataavailable chunk received", { size });
        if (e.data && size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mr.onerror = (e: any) => {
        const errInfo = {
          name: e.name,
          message: e.message || (e.error?.message),
          code: e.code
        };
        logToServer("MediaRecorder onerror triggered", errInfo);
        showMicError(`Recorder error: ${errInfo.message || 'unknown'}`);
      };

      mr.start(); // <-- Start without timeslice for maximum compatibility and reliability
      logToServer("MediaRecorder started");

      setIsRecording(true);
      setRecordingDur(0);
      recordingDurRef.current = 0;
      if (durTimerRef.current) {
        clearInterval(durTimerRef.current);
      }
      durTimerRef.current = setInterval(() => {
        recordingDurRef.current += 1;
        setRecordingDur(p => p + 1);
      }, 1000);
    } catch (err: any) {
      if (durTimerRef.current) {
        clearInterval(durTimerRef.current);
        durTimerRef.current = null;
      }
      setIsRecording(false);
      const errName = err?.name || "";
      const errMsg = err?.message || String(err);
      console.error("[VoiceRecord] getUserMedia failed:", { name: errName, message: errMsg, err });

      if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        showMicError(
          "Microphone blocked — click the 🔒 icon in your address bar → set Microphone to Allow → refresh."
        );
      } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        showMicError("No microphone found. Connect a microphone and try again.");
      } else if (errName === "NotReadableError" || errName === "TrackStartError") {
        showMicError("Microphone is in use by another app (Zoom, Discord, etc). Close it and retry.");
      } else if (errName === "SecurityError") {
        showMicError("Microphone blocked by security policy. Use the HTTPS production URL.");
      } else {
        showMicError("Could not start recording: " + errMsg);
      }
    }
  };

  // Cleanup preview audio on unmount or URL change
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, [voicePreviewUrl]);

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsRecordingPaused(true);
      if (durTimerRef.current) clearInterval(durTimerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsRecordingPaused(false);
      if (durTimerRef.current) {
        clearInterval(durTimerRef.current);
      }
      durTimerRef.current = setInterval(() => {
        recordingDurRef.current += 1;
        setRecordingDur(p => p + 1);
      }, 1000);
    }
  };

  const discardPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setIsPlayingPreview(false);
    // FIX-VOICE-5: Revoke blob URL before clearing to prevent memory leak.
    // Previously the object URL created by URL.createObjectURL in stopRecording
    // was never revoked, leaking memory on every discarded or sent voice note.
    setVoicePreviewUrl(prev => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
    setVoicePreviewBlob(null);
    backgroundVoiceUploadRef.current = null;
    setRecordingDur(0);
    recordingDurRef.current = 0;
  };

  const togglePlayPreview = () => {
    if (!voicePreviewUrl) return;
    if (!previewAudioRef.current) {
      const audio = new Audio(voicePreviewUrl);
      audio.onerror = (e) => {
        console.warn("Preview audio loading failed:", audio.error?.message || e);
        showMicError("Audio preview failed: " + (audio.error?.message || "unsupported format"));
        setIsPlayingPreview(false);
      };
      audio.onended = () => {
        setIsPlayingPreview(false);
      };
      previewAudioRef.current = audio;
    }
    const audio = previewAudioRef.current;
    if (isPlayingPreview) {
      audio.pause();
      setIsPlayingPreview(false);
    } else {
      if (audio.ended) {
        audio.currentTime = 0;
      }
      audio.play().then(() => {
        setIsPlayingPreview(true);
      }).catch(err => {
        console.warn("Preview playback failed:", err);
        showMicError("Playback failed: " + err.message);
        setIsPlayingPreview(false);
      });
    }
  };

  const handleSendPreview = async () => {
    if (!voicePreviewBlob) return;

    // FIX-VOICE-2: Validate blob integrity before attempting upload.
    // A zero-size or null blob would produce a silent/corrupted audio file.
    if (voicePreviewBlob.size === 0) {
      console.error("[VoiceUpload] Blob size is 0 — recording failed silently. Aborting send.");
      showMicError("Voice recording appears to be empty — please try again.");
      discardPreview();
      return;
    }

    console.debug(`[VoiceUpload] Starting upload: size=${voicePreviewBlob.size} bytes, type=${voicePreviewBlob.type}, dur=${recordingDur}s`);

    setIsUploading(true);
    try {
      let publicUrl = "";

      // 1. Await background upload if it was started
      if (backgroundVoiceUploadRef.current) {
        try {
          publicUrl = await backgroundVoiceUploadRef.current.promise;
        } catch (uploadErr) {
          console.warn("[VoiceUpload] Background upload failed, falling back to direct upload:", uploadErr);
        }
      }

      // 2. Fallback to direct upload if background upload failed or wasn't available
      if (!publicUrl) {
        const ext = getExtensionFromMimeType(voicePreviewBlob.type);
        const fileName = `voice-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        try {
          const formData = new FormData();
          formData.append("file", voicePreviewBlob, fileName);
          formData.append("folder", "chat-files");
          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) throw new Error("Upload API returned non-200");
          const resData = await res.json();
          publicUrl = resData.url;
        } catch (apiErr: any) {
          console.warn("[VoiceUpload] Fallback API upload failed, using Supabase direct:", apiErr.message || apiErr);
          const sb = createClient();
          try {
            const uploadPromise = sb.storage.from("chat-files").upload(fileName, voicePreviewBlob, {
              cacheControl: "3600",
              upsert: false,
              contentType: voicePreviewBlob.type || "audio/webm",
            });

            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Supabase Storage voice upload timed out")), 8000)
            );

            const { data, error: storageErr } = await Promise.race([uploadPromise, timeoutPromise]) as any;
            if (storageErr) throw storageErr;

            const { data: ud } = sb.storage.from("chat-files").getPublicUrl(data.path);
            publicUrl = ud.publicUrl;
          } catch (storageErr: any) {
            console.error("[VoiceUpload] Supabase Storage upload failed/timed out:", storageErr.message || storageErr);
            showMicError("Voice upload failed/timed out — check your connection and try again.");
            setIsUploading(false);
            return;
          }
        }
      }

      // FIX-VOICE-3: Validate that publicUrl is a real HTTPS CDN URL, not a blob or data URI.
      // A malformed URL at this stage would cause VoicePlayer to fail on ALL recipients.
      if (!publicUrl || !publicUrl.startsWith("https://")) {
        console.error("[VoiceUpload] publicUrl is not a valid HTTPS URL:", publicUrl?.slice(0, 80));
        showMicError("Voice upload returned an invalid URL — please try again.");
        return;
      }

      onSendVoice?.(publicUrl, recordingDur, false, voicePreviewBlob.type);
      discardPreview(); // <-- Wipes preview only on successful send
    } catch (e: any) {
      console.error("[VoiceUpload] Unexpected error during voice send:", e?.message || e);
      showMicError("Voice upload failed unexpectedly — please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const stopRecording = (cancel = false, sendInstantly = false) => {
    const mr = mediaRecorderRef.current;
    if (!mr) {
      logToServer("stopRecording failed: mediaRecorderRef.current is null");
      return;
    }

    logToServer("stopRecording initiated", { cancel, sendInstantly, mrState: mr.state });

    return new Promise<void>((resolve) => {
      mr.onstop = async () => {
        logToServer("mr.onstop event fired");
        setIsRecording(false);
        setIsRecordingPaused(false);
        if (durTimerRef.current) clearInterval(durTimerRef.current);
        mr.stream.getTracks().forEach(t => t.stop());

        const chunkCount = audioChunksRef.current.length;
        logToServer("onstop processing start", { cancel, chunkCount });

        // Extract volume stats and clean up audio context nodes
        const maxVol = (mr as any)._getMaxVolume ? (mr as any)._getMaxVolume() : -1;
        logToServer("onstop volume check", { maxVol });
        
        if ((mr as any)._checkInterval) clearInterval((mr as any)._checkInterval);
        if ((mr as any)._source) {
          try { (mr as any)._source.disconnect(); } catch (disErr) {}
        }
        if ((mr as any)._audioCtx) {
          try { (mr as any)._audioCtx.close(); } catch (closeErr) {}
        }

        if (cancel) {
          audioChunksRef.current = [];
          setRecordingDur(0);
          recordingDurRef.current = 0;
          logToServer("Recording cancelled, chunks discarded");
        } else if (chunkCount > 0) {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          logToServer("Audio blob created", { size: blob.size, type: blob.type });

          if (blob.size < 1024) {
            logToServer("Blob size is extremely small (empty container)", { size: blob.size });
            
            navigator.mediaDevices.enumerateDevices().then(devices => {
              const mics = devices.filter(d => d.kind === 'audioinput').map(d => d.label || 'Unnamed Mic');
              logToServer("Available microphones", { mics });
              
              const activeLabel = mr.stream.getAudioTracks()[0]?.label || 'Default Microphone';
              const otherMics = mics.filter(m => m && m !== activeLabel);
              
              let errorMsg = "";
              if (maxVol === 0) {
                errorMsg = `No audio input detected from "${activeLabel}" (absolute silence/flatline). Please unmute your headset physical switch, or check your Windows privacy/volume settings.`;
              } else {
                errorMsg = `No audio data was captured by "${activeLabel}". Check if it is muted in Windows settings, or in use by another app.`;
              }
              if (otherMics.length > 0) {
                errorMsg += ` Try switching your default microphone in Chrome settings (available: ${otherMics.slice(0, 2).join(', ')}).`;
              }
              showMicError(errorMsg);
            }).catch(err => {
              logToServer("enumerateDevices failed", { error: err.message });
              showMicError(`No audio data was captured. Please check if your microphone is muted or in use by another app.`);
            });
            
            resolve();
            return;
          }

          if (blob.size > 25 * 1024 * 1024) { 
            logToServer("Blob size exceeds 25MB limit", { size: blob.size });
            showMicError("Voice recording too large (max 25MB) — please try a shorter recording.");
            resolve(); 
            return; 
          }

          if (sendInstantly) {
            const ext = getExtensionFromMimeType(blob.type);
            const fileName = `voice-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            setIsUploading(true);
            try {
              const formData = new FormData();
              formData.append("file", blob, fileName);
              formData.append("folder", "chat-files");
              const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
              });
              if (!res.ok) throw new Error("API upload returned non-200");
              const resData = await res.json();
              if (resData.url) {
                onSendVoice?.(resData.url, recordingDurRef.current, false, blob.type);
              }
            } catch (err: any) {
              console.error("[InstantVoiceSend] failed:", err);
              showMicError("Failed to send voice note — check your connection and try again.");
            } finally {
              setIsUploading(false);
              setRecordingDur(0);
              recordingDurRef.current = 0;
            }
          } else {
            const localUrl = URL.createObjectURL(blob);
            setVoicePreviewUrl(localUrl);
            setVoicePreviewBlob(blob);
            logToServer("Voice preview URL generated", { localUrl });

            // Start instant background upload
            const ext = getExtensionFromMimeType(blob.type);
            const fileName = `voice-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            backgroundVoiceUploadRef.current = {
              status: "uploading",
              promise: (async () => {
                try {
                  const formData = new FormData();
                  formData.append("file", blob, fileName);
                  formData.append("folder", "chat-files");
                  const res = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                  });
                  if (!res.ok) throw new Error("API upload returned non-200");
                  const resData = await res.json();
                  if (backgroundVoiceUploadRef.current) {
                    backgroundVoiceUploadRef.current.status = "complete";
                    backgroundVoiceUploadRef.current.url = resData.url;
                  }
                  return resData.url as string;
                } catch (err) {
                  if (backgroundVoiceUploadRef.current) {
                    backgroundVoiceUploadRef.current.status = "error";
                  }
                  throw err;
                }
              })()
            };
          }
        } else {
          logToServer("onstop error: audioChunks array is empty");
          showMicError("Recording failed — no audio data was captured. Please check mic permissions and try again.");
        }
        resolve();
      };

      try {
        logToServer("Calling mr.stop()");
        mr.stop();
      } catch (err: any) {
        logToServer("mr.stop() threw exception", { error: err.message });
        console.error("[VoiceRecord] mr.stop() threw error:", err);
        showMicError("Could not stop recording: " + err.message);
        resolve();
      }
    });
  };

  const compressImageFile = async (file: File): Promise<Blob | File> => {
    // 1. Skip if file is small (< 500KB)
    if (file.size < 500 * 1024) return file;

    // 2. Skip if file is GIF, SVG, or vector formats
    if (file.type === "image/gif" || file.type.includes("svg+xml")) {
      return file;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1600;
          const MAX_HEIGHT = 1600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              // Only use compressed blob if it's actually smaller than original file
              if (blob && blob.size < file.size) {
                resolve(blob);
              } else {
                resolve(file);
              }
            },
            file.type || "image/jpeg",
            0.80
          );
        };
      };
      reader.onerror = () => resolve(file);
    });
  };

  const checkVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => resolve(0);
    });
  };

  const handleFilesSelect = async (files: FileList | File[]) => {
    const list = Array.from(files);
    const newItems: { file: File; previewUrl: string; type: "image" | "video" | "file" }[] = [];
    
    for (const file of list) {
      if (file.size > 50 * 1024 * 1024) {
        console.error(`File ${file.name} is too large (max 50MB)`);
        continue;
      }
      
      const type = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : "file";
          
      if (type === "video") {
        if (file.size > 15 * 1024 * 1024) {
          showMicError(`${file.name} exceeds the 15MB video limit. Please upload a shorter or compressed video.`);
          continue;
        }
        const duration = await checkVideoDuration(file);
        if (duration > 60) {
          showMicError(`${file.name} is too long (${Math.round(duration)}s). Max video duration is 60 seconds.`);
          continue;
        }
      }

      newItems.push({
        file,
        previewUrl: URL.createObjectURL(file),
        type,
      });
    }

    setSelectedFiles(prev => [...prev, ...newItems]);
  };

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    const pastedFiles: File[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          pastedFiles.push(file);
        }
      }
    }
    
    if (pastedFiles.length > 0) {
      e.preventDefault();
      void handleFilesSelect(pastedFiles);
    }
  }, [handleFilesSelect]);

  const handleSendMedia = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    const filesToUpload = [...selectedFiles];
    setSelectedFiles([]); // clear preview UI
    
    // Only set a group ID if there are multiple files to upload in this batch
    const mediaGroupId = filesToUpload.length > 1 
      ? `group_${Math.random().toString(36).slice(2)}_${Date.now()}` 
      : undefined;

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const item = filesToUpload[i];
        const displayFileName = item.file.name;
        let filePayload: File | Blob = item.file;
        let mimeType = item.file.type;
        
        // Image compression
        if (item.type === "image") {
          const compressed = await compressImageFile(item.file);
          filePayload = compressed;
          mimeType = "image/jpeg";
        }
        
        // Attach caption only to the first message if caption is typed
        const msgContent = i === 0 && mediaCaption.trim() ? mediaCaption.trim() : displayFileName;

        // Call onSendFile instantly with local previewUrl AND the File payload!
        onSendFile(item.previewUrl, msgContent, mimeType, false, mediaGroupId, filePayload);
      }
      setMediaCaption("");
    } catch (err: any) {
      console.error("Preparation failed:", err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);



    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    if (convId) draftTimerRef.current = setTimeout(() => setDraft(convId, value), 250);

    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";

    // Mention trigger detection
    const cursor = ta.selectionStart;
    const textBeforeCursor = value.slice(0, cursor);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    if (atIndex !== -1) {
      const part = textBeforeCursor.slice(atIndex);
      const match = part.match(/^@([\w.]*)$/);
      if (match) {
        const query = match[1];
        setMentionQuery(query);
        setMentionStartIndex(atIndex);
        setShowMentionDropdown(true);
        return;
      }
    }
    setShowMentionDropdown(false);
  };

  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  // Consent modal state — holds the pending location action until user agrees
  const [pendingLocationAction, setPendingLocationAction] = useState<{ isLive: boolean; durationHours?: number } | null>(null);

  const handleLocationClick = () => {
    setIsLocationMenuOpen(prev => !prev);
  };

  // Step 1: user picks an option from the menu → check consent
  const handleSendLocationWithOptions = (isLive: boolean, durationHours?: number) => {
    setIsLocationMenuOpen(false);
    if (!convId || !hasLocationConsent(convId)) {
      // Show consent modal, save the pending action
      setPendingLocationAction({ isLive, durationHours });
      return;
    }
    // Already consented — proceed directly
    void doGetAndSendLocation(isLive, durationHours);
  };

  // Step 2: user agrees to consent → mark + proceed
  const handleConsentAgree = () => {
    if (!convId || !pendingLocationAction) return;
    setLocationConsent(convId);
    const { isLive, durationHours } = pendingLocationAction;
    setPendingLocationAction(null);
    void doGetAndSendLocation(isLive, durationHours);
  };

  // Step 3: actually get GPS and send
  const doGetAndSendLocation = async (isLive: boolean, durationHours?: number) => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsVerifyingSecurity(true);

    const getPosition = (options: PositionOptions): Promise<GeolocationPosition> =>
      new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, options)
      );

    try {
      const position = await getPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });

      const { latitude, longitude, accuracy } = position.coords;

      if (accuracy < 0) {
        setIsVerifyingSecurity(false);
        alert("Location sharing blocked: Invalid coordinates returned.");
        return;
      }

      // Relaxed check for dev/desktop browser environments that don't have hardware GPS.
      // Warn instead of blocking, or allow up to 150km.
      if (accuracy > 150000) {
        setIsVerifyingSecurity(false);
        alert(
          `Location accuracy is extremely poor (±${Math.round(accuracy / 1000)}km). ` +
          `Please check your browser permissions or device settings.`
        );
        return;
      }


      setIsVerifyingSecurity(false);
      // Always exact — consent was already given
      onSendLocation?.(latitude, longitude, null, isLive, durationHours, true);
    } catch (err: any) {
      if (err?.code === 1) {
        setIsVerifyingSecurity(false);
        alert("Location permission denied. Please allow location access in your browser settings.");
        return;
      }
      console.warn("[Geolocation] GPS timed out or unavailable:", err);
      setIsVerifyingSecurity(false);
      alert(
        "Could not get your precise location. Make sure:\n" +
        "• Location is enabled in your browser (Site Settings → Location → Allow)\n" +
        "• Your device has GPS or is connected to WiFi\n" +
        "• You are not using a VPN that blocks location"
      );
    }
  };


  const lastSendTimeRef = useRef<number>(0);
  const lastSendTextRef = useRef<string>("");

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || actuallyDisabled) return;

    const now = Date.now();
    if (now - lastSendTimeRef.current < 500 && trimmed === lastSendTextRef.current) {
      console.warn("[ChatInput] Blocked duplicate send spam attempt:", trimmed);
      return;
    }
    lastSendTimeRef.current = now;
    lastSendTextRef.current = trimmed;

    if (editingMessage && onSaveEdit) {
      onSaveEdit(editingMessage.id, trimmed);
      onCancelEdit?.();
      flushSync(() => {
        setText("");
      });
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
        inputRef.current.focus();
      }
      return;
    }

    const viewOnce = false;
    if (convId) useAppStore.getState().clearDraft(convId);

    // flushSync: clear input in the SAME paint frame as pressing Enter.
    // React commits setText('') to DOM before returning — user sees blank
    // input AND the new message appear in one single browser repaint.
    flushSync(() => {
      setText("");
    });

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.focus();
    }

    // Fire-and-forget — page.tsx handles everything async after paint
    onSendText(trimmed, viewOnce);
  }, [text, actuallyDisabled, onSendText, activeGhostMode, convId, editingMessage, onSaveEdit, onCancelEdit]);


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionDropdown && mentionUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % mentionUsers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + mentionUsers.length) % mentionUsers.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        selectMention(mentionUsers[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentionDropdown(false);
        return;
      }
    }

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

  const fmtDur = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div
      className="w-full relative px-3 pt-2 bg-black/40 backdrop-blur-xl"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
    >
      {/* Mentions dropdown */}
      <AnimatePresence>
        {showMentionDropdown && mentionUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-4 bottom-full mb-2 w-[280px] max-h-[220px] overflow-y-auto rounded-2xl bg-[#0d0d15]/95 border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl z-50 p-2 space-y-0.5 custom-scrollbar-none"
          >
            {mentionUsers.map((user, idx) => {
              const isSelected = idx === mentionIndex;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => selectMention(user)}
                  onMouseEnter={() => setMentionIndex(idx)}
                  className={clsx(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-200",
                    isSelected ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "hover:bg-white/5 text-white/70"
                  )}
                >
                  <img
                    src={getAvatarUrl(user.username || 'user', user.avatar_url)}
                    className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0"
                    alt=""
                  />
                  <div className="min-w-0 flex-1">
                    <p className={clsx("text-xs font-bold truncate", isSelected ? "text-white" : "text-white/90")}>
                      {user.nickname || user.display_name || user.username}
                    </p>
                    <p className={clsx("text-[10px] truncate", isSelected ? "text-indigo-200" : "text-white/30")}>
                      @{user.username}
                    </p>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Muted Banner */}
      <AnimatePresence>
        {localMuted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-2"
          >
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-rose-500/[0.08] border border-rose-500/20">
              <span className="text-[12px] text-rose-400/80 font-medium">You are muted in this conversation.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security Check Overlay */}
      <AnimatePresence>
        {isVerifyingSecurity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md rounded-3xl z-50 m-2"
          >
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#0c0c12] border border-indigo-500/20 shadow-xl">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full"
              />
              <span className="text-[12px] text-white/70 font-semibold tracking-wide">Securing connection...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mic / upload error banner — replaces browser alert() */}
      <AnimatePresence>
        {micError && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-2"
          >
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/25">
              <span className="text-rose-400 shrink-0 mt-0.5">⚠️</span>
              <span className="text-[12px] text-rose-300/90 font-medium leading-snug flex-1">{micError}</span>
              <button
                type="button"
                onClick={() => setMicError(null)}
                className="text-rose-400/60 hover:text-rose-300 transition-colors shrink-0 text-[14px] leading-none font-bold mt-0.5"
                aria-label="Dismiss"
              >×</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply Banner */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-2"
          >
            <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl border border-indigo-400/20 bg-indigo-500/[0.07]">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-widest mb-0.5">
                  Replying to {replyTo.senderDisplay}
                </span>
                <p className="text-[13px] text-white/50 truncate">{replyTo.content}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={onCancelReply}
                className="p-1.5 hover:bg-white/[0.07] rounded-full ml-3 text-white/30 hover:text-white/70 transition-colors shrink-0"
              >
                <X size={14} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editing Banner */}
      <AnimatePresence>
        {editingMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-2"
          >
            <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl border border-indigo-400/20 bg-indigo-500/[0.07]">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-widest mb-0.5">
                  Editing Message
                </span>
                <p className="text-[13px] text-white/50 truncate">{editingMessage.content}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={onCancelEdit}
                className="p-1.5 hover:bg-white/[0.07] rounded-full ml-3 text-white/30 hover:text-white/70 transition-colors shrink-0"
              >
                <X size={14} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Row */}
      <div className={clsx("flex items-end gap-2 transition-all", actuallyDisabled && "opacity-50 pointer-events-none")}>

        {/* Input Pill */}
        <div className={clsx(
          "flex-1 flex items-end rounded-[26px] min-h-[46px] transition-all duration-200 relative overflow-hidden",
          "bg-black/35 border",
          isFocused
            ? "border-white/[0.20] bg-black/45 shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
            : "border-white/[0.10]"
        )}>

          {/* Emoji button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 600, damping: 28 }}
            type="button"
            onClick={() => setIsEmojiOpen(v => !v)}
            className={clsx(
              "p-3 m-0.5 rounded-full transition-colors shrink-0 relative overflow-hidden",
              isEmojiOpen ? "text-indigo-400 bg-indigo-500/10" : "text-white/35 hover:text-white hover:bg-white/[0.05]"
            )}
          >
            <TouchRipple />
            <Smile size={20} strokeWidth={1.5} className="relative z-10" />
          </motion.button>

          {/* Preview/Recording UI */}
          {voicePreviewUrl ? (
            <div className="flex-1 flex items-center justify-between px-3 h-[46px] select-none gap-3">
              <button
                type="button"
                onClick={togglePlayPreview}
                className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-white transition-colors shrink-0"
              >
                {isPlayingPreview ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
              </button>
              <div className="flex-1 text-[13px] text-white/50 font-medium truncate">
                Previewing voice note ({fmtDur(recordingDur)})
              </div>

              {/* Ghost Mode Toggle inside preview */}
              {showSecretMode && (
                <button
                  type="button"
                  onClick={() => onToggleGhostMode?.()}
                  className={clsx(
                    "p-2 rounded-full transition-colors shrink-0 active:scale-95 duration-100",
                    activeGhostMode ? "text-violet-400 bg-violet-500/10 border border-violet-500/25" : "text-white/35 hover:text-white hover:bg-white/[0.05]"
                  )}
                  title="Toggle Ghost Mode"
                >
                  <Ghost size={16} strokeWidth={1.5} />
                </button>
              )}

              <button
                type="button"
                onClick={discardPreview}
                className="text-[11px] font-bold uppercase tracking-wider text-rose-400 hover:text-rose-300 px-3 py-1.5 transition-colors font-semibold"
              >
                Discard
              </button>
            </div>
          ) : isRecording ? (
            <div className="flex-1 flex items-center justify-between px-4 h-[46px] select-none">
              <div className="flex items-center gap-2.5">
                <motion.div
                  animate={isRecordingPaused ? { opacity: 0.5 } : { opacity: [1, 0.2, 1], scale: [1, 0.8, 1] }}
                  transition={{ repeat: Infinity, duration: 1.1 }}
                  className="w-2 h-2 bg-rose-500 rounded-full"
                />
                <span className="text-[14px] font-bold tabular-nums text-rose-400">{fmtDur(recordingDur)}</span>
              </div>
              <div className="flex items-center gap-2">
                {isRecordingPaused ? (
                  <>
                    <button
                      type="button"
                      onClick={() => stopRecording(false, false)}
                      className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 px-2 py-1 transition-colors"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={resumeRecording}
                      className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 px-2 py-1 transition-colors"
                    >
                      Resume
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={pauseRecording}
                    className="text-[11px] font-bold uppercase tracking-wider text-white/50 hover:text-white px-2 py-1 transition-colors"
                  >
                    Pause
                  </button>
                )}
                <button type="button" onClick={() => stopRecording(true)}
                  className="text-[11px] font-bold uppercase tracking-wider text-rose-500 hover:text-rose-400 transition-colors px-2 py-1">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Textarea */}
              <textarea
                ref={inputRef}
                rows={1}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                disabled={actuallyDisabled}
                className="flex-1 bg-transparent border-none outline-none resize-none pt-[13px] pb-[13px] pr-2 text-[15px] leading-[20px] max-h-[140px] text-white custom-scrollbar-none placeholder:text-white/40 font-[400]"
              />

              {/* Right actions — GOD MODE: 100% hardware-accelerated CSS transitions instead of heavy AnimatePresence */}
              <div className="flex items-center justify-end relative h-[44px] min-w-[40px] pr-2.5">
                {/* Media Actions */}
                <div
                  className={clsx(
                    "flex items-center gap-0.5 transition-all duration-150 ease-out transform origin-right shrink-0",
                    hasText
                      ? "opacity-0 scale-90 translate-x-4 pointer-events-none absolute right-2.5 bottom-[4px]"
                      : "opacity-100 scale-100 translate-x-0 relative"
                  )}
                >
                  {[
                    { icon: Mic, onClick: startRecording, label: "Voice" },
                    { icon: ImageIcon, onClick: () => imageInputRef.current?.click(), label: "Image" },
                    ...(onSendLocation ? [{ icon: MapPin, onClick: handleLocationClick, label: "Location" }] : []),
                    ...(showSecretMode ? [{
                      icon: Ghost,
                      onClick: () => {
                        onToggleGhostMode?.();
                      },
                      label: "Ghost Mode",
                      active: activeGhostMode,
                    }] : []),
                  ].map(({ icon: Icon, onClick, label, active }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={onClick}
                      aria-label={label}
                      className={clsx(
                        "p-2.5 rounded-full transition-colors relative overflow-hidden active:scale-90 duration-100",
                        active ? "text-indigo-400 bg-indigo-500/10" : "text-white/35 hover:text-white hover:bg-white/[0.05]"
                      )}
                    >
                      <TouchRipple />
                      <Icon size={18} strokeWidth={1.5} className="relative z-10" />
                    </button>
                  ))}
                </div>

                {/* Send Button */}
                <div
                  className={clsx(
                    "transition-all duration-150 ease-out transform origin-right shrink-0 flex items-center justify-center",
                    !hasText
                      ? "opacity-0 scale-75 translate-x-4 pointer-events-none absolute right-2.5 bottom-[4px]"
                      : "opacity-100 scale-100 translate-x-0 relative"
                  )}
                >
                  <button
                    onClick={handleSend}
                    disabled={actuallyDisabled}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 duration-100 relative overflow-hidden shrink-0 bg-indigo-500 shadow-[0_4px_18px_rgba(99,102,241,0.45)] hover:shadow-[0_4px_28px_rgba(99,102,241,0.65)] hover:bg-indigo-400"
                  >
                    <TouchRipple />
                    <div className="relative z-10">
                      <ArrowUp size={16} strokeWidth={2.5} className="text-white" />
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}

        </div>

        <EmojiPicker isOpen={isEmojiOpen} onClose={() => setIsEmojiOpen(false)} onEmojiSelect={handleEmojiSelect} />

        {/* Record checkmark/preview send buttons (outside pill) */}
        {isRecording && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 26 }}
            onClick={() => stopRecording(false, true)}
            className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-[0_4px_20px_rgba(16,185,129,0.4)] shrink-0 relative overflow-hidden hover:bg-emerald-400 transition-colors"
            title="Send Voice Note"
          >
            <TouchRipple />
            <ArrowUp size={20} className="relative z-10 text-white" />
          </motion.button>
        )}

        {voicePreviewUrl && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 26 }}
            onClick={handleSendPreview}
            className={clsx(
              "w-12 h-12 rounded-full flex items-center justify-center shrink-0 relative overflow-hidden transition-all duration-300",
              activeGhostMode 
                ? "bg-[#6d28d9] text-white shadow-[0_4px_20px_rgba(109,40,217,0.4)]" 
                : "bg-indigo-500 text-white shadow-[0_4px_20px_rgba(99,102,241,0.4)]"
            )}
            title={activeGhostMode ? "Send as Ghost voice note" : "Send voice note"}
          >
            <TouchRipple />
            {activeGhostMode ? <Ghost size={18} className="relative z-10" /> : <Send size={18} className="relative z-10" />}
          </motion.button>
        )}
      </div>

      {/* Ghost Mode Badge */}
      <AnimatePresence>
        {activeGhostMode && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-[#4c1d95] border border-[#a78bfa]/30 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.3)] z-10 pointer-events-none"
          >
            <Ghost size={11} className="text-[#c084fc]" />
            <span className="text-[10px] font-black text-white uppercase tracking-tight whitespace-nowrap">Ghost Session Active</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uploading indicator */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full"
              />
              <span className="text-[12px] text-white/70 font-medium">Uploading…</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Preview Composer Overlay */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="absolute bottom-full mb-3 left-0 right-0 z-[500] p-4 bg-[#0f0f14]/95 border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-3xl flex flex-col gap-4 mx-2"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <div className="flex items-center gap-2">
                <Paperclip size={14} className="text-indigo-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-white">Media Composer</h4>
              </div>
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{selectedFiles.length} selected</span>
            </div>

            {/* Gallery Row */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar max-h-32">
              {selectedFiles.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => {
                    if (item.type === "image") {
                      setEditingFileIndex(idx);
                    }
                  }}
                  className={clsx(
                    "relative shrink-0 w-24 h-24 rounded-2xl overflow-hidden bg-black/40 border border-white/5 group",
                    item.type === "image" && "cursor-pointer hover:border-indigo-400/50 transition-colors"
                  )}
                >
                  {item.type === "image" ? (
                    <>
                      <img src={item.previewUrl} className="w-full h-full object-cover" alt="preview" />
                      {/* Edit overlay on hover */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white bg-indigo-500/80 px-2 py-1 rounded-lg">Edit</span>
                      </div>
                    </>
                  ) : item.type === "video" ? (
                    <div className="w-full h-full relative flex items-center justify-center bg-indigo-950/20">
                      <video src={item.previewUrl} className="w-full h-full object-cover" muted />
                      <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                        <span className="text-[9px] font-black tracking-widest text-white uppercase bg-indigo-500/80 px-1.5 py-0.5 rounded-md">VIDEO</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-2 text-center">
                      <FileText size={20} className="text-indigo-400" />
                      <span className="text-[9px] text-white/50 truncate w-full font-bold">{item.file.name}</span>
                    </div>
                  )}
                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      URL.revokeObjectURL(item.previewUrl);
                      setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
                    }}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/75 hover:bg-rose-600 text-white flex items-center justify-center transition-all scale-90 group-hover:scale-100 outline-none z-10"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              
              {/* Add more button */}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="shrink-0 w-24 h-24 rounded-2xl border-2 border-dashed border-white/10 hover:border-indigo-400/50 hover:bg-white/[0.02] flex flex-col items-center justify-center gap-1 text-white/30 hover:text-indigo-300 transition-all outline-none"
              >
                <ImageIcon size={18} />
                <span className="text-[9px] font-black uppercase tracking-wider">Add More</span>
              </button>
            </div>

            {/* Caption Input */}
            <div className="relative flex items-center">
              <input
                type="text"
                value={mediaCaption}
                onChange={(e) => setMediaCaption(e.target.value)}
                placeholder="Add a caption..."
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-xs text-white placeholder-white/30 outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-3">
              <button
                type="button"
                onClick={() => {
                  selectedFiles.forEach(item => URL.revokeObjectURL(item.previewUrl));
                  setSelectedFiles([]);
                  setMediaCaption("");
                }}
                className="px-4 py-2.5 rounded-xl hover:bg-white/5 text-neutral-400 hover:text-white text-xs font-black uppercase tracking-widest transition-all outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendMedia}
                className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-95 outline-none"
              >
                Send Media
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Location Options Menu Overlay */}
      {/* Location Options Menu Overlay */}
      <AnimatePresence>
        {isLocationMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setIsLocationMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className="absolute bottom-16 right-4 z-50 w-56 rounded-2xl border border-white/[0.08] bg-[#0c0c12]/95 backdrop-blur-xl p-3 shadow-2xl flex flex-col gap-1.5"
            >
              <div className="px-2.5 py-1.5 border-b border-white/[0.05]">
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">Location Sharing</span>
              </div>

              {/* Static snapshot */}
              <button
                type="button"
                onClick={() => handleSendLocationWithOptions(false)}
                className="w-full text-left px-2.5 py-2 rounded-xl text-[13px] font-medium text-white hover:bg-white/[0.05] transition-colors flex items-center justify-between group"
              >
                <span>Share Current Location</span>
                <MapPin size={14} className="text-indigo-400 group-hover:text-indigo-300 transition-colors" />
              </button>

              {/* Live options */}
              <div className="px-2.5 pt-2 pb-1 border-t border-white/[0.05]">
                <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest block">Share Live Location</span>
              </div>

              {[
                { label: "Share for 15 Min", duration: 0.25 },
                { label: "Share for 1 Hour", duration: 1 },
                { label: "Share for 8 Hours", duration: 8 },
              ].map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => handleSendLocationWithOptions(true, opt.duration)}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-[13px] font-medium text-white hover:bg-white/[0.05] transition-colors flex items-center justify-between group"
                >
                  <span>{opt.label}</span>
                  <Clock size={14} className="text-white/45 group-hover:text-green-400 transition-colors" />
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hidden inputs */}
      <input type="file" ref={imageInputRef} className="hidden" accept="image/*,video/*" multiple
        onChange={(e) => { if (e.target.files) handleFilesSelect(e.target.files); e.target.value = ""; }} />

      {/* Canvas Media Editor Modal */}
      {editingFileIndex !== null && selectedFiles[editingFileIndex] && typeof window !== "undefined" && createPortal(
        <MediaEditorModal
          file={selectedFiles[editingFileIndex].file}
          onSave={(editedFile) => {
            setSelectedFiles(prev => {
              const copy = [...prev];
              URL.revokeObjectURL(copy[editingFileIndex].previewUrl);
              copy[editingFileIndex] = {
                file: editedFile,
                previewUrl: URL.createObjectURL(editedFile),
                type: "image"
              };
              return copy;
            });
            setEditingFileIndex(null);
          }}
          onClose={() => setEditingFileIndex(null)}
        />,
        document.body
      )}

      {/* Consent Modal — rendered via portal, shown once per conversation */}
      {pendingLocationAction && convId && typeof window !== "undefined" && createPortal(
        <LocationConsentModal
          convId={convId}
          onAgree={handleConsentAgree}
          onCancel={() => setPendingLocationAction(null)}
        />,
        document.body
      )}
    </div>
  );
}
