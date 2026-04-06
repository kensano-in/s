'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Bell, Mail, Smartphone, AtSign, Heart, MessageCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { updateUserSettings } from '@/app/(main)/settings/actions';
import { motion } from 'framer-motion';

export default function Notifications() {
  const { 
    currentUser, 
    settingPushNotifs, setSettingPushNotifs,
    settingEmailDigest, setSettingEmailDigest 
  } = useAppStore();

  const [loading, setLoading] = useState(false);

  const handleToggle = async (key: string, value: boolean, setter: any) => {
    if (!currentUser?.id) return;
    setLoading(true);
    setter(value);
    await updateUserSettings(currentUser.id, { [key]: value });
    setLoading(false);
  };

  return (
    <div className="space-y-10 max-w-2xl animate-fade-in">
      <section>
        <div className="flex items-center gap-3 mb-6 px-1">
          <Smartphone size={18} className="text-v-cyan" />
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Transmission Hub</h2>
        </div>
        <div className="glass-card divide-white/5 divide-y border-none overflow-hidden bg-surface-lowest/30 shadow-xl">
          <NotifRow 
            icon={Smartphone} 
            title="Global Push Alerts" 
            desc="Broadcast notifications directly to your primary device node." 
            on={settingPushNotifs}
            onToggle={(v) => handleToggle('push_notifs_enabled', v, setSettingPushNotifs)}
          />
          <NotifRow 
            icon={Mail} 
            title="Email Chronology" 
            desc="Weekly summary of intelligence and network activity." 
            on={settingEmailDigest}
            onToggle={(v) => handleToggle('email_digest_enabled', v, setSettingEmailDigest)}
          />
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-6 px-1">
          <Bell size={18} className="text-v-violet" />
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Signal Filters</h2>
        </div>
        <div className="glass-card divide-white/5 divide-y border-none overflow-hidden bg-surface-lowest/30 shadow-xl">
          <NotifRow icon={AtSign} title="Mentions & Tags" desc="Alert when your identity is cited in the expanse." on={true} onToggle={() => {}} />
          <NotifRow icon={Heart} title="Network Affection" desc="Signals when others like your data broadcasts." on={true} onToggle={() => {}} />
          <NotifRow icon={MessageCircle} title="Direct Intelligence" desc="Priority alerts for private neural sessions." on={true} onToggle={() => {}} />
          <NotifRow icon={AlertTriangle} title="System Override" desc="Critical security and protocol warnings (REQUIRED)." on={true} disabled />
        </div>
      </section>
    </div>
  );
}

function NotifRow({ icon: Icon, title, desc, on, onToggle, disabled }: any) {
  return (
    <div className={`flex items-center gap-4 px-6 py-5 ${disabled ? 'opacity-50' : 'hover:bg-white/[0.02] transition-colors'}`}>
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-surface-high/50 border border-white/5 text-on-surface-variant">
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-white leading-none mb-1">{title}</h4>
        <p className="text-[11px] text-on-surface-variant font-medium opacity-50 truncate">{desc}</p>
      </div>
      <div className="flex-shrink-0 min-w-[40px] flex justify-end">
        {!disabled && (
          <button 
            onClick={() => onToggle(!on)}
            className={`w-12 h-6 px-1 rounded-full flex items-center transition-all duration-300 ${on ? 'bg-v-violet shadow-[0_0_12px_rgba(108,99,255,0.4)]' : 'bg-surface-high'}`}
          >
            <motion.div 
              animate={{ x: on ? 24 : 0 }} 
              className="w-4 h-4 rounded-full bg-white shadow-xl"
            />
          </button>
        )}
        {disabled && (
            <div className="w-12 h-6 px-1 rounded-full flex items-center bg-v-violet/50">
               <div className="w-4 h-4 rounded-full bg-white transform translate-x-6" />
            </div>
        )}
      </div>
    </div>
  );
}
