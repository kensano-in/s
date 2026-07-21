'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmojiPickerProps {
  isOpen: boolean;
  isMine?: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
}

export default function EmojiPicker({ isOpen, isMine = false, onClose, onEmojiSelect }: EmojiPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="emoji-picker-modal"
          ref={containerRef}
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className={`absolute bottom-full mb-3 z-50 shadow-2xl rounded-3xl overflow-hidden ${isMine ? 'right-0' : 'left-0'}`}
        >
          <Picker
            data={data}
            onEmojiSelect={(e: any) => {
              onEmojiSelect(e.native);
              onClose();
            }}
            theme="dark"
            previewPosition="none"
            skinTonePosition="none"
            searchPosition="top"
            perLine={8}
            navPosition="bottom"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
