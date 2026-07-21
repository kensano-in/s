'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Shield, Scale, Landmark, MessageSquare, Users, Terminal, Heart, 
  AlertTriangle, CheckCircle, Info, Search, ShieldAlert, Key, Globe, Eye,
  Lock, FileText, Ban, Trash2, HelpCircle, HardDrive, Compass, Cpu, Settings, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GUIDELINES_DATA, GuidelineEntry } from './guidelinesData';

type FooterModal = 'legal' | 'status' | 'privacy' | null;

const FOOTER_CONTENT: Record<string, { title: string; body: React.ReactNode }> = {
  legal: {
    title: 'Legal Terms of Service',
    body: (
      <div className="space-y-4 text-[12px] leading-relaxed text-neutral-400">
        <p>By accessing and using Verlyn, you enter into a legally binding agreement with Verlyn Global Security &amp; Trust Compliance Corp. These terms govern your use of all platform services, APIs, websocket connections, and related digital infrastructure.</p>
        <p><strong className="text-neutral-200">Acceptance of Terms.</strong> Your continued use of Verlyn constitutes irrevocable acceptance of all terms, amendments, and addenda published in this directory. Verlyn reserves the right to update these terms at any time with 30 days notice via in-platform notification.</p>
        <p><strong className="text-neutral-200">Termination Rights.</strong> Verlyn reserves the right to suspend or terminate any account that violates these terms, with or without prior notice, at its sole discretion. Users may also delete their accounts at any time from the settings panel.</p>
        <p><strong className="text-neutral-200">Governing Law.</strong> These terms are governed by the laws of the applicable jurisdiction, including international digital commerce acts. Disputes shall be resolved through binding arbitration.</p>
        <p><strong className="text-neutral-200">Service Availability.</strong> Verlyn does not guarantee 100% uptime and is not liable for service interruptions caused by infrastructure failures, force majeure events, or scheduled maintenance windows.</p>
        <p><strong className="text-neutral-200">Modifications.</strong> Verlyn may modify, suspend, or discontinue any feature at any time. Users will be notified of material changes to core service functionality.</p>
      </div>
    )
  },
  status: {
    title: 'System Status & Infrastructure Health',
    body: (
      <div className="space-y-5 text-[12px] leading-relaxed text-neutral-400">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-emerald-400 text-[11px] uppercase tracking-wider">All Systems Operational</span>
        </div>
        <div className="space-y-2">
          {[
            { label: 'Realtime WebSocket Layer', status: 'Operational' },
            { label: 'Message Delivery Pipeline', status: 'Operational' },
            { label: 'Database Read/Write', status: 'Operational' },
            { label: 'CDN & Media Uploads', status: 'Operational' },
            { label: 'Authentication Services', status: 'Operational' },
            { label: 'Community Channels', status: 'Operational' },
            { label: 'Moderation Automation', status: 'Operational' },
            { label: 'Push Notification Service', status: 'Operational' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-white/[0.03]">
              <span className="text-neutral-300">{item.label}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">{item.status}</span>
            </div>
          ))}
        </div>
        <p className="text-neutral-600 text-[10px]">Last checked: {new Date().toUTCString()}</p>
      </div>
    )
  },
  privacy: {
    title: 'Privacy Shield Policy',
    body: (
      <div className="space-y-4 text-[12px] leading-relaxed text-neutral-400">
        <p>Verlyn is committed to protecting your personal information. This Privacy Shield policy outlines how we collect, use, store, and protect your data in accordance with GDPR, CCPA, and applicable international privacy regulations.</p>
        <p><strong className="text-neutral-200">Data We Collect.</strong> We collect authentication credentials, session metadata, usage patterns, and voluntarily submitted profile details. We do not scan the content of private messages.</p>
        <p><strong className="text-neutral-200">Data Storage.</strong> All personal data is stored in encrypted, access-controlled database clusters. Data residency follows regional data sovereignty requirements, including EU Data Boundary regulations.</p>
        <p><strong className="text-neutral-200">Data Sharing.</strong> We do not sell, rent, or commercially transfer user data to third parties. Data is shared only with law enforcement when required by valid legal process.</p>
        <p><strong className="text-neutral-200">Your Rights.</strong> You have the right to access, correct, export, or delete your personal data at any time. Submit a data request through the settings panel under Privacy Controls.</p>
        <p><strong className="text-neutral-200">Retention.</strong> Account data is retained for 12 months after account deletion for legal compliance. Message content is purged immediately upon account deletion.</p>
        <p><strong className="text-neutral-200">Cookies.</strong> We use strictly necessary session cookies only. We do not deploy advertising trackers or third-party analytics cookies.</p>
      </div>
    )
  }
};

