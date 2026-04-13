'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Users, Info, ExternalLink, ScrollText, CheckCircle2, ChevronRight } from 'lucide-react';
import { LEGAL_TEXT } from '@/constants/legal-constants';

export type LegalSection = 'contact' | 'upload' | 'terms';

interface LegalOverlayProps {
  section: LegalSection | null;
  onClose: () => void;
}

const SUMMARY_CONTENT = {
  contact: {
    title: 'Identity & Security',
    icon: <Shield className="text-blue-500" size={24} />,
    summary: "Verlyn uses your contact information to establish a secure foundation for your professional identity, account recovery, and multi-factor authentication.",
    bullets: ['Encrypted storage', 'Real-time threat detection', 'Multi-device sync']
  },
  upload: {
    title: 'Network Discovery',
    icon: <Users className="text-purple-500" size={24} />,
    summary: "Build your professional legacy by connecting with existing teammates through secure cryptographic hashing of your contact data.",
    bullets: ['One-way hashing', 'Opt-out anytime', 'Teammate suggestions']
  },
  terms: {
    title: 'Governance & Privacy',
    icon: <Info className="text-emerald-500" size={24} />,
    summary: "Join a professional ecosystem governed by strict data integrity standards and the California Legal Framework.",
    bullets: ['Data portability', 'Zero-spoofing policy', 'Transparent analytics']
  }
};

export default function LegalOverlay({ section, onClose }: LegalOverlayProps) {
  const [fullView, setFullView] = useState(false);
  const [activeChapter, setActiveChapter] = useState<'terms' | 'privacy' | 'cookies'>('terms');
  
  if (!section) return null;
  const summary = SUMMARY_CONTENT[section];
  const fullData = LEGAL_TEXT[activeChapter];

  return (
    <AnimatePresence>
      {section && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-12">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/95 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className={`relative w-full ${fullView ? 'max-w-3xl h-[85vh]' : 'max-w-[480px]'} bg-[#070707] border border-white/5 rounded-3xl overflow-hidden flex flex-col transition-all duration-500 shadow-2xl`}
          >
            {/* Header */}
            <div className="p-6 flex justify-between items-center border-b border-white/5 bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/5">
                  {fullView ? <ScrollText size={20} className="text-neutral-400" /> : summary.icon}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    {fullView ? 'Verlyn Global Governance' : summary.title}
                  </h2>
                  {fullView && <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest">v2.6.4 • California Jurisdiction</p>}
                </div>
              </div>
              <button 
                onClick={() => {
                  setFullView(false);
                  onClose();
                }} 
                className="p-2 text-neutral-600 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chapter Navigation (FullView Only) */}
            {fullView && (
              <div className="px-6 py-3 border-b border-white/5 flex gap-1.5 overflow-x-auto no-scrollbar bg-black">
                {(['terms', 'privacy', 'cookies'] as const).map((chap) => (
                  <button
                    key={chap}
                    onClick={() => setActiveChapter(chap)}
                    className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      activeChapter === chap 
                        ? 'bg-white text-black' 
                        : 'text-neutral-600 hover:text-neutral-300'
                    }`}
                  >
                    {LEGAL_TEXT[chap].title}
                  </button>
                ))}
              </div>
            )}

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10 select-text">
              <AnimatePresence mode="wait">
                {!fullView ? (
                  <motion.div 
                    key="summary"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-8"
                  >
                    <p className="text-sm font-medium text-neutral-400 leading-relaxed italic">
                      "{summary.summary}"
                    </p>

                    <div className="space-y-4 pt-2">
                       <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest mb-4">Core Standards</p>
                      {summary.bullets.map((bullet, i) => (
                        <div key={i} className="flex items-center gap-3 text-[13px] font-bold text-neutral-300">
                          <CheckCircle2 size={16} className="text-emerald-500 fill-emerald-500/10" />
                          {bullet}
                        </div>
                      ))}
                    </div>

                    <div className="pt-6 border-t border-white/5">
                       <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                        Verlyn maintains a professional reputation engine. By continuing, you agree to our comprehensive legal frameworks governed by California Law.
                       </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key={activeChapter}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-12"
                  >
                    <header>
                      <h1 className="text-3xl font-black text-white tracking-tighter mb-2">{fullData.title}</h1>
                      <div className="h-1 w-12 bg-emerald-500 rounded-full" />
                    </header>

                    {fullData.chapters.map((chapter, idx) => (
                      <section key={idx} className="space-y-4">
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                          <span className="text-neutral-800">[{idx + 1}]</span>
                          {chapter.title}
                        </h3>
                        <p className="text-sm text-neutral-400 leading-[1.8] font-medium text-justify">
                          {chapter.content}
                        </p>
                      </section>
                    ))}

                    <footer className="pt-12 border-t border-white/5">
                       <p className="text-[10px] text-neutral-700 font-bold uppercase tracking-widest leading-loose">
                        Verlyn Identity Systems © 2026. All Rights Reserved. This document holds binding weight under the Jurisdiction of the State of California. Unauthorized replication of this governance framework is strictly prohibited.
                       </p>
                    </footer>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-white/[0.01] border-t border-white/5 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setFullView(!fullView)}
                className="flex-[0.4] h-12 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/5 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 group"
              >
                {fullView ? (
                  <>Summary View <X size={14} className="group-hover:rotate-90 transition-transform" /></>
                ) : (
                  <>View Full Governance <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
              <button
                onClick={() => {
                   setFullView(false);
                   onClose();
                }}
                className="flex-1 h-12 bg-white text-black font-black uppercase tracking-[0.1em] text-xs rounded-xl hover:bg-neutral-200 transition-all flex items-center justify-center"
              >
                Acknowledge Standards
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
