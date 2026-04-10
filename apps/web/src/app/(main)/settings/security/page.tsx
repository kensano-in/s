'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { getActiveSessions, logoutSession, getMFAStatus } from '@/app/(main)/settings/actions';
import { unenrollMFA } from '@/app/(main)/settings/mfa-actions';
import { createClient } from '@/lib/supabase/client';
import { SettingsSection, SettingsRow, SettingsInput, Toast } from '../components';
import { Monitor, Loader2, Key } from 'lucide-react';

export default function SecuritySettings() {
    const { currentUser } = useAppStore();
    
    const [sessions, setSessions] = useState<any[]>([]);
    const [mfaStatus, setMfaStatus] = useState<{ isActive: boolean; factorId?: string }>({ isActive: false });
    const [loading, setLoading] = useState(false);
    
    // Password Form
    const [passData, setPassData] = useState({ current: '', new: '', verify: '' });
    const [passError, setPassError] = useState<string | null>(null);
    const [showPasswordForm, setShowPasswordForm] = useState(false);

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    const fetchSessionData = useCallback(async () => {
        if (!currentUser?.id) return;
        setLoading(true);
        try {
            const [sessionsRes, mfaRes] = await Promise.all([
                getActiveSessions(currentUser.id),
                getMFAStatus(currentUser.id)
            ]);
            if (sessionsRes.success) setSessions(sessionsRes.sessions);
            if (mfaRes.success) setMfaStatus({ isActive: mfaRes.isActive, factorId: mfaRes.factorId });
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    }, [currentUser?.id]);

    useEffect(() => {
        fetchSessionData();
    }, [fetchSessionData]);

    const handlePasswordUpdate = async () => {
        if (!passData.current || !passData.new || !passData.verify) {
            setPassError('All fields required');
            return;
        }
        if (passData.new !== passData.verify) { 
            setPassError('Passwords do not match'); 
            return; 
        }
        setLoading(true);
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({ password: passData.new });
        
        if (error) {
            setPassError(error.message);
        } else {
            showToast('Password updated successfully');
            setPassData({ current: '', new: '', verify: '' });
            setShowPasswordForm(false);
            setPassError(null);
        }
        setLoading(false);
    };

    const handleMfaToggle = async () => {
        if (mfaStatus.isActive && mfaStatus.factorId) {
            if (window.confirm("Disable Two-Factor Authentication? Your account security will be at risk.")) {
                await unenrollMFA(mfaStatus.factorId!);
                showToast('2FA disabled', 'error');
                fetchSessionData();
            }
        } else {
            // Ideally trigger the MFA flow page/modal here
            alert("MFA Setup Flow would initiate here");
        }
    };

    const handleLogoutSession = async (sessionId: string) => {
        setLoading(true);
        if (currentUser?.id) {
            await logoutSession(currentUser.id, sessionId);
            setSessions(sessions.filter(s => s.id !== sessionId));
            showToast('Session terminated');
        }
        setLoading(false);
    };

    return (
        <div className="max-w-2xl animate-fade-in">
            <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-1">Security</h2>
                <p className="text-[14px] text-neutral-500">Protect your account with passwords and active session management.</p>
            </div>

            <SettingsSection title="Login Credentials">
                {!showPasswordForm ? (
                    <SettingsRow 
                        icon={Key}
                        title="Password" 
                        desc="Change your account login password." 
                        right={<button onClick={() => setShowPasswordForm(true)} className="text-[13px] text-neutral-300 font-medium bg-white/5 hover:bg-white/10 px-4 py-1.5 rounded-full transition-colors">Change</button>}
                    />
                ) : (
                    <div className="p-4 space-y-4">
                        <h4 className="text-[15px] font-medium text-white mb-2">Update Password</h4>
                        <SettingsInput 
                            type="password"
                            placeholder="Current Password"
                            value={passData.current}
                            onChange={(v: string) => setPassData({...passData, current: v})}
                            disabled={loading}
                        />
                        <SettingsInput 
                            type="password"
                            placeholder="New Password"
                            value={passData.new}
                            onChange={(v: string) => setPassData({...passData, new: v})}
                            disabled={loading}
                        />
                        <SettingsInput 
                            type="password"
                            placeholder="Verify New Password"
                            value={passData.verify}
                            onChange={(v: string) => setPassData({...passData, verify: v})}
                            disabled={loading}
                            error={passError}
                        />
                        <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
                            <button 
                                onClick={() => { setShowPasswordForm(false); setPassError(null); }}
                                className="px-5 py-2 text-[14px] font-medium text-neutral-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handlePasswordUpdate}
                                disabled={loading}
                                className="px-6 py-2 bg-neutral-100 text-black text-[14px] font-medium rounded-full hover:bg-white active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading && <Loader2 size={16} className="animate-spin" />}
                                Update Password
                            </button>
                        </div>
                    </div>
                )}
            </SettingsSection>

            <SettingsSection title="Two-Factor Authentication">
                <SettingsRow 
                    title="Authenticator App (TOTP)" 
                    desc={mfaStatus.isActive ? "2FA is active and protecting your account." : "Add an extra layer of security requiring a code from your authenticator app."}
                    right={
                        <button 
                            onClick={handleMfaToggle} 
                            className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${mfaStatus.isActive ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-white/5 text-neutral-300 hover:bg-white/10'}`}
                        >
                            {mfaStatus.isActive ? 'Disable' : 'Enable'}
                        </button>
                    }
                />
            </SettingsSection>

            <SettingsSection title="Logged-in Devices">
                {sessions.length === 0 && !loading && (
                    <div className="p-6 text-center text-[13px] text-neutral-500">No active sessions found.</div>
                )}
                {sessions.map(s => (
                    <SettingsRow
                        key={s.id}
                        icon={Monitor}
                        title={s.device || 'Unknown Device'}
                        desc={`${s.ip} • Last active: ${s.lastActive ? new Date(s.lastActive).toLocaleString() : 'Just Now'}`}
                        right={
                            <button 
                                onClick={() => handleLogoutSession(s.id)} 
                                disabled={loading}
                                className="text-[13px] text-red-500 hover:text-red-400 font-medium px-4 py-1.5 bg-red-500/10 rounded-full hover:bg-red-500/20 transition-colors"
                            >
                                Sign Out
                            </button>
                        }
                    />
                ))}
            </SettingsSection>

            <Toast show={toast.show} message={toast.message} type={toast.type} />
        </div>
    );
}
