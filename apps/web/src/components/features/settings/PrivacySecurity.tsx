'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Shield, Lock, Eye, MessageSquare, Ban, Settings, Loader2, ChevronRight, X, UserX, Fingerprint, LogOut, CheckCircle2, Monitor, Key, Smartphone, Globe, AlertTriangle } from 'lucide-react';
import { updateUserSettings, getActiveSessions, logoutSession, getBlockedUsers, unblockUser, getMFAStatus } from '@/app/(main)/settings/actions';
import { unenrollMFA } from '@/app/(main)/settings/mfa-actions';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import MfaModal from './MfaModal';

export default function PrivacySecurity() {
  const { currentUser, settingPrivateAccount, setSettingPrivateAccount, settingE2EE, setSettingE2EE } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [messagingPermission, setMessagingPermission] = useState('everyone');
  const [activityVisibility, setActivityVisibility] = useState(true);

  // Password Update State
  const [passData, setPassData] = useState({ current: '', new: '', verify: '' });
  const [passError, setPassError] = useState<string | null>(null);

  // MFA State
  const [mfaStatus, setMfaStatus] = useState<{ isActive: boolean; factorId?: string }>({ isActive: false });
  const [showMfaModal, setShowMfaModal] = useState(false);

  const fetchSessionData = useCallback(async () => {
      if (!currentUser?.id) return;
      
      const [sessionsRes, blockedRes, mfaRes] = await Promise.all([
          getActiveSessions(currentUser.id),
          getBlockedUsers(currentUser.id),
          getMFAStatus(currentUser.id)
      ]);

      if (sessionsRes.success) setSessions(sessionsRes.sessions);
      if (blockedRes.success) setBlockedUsers(blockedRes.users || []);
      if (mfaRes.success) setMfaStatus({ isActive: mfaRes.isActive, factorId: mfaRes.factorId });
  }, [currentUser?.id]);

  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  const handleSecurityUpdate = async (key: string, value: any, setter: any) => {
    setter(value);
    setLoading(true);
    const res = await updateUserSettings(currentUser?.id || '', { [key]: value });
    if (res.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }
    setLoading(false);
  };

  const handlePasswordUpdate = async () => {
      if (passData.new !== passData.verify) { setPassError('Passwords do not match'); return; }
      setLoading(true);
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: passData.new });
      if (error) {
          setPassError(error.message);
      } else {
          setSuccess(true);
          setShowPasswordModal(false);
          setPassData({ current: '', new: '', verify: '' });
          setPassError(null);
      }
      setLoading(false);
  }

  const handleUnblock = async (targetId: string) => {
      if (!currentUser?.id) return;
      const res = await unblockUser(currentUser.id, targetId);
      if (res.success) {
          setBlockedUsers(blockedUsers.filter(u => u.id !== targetId));
      }
  }

  return (
    <div className="space-y-12 max-w-3xl animate-fade-in italic">
      {/* Privacy Section */}
      <section>
        <div className="flex items-center gap-3 mb-6 px-1">
          <Eye size={18} className="text-v-cyan" />
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Privacy Protocols</h2>
        </div>
        <div className="glass-card divide-white/5 divide-y border-none overflow-hidden bg-surface-lowest/30 shadow-2xl rounded-[32px]">
          <SettingsRow 
            icon={UserX} 
            title="Private Account" 
            desc="Control global visibility of your content nodes." 
            right={<Switch on={settingPrivateAccount} onToggle={(v) => handleSecurityUpdate('is_private', v, setSettingPrivateAccount)} />}
          />
          <SettingsRow 
            icon={MessageSquare} 
            title="Sovereign Messaging" 
            desc="Control who can start a Direct Message session." 
            right={
              <select 
                value={messagingPermission} 
                onChange={(e) => handleSecurityUpdate('messaging_permission', e.target.value, setMessagingPermission)}
                className="bg-surface-high/50 text-[10px] font-black uppercase tracking-widest p-2 rounded-xl border border-white/5 outline-none"
              >
                  <option value="everyone">Everyone</option>
                  <option value="followers">Followers</option>
                  <option value="none">Locked</option>
              </select>
            }
          />
          <SettingsRow 
            icon={Globe} 
            title="Activity Signal" 
            desc="Broadcast your online/offline status to the network." 
            right={<Switch on={activityVisibility} onToggle={(v) => handleSecurityUpdate('activity_visibility', v, setActivityVisibility)} />}
          />
        </div>
      </section>

      {/* Security Section */}
      <section>
        <div className="flex items-center gap-3 mb-6 px-1">
          <Shield size={18} className="text-v-violet" />
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Security Kernels</h2>
        </div>
        <div className="glass-card divide-white/5 divide-y border-none overflow-hidden bg-surface-lowest/30 rounded-[32px]">
          <SettingsRow 
            icon={Lock} 
            title="Update Key (Password)" 
            desc="Refresh the core access token for this identity." 
            onClick={() => setShowPasswordModal(true)}
            right={<ChevronRight size={14} className="opacity-30" />}
          />
          <SettingsRow 
            icon={Fingerprint} 
            title="MFA Authorization" 
            desc="Enable Google Authenticator for login security. (TOTP)" 
            right={
                mfaStatus.isActive ? (
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-v-emerald flex items-center gap-1.5"><CheckCircle2 size={12} /> PROTOCOL_ACTIVE</span>
                        <button 
                            onClick={async () => {
                                if (window.confirm("UNENROLL_PROTOCOL? Identity integrity will be compromised.")) {
                                    await unenrollMFA(mfaStatus.factorId!);
                                    fetchSessionData();
                                }
                            }}
                            className="text-[9px] font-black uppercase text-rose-400 hover:text-white"
                        >
                            Disable
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setShowMfaModal(true)} className="px-5 py-2.5 rounded-2xl bg-v-cyan text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg active:scale-95">SETUP MFA</button>
                )
            }
          />
          <SettingsRow 
            icon={Lock} 
            title="Signal Protocol E2EE" 
            desc="Force end-to-end encryption on all dm channels." 
            right={<Switch on={settingE2EE} onToggle={(v) => handleSecurityUpdate('e2ee_enabled', v, setSettingE2EE)} />}
          />
        </div>
      </section>

      {/* Active Sessions */}
      <section>
          <div className="flex items-center gap-3 mb-6 px-1">
            <Monitor size={18} className="text-emerald-400" />
            <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Active Nodes</h2>
          </div>
          <div className="glass-card divide-white/5 divide-y border-none overflow-hidden bg-surface-lowest/30 rounded-[32px] p-2">
            {sessions.map(s => (
                <div key={s.id} className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-all rounded-2xl">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                            <Monitor size={22} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-white">{s.device}</p>
                            <p className="text-[10px] font-mono opacity-50">{s.ip} • Last Active: {s.lastActive ? new Date(s.lastActive).toLocaleString() : 'Just Now'}</p>
                        </div>
                    </div>
                    <button onClick={() => logoutSession(currentUser?.id || '', s.id)} className="px-4 py-2 border border-white/5 rounded-xl text-[10px] font-black uppercase text-on-surface-variant hover:bg-rose-500/10 hover:text-rose-400 transition-all">Sign Out</button>
                </div>
            ))}
          </div>
      </section>

      {/* Blocked Users */}
      <section>
          <div className="flex items-center gap-3 mb-6 px-1">
            <UserX size={18} className="text-rose-400" />
            <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Filter Protocols</h2>
          </div>
          <div className="glass-card divide-white/5 divide-y border-none overflow-hidden bg-surface-lowest/30 rounded-[32px]">
            {blockedUsers.length === 0 ? (
                <div className="p-10 text-center text-[10px] font-black uppercase tracking-widest opacity-30 italic">No nodes filtered. Global interaction active.</div>
            ) : (
                blockedUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-4 italic font-bold">
                            <img src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} className="w-10 h-10 rounded-xl" alt="avatar" />
                            <div>
                                <p className="text-sm text-white">{u.display_name}</p>
                                <p className="text-[10px] text-v-cyan opacity-60">@{u.username}</p>
                            </div>
                        </div>
                        <button onClick={() => handleUnblock(u.id)} className="px-3 py-1.5 rounded-lg bg-surface-high text-[9px] font-black uppercase hover:bg-v-emerald hover:text-black transition-all">Unblock</button>
                    </div>
                ))
            )}
          </div>
      </section>

      {/* Security Success Toast */}
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-10 right-10 flex items-center gap-3 px-6 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl backdrop-blur-xl shadow-2xl z-50 pointer-events-none">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]"><CheckCircle2 size={18} /></div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-emerald-400 italic">Security Synchronized</p>
              <p className="text-[10px] text-emerald-400 font-mono opacity-60">DB_COMMIT_OK • SHIELD_READY</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in">
           <div className="glass-card w-full max-w-md p-10 border-none bg-[#050505] shadow-[0_0_80px_rgba(108,99,255,0.15)] rounded-[40px] italic">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-2">
                    <Key size={18} className="text-v-violet" />
                    <h3 className="text-lg font-black uppercase tracking-tighter italic">Key Refresh</h3>
                </div>
                <button onClick={() => setShowPasswordModal(false)}><X size={20} className="hover:text-rose-400 transition-colors" /></button>
              </div>
              <div className="space-y-5">
                 <ModalInput label="Current Access Code" type="password" value={passData.current} onChange={(v: string) => setPassData({...passData, current: v})} />
                 <ModalInput label="New Sovereign Key" type="password" value={passData.new} onChange={(v: string) => setPassData({...passData, new: v})} />
                 <ModalInput label="Verify New Key" type="password" value={passData.verify} onChange={(v: string) => setPassData({...passData, verify: v})} />
                 {passError && <p className="text-[9px] text-rose-500 font-black uppercase tracking-widest px-1">ERR: {passError}</p>}
                 <button 
                  onClick={handlePasswordUpdate}
                  disabled={loading}
                  className="w-full py-5 bg-primary-gradient rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] mt-4 shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-white disabled:opacity-50"
                 >
                    {loading ? 'CALCULATING...' : 'EXECUTE ROTATION'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MFA Modal */}
      <AnimatePresence>
        {showMfaModal && (
            <MfaModal 
                onClose={() => setShowMfaModal(false)} 
                onSuccess={() => fetchSessionData()} 
            />
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsRow({ icon: Icon, title, desc, right, onClick }: any) {
  return (
    <div className={`flex items-center gap-5 px-8 py-6 ${onClick ? 'cursor-pointer hover:bg-white/[0.04]' : ''} transition-all` } onClick={onClick}>
      <div className={`w-12 h-12 rounded-[20px] flex items-center justify-center flex-shrink-0 bg-surface-high/50 border border-white/5`}>
        <Icon size={22} className="text-on-surface-variant opacity-80" />
      </div>
      <div className="flex-1 min-w-0 italic">
        <h4 className="text-sm font-black text-white italic leading-none mb-1 uppercase tracking-tighter">{title}</h4>
        <p className="text-[10px] text-on-surface-variant font-medium opacity-50 truncate tracking-wide">{desc}</p>
      </div>
      <div className="flex-shrink-0 min-w-[50px] flex justify-end">
        {right}
      </div>
    </div>
  );
}

function Switch({ on, onToggle }: { on: boolean; onToggle: (v: boolean) => void }) {
  return (
    <button onClick={() => onToggle(!on)} className={`w-12 h-6 px-1 rounded-full flex items-center transition-all duration-500 ${on ? 'bg-v-violet shadow-[0_0_15px_rgba(108,99,255,0.4)]' : 'bg-surface-high'}`}>
      <motion.div animate={{ x: on ? 24 : 0 }} className="w-4 h-4 rounded-full bg-white shadow-xl" transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
    </button>
  );
}

function ModalInput({ label, type, value, onChange }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant px-1 mb-1 block italic">{label}</label>
            <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-surface-lowest border border-white/5 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-v-violet/20 transition-all font-mono italic shadow-inner" />
        </div>
    )
}
