"use client";

/**
 * SummarySheet — Chat Pulse Summarization
 * Appears as a bottom sheet with staggered bullet points
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { X, Sparkles, Loader2, RefreshCw } from "lucide-react";

interface SummarySheetProps {
  isOpen: boolean;
  onClose: () => void;
  convId: string;
  groupName: string;
}

export default function SummarySheet({
  isOpen,
  onClose,
  convId,
  groupName,
}: SummarySheetProps) {
  const [bullets, setBullets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  const fetchSummary = async (force = false) => {
    // Rate limit: 1 per 10 min per conversation (unless forced)
    const key = `summary_ts_${convId}`;
    const lastTs = parseInt(localStorage.getItem(key) || "0");
    const now = Date.now();
    if (!force && lastTs && now - lastTs < 10 * 60 * 1000) {
      // Use cached bullets if available and within rate window
      const cached = localStorage.getItem(`summary_data_${convId}`);
      if (cached) {
        try {
          setBullets(JSON.parse(cached));
          setLastFetched(lastTs);
          return;
        } catch {}
      }
    }

    setLoading(true);
    setError(null);
    setBullets([]);

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ convId }),
      });
      const data = await res.json();
      if (data.bullets && Array.isArray(data.bullets)) {
        setBullets(data.bullets);
        localStorage.setItem(key, String(now));
        localStorage.setItem(`summary_data_${convId}`, JSON.stringify(data.bullets));
        setLastFetched(now);
      } else {
        setError(data.error || "Could not generate summary.");
      }
    } catch (e) {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  // Auto-fetch when opened
  const handleOpen = () => {
    if (isOpen && bullets.length === 0 && !loading) fetchSummary();
  };

  // Trigger on open
  if (isOpen && bullets.length === 0 && !loading && !error) {
    fetchSummary();
  }

  const timeSince = lastFetched
    ? Math.floor((Date.now() - lastFetched) / 60000)
    : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[75] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 450, damping: 38 }}
            className="fixed bottom-0 inset-x-0 z-[80] mx-auto"
            style={{
              maxWidth: 520,
              background: "rgba(10,10,18,0.98)",
              backdropFilter: "blur(40px) saturate(200%)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "24px 24px 0 0",
              boxShadow: "0 -24px 80px rgba(0,0,0,0.6)",
              paddingBottom: "max(24px, env(safe-area-inset-bottom))",
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(98,0,238,0.5), rgba(0,188,212,0.3))",
                    border: "1px solid rgba(98,0,238,0.4)",
                    boxShadow: "0 0 20px rgba(98,0,238,0.3)",
                  }}
                >
                  <Sparkles size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-white">Chat Pulse</h2>
                  <p className="text-[11px] text-white/40">
                    {timeSince !== null ? (
                      timeSince < 1 ? "Just now" : `${timeSince}m ago`
                    ) : "Real-time AI Analysis"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchSummary(true)}
                  disabled={loading}
                  className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white transition-colors disabled:opacity-30"
                  title="Refresh summary"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 pb-4 min-h-[120px]">
              {loading && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles size={28} className="text-primary/60" />
                  </motion.div>
                  <p className="text-[13px] text-white/40">Analyzing conversation...</p>
                </div>
              )}

              {error && !loading && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <p className="text-[13px] text-red-400/80">{error}</p>
                  <button
                    onClick={() => fetchSummary(true)}
                    className="text-[12px] text-primary underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {!loading && !error && bullets.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-[11px] text-white/30 uppercase tracking-widest font-medium mb-1">
                    {groupName} · What you missed
                  </p>
                  {bullets.map((bullet, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.12, type: "spring", stiffness: 500, damping: 32 }}
                      className="flex items-start gap-3"
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                        style={{
                          background: `hsl(${260 + i * 20}, 80%, 65%)`,
                          boxShadow: `0 0 8px hsla(${260 + i * 20}, 80%, 65%, 0.5)`,
                        }}
                      />
                      <p className="text-[14px] text-white/80 leading-relaxed">{bullet}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
