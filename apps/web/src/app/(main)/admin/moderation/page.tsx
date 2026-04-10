'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, CheckCircle, XCircle, Ban, Clock,
  Image as ImageIcon, User, MessageSquare, RefreshCw, ChevronDown,
} from 'lucide-react';
import {
  getReports, updateReportStatus, setBanStatus,
  getPendingStickers, updateStickerStatus,
} from '../actions';

type Report = {
  id: string;
  reporter: { username: string; display_name: string } | null;
  reported_user: { username: string; display_name: string } | null;
  reported_user_id: string | null;
  reported_message_id: string | null;
  reason: string;
  status: 'PENDING' | 'REVIEWED' | 'PUNISHED' | 'DISMISSED';
  created_at: string;
};

type Sticker = {
  id: string;
  image_url: string;
  uploader: { username: string; display_name: string } | null;
  status: string;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  REVIEWED: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  PUNISHED: 'text-red-400 bg-red-400/10 border-red-400/20',
  DISMISSED: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
};

export default function ModerationPage() {
  const [tab, setTab] = useState<'reports' | 'stickers'>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'reports') {
        const res = await getReports();
        if ('error' in res && res.error) throw new Error(res.error);
        setReports((res.reports as Report[]) || []);
      } else {
        const res = await getPendingStickers();
        if ('error' in res && res.error) throw new Error(res.error);
        setStickers((res.stickers as Sticker[]) || []);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const handleReportAction = async (
    reportId: string,
    status: string,
    userId?: string | null,
    punish?: boolean
  ) => {
    setActionLoading(reportId);
    try {
      await updateReportStatus(reportId, status);
      if (punish && userId) await setBanStatus(userId, true);
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  const handleStickerAction = async (stickerId: string, action: 'APPROVED' | 'REJECTED') => {
    setActionLoading(stickerId);
    try {
      await updateStickerStatus(stickerId, action);
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
          <ShieldAlert size={24} className="text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Moderation Centre</h1>
          <p className="text-sm text-white/40">Review reports and sticker submissions</p>
        </div>
        <button
          onClick={load}
          className="ml-auto p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin text-white/60' : 'text-white/60'} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white/[0.03] p-1 rounded-2xl w-fit border border-white/5">
        {(['reports', 'stickers'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
              tab === t
                ? 'bg-white/10 text-white shadow'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            {t === 'reports' ? `Reports (${reports.length})` : `Sticker Review (${stickers.length})`}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Reports Tab */}
      <AnimatePresence mode="wait">
        {tab === 'reports' && (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {!loading && reports.length === 0 && (
              <div className="text-center py-20 text-white/30">
                <CheckCircle size={48} className="mx-auto mb-4 opacity-20" />
                <p>No reports to review.</p>
              </div>
            )}
            {reports.map(report => (
              <motion.div
                key={report.id}
                layout
                className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden"
              >
                {/* Row */}
                <div
                  className="flex items-start gap-4 p-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                >
                  <div className="p-2 rounded-xl bg-red-500/10">
                    <MessageSquare size={16} className="text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">
                        @{report.reporter?.username ?? 'unknown'} reported @{report.reported_user?.username ?? 'unknown'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[report.status] ?? STATUS_COLORS.PENDING}`}>
                        {report.status}
                      </span>
                    </div>
                    <p className="text-sm text-white/50 truncate">{report.reason}</p>
                    <p className="text-[10px] text-white/25 mt-1">
                      {new Date(report.created_at).toLocaleString()}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-white/30 transition-transform mt-1 ${expandedId === report.id ? 'rotate-180' : ''}`}
                  />
                </div>

                {/* Expanded actions */}
                <AnimatePresence>
                  {expandedId === report.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-white/[0.05]"
                    >
                      <div className="p-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => handleReportAction(report.id, 'REVIEWED')}
                          disabled={!!actionLoading}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle size={14} /> Mark Reviewed
                        </button>
                        <button
                          onClick={() => handleReportAction(report.id, 'PUNISHED', report.reported_user_id, true)}
                          disabled={!!actionLoading}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        >
                          <Ban size={14} /> Ban User
                        </button>
                        <button
                          onClick={() => handleReportAction(report.id, 'DISMISSED')}
                          disabled={!!actionLoading}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                          <XCircle size={14} /> Dismiss
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Stickers Tab */}
        {tab === 'stickers' && (
          <motion.div
            key="stickers"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
          >
            {!loading && stickers.length === 0 && (
              <div className="col-span-full text-center py-20 text-white/30">
                <ImageIcon size={48} className="mx-auto mb-4 opacity-20" />
                <p>No stickers pending review.</p>
              </div>
            )}
            {stickers.map(sticker => (
              <motion.div
                key={sticker.id}
                layout
                className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden"
              >
                <img
                  src={sticker.image_url}
                  alt="sticker"
                  className="w-full aspect-square object-contain p-4 bg-white/[0.02]"
                />
                <div className="p-3">
                  <div className="flex items-center gap-1.5 mb-3">
                    <User size={12} className="text-white/30" />
                    <span className="text-xs text-white/50 truncate">@{sticker.uploader?.username ?? '?'}</span>
                    <Clock size={12} className="text-white/20 ml-auto" />
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleStickerAction(sticker.id, 'APPROVED')}
                      disabled={!!actionLoading}
                      className="flex-1 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold hover:bg-green-500/20 transition-colors disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleStickerAction(sticker.id, 'REJECTED')}
                      disabled={!!actionLoading}
                      className="flex-1 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
