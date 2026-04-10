'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { updateUserSettings } from '@/app/(main)/settings/actions';
import { SettingsSection, SettingsRow, SettingsToggle, Toast } from '../components';

export default function NotificationsSettings() {
    const { currentUser } = useAppStore();
    
    const [preferences, setPreferences] = useState({
        push_all: true,
        mentions: true,
        likes: true,
        email_updates: false,
    });

    useEffect(() => {
        const saved = localStorage.getItem('verlyn_notifications_prefs');
        if (saved) {
            try {
                setPreferences(JSON.parse(saved));
            } catch (e) {}
        }
    }, []);

    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    const handleUpdate = async (key: keyof typeof preferences, value: boolean) => {
        const newPrefs = { ...preferences, [key]: value };
        setPreferences(newPrefs);
        
        setLoading(true);
        localStorage.setItem('verlyn_notifications_prefs', JSON.stringify(newPrefs));
        await new Promise(resolve => setTimeout(resolve, 300)); // Minimal faux network latency
        
        showToast('Notification settings updated');
        setLoading(false);
    };

    return (
        <div className="max-w-2xl animate-fade-in">
            <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-1">Notifications</h2>
                <p className="text-[14px] text-neutral-500">Choose how you want to be notified about activity.</p>
            </div>

            <SettingsSection title="Push Notifications">
                <SettingsRow 
                    title="All Notifications" 
                    desc="Receive push notifications for any activity related to you." 
                    right={
                        <SettingsToggle 
                            checked={preferences.push_all} 
                            onChange={(v) => handleUpdate('push_all', v)} 
                            disabled={loading}
                        />
                    }
                />
            </SettingsSection>

            <SettingsSection title="In-App Events">
                <SettingsRow 
                    title="Mentions" 
                    desc="Notify me when someone mentions me in a post or comment." 
                    right={
                        <SettingsToggle 
                            checked={preferences.mentions} 
                            onChange={(v) => handleUpdate('mentions', v)} 
                            disabled={loading || !preferences.push_all}
                        />
                    }
                />
                <SettingsRow 
                    title="Likes & Reactions" 
                    desc="Notify me when someone likes your post." 
                    right={
                        <SettingsToggle 
                            checked={preferences.likes} 
                            onChange={(v) => handleUpdate('likes', v)} 
                            disabled={loading || !preferences.push_all}
                        />
                    }
                />
            </SettingsSection>

            <SettingsSection title="Email">
                <SettingsRow 
                    title="Email Updates" 
                    desc="Receive weekly summaries and important account emails." 
                    right={
                        <SettingsToggle 
                            checked={preferences.email_updates} 
                            onChange={(v) => handleUpdate('email_updates', v)} 
                            disabled={loading}
                        />
                    }
                />
            </SettingsSection>

            <Toast show={toast.show} message={toast.message} type={toast.type} />
        </div>
    );
}
