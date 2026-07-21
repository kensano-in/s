"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  minimal?: boolean;
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
  minimal = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Escape key support
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    // Focus the cancel button first for safety on destructive actions
    const timer = setTimeout(() => {
      const focusableEls = modalRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex="0"]');
      if (focusableEls && focusableEls.length > 0) {
        (focusableEls[0] as HTMLElement).focus();
      }
    }, 50);

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (!modalRef.current) return;
      const focusableEls = modalRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex="0"]');
      if (focusableEls.length === 0) return;
      const firstEl = focusableEls[0] as HTMLElement;
      const lastEl = focusableEls[focusableEls.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          lastEl.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastEl) {
          firstEl.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleFocusTrap);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleFocusTrap);
    };
  }, [isOpen]);

  if (!mounted) return null;

  if (minimal) {
    return createPortal(
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCancel}
              className="fixed inset-0 backdrop-blur-sm z-[9998]"
              style={{ background: 'rgba(0,0,0,0.6)' }}
            />

            {/* Modal Centering Wrapper */}
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 pointer-events-none">
              <motion.div
                ref={modalRef}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
                className="w-full flex flex-col p-5 gap-4 pointer-events-auto"
                style={{
                  width: 'min(300px, calc(100vw - 24px))',
                  height: 'fit-content',
                  borderRadius: 18,
                  background: "rgba(10, 10, 12, 0.35)",
                  backdropFilter: "blur(32px) saturate(200%)",
                  WebkitBackdropFilter: "blur(32px) saturate(200%)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
                }}
              >
                {/* Text */}
                <div className="text-center space-y-1">
                  <h3 className="text-[14px] font-bold text-white tracking-tight leading-tight">{title}</h3>
                  <p className="text-[11.5px] text-white/40 leading-relaxed px-0.5">{message}</p>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2.5 mt-1.5">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={onCancel}
                    className="w-full py-2 rounded-xl text-[12px] font-semibold text-white/50 hover:text-white/70 transition-colors cursor-pointer text-center"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    {cancelLabel}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={onConfirm}
                    className="w-full py-2 rounded-xl text-[12px] font-bold transition-all cursor-pointer text-center"
                    style={{
                      background: danger ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.08)",
                      border: danger ? "1px solid rgba(239, 68, 68, 0.22)" : "1px solid rgba(255, 255, 255, 0.1)",
                      color: danger ? "#fca5a5" : "#ffffff",
                    }}
                  >
                    {confirmLabel}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>,
      document.body
    );
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 backdrop-blur-sm z-[9998]"
            style={{ background: 'rgba(0,0,0,0.65)' }}
          />

          {/* Modal Centering Wrapper */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 pointer-events-none">
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 20 }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              className="w-full flex flex-col p-5 md:p-6 gap-4 pointer-events-auto"
              style={{
                width: 'min(360px, calc(100vw - 24px))',
                maxHeight: 'calc(100svh - 32px)',
                borderRadius: 24,
                overflowY: 'auto',
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
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
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
                    size={22}
                    className={danger ? "text-red-400" : "text-primary"}
                  />
                </div>
              </div>

              {/* Text */}
              <div className="text-center">
                <h3 className="text-[16px] font-bold text-white mb-1.5">{title}</h3>
                <p className="text-[13px] text-white/50 leading-relaxed">{message}</p>
              </div>

              {/* Actions (stacks on small screens to prevent text cut-off) */}
              <div className="flex flex-col sm:flex-row gap-2.5 mt-1">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={onCancel}
                  className="w-full sm:flex-1 py-2.5 rounded-xl text-[14px] font-semibold text-white/60 transition-all cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {cancelLabel}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={onConfirm}
                  className="w-full sm:flex-1 py-2.5 rounded-xl text-[14px] font-bold transition-all cursor-pointer"
                  style={{
                    background: danger
                      ? "linear-gradient(135deg, #ef4444, #dc2626)"
                      : "linear-gradient(135deg, #6200EE, #4a00c0)",
                    boxShadow: danger
                      ? "0 4px 16px rgba(239,68,68,0.3)"
                      : "0 4px 16px rgba(98,0,238,0.3)",
                    color: "white",
                  }}
                >
                  {confirmLabel}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
