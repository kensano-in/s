'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { updateUserSettings, getUserSettings, getBlockedUsers, unblockUser } from '@/app/(main)/settings/actions';
import { searchUsersForMention } from '@/app/(main)/communities/actions';
import { 
    SettingsSection, 
    SettingsRow, 
    SettingsToggle, 
    SettingsSelect, 
    SettingsButton,
    ModalEngine, 
    Toast 
} from '../components';
import { getAvatarUrl } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { 
    Eye, 
    Users, 
    VolumeX, 
    Plus, 
    X,
    UserCheck,
    Lock
} from 'lucide-react';

const PERMISSION_OPTIONS = [
    { label: 'Everyone', value: 'everyone' },
    { label: 'Followers Only', value: 'followers' },
    { label: 'Specific People...', value: 'specific' },
    { label: 'No One', value: 'none' }
];

export default function PrivacySettings() {
    const currentUser = useAppStore(s => s.currentUser);
    const setUser = useAppStore(s => s.setUser);
    const settingPrivateAccount = useAppStore(s => s.settingPrivateAccount);
    const setSettingPrivateAccount = useAppStore(s => s.setSettingPrivateAccount);
    
    // Core visibility states
    const [activityVisibility, setActivityVisibility] = useState(true);
    const [messagingPermission, setMessagingPermission] = useState('everyone');

    const [messageDeliveryFollowers, setMessageDeliveryFollowers] = useState('chats');
    const [messageDeliveryOthers, setMessageDeliveryOthers] = useState('requests');
    const [spamHandling, setSpamHandling] = useState('spam');

    // Advanced sharing configurations persisted in storage per User
    const [lastSeen, setLastSeen] = useState('everyone');
    const [readReceipts, setReadReceipts] = useState(true);
    const [storyPerms, setStoryPerms] = useState('everyone');
    const [mentionPerms, setMentionPerms] = useState('everyone');
    const [tagPerms, setTagPerms] = useState('everyone');
    const [contentFilter, setContentFilter] = useState('standard');

    // Last Seen Whitelist (Specific Persons)
    const [lastSeenWhitelist, setLastSeenWhitelist] = useState<string[]>([]);
    const [newWhitelistName, setNewWhitelistName] = useState('');
    const [showLastSeenWhitelistModal, setShowLastSeenWhitelistModal] = useState(false);
    const [whitelistSuggestions, setWhitelistSuggestions] = useState<any[]>([]);

    // Close Friends List Manager
    const [closeFriends, setCloseFriends] = useState<string[]>([]);
    const [newFriendName, setNewFriendName] = useState('');
    const [showCloseFriendsModal, setShowCloseFriendsModal] = useState(false);
    const [closeFriendSuggestions, setCloseFriendSuggestions] = useState<any[]>([]);

    // Hidden words array management
    const [hiddenWords, setHiddenWords] = useState<string[]>([]);
    const [newWord, setNewWord] = useState('');

    // List management states
    const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
    const [restrictedUsers, setRestrictedUsers] = useState<string[]>([]);
    const [mutedUsers, setMutedUsers] = useState<string[]>([]);

    // View modal states
    const [showBlockedModal, setShowBlockedModal] = useState(false);
    const [showRestrictedModal, setShowRestrictedModal] = useState(false);
    const [showMutedModal, setShowMutedModal] = useState(false);

    // Unblock confirmation state
    const [unblockConfirmTarget, setUnblockConfirmTarget] = useState<{ id: string; name: string } | null>(null);

    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    const [profileCache, setProfileCache] = useState<Record<string, { avatarUrl?: string | null; displayName?: string | null }>>({});
    const profileCacheRef = useRef<Record<string, { avatarUrl?: string | null; displayName?: string | null }>>({});

    // Fetch profiles of users in close friends, whitelist, restricted and muted lists to display their avatars
    useEffect(() => {
        if (!currentUser?.id) return;
        const fetchProfiles = async () => {
            const supabase = createClient();
            const allUsernames = Array.from(new Set([
                ...closeFriends,
                ...lastSeenWhitelist,
                ...restrictedUsers,
                ...mutedUsers
            ]));
            const missing = allUsernames.filter(username => !profileCacheRef.current[username]);
            if (missing.length === 0) return;

            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('username, avatar_url, display_name')
                    .in('username', missing);
                
                if (data && !error) {
                    const updates: Record<string, { avatarUrl?: string | null; displayName?: string | null }> = {};
                    data.forEach((user: any) => {
                        updates[user.username.toLowerCase()] = {
                            avatarUrl: user.avatar_url,
                            displayName: user.display_name,
                        };
                    });
                    profileCacheRef.current = { ...profileCacheRef.current, ...updates };
                    setProfileCache({ ...profileCacheRef.current });
                }
            } catch (e) {
                console.error('Failed to fetch profiles for cache:', e);
            }
        };

        void fetchProfiles();
    }, [closeFriends, lastSeenWhitelist, restrictedUsers, mutedUsers, currentUser?.id]);

    // Helper to sync user metadata in Supabase Auth and local state
    const syncAuthMetadata = async (metadataKey: string, newValue: any) => {
        if (!currentUser?.id) return;
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.updateUser({
            data: {
                [metadataKey]: newValue
            }
        });
        if (user) {
            setUser({
                ...currentUser,
                metadata: user.user_metadata || {}
            });
        }
    };

    // Load configurations from storage & database
    useEffect(() => {
        if (!currentUser?.id) return;

        const loadSettings = async () => {
            setLoading(true);
            const res = await getUserSettings(currentUser.id);
            if (res.success && res.settings) {
                if (res.settings.messaging_permission) setMessagingPermission(res.settings.messaging_permission);
                if (res.settings.activity_visibility !== undefined) setActivityVisibility(res.settings.activity_visibility);
                
                // Set private profile mode, syncing to Zustand store
                const isPrivate = res.settings.is_private || currentUser.metadata?.is_private || false;
                setSettingPrivateAccount(isPrivate);
            }

            // Fetch advanced configs from auth metadata with local storage fallback
            const metadata = currentUser.metadata || {};
            
            setLastSeen(metadata.last_seen ?? localStorage.getItem(`verlyn_last_seen_${currentUser.id}`) ?? 'everyone');
            setReadReceipts(metadata.read_receipts !== undefined ? metadata.read_receipts : (localStorage.getItem(`verlyn_receipts_${currentUser.id}`) !== 'false'));
            setStoryPerms(metadata.story_permissions ?? localStorage.getItem(`verlyn_story_perms_${currentUser.id}`) ?? 'everyone');
            setMentionPerms(metadata.mention_permissions ?? localStorage.getItem(`verlyn_mention_perms_${currentUser.id}`) ?? 'everyone');
            setTagPerms(metadata.tag_permissions ?? localStorage.getItem(`verlyn_tag_perms_${currentUser.id}`) ?? 'everyone');
            setContentFilter(metadata.content_filter ?? localStorage.getItem(`verlyn_content_filter_${currentUser.id}`) ?? 'standard');
            setMessageDeliveryFollowers(metadata.message_delivery_followers ?? localStorage.getItem(`verlyn_msg_followers_${currentUser.id}`) ?? 'chats');
            setMessageDeliveryOthers(metadata.message_delivery_others ?? localStorage.getItem(`verlyn_msg_others_${currentUser.id}`) ?? 'requests');
            setSpamHandling(metadata.spam_handling ?? localStorage.getItem(`verlyn_spam_handling_${currentUser.id}`) ?? 'spam');

            // Last Seen Whitelist
            if (metadata.last_seen_whitelist) {
                setLastSeenWhitelist(metadata.last_seen_whitelist);
            } else {
                const savedWhitelist = localStorage.getItem(`verlyn_last_seen_whitelist_${currentUser.id}`);
                if (savedWhitelist) {
                    try {
                        setLastSeenWhitelist(JSON.parse(savedWhitelist));
                    } catch (e) {}
                } else {
                    setLastSeenWhitelist([]);
                }
            }

            // Close Friends
            if (metadata.close_friends) {
                setCloseFriends(metadata.close_friends);
            } else {
                const savedFriends = localStorage.getItem(`verlyn_close_friends_${currentUser.id}`);
                if (savedFriends) {
                    try {
                        setCloseFriends(JSON.parse(savedFriends));
                    } catch (e) {}
                } else {
                    setCloseFriends([]);
                }
            }

            // Hidden Words
            if (metadata.hidden_words) {
                setHiddenWords(metadata.hidden_words);
            } else {
                const savedWords = localStorage.getItem(`verlyn_hidden_words_${currentUser.id}`);
                if (savedWords) {
                    try {
                        setHiddenWords(JSON.parse(savedWords));
                    } catch (e) {}
                } else {
                    setHiddenWords([]);
                }
            }

            // Restricted & Muted Lists
            if (metadata.restricted_users) {
                setRestrictedUsers(metadata.restricted_users);
            } else {
                const savedRestricted = localStorage.getItem(`verlyn_restricted_users_${currentUser.id}`);
                setRestrictedUsers(savedRestricted ? JSON.parse(savedRestricted) : []);
            }

            if (metadata.muted_users) {
                setMutedUsers(metadata.muted_users);
            } else {
                const savedMuted = localStorage.getItem(`verlyn_muted_users_${currentUser.id}`);
                setMutedUsers(savedMuted ? JSON.parse(savedMuted) : []);
            }

            setLoading(false);
        };

        loadSettings();
        loadBlockedList();
    }, [currentUser]);

    const loadBlockedList = async () => {
        if (!currentUser?.id) return;
        const res = await getBlockedUsers(currentUser.id);
        if (res.success && res.users) {
            setBlockedUsers(res.users);
        }
    };

    // Debounced search for Last Seen whitelist
    useEffect(() => {
        const query = newWhitelistName.trim();
        if (!query) {
            setWhitelistSuggestions([]);
            return;
        }
        const delayDebounce = setTimeout(async () => {
            try {
                const res = await searchUsersForMention(query);
                if (res.success && res.users) {
                    setWhitelistSuggestions(res.users);
                }
            } catch (e) {
                console.error(e);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [newWhitelistName]);

    // Debounced search for Close Friends list
    useEffect(() => {
        const query = newFriendName.trim();
        if (!query) {
            setCloseFriendSuggestions([]);
            return;
        }
        const delayDebounce = setTimeout(async () => {
            try {
                const res = await searchUsersForMention(query);
                if (res.success && res.users) {
                    setCloseFriendSuggestions(res.users);
                }
            } catch (e) {
                console.error(e);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [newFriendName]);

    const handleUpdate = async (key: string, value: any, setter: any) => {
        if (!currentUser?.id) return;
        setLoading(true);

        const previousValue = setter === setSettingPrivateAccount ? settingPrivateAccount : value;
        setter(value);

        // Save locally
        if (key === 'messaging_permission') localStorage.setItem(`verlyn_privacy_msg_${currentUser.id}`, value);
        if (key === 'activity_visibility') localStorage.setItem(`verlyn_privacy_act_${currentUser.id}`, String(value));
        if (key === 'last_seen') localStorage.setItem(`verlyn_last_seen_${currentUser.id}`, value);
        if (key === 'read_receipts') localStorage.setItem(`verlyn_receipts_${currentUser.id}`, String(value));
        if (key === 'story_permissions') localStorage.setItem(`verlyn_story_perms_${currentUser.id}`, value);
        if (key === 'mention_permissions') localStorage.setItem(`verlyn_mention_perms_${currentUser.id}`, value);
        if (key === 'tag_permissions') localStorage.setItem(`verlyn_tag_perms_${currentUser.id}`, value);
        if (key === 'content_filter') localStorage.setItem(`verlyn_content_filter_${currentUser.id}`, value);
        if (key === 'message_delivery_followers') localStorage.setItem(`verlyn_msg_followers_${currentUser.id}`, value);
        if (key === 'message_delivery_others') localStorage.setItem(`verlyn_msg_others_${currentUser.id}`, value);
        if (key === 'spam_handling') localStorage.setItem(`verlyn_spam_handling_${currentUser.id}`, value);

        // Database Sync for database columns
        let dbSuccess = true;
        if (key === 'messaging_permission' || key === 'activity_visibility' || key === 'is_private' || key === 'last_seen') {
            const payload: any = {};
            if (key === 'messaging_permission') payload.messaging_permission = value;
            if (key === 'activity_visibility') payload.activity_visibility = value;
            if (key === 'is_private') payload.is_private = value;
            if (key === 'last_seen') payload.invisible_mode = (value === 'none' || value === 'specific');
            const res = await updateUserSettings(currentUser.id, payload);
            dbSuccess = !!res.success;
        }

        if (key === 'last_seen' && value === 'specific') {
            setShowLastSeenWhitelistModal(true);
        }

        // Auth Metadata Sync for all settings
        try {
            await syncAuthMetadata(key, value);
        } catch (e) {
            console.error('Failed to sync auth metadata:', e);
        }

        if (dbSuccess) {
            showToast('Privacy configuration synchronized successfully');
        } else {
            setter(previousValue);
            showToast('Sync error with database', 'error');
        }
        setLoading(false);
    };

    // Last Seen Whitelist Mutators
    const handleAddWhitelistUser = async () => {
        if (!newWhitelistName.trim() || !currentUser?.id) return;
        const cleaned = newWhitelistName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (lastSeenWhitelist.includes(cleaned)) {
            showToast('@' + cleaned + ' is already on Last Seen Whitelist', 'error');
            return;
        }
        
        // Verify user existence in database
        setLoading(true);
        const res = await searchUsersForMention(cleaned);
        const exists = res.success && res.users?.some(u => u.username.toLowerCase() === cleaned);
        setLoading(false);

        if (!exists) {
            showToast('@' + cleaned + ' does not exist', 'error');
            return;
        }

        const updated = [...lastSeenWhitelist, cleaned];
        setLastSeenWhitelist(updated);
        localStorage.setItem(`verlyn_last_seen_whitelist_${currentUser.id}`, JSON.stringify(updated));
        await syncAuthMetadata('last_seen_whitelist', updated);
        setNewWhitelistName('');
        showToast(`Added @${cleaned} to Last Seen Whitelist`);
    };

    const handleRemoveWhitelistUser = async (friend: string) => {
        if (!currentUser?.id) return;
        const updated = lastSeenWhitelist.filter(f => f !== friend);
        setLastSeenWhitelist(updated);
        localStorage.setItem(`verlyn_last_seen_whitelist_${currentUser.id}`, JSON.stringify(updated));
        await syncAuthMetadata('last_seen_whitelist', updated);
        showToast(`Removed @${friend} from Last Seen Whitelist`);
    };

    // Close Friends List Mutators
    const handleAddCloseFriend = async () => {
        if (!newFriendName.trim() || !currentUser?.id) return;
        const cleaned = newFriendName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (closeFriends.includes(cleaned)) {
            showToast('@' + cleaned + ' is already on Close Friends List', 'error');
            return;
        }

        // Verify user existence in database
        setLoading(true);
        const res = await searchUsersForMention(cleaned);
        const exists = res.success && res.users?.some(u => u.username.toLowerCase() === cleaned);
        setLoading(false);

        if (!exists) {
            showToast('@' + cleaned + ' does not exist', 'error');
            return;
        }

        const updated = [...closeFriends, cleaned];
        setCloseFriends(updated);
        localStorage.setItem(`verlyn_close_friends_${currentUser.id}`, JSON.stringify(updated));
        await syncAuthMetadata('close_friends', updated);
        setNewFriendName('');
        showToast(`Added @${cleaned} to Close Friends`);
    };

    const handleRemoveCloseFriend = async (friend: string) => {
        if (!currentUser?.id) return;
        const updated = closeFriends.filter(f => f !== friend);
        setCloseFriends(updated);
        localStorage.setItem(`verlyn_close_friends_${currentUser.id}`, JSON.stringify(updated));
        await syncAuthMetadata('close_friends', updated);
        showToast(`Removed @${friend} from Close Friends`);
    };

    // Hidden words mutators
    const handleAddWord = async () => {
        if (!newWord.trim() || !currentUser?.id) return;
        const word = newWord.trim().toLowerCase();
        if (hiddenWords.includes(word)) {
            showToast('Word is already in filter arrays', 'error');
            return;
        }
        const updated = [...hiddenWords, word];
        setHiddenWords(updated);
        localStorage.setItem(`verlyn_hidden_words_${currentUser.id}`, JSON.stringify(updated));
        await syncAuthMetadata('hidden_words', updated);
        setNewWord('');
        showToast(`Added "${word}" to moderation filters`);
    };

    const handleRemoveWord = async (word: string) => {
        if (!currentUser?.id) return;
        const updated = hiddenWords.filter(w => w !== word);
        setHiddenWords(updated);
        localStorage.setItem(`verlyn_hidden_words_${currentUser.id}`, JSON.stringify(updated));
        await syncAuthMetadata('hidden_words', updated);
        showToast(`Removed "${word}" from moderation filters`);
    };

    // Unblocking — requires two-step confirmation
    const handleUnblockRequest = (targetId: string, name: string) => {
        setUnblockConfirmTarget({ id: targetId, name });
    };

    const handleUnblockConfirm = async () => {
        if (!currentUser?.id || !unblockConfirmTarget) return;
        setLoading(true);
        const { id: targetId, name } = unblockConfirmTarget;
        setUnblockConfirmTarget(null);
        const res = await unblockUser(currentUser.id, targetId);
        if (res.success) {
            setBlockedUsers(blockedUsers.filter(u => u.id !== targetId));
            showToast(`Unblocked ${name}`);
        } else {
            showToast('Failed to unblock profile', 'error');
        }
        setLoading(false);
    };

    // Unrestricting
    const handleUnrestrict = async (username: string) => {
        if (!currentUser?.id) return;
        const updated = restrictedUsers.filter(u => u !== username);
        setRestrictedUsers(updated);
        localStorage.setItem(`verlyn_restricted_users_${currentUser.id}`, JSON.stringify(updated));
        await syncAuthMetadata('restricted_users', updated);
        showToast(`Unrestricted @${username}`);
    };

    // Unmuting
    const handleUnmute = async (username: string) => {
        if (!currentUser?.id) return;
        const updated = mutedUsers.filter(u => u !== username);
        setMutedUsers(updated);
        localStorage.setItem(`verlyn_muted_users_${currentUser.id}`, JSON.stringify(updated));
        await syncAuthMetadata('muted_users', updated);
        showToast(`Unmuted @${username}`);
    };

    return (
        <div className="w-full pb-12 animate-fade-in">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-1">Privacy & Sharing</h2>
                <p className="text-[12.5px] text-neutral-500 font-medium">Control who can interact with you, read your message traces, and tag your profile.</p>
            </div>

            {/* Premium, unified 1-column utility workspace */}
            <div className="max-w-2xl space-y-6">
                
                {/* Visibility & Activity */}
                <SettingsSection title="Visibility & Activity">
                    <SettingsRow 
                        title="Private Profile Mode" 
                        desc="Only verified approved followers can view feed updates and posts." 
                        right={
                            <SettingsToggle 
                                checked={settingPrivateAccount} 
                                onChange={(v) => handleUpdate('is_private', v, setSettingPrivateAccount)} 
                                disabled={loading}
                            />
                        }
                    />
                    <SettingsRow 
                        title="Broadcasting Online State" 
                        desc="Allow users you follow to view when you are actively typing." 
                        right={
                            <SettingsToggle 
                                checked={activityVisibility} 
                                onChange={(v) => handleUpdate('activity_visibility', v, setActivityVisibility)} 
                                disabled={loading}
                            />
                        }
                    />
                    <SettingsSelect
                        label="Last Seen Tracking"
                        value={lastSeen}
                        onChange={(v: string) => handleUpdate('last_seen', v, setLastSeen)}
                        disabled={loading}
                        options={PERMISSION_OPTIONS}
                    />
                    <SettingsRow 
                        title="Read Receipts Delivery" 
                        desc="Let senders view when you have read incoming messages." 
                        right={
                            <SettingsToggle 
                                checked={readReceipts} 
                                onChange={(v) => handleUpdate('read_receipts', v, setReadReceipts)} 
                                disabled={loading}
                            />
                        }
                    />
                </SettingsSection>

                {/* Message Controls (Instagram-like) */}
                <SettingsSection title="Message Controls">
                    <SettingsSelect
                        label="Messages from Followers"
                        value={messageDeliveryFollowers}
                        onChange={(v: string) => handleUpdate('message_delivery_followers', v, setMessageDeliveryFollowers)}
                        disabled={loading}
                        options={[
                            { label: 'Deliver directly to Chats (Inbox)', value: 'chats' },
                            { label: 'Deliver to Message Requests', value: 'requests' }
                        ]}
                    />
                    <SettingsSelect
                        label="Messages from Non-Followers (Others)"
                        value={messageDeliveryOthers}
                        onChange={(v: string) => handleUpdate('message_delivery_others', v, setMessageDeliveryOthers)}
                        disabled={loading}
                        options={[
                            { label: 'Deliver to Message Requests', value: 'requests' },
                            { label: 'Don\'t Receive Requests', value: 'none' }
                        ]}
                    />
                    <SettingsSelect
                        label="Spam Filtering Action"
                        value={spamHandling}
                        onChange={(v: string) => handleUpdate('spam_handling', v, setSpamHandling)}
                        disabled={loading}
                        options={[
                            { label: 'Deliver to Spam Folder', value: 'spam' },
                            { label: 'Silently Block/Decline', value: 'block' }
                        ]}
                    />
                </SettingsSection>

                {/* Dynamic Interaction boundaries */}
                <SettingsSection title="Interaction Boundaries">
                    <SettingsSelect
                        label="Story Audience Limits"
                        value={storyPerms}
                        onChange={(v: string) => handleUpdate('story_permissions', v, setStoryPerms)}
                        disabled={loading}
                        options={[
                            { label: 'Everyone', value: 'everyone' },
                            { label: 'Followers Only', value: 'followers' },
                            { label: 'Close Friends Only', value: 'close_friends' },
                            { label: 'No One', value: 'none' }
                        ]}
                    />
                    <SettingsSelect
                        label="Mentions (@) Selector"
                        value={mentionPerms}
                        onChange={(v: string) => handleUpdate('mention_permissions', v, setMentionPerms)}
                        disabled={loading}
                        options={PERMISSION_OPTIONS}
                    />
                    <SettingsSelect
                        label="Tags Selector"
                        value={tagPerms}
                        onChange={(v: string) => handleUpdate('tag_permissions', v, setTagPerms)}
                        disabled={loading}
                        options={PERMISSION_OPTIONS}
                    />
                </SettingsSection>

                {/* Close Friends Section */}
                <SettingsSection title="Close Friends">
                    <SettingsRow 
                        icon={Users}
                        title="Edit Close Friends List" 
                        desc={`Select core followers to view private updates (${closeFriends.length} users listed)`} 
                        variant="navigation"
                        onClick={() => setShowCloseFriendsModal(true)}
                    />
                </SettingsSection>

                {/* Content Moderation */}
                <SettingsSection title="Content Moderation Filters">
                    <SettingsSelect
                        label="Sensitive Media Control"
                        value={contentFilter}
                        onChange={(v: string) => handleUpdate('content_filter', v, setContentFilter)}
                        disabled={loading}
                        options={[
                            { label: 'Standard Filter (Recommended)', value: 'standard' },
                            { label: 'Highly Strict Filters', value: 'less' },
                            { label: 'Unfiltered Access', value: 'more' }
                        ]}
                    />

                    {/* Custom word blocks */}
                    <div className="p-5">
                        <label className="block text-[11px] font-extrabold text-neutral-400 mb-2 uppercase tracking-wider">
                            Moderated Words Filter
                        </label>
                        <p className="text-[12px] text-neutral-500 mb-4 leading-relaxed">
                            Chat streams and threads containing these phrases will filter out instantly.
                        </p>
                        
                        <div className="flex gap-3 mb-4">
                            <input
                                type="text"
                                placeholder="Add restricted word..."
                                value={newWord}
                                onChange={(e) => setNewWord(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
                                className="flex-1 bg-[#141414] border border-white/5 focus:border-white/10 rounded-xl px-4 py-3 text-[13.5px] text-neutral-200 placeholder-neutral-600 focus:outline-none"
                            />
                            <SettingsButton
                                variant="secondary"
                                height={42}
                                onClick={handleAddWord}
                                icon={Plus}
                            >
                                Add
                            </SettingsButton>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {hiddenWords.map(word => (
                                <span 
                                    key={word} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full text-[12px] font-semibold text-neutral-300 transition-all hover:border-white/10"
                                >
                                    {word}
                                    <button type="button" onClick={() => handleRemoveWord(word)} className="text-neutral-500 hover:text-red-400 transition-colors">
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                </SettingsSection>

                {/* Relationship registers */}
                <SettingsSection title="Manage Accounts">
                    <SettingsRow 
                        icon={Lock}
                        title="Blocked Accounts" 
                        desc={`Manage the ${blockedUsers.length} accounts you have blocked.`}
                        variant="navigation"
                        onClick={() => setShowBlockedModal(true)}
                    />
                    <SettingsRow 
                        icon={UserCheck}
                        title="Restricted Accounts" 
                        desc={`Manage the ${restrictedUsers.length} accounts you have restricted.`}
                        variant="navigation"
                        onClick={() => setShowRestrictedModal(true)}
                    />
                    <SettingsRow 
                        icon={VolumeX}
                        title="Muted Accounts" 
                        desc={`Manage the ${mutedUsers.length} accounts you have muted.`}
                        variant="navigation"
                        onClick={() => setShowMutedModal(true)}
                    />
                </SettingsSection>

            </div>

            {/* Close Friends manager modal */}
            <ModalEngine
                isOpen={showCloseFriendsModal}
                onClose={() => setShowCloseFriendsModal(false)}
                title="Close Friends Selector Circle"
            >
                <div className="space-y-4">
                    <p className="text-[12.5px] text-neutral-400 leading-relaxed">
                        Control who can view your stories. Add custom members to your Close Friends list.
                    </p>

                    <div className="flex gap-3">
                        <input
                            type="text"
                            placeholder="Search follower name... e.g. shinichiro"
                            value={newFriendName}
                            onChange={(e) => setNewFriendName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCloseFriend()}
                            className="flex-1 bg-[#141414] border border-white/5 focus:border-white/10 rounded-xl px-4 py-3 text-[13.5px] text-neutral-200 placeholder-neutral-600 focus:outline-none"
                        />
                        <SettingsButton
                            variant="primary"
                            height={42}
                            onClick={handleAddCloseFriend}
                        >
                            Add
                        </SettingsButton>
                    </div>

                    {closeFriendSuggestions.length > 0 && (
                        <div className="bg-[#141414] border border-white/5 rounded-xl divide-y divide-white/5 overflow-hidden max-h-[200px] overflow-y-auto inner-scroll">
                            {closeFriendSuggestions.map(user => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={async () => {
                                        const username = user.username.toLowerCase();
                                        if (closeFriends.includes(username)) {
                                            showToast('@' + username + ' is already on Close Friends List', 'error');
                                        } else {
                                            const updated = [...closeFriends, username];
                                            setCloseFriends(updated);
                                            localStorage.setItem(`verlyn_close_friends_${currentUser?.id}`, JSON.stringify(updated));
                                            await syncAuthMetadata('close_friends', updated);
                                            showToast(`Added @${username} to Close Friends`);
                                        }
                                        setNewFriendName('');
                                        setCloseFriendSuggestions([]);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] text-left transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center font-bold text-neutral-400 text-[12px] uppercase">
                                        {user.avatar_url ? (
                                            <img src={getAvatarUrl(user.username, user.avatar_url)} alt={user.username} className="w-full h-full object-cover" />
                                        ) : user.username[0]}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[13px] font-bold text-white leading-none">@{user.username}</span>
                                        {user.display_name && (
                                            <span className="text-[11px] text-neutral-500 mt-1 truncate">{user.display_name}</span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="space-y-2 max-h-[350px] overflow-y-auto inner-scroll pr-1">
                        {closeFriends.length === 0 ? (
                            <div className="p-6 text-center text-[12px] text-neutral-600">
                                Close Friends Circle is empty.
                            </div>
                        ) : (
                            closeFriends.map(friend => {
                                const profile = profileCache[friend];
                                const hasAvatar = !!profile?.avatarUrl;
                                return (
                                    <div key={friend} className="flex items-center justify-between p-3 bg-neutral-900 border border-white/5 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center font-bold text-neutral-400 text-[12px] uppercase">
                                                {hasAvatar ? (
                                                    <img src={getAvatarUrl(friend, profile.avatarUrl)} alt={friend} className="w-full h-full object-cover" />
                                                ) : friend[0]}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[13px] font-bold text-white leading-none">@{friend}</span>
                                                {profile?.displayName && (
                                                    <span className="text-[11px] text-neutral-500 mt-1 truncate">{profile.displayName}</span>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveCloseFriend(friend)}
                                            className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 rounded-lg transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <SettingsButton
                        variant="secondary"
                        height={42}
                        onClick={() => setShowCloseFriendsModal(false)}
                        className="w-full"
                    >
                        Save & Close
                    </SettingsButton>
                </div>
            </ModalEngine>

            {/* Whitelisted (Specific Persons) Activity status modal */}
            <ModalEngine
                isOpen={showLastSeenWhitelistModal}
                onClose={() => setShowLastSeenWhitelistModal(false)}
                title="Activity Status Whitelist"
            >
                <div className="space-y-4">
                    <p className="text-[12.5px] text-neutral-400 leading-relaxed">
                        Select specific users who are allowed to see your activity status (Online/Last Seen). All other users will see you as offline.
                    </p>

                    <div className="flex gap-3">
                        <input
                            type="text"
                            placeholder="Search username... e.g. s"
                            value={newWhitelistName}
                            onChange={(e) => setNewWhitelistName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddWhitelistUser()}
                            className="flex-1 bg-[#141414] border border-white/5 focus:border-white/10 rounded-xl px-4 py-3 text-[13.5px] text-neutral-200 placeholder-neutral-600 focus:outline-none"
                        />
                        <SettingsButton
                            variant="primary"
                            height={42}
                            onClick={handleAddWhitelistUser}
                        >
                            Add
                        </SettingsButton>
                    </div>

                    {whitelistSuggestions.length > 0 && (
                        <div className="bg-[#141414] border border-white/5 rounded-xl divide-y divide-white/5 overflow-hidden max-h-[200px] overflow-y-auto inner-scroll">
                            {whitelistSuggestions.map(user => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={async () => {
                                        const username = user.username.toLowerCase();
                                        if (lastSeenWhitelist.includes(username)) {
                                            showToast('@' + username + ' is already on Last Seen Whitelist', 'error');
                                        } else {
                                            const updated = [...lastSeenWhitelist, username];
                                            setLastSeenWhitelist(updated);
                                            localStorage.setItem(`verlyn_last_seen_whitelist_${currentUser?.id}`, JSON.stringify(updated));
                                            await syncAuthMetadata('last_seen_whitelist', updated);
                                            showToast(`Added @${username} to Last Seen Whitelist`);
                                        }
                                        setNewWhitelistName('');
                                        setWhitelistSuggestions([]);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] text-left transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center font-bold text-neutral-400 text-[12px] uppercase">
                                        {user.avatar_url ? (
                                            <img src={getAvatarUrl(user.username, user.avatar_url)} alt={user.username} className="w-full h-full object-cover" />
                                        ) : user.username[0]}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[13px] font-bold text-white leading-none">@{user.username}</span>
                                        {user.display_name && (
                                            <span className="text-[11px] text-neutral-500 mt-1 truncate">{user.display_name}</span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="space-y-2 max-h-[350px] overflow-y-auto inner-scroll pr-1">
                        {lastSeenWhitelist.length === 0 ? (
                            <div className="p-6 text-center text-[12px] text-neutral-600">
                                Whitelist is empty. Nobody can see your status.
                            </div>
                        ) : (
                            lastSeenWhitelist.map(friend => {
                                const profile = profileCache[friend];
                                const hasAvatar = !!profile?.avatarUrl;
                                return (
                                    <div key={friend} className="flex items-center justify-between p-3 bg-neutral-900 border border-white/5 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center font-bold text-neutral-400 text-[12px] uppercase">
                                                {hasAvatar ? (
                                                    <img src={getAvatarUrl(friend, profile.avatarUrl)} alt={friend} className="w-full h-full object-cover" />
                                                ) : friend[0]}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[13px] font-bold text-white leading-none">@{friend}</span>
                                                {profile?.displayName && (
                                                    <span className="text-[11px] text-neutral-500 mt-1 truncate">{profile.displayName}</span>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveWhitelistUser(friend)}
                                            className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 rounded-lg transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <SettingsButton
                        variant="secondary"
                        height={42}
                        onClick={() => setShowLastSeenWhitelistModal(false)}
                        className="w-full"
                    >
                        Save & Close
                    </SettingsButton>
                </div>
            </ModalEngine>

            {/* Blocked Modal */}
            <ModalEngine
                isOpen={showBlockedModal}
                onClose={() => setShowBlockedModal(false)}
                title="Blocked Accounts"
            >
                {blockedUsers.length === 0 ? (
                    <div className="py-8 text-center text-neutral-500 text-[12.5px] leading-relaxed">
                        No blocked accounts.
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto inner-scroll pr-1">
                        {blockedUsers.map(user => (
                            <div key={user.id} className="flex items-center justify-between p-3 bg-[#0E0E0E] border border-white/5 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-900 border border-white/5">
                                        <img src={getAvatarUrl(user.username, user.avatar_url)} alt="Blocked Avatar" className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <span className="text-[13px] font-bold text-white block leading-none">{user.display_name}</span>
                                        <span className="text-[11px] text-neutral-500 mt-1 block">@{user.username}</span>
                                    </div>
                                </div>
                                <SettingsButton
                                    variant="danger"
                                    height={36}
                                    onClick={() => handleUnblockRequest(user.id, user.display_name)}
                                    disabled={loading}
                                >
                                    Unblock
                                </SettingsButton>
                            </div>
                        ))}
                    </div>
                )}
            </ModalEngine>

            {/* Restricted Modal */}
            <ModalEngine
                isOpen={showRestrictedModal}
                onClose={() => setShowRestrictedModal(false)}
                title="Restricted Accounts"
            >
                {restrictedUsers.length === 0 ? (
                    <div className="py-8 text-center text-neutral-500 text-[12.5px]">
                        No restricted accounts active.
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto inner-scroll pr-1">
                        {restrictedUsers.map(username => {
                            const profile = profileCache[username];
                            const hasAvatar = !!profile?.avatarUrl;
                            return (
                                <div key={username} className="flex items-center justify-between p-3 bg-[#0E0E0E] border border-white/5 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center font-bold text-neutral-400 text-[12px] uppercase shrink-0">
                                            {hasAvatar ? (
                                                <img src={getAvatarUrl(username, profile.avatarUrl)} alt={username} className="w-full h-full object-cover" />
                                            ) : username[0]}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[13px] font-bold text-white leading-none">@{username}</span>
                                            {profile?.displayName && (
                                                <span className="text-[11px] text-neutral-500 mt-1 truncate">{profile.displayName}</span>
                                            )}
                                        </div>
                                    </div>
                                    <SettingsButton
                                        variant="secondary"
                                        height={36}
                                        onClick={() => handleUnrestrict(username)}
                                    >
                                        Unrestrict
                                    </SettingsButton>
                                </div>
                            );
                        })}
                    </div>
                )}
            </ModalEngine>

            {/* Muted Modal */}
            <ModalEngine
                isOpen={showMutedModal}
                onClose={() => setShowMutedModal(false)}
                title="Muted Accounts"
            >
                {mutedUsers.length === 0 ? (
                    <div className="py-8 text-center text-neutral-500 text-[12.5px]">
                        No muted accounts.
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto inner-scroll pr-1">
                        {mutedUsers.map(username => {
                            const profile = profileCache[username];
                            const hasAvatar = !!profile?.avatarUrl;
                            return (
                                <div key={username} className="flex items-center justify-between p-3 bg-[#0E0E0E] border border-white/5 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center font-bold text-neutral-400 text-[12px] uppercase shrink-0">
                                            {hasAvatar ? (
                                                <img src={getAvatarUrl(username, profile.avatarUrl)} alt={username} className="w-full h-full object-cover" />
                                            ) : username[0]}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[13px] font-bold text-white leading-none">@{username}</span>
                                            {profile?.displayName && (
                                                <span className="text-[11px] text-neutral-500 mt-1 truncate">{profile.displayName}</span>
                                            )}
                                        </div>
                                    </div>
                                    <SettingsButton
                                        variant="secondary"
                                        height={36}
                                        onClick={() => handleUnmute(username)}
                                    >
                                        Unmute
                                    </SettingsButton>
                                </div>
                            );
                        })}
                    </div>
                )}
            </ModalEngine>

            <Toast show={toast.show} message={toast.message} type={toast.type} />

            {/* Unblock Confirmation Modal */}
            {unblockConfirmTarget && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#111113] border border-white/[0.07] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
                        <h3 className="text-base font-bold text-white mb-2">Unblock {unblockConfirmTarget.name}?</h3>
                        <p className="text-[12.5px] text-neutral-400 leading-relaxed mb-5">
                            They will be able to see your profile, posts, and stories again.
                            You can block them again at any time.
                        </p>
                        <div className="flex gap-3">
                            <button
                                className="flex-1 h-10 rounded-xl border border-white/10 text-[13px] font-semibold text-neutral-300 bg-white/5 hover:bg-white/10 transition-colors"
                                onClick={() => setUnblockConfirmTarget(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="flex-1 h-10 rounded-xl bg-red-500/90 hover:bg-red-500 text-[13px] font-bold text-white transition-colors"
                                onClick={handleUnblockConfirm}
                                disabled={loading}
                            >
                                Unblock
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
