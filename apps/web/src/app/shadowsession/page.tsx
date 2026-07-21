'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, 
  Clock, 
  Plus, 
  ArrowRight, 
  ChevronLeft, 
  EyeOff,
  Fingerprint,
  Radio,
  Server,
  Key,
  Shield,
  Activity,
  Cpu,
  Globe
} from 'lucide-react';

/* ── DESIGN SYSTEM: SYSTEM UI ────────────────────────────────────────────────── */

const SystemStatus = ({ label, value, active = false }: { label: string, value: string, active?: boolean }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-white/20">{label}</span>
    <div className="flex items-center gap-2">
      {active && <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />}
      <span className="text-[11px] font-bold text-white/60 tracking-wider uppercase">{value}</span>
    </div>
  </div>
);

const OperationalModule = ({ icon: Icon, label, value, subtext }: any) => (
  <div className="flex items-start gap-4 p-5 rounded-2xl border border-white/[0.03] bg-white/[0.01]">
    <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/20">
      <Icon size={16} strokeWidth={1.5} />
    </div>
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-white/40">{label}</span>
        <span className="text-[10px] font-bold text-emerald-500/60 uppercase">{value}</span>
      </div>
      <p className="text-[12px] text-white/20 font-medium leading-relaxed">{subtext}</p>
    </div>
  </div>
);

