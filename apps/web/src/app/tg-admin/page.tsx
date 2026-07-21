'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// Raw SVGs
const Icons = {
  Terminal: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
  Zap: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Send: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Archive: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
  ArrowLeft: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Lock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Check: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  Shield: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Settings: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Activity: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Search: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Pause: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
  Play: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Ghost: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></svg>,
  Eye: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
};
const X = ({ size = 20 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const Shield = ({ size = 14 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;

// Haptic feedback helper
const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
    const haptic = (window as any).Telegram.WebApp.HapticFeedback;
    if (['light', 'medium', 'heavy'].includes(style)) {
      haptic.impactOccurred(style);
    } else {
      haptic.notificationOccurred(style);
    }
  }
};

// ── Login Gate ────────────────────────────────────────────────────────────────
// The passphrase is NEVER stored in the bundle. The user types it on each session.
// It is held in React state only, sent as Bearer token to verify server-side.
function LoginGate({ onAuth }: { onAuth: (passphrase: string) => void }) {
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pass.trim()) return;
    setLoading(true);
    setError('');
    try {
      // Verify by hitting a lightweight admin endpoint
      const res = await fetch('/api/admin/audit', {
        headers: { 'Authorization': `Bearer ${pass.trim()}` }
      });
      if (res.status === 200 || res.status === 204) {
        onAuth(pass.trim());
      } else {
        setError('Access denied. Check your passphrase.');
        triggerHaptic('error');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xs"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-white text-black rounded flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <div>
            <div className="text-[12px] font-semibold tracking-widest uppercase text-white">Verlyn Command</div>
            <div className="text-[9px] text-white/30 uppercase tracking-widest">Secure Auth Required</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={pass}
              onChange={e => setPass(e.target.value)}
              placeholder="Enter passphrase..."
              autoComplete="off"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3.5 px-4 pr-11 text-[13px] text-white outline-none focus:border-white/20 transition-all placeholder:text-white/20"
            />
            <button
              type="button"
              onClick={() => setShowPass(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showPass ? <Icons.EyeOff size={14} /> : <Icons.Eye size={14} />}
            </button>
          </div>

          {error && (
            <p className="text-[10px] text-red-400 font-mono text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={!pass.trim() || loading}
            className="w-full py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all bg-white text-black disabled:bg-white/10 disabled:text-white/20"
          >
            {loading ? 'Verifying...' : 'Authenticate'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function TgAdminConsole() {
  const searchParams = useSearchParams();
  const initialCaseId = searchParams.get('case_id');

  // Passphrase lives ONLY in React state — never in the bundle, never in localStorage
  const [sessionPassphrase, setSessionPassphrase] = useState<string | null>(null);

  const [activeCaseId, setActiveCaseId] = useState<string | null>(initialCaseId);
  const [dossier, setDossier] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  
  const [reply, setReply] = useState('');
  const [whisperMode, setWhisperMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sysConfig, setSysConfig] = useState<any>({ 
    maintenance: false, 
    presence: 'online', 
    agent_name: 'Verlyn Command',
    registration_locked: false,
    site_announcement: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [lookupTarget, setLookupTarget] = useState('');
  const [lookupData, setLookupData] = useState<any>(null);
  const [inputVal, setInputVal] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Helper: admin Authorization header built from runtime state
  const adminHeader = () => ({ 'Authorization': `Bearer ${sessionPassphrase}` });

  // FETCH QUEUE
  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/admin/dashboard/tickets', {
        headers: adminHeader()
      });
      if (res.ok) {
        const data = await res.json();
        setQueue(data.tickets || []);
      }
      
      const resAudit = await fetch('/api/admin/audit', {
        headers: adminHeader()
      });
      if (resAudit.ok) {
        const auditData = await resAudit.json();
        setAuditLogs(auditData.logs || []);
      }

      const resConfig = await fetch('/api/admin/config', {
        headers: adminHeader()
      });
      if (resConfig.ok) {
        const configData = await resConfig.json();
        setSysConfig(configData.config || sysConfig);
      }
    } catch (e) { console.error('Queue error', e); }
  };

  // FETCH SPECIFIC DOSSIER
  const fetchCaseData = async () => {
    if (!activeCaseId) return;
    try {
      const resTicket = await fetch(`/api/support/ticket?case_id=${activeCaseId}`, {
        headers: adminHeader()
      });
      if (!resTicket.ok) throw new Error('Failed to retrieve dossier data.');
      const dataTicket = await resTicket.json();
      setDossier(dataTicket.ticket);

      const resMsgs = await fetch(`/api/support/messages?case_id=${activeCaseId}`, {
        headers: adminHeader()
      });
      if (resMsgs.ok) {
        const dataMsgs = await resMsgs.json();
        setMessages(dataMsgs.messages || []);
      }
    } catch (err: any) {
      setError(err.message || 'Transmission failed.');
    }
  };

  useEffect(() => {
    if (!sessionPassphrase) return;

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-web-app.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).Telegram?.WebApp) {
        const tg = (window as any).Telegram.WebApp;
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#0a0a0a');
        tg.setBackgroundColor('#0a0a0a');
      }
    };
    document.body.appendChild(script);

    const init = async () => {
      setLoading(true);
      if (activeCaseId) {
        await fetchCaseData();
      } else {
        await fetchQueue();
      }
      setLoading(false);
    };
    init();

    const interval = setInterval(() => {
      if (activeCaseId) fetchCaseData();
      else fetchQueue();
    }, 3000);
    return () => clearInterval(interval);
  }, [activeCaseId, sessionPassphrase]);

  useEffect(() => {
    if (chatScrollRef.current && activeCaseId) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, dossier, activeCaseId]);

  // Show login gate until passphrase is verified
  if (!sessionPassphrase) {
    return <LoginGate onAuth={setSessionPassphrase} />;
  }

  const handleSendReply = async () => {
    if (!reply.trim() || !dossier || sending) return;
    
    triggerHaptic('medium');
    const text = whisperMode ? `[INTERNAL] ${reply.trim()}` : reply.trim();
    setSending(true);
    setReply('');

    const tempMsg = {
      id: Date.now(),
      sender_type: 'agent',
      agent_name: 'Verlyn Command',
      content: text,
      is_internal: whisperMode,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...adminHeader()
        },
        body: JSON.stringify({ 
          case_id: dossier.case_id, 
          content: text, 
          sender_type: 'agent', 
          agent_name: 'Verlyn Command',
          is_internal: whisperMode
        })
      });
      if (!res.ok) throw new Error('Transmission failed.');
      triggerHaptic('success');
      await fetchCaseData();
    } catch (err: any) {
      triggerHaptic('error');
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      alert(`Transmission Error: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const markResolved = async () => {
    triggerHaptic('heavy');
    if (!confirm('Mark this dossier as resolved?')) return;
    try {
      await fetch('/api/support/ticket', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...adminHeader()
        },
        body: JSON.stringify({ case_id: dossier.case_id, status: 'Resolved' })
      });
      triggerHaptic('success');
      setActiveCaseId(null);
    } catch (e) { alert('Failed to update status.'); }
  };

  const togglePause = async () => {
    if (!dossier) return;
    triggerHaptic('medium');
    const newStatus = dossier.status === 'Paused' ? 'In progress' : 'Paused';
    try {
      await fetch('/api/support/ticket', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...adminHeader()
        },
        body: JSON.stringify({ case_id: dossier.case_id, status: newStatus })
      });
      await fetchCaseData();
    } catch (e) { alert('Failed to toggle pause status.'); }
  };

  const toggleShadow = async () => {
    if (!dossier) return;
    triggerHaptic('heavy');
    const newState = !dossier.is_shadowed;
    try {
      await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...adminHeader()
        },
        body: JSON.stringify({ 
          key: `shadow_${dossier.ip_address || dossier.email}`, 
          value: newState ? 'true' : 'delete' 
        })
      });
      await fetchCaseData();
    } catch (e) { alert('Failed to toggle shadow state.'); }
  };

  const filteredTickets = queue.filter(t => 
    t.case_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const executeProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || sending) return;
    
    setSending(true);
    triggerHaptic('medium');
    
    try {
      const res = await fetch('/api/support/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...adminHeader()
        },
        body: JSON.stringify({
          case_id: activeCaseId,
          message: inputVal,
          is_internal: whisperMode
        })
      });
      
      if (!res.ok) throw new Error('Transmission failed');
      
      setInputVal('');
      await fetchCaseData();
      triggerHaptic('success');
    } catch (err: any) {
      setError(err.message || 'Error executing protocol');
      triggerHaptic('error');
    } finally {
      setSending(false);
    }
  };

  const performLookup = async (target: string) => {
    setLookupTarget(target);
    try {
      const res = await fetch(`/api/admin/dashboard/lookup?target=${encodeURIComponent(target)}`, {
        headers: adminHeader()
      });
      if (res.ok) {
        const data = await res.json();
        setLookupData(data);
      } else {
        setLookupData({ error: 'Lookup failed' });
      }
    } catch (e) {
      setLookupData({ error: 'Network error' });
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center p-6 text-white font-mono uppercase tracking-[0.2em] text-[10px]">
        <div className="flex flex-col items-center gap-5 text-white/30">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="w-8 h-8 border-[1.5px] border-indigo-500/20 border-t-indigo-500 rounded-full" 
          />
          Establishing Secure Uplink...
        </div>
      </div>
    );
  }

  if (error || (activeCaseId && !dossier && !loading)) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center p-6 text-white text-center font-mono relative">
        <button 
          onClick={() => { triggerHaptic('light'); setActiveCaseId(null); setError(''); }} 
          className="absolute top-6 left-6 p-3 text-white/40 hover:text-white bg-white/[0.02] border border-white/[0.05] rounded-xl active:scale-95 transition-all">
          <Icons.ArrowLeft />
        </button>
        <div className="bg-red-500/[0.03] border border-red-500/10 p-8 rounded-3xl max-w-[280px]">
          <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4">
            <Icons.Zap />
          </div>
          <h2 className="text-[12px] uppercase tracking-widest text-red-500 mb-2 font-semibold">Signal Lost</h2>
          <p className="text-[10px] text-white/40 leading-relaxed">{error || 'Dossier not found or currently encrypted.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] text-white font-sans overflow-hidden selection:bg-indigo-500/30">
      {/* ── SETTINGS OVERLAY ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-xl bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl space-y-8">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold tracking-tighter">MISSION CONFIGURATION</h3>
                  <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">Platform Sovereignty Controls</p>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/30 uppercase tracking-widest block">Agent Presence</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={async () => {
                          setSysConfig((prev: any) => ({ ...prev, presence: 'online' }));
                          await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json', ...adminHeader() }, body: JSON.stringify({ key: 'agent_presence', value: 'online' }) });
                        }}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all border ${sysConfig.presence === 'online' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-transparent text-white/40'}`}
                      >
                        AVAILABLE
                      </button>
                      <button 
                        onClick={async () => {
                          setSysConfig((prev: any) => ({ ...prev, presence: 'away' }));
                          await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json', ...adminHeader() }, body: JSON.stringify({ key: 'agent_presence', value: 'away' }) });
                        }}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all border ${sysConfig.presence === 'away' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-white/5 border-transparent text-white/40'}`}
                      >
                        AWAY
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        
        {!activeCaseId ? (
          <motion.div 
            key="queue"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex flex-col"
          >
            <header className="h-[60px] bg-[#050505]/80 backdrop-blur-xl border-b border-white/[0.04] flex items-center justify-between px-5 shrink-0 z-20">
              <div className="flex items-center gap-3.5">
                <div className="w-7 h-7 bg-white text-black rounded flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] font-semibold tracking-widest uppercase">Verlyn Command</span>
                  <span className="text-[9px] font-mono text-emerald-400/80 uppercase tracking-widest">Active Link</span>
                </div>
              </div>
              <button 
                onClick={() => { triggerHaptic('light'); setShowSettings(!showSettings); }}
                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${showSettings ? 'bg-white text-black border-white' : 'bg-white/[0.03] text-white/40 border-white/[0.05]'}`}
              >
                <Icons.Settings />
              </button>
            </header>

            <AnimatePresence>
              {showSettings && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white/[0.02] border-b border-white/[0.04] overflow-hidden"
                >
                  <div className="p-5 grid grid-cols-2 gap-4">
                    <div className="col-span-2 grid grid-cols-3 gap-2">
                      <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.05] text-center">
                        <div className="text-[10px] text-white/30 uppercase tracking-widest">Tickets</div>
                        <div className="text-[14px] font-bold mt-1">{sysConfig.total_tickets}</div>
                      </div>
                      <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.05] text-center">
                        <div className="text-[10px] text-white/30 uppercase tracking-widest">Users</div>
                        <div className="text-[14px] font-bold mt-1">{sysConfig.total_registrations}</div>
                      </div>
                      <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.05] text-center">
                        <div className="text-[10px] text-white/30 uppercase tracking-widest">Banned</div>
                        <div className="text-[14px] font-bold mt-1 text-red-400">{sysConfig.banned_count}</div>
                      </div>
                    </div>
                    
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] text-white/30 uppercase tracking-widest block">Global Announcement</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Broadcast message..."
                          defaultValue={sysConfig.announcement || ''}
                          onBlur={async (e) => {
                            await fetch('/api/admin/config', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', ...adminHeader() },
                              body: JSON.stringify({ key: 'site_announcement', value: e.target.value })
                            });
                          }}
                          className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded-lg py-2 px-3 text-[10px] outline-none"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={async () => {
                        if (!confirm("ACTIVATE EMERGENCY LOCKDOWN? This seals all gateways.")) return;
                        setIsEmergency(true);
                      }}
                      className="col-span-2 w-full py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.3em] bg-red-600/20 text-red-500 border border-red-500/40 hover:bg-red-600/30 transition-all animate-pulse"
                    >
                      🚨 EMERGENCY LOCKDOWN
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-4 border-b border-white/[0.04]">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="SEARCH CASE / AGENT..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl py-3 pl-11 pr-4 text-[10px] uppercase tracking-widest outline-none focus:border-indigo-500/30 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {filteredTickets.map((t) => (
                <motion.div 
                  key={t.case_id}
                  onClick={() => { triggerHaptic('medium'); setActiveCaseId(t.case_id); }}
                  whileHover={{ x: 4 }}
                  className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 cursor-pointer hover:bg-white/[0.04] transition-all group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-mono text-white/30 tracking-tighter">#{t.case_id}</span>
                      <h4 className="text-[13px] font-bold tracking-tight">{t.full_name}</h4>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${
                        t.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        t.status === 'Paused' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {t.status}
                      </div>
                      <span className="text-[9px] text-white/20 font-mono">
                        {new Date(t.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-white/40 line-clamp-1">{t.subject}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="dossier"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex flex-col bg-[#050505]"
          >
            <header className="h-[60px] border-b border-white/[0.04] flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { triggerHaptic('light'); setActiveCaseId(null); }}
                  className="p-2 text-white/40 hover:text-white bg-white/[0.03] border border-white/[0.05] rounded-xl transition-all"
                >
                  <Icons.ArrowLeft size={18} />
                </button>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-indigo-400 tracking-tighter">#{dossier?.case_id}</span>
                    {dossier?.is_shadowed && (
                      <span className="text-[8px] font-bold text-indigo-500 bg-indigo-500/10 px-1 rounded border border-indigo-500/20 uppercase tracking-widest animate-pulse">
                        Shadow
                      </span>
                    )}
                  </div>
                  <h4 className="text-[12px] font-bold uppercase tracking-widest">{dossier?.full_name}</h4>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={toggleShadow}
                  className={`p-2 rounded-xl border transition-all ${dossier?.is_shadowed ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 animate-pulse' : 'bg-white/[0.03] text-white/40 border-white/[0.05]'}`}
                  title="Toggle Shadow Monitoring"
                >
                  <Icons.Ghost size={16} />
                </button>
                <button 
                  onClick={togglePause}
                  className={`p-2 rounded-xl border transition-all ${dossier?.status === 'Paused' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-white/[0.03] text-white/40 border-white/[0.05]'}`}
                >
                  {dossier?.status === 'Paused' ? <Icons.Play size={16} /> : <Icons.Pause size={16} />}
                </button>
                <button 
                  onClick={markResolved}
                  className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl"
                >
                  <Icons.Check size={16} />
                </button>
              </div>
            </header>

            <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-5 custom-scrollbar">
              <div className="text-[13px] leading-relaxed text-white/60 bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl italic">
                {dossier?.description}
              </div>

              {messages.map((m) => {
                const isInternal = m.is_internal || m.content.startsWith('[INTERNAL]');
                return (
                  <div key={m.id} className={`flex flex-col max-w-[85%] ${
                    m.sender_type === 'user' ? 'self-start' : 'self-end'
                  } ${isInternal ? 'bg-purple-900/20 border border-purple-500/30' : 
                    m.sender_type === 'user' ? 'bg-zinc-900 border border-zinc-800' : 'bg-emerald-950/20 border border-emerald-500/30'} rounded-2xl p-4 shadow-xl`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        m.sender_type === 'user' ? 'text-blue-400' : 
                        isInternal ? 'text-purple-400' : 'text-emerald-400'
                      }`}>
                        {m.sender_type === 'user' ? 'Client' : m.agent_name}
                        {isInternal && ' (Whisper)'}
                      </span>
                      <span className="text-[9px] text-zinc-600 font-mono">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`text-[13px] leading-relaxed ${isInternal ? 'italic opacity-90' : ''}`}>
                      {m.content.replace('[INTERNAL] ', '')}
                    </div>
                  </div>
                );
              })}

              {dossier?.device_proof && (
                <div className="mt-4 p-4 border border-zinc-800 rounded-xl bg-black/50 text-[11px] font-mono break-all text-white/50">
                  <div className="text-zinc-500 mb-2 font-bold uppercase tracking-widest text-[9px]">Hardware Fingerprint</div>
                  {dossier.device_proof}
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-[#0a0a0a]/90 backdrop-blur-2xl border-t border-white/[0.04] shrink-0 pb-safe z-20">
              {dossier?.status === 'Resolved' ? (
                <div className="w-full bg-white/[0.02] border border-white/[0.05] rounded-full py-3.5 text-[12px] font-mono uppercase tracking-widest text-center text-emerald-500/50">
                  <Icons.Check /> <span className="ml-2 inline-block relative top-[-2px]">Case Resolved</span>
                </div>
              ) : (
                <form onSubmit={executeProtocol} className="w-full relative flex items-center">
                  <div className="absolute left-4 text-white/30 pointer-events-none">
                    <Icons.Terminal />
                  </div>
                  <input 
                    type="text" 
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    placeholder="Execute protocol..."
                    disabled={sending}
                    className="w-full bg-white/[0.03] border border-white/[0.05] rounded-full pl-11 pr-12 py-3.5 text-[14px] text-white outline-none focus:border-white/[0.15] focus:bg-white/[0.05] transition-all placeholder:text-white/20 shadow-inner"
                  />
                  <button 
                    disabled={!inputVal.trim() || sending}
                    className={`absolute right-1.5 w-10 h-10 flex items-center justify-center rounded-full transition-all 
                      ${inputVal.trim() && !sending 
                        ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] active:scale-90' 
                        : 'bg-transparent text-white/20'}`}
                  >
                    {sending ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full" />
                    ) : (
                      <Icons.Send />
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lookupTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/90">Dossier: {lookupTarget}</h3>
              </div>
              <div className="p-6">
                {lookupData ? (
                  <>
                    {lookupData.reg && (
                      <div className="space-y-4 mb-6">
                        <div className="flex justify-between items-center bg-white/[0.02] p-3 rounded-lg border border-white/[0.04]">
                          <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Network Origin</span>
                          <span className="text-xs font-mono text-white/70">{lookupData.reg.raw_ip}</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Case History</span>
                      <div className="space-y-2">
                        {lookupData.tix?.length > 0 ? lookupData.tix.map((t: any) => (
                          <div key={t.case_id} className="bg-white/[0.02] p-3 rounded-lg border border-white/[0.04] flex justify-between items-center">
                            <span className="text-[10px] font-mono text-white/60">{t.case_id}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${t.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                              {t.status}
                            </span>
                          </div>
                        )) : (
                          <p className="text-[10px] text-white/20 italic">No previous cases found.</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-12 flex justify-center">
                    <div className="w-6 h-6 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="p-6 bg-white/[0.01] border-t border-white/10">
                <button 
                  onClick={() => { setLookupTarget(''); setLookupData(null); }}
                  className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/60 transition-all"
                >
                  Terminate Dossier
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TgAdminPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-[1.5px] border-white/10 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <TgAdminConsole />
    </Suspense>
  );
}
