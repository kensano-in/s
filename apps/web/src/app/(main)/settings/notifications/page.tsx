'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { SettingsSection, SettingsRow, SettingsToggle, SettingsSelect, Toast } from '../components';
import { 
    Bell, 
    MessageSquare, 
    AtSign, 
    PhoneCall, 
    Users, 
    Mail, 
    Percent, 
    Volume2, 
    Moon, 
    Clock, 
    Smartphone, 
    VolumeX,
    Sparkles,
    Check,
    Volume1,
    Settings,
    Shield,
    Music,
    Zap,
    Vibrate,
    Cpu,
    Compass,
    Flame,
    Radio,
    Activity,
    Disc,
    Gem,
    Waves,
    Sun,
    Inbox,
    Phone,
    Video,
    Ghost,
    Lock
} from 'lucide-react';
import clsx from 'clsx';
import { createClient } from '@/lib/supabase/client';
import { updateUserSettings, getUserSettings } from '@/app/(main)/settings/actions';
import { notificationService } from '@/services/notification.service';
import { playSound, stopAllSounds, SoundCategory } from '@/lib/sound-generator';
import { realtimeBroadcast } from '@/hooks/useRealtimeMessages';

const BATCHING_OPTIONS = [
    { label: 'Deliver Instantly', value: 'instant' },
    { label: 'Batch Every 5 Minutes', value: '5m' },
    { label: 'Batch Every 15 Minutes', value: '15m' },
    { label: 'Hourly Digest', value: '1h' },
    { label: 'Daily Delivery Bundle', value: '24h' }
];

const SOUNDS: { label: string; value: SoundCategory; iconName: string }[] = [
    { label: 'Default',      value: 'default',    iconName: 'bell' },
    { label: 'Minimal',      value: 'minimal',    iconName: 'zap' },
    { label: 'Soft',         value: 'soft',       iconName: 'volume1' },
    { label: 'Glass',        value: 'glass',      iconName: 'sparkles' },
    { label: 'Digital',      value: 'digital',    iconName: 'cpu' },
    { label: 'Modern',       value: 'modern',     iconName: 'compass' },
    { label: 'Premium',      value: 'premium',    iconName: 'shield' },
    { label: 'Bell Sound',   value: 'bell',       iconName: 'music' },
    { label: 'Nature',       value: 'nature',     iconName: 'flame' },
    { label: 'Sci-Fi',       value: 'sci-fi',     iconName: 'radio' },
    { label: 'Gaming',       value: 'gaming',     iconName: 'activity' },
    { label: 'Retro',        value: 'retro',      iconName: 'disc' },
    { label: 'Crystal',      value: 'crystal',    iconName: 'gem' },
    { label: 'Mechanical',   value: 'mechanical', iconName: 'waves' },
    { label: 'Cosmic Sweep', value: 'cosmic',     iconName: 'sun' },
    { label: 'Celest Chime', value: 'chime',      iconName: 'bell' },
    { label: 'Glass Ping',   value: 'glass-ping', iconName: 'gem' },
    { label: 'Synth Rise',   value: 'synth-rise', iconName: 'zap' },
    { label: 'Echo Bell',    value: 'echo-bell',  iconName: 'music' },
    { label: 'Silent Mode',  value: 'silent',     iconName: 'volumex' },
];

const ICON_MAP: Record<string, React.ComponentType<any>> = {
    bell: Bell,
    zap: Zap,
    volume1: Volume1,
    sparkles: Sparkles,
    cpu: Cpu,
    compass: Compass,
    shield: Shield,
    music: Music,
    flame: Flame,
    radio: Radio,
    activity: Activity,
    disc: Disc,
    gem: Gem,
    waves: Waves,
    sun: Sun,
    volumex: VolumeX,
};

