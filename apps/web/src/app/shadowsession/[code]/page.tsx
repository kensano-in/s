'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Trash2, 
  Users, 
  Shield, 
  Clock, 
  LogOut, 
  Settings,
  ChevronLeft,
  Activity,
  Cpu,
  Globe,
  Lock,
  Terminal,
  Zap,
  MessageSquare,
  Key
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

const IconButton = ({ icon: Icon, onClick, danger = false, active = false }: any) => (
  <button 
    onClick={onClick}
    className={`p-3 rounded-xl transition-all duration-300 border ${
      danger 
      ? 'text-red-400 hover:bg-red-400/10 border-transparent active:scale-95' 
      : active
        ? 'text-white bg-white/[0.08] border-white/10'
        : 'text-white/30 hover:text-white/60 hover:bg-white/[0.02] border-transparent'
    }`}
  >
    <Icon size={18} strokeWidth={1.5} />
  </button>
);

/* ── COMPONENTS ──────────────────────────────────────────────────────────── */

function EnvironmentAtmosphere() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#030303]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#6366f108_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff01_1px,transparent_1px),linear-gradient(to_bottom,#ffffff01_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
    </div>
  );
}

const CommandPanel = ({ isOpen, onClose, onAction, isLocked, extensionCount, presence }: any) => {
  const isJoinerActive = presence.joiner > 0 && (Date.now() - presence.joiner < 15000);
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md" 
          onClick={onClose}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 10 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            className="w-full max-w-[440px] bg-[#0A0A0A] border border-white/[0.08] rounded-[2.5rem] relative overflow-hidden shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            <div className="p-10 border-b border-white/[0.05] bg-white/[0.01]">
               <h2 className="text-[18px] font-bold text-white mb-2 tracking-tight">System Commands</h2>
               <p className="text-[13px] text-white/30 font-medium leading-relaxed">Execute operational protocols on this uplink.</p>
            </div>
            <div className="grid grid-cols-2 p-6 gap-4">
               {[
                 { id: 'lock', icon: isLocked ? Shield : Lock, title: isLocked ? 'Resume' : 'Lock Room', desc: 'Secure uplink', active: isLocked },
                 { id: 'extend', icon: Clock, title: 'Add Time', desc: `${2 - extensionCount} slots`, disabled: extensionCount >= 2 },
                 { id: 'kick', icon: Users, title: 'Kick Peer', desc: isJoinerActive ? 'Online' : 'Absent', disabled: !isJoinerActive },
                 { id: 'terminate', icon: Zap, title: 'Terminate', desc: 'Destroy room', danger: true }
               ].map((act: any) => (
                 <button 
                  key={act.id} 
                  onClick={() => onAction(act.id === 'lock' ? (isLocked ? 'unlock' : 'lock') : act.id)} 
                  disabled={act.disabled} 
                  className={`p-5 rounded-2xl border border-white/[0.03] transition-all duration-300 text-left group ${act.danger ? 'bg-red-500/[0.03] hover:bg-red-500/[0.06] border-red-500/10' : 'bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.08]'}`}
                 >
                    <div className={`mb-4 transition-colors ${act.danger ? 'text-red-400/60' : 'text-white/20'}`}>
                      <act.icon size={18} strokeWidth={1.5} />
                    </div>
                    <div className={`text-[13px] font-bold mb-1 ${act.danger ? 'text-red-400/80' : 'text-white/80'}`}>{act.title}</div>
                    <div className="text-[11px] text-white/20 font-medium">{act.desc}</div>
                 </button>
               ))}
            </div>
            <div className="p-8 border-t border-white/[0.05] bg-white/[0.01] flex justify-end">
               <button onClick={onClose} className="px-8 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-[11px] font-bold text-white/40 hover:text-white transition-all">Close Console</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ── MAIN ROOM ──────────────────────────────────────────────────────────── */

export default function ShadowChatRoom({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
  const { code } = React.use(params);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [systemMsgs, setSystemMsgs] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'active' | 'waiting' | 'expired' | 'destroyed' | 'kicked'>('active');
  const [role, setRole] = useState<'creator' | 'joiner' | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(3600);
  const [extensionCount, setExtensionCount] = useState(0);
  const [presence, setPresence] = useState({ creator: 0, joiner: 0 });
  const [typing, setTyping] = useState({ creator: 0, joiner: 0 });
  
  const [showExit, setShowExit] = useState(false);
  const [showPower, setShowPower] = useState(false);
  const [lastTypingAt, setLastTypingAt] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const poll = async () => {
    try {
      const res = await fetch(`/api/shadowsession/room-state/${code}`);
      if (!res.ok) {
        if (res.status === 401) { router.push(`/shadowsession?join=${code}`); return; }
        const data = await res.json();
        setStatus(data.status || 'expired');
        return;
      }
      const data = await res.json();
      setStatus(data.status);
      setRole(data.role);
      setIsLocked(data.isLocked);
      setTimeLeft(data.remainingSeconds);
      setExtensionCount(data.extensionCount);
      setPresence(data.presence);
      setTyping(data.typing);
      setSystemMsgs(data.systemMsgs || []);
      if (data.kickedJoiner) setStatus('kicked');
    } catch (e) { console.error('Signal sync lost', e); }
  };

  useEffect(() => { poll(); const itv = setInterval(poll, 1500); setLoading(false); return () => clearInterval(itv); }, [code]);

  const triggerAction = async (action: string) => {
    try {
      const res = await fetch(`/api/shadowsession/room-state/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) { if (action === 'terminate') setStatus('destroyed'); poll(); }
    } catch (e) { console.error('Protocol failure', e); }
  };

  const handleSend = async () => {
    if (!input.trim() || isLocked) return;
    const text = input.trim();
    setInput('');
    const msg = { id: Date.now(), text, self: true, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, msg]);
    await fetch(`/api/shadowsession/messages/${code}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    }).catch(() => {});
  };

  const handleTyping = () => {
    const now = Date.now();
    if (now - lastTypingAt > 2000) {
      setLastTypingAt(now);
      fetch(`/api/shadowsession/room-state/${code}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'typing' }) });
    }
  };

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, systemMsgs]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60); const sc = s % 60;
    return `${m}:${sc.toString().padStart(2, '0')}`;
  };

  const isOtherTyping = role === 'creator' ? (Date.now() - typing.joiner < 3000) : (Date.now() - typing.creator < 3000);
  const isOtherActive = role === 'creator' ? (presence.joiner > 0 && Date.now() - presence.joiner < 15000) : (presence.creator > 0 && Date.now() - presence.creator < 15000);

  if (loading) return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center">
      <div className="w-4 h-4 border border-white/10 border-t-white rounded-full animate-spin" />
    </div>
  );

  if (status !== 'active' && status !== 'waiting') return (
    <div className="h-screen bg-[#030303] flex flex-col items-center justify-center p-8 text-center">
      <EnvironmentAtmosphere />
      <div className="relative z-10 w-full max-sm:max-w-xs max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mx-auto mb-10">
           <Zap size={24} strokeWidth={1} className="text-white/20" />
        </div>
        <h1 className="text-[18px] font-bold text-white mb-3 tracking-tight uppercase tracking-widest">Protocol Purged</h1>
        <p className="text-[13px] text-white/30 mb-10 font-medium leading-relaxed px-4">This ephemeral uplink has been permanently destroyed. All data purged.</p>
        <button onClick={() => router.push('/shadowsession')} className="w-full py-5 bg-white text-black font-bold text-[14px] rounded-2xl hover:bg-white/90 active:scale-[0.98] transition-all">Exit Chamber</button>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-[#030303] text-white flex flex-col relative overflow-hidden selection:bg-white selection:text-black font-sans">
      <EnvironmentAtmosphere />
      
      {/* ── SYSTEM CHROME ── */}
      <header className="relative z-50 px-6 sm:px-10 py-5 border-b border-white/[0.04] bg-black/20 backdrop-blur-xl shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button 
              onClick={() => setShowExit(true)}
              className="flex items-center gap-2.5 text-white/30 hover:text-white transition-colors group"
            >
              <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase">Disconnect</span>
            </button>
            <div className="hidden sm:flex items-center gap-8 border-l border-white/[0.08] pl-8">
              <SystemStatus label="Session Code" value={code} />
              <SystemStatus label="Uplink" value={isOtherActive ? 'Peer Connected' : 'Wait Sync'} active={isOtherActive} />
              <SystemStatus label="Purge In" value={formatTime(timeLeft)} active={timeLeft < 300} />
            </div>
          </div>
          <div className="flex items-center gap-4">
             {role === 'creator' && (
               <button 
                onClick={() => setShowPower(true)}
                className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/40 text-[10px] font-bold uppercase tracking-widest hover:bg-white/[0.08] hover:text-white transition-all flex items-center gap-2"
               >
                 <Settings size={14} strokeWidth={1.5} />
                 <span>Console</span>
               </button>
             )}
             <div className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Secured</span>
             </div>
          </div>
        </div>
      </header>

      {/* ── OPERATIONAL INTERFACE ── */}
      <main className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-10 custom-scrollbar scroll-smooth">
           <div className="max-w-4xl mx-auto w-full">
              <div className="flex flex-col items-center py-20 border-b border-white/[0.03] mb-12">
                 <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/10 mb-6">
                    <Shield size={24} strokeWidth={1} />
                 </div>
                 <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/10 text-center">Chamber Environment Established<br/><span className="text-[9px] opacity-50">Zero-Knowledge Link Active</span></p>
              </div>

              <div className="space-y-12 pb-20">
                {systemMsgs.map((sm, i) => (
                  <div key={`sys-${i}`} className="flex justify-center">
                    <div className="px-4 py-2 rounded-xl bg-white/[0.01] border border-white/[0.04] text-[9px] font-bold tracking-[0.2em] uppercase text-white/10">
                       {sm.text}
                    </div>
                  </div>
                ))}

                {messages.map((m) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col ${m.self ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`text-[10px] font-bold tracking-widest uppercase ${m.self ? 'text-white/40' : 'text-indigo-400/60'}`}>
                        {m.self ? 'Authorized Identity' : 'Remote Peer'}
                      </span>
                      <span className="text-[9px] font-bold text-white/10">{m.time}</span>
                    </div>
                    <div className={`relative max-w-[85%] sm:max-w-[70%] p-5 rounded-2xl border ${
                      m.self 
                      ? 'bg-white/[0.02] border-white/[0.06] text-white/80' 
                      : 'bg-indigo-500/[0.03] border-indigo-500/10 text-white'
                    }`}>
                      <p className="text-[14px] leading-relaxed font-medium selection:bg-white selection:text-black">{m.text}</p>
                    </div>
                  </motion.div>
                ))}
                
                {isOtherTyping && (
                  <div className="flex justify-start">
                    <div className="px-5 py-4 rounded-xl bg-white/[0.01] border border-white/[0.03] flex gap-1.5 items-center">
                       <div className="w-1.5 h-1.5 rounded-full bg-white/10 animate-bounce" style={{ animationDelay: '0ms' }} />
                       <div className="w-1.5 h-1.5 rounded-full bg-white/10 animate-bounce" style={{ animationDelay: '200ms' }} />
                       <div className="w-1.5 h-1.5 rounded-full bg-white/10 animate-bounce" style={{ animationDelay: '400ms' }} />
                    </div>
                  </div>
                )}
              </div>
           </div>
        </div>

        {/* Console Input */}
        <div className="shrink-0 p-6 sm:p-10 border-t border-white/[0.04] bg-black/40 backdrop-blur-3xl relative z-20">
           <div className="max-w-4xl mx-auto">
              <div className={`relative group ${isLocked ? 'opacity-50' : ''}`}>
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-white/20 group-focus-within:text-white/40 transition-colors">
                  <Terminal size={16} strokeWidth={1.5} />
                </div>
                <input 
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => { setInput(e.target.value); handleTyping(); }}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  disabled={isLocked}
                  placeholder={isLocked ? "Uplink Locked" : "Transmit encrypted packet..."}
                  className="w-full bg-white/[0.02] border border-white/[0.08] rounded-2xl pl-16 pr-24 py-6 text-[15px] font-medium text-white placeholder:text-white/10 outline-none focus:border-white/20 focus:bg-white/[0.04] transition-all"
                />
                <div className="absolute inset-y-2 right-2 flex items-center">
                   <button 
                    onClick={handleSend}
                    disabled={!input.trim() || isLocked}
                    className="h-full px-6 rounded-xl bg-white text-black font-bold text-[11px] uppercase tracking-widest hover:bg-white/90 active:scale-95 disabled:opacity-30 transition-all flex items-center gap-2"
                   >
                     Send
                     <Send size={14} />
                   </button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-6 px-2">
                 <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Zap size={10} className="text-white/20" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/10">Burst Mode: {isLocked ? 'Locked' : 'Active'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare size={10} className="text-white/20" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/10">Traffic: {messages.length + systemMsgs.length} PKTS</span>
                    </div>
                 </div>
                 <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/10">Layer: SHA-256 GCM Environment</div>
              </div>
           </div>
        </div>
      </main>

      <AnimatePresence>
         {showExit && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
             <div className="w-full max-w-[400px] border border-white/[0.08] rounded-[2.5rem] bg-[#0A0A0A] p-10 text-center shadow-2xl">
               <h3 className="text-[20px] font-bold text-white mb-4 tracking-tight uppercase tracking-widest">Disconnect?</h3>
               <p className="text-[14px] text-white/30 mb-10 leading-relaxed font-medium">Session keys will be purged from local memory. The channel remains active until expiration.</p>
               <div className="flex flex-col gap-3">
                 <button onClick={() => router.push('/shadowsession')} className="w-full py-5 rounded-2xl bg-white text-black font-bold text-[14px] hover:bg-white/90 transition-all">Confirm Exit</button>
                 <button onClick={() => setShowExit(false)} className="w-full py-5 rounded-2xl bg-white/[0.03] text-white/40 font-bold text-[14px] hover:bg-white/[0.06] transition-all">Stay Connected</button>
               </div>
             </div>
           </motion.div>
         )}
      </AnimatePresence>

      <CommandPanel 
        isOpen={showPower} 
        onClose={() => setShowPower(false)} 
        onAction={triggerAction} 
        isLocked={isLocked} 
        extensionCount={extensionCount} 
        presence={presence} 
      />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
      `}</style>
    </div>
  );
}
