'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, Trash2, Loader2, Users, Clock,
  Search, CheckCheck, XCircle, ChevronDown,
  ShieldCheck, ArrowDownAZ, ArrowUpAZ
} from 'lucide-react';
import {
  getIncomingFollowRequestsDB,
  acceptFollowRequestNewDB,
  rejectFollowRequestDB,
  bulkAcceptFollowRequestsDB,
  bulkRejectFollowRequestsDB,
} from '@/app/(main)/profile/actions';
import { getAvatarUrl } from '@/lib/utils';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';

type SortMode = 'newest' | 'oldest' | 'verified';

interface RequestItem {
  id: string;
  createdAt: string;
  requester: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified?: boolean;
  };
  isMutual?: boolean;
}

interface Props {
  onClose: () => void;
  onUpdate?: () => void;
}

export default function FollowRequestsModal({ onClose, onUpdate }: Props) {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);
  const currentUser = useAppStore(s => s.currentUser);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const res = await getIncomingFollowRequestsDB();
    if (res.success && res.data) {
      setRequests(res.data as RequestItem[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Realtime subscription — live badge + list updates
  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase
      .channel(`follow-requests-modal:${currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT', // Only new requests arriving — local state handles removals
        schema: 'public',
        table: 'follow_requests',
        filter: `target_id=eq.${currentUser.id}`,
      }, () => { fetchRequests(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, supabase, fetchRequests]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Close sort dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAccept = async (requesterId: string) => {
    if (actioningId || bulkLoading) return;
    setActioningId(requesterId);
    const res = await acceptFollowRequestNewDB(requesterId);
    if (res.success) {
      setRequests(prev => prev.filter(r => r.requester.id !== requesterId));
      setSelected(prev => { const s = new Set(prev); s.delete(requesterId); return s; });
      window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: 'Accepted', type: 'success' } }));
      if (onUpdate) onUpdate();
    } else {
      window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: res.error || 'Failed to accept', type: 'error' } }));
    }
    setActioningId(null);
  };

  const handleReject = async (requesterId: string) => {
    if (actioningId || bulkLoading) return;
    setActioningId(requesterId);
    const res = await rejectFollowRequestDB(requesterId);
    if (res.success) {
      setRequests(prev => prev.filter(r => r.requester.id !== requesterId));
      setSelected(prev => { const s = new Set(prev); s.delete(requesterId); return s; });
      window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: 'Request removed', type: 'info' } }));
      if (onUpdate) onUpdate();
    } else {
      window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: res.error || 'Failed to remove', type: 'error' } }));
    }
    setActioningId(null);
  };

  const handleBulkAccept = async () => {
    if (selected.size === 0 || bulkLoading) return;
    setBulkLoading(true);
    const ids = Array.from(selected);
    const res = await bulkAcceptFollowRequestsDB(ids);
    if (res.success) {
      setRequests(prev => prev.filter(r => !ids.includes(r.requester.id)));
      setSelected(new Set());
      setSelectMode(false);
      window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: `Accepted ${ids.length} request${ids.length > 1 ? 's' : ''}`, type: 'success' } }));
      if (onUpdate) onUpdate();
    } else {
      window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: res.error || 'Bulk accept failed', type: 'error' } }));
    }
    setBulkLoading(false);
  };

  const handleBulkReject = async () => {
    if (selected.size === 0 || bulkLoading) return;
    setBulkLoading(true);
    const ids = Array.from(selected);
    const res = await bulkRejectFollowRequestsDB(ids);
    if (res.success) {
      setRequests(prev => prev.filter(r => !ids.includes(r.requester.id)));
      setSelected(new Set());
      setSelectMode(false);
      window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: `Removed ${ids.length} request${ids.length > 1 ? 's' : ''}`, type: 'info' } }));
      if (onUpdate) onUpdate();
    } else {
      window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: res.error || 'Bulk reject failed', type: 'error' } }));
    }
    setBulkLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(r => r.requester.id)));
    }
  };

  const sortLabels: Record<SortMode, { label: string; icon: React.ReactNode }> = {
    newest:   { label: 'Newest First',      icon: <ArrowDownAZ size={13} /> },
    oldest:   { label: 'Oldest First',      icon: <ArrowUpAZ size={13} /> },
    verified: { label: 'Verified First',    icon: <ShieldCheck size={13} /> },
  };

  // Filter
  const filtered = useMemo(() => {
    let list = [...requests];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        r.requester.display_name?.toLowerCase().includes(q) ||
        r.requester.username?.toLowerCase().includes(q)
      );
    }
    switch (sort) {
      case 'newest':
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'verified':
        list.sort((a, b) => (b.requester.is_verified ? 1 : 0) - (a.requester.is_verified ? 1 : 0));
        break;
    }
    return list;
  }, [requests, search, sort]);

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="requests-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        key="requests-sheet"
        initial={{ opacity: 0, y: 56, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 56, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 440, damping: 38 }}
        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
      >
        <div 
          className="w-full max-w-[420px] max-h-[80vh] flex flex-col bg-[#080808]/35 backdrop-blur-3xl border border-white/[0.08] rounded-[32px] pointer-events-auto overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.95)]"
          onClick={(e) => e.stopPropagation()}
        >

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2.5">
              <Clock size={14} className="text-white/40" />
              <h2 className="text-[13px] font-extrabold uppercase tracking-widest text-white leading-none">
                Follow Requests
              </h2>
              {requests.length > 0 && (
                <span className="text-[10px] font-bold bg-white/10 text-white/60 rounded-full px-2 py-0.5 leading-none">
                  {requests.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Select Mode Toggle */}
              {requests.length > 0 && (
                <button
                  onClick={() => { setSelectMode(m => !m); setSelected(new Set()); }}
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all ${
                    selectMode
                      ? 'bg-white/10 text-white'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                  }`}
                >
                  {selectMode ? 'Done' : 'Select'}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/5 active:scale-95 transition-all text-white/40 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Search + Sort toolbar */}
          {requests.length > 0 && (
            <div className="flex items-center gap-2 px-5 pb-3">
              {/* Search */}
              <div className="flex-1 relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search requests…"
                  className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg pl-8 pr-3 py-2 text-[12px] text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="relative" ref={sortRef}>
                <button
                  onClick={() => setSortOpen(o => !o)}
                  className="flex items-center gap-1.5 text-[11px] text-white/50 hover:text-white/80 bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-2 transition-all whitespace-nowrap"
                >
                  {sortLabels[sort].icon}
                  <ChevronDown size={11} className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {sortOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 top-full mt-1.5 bg-[#0f0f0f] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden z-10 w-44"
                    >
                      {(Object.entries(sortLabels) as [SortMode, { label: string; icon: React.ReactNode }][]).map(([key, { label, icon }]) => (
                        <button
                          key={key}
                          onClick={() => { setSort(key); setSortOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] transition-colors text-left ${
                            sort === key
                              ? 'text-white bg-white/[0.06] font-semibold'
                              : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                          }`}
                        >
                          {icon}
                          {label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Bulk actions bar */}
          <AnimatePresence>
            {selectMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-2.5 border-y border-white/[0.06] bg-white/[0.02]">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-white/50 hover:text-white transition-colors"
                  >
                    <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all ${
                      allSelected ? 'bg-white border-white' : 'border-white/30'
                    }`}>
                      {allSelected && <Check size={10} className="text-black stroke-[3]" />}
                    </div>
                    {allSelected ? 'Deselect All' : `Select All (${filtered.length})`}
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBulkAccept}
                      disabled={selected.size === 0 || bulkLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-[11px] font-bold disabled:opacity-40 hover:bg-neutral-200 active:scale-95 transition-all"
                    >
                      {bulkLoading ? <Loader2 size={11} className="animate-spin" /> : <CheckCheck size={11} className="stroke-[2.5]" />}
                      Accept {selected.size > 0 ? `(${selected.size})` : ''}
                    </button>
                    <button
                      onClick={handleBulkReject}
                      disabled={selected.size === 0 || bulkLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 text-[11px] font-bold disabled:opacity-40 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 active:scale-95 transition-all"
                    >
                      {bulkLoading ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
                      Delete {selected.size > 0 ? `(${selected.size})` : ''}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 min-h-[200px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 size={18} className="animate-spin text-white/20" />
                <span className="text-[11px] text-white/20 font-semibold uppercase tracking-widest">Loading…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center">
                  {search ? <Search size={18} className="text-white/20" /> : <Users size={18} className="text-white/20" />}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest leading-none">
                    {search ? 'No results' : 'No pending requests'}
                  </p>
                  <p className="text-[11px] text-white/20 mt-1.5 max-w-[200px] leading-relaxed">
                    {search ? `No requests matching "${search}"` : 'Incoming follow requests will appear here.'}
                  </p>
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filtered.map((req) => (
                  <motion.div
                    key={req.requester.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                    transition={{ duration: 0.18 }}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                      selectMode && selected.has(req.requester.id)
                        ? 'bg-white/[0.05] border-white/[0.12]'
                        : 'bg-white/[0.015] border-white/[0.04] hover:border-white/[0.07]'
                    }`}
                  >
                    {/* Checkbox (select mode) */}
                    {selectMode && (
                      <button
                        onClick={() => toggleSelect(req.requester.id)}
                        className="shrink-0"
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          selected.has(req.requester.id) ? 'bg-white border-white' : 'border-white/30'
                        }`}>
                          {selected.has(req.requester.id) && <Check size={11} className="text-black stroke-[3]" />}
                        </div>
                      </button>
                    )}

                    {/* User info */}
                    <Link
                      href={`/profile/${req.requester.username}`}
                      onClick={onClose}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={getAvatarUrl(req.requester.username, req.requester.avatar_url)}
                          alt={req.requester.display_name}
                          className="w-10 h-10 rounded-full object-cover border border-white/[0.06] bg-neutral-900"
                        />
                        {req.requester.is_verified && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border border-black">
                            <Check size={8} className="text-white stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-white truncate leading-tight">
                          {req.requester.display_name}
                        </p>
                        <p className="text-[11px] text-white/40 truncate mt-0.5">@{req.requester.username}</p>
                        <p className="text-[10px] text-white/25 mt-0.5">
                          {(() => {
                            const d = new Date(req.createdAt);
                            const now = new Date();
                            const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
                            if (diff < 60) return 'just now';
                            if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
                            if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
                            return `${Math.floor(diff / 86400)}d ago`;
                          })()}
                        </p>
                      </div>
                    </Link>

                    {/* Actions (hidden in select mode) */}
                    {!selectMode && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleAccept(req.requester.id)}
                          disabled={actioningId !== null || bulkLoading}
                          className="px-3 py-1.5 rounded-lg bg-white text-black text-[11px] font-bold hover:bg-neutral-200 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                          title="Accept"
                        >
                          {actioningId === req.requester.id ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <>
                              <Check size={11} className="stroke-[2.5]" />
                              <span>Confirm</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleReject(req.requester.id)}
                          disabled={actioningId !== null || bulkLoading}
                          className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/50 text-[11px] font-bold hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                          title="Delete Request"
                        >
                          {actioningId === req.requester.id ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <span>Delete</span>
                          )}
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
