'use client';

import type { Theme } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import {
  Shield, Bell, User, Lock, HelpCircle, Info,
  ExternalLink, ChevronRight, Check
} from 'lucide-react';
import { VERLYN_CONTACT } from '@/lib/types';

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
      className={`flex items-center gap-3 px-4 py-3.5 ${onClick ? 'cursor-pointer hover:bg-surface-high/50 transition-colors' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => { if (onClick && e.key === 'Enter') onClick(); }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface)' }}>
        <Icon size={17} style={{ color: 'var(--v-violet)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</div>
        {desc && <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{desc}</div>}
      </div>
      {right ?? <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />}
    </div>
  );
}

// Premium pill toggle — matches design spec
function PersistToggle({ on, onToggle, id }: { on: boolean; onToggle: () => void; id: string }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={on}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className="flex-shrink-0 relative w-11 h-6 rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v-violet)]"
      style={{ background: on ? 'var(--v-violet)' : 'var(--surface-high)' }}
      title={on ? 'Enabled (click to disable)' : 'Disabled (click to enable)'}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 flex items-center justify-center"
        style={{ transform: on ? 'translateX(20px)' : 'translateX(0)' }}
      >
        {on && <Check size={11} className="text-violet-600" strokeWidth={3} />}
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const {
    theme, setTheme,
    settingE2EE, setSettingE2EE,
    settingTwoFA, setSettingTwoFA,
    settingPushNotifs, setSettingPushNotifs,
    settingEmailDigest, setSettingEmailDigest,
  } = useAppStore();

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <h1 className="text-2xl font-black gradient-text">Settings</h1>

      {/* Appearance */}
      <SettingSection title="Appearance">
        <div className="p-4 space-y-2">
          <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Theme</div>
          <div className="grid grid-cols-2 gap-2">
            {THEME_OPTIONS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                className="text-left p-3 rounded-xl border transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--v-violet)]"
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

      {/* Privacy & Security — PERSISTED */}
      <SettingSection title="Privacy & Security">
        <SettingRow
          icon={Lock}
          label="End-to-End Encryption"
          desc="Encrypt all DMs with Signal Protocol"
          right={<PersistToggle id="toggle-e2ee" on={settingE2EE} onToggle={() => setSettingE2EE(!settingE2EE)} />}
        />
        <SettingRow
          icon={Shield}
          label="Two-Factor Authentication"
          desc="Protect your account with 2FA"
          right={<PersistToggle id="toggle-2fa" on={settingTwoFA} onToggle={() => setSettingTwoFA(!settingTwoFA)} />}
        />
        <SettingRow icon={User} label="Privacy Settings" desc="Control who sees your content" />
        <SettingRow icon={Shield} label="Blocked Users" desc="Manage blocked accounts" />
      </SettingSection>

      {/* Notifications — PERSISTED */}
      <SettingSection title="Notifications">
        <SettingRow
          icon={Bell}
          label="Push Notifications"
          desc="Receive alerts on your device"
          right={<PersistToggle id="toggle-push" on={settingPushNotifs} onToggle={() => setSettingPushNotifs(!settingPushNotifs)} />}
        />
        <SettingRow
          icon={Bell}
          label="Email Digest"
          desc="Weekly summary of your activity"
          right={<PersistToggle id="toggle-email" on={settingEmailDigest} onToggle={() => setSettingEmailDigest(!settingEmailDigest)} />}
        />
        <SettingRow icon={Bell} label="Notification Preferences" desc="Customize per-category alerts" />
      </SettingSection>

      {/* About */}
      <SettingSection title="About Verlyn">
        <SettingRow icon={Info} label="About Verlyn" desc="Version 0.1.0-alpha · verlyn.in" />
        <SettingRow icon={HelpCircle} label="Help & Support" desc="Get help from the Verlyn team" />
      </SettingSection>

      {/* Developer Contact */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--text-tertiary)' }}>Developer & Support Contact</h2>
        <div className="glass-card overflow-hidden divide-y" style={{ borderColor: 'var(--border)' }}>
          {VERLYN_CONTACT.map((c) => (
            <a
              key={c.platform}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-high/50"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: 'var(--surface)' }}>
                {c.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{c.platform}</div>
                <div className="text-xs" style={{ color: 'var(--v-violet-light)' }}>{c.label}</div>
              </div>
              <ExternalLink size={14} style={{ color: 'var(--text-tertiary)' }} />
            </a>
          ))}
        </div>
      </div>

      <div className="text-center text-xs pt-2" style={{ color: 'var(--text-tertiary)' }}>
        <p>Verlyn Platform · verlyn.in</p>
        <p className="mt-1">Built with <span style={{ color: 'var(--v-pink)' }}>❤️</span> · Signal Protocol E2EE · WebRTC Voice/Video</p>
        <p className="mt-1 font-mono text-[10px]">v0.1.0-alpha · 2026</p>
      </div>
    </div>
  );
}