const ConsoleButton = ({ icon: Icon, title, desc, onClick, primary = false }: any) => (
  <button 
    onClick={onClick}
    className={`group relative w-full p-5 sm:p-6 transition-all duration-300 flex items-center gap-5 text-left rounded-2xl border ${
      primary 
      ? 'bg-white text-black border-transparent hover:bg-white/90 active:scale-[0.98]' 
      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] active:bg-white/[0.05]'
    }`}
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300 ${
      primary ? 'bg-black/5 text-black' : 'bg-white/[0.04] text-white/30 group-hover:text-white/60'
    }`}>
      <Icon size={18} strokeWidth={1.5} />
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-[14px] font-bold tracking-tight mb-0.5">{title}</h3>
      <p className={`text-[12px] font-medium truncate ${primary ? 'text-black/50' : 'text-white/20'}`}>{desc}</p>
    </div>
    <ArrowRight size={14} className={`transition-transform duration-300 group-hover:translate-x-1 ${primary ? 'text-black/30' : 'text-white/10'}`} />
  </button>
);

/* ── COMPONENTS ──────────────────────────────────────────────────────────── */

function EnvironmentAtmosphere() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#030303]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#6366f108_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff01_1px,transparent_1px),linear-gradient(to_bottom,#ffffff01_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#030303]" />
    </div>
  );
}

/* ── MAIN LOBBY ──────────────────────────────────────────────────────────── */

export default function ShadowSessionPage() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [view, setView] = useState<'lobby' | 'creating' | 'joining'>('lobby');
  const [joinInput, setJoinInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/shadowsession/verify-access')
      .then(res => setIsRegistered(res.ok))
      .catch(() => setIsRegistered(false));
  }, []);

  const handleCreate = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/shadowsession/create', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ agreed: true, agreementVersion: 'v2.0.5' }) 
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Access Denied'); setLoading(false); return; }
      
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
      const raw = await crypto.subtle.exportKey('raw', key);
      const b64 = btoa(String.fromCharCode(...new Uint8Array(raw)));
      sessionStorage.setItem(`shadow_key_${data.code}`, b64);
      router.push(`/shadowsession/${data.code}`);
    } catch { setError('Connection failed'); setLoading(false); }
  };

  const handleJoin = async () => {
    let raw = joinInput.trim().toUpperCase(); if (!raw) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/shadowsession/join', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ code: raw }) 
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Invalid code'); setLoading(false); return; }
      router.push(`/shadowsession/${data.code}`);
    } catch { setError('Connection failed'); setLoading(false); }
  };

  if (isRegistered === null) return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center">
      <div className="w-4 h-4 border border-white/10 border-t-white rounded-full animate-spin" />
    </div>
  );
  
  return (
    <div className="min-h-screen bg-[#030303] text-white selection:bg-white selection:text-black font-sans overflow-hidden flex flex-col">
      <EnvironmentAtmosphere />

      {/* ── SYSTEM CHROME ── */}
      <header className="relative z-50 px-6 sm:px-10 py-5 border-b border-white/[0.04] bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button 
              onClick={() => accepted ? (view === 'lobby' ? setAccepted(false) : setView('lobby')) : router.push('/')}
              className="flex items-center gap-2.5 text-white/30 hover:text-white transition-colors group"
            >
              <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase">Return</span>
            </button>
            <div className="hidden sm:flex items-center gap-6 border-l border-white/[0.08] pl-8">
              <SystemStatus label="System" value="Verlyn v2" active />
              <SystemStatus label="Uplink" value="Encrypted" active />
              <SystemStatus label="Environment" value="Ephemeral" />
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
             <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40">Secured</span>
          </div>
        </div>
      </header>

      {/* ── OPERATIONAL ENVIRONMENT ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <AnimatePresence mode="wait">
          {!accepted ? (
            <motion.div 
              key="onboarding"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center"
            >
              <div className="lg:col-span-7 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.05] bg-white/[0.02] mb-8">
                  <Shield size={10} className="text-white/40" />
                  <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-white/30">Zero-Knowledge Chamber</span>
                </div>
                <h1 className="text-[clamp(2rem,5vw,3rem)] font-bold tracking-tight text-white mb-6 leading-tight">
                  Secure Communication Environment.
                </h1>
                <p className="text-[15px] text-white/30 leading-relaxed max-w-md font-medium mb-12">
                  Initialize a temporary encrypted uplink. No data persistence, no metadata logging, and complete ephemeral synchronization.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-12">
                  <OperationalModule icon={EyeOff} label="Privacy" value="Verified" subtext="End-to-end zero-knowledge encryption." />
                  <OperationalModule icon={Activity} label="Status" value="Live" subtext="Ephemeral sessions with auto-purge." />
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col items-center">
                 <div className="w-full p-8 sm:p-10 rounded-[2.5rem] border border-white/[0.06] bg-white/[0.01] backdrop-blur-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    
                    <div className="relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/20 mb-8 mx-auto">
                        <Lock size={20} strokeWidth={1.25} />
                      </div>
                      
                      <h2 className="text-[18px] font-bold text-center text-white mb-3 tracking-tight">System Ready</h2>
                      <p className="text-[13px] text-center text-white/20 mb-10 font-medium leading-relaxed">Prepare for secure uplink initialization.</p>
                      
                      <button 
                        onClick={() => setAccepted(true)}
                        className="w-full py-5 bg-white text-black font-bold text-[14px] rounded-2xl hover:bg-white/90 active:scale-[0.98] transition-all shadow-2xl flex items-center justify-center gap-3"
                      >
                        Initialize Protocol
                        <ArrowRight size={16} />
                      </button>
                    </div>
                 </div>
                 <p className="mt-8 text-[11px] text-white/10 font-bold uppercase tracking-[0.2em] text-center">
                   Agreement: v2.0.5 Shadow Protocol
                 </p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="selection"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-lg mx-auto"
            >
              <div className="flex flex-col gap-10">
                <div className="text-center">
                  <div className="flex justify-center mb-8">
                     <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/20">
                       <Cpu size={20} strokeWidth={1.25} />
                     </div>
                  </div>
                  <h2 className="text-[20px] font-bold text-white mb-3 tracking-tight">Access Console</h2>
                  <p className="text-[14px] text-white/30 font-medium">Select operational mode for this session.</p>
                </div>

                <div className="space-y-4">
                  <AnimatePresence mode="wait">
                    {view === 'lobby' && (
                      <motion.div key="l" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-4">
                        <ConsoleButton primary icon={Plus} title="Start New Session" desc="Generate unique encrypted code" onClick={() => setView('creating')} />
                        <ConsoleButton icon={Key} title="Join Session" desc="Connect via shared access uplink" onClick={() => setView('joining')} />
                      </motion.div>
                    )}

                    {view === 'creating' && (
                      <motion.div key="c" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                        <div className="p-10 rounded-[2.5rem] border border-white/[0.06] bg-white/[0.01] text-center backdrop-blur-3xl">
                          <div className="w-16 h-16 rounded-[1.5rem] bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/20 mx-auto mb-10">
                            <Server size={24} strokeWidth={1.25} className="animate-pulse" />
                          </div>
                          <h3 className="text-[18px] font-bold text-white mb-3 tracking-tight uppercase tracking-[0.1em]">Initializing</h3>
                          <p className="text-[13px] text-white/20 mb-12 font-medium leading-relaxed">Allocating encrypted resources...</p>
                          
                          {error && <div className="p-4 rounded-xl bg-red-500/5 text-red-400 text-[11px] font-bold mb-8 border border-red-500/10 uppercase tracking-widest">{error}</div>}
                          
                          <button onClick={handleCreate} disabled={loading} className="w-full py-5 bg-white text-black font-bold text-[14px] rounded-2xl hover:bg-white/90 active:scale-[0.98] transition-all">
                             {loading ? 'Preparing Uplink...' : 'Confirm Initialization'}
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {view === 'joining' && (
                      <motion.div key="j" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                        <div className="p-10 rounded-[2.5rem] border border-white/[0.06] bg-white/[0.01] text-center backdrop-blur-3xl">
                          <div className="w-16 h-16 rounded-[1.5rem] bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/20 mx-auto mb-10">
                            <Radio size={24} strokeWidth={1.25} className="animate-pulse" />
                          </div>
                          <h3 className="text-[18px] font-bold text-white mb-10 tracking-tight uppercase tracking-[0.1em]">Uplink Sync</h3>
                          <input 
                            type="text" 
                            value={joinInput} 
                            onChange={e => setJoinInput(e.target.value)} 
                            placeholder="CODE" 
                            className="w-full bg-white/[0.02] border border-white/[0.08] rounded-2xl px-6 py-6 text-white font-mono text-[24px] focus:border-white/20 focus:bg-white/[0.04] outline-none transition-all placeholder:text-white/5 text-center tracking-[0.4em] uppercase mb-10" 
                          />
                          {error && <div className="p-4 rounded-xl bg-red-500/5 text-red-400 text-[11px] font-bold mb-8 border border-red-500/10 uppercase tracking-widest">{error}</div>}
                          <button onClick={handleJoin} disabled={loading || !joinInput.trim()} className="w-full py-5 bg-white text-black font-bold text-[14px] rounded-2xl hover:bg-white/90 active:scale-[0.98] transition-all">
                             {loading ? 'Syncing...' : 'Establish Link'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-50 px-10 py-6 border-t border-white/[0.04] bg-black/20">
         <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-2">
                  <Globe size={10} className="text-white/20" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/10">Global Node: Active</span>
               </div>
               <div className="flex items-center gap-2">
                  <Cpu size={10} className="text-white/20" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/10">Node ID: SHDW-002</span>
               </div>
            </div>
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/10">© 2026 Verlyn Security</div>
         </div>
      </footer>
    </div>
  );
}
