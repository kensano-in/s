'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { requestDataExport } from '@/app/(main)/settings/export-actions';
import { SettingsSection, SettingsRow, Toast } from '../components';
import { Download, Trash2, Loader2, Database } from 'lucide-react';
import { format } from 'date-fns';

export default function DataStorageSettings() {
    const { currentUser } = useAppStore();
    
    const [isExporting, setIsExporting] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    const handleExport = async () => {
        setIsExporting(true);

        try {
            // Artificial delay for UI feedback
            await new Promise(resolve => setTimeout(resolve, 2000));

            const res = await requestDataExport();
            if (res.error) {
                showToast(res.error, 'error');
            } else if (res.archive) {
                const blob = new Blob([res.archive], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `VERLYN_ARCHIVE_${currentUser?.username || 'USER'}_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast('Data exported successfully');
            }
        } catch (e) {
            showToast('Export failed', 'error');
        }

        setIsExporting(false);
    };

    const handleClearCache = async () => {
        setIsClearing(true);
        // Simulate cache clearing 
        await new Promise(resolve => setTimeout(resolve, 1500));
        localStorage.clear();
        sessionStorage.clear();
        showToast('App cache cleared');
        setIsClearing(false);
        // Reload to apply cache clear
        setTimeout(() => window.location.reload(), 1000);
    };

    return (
        <div className="max-w-2xl animate-fade-in">
            <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-1">Data & Storage</h2>
                <p className="text-[14px] text-neutral-500">Manage your account data and local storage.</p>
            </div>

            <SettingsSection title="Personal Information">
                <SettingsRow 
                    icon={Download}
                    title="Export Account Data" 
                    desc="Download a copy of your personal data, posts, and interactions in JSON format." 
                    right={
                        <button 
                            onClick={handleExport}
                            disabled={isExporting}
                            className="text-[13px] text-neutral-300 font-medium bg-white/5 hover:bg-white/10 px-4 py-1.5 rounded-full transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isExporting && <Loader2 size={14} className="animate-spin" />}
                            {isExporting ? 'Preparing...' : 'Request Export'}
                        </button>
                    }
                />
            </SettingsSection>

            <SettingsSection title="Local Storage">
                <SettingsRow 
                    icon={Database}
                    title="Clear Application Cache" 
                    desc="Free up space by clearing cached images and local temporary data. This will reload the app." 
                    right={
                        <button 
                            onClick={handleClearCache}
                            disabled={isClearing}
                            className="text-[13px] text-red-500 font-medium bg-red-500/10 hover:bg-red-500/20 px-4 py-1.5 rounded-full transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isClearing && <Loader2 size={14} className="animate-spin" />}
                            {isClearing ? 'Clearing...' : 'Clear Cache'}
                        </button>
                    }
                />
            </SettingsSection>

            <Toast show={toast.show} message={toast.message} type={toast.type} />
        </div>
    );
}
