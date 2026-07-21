'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 *  REPORT MODAL COMPONENT
 *  Allows users to report posts, messages, or users
 *  with reason selection and optional details.
 * ═══════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, X, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { submitReport, ReportReason, ReportTarget } from '@/app/(main)/feed/report-actions';

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'spam', label: 'Spam', description: 'Repetitive, unwanted, or commercial content' },
  { value: 'harassment', label: 'Harassment', description: 'Targeting or bullying a specific person' },
  { value: 'hate_speech', label: 'Hate Speech', description: 'Discriminatory language or slurs' },
  { value: 'violence', label: 'Violence', description: 'Threats or depictions of harm' },
  { value: 'misinformation', label: 'Misinformation', description: 'False or misleading information' },
  { value: 'nsfw', label: 'NSFW / Adult', description: 'Explicit sexual or graphic content' },
  { value: 'impersonation', label: 'Impersonation', description: 'Pretending to be someone they are not' },
  { value: 'other', label: 'Other', description: 'Another violation not listed above' },
];

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTarget;
  targetId: string;
  reportedUserId: string;
  contentPreview?: string;
}

export default function ReportModal({ isOpen, onClose, targetType, targetId, reportedUserId, contentPreview }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setStatus('submitting');

    const result = await submitReport({
      targetType,
      targetId,
      reportedUserId,
      reason: selectedReason,
      details: details.trim() || undefined,
    });

    if (result.success) {
      setStatus('success');
      setTimeout(() => { onClose(); setStatus('idle'); setSelectedReason(null); setDetails(''); }, 2500);
    } else {
      setStatus('error');
      setErrorMsg(result.message);
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
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-x-4 bottom-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 w-full max-w-md bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-7 py-6 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center">
                  <Flag className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-white tracking-tight">Report {targetType}</h2>
                  <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5">Content Moderation</p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {status === 'success' ? (
              <div className="px-7 py-12 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <p className="text-[17px] font-bold text-white">Report Submitted</p>
                <p className="text-sm text-zinc-400 max-w-[240px]">Our moderation team will review this shortly. Thank you for keeping the platform safe.</p>
              </div>
            ) : (
              <div className="px-7 py-6 space-y-5">
                {/* Content preview */}
                {contentPreview && (
                  <div className="text-[13px] text-zinc-500 bg-white/[0.03] px-4 py-3 rounded-xl border border-white/[0.06] line-clamp-2 italic">
                    &ldquo;{contentPreview}&rdquo;
                  </div>
                )}

                {/* Reason grid */}
                <div className="space-y-2">
                  <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest mb-3">Select a reason</p>
                  {REPORT_REASONS.map((r) => (
                    <button
                      type="button"
                      key={r.value}
                      onClick={() => setSelectedReason(r.value)}
                      className={`
                        w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all
                        ${selectedReason === r.value
                          ? 'border-rose-500/40 bg-rose-500/10'
                          : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'}
                      `}
                    >
                      <div className={`w-4 h-4 rounded-full border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${selectedReason === r.value ? 'border-rose-500 bg-rose-500' : 'border-zinc-600'}`}>
                        {selectedReason === r.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-white">{r.label}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{r.description}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Optional details */}
                {selectedReason && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <textarea
                      value={details}
                      onChange={e => setDetails(e.target.value)}
                      placeholder="Additional details (optional)..."
                      maxLength={500}
                      rows={2}
                      className="w-full bg-black/40 border border-white/[0.08] text-white rounded-xl px-4 py-3 text-[13px] outline-none resize-none focus:border-rose-500/30 transition-all placeholder:text-zinc-600"
                    />
                  </motion.div>
                )}

                {/* Error */}
                {status === 'error' && (
                  <div className="flex items-center gap-2 text-rose-400 text-[12px] bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-500/20">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {errorMsg}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!selectedReason || status === 'submitting'}
                  className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-[13px] font-bold tracking-tight transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  {status === 'submitting' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  ) : (
                    <><Flag className="w-4 h-4" /> Submit Report</>
                  )}
                </button>

                <p className="text-[10px] text-zinc-600 text-center pb-1">
                  False reports may result in penalties to your account.
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
