'use client';

import type { Theme } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import {
  Shield, Bell, User, Lock, HelpCircle, Info,
  ExternalLink, ChevronRight, Check
} from 'lucide-react';
import { VERLYN_CONTACT } from '@/lib/types';
import { useEffect, useCallback } from 'react';
import { updateUserSettings, getUserAuthSettings } from './actions';
import { createClient } from '@/lib/supabase/client';

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
    settingPrivateAccount, setSettingPrivateAccount,
    currentUser,
  } = useAppStore();

  // Load from DB
  useEffect(() => {
    if (!currentUser?.id) return;
    const loadSettings = async () => {
      // Load user table (is_private)
      const supabase = createClient();
      const { data } = await supabase.from('users').select('is_private').eq('id', currentUser.id).single();
      if (data) setSettingPrivateAccount(!!data.is_private);

      // Load auth metadata
      const res = await getUserAuthSettings(currentUser.id);
      if (res.success && res.metadata) {
        if (res.metadata.e2ee_enabled !== undefined) setSettingE2EE(res.metadata.e2ee_enabled);
        if (res.metadata.two_fa_enabled !== undefined) setSettingTwoFA(res.metadata.two_fa_enabled);
        if (res.metadata.push_notifs_enabled !== undefined) setSettingPushNotifs(res.metadata.push_notifs_enabled);
        if (res.metadata.email_digest_enabled !== undefined) setSettingEmailDigest(res.metadata.email_digest_enabled);
      }
    };
    loadSettings();
  }, [currentUser?.id, setSettingPrivateAccount, setSettingE2EE, setSettingTwoFA, setSettingPushNotifs, setSettingEmailDigest]);

  // Wrapper handlers
  const handleToggle = useCallback(async (key: string, val: boolean) => {
    if (!currentUser?.id) return;
    // Optimistic update done in JSX, just sync DB
    await updateUserSettings(currentUser.id, { [key]: val });
  }, [currentUser?.id]);

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
          icon={User}
          label="Private Account"
          desc="Only approved followers can see your posts and activity"
          right={<PersistToggle id="toggle-private" on={settingPrivateAccount} onToggle={() => {
            const next = !settingPrivateAccount;
            setSettingPrivateAccount(next);
            handleToggle('is_private', next);
          }} />}
        />
        <SettingRow
          icon={Lock}
          label="End-to-End Encryption"
          desc="Encrypt all DMs with Signal Protocol"
          right={<PersistToggle id="toggle-e2ee" on={settingE2EE} onToggle={() => {
            const next = !settingE2EE;
            setSettingE2EE(next);
            handleToggle('e2ee_enabled', next);
          }} />}
        />
        <SettingRow
          icon={Shield}
          label="Two-Factor Authentication"
          desc="Protect your account with 2FA"
          right={<PersistToggle id="toggle-2fa" on={settingTwoFA} onToggle={() => {
            const next = !settingTwoFA;
            setSettingTwoFA(next);
            handleToggle('two_fa_enabled', next);
          }} />}
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
          right={<PersistToggle id="toggle-push" on={settingPushNotifs} onToggle={() => {
            const next = !settingPushNotifs;
            setSettingPushNotifs(next);
            handleToggle('push_notifs_enabled', next);
          }} />}
        />
        <SettingRow
          icon={Bell}
          label="Email Digest"
          desc="Weekly summary of your activity"
          right={<PersistToggle id="toggle-email" on={settingEmailDigest} onToggle={() => {
            const next = !settingEmailDigest;
            setSettingEmailDigest(next);
            handleToggle('email_digest_enabled', next);
          }} />}
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
