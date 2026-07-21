'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { SettingsSection, ToggleRow } from '../components';
import { 
    Sparkles, 
    TrendingUp, 
    Award, 
    Percent, 
    Globe, 
    Users, 
    BarChart3, 
    Check, 
    Undo2, 
    Zap, 
    DollarSign, 
    Info 
} from 'lucide-react';
import clsx from 'clsx';
import { createClient } from '@/lib/supabase/client';

export default function CreatorToolsSettings() {
    const currentUser = useAppStore(s => s.currentUser);
    const setUser = useAppStore(s => s.setUser);
    const [isProfessional, setIsProfessional] = useState(false);
    const [monetizationActive, setMonetizationActive] = useState(false);
    const [category, setCategory] = useState('creator');
    
    const [savedState, setSavedState] = useState<any>(null);
    const [toast, setToast] = useState(false);

    useEffect(() => {
        if (!currentUser?.id) return;
        
        const metadata = currentUser.metadata || {};
        
        let loadedProfessional = false;
        let loadedCategory = 'creator';
        let loadedMonetization = false;
        
        // 1. check auth metadata
        if (metadata.is_creator !== undefined) {
            loadedProfessional = metadata.is_creator;
        } else {
            // 2. fallback to local storage
            const saved = localStorage.getItem(`verlyn_creator_settings_${currentUser.id}`);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    loadedProfessional = parsed.isProfessional;
                } catch (e) {}
            }
        }
        
        if (metadata.creator_category !== undefined) {
            loadedCategory = metadata.creator_category;
        } else {
            const saved = localStorage.getItem(`verlyn_creator_settings_${currentUser.id}`);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    loadedCategory = parsed.category || 'creator';
                } catch (e) {}
            }
        }

        if (metadata.monetization_active !== undefined) {
            loadedMonetization = metadata.monetization_active;
        } else {
            const saved = localStorage.getItem(`verlyn_creator_settings_${currentUser.id}`);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    loadedMonetization = parsed.monetizationActive;
                } catch (e) {}
            }
        }

        setIsProfessional(loadedProfessional);
        setCategory(loadedCategory);
        setMonetizationActive(loadedMonetization);
        
        const state = {
            isProfessional: loadedProfessional,
            category: loadedCategory,
            monetizationActive: loadedMonetization
        };
        setSavedState(state);
    }, [currentUser]);

    const handleSave = async () => {
        if (!currentUser?.id) return;
        const payload = {
            isProfessional,
            monetizationActive,
            category
        };
        localStorage.setItem(`verlyn_creator_settings_${currentUser.id}`, JSON.stringify(payload));
        setSavedState(payload);

        // Update auth metadata
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.updateUser({
            data: {
                is_creator: isProfessional,
                creator_category: category,
                monetization_active: monetizationActive
            }
        });

        // Update global user details if creator state changes
        if (user) {
            setUser({
                ...currentUser,
                metadata: user.user_metadata || {}
            });
        }

        setToast(true);
        setTimeout(() => setToast(false), 2500);
    };

    const resetChanges = () => {
        if (!savedState) return;
        setIsProfessional(savedState.isProfessional);
        setMonetizationActive(savedState.monetizationActive);
        setCategory(savedState.category || 'creator');
    };

    const hasChanges = savedState && (
        isProfessional !== savedState.isProfessional ||
        monetizationActive !== savedState.monetizationActive ||
        category !== savedState.category
    );

    // Performance statistics
    const metrics = [
        { label: 'Accounts Reached', value: '24.2K', change: '+32.4%', color: 'text-blue-400' },
        { label: 'Engagement Score', value: '8.4%', change: '+1.2%', color: 'text-purple-400' },
        { label: 'Content Interactions', value: '1.8K', change: '+15.8%', color: 'text-green-400' },
        { label: 'New Followers', value: '+420', change: '+4.5%', color: 'text-yellow-400' }
    ];

    return (
        <div className="w-full pb-12 animate-fade-in space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white mb-1">Creator Tools</h2>
                <p className="text-[12.5px] text-neutral-500 font-medium">Switch to a professional account, monitor reach metrics, and audit your monetization status.</p>
            </div>

            {/* Toggle Professional Mode */}
            <SettingsSection title="Account Classification">
                <ToggleRow
                    icon={Sparkles}
                    title="Professional / Creator Mode"
                    desc="Unlock insights, monetization parameters, and priority reach badges."
                    checked={isProfessional}
                    onChange={setIsProfessional}
                />
                {isProfessional && (
                    <div className="p-4 bg-[#0A0A0A]/40 space-y-2 border-t border-white/5">
                        <label className="block text-[11px] font-extrabold text-neutral-400 uppercase tracking-wider">Creator Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-[#141414] border border-white/5 rounded-xl px-3 py-3 text-[13.5px] text-neutral-300 focus:outline-none cursor-pointer"
                        >
                            <option value="creator">Digital Creator / Influencer</option>
                            <option value="business">Business / Corporation</option>
                            <option value="education">Educational Hub</option>
                            <option value="music">Musician / Band</option>
                            <option value="artist">Visual Artist / Designer</option>
                        </select>
                    </div>
                )}
            </SettingsSection>

            {isProfessional ? (
                <>
                    {/* Insights metrics boxes */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {metrics.map((m, idx) => (
                            <div key={idx} className="p-4 bg-[#0A0A0A] border border-white/5 rounded-2xl flex flex-col justify-between">
                                <span className="text-[11px] font-extrabold uppercase text-neutral-500 tracking-wider leading-tight">{m.label}</span>
                                <div className="flex items-baseline justify-between mt-2 gap-2">
                                    <span className="text-2xl font-black text-white">{m.value}</span>
                                    <span className={clsx("text-[10px] font-extrabold", m.color)}>{m.change}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Monetization check */}
                    <SettingsSection title="Monetization Status">
                        <div className="p-4 flex items-center justify-between gap-4 border-b border-white/5 bg-[#0D0D0D]/30">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-white/5 flex items-center justify-center text-neutral-400 shrink-0 mt-0.5">
                                    <DollarSign size={15} />
                                </div>
                                <div>
                                    <h5 className="text-[13px] font-bold text-white">Ad Revenue Eligibility</h5>
                                    <p className="text-[11.5px] text-neutral-500 mt-0.5">Earn money from ads shown in your posts and videos.</p>
                                </div>
                            </div>
                            <span className="text-[9px] uppercase font-extrabold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 rounded-full select-none shrink-0">Eligible</span>
                        </div>

                        <ToggleRow
                            icon={Percent}
                            title="Branded Content Partnerships"
                            desc="Enable direct corporate sponsor tracking tools and partnership labels."
                            checked={monetizationActive}
                            onChange={setMonetizationActive}
                        />
                    </SettingsSection>

                    {/* Reach details */}
                    <div className="p-5 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-3 text-neutral-400 text-[12px] leading-relaxed">
                        <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold text-white block mb-0.5">Audience Metrics Activated</span>
                            <span>Your stats refresh every 24 hours. Connect your stripe details in Payments page to start withdraw parameters.</span>
                        </div>
                    </div>
                </>
            ) : (
                <div className="p-8 text-center text-[13px] text-neutral-600 border border-white/5 bg-[#080808] rounded-2xl">
                    <TrendingUp size={22} className="mx-auto mb-2 text-neutral-700" />
                    <span>Select "Professional / Creator Mode" above to enable Creator Dashboard Metrics, monetization settings, and audience reach graphs.</span>
                </div>
            )}

            {/* FLOATING ACTION BOTTOM BAR FOR UNSAVED CHANGES */}
            {hasChanges && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#0E0E0E]/95 border border-white/10 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-6 backdrop-blur-md max-w-lg w-[90%]">
                    <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-blue-400 animate-pulse" />
                        <span className="text-[12.5px] font-bold text-neutral-200 shrink-0">Unsaved configuration changes</span>
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
                            className="px-4 py-2 bg-blue-600 hover:opacity-90 active:scale-95 text-white text-[12px] font-extrabold rounded-xl transition-all flex items-center gap-1.5"
                        >
                            <Check size={13} strokeWidth={3} />
                            Save
                        </button>
                    </div>
                </div>
            )}

            {toast && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-neutral-900 border border-white/10 px-4 py-2.5 rounded-xl shadow-xl z-50 text-[12px] text-green-400 font-bold flex items-center gap-2">
                    <Check size={14} /> Creator settings updated successfully
                </div>
            )}
        </div>
    );
}
