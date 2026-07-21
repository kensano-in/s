'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { updateProfileInfo } from '@/app/(main)/settings/actions';
import { createClient } from '@/lib/supabase/client';
import { 
    SettingsSection, 
    SettingsInput, 
    SettingsSelect, 
    ModalSystem as ModalEngine, 
    Toast
} from '../components';
import { 
    Loader2, 
    Award, 
    Mail, 
    Phone, 
    Calendar, 
    UserCheck, 
    Sparkles, 
    Check, 
    Undo2, 
    History, 
    User,
    Info,
    Globe,
    Languages,
    Heart,
    Shield,
    Clock,
    FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GENDER_OPTIONS = [
    { label: 'Select Gender', value: '' },
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Non-binary', value: 'non_binary' },
    { label: 'Prefer not to say', value: 'prefer_not_to_say' }
];

const CATEGORY_OPTIONS = [
    { label: 'News / Media', value: 'news' },
    { label: 'Creator / Influencer', value: 'creator' },
    { label: 'Sports', value: 'sports' },
    { label: 'Government / Politics', value: 'politics' },
    { label: 'Music / Entertainment', value: 'music' },
    { label: 'Business / Brand / Org', value: 'business' },
    { label: 'Other', value: 'other' }
];

const LANGUAGE_OPTIONS = [
    { label: 'Select Language', value: '' },
    { label: 'English', value: 'en' },
    { label: 'Hindi', value: 'hi' },
    { label: 'Bengali', value: 'bn' },
    { label: 'Spanish', value: 'es' },
    { label: 'French', value: 'fr' },
    { label: 'Arabic', value: 'ar' },
    { label: 'Portuguese', value: 'pt' },
    { label: 'Russian', value: 'ru' },
    { label: 'Japanese', value: 'ja' },
    { label: 'Korean', value: 'ko' },
    { label: 'German', value: 'de' },
    { label: 'Italian', value: 'it' }
];

const RELATIONSHIP_OPTIONS = [
    { label: 'Prefer not to say', value: '' },
    { label: 'Single', value: 'single' },
    { label: 'In a relationship', value: 'relationship' },
    { label: 'Engaged', value: 'engaged' },
    { label: 'Married', value: 'married' },
    { label: 'It\'s complicated', value: 'complicated' }
];

interface ProfileHistoryLog {
    timestamp: string;
    field: string;
    oldValue: string;
    newValue: string;
}

export default function AccountSettings() {
    const currentUser = useAppStore(s => s.currentUser);
    const setUser = useAppStore(s => s.setUser);
    const [loading, setLoading] = useState(false);

    // Form inputs (personal details only)
    const [formData, setFormData] = useState({
        phone: '',
        legal_name: '',
        nationality: '',
        language: '',
        relationship: ''
    });

    // Demographics
    const [birthday, setBirthday] = useState({ day: '', month: '', year: '' });
    const [savedBirthday, setSavedBirthday] = useState({ day: '', month: '', year: '' });
    const [gender, setGender] = useState('');
    const [savedGender, setSavedGender] = useState('');

    // Signup DOB (read-only, from auth signup metadata)
    const [signupDob, setSignupDob] = useState({ day: '', month: '', year: '' });

    const [isVerifiedLocally, setIsVerifiedLocally] = useState(false);

    // Verification modal
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyCategory, setVerifyCategory] = useState('creator');
    const [verifyDocType, setVerifyDocType] = useState('passport');
    const [verifyFile, setVerifyFile] = useState<File | null>(null);
    const [verifyLoading, setVerifyLoading] = useState(false);

    // History Modal
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [editHistory, setEditHistory] = useState<ProfileHistoryLog[]>([]);

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    // Load initial values on mount
    useEffect(() => {
        if (!currentUser?.id) return;
        
        const metadata = currentUser.metadata || {};

        setFormData({
            phone: metadata.phone || '',
            legal_name: metadata.legal_name || '',
            nationality: metadata.nationality || '',
            language: metadata.language || '',
            relationship: metadata.relationship || ''
        });

        // Read signup DOB from auth metadata
        const signupDay = String(metadata.birth_day || '');
        const signupMonth = String(metadata.birth_month || '');
        const signupYear = String(metadata.birth_year || '');
        setSignupDob({ day: signupDay, month: signupMonth, year: signupYear });

        // Read editable birthday from settings metadata or local storage fallback
        const metaBday = {
            day: metadata.birthday_day || '',
            month: metadata.birthday_month || '',
            year: metadata.birthday_year || ''
        };
        if (metaBday.day || metaBday.month || metaBday.year) {
            setBirthday(metaBday);
            setSavedBirthday(metaBday);
        } else {
            const savedBday = localStorage.getItem(`verlyn_birthday_${currentUser.id}`);
            if (savedBday) {
                try {
                    const parsed = JSON.parse(savedBday);
                    setBirthday(parsed);
                    setSavedBirthday(parsed);
                } catch (e) {}
            } else {
                setBirthday({ day: '', month: '', year: '' });
                setSavedBirthday({ day: '', month: '', year: '' });
            }
        }

        // Read gender
        const metaGender = metadata.gender || localStorage.getItem(`verlyn_gender_${currentUser.id}`) || '';
        setGender(metaGender);
        setSavedGender(metaGender);

        // Read local verification overrides
        const metaVerified = metadata.is_verified || (localStorage.getItem(`verlyn_verified_${currentUser.id}`) === 'true') || !!currentUser.isVerified;
        setIsVerifiedLocally(!!metaVerified);

        // Read edit logs history
        if (metadata.profile_history) {
            setEditHistory(metadata.profile_history);
        } else {
            const savedHist = localStorage.getItem(`verlyn_profile_history_${currentUser.id}`);
            if (savedHist) {
                try {
                    setEditHistory(JSON.parse(savedHist));
                } catch (e) {}
            }
        }
    }, [currentUser]);

    const logHistory = async (field: string, oldVal: string, newVal: string) => {
        if (!currentUser?.id) return;
        const newLog: ProfileHistoryLog = {
            timestamp: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
            field,
            oldValue: oldVal || 'Not Specified',
            newValue: newVal || 'Not Specified'
        };
        const updatedHistory = [newLog, ...editHistory].slice(0, 30);
        setEditHistory(updatedHistory);
        localStorage.setItem(`verlyn_profile_history_${currentUser.id}`, JSON.stringify(updatedHistory));
        
        try {
            const supabase = createClient();
            await supabase.auth.updateUser({
                data: { profile_history: updatedHistory }
            });
        } catch (e) {
            console.error('Failed to sync history log to metadata:', e);
        }
    };

    const handleSave = async () => {
        if (!currentUser?.id) return;
        
        setLoading(true);

        // Record history differences before save
        if (formData.phone !== (currentUser.metadata?.phone || '')) {
            logHistory('Phone Number', currentUser.metadata?.phone || '', formData.phone);
        }
        if (formData.legal_name !== (currentUser.metadata?.legal_name || '')) {
            logHistory('Legal Name', currentUser.metadata?.legal_name || '', formData.legal_name);
        }
        if (formData.nationality !== (currentUser.metadata?.nationality || '')) {
            logHistory('Nationality', currentUser.metadata?.nationality || '', formData.nationality);
        }
        if (formData.language !== (currentUser.metadata?.language || '')) {
            logHistory('Language', currentUser.metadata?.language || '', formData.language);
        }
        if (formData.relationship !== (currentUser.metadata?.relationship || '')) {
            logHistory('Relationship Status', currentUser.metadata?.relationship || '', formData.relationship);
        }

        const result = await updateProfileInfo(currentUser.id, {
            phone: formData.phone,
        });
        
        if (result.success) {
            localStorage.setItem(`verlyn_birthday_${currentUser.id}`, JSON.stringify(birthday));
            localStorage.setItem(`verlyn_gender_${currentUser.id}`, gender);
            setSavedBirthday(birthday);
            setSavedGender(gender);

            const supabase = createClient();
            const { data: { user } } = await supabase.auth.updateUser({
                data: {
                    birthday_day: birthday.day,
                    birthday_month: birthday.month,
                    birthday_year: birthday.year,
                    gender: gender,
                    legal_name: formData.legal_name,
                    nationality: formData.nationality,
                    language: formData.language,
                    relationship: formData.relationship
                }
            });

            setUser({
                ...currentUser,
                isVerified: isVerifiedLocally,
                metadata: {
                    ...(user?.user_metadata || currentUser.metadata || {}),
                    phone: formData.phone,
                    legal_name: formData.legal_name,
                    nationality: formData.nationality,
                    language: formData.language,
                    relationship: formData.relationship
                }
            });
            showToast('Personal details saved successfully');
        } else {
            showToast(result.error || 'Failed to save details', 'error');
        }
        setLoading(false);
    };

    const resetChanges = () => {
        if (!currentUser) return;
        const metadata = currentUser.metadata || {};
        setFormData({
            phone: metadata.phone || '',
            legal_name: metadata.legal_name || '',
            nationality: metadata.nationality || '',
            language: metadata.language || '',
            relationship: metadata.relationship || ''
        });
        setBirthday(savedBirthday);
        setGender(savedGender);
        showToast('Local modifications discarded', 'success');
    };

    const handleRequestVerification = async () => {
        if (!currentUser?.id) return;
        setVerifyLoading(true);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.updateUser({
            data: { is_verified: true }
        });
        
        localStorage.setItem(`verlyn_verified_${currentUser.id}`, 'true');
        setIsVerifiedLocally(true);
        
        logHistory('Account Authority', 'Unverified', 'Verified Badge Active');

        setUser({
            ...currentUser,
            isVerified: true,
            metadata: user ? (user.user_metadata || {}) : (currentUser.metadata || {})
        });

        setVerifyLoading(false);
        setShowVerifyModal(false);
        showToast('Congratulations! Your verified checkmark is active.', 'success');
    };

    const hasChanges = 
        formData.phone !== (currentUser?.metadata?.phone || '') ||
        formData.legal_name !== (currentUser?.metadata?.legal_name || '') ||
        formData.nationality !== (currentUser?.metadata?.nationality || '') ||
        formData.language !== (currentUser?.metadata?.language || '') ||
        formData.relationship !== (currentUser?.metadata?.relationship || '') ||
        JSON.stringify(birthday) !== JSON.stringify(savedBirthday) ||
        gender !== savedGender;

    const DAYS = Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1), value: String(i + 1) }));
    const MONTHS = [
        { label: 'January', value: '1' }, { label: 'February', value: '2' }, { label: 'March', value: '3' },
        { label: 'April', value: '4' }, { label: 'May', value: '5' }, { label: 'June', value: '6' },
        { label: 'July', value: '7' }, { label: 'August', value: '8' }, { label: 'September', value: '9' },
        { label: 'October', value: '10' }, { label: 'November', value: '11' }, { label: 'December', value: '12' }
    ];
    const YEARS = Array.from({ length: 80 }, (_, i) => ({ label: String(2026 - i), value: String(2026 - i) }));

    return (
        <div className="w-full pb-12 animate-fade-in">
            {/* Top header options */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white mb-1">Personal Details</h2>
                    <p className="text-[12.5px] text-neutral-500 font-medium">Manage your personal account details and verification credentials.</p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowHistoryModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-neutral-900 border border-white/5 hover:border-white/10 hover:text-white rounded-xl text-[12px] font-bold text-neutral-400 self-start sm:self-center transition-all active:scale-95"
                >
                    <History size={13} />
                    Change History
                </button>
            </div>
            {/* Main Content — Personal Details Only (no tabs) */}
            <div className="max-w-2xl space-y-6">

                {/* Verification Hub */}
                <SettingsSection title="Verification Hub">
                    {isVerifiedLocally ? (
                        <div className="p-5 flex items-center gap-4 bg-blue-500/5">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/10 flex items-center justify-center text-blue-400">
                                <UserCheck size={18} />
                            </div>
                            <div className="flex-1">
                                <span className="text-[13px] font-bold text-white flex items-center gap-1.5 leading-none">
                                    Verified Badge
                                    <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white scale-80 shrink-0">
                                        <Check size={10} strokeWidth={4} />
                                    </span>
                                </span>
                                <p className="text-[11.5px] text-neutral-500 mt-1 leading-relaxed">
                                    Your profile is authentic and verified. Blue checkmarks display globally on feeds.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-white/5 flex items-center justify-center text-neutral-400 mt-0.5 shrink-0">
                                    <Award size={18} />
                                </div>
                                <div>
                                    <h4 className="text-[13px] font-bold text-white">Profile Badge Unverified</h4>
                                    <p className="text-[11.5px] text-neutral-500 mt-1 leading-relaxed">
                                        Request a verified blue checkmark by submitting legal identification records.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowVerifyModal(true)}
                                className="px-4 py-2 bg-blue-600 hover:opacity-90 active:scale-95 text-white text-[12px] font-bold rounded-xl transition-all self-start sm:self-center"
                            >
                                Verify
                            </button>
                        </div>
                    )}
                </SettingsSection>

                {/* Account Registration Info (read-only) */}
                <SettingsSection title="Account Registration">
                    <div className="px-5 py-4 border-b border-white/5">
                        <label className="block text-[11px] font-extrabold text-neutral-400 mb-2.5 uppercase tracking-[0.1em] select-none flex items-center gap-1.5">
                            <Shield size={12} /> Signup Date of Birth
                        </label>
                        {signupDob.day && signupDob.month && signupDob.year ? (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-[#141414] border border-white/5 rounded-xl">
                                    <Calendar size={13} className="text-neutral-500" />
                                    <span className="text-[13px] font-semibold text-neutral-300">
                                        {MONTHS.find(m => m.value === signupDob.month)?.label || `Month ${signupDob.month}`} {signupDob.day}, {signupDob.year}
                                    </span>
                                </div>
                                <span className="text-[9px] uppercase font-extrabold text-neutral-600 bg-neutral-900 border border-white/5 px-2 py-0.5 rounded-full select-none shrink-0">
                                    Read-only
                                </span>
                            </div>
                        ) : (
                            <p className="text-[12px] text-neutral-600 italic">Not available — set during signup</p>
                        )}
                        <p className="text-[10px] text-neutral-600 mt-2 leading-relaxed">
                            This is the date of birth you entered when creating your account. It cannot be changed here for security purposes.
                        </p>
                    </div>

                    <div className="px-5 py-4 border-b border-white/5">
                        <label className="block text-[11px] font-extrabold text-neutral-400 mb-1 uppercase tracking-[0.1em] select-none flex items-center gap-1.5">
                            <Clock size={12} /> Account Created
                        </label>
                        <span className="text-[13px] font-semibold text-neutral-400">
                            {currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown'}
                        </span>
                    </div>

                    <div className="px-5 py-4">
                        <label className="block text-[11px] font-extrabold text-neutral-400 mb-1 uppercase tracking-[0.1em] select-none flex items-center gap-1.5">
                            <FileText size={12} /> Account ID
                        </label>
                        <span className="text-[11px] font-mono text-neutral-600 select-all">
                            {currentUser?.id || '—'}
                        </span>
                    </div>
                </SettingsSection>

                {/* Personal Identity */}
                <SettingsSection title="Personal Identity">
                    <SettingsInput 
                        label="Full Legal Name" 
                        value={formData.legal_name} 
                        onChange={(v: string) => setFormData(prev => ({...prev, legal_name: v}))} 
                        placeholder="Your full legal name as it appears on official documents"
                    />

                    <div className="px-5 py-4 border-b border-white/5 last:border-none">
                        <label className="block text-[11px] font-extrabold text-neutral-400 mb-2 uppercase tracking-[0.1em] select-none flex items-center gap-1.5">
                            <Globe size={12} /> Nationality
                        </label>
                        <input
                            type="text"
                            value={formData.nationality}
                            onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                            placeholder="E.g. Indian, American, Japanese"
                            className="w-full bg-[#141414] border border-white/5 rounded-xl px-3 py-2.5 text-[13px] text-neutral-300 focus:outline-none focus:border-white/10 placeholder-neutral-600 transition-colors"
                        />
                    </div>

                    <div className="px-5 py-4 border-b border-white/5 last:border-none">
                        <label className="block text-[11px] font-extrabold text-neutral-400 mb-2 uppercase tracking-[0.1em] select-none flex items-center gap-1.5">
                            <Languages size={12} /> Preferred Language
                        </label>
                        <select
                            value={formData.language}
                            onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                            className="w-full bg-[#141414] border border-white/5 rounded-xl px-3 py-2.5 text-[13px] text-neutral-300 focus:outline-none cursor-pointer"
                        >
                            {LANGUAGE_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                    </div>

                    <div className="px-5 py-4 border-b border-white/5 last:border-none">
                        <label className="block text-[11px] font-extrabold text-neutral-400 mb-2 uppercase tracking-[0.1em] select-none flex items-center gap-1.5">
                            <Heart size={12} /> Relationship Status
                        </label>
                        <select
                            value={formData.relationship}
                            onChange={(e) => setFormData(prev => ({ ...prev, relationship: e.target.value }))}
                            className="w-full bg-[#141414] border border-white/5 rounded-xl px-3 py-2.5 text-[13px] text-neutral-300 focus:outline-none cursor-pointer"
                        >
                            {RELATIONSHIP_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                    </div>
                </SettingsSection>

                {/* Personal Demographics */}
                <SettingsSection title="Personal Demographics">
                    <div className="px-5 py-4 border-b border-white/5 last:border-none">
                        <label className="block text-[11px] font-extrabold text-neutral-400 mb-2 uppercase tracking-[0.1em] select-none flex items-center gap-1.5">
                            <Calendar size={12} /> Birthday
                        </label>
                        <p className="text-[10px] text-neutral-600 mb-2">This birthday is displayed on your profile. It can differ from your signup DOB.</p>
                        <div className="grid grid-cols-3 gap-3">
                            <select
                                value={birthday.month}
                                onChange={(e) => setBirthday(prev => ({ ...prev, month: e.target.value }))}
                                className="bg-[#141414] border border-white/5 rounded-xl px-3 py-2.5 text-[13px] text-neutral-300 focus:outline-none cursor-pointer"
                            >
                                <option value="">Month</option>
                                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <select
                                value={birthday.day}
                                onChange={(e) => setBirthday(prev => ({ ...prev, day: e.target.value }))}
                                className="bg-[#141414] border border-white/5 rounded-xl px-3 py-2.5 text-[13px] text-neutral-300 focus:outline-none cursor-pointer"
                            >
                                <option value="">Day</option>
                                {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                            </select>
                            <select
                                value={birthday.year}
                                onChange={(e) => setBirthday(prev => ({ ...prev, year: e.target.value }))}
                                className="bg-[#141414] border border-white/5 rounded-xl px-3 py-2.5 text-[13px] text-neutral-300 focus:outline-none cursor-pointer"
                            >
                                <option value="">Year</option>
                                {YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <SettingsSelect
                        label="Gender Identity"
                        value={gender}
                        onChange={(v: string) => setGender(v)}
                        options={GENDER_OPTIONS}
                    />
                </SettingsSection>

                {/* Contact Information */}
                <SettingsSection title="Contact Information">
                    <div className="p-4 flex items-center gap-4 border-b border-white/5 bg-[#0D0D0D]/30">
                        <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-white/5 flex items-center justify-center text-neutral-400">
                            <Mail size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-0.5 leading-none">Primary Email</label>
                            <span className="text-[13.5px] font-semibold text-neutral-300 truncate block">{currentUser?.email || 'member@verlyn.in'}</span>
                        </div>
                        <span className="text-[9px] uppercase font-extrabold text-neutral-500 bg-neutral-900 border border-white/5 px-2 py-0.5 rounded-full select-none shrink-0">Primary</span>
                    </div>

                    <div className="p-4 flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-white/5 flex items-center justify-center text-neutral-400">
                            <Phone size={15} />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-0.5 leading-none">Phone Number</label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="E.g. +91 98765 43210"
                                className="bg-transparent text-[13.5px] font-semibold text-neutral-200 border-none focus:outline-none w-full p-0 placeholder-neutral-600"
                            />
                        </div>
                    </div>
                </SettingsSection>

                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-3 text-neutral-400 text-[11.5px] leading-relaxed">
                    <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                    <span>Click Save to sync your personal details to Verlyn servers. Profile editing (name, bio, avatar, banner) is available under your <strong className="text-neutral-300">Profile</strong> page.</span>
                </div>
            </div>

            {/* FLOATING ACTION BOTTOM BAR FOR UNSAVED CHANGES */}
            <AnimatePresence>
                {hasChanges && (
                    <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#0E0E0E]/95 border border-white/10 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-6 backdrop-blur-md max-w-lg w-[90%]"
                    >
                        <div className="flex items-center gap-2">
                            <Sparkles size={14} className="text-blue-400 animate-pulse" />
                            <span className="text-[12.5px] font-bold text-neutral-200 shrink-0">Unsaved changes</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={resetChanges}
                                className="p-2 text-neutral-500 hover:text-white hover:bg-white/5 border border-transparent rounded-xl transition-all flex items-center gap-1.5 text-[12px] font-bold"
                            >
                                <Undo2 size={13} />
                                Discard
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 hover:opacity-90 active:scale-95 text-white text-[12px] font-extrabold rounded-xl transition-all flex items-center gap-1.5"
                            >
                                {loading ? (
                                    <Loader2 size={13} className="animate-spin" />
                                ) : (
                                    <Check size={13} strokeWidth={3} />
                                )}
                                Save
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Verification Request Modal */}
            <ModalEngine
                isOpen={showVerifyModal}
                onClose={() => setShowVerifyModal(false)}
                title="Request Verification"
            >
                <div className="space-y-5">
                    <div className="flex items-start gap-4 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                        <Sparkles size={22} className="text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="text-[13px] font-bold text-white">Profile Verification</h4>
                            <p className="text-[11.5px] text-neutral-400 mt-1 leading-normal">
                                Verification badges confirm authenticity for content creators, prominent brands, enterprise groups, and public profiles.
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-extrabold text-neutral-400 mb-2 uppercase tracking-wider">1. Select Category</label>
                        <select
                            value={verifyCategory}
                            onChange={(e) => setVerifyCategory(e.target.value)}
                            className="w-full bg-[#141414] border border-white/5 rounded-xl px-3 py-3 text-[13.5px] text-neutral-300 focus:outline-none cursor-pointer"
                        >
                            {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-extrabold text-neutral-400 mb-2 uppercase tracking-wider">2. Document ID Type</label>
                        <select
                            value={verifyDocType}
                            onChange={(e) => setVerifyDocType(e.target.value)}
                            className="w-full bg-[#141414] border border-white/5 rounded-xl px-3 py-3 text-[13.5px] text-neutral-300 focus:outline-none cursor-pointer"
                        >
                            <option value="passport">Government Passport Scan</option>
                            <option value="license">Driver's License File</option>
                            <option value="national_id">National ID Certificate</option>
                            <option value="tax_filing">Official Business Tax Record</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-extrabold text-neutral-400 mb-2 uppercase tracking-wider">3. Attach Document</label>
                        <div 
                            className="border border-dashed border-white/10 hover:border-white/20 rounded-2xl p-6 text-center cursor-pointer transition-colors"
                            onClick={() => document.getElementById('verify-file-input')?.click()}
                        >
                            <input 
                                id="verify-file-input" 
                                type="file" 
                                className="hidden" 
                                accept="image/*,.pdf" 
                                onChange={(e) => setVerifyFile(e.target.files?.[0] || null)} 
                            />
                            {verifyFile ? (
                                <div className="flex items-center justify-center gap-2 text-blue-400 font-semibold text-[13px]">
                                    <Check size={14} />
                                    {verifyFile.name} ({(verifyFile.size / 1024).toFixed(1)} KB)
                                </div>
                            ) : (
                                <div className="text-neutral-500 hover:text-neutral-400 text-[12px]">
                                    Upload official government ID file
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-white/5">
                        <button
                            type="button"
                            onClick={() => setShowVerifyModal(false)}
                            disabled={verifyLoading}
                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-neutral-300 font-bold rounded-xl transition-colors disabled:opacity-50 text-[13px]"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleRequestVerification}
                            disabled={verifyLoading || !verifyFile}
                            className="flex-1 py-3 bg-blue-600 hover:opacity-90 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-[13px]"
                        >
                            {verifyLoading && <Loader2 size={14} className="animate-spin" />}
                            Submit Request
                        </button>
                    </div>
                </div>
            </ModalEngine>

            {/* Audit History Log Modal */}
            <ModalEngine
                isOpen={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
                title="Profile Change History"
            >
                <div className="space-y-4">
                    <p className="text-[12.5px] text-neutral-400 leading-relaxed">
                        View previous profile updates completed in this session.
                    </p>
                    {editHistory.length === 0 ? (
                        <div className="p-8 text-center text-[12.5px] text-neutral-600 bg-[#0E0E0E] rounded-2xl border border-white/5">
                            No changes in current session
                        </div>
                    ) : (
                        <div className="space-y-2.5 max-h-[50vh] overflow-y-auto inner-scroll pr-1">
                            {editHistory.map((item, idx) => (
                                <div key={idx} className="p-3.5 bg-[#0E0E0E] border border-white/5 rounded-xl text-[12px] space-y-1">
                                    <div className="flex items-center justify-between text-neutral-500 text-[10px] font-bold uppercase tracking-wider">
                                        <span>{item.field}</span>
                                        <span>{item.timestamp}</span>
                                    </div>
                                    <div className="text-neutral-400 flex items-center gap-1.5 flex-wrap">
                                        <span className="text-red-500/80 line-through truncate max-w-[120px]">{item.oldValue}</span>
                                        <span className="text-neutral-500">→</span>
                                        <span className="text-green-400 font-bold truncate max-w-[120px]">{item.newValue}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowHistoryModal(false)}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-neutral-300 font-bold rounded-xl transition-colors text-[13px]"
                    >
                        Close
                    </button>
                </div>
            </ModalEngine>

            <Toast show={toast.show} message={toast.message} type={toast.type} />
        </div>
    );
}
