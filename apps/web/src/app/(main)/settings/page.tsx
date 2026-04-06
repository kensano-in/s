'use client';

import { useState, useMemo } from 'react';
import { User, Shield, Bell, Palette, Scale, AlertTriangle, Mail, ChevronRight, LayoutDashboard, Database, Info, Loader2, Sparkles, CheckCircle2, Target, Fingerprint, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

// Sections
import PersonalInformation from '@/components/features/settings/PersonalInformation';
import PrivacySecurity from '@/components/features/settings/PrivacySecurity';
import Notifications from '@/components/features/settings/Notifications';
import Appearance from '@/components/features/settings/Appearance';
import LegalSupport from '@/components/features/settings/LegalSupport';
import AccountControl from '@/components/features/settings/AccountControl';
import AccountIntegrity from '@/components/features/settings/AccountIntegrity';

const SECTIONS = [
  { id: 'personal', label: 'Identity', icon: User, desc: 'Personal Integrity' },
  { id: 'privacy', label: 'Sovereignty', icon: Shield, desc: 'Privacy & Security' },
  { id: 'notifications', label: 'Signals', icon: Bell, desc: 'Transmission Hub' },
  { id: 'appearance', label: 'Interface', icon: Palette, desc: 'Visual Kernels' },
  { id: 'legal', label: 'Protocols', icon: Scale, desc: 'Legal & Knowledge' },
  { id: 'account', label: 'Terminal', icon: AlertTriangle, desc: 'Account Control' },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('personal');

  const renderContent = () => {
    switch (activeSection) {
      case 'personal': return <PersonalInformation />;
      case 'privacy': return <PrivacySecurity />;
      case 'notifications': return <Notifications />;
      case 'appearance': return <Appearance />;
      case 'legal': return <LegalSupport />;
      case 'account': return <AccountControl />;
      default: return <PersonalInformation />;
    }
  };

  const activeLabel = useMemo(() => SECTIONS.find(s => s.id === activeSection), [activeSection]);

  return (
    <div className="flex flex-col lg:flex-row gap-12 max-w-7xl mx-auto pb-32 animate-fade-in relative px-4 italic">
      {/* Background Atmosphere */}
      <div className="fixed top-0 right-1/4 w-[800px] h-[800px] bg-primary-dark/10 rounded-[100%] blur-[200px] pointer-events-none opacity-40 -z-10" />
      <div className="fixed bottom-0 left-1/4 w-[600px] h-[600px] bg-v-cyan/5 rounded-[100%] blur-[150px] pointer-events-none opacity-20 -z-10" />

      {/* Navigation Sidebar */}
      <aside className="lg:w-80 flex-shrink-0">
        <div className="lg:sticky lg:top-12 space-y-10">
          <div className="px-6 mb-12">
            <h1 className="text-5xl font-black italic tracking-tighter text-white uppercase leading-none mb-3">Control</h1>
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-v-cyan animate-pulse shadow-[0_0_8px_var(--v-cyan)]" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60">Sovereign Node v1.0.4-alfa</p>
            </div>
          </div>

          <nav className="space-y-2 p-1">
            {SECTIONS.map((section) => {
              const active = activeSection === section.id;
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full group flex items-center justify-between px-6 py-4.5 rounded-[24px] transition-all duration-500 relative overflow-hidden ${
                    active ? 'bg-surface-lowest shadow-[0_20px_40px_rgba(0,0,0,0.4)]' : 'hover:bg-white/[0.04]'
                  }`}
                >
                  {active && (
                    <motion.div 
                      layoutId="active-nav-line" 
                      className="absolute left-0 top-3 bottom-3 w-1.5 bg-v-accent shadow-[0_0_20px_var(--v-accent-glow)] rounded-full" 
                    />
                  )}
                  <div className="flex items-center gap-5">
                    <Icon 
                      size={20} 
                      className={`transition-all duration-500 ${active ? 'text-v-accent scale-110 shadow-[0_0_15px_var(--v-accent-glow)]' : 'text-on-surface-variant opacity-50 group-hover:opacity-100 group-hover:text-white'}`} 
                    />
                    <div className="text-left italic">
                        <span className={`block text-xs font-black uppercase tracking-[0.1em] ${active ? 'text-white' : 'text-on-surface-variant opacity-50 group-hover:opacity-100'}`}>
                        {section.label}
                        </span>
                    </div>
                  </div>
                  {active && <ChevronRight size={14} className="text-v-accent opacity-50" />}
                </button>
              )
            })}
          </nav>

          <div className="pt-12 px-6">
             <div className="glass-card p-6 border-none bg-surface-lowest/40 rounded-[32px] border border-white/5 shadow-inner italic">
                <div className="flex items-center gap-3 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">
                   <ShieldCheck size={14} className="text-v-emerald" /> SIGNAL SECURED
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-on-surface-variant opacity-40 uppercase tracking-widest">Priority Reach</p>
                    <a href="mailto:shinichiro.in@proton.me" className="text-xs font-black text-white hover:text-v-cyan transition-colors underline-offset-4 hover:underline">
                    shinichiro.in@proton.me
                    </a>
                </div>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        <AccountIntegrity />

        <div className="mb-12 px-2 italic">
           <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60 mb-4 italic">
              Control <ChevronRight size={12} className="opacity-40" /> {activeLabel?.label}
           </div>
           <h2 className="text-5xl font-black italic text-white uppercase tracking-tighter leading-none drop-shadow-2xl">
              {activeLabel?.desc}
           </h2>
        </div>

        <div className="relative">
           <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, x: 30, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -30, scale: 0.98 }}
                transition={{ duration: 0.5, ease: [0.04, 0.62, 0.23, 0.98] }}
              >
                {renderContent()}
              </motion.div>
           </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
