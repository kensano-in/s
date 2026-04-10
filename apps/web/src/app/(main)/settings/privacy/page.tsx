'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { updateUserSettings } from '@/app/(main)/settings/actions';
import { SettingsSection, SettingsRow, SettingsToggle, SettingsSelect, Toast } from '../components';

export default function PrivacySettings() {
    const { currentUser, settingPrivateAccount, setSettingPrivateAccount } = useAppStore();
    
    // Additional settings not in store but fetched from profile table in a real app
    // We'll simulate them using local state that maps to generic user settings
    const [messagingPermission, setMessagingPermission] = useState('everyone');
    const [activityVisibility, setActivityVisibility] = useState(true);

    useEffect(() => {
        const savedMsg = localStorage.getItem('verlyn_privacy_msg');
        if (savedMsg) setMessagingPermission(savedMsg);
        const savedAct = localStorage.getItem('verlyn_privacy_act');
        if (savedAct) setActivityVisibility(savedAct === 'true');
    }, []);

    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    const handleUpdate = async (key: string, value: any, setter: any) => {
        // Optimistic UI update
        const previousValue = setter === setSettingPrivateAccount ? settingPrivateAccount : value;
        setter(value);
        if (key === 'messaging_permission') localStorage.setItem('verlyn_privacy_msg', value);
        if (key === 'activity_visibility') localStorage.setItem('verlyn_privacy_act', String(value));
        
        setLoading(true);
        
        const res = await updateUserSettings(currentUser?.id || '', { [key]: value });
        
        if (res.success) {
            showToast('Privacy settings updated');
        } else {
            // Revert on error
            setter(previousValue);
            if (key === 'messaging_permission') localStorage.setItem('verlyn_privacy_msg', previousValue);
            if (key === 'activity_visibility') localStorage.setItem('verlyn_privacy_act', String(previousValue));
            showToast('Failed to update setting', 'error');
        }
        setLoading(false);
    };

    return (
        <div className="max-w-2xl animate-fade-in">
            <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-1">Privacy</h2>
                <p className="text-[14px] text-neutral-500">Manage who can see your activity and interact with you.</p>
            </div>

            <SettingsSection title="Visibility">
                <SettingsRow 
                    title="Private Account" 
                    desc="When enabled, only approved followers can see your posts and followers list." 
                    right={
                        <SettingsToggle 
                            checked={settingPrivateAccount} 
                            onChange={(v) => handleUpdate('is_private', v, setSettingPrivateAccount)} 
                            disabled={loading}
                        />
                    }
                />
                <SettingsRow 
                    title="Activity Status" 
                    desc="Allow accounts you follow and anyone you message to see when you're active." 
                    right={
                        <SettingsToggle 
                            checked={activityVisibility} 
                            onChange={(v) => handleUpdate('activity_visibility', v, setActivityVisibility)} 
                            disabled={loading}
                        />
                    }
                />
            </SettingsSection>

            <SettingsSection title="Interactions">
                <SettingsSelect
                    label="Direct Messages"
                    value={messagingPermission}
                    onChange={(v: string) => handleUpdate('messaging_permission', v, setMessagingPermission)}
                    disabled={loading}
                    options={[
                        { label: 'Everyone', value: 'everyone' },
                        { label: 'Followers Only', value: 'followers' },
                        { label: 'No One', value: 'none' },
                    ]}
                />
            </SettingsSection>

            <Toast show={toast.show} message={toast.message} type={toast.type} />
        </div>
    );
}