export default function GuidelinesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('preamble');
  const [searchQuery, setSearchQuery] = useState('');
  const [footerModal, setFooterModal] = useState<FooterModal>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFooterModal(null); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Map icon strings to Lucide elements
  const getIcon = (name: string) => {
    switch (name) {
      case 'Landmark': return <Landmark size={13} />;
      case 'Globe': return <Globe size={13} />;
      case 'Key': return <Key size={13} />;
      case 'Shield': return <Shield size={13} />;
      case 'Eye': return <Eye size={13} />;
      case 'MessageSquare': return <MessageSquare size={13} />;
      case 'Terminal': return <Terminal size={13} />;
      case 'Cpu': return <Cpu size={13} />;
      case 'Users': return <Users size={13} />;
      case 'Settings': return <Settings size={13} />;
      case 'ShieldAlert': return <ShieldAlert size={13} />;
      case 'HardDrive': return <HardDrive size={13} />;
      case 'Heart': return <Heart size={13} />;
      case 'Scale': return <Scale size={13} />;
      case 'AlertTriangle': return <AlertTriangle size={13} />;
      case 'FileText': return <FileText size={13} />;
      case 'Compass': return <Compass size={13} />;
      case 'Ban': return <Ban size={13} />;
      default: return <Scale size={13} />;
    }
  };

  // Filter based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery) return GUIDELINES_DATA;
    const lower = searchQuery.toLowerCase();
    return GUIDELINES_DATA.filter(s => 
      s.label.toLowerCase().includes(lower) || 
      s.title.toLowerCase().includes(lower) ||
      s.explanationEssay.some(p => p.toLowerCase().includes(lower))
    );
  }, [searchQuery]);

  const activeContent = useMemo(() => {
    return GUIDELINES_DATA.find(s => s.id === activeTab) || GUIDELINES_DATA[0];
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#050507] text-neutral-300 font-sans selection:bg-indigo-500/35 selection:text-white">
      {/* Background Glows */}
      <div className="fixed top-0 left-1/4 w-[400px] h-[400px] bg-indigo-500/[0.03] rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[450px] h-[450px] bg-rose-500/[0.03] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.03]">
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] text-white/70 hover:text-white transition-all duration-200 active:scale-95 text-xs font-semibold"
          >
            <ArrowLeft size={13} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>Return to Workspace</span>
          </button>
          
          <div className="flex items-center gap-2 text-white/30 text-xs font-bold uppercase tracking-widest">
            <Scale size={12} className="text-indigo-400" />
            <span>Verlyn Safety Center</span>
          </div>
        </header>

        {/* Hero */}
        <div className="mb-8 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest">
            <Shield size={10} />
            <span>Governance Protocols v4.22</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Trust, Safety &amp; Legal Compliance Directory
          </h1>
          <p className="text-xs text-neutral-500 max-w-3xl leading-relaxed">
            This directory details the 35 specific sections governing platform activity, rate monitoring, and legal compliance.
          </p>
        </div>

        {/* Search */}
        <div className="mb-6 relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" size={14} />
          <input
            type="text"
            placeholder="Search all 35 guidelines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.04] border border-white/[0.05] rounded-xl text-xs text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all"
          />
        </div>

        {/* Split UI */}
        <div className="flex-1 flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Sidebar */}
          <nav className="w-full lg:w-[320px] shrink-0 flex flex-col gap-1 max-h-[500px] lg:max-h-[650px] overflow-y-auto pr-2 border-b lg:border-b-0 lg:border-r border-white/[0.04] pb-4 lg:pb-0 scrollbar-thin">
            {filteredSections.map((s) => {
              const active = activeTab === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveTab(s.id)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left text-[11px] font-semibold tracking-wide transition-all duration-200 shrink-0 ${
                    active 
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_4px_15px_rgba(99,102,241,0.1)]' 
                      : 'bg-white/[0.01] border-white/[0.03] text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {getIcon(s.iconName)}
                    <span className="truncate">{s.label}</span>
                  </div>
                  <span className="text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/[0.03] text-neutral-600 font-bold ml-2">
                    {s.category}
                  </span>
                </button>
              );
            })}
            {filteredSections.length === 0 && (
              <div className="text-center py-8 text-xs text-neutral-600">No matching guidelines found.</div>
            )}
          </nav>

          {/* Content Pane */}
          <main className="flex-1 w-full bg-[#0a0a0f]/40 border border-white/[0.04] rounded-2xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden min-h-[450px]">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeContent.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="space-y-8"
              >
                {/* Header */}
                <div className="border-b border-white/[0.04] pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      {getIcon(activeContent.iconName)}
                      {activeContent.title}
                    </h2>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                      {activeContent.article}
                    </p>
                  </div>
                  <span className="self-start md:self-center text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    Category: {activeContent.category}
                  </span>
                </div>

                {/* Body Content */}
                <div className="space-y-6 text-xs leading-relaxed text-neutral-400">
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={12} className="text-neutral-500" />
                      Rule Explanation
                    </h3>
                    <div className="space-y-3 pl-3.5 border-l border-white/[0.04] text-neutral-300">
                      {activeContent.explanationEssay.map((p, i) => (
                        <p key={i} className="leading-relaxed">
                          {p}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="p-4 rounded-xl bg-rose-500/[0.02] border border-rose-500/10 space-y-2.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                        <AlertTriangle size={12} /> Prohibited Violations (How it breaks)
                      </span>
                      <ul className="list-disc pl-4 text-[11px] leading-relaxed text-neutral-500 space-y-1.5">
                        {activeContent.violationsList.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-500/[0.02] border border-emerald-500/10 space-y-2.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle size={12} /> Avoidance &amp; Compliance (How to avoid)
                      </span>
                      <div className="text-[11px] leading-relaxed text-neutral-500 space-y-2">
                        {activeContent.avoidanceDetail.map((p, i) => (
                          <p key={i}>{p}</p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] space-y-2 mt-4">
                    <h4 className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                      <Info size={11} /> Platform Monitoring &amp; Automation
                    </h4>
                    <div className="text-[11px] text-neutral-500 leading-relaxed space-y-2">
                      {activeContent.howItWorksDetail.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  </div>
                </div>

              </motion.div>
            </AnimatePresence>
          </main>

        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/[0.03] flex flex-col md:flex-row items-center justify-between text-[10px] text-neutral-600 font-semibold tracking-wider gap-4">
          <div>
            VERLYN GLOBAL SECURITY &amp; TRUST COMPLIANCE CORP &copy; 2026.
          </div>
          <div className="flex gap-4">
            <button onClick={() => setFooterModal('legal')} className="hover:text-neutral-400 transition-colors">Legal Terms</button>
            <button onClick={() => setFooterModal('status')} className="hover:text-neutral-400 transition-colors">System Status</button>
            <button onClick={() => setFooterModal('privacy')} className="hover:text-neutral-400 transition-colors">Privacy Shield</button>
          </div>
        </footer>

        {/* Footer Modals */}
        <AnimatePresence>
          {footerModal && FOOTER_CONTENT[footerModal] && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => { if (e.target === e.currentTarget) setFooterModal(null); }}
            >
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
              <motion.div
                ref={modalRef}
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.18 }}
                className="relative z-10 w-full max-w-xl bg-[#0d0d12] border border-white/[0.06] rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/[0.04]">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {FOOTER_CONTENT[footerModal].title}
                  </h3>
                  <button
                    onClick={() => setFooterModal(null)}
                    className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/40 hover:text-white transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
                {FOOTER_CONTENT[footerModal].body}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