/** Tap-to-preview visual sound picker card grid */
function SoundPicker({
    value,
    onChange,
    disabled = false,
}: {
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
}) {
    const handleSelect = (v: SoundCategory) => {
        onChange(v);
        stopAllSounds();
        if (v !== 'silent') playSound(v);
    };

    return (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {SOUNDS.map(s => {
                const isSelected = value === s.value;
                const IconComponent = ICON_MAP[s.iconName] || Bell;
                return (
                    <button
                        key={s.value}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleSelect(s.value)}
                        className={clsx(
                            'relative flex flex-col items-center justify-center gap-2.5 py-4 px-1 rounded-2xl border text-center transition-all duration-200 select-none cursor-pointer',
                            'hover:scale-[1.03] active:scale-[0.97]',
                            disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
                            isSelected
                                ? 'bg-indigo-500/15 border-indigo-500/50 shadow-[0_0_0_1.5px_rgba(99,102,241,0.5)]'
                                : 'bg-white/[0.03] border-white/[0.05] hover:border-white/[0.12] hover:bg-white/[0.05]'
                        )}
                    >
                        <IconComponent size={20} className={isSelected ? 'text-indigo-400' : 'text-white/40'} />
                        <span className={clsx(
                            'text-[10px] font-bold leading-none truncate w-full text-center mt-0.5',
                            isSelected ? 'text-indigo-300' : 'text-neutral-400'
                        )}>
                            {s.label}
                        </span>
                        {isSelected && (
                            <span className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-indigo-500 flex items-center justify-center">
                                <Check size={7} className="text-white" strokeWidth={3} />
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

const VIBRATION_PATTERNS = [
    { label: 'Heartbeat Pulse', value: 'heartbeat' },
    { label: 'Classic Long', value: 'classic' },
    { label: 'Rapid Staccato', value: 'rapid' },
    { label: 'Soft Tap', value: 'soft' },
    { label: 'Double Pulse', value: 'double' },
    { label: 'No Vibration', value: 'none' }
];

const INTENSITY_LEVELS = [
    { label: 'Low Intensity', value: 'low' },
    { label: 'Medium Intensity', value: 'medium' },
    { label: 'High Intensity', value: 'high' }
];

export default function NotificationsSettings() {
    const currentUser = useAppStore(s => s.currentUser);
    const setUser = useAppStore(s => s.setUser);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

    const [tempSettings, setTempSettings] = useState({
        push_all: true,
        messages: true,
        mentions: true,
        calls: true,
        communities: true,
        email_notifs: true,
        marketing: false,
        sound_vibe: true,
        batching: 'instant',
        soundPreset: 'default',
        vibrationPreset: 'heartbeat',
        intensity: 'medium',
        sound_dms: 'default',
        sound_requests: 'default',
        sound_groups: 'default',
        sound_mentions: 'default',
        sound_calls: 'default',
        sound_video_calls: 'default',
        sound_ghost: 'default',
        sound_secret: 'default',
        sound_system: 'default',
        message_preview: true,
        led_alerts: true,
        silent_mode: false,
        priority_notifications: false,
        quietHoursActive: false,
        selectedQuietHours: [] as number[],
    });

    const [originalSettings, setOriginalSettings] = useState<any>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    useEffect(() => {
        if (!currentUser?.id) return;
        
        const loadSettings = async () => {
            setLoading(true);
            try {
                // 1. Fetch push_notifs_enabled and email_digest_enabled from database
                let dbPushAll = true;
                let dbEmailDigest = true;
                const res = await getUserSettings(currentUser.id);
                if (res.success && res.settings) {
                    dbPushAll = res.settings.push_notifs_enabled;
                    dbEmailDigest = res.settings.email_digest_enabled;
                }

                // 2. Fetch category preferences from database
                let catPrefs: any = {};
                const prefRes = await notificationService.getPreferences(currentUser.id);
                if (prefRes.success && prefRes.data) {
                    prefRes.data.forEach((p: any) => {
                        if (p.type === 'dm') catPrefs.messages = p.enabled_in_app !== false;
                        if (p.type === 'mention') catPrefs.mentions = p.enabled_in_app !== false;
                        if (p.type === 'call') catPrefs.calls = p.enabled_in_app !== false;
                        if (p.type === 'community') catPrefs.communities = p.enabled_in_app !== false;
                    });
                }

                // 3. Get metadata from currentUser
                const metadata = currentUser.metadata || {};

                const loaded = {
                    push_all: metadata.push_notifs_enabled !== undefined ? metadata.push_notifs_enabled : dbPushAll,
                    messages: metadata.pref_messages !== undefined ? metadata.pref_messages : (catPrefs.messages !== undefined ? catPrefs.messages : true),
                    mentions: metadata.pref_mentions !== undefined ? metadata.pref_mentions : (catPrefs.mentions !== undefined ? catPrefs.mentions : true),
                    calls: metadata.pref_calls !== undefined ? metadata.pref_calls : (catPrefs.calls !== undefined ? catPrefs.calls : true),
                    communities: metadata.pref_communities !== undefined ? metadata.pref_communities : (catPrefs.communities !== undefined ? catPrefs.communities : true),
                    email_notifs: metadata.email_digest_enabled !== undefined ? metadata.email_digest_enabled : dbEmailDigest,
                    marketing: metadata.marketing !== undefined ? metadata.marketing : false,
                    sound_vibe: metadata.sound_vibe !== undefined ? metadata.sound_vibe : true,
                    batching: metadata.batching ?? 'instant',
                    soundPreset: metadata.soundPreset ?? 'default',
                    vibrationPreset: metadata.vibrationPreset ?? 'heartbeat',
                    intensity: metadata.intensity ?? 'medium',
                    sound_dms: metadata.sound_dms ?? 'default',
                    sound_requests: metadata.sound_requests ?? 'default',
                    sound_groups: metadata.sound_groups ?? 'default',
                    sound_mentions: metadata.sound_mentions ?? 'default',
                    sound_calls: metadata.sound_calls ?? 'default',
                    sound_video_calls: metadata.sound_video_calls ?? 'default',
                    sound_ghost: metadata.sound_ghost ?? 'default',
                    sound_secret: metadata.sound_secret ?? 'default',
                    sound_system: metadata.sound_system ?? 'default',
                    message_preview: metadata.message_preview !== false,
                    led_alerts: metadata.led_alerts !== false,
                    silent_mode: metadata.silent_mode ?? false,
                    priority_notifications: metadata.priority_notifications ?? false,
                    quietHoursActive: metadata.quietHoursActive !== undefined ? metadata.quietHoursActive : false,
                    selectedQuietHours: metadata.selectedQuietHours || [22, 23, 0, 1, 2, 3, 4, 5, 6],
                };

                setTempSettings(loaded);
                setOriginalSettings(loaded);
            } catch (err) {
                console.error('[LoadSettings] Error:', err);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, [currentUser]);

    const handleTempUpdate = (key: string, value: any) => {
        setTempSettings(prev => ({ ...prev, [key]: value }));
        
        // If sound selection changed, play a preview instantly
        if (key.startsWith('sound') && value !== 'silent') {
            playSound(value as SoundCategory);
        }
    };

    const toggleHour = (hour: number) => {
        let updated;
        const currentQH = tempSettings.selectedQuietHours;
        if (currentQH.includes(hour)) {
            updated = currentQH.filter(h => h !== hour);
        } else {
            updated = [...currentQH, hour].sort((a, b) => a - b);
        }
        handleTempUpdate('selectedQuietHours', updated);
    };

    const handleSaveChanges = async () => {
        if (!currentUser?.id) return;
        setLoading(true);
        try {
            // 1. Sync core DB settings
            await updateUserSettings(currentUser.id, {
                push_notifs_enabled: tempSettings.push_all,
                email_digest_enabled: tempSettings.email_notifs,
            });

            // 2. Sync category preferences to notificationService
            const types = [
                { key: 'messages', type: 'dm' },
                { key: 'mentions', type: 'mention' },
                { key: 'calls', type: 'call' },
                { key: 'communities', type: 'community' }
            ];
            for (const t of types) {
                const val = (tempSettings as any)[t.key];
                await notificationService.updatePreference(currentUser.id, t.type, {
                    enabled_in_app: val,
                    enabled_push: val
                });
            }

            // 3. Sync all settings to Auth metadata
            const metadataUpdates = {
                push_notifs_enabled: tempSettings.push_all,
                email_digest_enabled: tempSettings.email_notifs,
                marketing: tempSettings.marketing,
                sound_vibe: tempSettings.sound_vibe,
                batching: tempSettings.batching,
                soundPreset: tempSettings.soundPreset,
                vibrationPreset: tempSettings.vibrationPreset,
                intensity: tempSettings.intensity,
                sound_dms: tempSettings.sound_dms,
                sound_requests: tempSettings.sound_requests,
                sound_groups: tempSettings.sound_groups,
                sound_mentions: tempSettings.sound_mentions,
                sound_calls: tempSettings.sound_calls,
                sound_video_calls: tempSettings.sound_video_calls,
                sound_ghost: tempSettings.sound_ghost,
                sound_secret: tempSettings.sound_secret,
                sound_system: tempSettings.sound_system,
                message_preview: tempSettings.message_preview,
                led_alerts: tempSettings.led_alerts,
                silent_mode: tempSettings.silent_mode,
                priority_notifications: tempSettings.priority_notifications,
                quietHoursActive: tempSettings.quietHoursActive,
                selectedQuietHours: tempSettings.selectedQuietHours,
                pref_messages: tempSettings.messages,
                pref_mentions: tempSettings.mentions,
                pref_calls: tempSettings.calls,
                pref_communities: tempSettings.communities,
            };

            const supabase = createClient();
            const { data: { user }, error: authError } = await supabase.auth.updateUser({
                data: metadataUpdates
            });

            if (authError) {
                showToast('Auth metadata sync failed: ' + authError.message, 'error');
                return;
            }

            if (user) {
                setUser({
                    ...currentUser,
                    metadata: user.user_metadata || {}
                });
            }

            // 4. Real-time broadcast for cross-device synchronization
            realtimeBroadcast('global_settings_update', {
                userId: currentUser.id,
                metadata: metadataUpdates
            });

            setOriginalSettings(tempSettings);
            showToast('Alert profiles synchronized across devices!');
        } catch (err: any) {
            showToast('Save failed: ' + (err.message || 'Unknown error'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDiscardChanges = () => {
        setTempSettings(originalSettings);
        showToast('Settings changes reverted');
    };

    const formatHour = (h: number) => {
        if (h === 0) return '12 AM';
        if (h === 12) return '12 PM';
        return h > 12 ? `${h - 12} PM` : `${h} AM`;
    };

    const isDirty = originalSettings && JSON.stringify(tempSettings) !== JSON.stringify(originalSettings);
    const disabledChildren = !tempSettings.push_all;

    return (
        <div className="w-full pb-32 animate-fade-in relative">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-1">Notifications Center</h2>
                <p className="text-[12.5px] text-neutral-500 font-medium">Fine-tune alert frequencies, premium audio indicators, custom haptics, and scheduler blocks.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                {/* LEFT COLUMN: Main Preferences */}
                <div className="xl:col-span-7 space-y-6">
                    {/* Master Push Control */}
                    <SettingsSection title="System Controls">
                        <SettingsRow 
                            icon={Bell}
                            title="Global Notifications Switch" 
                            desc="Enable or disable all notifications and alerts on this account." 
                            right={
                                <SettingsToggle 
                                    checked={tempSettings.push_all} 
                                    onChange={(v) => handleTempUpdate('push_all', v)} 
                                    disabled={loading}
                                />
                            }
                        />
                        <SettingsRow 
                            icon={VolumeX}
                            title="Silent Mode" 
                            desc="Mute all notification alert sounds instantly." 
                            right={
                                <SettingsToggle 
                                    checked={tempSettings.silent_mode} 
                                    onChange={(v) => handleTempUpdate('silent_mode', v)} 
                                    disabled={loading || disabledChildren}
                                />
                            }
                        />
                        <SettingsRow 
                            icon={Zap}
                            title="Priority Notifications" 
                            desc="Always display important alerts at the top of the stack." 
                            right={
                                <SettingsToggle 
                                    checked={tempSettings.priority_notifications} 
                                    onChange={(v) => handleTempUpdate('priority_notifications', v)} 
                                    disabled={loading || disabledChildren}
                                />
                            }
                        />
                        <SettingsRow 
                            icon={MessageSquare}
                            title="Message Previews" 
                            desc="Display sender name and content in banner notifications." 
                            right={
                                <SettingsToggle 
                                    checked={tempSettings.message_preview} 
                                    onChange={(v) => handleTempUpdate('message_preview', v)} 
                                    disabled={loading || disabledChildren}
                                />
                            }
                        />
                        <SettingsRow 
                            icon={Smartphone}
                            title="Device LED Alerts" 
                            desc="Blink device status light indicators on incoming items." 
                            right={
                                <SettingsToggle 
                                    checked={tempSettings.led_alerts} 
                                    onChange={(v) => handleTempUpdate('led_alerts', v)} 
                                    disabled={loading || disabledChildren}
                                />
                            }
                        />
                    </SettingsSection>

                    {/* App Features Switches */}
                    <SettingsSection title="Interaction Gateways">
                        <SettingsRow 
                            icon={MessageSquare}
                            title="Direct Messages" 
                            desc="Receive notification banners when you get a direct message." 
                            right={
                                <SettingsToggle 
                                    checked={tempSettings.messages} 
                                    onChange={(v) => handleTempUpdate('messages', v)} 
                                    disabled={loading || disabledChildren}
                                />
                            }
                        />
                        <SettingsRow 
                            icon={AtSign}
                            title="Mentions & Tags" 
                            desc="Alert me when somebody mentions my username." 
                            right={
                                <SettingsToggle 
                                    checked={tempSettings.mentions} 
                                    onChange={(v) => handleTempUpdate('mentions', v)} 
                                    disabled={loading || disabledChildren}
                                />
                            }
                        />
                        <SettingsRow 
                            icon={PhoneCall}
                            title="Incoming Calls" 
                            desc="Notify me on incoming voice and video calls." 
                            right={
                                <SettingsToggle 
                                    checked={tempSettings.calls} 
                                    onChange={(v) => handleTempUpdate('calls', v)} 
                                    disabled={loading || disabledChildren}
                                />
                            }
                        />
                        <SettingsRow 
                            icon={Users}
                            title="Community Announcements" 
                            desc="Trigger alerts on community threads and broadcasts." 
                            right={
                                <SettingsToggle 
                                    checked={tempSettings.communities} 
                                    onChange={(v) => handleTempUpdate('communities', v)} 
                                    disabled={loading || disabledChildren}
                                />
                            }
                        />
                    </SettingsSection>

                    {/* Audio & Vibration Overhaul */}
                    {tempSettings.sound_vibe && !disabledChildren && (
                        <SettingsSection title="Alert Haptics & Sounds">
                            <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-2xl space-y-5">
                                <h4 className="text-xs font-bold text-white mb-2">Global Alert Sound</h4>
                                <SoundPicker
                                    value={tempSettings.soundPreset}
                                    onChange={(v: string) => handleTempUpdate('soundPreset', v)}
                                    disabled={tempSettings.silent_mode}
                                />
                                <div className="mt-4 space-y-3">
                                    <SettingsSelect
                                        label="Haptic Vibration Pattern"
                                        value={tempSettings.vibrationPreset}
                                        onChange={(v: string) => handleTempUpdate('vibrationPreset', v)}
                                        options={VIBRATION_PATTERNS}
                                    />
                                    <SettingsSelect
                                        label="Notification Alert Intensity"
                                        value={tempSettings.intensity}
                                        onChange={(v: string) => handleTempUpdate('intensity', v)}
                                        options={INTENSITY_LEVELS}
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-2xl space-y-5">
                                <h4 className="text-xs font-bold text-white mb-3">Per-Category Sounds</h4>
                                <p className="text-[11px] text-neutral-500 leading-relaxed -mt-2">
                                    Tap any tile to preview instantly. Changes save with the button below.
                                </p>
                                {[
                                    { key: 'sound_dms',         label: 'Direct Messages',     icon: MessageSquare },
                                    { key: 'sound_requests',    label: 'Message Requests',    icon: Inbox },
                                    { key: 'sound_groups',      label: 'Group Chats',         icon: Users },
                                    { key: 'sound_mentions',    label: 'Mentions & Tags',     icon: AtSign },
                                    { key: 'sound_calls',       label: 'Voice Calls',         icon: Phone },
                                    { key: 'sound_video_calls', label: 'Video Calls',         icon: Video },
                                    { key: 'sound_ghost',       label: 'Ghost Mode Alerts',   icon: Ghost },
                                    { key: 'sound_secret',      label: 'Secret Chat Alerts',  icon: Lock },
                                    { key: 'sound_system',      label: 'System Alerts',       icon: Shield },
                                ].map(({ key, label, icon: IconComponent }) => (
                                    <div key={key} className="space-y-2">
                                        <label className="text-[11px] font-bold text-neutral-400 flex items-center gap-1.5">
                                            <IconComponent size={12} className="text-neutral-500" /> {label}
                                        </label>
                                        <SoundPicker
                                            value={(tempSettings as any)[key]}
                                            onChange={(v: string) => handleTempUpdate(key, v)}
                                            disabled={tempSettings.silent_mode}
                                        />
                                    </div>
                                ))}
                            </div>
                        </SettingsSection>
                    )}

                    {/* Smart Batching */}
                    <SettingsSection title="Delivery Frequency">
                        <SettingsSelect
                            label="Notification Delivery Batching"
                            value={tempSettings.batching}
                            onChange={(v: string) => handleTempUpdate('batching', v)}
                            disabled={disabledChildren}
                            options={BATCHING_OPTIONS}
                        />
                    </SettingsSection>

                    {/* Digests */}
                    <SettingsSection title="Summary Services">
                        <SettingsRow 
                            icon={Mail}
                            title="Daily Email Digest" 
                            desc="Receive a summary of feed activities and notifications via email." 
                            right={
                                <SettingsToggle 
                                    checked={tempSettings.email_notifs} 
                                    onChange={(v) => handleTempUpdate('email_notifs', v)} 
                                    disabled={loading}
                                />
                            }
                        />
                        <SettingsRow 
                            icon={Percent}
                            title="Product Marketing Updates" 
                            desc="Keep updated on newly released features and platform releases." 
                            right={
                                <SettingsToggle 
                                    checked={tempSettings.marketing} 
                                    onChange={(v) => handleTempUpdate('marketing', v)} 
                                    disabled={loading}
                                />
                            }
                        />
                    </SettingsSection>
                </div>

                {/* RIGHT COLUMN: Quiet Hours Scheduler */}
                <div className="xl:col-span-5 xl:sticky xl:top-[90px] space-y-6">
                    <div className="px-1">
                        <h4 className="text-[11px] font-extrabold text-neutral-400 uppercase tracking-[0.12em] select-none mb-2.5">
                            Quiet Hours Engine
                        </h4>
                    </div>

                    <div className="bg-[#0B0B0B] border border-white/10 rounded-[32px] p-6 space-y-6 shadow-2xl relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-[14px] font-bold text-white flex items-center gap-1.5 leading-none">
                                    Do-Not-Disturb Mode
                                </h4>
                                <p className="text-[11px] text-neutral-500 mt-1 leading-none">Silence push items automatically</p>
                            </div>
                            <Moon size={16} className={tempSettings.quietHoursActive ? "text-purple-400" : "text-neutral-600"} />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                            <span className="text-[13px] font-bold text-neutral-200">Activate Quiet Hours Scheduler</span>
                            <SettingsToggle 
                                checked={tempSettings.quietHoursActive}
                                onChange={(v) => handleTempUpdate('quietHoursActive', v)}
                            />
                        </div>

                        {tempSettings.quietHoursActive && (
                            <div className="space-y-4 pt-2 animate-fade-in">
                                <label className="block text-[11px] font-extrabold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
                                    <Clock size={12} /> Select Silent Daily Hours
                                </label>
                                <p className="text-[11.5px] text-neutral-500 leading-normal">
                                    Click slots below to silence notifications. Blue blocks are silent.
                                </p>

                                {/* 24h Grid */}
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                    {Array.from({ length: 24 }, (_, i) => {
                                        const isSilent = tempSettings.selectedQuietHours.includes(i);
                                        return (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => toggleHour(i)}
                                                className={clsx(
                                                    "py-2 rounded-xl text-[10px] font-bold border transition-all text-center flex flex-col items-center justify-center gap-1 hover:scale-[1.03] active:scale-[0.97] cursor-pointer",
                                                    isSilent 
                                                        ? "bg-blue-600 border-blue-500 text-white" 
                                                        : "bg-neutral-900 border-white/5 text-neutral-500 hover:border-white/10"
                                                )}
                                            >
                                                <span>{formatHour(i)}</span>
                                                {isSilent && <VolumeX size={8} />}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-2xl text-[11px] text-neutral-400 leading-relaxed flex gap-2">
                                    <Sparkles size={16} className="text-purple-400 shrink-0 mt-0.5" />
                                    <span>Quiet Hours will apply automatically on all synced client devices during selected parameters.</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* STICKY FLOATING SAVE FOOTER BANNER */}
            {isDirty && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[600px] z-[400] bg-black/85 backdrop-blur-xl border border-white/15 rounded-3xl py-4 px-6 shadow-2xl flex items-center justify-between animate-fade-in-up">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] font-bold text-white">Unsaved Changes</span>
                        <span className="text-[10px] text-white/50">You have modified alert parameters.</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={handleDiscardChanges}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            Discard
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveChanges}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-600 text-white transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] active:scale-[0.98] cursor-pointer"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            )}

            <Toast show={toast.show} message={toast.message} type={toast.type} />
        </div>
    );
}
