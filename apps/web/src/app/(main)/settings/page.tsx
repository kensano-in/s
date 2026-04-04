'use client';


import type { Theme } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import {
  Shield, Bell, User, Lock, HelpCircle, Info,
  ExternalLink, ChevronRight, ToggleLeft, ToggleRight
} from 'lucide-react';
import { VERLYN_CONTACT } from '@/lib/types';
import { useState } from 'react';

const THEME_OPTIONS: { key: Theme; label: string; desc: string }[] = [
  { key: 'midnight', label: '🌌 Midnight', desc: 'Deep dark — easy on the eyes' },
  { key: 'oled', label: '⚫ OLED Dark', desc: 'Pure black for OLED screens' },
  { key: 'corporate', label: '🏢 Corporate', desc: 'Professional blue-steel tones' },
  { key: 'light', label: '☀️ Minimal Light', desc: 'Clean and bright' },
];

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-bold uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--text-tertiary)' }}>{title}</h2>
      <div className="glass-card overflow-hidden divide-y" style={{ borderColor: 'var(--border)' }}>
        {children}
      </div>
    </div>
  );
}

function SettingRow({ icon: Icon, label, desc, right, onClick }: {
  icon: React.ElementType; label: string; desc?: string;
  right?: React.ReactNode; onClick?: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
      onClick={onClick}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface)' }}>
        <Icon size={16} style={{ color: 'var(--v-violet)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</div>
        {desc && <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{desc}</div>}
      </div>
      {right ?? <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />}
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex-shrink-0">
      {on
        ? <ToggleRight size={24} style={{ color: 'var(--v-violet)' }} />
        : <ToggleLeft size={24} style={{ color: 'var(--text-tertiary)' }} />}
    </button>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useAppStore();
  const [e2ee, setE2ee] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [twoFA, setTwoFA] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <h1 className="text-2xl font-black gradient-text">Settings</h1>

      {/* Appearance */}
      <SettingSection title="Appearance">
        <div className="p-4 space-y-2">
          <div className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Theme</div>
          <div className="grid grid-cols-2 gap-2">
            {THEME_OPTIONS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                className="text-left p-3 rounded-xl border transition-all duration-200"
                style={{
                  background: theme === t.key ? 'rgba(108,99,255,0.12)' : 'var(--surface)',
                  borderColor: theme === t.key ? 'var(--v-violet)' : 'var(--border)',
                  boxShadow: theme === t.key ? '0 0 12px rgba(108,99,255,0.2)' : 'none',
                }}
                id={`theme-${t.key}`}
              >
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </SettingSection>

      {/* Privacy & Security */}
      <SettingSection title="Privacy & Security">
        <SettingRow icon={Lock} label="End-to-End Encryption" desc="Encrypt all DMs with Signal Protocol" right={<Toggle on={e2ee} onToggle={() => setE2ee((v) => !v)} />} />
        <SettingRow icon={Shield} label="Two-Factor Authentication" desc="Protect your account with 2FA" right={<Toggle on={twoFA} onToggle={() => setTwoFA((v) => !v)} />} />
        <SettingRow icon={User} label="Privacy Settings" desc="Control who sees your content" />
        <SettingRow icon={Shield} label="Blocked Users" desc="Manage blocked accounts" />
      </SettingSection>

      {/* Notifications */}
      <SettingSection title="Notifications">
        <SettingRow icon={Bell} label="Push Notifications" desc="Receive alerts on your device" right={<Toggle on={pushNotifs} onToggle={() => setPushNotifs((v) => !v)} />} />
        <SettingRow icon={Bell} label="Email Digest" desc="Weekly summary of your activity" right={<Toggle on={false} onToggle={() => {}} />} />
        <SettingRow icon={Bell} label="Notification Preferences" desc="Customize per-category alerts" />
      </SettingSection>

      {/* About */}
      <SettingSection title="About Verlyn">
        <SettingRow icon={Info} label="About Verlyn" desc="Version 0.1.0-alpha · verlyn.in" />
        <SettingRow icon={HelpCircle} label="Help & Support" desc="Get help from the Verlyn team" />
      </SettingSection>

      {/* Contact / Developer */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--text-tertiary)' }}>Developer & Support Contact</h2>
        <div className="glass-card overflow-hidden divide-y" style={{ borderColor: 'var(--border)' }}>
          {VERLYN_CONTACT.map((c) => (
            <a
              key={c.platform}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 transition-opacity hover:opacity-80"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: 'var(--surface)' }}>
                {c.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.platform}</div>
                <div className="text-xs" style={{ color: 'var(--v-violet-light)' }}>{c.label}</div>
              </div>
              <ExternalLink size={14} style={{ color: 'var(--text-tertiary)' }} />
            </a>
          ))}
        </div>
      </div>

      {/* Version footer */}
      <div className="text-center text-xs pt-2" style={{ color: 'var(--text-tertiary)' }}>
        <p>Verlyn Platform · verlyn.in</p>
        <p className="mt-1">Built with <span style={{ color: 'var(--v-pink)' }}>❤️</span> · Signal Protocol E2EE · WebRTC Voice/Video</p>
        <p className="mt-1 font-mono text-[10px]">v0.1.0-alpha · 2026</p>
      </div>
    </div>
  );
}
