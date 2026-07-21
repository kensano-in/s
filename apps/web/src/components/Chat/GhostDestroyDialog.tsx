'use client';

/**
 * GhostDestroyDialog — Confirmation modal before manual session destruction
 *
 * Shown when user taps Leave / Back / Exit while Ghost Mode is active.
 * Requires explicit confirmation before destroying all messages.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ghost, Trash2, X } from 'lucide-react';

interface GhostDestroyDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function GhostDestroyDialog({
  isOpen,
  onConfirm,
  onCancel,
}: GhostDestroyDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="ghost-destroy-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10000]"
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            key="ghost-destroy-dialog"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed inset-x-4 bottom-8 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[340px] z-[10001] bg-[#0c0c14] border border-white/[0.08] rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.7)] overflow-hidden"
          >
            {/* Header bar */}
            <div className="h-1 w-full bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600" />

            <div className="p-6">
              {/* Icon */}
              <div className="flex items-center justify-center mb-5">
                <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center">
                  <Ghost size={24} className="text-red-400" />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-white font-bold text-[17px] text-center mb-2">
                Destroy Ghost Session?
              </h3>

              {/* Body */}
              <p className="text-white/45 text-[13px] text-center leading-relaxed mb-6">
                Leaving will permanently destroy every message in this Ghost conversation.{' '}
                <span className="text-white/60 font-medium">This cannot be undone.</span>
              </p>

              {/* Buttons */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={onConfirm}
                  className="w-full py-3 rounded-2xl bg-red-500 hover:bg-red-400 text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                >
                  <Trash2 size={16} />
                  Destroy & Leave
                </button>
                <button
                  onClick={onCancel}
                  className="w-full py-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.07] text-white/60 font-semibold text-[14px] flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
