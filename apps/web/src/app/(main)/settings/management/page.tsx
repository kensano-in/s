'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useIdentitiesStore } from '@/lib/identities-store';
import { deleteAccountPermanently } from '@/app/(main)/settings/actions';
import { signOut } from '@/app/login/actions';
import { SettingsSection, SettingsRow, Toast } from '../components';
import { AlertTriangle, Trash2, Loader2, X, LogOut, Users, UserPlus, ShieldAlert } from 'lucide-react';

export default function ManagementSettings() {
    const { currentUser } = useAppStore();
    const { identities, removeIdentity, clearIdentities } = useIdentitiesStore();
    
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

    const handleSignOut = async () => {
        setLoading(true);
        await signOut();
    };

    const handleAddAccount = async () => {
        // Redirect to login to add another account
        // We go to login, but the user is already saved in identitiesStore by SystemBootstrap
        await signOut();
    };

    const handleDelete = async () => {
        if (deleteConfirm !== 'DELETE PERMANENTLY' || !currentUser?.id) return;
        setLoading(true);
        const res = await deleteAccountPermanently(currentUser.id);
        if (res.error) {
            setError(res.error);
            setLoading(false);
        } else {
            // Identity removal should happen here too
            removeIdentity(currentUser.id);
            window.location.href = '/login';
        }
    };

    const handleDeactivate = () => {
        setToast({ show: true, message: 'Deactivation is currently disabled', type: 'error' });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    return (
        <div className="max-w-2xl animate-fade-in relative z-0 pb-20">
            <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-1">Identity & Sessions</h2>
                <p className="text-[14px] text-neutral-500">Manage your active sessions and multiple account identities.</p>
            </div>

            <SettingsSection title="Active Session">
                <SettingsRow 
                    icon={LogOut}
                    title="Sign Out" 
                    desc="Terminate your current session on this device. Your metadata will remain in the identity switcher for fast re-entry." 
                    right={
                        <button 
                            onClick={handleSignOut}
                            disabled={loading}
                            className="text-[13px] text-white font-semibold bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full transition-all active:scale-95 flex items-center gap-2"
                        >
                            {loading && <Loader2 size={14} className="animate-spin" />}
                            Log Out
                        </button>
                    }
                />
            </SettingsSection>

            <SettingsSection title="Identity Management">
                <div className="mb-4">
                    <p className="text-[13px] text-neutral-500 mb-4 px-1">
                        Accounts logged in on this device. Switching identities requires a secure re-authentication for your protection.
                    </p>
                    
                    <div className="space-y-2 mb-6">
                        {identities.map((id) => (
                            <div key={id.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-800">
                                        {id.avatarUrl ? (
                                            <img src={id.avatarUrl} alt={id.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-neutral-500">
                                                {id.username[0].toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-semibold text-white">
                                            {id.displayName}
                                            {id.id === currentUser?.id && <span className="ml-2 text-[10px] bg-v-cyan/20 text-v-cyan px-2 py-0.5 rounded-full uppercase tracking-tighter font-black">Current</span>}
                                        </p>
                                        <p className="text-[12px] text-neutral-500">@{id.username}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {id.id !== currentUser?.id && (
                                        <button 
                                            onClick={handleSignOut}
                                            className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                            title="Switch to this identity"
                                        >
                                            <UserPlus size={18} />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => removeIdentity(id.id)}
                                        className="p-2 text-neutral-500 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-colors"
                                        title="Remove from device"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={handleAddAccount}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white text-[14px] font-semibold rounded-2xl border border-dashed border-white/10 transition-all active:scale-[0.98]"
                        >
                            <UserPlus size={18} className="text-v-cyan" />
                            Add or Switch Account
                        </button>
                        
                        <button 
                            onClick={() => {
                                clearIdentities();
                                setToast({ show: true, message: 'Identity cache cleared', type: 'success' });
                                setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
                            }}
                            className="w-full flex items-center justify-center gap-2 py-3 text-neutral-500 hover:text-neutral-300 text-[12px] font-medium transition-colors"
                        >
                            <ShieldAlert size={14} />
                            Clear identity data from this device
                        </button>
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection title="Danger Zone">
                <SettingsRow 
                    icon={AlertTriangle}
                    title="Deactivate Account" 
                    desc="Temporarily disable your profile. Your data will be hidden but remains on our servers." 
                    right={
                        <button 
                            onClick={handleDeactivate}
                            className="text-[13px] text-neutral-300 font-medium bg-white/5 hover:bg-white/10 px-4 py-1.5 rounded-full transition-colors"
                        >
                            Deactivate
                        </button>
                    }
                />
                
                <SettingsRow 
                    icon={Trash2}
                    title="Delete Account" 
                    desc="Permanently erase your identity. This action is irreversible." 
                    destructive
                    right={
                        <button 
                            onClick={() => setShowDeleteModal(true)}
                            className="text-[13px] text-red-500 font-medium bg-red-500/10 hover:bg-red-500/20 px-4 py-1.5 rounded-full transition-colors"
                        >
                            Delete identity
                        </button>
                    }
                />
            </SettingsSection>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in text-on-surface">
                    <div className="w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                    <Trash2 size={24} />
                                </div>
                                <button onClick={() => setShowDeleteModal(false)} className="text-neutral-500 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <h3 className="text-xl font-semibold text-white mb-2">Delete Account</h3>
                            <p className="text-[14px] text-neutral-400 mb-6">
                                You are about to permanently delete your account. All posts, favorites, followers, and private messages will be irreversibly removed.
                            </p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[13px] text-neutral-400 mb-2 font-medium">To confirm, type "DELETE PERMANENTLY"</label>
                                    <input 
                                        type="text"
                                        placeholder="DELETE PERMANENTLY"
                                        value={deleteConfirm}
                                        onChange={(e) => setDeleteConfirm(e.target.value)}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-[15px] font-mono text-red-500 focus:outline-none focus:border-red-500/50"
                                    />
                                </div>
                                {error && <p className="text-[13px] text-red-500">{error}</p>}
                                
                                <div className="flex gap-3 pt-4">
                                    <button 
                                        onClick={() => setShowDeleteModal(false)}
                                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-neutral-300 font-medium rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleDelete}
                                        disabled={loading || deleteConfirm !== 'DELETE PERMANENTLY'}
                                        className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading && <Loader2 size={16} className="animate-spin" />}
                                        Delete Forever
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
