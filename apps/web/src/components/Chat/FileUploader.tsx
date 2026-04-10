'use client';

import { useRef, useState, useCallback } from 'react';
import { Paperclip, X, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

interface FileUploaderProps {
  onUploadComplete: (url: string, fileName: string, mimeType: string) => void;
  onError?: (err: string) => void;
}

const MAX_SIZE_MB = 25;

export default function FileUploader({ onUploadComplete, onError }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      onError?.(`File too large. Max ${MAX_SIZE_MB}MB allowed.`);
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      // Simulate progress since Supabase JS client doesn't expose upload progress
      const fakeProgress = setInterval(() => {
        setProgress(prev => {
          if (prev === null || prev >= 85) return prev;
          return prev + Math.random() * 15;
        });
      }, 200);

      const { data, error } = await supabase.storage
        .from('chat-files')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      clearInterval(fakeProgress);

      if (error) {
        onError?.(error.message);
        setUploading(false);
        setProgress(null);
        return;
      }

      setProgress(100);

      const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(data.path);
      const publicUrl = urlData.publicUrl;

      setTimeout(() => {
        onUploadComplete(publicUrl, file.name, file.type);
        setUploading(false);
        setProgress(null);
      }, 400);
    } catch (err: any) {
      onError?.(err.message || 'Upload failed');
      setUploading(false);
      setProgress(null);
    }
  }, [onUploadComplete, onError]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = ''; // reset so same file can be re-selected
        }}
      />

      <button
        type="button"
        onClick={() => !uploading && inputRef.current?.click()}
        disabled={uploading}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/5 transition-all disabled:opacity-50"
        title="Attach file"
      >
        <AnimatePresence mode="wait">
          {uploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative w-5 h-5"
            >
              <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                <circle
                  cx="10" cy="10" r="8"
                  fill="none"
                  stroke="rgba(108,99,255,0.8)"
                  strokeWidth="2"
                  strokeDasharray={`${2 * Math.PI * 8}`}
                  strokeDashoffset={`${2 * Math.PI * 8 * (1 - (progress || 0) / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.2s ease' }}
                />
              </svg>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Paperclip size={18} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
