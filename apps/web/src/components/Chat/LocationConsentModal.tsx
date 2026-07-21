"use client";

/**
 * LocationConsentModal
 *
 * One-time consent popup shown before sharing exact GPS location.
 * Fixed: Top glow accent and Alert icon layouts. Added true glassmorphic styling
 * to the backdrop itself so the content underneath blurs dynamically.
 */

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, MapPin, Shield, X, Users, Clock } from "lucide-react";

interface LocationConsentModalProps {
  convId: string;
  onAgree: () => void;
  onCancel: () => void;
}

const CONSENT_KEY = (convId: string) => `loc_consent_v1_${convId}`;

export function hasLocationConsent(convId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CONSENT_KEY(convId)) === "1";
}

export function setLocationConsent(convId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONSENT_KEY(convId), "1");
}

const warnings = [
  {
    icon: MapPin,
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/15",
    title: "Exact GPS Pin",
    desc: "Shares your precise real-time coordinates.",
  },
  {
    icon: Users,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/15",
    title: "Trust Check",
    desc: "Never share location with unknown users.",
  },
  {
    icon: Clock,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/15",
    title: "Live Updates",
    desc: "Movement updates continuously during active session.",
  },
  {
    icon: Shield,
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/15",
    title: "Liability Limit",
    desc: "We are not responsible for recipient tracking actions.",
  },
];

export default function LocationConsentModal({
  onAgree,
  onCancel,
}: LocationConsentModalProps) {
  return (
    <AnimatePresence>
      {/* Premium Glassmorphic Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{
          background: "rgba(10, 10, 15, 0.4)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
        onClick={onCancel}
      >
        {/* Modal Box */}
        <motion.div
          key="sheet"
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: "spring", stiffness: 450, damping: 32 }}
          className="w-full max-w-[340px] rounded-2xl overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg, rgba(20, 20, 30, 0.75) 0%, rgba(10, 10, 15, 0.9) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 24px 64px rgba(0, 0, 0, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.05)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top glow line - nested with padding margin to avoid clipping */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

          {/* Premium Header */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-white/[0.06] relative">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-rose-500/10 border border-rose-500/20 shrink-0">
                <AlertTriangle size={12} className="text-rose-400" />
              </div>
              <h2 className="text-[14px] font-bold text-white tracking-wide leading-none">
                Location Consent
              </h2>
            </div>
            <button
              onClick={onCancel}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:bg-white/5 active:scale-90"
            >
              <X size={13} className="text-white/40 hover:text-white/70" />
            </button>
          </div>

          {/* Warning List */}
          <div className="px-3.5 py-3 flex flex-col gap-2">
            {warnings.map((w, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 px-3 py-2 rounded-xl border transition-all duration-300 hover:bg-white/[0.02] ${w.bg}`}
              >
                <w.icon size={13} className={`${w.color} shrink-0 mt-0.5`} />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-white/90 leading-tight">{w.title}</p>
                  <p className="text-[10px] text-white/40 mt-0.5 leading-normal">{w.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Simple Compact Footer Disclaimer */}
          <div className="px-4 pb-2">
            <p className="text-[9px] text-white/20 text-center leading-normal">
              Sharing is at your own risk. Verlynn holds no liability.
            </p>
          </div>

          {/* Actions */}
          <div className="px-3.5 pb-4 flex flex-col gap-1.5">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onAgree}
              className="w-full py-2.5 rounded-xl text-[12px] font-bold text-white transition-all duration-300 hover:brightness-110 active:brightness-95"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
              }}
            >
              I understand — share
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onCancel}
              className="w-full py-2 rounded-xl text-[11px] font-semibold text-white/40 hover:text-white/60 hover:bg-white/[0.03] transition-all"
            >
              Cancel
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
