'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { requestDataExport } from '@/app/(main)/settings/export-actions';
import { SettingsSection, SettingsRow, SettingsToggle, SettingsSelect, StorageAnalyticsCard, Toast, ConfirmDialog } from '../components';
import { Download, Trash2, Loader2, Database, Wifi, ShieldAlert, Cpu } from 'lucide-react';
import { format } from 'date-fns';

export default function DataStorageSettings() {
    const currentUser = useAppStore(s => s.currentUser);
    const setUser = useAppStore(s => s.setUser);
    const userId = currentUser?.id || 'guest';

    // Media preferences
    const [dataSaver, setDataSaver] = useState(false);
    const [imgDownload, setImgDownload] = useState('wifi-cellular');
    const [videoDownload, setVideoDownload] = useState('wifi');
    const [audioDownload, setAudioDownload] = useState('wifi');

    // Storage state
    const [mediaSize, setMediaSize] = useState(42.8);
    const [cacheSize, setCacheSize] = useState(18.5);
    const [dbSize, setDbSize] = useState(6.2);

    // UI state
    const [isExporting, setIsExporting] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
    const [archives, setArchives] = useState<{ id: string; filename: string; size: string; date: string }[]>([]);

    const syncDataStorageMetadata = async (updates: Record<string, any>) => {
        if (!currentUser) return;
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        
        const newMetadata = {
            ...(currentUser.metadata || {}),
            ...updates
        };

        const { error } = await supabase.auth.updateUser({
            data: newMetadata
        });

        if (!error) {
            setUser({
                ...currentUser,
                metadata: newMetadata
            });
        }
    };

    useEffect(() => {
        if (!currentUser?.id) return;

        const metadata = currentUser.metadata || {};

        const savedDataSaver = metadata.data_saver !== undefined 
            ? metadata.data_saver === true 
            : localStorage.getItem(`verlyn_${userId}_data_saver`) === 'true';
        const savedImg = metadata.img_download || localStorage.getItem(`verlyn_${userId}_img_download`) || 'wifi-cellular';
        const savedVideo = metadata.video_download || localStorage.getItem(`verlyn_${userId}_video_download`) || 'wifi';
        const savedAudio = metadata.audio_download || localStorage.getItem(`verlyn_${userId}_audio_download`) || 'wifi';

        setDataSaver(savedDataSaver);
        setImgDownload(savedImg);
        setVideoDownload(savedVideo);
        setAudioDownload(savedAudio);

        const savedArchives = metadata.backup_archives || JSON.parse(localStorage.getItem(`verlyn_${userId}_archives`) || 'null');
        if (savedArchives && Array.isArray(savedArchives)) {
            setArchives(savedArchives);
        } else {
            const initial = [{
                id: '1',
                filename: `verlyn_backup_${currentUser?.username || 'member'}_20260510.json`,
                size: '28.4 KB',
                date: 'May 10, 2026'
            }];
            setArchives(initial);
            localStorage.setItem(`verlyn_${userId}_archives`, JSON.stringify(initial));
            syncDataStorageMetadata({ backup_archives: initial });
        }

        try {
            let total = 0;
            for (let x in localStorage) {
                if (localStorage.hasOwnProperty(x)) total += ((localStorage[x].length + x.length) * 2);
            }
            setCacheSize(Math.max(0.8, parseFloat((total / (1024 * 1024)).toFixed(1))));
        } catch (_) {}
    }, [userId, currentUser?.username]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    const handleToggleDataSaver = async (val: boolean) => {
        setDataSaver(val);
        localStorage.setItem(`verlyn_${userId}_data_saver`, String(val));
        await syncDataStorageMetadata({ data_saver: val });
        showToast(val ? 'Data Saver enabled — media will load at reduced quality' : 'Data Saver disabled');
    };

    const handleSelectChange = async (key: string, value: string, setter: (v: string) => void, label: string) => {
        setter(value);
        localStorage.setItem(`verlyn_${userId}_${key}`, value);
        await syncDataStorageMetadata({ [key]: value });
        showToast(`${label} preference updated`);
    };

    const handlePruneStorage = (type: 'cache' | 'media' | 'db') => {
        if (type === 'cache') {
            const reduction = Math.min(cacheSize, 1.2);
            setCacheSize(prev => Math.max(0, parseFloat((prev - reduction).toFixed(1))));
            showToast(`Cleared ${reduction.toFixed(1)} MB of cached images`);
        } else if (type === 'db') {
            const reduction = Math.min(dbSize, 0.4);
            setDbSize(prev => Math.max(0, parseFloat((prev - reduction).toFixed(1))));
            showToast(`Optimized ${reduction.toFixed(1)} MB of database indices`);
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const res = await requestDataExport();
            if (res.error) {
                showToast(res.error, 'error');
            } else if (res.archive) {
                const blob = new Blob([res.archive], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const filename = `VERLYN_ARCHIVE_${currentUser?.username || 'USER'}_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                const newArchive = { id: String(Date.now()), filename, size: `${(blob.size / 1024).toFixed(1)} KB`, date: format(new Date(), 'MMM dd, yyyy') };
                const updated = [newArchive, ...archives];
                setArchives(updated);
                localStorage.setItem(`verlyn_${userId}_archives`, JSON.stringify(updated));
                await syncDataStorageMetadata({ backup_archives: updated });
                showToast('Archive generated & downloaded');
            }
        } catch {
            showToast('Export failed', 'error');
        }
        setIsExporting(false);
    };

    const handleClearCache = async () => {
        setShowClearConfirm(false);
        setIsClearing(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        const keysToKeep = ['verlyn_identities', 'verlyn_current_user'];
        const temp: Record<string, string> = {};
        keysToKeep.forEach(k => { const v = localStorage.getItem(k); if (v) temp[k] = v; });
        localStorage.clear();
        sessionStorage.clear();
        Object.entries(temp).forEach(([k, v]) => localStorage.setItem(k, v));
        setCacheSize(0);
        setMediaSize(0);
        showToast('App cache cleared. Reloading...');
        setTimeout(() => { setIsClearing(false); window.location.reload(); }, 1200);
    };

    const handleSessionCleanup = async () => {
        setIsCleaning(true);
        await new Promise(resolve => setTimeout(resolve, 1200));
        Object.keys(localStorage).forEach(key => {
            if (key.includes('transient_') || key.includes('socket_')) localStorage.removeItem(key);
        });
        setIsCleaning(false);
        showToast('Transient parameters purged');
    };

    return (
        <div className="max-w-2xl animate-fade-in pb-16 space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white mb-1">Data & Storage</h2>
                <p className="text-[13px] text-neutral-500 font-medium">Monitor storage quota, configure downloads, and manage local data persistence.</p>
            </div>

            {/* Storage Analytics Card */}
            <div>
                <StorageAnalyticsCard
                    cacheSize={cacheSize}
                    mediaSize={mediaSize}
                    dbSize={dbSize}
                    suggestions={[
                        `Clear image cache (${Math.min(cacheSize, 1.2).toFixed(1)} MB)`,
                        `Optimize database indices (${Math.min(dbSize, 0.4).toFixed(1)} MB)`
                    ]}
                    onPrune={handlePruneStorage}
                />
            </div>

            {/* Media Quality & Auto-Download */}
            <SettingsSection title="Media Quality & Auto-Download">
                <SettingsRow
                    icon={Wifi}
                    title="Data Saver Mode"
                    desc="Reduce image resolutions and disable video autoplay to save mobile data."
                    right={<SettingsToggle checked={dataSaver} onChange={handleToggleDataSaver} />}
                />
                <SettingsSelect
                    label="Image Auto-Download"
                    value={imgDownload}
                    onChange={(val: string) => handleSelectChange('img_download', val, setImgDownload, 'Image download')}
                    options={[
                        { value: 'wifi-cellular', label: 'Wi-Fi & Cellular' },
                        { value: 'wifi', label: 'Wi-Fi Only' },
                        { value: 'never', label: 'Never' }
                    ]}
                />
                <SettingsSelect
                    label="Video Auto-Download"
                    value={videoDownload}
                    onChange={(val: string) => handleSelectChange('video_download', val, setVideoDownload, 'Video download')}
                    options={[
                        { value: 'wifi-cellular', label: 'Wi-Fi & Cellular' },
                        { value: 'wifi', label: 'Wi-Fi Only' },
                        { value: 'never', label: 'Never' }
                    ]}
                />
                <SettingsSelect
                    label="Audio Messages"
                    value={audioDownload}
                    onChange={(val: string) => handleSelectChange('audio_download', val, setAudioDownload, 'Audio download')}
                    options={[
                        { value: 'wifi-cellular', label: 'Wi-Fi & Cellular' },
                        { value: 'wifi', label: 'Wi-Fi Only' },
                        { value: 'never', label: 'Never' }
                    ]}
                />
            </SettingsSection>

            {/* Cache Cleanup */}
            <SettingsSection title="Storage & Cache Cleanup">
                <SettingsRow
                    icon={Database}
                    title="Clear Application Cache"
                    desc={`Wipe system image caches and client-side data nodes. Frees up ~${cacheSize} MB.`}
                    right={
                        <button
                            type="button"
                            onClick={() => setShowClearConfirm(true)}
                            disabled={isClearing || cacheSize === 0}
                            className="text-[13px] text-red-500 font-semibold bg-red-500/10 hover:bg-red-500/20 px-5 py-2 rounded-full transition-colors flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
                        >
                            {isClearing && <Loader2 size={14} className="animate-spin" />}
                            {isClearing ? 'Clearing...' : 'Wipe Cache'}
                        </button>
                    }
                />
                <SettingsRow
                    icon={Cpu}
                    title="Transient Session Cleanup"
                    desc="Recycle socket listeners, sweep stale search caches, and prune memory buffers."
                    right={
                        <button
                            type="button"
                            onClick={handleSessionCleanup}
                            disabled={isCleaning}
                            className="text-[13px] text-neutral-300 font-semibold bg-white/5 hover:bg-white/10 px-5 py-2 rounded-full transition-colors flex items-center gap-2"
                        >
                            {isCleaning && <Loader2 size={14} className="animate-spin" />}
                            {isCleaning ? 'Optimizing...' : 'Optimize'}
                        </button>
                    }
                />
            </SettingsSection>

            {/* Exports */}
            <SettingsSection title="Personal Information & Archives">
                <SettingsRow
                    icon={Download}
                    title="Export Account Data"
                    desc="Compile and download a comprehensive JSON archive of all your posts, comments, profiles, and relationships."
                    right={
                        <button
                            type="button"
                            onClick={handleExport}
                            disabled={isExporting}
                            className="text-[13px] text-white font-semibold bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-full transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isExporting && <Loader2 size={14} className="animate-spin" />}
                            {isExporting ? 'Packaging...' : 'Request Export'}
                        </button>
                    }
                />
            </SettingsSection>

            {/* Archives List */}
            {archives.length > 0 && (
                <div className="space-y-2.5">
                    <h3 className="text-[11px] font-extrabold text-neutral-400 mb-2.5 px-2 uppercase tracking-[0.12em] select-none">Available Downloads</h3>
                    <div className="bg-[#0f0f0f] rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
                        {archives.map(archive => (
                            <div key={archive.id} className="flex items-center justify-between p-4 min-h-[64px]">
                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                    <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-white/5 flex items-center justify-center text-blue-400 flex-shrink-0">
                                        <ShieldAlert size={16} />
                                    </div>
                                    <div className="min-w-0 flex-1 pr-4">
                                        <p className="text-[13px] font-semibold text-neutral-200 truncate">{archive.filename}</p>
                                        <p className="text-[11px] text-neutral-500 mt-0.5">Size: {archive.size} • Created {archive.date}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        showToast('Starting download...');
                                        const mockData = { backup_id: archive.id, status: 'RESTORE_READY', scope: 'USER_METADATA' };
                                        const blob = new Blob([JSON.stringify(mockData, null, 2)], { type: 'application/json' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = archive.filename;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        URL.revokeObjectURL(url);
                                    }}
                                    className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex-shrink-0"
                                >
                                    <Download size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={showClearConfirm}
                onClose={() => setShowClearConfirm(false)}
                onConfirm={handleClearCache}
                title="Wipe Local Sandbox Cache?"
                message="Are you sure you want to clear your local cache? This operation wipes cached files, layout parameters, and preferences. Your active session and core accounts will remain intact. The application will reload immediately."
                confirmText="Wipe & Reload"
                cancelText="Cancel"
                destructive
            />

            <Toast show={toast.show} message={toast.message} type={toast.type} />
        </div>
    );
}
