'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { updateProfileInfo, checkUsernameUniqueness } from '@/app/(main)/settings/actions';
import { uploadMedia } from '@/app/(main)/feed/upload';
import { SettingsSection, SettingsInput, SettingsTextarea, Toast } from '../components';
import { Camera, Loader2 } from 'lucide-react';

export default function AccountSettings() {
    const { currentUser, setUser } = useAppStore();
    const [loading, setLoading] = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        display_name: currentUser?.displayName || '',
        username: currentUser?.username || '',
        bio: currentUser?.bio || '',
    });

    const [usernameError, setUsernameError] = useState<string | null>(null);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    useEffect(() => {
        if (!formData.username || formData.username === currentUser?.username) {
            setUsernameError(null);
            return;
        }
        const timer = setTimeout(async () => {
            const { isUnique } = await checkUsernameUniqueness(formData.username);
            setUsernameError(isUnique ? null : 'Username is already taken');
        }, 500);
        return () => clearTimeout(timer);
    }, [formData.username, currentUser?.username]);

    const handleSave = async () => {
        if (!currentUser?.id || usernameError) return;
        
        setLoading(true);
        const result = await updateProfileInfo(currentUser.id, formData);
        
        if (result.success) {
            setUser({
                ...currentUser,
                displayName: formData.display_name,
                username: formData.username,
                bio: formData.bio,
            });
            showToast('Account information saved');
        } else {
            showToast(result.error || 'Failed to update profile', 'error');
        }
        setLoading(false);
    };

    const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser?.id) return;

        setAvatarLoading(true);
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'avatars');

        const result = await uploadMedia(fd);
        if ('url' in result) {
            await updateProfileInfo(currentUser.id, { avatar_url: result.url });
            setUser({ ...currentUser, avatar: result.url });
            showToast('Profile photo updated');
        } else {
            showToast(result.error || 'Failed to upload photo', 'error');
        }
        setAvatarLoading(false);
    };

    const hasChanges = formData.display_name !== currentUser?.displayName ||
                       formData.username !== currentUser?.username ||
                       formData.bio !== currentUser?.bio;

    return (
        <div className="max-w-2xl animate-fade-in">
            <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-1">Account</h2>
                <p className="text-[14px] text-neutral-500">Manage your profile identity and basic info.</p>
            </div>

            <SettingsSection title="Profile Photo">
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="relative cursor-pointer group w-20 h-20 rounded-full overflow-hidden bg-neutral-800" onClick={() => document.getElementById('avatar-input')?.click()}>
                            <img src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username}`} alt="Avatar" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                {avatarLoading ? <Loader2 size={20} className="animate-spin text-white" /> : <Camera size={20} className="text-white" />}
                            </div>
                            <input id="avatar-input" type="file" className="hidden" accept="image/*" onChange={handleAvatar} disabled={avatarLoading} />
                        </div>
                        <div>
                            <p className="text-[15px] font-medium text-white mb-1">Change photo</p>
                            <p className="text-[13px] text-neutral-500 max-w-[200px]">Click the image to upload a new profile picture.</p>
                        </div>
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection title="Personal Information">
                <SettingsInput 
                    label="Display Name" 
                    value={formData.display_name} 
                    onChange={(v: string) => setFormData(prev => ({...prev, display_name: v}))} 
                    placeholder="E.g. Jane Doe"
                />
                <SettingsInput 
                    label="Username" 
                    value={formData.username} 
                    onChange={(v: string) => setFormData(prev => ({...prev, username: v.toLowerCase().replace(/[^a-z0-9_]/g, '')}))} 
                    placeholder="username"
                    error={usernameError}
                />
                <SettingsTextarea 
                    label="Bio" 
                    value={formData.bio} 
                    onChange={(v: string) => setFormData(prev => ({...prev, bio: v}))} 
                    placeholder="Tell us a little about yourself"
                />
            </SettingsSection>

            <SettingsSection title="Contact">
                <SettingsInput 
                    label="Email Address" 
                    value={currentUser?.email || (currentUser?.username ? (currentUser.username + '@verlyn.app') : 'user@verlyn.app')} 
                    disabled 
                />
                 <p className="text-[12px] text-neutral-500 px-4 pb-4">Email cannot be changed directly for security reasons. Contact support if you need to update it.</p>
            </SettingsSection>

            <div className="flex justify-end mt-6">
                <button
                    onClick={handleSave}
                    disabled={!hasChanges || loading || !!usernameError}
                    className="px-6 py-2.5 bg-neutral-100 text-black text-[14px] font-medium rounded-full hover:bg-white active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <Toast show={toast.show} message={toast.message} type={toast.type} />
        </div>
    );
}
