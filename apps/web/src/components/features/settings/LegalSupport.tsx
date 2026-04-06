'use client';

import { useState } from 'react';
import { HelpCircle, ChevronDown, Scale, Info, Mail, Send, CheckCircle2, Loader2, Sparkles, AlertCircle, FileLock, Gavel, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FAQ = [
  { q: "How is my identity data secured?", a: "Verlyn utilizes a federated encryption kernel. Your profile data is stored in our sovereign Supabase cluster, but all direct intelligence (DMs) are protected with the Signal Protocol (Double Ratchet Algorithm). Private keys remain on your node." },
  { q: "What defines my Security Score?", a: "Your score is a calculation of 2FA status, password entropy, and session health. A score of 80%+ is required for Prime Identity status." },
  { q: "Can I purge my digital footprint?", a: "Absolutely. Under the Terminal section, you can execute a 'Core Erasure'. This triggers an irreversible deletion cycle that scrubs your existence from the orbital cloud cluster." },
  { q: "How do community trust scores work?", a: "Trust is a consensus mechanism based on Karma and network lifespan. High trust allows for moderator privileges in Sovereign Communities." },
];

export default function LegalSupport() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activePolicy, setActivePolicy] = useState<'privacy' | 'terms' | null>(null);

  const handleSubmit = (e: any) => {
      e.preventDefault();
      setLoading(true);
      setTimeout(() => {
          setLoading(false);
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
      }, 1500);
  }

  return (
    <div className="space-y-12 max-w-4xl animate-fade-in pb-20 italic">
      <section>
        <div className="flex items-center gap-3 mb-8 px-1">
          <HelpCircle size={18} className="text-v-cyan" />
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Knowledge Matrix</h2>
        </div>
        <div className="space-y-4">
          {FAQ.map((f, i) => (
            <div key={i} className="glass-card border-none bg-surface-lowest/30 overflow-hidden rounded-[28px] shadow-2xl transition-all hover:bg-surface-lowest/50">
              <button 
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-8 py-6 text-left transition-colors"
              >
                <div className="flex items-center gap-4">
                    <div className="w-1 h-1 rounded-full bg-v-cyan shadow-[0_0_8px_var(--v-cyan)]" />
                    <span className="text-xs font-black uppercase tracking-widest opacity-80 italic">{f.q}</span>
                </div>
                <ChevronDown size={18} className={`transition-transform duration-500 text-on-surface-variant ${activeFaq === i ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {activeFaq === i && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                  >
                    <div className="px-8 pb-8 pt-2 text-[11px] font-medium text-on-surface-variant leading-relaxed opacity-60 max-w-2xl border-l-[3px] border-l-v-cyan mx-8 mb-4">
                      {f.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-8 px-1">
          <Gavel size={18} className="text-v-violet" />
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Protocol Code (Legal)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <PolicyCard 
             icon={FileLock} 
             title="Privacy Policy" 
             desc="Data collection, user rights, and sovereign encryption data-laws."
             onClick={() => setActivePolicy('privacy')}
           />
           <PolicyCard 
             icon={Scale} 
             title="Terms of Protocol" 
             desc="Accountability, content governance, and identity responsibilities."
             onClick={() => setActivePolicy('terms')}
           />
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-8 px-1">
          <Mail size={18} className="text-v-cyan" />
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Transmission Request</h2>
        </div>
        <div className="glass-card p-10 border-none bg-surface-lowest/40 rounded-[40px] shadow-3xl">
           <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 mb-2 block">Subject Kernel</label>
                   <input required className="w-full bg-surface-lowest border border-white/5 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-v-cyan/30 transition-all font-bold italic" placeholder="e.g. Identity Restoration" />
                </div>
                <div className="glass-card p-6 border-none bg-v-violet/5 rounded-3xl border border-v-violet/10 italic">
                    <div className="flex items-center gap-3 mb-3 text-v-violet">
                        <Sparkles size={16} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Neural Support</span>
                    </div>
                    <p className="text-[9px] font-medium text-on-surface-variant opacity-60 leading-relaxed uppercase tracking-tighter">
                        Support transmissions are prioritized based on security score. Level 80+ nodes receive sub-hour response cycles.
                    </p>
                </div>
              </div>
              <div className="space-y-6 flex flex-col">
                <div className="flex-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-1 mb-2 block">Intelligence Data</label>
                   <textarea required className="w-full h-full bg-surface-lowest border border-white/5 rounded-3xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-v-cyan/30 transition-all font-medium min-h-[120px] resize-none italic" placeholder="Detail your transmission..." />
                </div>
                <button 
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex items-center justify-center gap-2 py-4 bg-primary-gradient rounded-full font-black uppercase tracking-widest text-[10px] shadow-2xl hover:scale-[1.03] active:scale-95 transition-all text-white disabled:opacity-50"
                >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                    {loading ? <Loader2 size={16} className="animate-spin" /> : success ? <CheckCircle2 size={16} /> : <Send size={16} />}
                    <span className="italic tracking-widest">{loading ? 'TRANSMITTING...' : success ? 'SIGNAL SENT' : 'INITIALIZE SEND'}</span>
                </button>
              </div>
           </form>
        </div>
      </section>

      {/* Policy Overlay */}
      <AnimatePresence>
          {activePolicy && (
              <div className="fixed inset-0 z-[101] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-fade-in">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass-card w-full max-w-4xl max-h-[85vh] p-8 md:p-14 border-none bg-[#050505] shadow-[0_32px_128px_rgba(0,0,0,1)] rounded-[50px] overflow-hidden flex flex-col italic"
                  >
                        <div className="flex justify-between items-center mb-10 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-v-violet/10 flex items-center justify-center text-v-violet">
                                    <Scale size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none">{activePolicy === 'privacy' ? 'Privacy Protocol' : 'Terms of Protocol'}</h3>
                                    <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest mt-1">VERLYN_LEGAL_ID: V1.0-ALFA-2026</p>
                                </div>
                            </div>
                            <button onClick={() => setActivePolicy(null)} className="w-12 h-12 rounded-full hover:bg-white/10 flex items-center justify-center transition-all">
                                <X size={24} className="opacity-50 hover:opacity-100" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-6 space-y-10 custom-scrollbar text-[13px] font-medium text-on-surface-variant opacity-80 leading-relaxed italic">
                             {activePolicy === 'privacy' ? (
                                 <>
                                    <section className="space-y-4">
                                        <h4 className="text-lg font-black text-white italic uppercase tracking-tight">1. DATA HARVESTING & COLLECTION</h4>
                                        <p>At Verlyn, your digital identity is yours. We explicitly collect: Biological profile data (display name, bio), cryptographic authentication signals (email, login hashes), and interaction telemetry (likes, follows). We DO NOT collect keystroke data or off-platform shadows.</p>
                                    </section>
                                    <section className="space-y-4">
                                        <h4 className="text-lg font-black text-white italic uppercase tracking-tight">2. END-TO-END SOVEREIGNTY</h4>
                                        <p>Private messages are protected via the Signal Protocol. Verlyn operators cannot audit your neural transmissions (DMs). Metadata regarding session timestamps is stored for 30 cycles for security auditing before being scrubbed.</p>
                                    </section>
                                    <section className="space-y-4">
                                        <h4 className="text-lg font-black text-white italic uppercase tracking-tight">3. ACCOUNT ERASURE (GDPR 2026)</h4>
                                        <p>You maintain a permanent right to erasure. Executing a "Terminal Purge" scrubbed all records from our primary and secondary orbital clusters. This cycle is irreversible.</p>
                                    </section>
                                 </>
                             ) : (
                                 <>
                                    <section className="space-y-4">
                                        <h4 className="text-lg font-black text-white italic uppercase tracking-tight">1. USER RESPONSIBILITY</h4>
                                        <p>Nodes are responsible for all broadcasts originating from their identity vector. Identity theft must be reported immediately via Priority Signal.</p>
                                    </section>
                                    <section className="space-y-4">
                                        <h4 className="text-lg font-black text-white italic uppercase tracking-tight">2. NETWORK CONDUCT</h4>
                                        <p>Malicious neural injection (spam), protocol exploits, or targeted harassment of other nodes is strictly forbidden. Violations trigger an immediate Karma Purge or identity suspension.</p>
                                    </section>
                                    <section className="space-y-4">
                                        <h4 className="text-lg font-black text-white italic uppercase tracking-tight">3. VOID LIABILITY</h4>
                                        <p>Verlyn operates on an Alpha protocol. We are not responsible for data anomalies caused by edge-node failures or interplanetary signal lag.</p>
                                    </section>
                                 </>
                             )}
                        </div>
                        <div className="mt-10 pt-10 border-t border-white/5 shrink-0">
                             <button onClick={() => setActivePolicy(null)} className="w-full py-5 bg-white text-black font-black uppercase tracking-[0.3em] text-[10px] rounded-2xl shadow-2xl hover:bg-v-cyan transition-all active:scale-95 italic"> ACKNOWLEDGE PROTOCOL </button>
                        </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
}

function PolicyCard({ icon: Icon, title, desc, onClick }: any) {
    return (
        <button onClick={onClick} className="glass-card p-10 border-none bg-surface-lowest/30 rounded-[32px] text-left hover:bg-surface-lowest/60 transition-all group shadow-xl">
           <div className="w-12 h-12 rounded-2xl bg-v-violet/5 flex items-center justify-center text-v-violet mb-6 group-hover:scale-110 transition-transform shadow-inner">
               <Icon size={24} />
           </div>
           <h3 className="text-base font-black italic uppercase italic tracking-tighter text-white mb-2">{title}</h3>
           <p className="text-[10px] font-medium text-on-surface-variant opacity-40 leading-tight uppercase tracking-tight">{desc}</p>
        </button>
    )
}

function X({ size, className }: any) { return <AlertCircle size={size} className={className} /> }
