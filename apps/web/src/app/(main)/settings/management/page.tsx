'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { deleteAccountPermanently } from '@/app/(main)/settings/actions';
import { SettingsSection, SettingsRow, Toast } from '../components';
import { AlertTriangle, Trash2, Loader2, X } from 'lucide-react';

export default function ManagementSettings() {
    const { currentUser } = useAppStore();
    
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

    const handleDelete = async () => {
        if (deleteConfirm !== 'DELETE PERMANENTLY' || !currentUser?.id) return;
        setLoading(true);
        const res = await deleteAccountPermanently(currentUser.id);
        if (res.error) {
            setError(res.error);
            setLoading(false);
        } else {
            window.location.href = '/login';
        }
    };

    const handleDeactivate = () => {
        setToast({ show: true, message: 'Deactivation is currently disabled', type: 'error' });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    return (
        <div className="max-w-2xl animate-fade-in relative z-0">
            <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-1">Account Management</h2>
                <p className="text-[14px] text-neutral-500">Danger zone. Manage account deactivation or permanent deletion.</p>
            </div>

            <SettingsSection title="Account Status">
                <SettingsRow 
                    icon={AlertTriangle}
                    title="Deactivate Account" 
                    desc="Temporarily disable your profile. Your data will be hidden but remains on our servers. You can reactivate anytime by logging back in." 
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
                    desc="Permanently erase your identity, posts, and data. This action is irreversible." 
                    destructive
                    right={
                        <button 
                            onClick={() => setShowDeleteModal(true)}
                            className="text-[13px] text-red-500 font-medium bg-red-500/10 hover:bg-red-500/20 px-4 py-1.5 rounded-full transition-colors"
                        >
                            Delete Account
                        </button>
                    }
                />
            </SettingsSection>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
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
