'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { SettingsSection, ToggleRow } from '../components';
import { createClient } from '@/lib/supabase/client';
import { 
    Clock, 
    Moon, 
    Smartphone, 
    VolumeX, 
    Coffee, 
    Sparkles, 
    Hourglass, 
    Timer, 
    Check, 
    Undo2 
} from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

export default function TimeManagementSettings() {
    const currentUser = useAppStore(s => s.currentUser);
    const setUser = useAppStore(s => s.setUser);
    
    // Toggles
    const [quietMode, setQuietMode] = useState(false);
    const [sleepReminders, setSleepReminders] = useState(false);
    const [screenTimeLimit, setScreenTimeLimit] = useState(false);

    // Configurations
    const [reminderFrequency, setReminderFrequency] = useState('60'); // in minutes
    const [dailyLimitHour, setDailyLimitHour] = useState('2'); // in hours
    const [quietStart, setQuietStart] = useState('22:00');
    const [quietEnd, setQuietEnd] = useState('07:00');

    const [savedState, setSavedState] = useState<any>(null);
    const [toast, setToast] = useState(false);

    useEffect(() => {
        if (!currentUser?.id) return;
        
        // Load time settings from metadata first, fallback to localStorage
        const metadata = currentUser.metadata || {};
        const metaSettings = metadata.time_settings;
        if (metaSettings) {
            setQuietMode(metaSettings.quietMode ?? false);
            setSleepReminders(metaSettings.sleepReminders ?? false);
            setScreenTimeLimit(metaSettings.screenTimeLimit ?? false);
            setReminderFrequency(metaSettings.reminderFrequency || '60');
            setDailyLimitHour(metaSettings.dailyLimitHour || '2');
            setQuietStart(metaSettings.quietStart || '22:00');
            setQuietEnd(metaSettings.quietEnd || '07:00');
            setSavedState(metaSettings);
            return;
        }

        const key = `verlyn_time_settings_${currentUser.id}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setQuietMode(parsed.quietMode);
                setSleepReminders(parsed.sleepReminders);
                setScreenTimeLimit(parsed.screenTimeLimit);
                setReminderFrequency(parsed.reminderFrequency || '60');
                setDailyLimitHour(parsed.dailyLimitHour || '2');
                setQuietStart(parsed.quietStart || '22:00');
                setQuietEnd(parsed.quietEnd || '07:00');
                setSavedState(parsed);
                
                // Sync to metadata
                const supabase = createClient();
                supabase.auth.updateUser({
                    data: { time_settings: parsed }
                });
            } catch (e) {}
        } else {
            const defaults = {
                quietMode: false,
                sleepReminders: true,
                screenTimeLimit: false,
                reminderFrequency: '60',
                dailyLimitHour: '2',
                quietStart: '22:00',
                quietEnd: '07:00'
            };
            setQuietMode(defaults.quietMode);
            setSleepReminders(defaults.sleepReminders);
            setScreenTimeLimit(defaults.screenTimeLimit);
            setSavedState(defaults);
            localStorage.setItem(key, JSON.stringify(defaults));
            
            // Sync to metadata
            const supabase = createClient();
            supabase.auth.updateUser({
                data: { time_settings: defaults }
            });
        }
    }, [currentUser]);

    const handleSave = async () => {
        if (!currentUser?.id) return;
        const payload = {
            quietMode,
            sleepReminders,
            screenTimeLimit,
            reminderFrequency,
            dailyLimitHour,
            quietStart,
            quietEnd
        };
        
        // Save to localStorage
        localStorage.setItem(`verlyn_time_settings_${currentUser.id}`, JSON.stringify(payload));
        
        // Save to Supabase User Metadata and sync Zustand store
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.updateUser({
            data: { time_settings: payload }
        });
        
        if (!error && user) {
            setUser({
                ...currentUser,
                metadata: user.user_metadata || {}
            });
        }
        
        setSavedState(payload);
        setToast(true);
        setTimeout(() => setToast(false), 2500);
    };

    const hasChanges = savedState && (
        quietMode !== savedState.quietMode ||
        sleepReminders !== savedState.sleepReminders ||
        screenTimeLimit !== savedState.screenTimeLimit ||
        reminderFrequency !== savedState.reminderFrequency ||
        dailyLimitHour !== savedState.dailyLimitHour ||
        quietStart !== savedState.quietStart ||
        quietEnd !== savedState.quietEnd
    );

    const resetChanges = () => {
        if (!savedState) return;
        setQuietMode(savedState.quietMode);
        setSleepReminders(savedState.sleepReminders);
        setScreenTimeLimit(savedState.screenTimeLimit);
        setReminderFrequency(savedState.reminderFrequency || '60');
        setDailyLimitHour(savedState.dailyLimitHour || '2');
        setQuietStart(savedState.quietStart || '22:00');
        setQuietEnd(savedState.quietEnd || '07:00');
    };

    // Simulated Daily Usage stats
    const WEEKLY_STATS = [
        { day: 'Mon', mins: 120 },
        { day: 'Tue', mins: 85 },
        { day: 'Wed', mins: 150 },
        { day: 'Thu', mins: 95 },
        { day: 'Fri', mins: 110 },
        { day: 'Sat', mins: 190 },
        { day: 'Sun', mins: 140 }
    ];

    const maxMins = Math.max(...WEEKLY_STATS.map(d => d.mins));

    return (
        <div className="w-full pb-12 animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white mb-1">Time Management</h2>
                    <p className="text-[12.5px] text-neutral-500 font-medium">Keep track of your screen time, set quiet hours, and configure sleep break reminders.</p>
                </div>
            </div>

            {/* Screen Time Bar Chart */}
            <div className="p-6 bg-[#0A0A0A] border border-white/5 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider block">Daily Average</span>
                        <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-3xl font-black text-white">2h 11m</span>
                            <span className="text-[12px] font-bold text-green-400">-12% this week</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-white/5 flex items-center justify-center text-neutral-400">
                        <Smartphone size={18} />
                    </div>
                </div>

                {/* Bars */}
                <div className="flex items-end justify-between gap-2.5 pt-4 h-[120px] select-none">
                    {WEEKLY_STATS.map((d) => (
                        <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                            <div className="w-full bg-[#141414] border border-white/5 rounded-t-lg relative overflow-hidden group-hover:border-blue-500/20" style={{ height: `${(d.mins / maxMins) * 100}%` }}>
                                <div className="absolute inset-0 bg-blue-500/10 hover:bg-blue-500/25 transition-colors" />
                            </div>
                            <span className="text-[10px] font-bold text-neutral-500">{d.day}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quiet Hours Accordion Configs */}
            <SettingsSection title="Focus & Quiet Mode">
                <ToggleRow
                    icon={Moon}
                    title="Focus Quiet Hours"
                    desc="Silence notifications and incoming call buzzers automatically."
                    checked={quietMode}
                    onChange={setQuietMode}
                />
                {quietMode && (
                    <div className="p-4 bg-[#0A0A0A]/40 flex flex-col sm:flex-row gap-4 justify-between border-t border-white/5">
                        <div className="flex-1 space-y-1">
                            <label className="text-[11px] font-extrabold text-neutral-400 uppercase tracking-wider">Quiet Start Time</label>
                            <input 
                                type="time" 
                                value={quietStart}
                                onChange={(e) => setQuietStart(e.target.value)}
                                className="w-full bg-[#141414] border border-white/5 rounded-xl px-4 py-2.5 text-[13px] text-neutral-300 focus:outline-none focus:border-blue-500/40"
                            />
                        </div>
                        <div className="flex-1 space-y-1">
                            <label className="text-[11px] font-extrabold text-neutral-400 uppercase tracking-wider">Quiet End Time</label>
                            <input 
                                type="time" 
                                value={quietEnd}
                                onChange={(e) => setQuietEnd(e.target.value)}
                                className="w-full bg-[#141414] border border-white/5 rounded-xl px-4 py-2.5 text-[13px] text-neutral-300 focus:outline-none focus:border-blue-500/40"
                            />
                        </div>
                    </div>
                )}
            </SettingsSection>

            {/* Reminders Controls */}
            <SettingsSection title="Break Reminders">
                <ToggleRow
                    icon={Coffee}
                    title="Take a Break Reminders"
                    desc="Remind me to rest when I use the Verlyn application continuously."
                    checked={sleepReminders}
                    onChange={setSleepReminders}
                />
                {sleepReminders && (
                    <div className="p-4 bg-[#0A0A0A]/40 space-y-2 border-t border-white/5">
                        <label className="block text-[11px] font-extrabold text-neutral-400 uppercase tracking-wider">Reminder Interval</label>
                        <select
                            value={reminderFrequency}
                            onChange={(e) => setReminderFrequency(e.target.value)}
                            className="w-full bg-[#141414] border border-white/5 rounded-xl px-3 py-3 text-[13.5px] text-neutral-300 focus:outline-none cursor-pointer"
                        >
                            <option value="15">Every 15 minutes (Strict focus)</option>
                            <option value="30">Every 30 minutes</option>
                            <option value="60">Every 60 minutes (Balanced)</option>
                            <option value="120">Every 2 hours</option>
                        </select>
                    </div>
                )}
            </SettingsSection>

            {/* Daily limit parameters */}
            <SettingsSection title="Daily Screen Limit">
                <ToggleRow
                    icon={Hourglass}
                    title="Daily Usage Limit"
                    desc="Warn me when I exceed my target threshold duration for the day."
                    checked={screenTimeLimit}
                    onChange={setScreenTimeLimit}
                />
                {screenTimeLimit && (
                    <div className="p-4 bg-[#0A0A0A]/40 space-y-2 border-t border-white/5">
                        <label className="block text-[11px] font-extrabold text-neutral-400 uppercase tracking-wider">Daily Maximum Target</label>
                        <select
                            value={dailyLimitHour}
                            onChange={(e) => setDailyLimitHour(e.target.value)}
                            className="w-full bg-[#141414] border border-white/5 rounded-xl px-3 py-3 text-[13.5px] text-neutral-300 focus:outline-none cursor-pointer"
                        >
                            <option value="1">1 Hour per day</option>
                            <option value="2">2 Hours per day</option>
                            <option value="3">3 Hours per day</option>
                            <option value="5">5 Hours per day</option>
                        </select>
                    </div>
                )}
            </SettingsSection>

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
                    <Check size={14} /> Time limits synced successfully
                </div>
            )}
        </div>
    );
}
