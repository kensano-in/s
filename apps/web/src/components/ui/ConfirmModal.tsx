"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 20 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[360px] z-[301] rounded-[28px] p-6 flex flex-col gap-4"
            style={{
              background: "rgba(10, 10, 18, 0.96)",
              backdropFilter: "blur(40px) saturate(200%)",
              WebkitBackdropFilter: "blur(40px) saturate(200%)",
              border: "1px solid rgba(255,255,255,0.09)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {/* Icon */}
            <div className="flex justify-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: danger
                    ? "rgba(239, 68, 68, 0.12)"
                    : "rgba(98, 0, 238, 0.12)",
                  border: danger
                    ? "1px solid rgba(239,68,68,0.2)"
                    : "1px solid rgba(98,0,238,0.2)",
                }}
              >
                <AlertTriangle
                  size={26}
                  className={danger ? "text-red-400" : "text-primary"}
                />
              </div>
            </div>

            {/* Text */}
            <div className="text-center">
              <h3 className="text-[17px] font-bold text-white mb-2">{title}</h3>
              <p className="text-[14px] text-white/50 leading-relaxed">{message}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-1">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onCancel}
                className="flex-1 py-3 rounded-2xl text-[15px] font-semibold text-white/60 transition-all"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {cancelLabel}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onConfirm}
                className="flex-1 py-3 rounded-2xl text-[15px] font-bold transition-all"
                style={{
                  background: danger
                    ? "linear-gradient(135deg, #ef4444, #dc2626)"
                    : "linear-gradient(135deg, #6200EE, #4a00c0)",
                  boxShadow: danger
                    ? "0 4px 20px rgba(239,68,68,0.35)"
                    : "0 4px 20px rgba(98,0,238,0.35)",
                  color: "white",
                }}
              >
                {confirmLabel}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
