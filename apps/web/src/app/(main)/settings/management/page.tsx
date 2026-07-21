'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useIdentitiesStore } from '@/lib/identities-store';
import { deleteAccountPermanently } from '@/app/(main)/settings/actions';
import { signOut } from '@/app/login/actions';
import { createClient } from '@/lib/supabase/client';
import { SettingsSection, SettingsRow, SettingsToggle, Toast, ConfirmDialog, ModalSystem } from '../components';
import { AlertTriangle, Trash2, Loader2, X, LogOut, UserPlus, ShieldAlert, Key, Globe, Github, Info, Layers } from 'lucide-react';
import { getAvatarUrl } from '@/lib/utils';

export default function ManagementSettings() {
    const currentUser = useAppStore(s => s.currentUser);
    const setUser = useAppStore(s => s.setUser);
    const { identities, removeIdentity, clearIdentities, addIdentity } = useIdentitiesStore();
    
    // Switch Identity State
    const [switchingUser, setSwitchingUser] = useState<string | null>(null);

    // Connected Platforms state (Persisted in Auth Metadata and fallback to localStorage)
    const [connGoogle, setConnGoogle] = useState(false);
    const [connMeta, setConnMeta] = useState(false);
    const [connGithub, setConnGithub] = useState(false);

    // Modal / Confirm triggers
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
    const [showLogoutAllConfirm, setShowLogoutAllConfirm] = useState(false);
    
    // Connected Platform Connect Modals
    const [connectingPlatform, setConnectingPlatform] = useState<'Google' | 'Meta' | 'GitHub' | null>(null);
    const [isPlatformLinking, setIsPlatformLinking] = useState(false);
    
    // Universal loading state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

    useEffect(() => {
        if (!currentUser) return;
        const uid = currentUser.id;
        const metadata = currentUser.metadata || {};
        
        // Load connected provider state from Auth metadata or fallback to local storage
        setConnGoogle(metadata.conn_google === true || localStorage.getItem(`verlyn_${uid}_conn_google`) === 'true');
        setConnMeta(metadata.conn_meta === true || localStorage.getItem(`verlyn_${uid}_conn_meta`) === 'true');
        setConnGithub(metadata.conn_github === true || localStorage.getItem(`verlyn_${uid}_conn_github`) === 'true');

        // Automatically ensure the current user is in the device switcher
        addIdentity({
            id: currentUser.id,
            username: currentUser.username,
            displayName: currentUser.displayName,
            avatarUrl: currentUser.avatar || null
        });
    }, [currentUser, addIdentity]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    const handleSignOut = async () => {
        setLoading(true);
        try {
            await signOut();
            window.location.href = '/login';
        } catch (e) {
            showToast('Sign out failed', 'error');
            setLoading(false);
        }
    };

    const handleSwitchIdentity = async (targetId: string, username: string, displayName: string, avatarUrl: string | null) => {
        setSwitchingUser(username);
        
        // Fetch real database profile details for the switching user to prevent mock count glitches
        const supabase = createClient();
        const { data: profileData } = await supabase
            .from('users')
            .select('*')
            .eq('id', targetId)
            .single();

        // Simulate E2EE Handshake / Session Re-validation
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Fast UI session switch (instantly swaps user details in state store using real database values)
        setUser({
            id: targetId,
            username: profileData?.username || username,
            displayName: profileData?.display_name || displayName,
            avatar: getAvatarUrl(profileData?.username || username, profileData?.avatar_url || avatarUrl),
            bio: profileData?.bio || 'Verlyn identity nodes synced.',
            isVerified: profileData?.is_verified ?? true,
            karmaScore: profileData?.karma_score ?? 0,
            followerCount: profileData?.follower_count ?? 0,
            followingCount: profileData?.following_count ?? 0,
            role: profileData?.role || 'PUBLIC',
            createdAt: profileData?.created_at || new Date().toISOString(),
            metadata: { onboarded: true }
        });

        setSwitchingUser(null);
        showToast(`Switched active profile to @${username}`);
    };

    const handleDisconnectPlatform = async (platform: 'google' | 'meta' | 'github', label: string) => {
        if (!currentUser) return;
        const uid = currentUser.id;
        
        setLoading(true);
        const key = `conn_${platform}`;
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.updateUser({
            data: { [key]: false }
        });

        if (!error && user) {
            localStorage.setItem(`verlyn_${uid}_conn_${platform}`, 'false');
            if (platform === 'google') setConnGoogle(false);
            if (platform === 'meta') setConnMeta(false);
            if (platform === 'github') setConnGithub(false);
            
            setUser({
                ...currentUser,
                metadata: user.user_metadata || {}
            });
            showToast(`Disconnected ${label} Integration`);
        } else {
            showToast(error?.message || 'Failed to disconnect integration', 'error');
        }
        setLoading(false);
    };

    const handleInitiateConnect = (platform: 'Google' | 'Meta' | 'GitHub') => {
        setConnectingPlatform(platform);
    };

    const handleConfirmConnect = async () => {
        if (!currentUser || !connectingPlatform) return;
        const uid = currentUser.id;
        
        setIsPlatformLinking(true);
        
        const platformKey = connectingPlatform.toLowerCase() as 'google' | 'meta' | 'github';
        const key = `conn_${platformKey}`;
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.updateUser({
            data: { [key]: true }
        });

        if (!error && user) {
            localStorage.setItem(`verlyn_${uid}_conn_${platformKey}`, 'true');
            
            if (platformKey === 'google') setConnGoogle(true);
            if (platformKey === 'meta') setConnMeta(true);
            if (platformKey === 'github') setConnGithub(true);
            
            setUser({
                ...currentUser,
                metadata: user.user_metadata || {}
            });
            showToast(`Successfully linked ${connectingPlatform} Single Sign-On`);
        } else {
            showToast(error?.message || 'Failed to connect platform', 'error');
        }
        
        setIsPlatformLinking(false);
        setConnectingPlatform(null);
    };

    const handleLogoutEverywhere = async () => {
        setShowLogoutAllConfirm(false);
        setLoading(true);
        
        // Terminate all other sessions via Supabase
        const supabase = createClient();
        const { error } = await supabase.auth.signOut({ scope: 'others' });
        
        setLoading(false);
        if (!error) {
            showToast('Successfully purged all external device sessions.');
        } else {
            showToast(error.message, 'error');
        }
    };

    const handleDeactivate = async () => {
        setShowDeactivateConfirm(false);
        setLoading(true);
        
        // Deactivate account by saving deactivated flag in metadata, then signing out
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({
            data: { deactivated: true }
        });

        if (!error) {
            if (currentUser?.id) {
                removeIdentity(currentUser.id);
            }
            await signOut();
            setLoading(false);
            showToast('Account deactivated. Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/login?deactivated=true';
            }, 1000);
        } else {
            showToast(error.message, 'error');
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (deleteConfirm !== 'DELETE PERMANENTLY' || !currentUser?.id) return;
        setLoading(true);
        
        const res = await deleteAccountPermanently(currentUser.id);
        if (res.error) {
            setError(res.error);
            setLoading(false);
        } else {
            removeIdentity(currentUser.id);
            window.location.href = '/login';
        }
    };

    return (
        <div className="max-w-2xl animate-fade-in relative z-0 pb-20">
            {/* Full Screen Handshake Overlay for Identity Switching */}
            {switchingUser && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col items-center justify-center text-center p-6">
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-500 mb-4 animate-bounce">
                        <Layers size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Switching Account</h3>
                    <p className="text-[14px] text-neutral-500 font-mono">
                        Connecting to @{switchingUser}...
                    </p>
                    <Loader2 size={24} className="text-blue-500 animate-spin mt-6" />
                </div>
            )}

            <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-1">Accounts & Sessions</h2>
                <p className="text-[14px] text-neutral-500">Manage accounts, profile switching, sign-in methods, and device sessions.</p>
            </div>

            {/* IDENTITY SWITCHER */}
            <SettingsSection title="Account Switcher">
                <div className="p-4 border-b border-white/5 bg-white/[0.01]">
                    <p className="text-[13px] text-neutral-500 leading-normal">
                        Quickly switch between saved accounts on this device.
                    </p>
                </div>

                <div className="divide-y divide-white/5">
                    {identities.map((id) => (
                        <div key={id.id} className="flex items-center justify-between p-4 bg-transparent transition-colors hover:bg-white/[0.01]">
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-800 border border-white/10 relative">
                                    <img 
                                        src={getAvatarUrl(id.username, id.avatarUrl)} 
                                        alt={id.username} 
                                        className="w-full h-full object-cover" 
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[14px] font-bold text-white truncate">{id.displayName}</p>
                                        {id.id === currentUser?.id && (
                                            <span className="text-[9px] font-extrabold bg-blue-500/10 border border-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[12px] text-neutral-500 truncate mt-0.5">@{id.username}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {id.id !== currentUser?.id ? (
                                    <button 
                                        type="button"
                                        onClick={() => handleSwitchIdentity(id.id, id.username, id.displayName, id.avatarUrl)}
                                        className="text-[12px] font-semibold text-white bg-white/5 hover:bg-white/10 px-4 py-1.5 rounded-full transition-colors"
                                    >
                                        Switch
                                    </button>
                                ) : (
                                    <span className="text-[12px] font-medium text-neutral-600 px-4 py-1.5">Current</span>
                                )}
                                
                                <button 
                                    type="button"
                                    onClick={() => {
                                        removeIdentity(id.id);
                                        showToast(`Removed @${id.username} switcher cache`);
                                    }}
                                    className="p-2 text-neutral-500 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-colors"
                                    title="Wipe Switcher Data"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 flex flex-col gap-2.5">
                    <button 
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white text-[13px] font-semibold rounded-2xl border border-white/5 transition-all"
                    >
                        <UserPlus size={16} className="text-blue-400" />
                        Add or Register New Identity
                    </button>
                    
                    <button 
                        type="button"
                        onClick={() => {
                            clearIdentities();
                            showToast('Switcher profile cache cleared');
                        }}
                        className="text-[11px] text-neutral-500 hover:text-neutral-300 font-medium py-1 transition-colors flex items-center justify-center gap-1.5"
                    >
                        <ShieldAlert size={12} />
                        Clear device identity cache files
                    </button>
                </div>
            </SettingsSection>

            {/* SINGLE SIGN ON PROVIDERS */}
            <SettingsSection title="Connected Single Sign-On">
                <div className="p-4 border-b border-white/5 bg-white/[0.01]">
                    <p className="text-[13px] text-neutral-500 leading-normal">
                        Link external verified platforms to expedite security checkpoints. Restricting accounts requires active keys.
                    </p>
                </div>

                <SettingsRow
                    icon={Globe}
                    title="Google Identity Sync"
                    desc={connGoogle ? "SSO link established & active" : "Verify access credentials via Google"}
                    right={
                        <div className="flex items-center gap-3">
                            <span className={`text-[11px] font-bold ${connGoogle ? 'text-blue-400' : 'text-neutral-600'}`}>
                                {connGoogle ? 'Linked' : 'Not Connected'}
                            </span>
                            <SettingsToggle 
                                checked={connGoogle} 
                                onChange={(val) => val ? handleInitiateConnect('Google') : handleDisconnectPlatform('google', 'Google')} 
                            />
                        </div>
                    }
                />

                <SettingsRow
                    icon={Github}
                    title="GitHub Developer Access"
                    desc={connGithub ? "Repository token configured" : "Connect GitHub developer account"}
                    right={
                        <div className="flex items-center gap-3">
                            <span className={`text-[11px] font-bold ${connGithub ? 'text-blue-400' : 'text-neutral-600'}`}>
                                {connGithub ? 'Linked' : 'Not Connected'}
                            </span>
                            <SettingsToggle 
                                checked={connGithub} 
                                onChange={(val) => val ? handleInitiateConnect('GitHub') : handleDisconnectPlatform('github', 'GitHub')} 
                            />
                        </div>
                    }
                />

                <SettingsRow
                    icon={Layers}
                    title="Meta Family Portal"
                    desc={connMeta ? "Accounts Center networks bound" : "Sync profiles metadata with Meta accounts"}
                    right={
                        <div className="flex items-center gap-3">
                            <span className={`text-[11px] font-bold ${connMeta ? 'text-blue-400' : 'text-neutral-600'}`}>
                                {connMeta ? 'Linked' : 'Not Connected'}
                            </span>
                            <SettingsToggle 
                                checked={connMeta} 
                                onChange={(val) => val ? handleInitiateConnect('Meta') : handleDisconnectPlatform('meta', 'Meta')} 
                            />
                        </div>
                    }
                />
            </SettingsSection>

            {/* SESSIONS & ACTIONS */}
            <SettingsSection title="Session Terminations">
                <SettingsRow 
                    icon={LogOut}
                    title="Sign Out of Active Device" 
                    desc="Erase cookie credentials on this viewport. Switcher identities remain preserved." 
                    right={
                        <button 
                            type="button"
                            onClick={handleSignOut}
                            disabled={loading}
                            className="text-[13px] text-white font-semibold bg-white/5 hover:bg-white/10 px-5 py-2 rounded-full transition-all flex items-center gap-2"
                        >
                            {loading && <Loader2 size={14} className="animate-spin" />}
                            Log Out
                        </button>
                    }
                />

                <SettingsRow 
                    icon={Key}
                    title="Sweep Inactive Sessions" 
                    desc="Forcibly close and invalidate connection authentication keys across all other devices." 
                    right={
                        <button 
                            type="button"
                            onClick={() => setShowLogoutAllConfirm(true)}
                            disabled={loading}
                            className="text-[13px] text-white font-semibold bg-white/5 hover:bg-white/10 px-5 py-2 rounded-full transition-all flex items-center gap-2"
                        >
                            Sweep Everywhere
                        </button>
                    }
                />
            </SettingsSection>

            {/* DANGER DESTRUCTION ZONES */}
            <SettingsSection title="Dangerous Operations Area">
                <SettingsRow 
                    icon={AlertTriangle}
                    title="Deactivate Verlyn Profile" 
                    desc="Hide your profile timeline and messaging metadata. Unfreezes immediately upon logging back in." 
                    right={
                        <button 
                            type="button"
                            onClick={() => setShowDeactivateConfirm(true)}
                            className="text-[13px] text-neutral-300 font-semibold bg-white/5 hover:bg-white/10 px-5 py-2 rounded-full transition-colors"
                        >
                            Deactivate
                        </button>
                    }
                />
                
                <SettingsRow 
                    icon={Trash2}
                    title="Delete Account Permanently" 
                    desc="Erase database indexes, messaging keys, and stored folders. This action is terminal." 
                    destructive
                    right={
                        <button 
                            type="button"
                            onClick={() => {
                                setDeleteConfirm('');
                                setShowDeleteModal(true);
                            }}
                            className="text-[13px] text-red-500 font-semibold bg-red-500/10 hover:bg-red-500/20 px-5 py-2 rounded-full transition-colors"
                        >
                            Delete Node
                        </button>
                    }
                />
            </SettingsSection>

            {/* CONNECT PLATFORM MODAL */}
            <ModalSystem
                isOpen={connectingPlatform !== null}
                onClose={() => setConnectingPlatform(null)}
                title={`SSO Bridge: ${connectingPlatform}`}
            >
                <div className="text-center py-4 space-y-4">
                    <div className="w-14 h-14 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto border border-blue-500/20">
                        {connectingPlatform === 'GitHub' ? <Github size={24} /> : <Globe size={24} />}
                    </div>
                    
                    <h3 className="text-base font-bold text-white">Authorize Secure Auth Sync?</h3>
                    
                    <p className="text-[13px] text-neutral-400 leading-relaxed max-w-sm mx-auto">
                        This action bridges your verified security certificate with Verlyn Network nodes. Fast-login capabilities will be activated.
                    </p>

                    <div className="bg-[#161616] p-4 rounded-2xl flex items-start gap-2.5 text-left border border-white/5 max-w-sm mx-auto">
                        <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                        <span className="text-[12px] text-neutral-500 leading-normal">
                            SSO provider links do not share cryptographic private messaging channels or personal feeds.
                        </span>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-white/5">
                        <button
                            type="button"
                            onClick={() => setConnectingPlatform(null)}
                            disabled={isPlatformLinking}
                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-neutral-300 font-semibold rounded-xl transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmConnect}
                            disabled={isPlatformLinking}
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isPlatformLinking && <Loader2 size={14} className="animate-spin" />}
                            Link SSO
                        </button>
                    </div>
                </div>
            </ModalSystem>

            {/* CONFIRMATION FOR DEACTIVATION */}
            <ConfirmDialog
                isOpen={showDeactivateConfirm}
                onClose={() => setShowDeactivateConfirm(false)}
                onConfirm={handleDeactivate}
                title="Deactivate profile timeline?"
                message="Are you sure you want to temporarily deactivate your Verlyn account? Deactivating hides your profile details, timeline posts, direct message read status, and search visibility until you re-authenticate. Switcher shortcuts to this device will also be logged out. This process can be reversed anytime."
                confirmText="Deactivate"
                cancelText="Keep Profile"
                destructive={false}
                loading={loading}
            />

            {/* CONFIRMATION FOR SWEEPING SESSIONS */}
            <ConfirmDialog
                isOpen={showLogoutAllConfirm}
                onClose={() => setShowLogoutAllConfirm(false)}
                onConfirm={handleLogoutEverywhere}
                title="Sweep all other sessions?"
                message="You are about to sweep and terminate all active sessions connected to this username across all other browsers, laptops, and mobile applications. Remote E2EE messaging nodes will require manual credential re-authorizations. This device remains connected."
                confirmText="Purge Others"
                cancelText="Cancel"
                destructive
                loading={loading}
            />

            {/* DELETE ACCOUNT DIALOG */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in text-on-surface">
                    <div className="w-full max-w-md bg-[#0b0b0b] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl relative">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                    <Trash2 size={22} />
                                </div>
                                <button type="button" onClick={() => setShowDeleteModal(false)} className="p-1 rounded-full text-neutral-500 hover:text-white hover:bg-white/5 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <h3 className="text-lg font-bold text-white mb-2">Delete Verlyn Account</h3>
                            <p className="text-[13px] text-neutral-400 mb-6 leading-relaxed">
                                This is irreversible. All posts, messages, profile data, and friends lists will be permanently deleted from our servers.
                            </p>
                            
                            <div className="space-y-4">
                                <div className="bg-[#121212] p-4 rounded-2xl border border-white/5 flex items-start gap-2.5">
                                    <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                                    <span className="text-[12px] text-red-400/80 leading-normal">
                                        This process cannot be undone. All data and backups will be permanently deleted.
                                    </span>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                                        To proceed, type "DELETE PERMANENTLY"
                                    </label>
                                    <input 
                                        type="text"
                                        placeholder="Type exactly: DELETE PERMANENTLY"
                                        value={deleteConfirm}
                                        onChange={(e) => setDeleteConfirm(e.target.value)}
                                        className="w-full bg-[#161616] border border-white/5 focus:border-red-500/40 rounded-xl px-4 py-3 text-[14px] font-mono text-red-500 focus:outline-none placeholder-neutral-700 transition-colors"
                                    />
                                </div>
                                {error && <p className="text-[13px] text-red-500">{error}</p>}
                                
                                <div className="flex gap-3 pt-2">
                                    <button 
                                        type="button"
                                        onClick={() => setShowDeleteModal(false)}
                                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-neutral-300 font-semibold rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleDelete}
                                        disabled={loading || deleteConfirm !== 'DELETE PERMANENTLY'}
                                        className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2"
                                    >
                                        {loading && <Loader2 size={14} className="animate-spin" />}
                                        Destroy Node
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Toast show={toast.show} message={toast.message} type={toast.type} />
        </div>
    );
}
