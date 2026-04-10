'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, Loader2, X } from 'lucide-react';

const REPORT_REASONS = [
  'Spam or self-promotion',
  'Harassment or bullying',
  'Hate speech or discrimination',
  'Nudity or sexual content',
  'Violence or harmful content',
  'Misinformation',
  'Other',
];

interface ReportModalProps {
  isOpen: boolean;
  messageId: string | null;
  reportedUserId: string | null;
  onClose: () => void;
  onSubmit: (messageId: string, reportedUserId: string, reason: string) => Promise<void>;
}

export default function ReportModal({ isOpen, messageId, reportedUserId, onClose, onSubmit }: ReportModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!selected || !messageId || !reportedUserId) return;
    setLoading(true);
    try {
      await onSubmit(messageId, reportedUserId, selected);
      setDone(true);
      setTimeout(() => { setDone(false); setSelected(null); onClose(); }, 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
          >
            <div className="bg-[#18181f] border border-white/10 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
              {done ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <Flag size={24} className="text-green-400" />
                  </div>
                  <p className="text-white font-semibold">Report submitted</p>
                  <p className="text-xs text-white/40 text-center px-6">Our moderation team will review this shortly.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-5 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-red-500/10">
                        <Flag size={16} className="text-red-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">Report Message</p>
                        <p className="text-[10px] text-white/30">Select a reason</p>
                      </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/5 text-white/40 transition-colors">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="p-3 space-y-1">
                    {REPORT_REASONS.map(reason => (
                      <button
                        key={reason}
                        onClick={() => setSelected(reason)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${
                          selected === reason
                            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                            : 'text-white/70 hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>

                  <div className="p-4 pt-2 border-t border-white/5">
                    <button
                      onClick={handleSubmit}
                      disabled={!selected || loading}
                      className="w-full py-3 rounded-2xl bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />}
                      {loading ? 'Submitting…' : 'Submit Report'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
