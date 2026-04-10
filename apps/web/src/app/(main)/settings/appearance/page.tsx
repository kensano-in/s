'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { SettingsSection, SettingsSelect, Toast } from '../components';
import { Check } from 'lucide-react';
import clsx from 'clsx';

const ACCENT_COLORS = [
    { id: 'v-violet', color: '#6C63FF', name: 'Violet' },
    { id: 'v-cyan', color: '#00D1FF', name: 'Cyan' },
    { id: 'v-emerald', color: '#10B981', name: 'Emerald' },
    { id: 'v-orange', color: '#F97316', name: 'Orange' },
];

export default function AppearanceSettings() {
    const { theme, setTheme } = useAppStore();
    const [accentId, setAccentId] = useState('v-cyan'); // defaults

    useEffect(() => {
        const savedAccent = localStorage.getItem('verlyn_accent_id');
        const savedColor = localStorage.getItem('verlyn_accent_color');
        if (savedAccent && savedColor) {
            setAccentId(savedAccent);
            document.documentElement.style.setProperty('--v-accent', savedColor);
        }
    }, []);

    const handleAccent = (id: string, color: string) => {
        setAccentId(id);
        document.documentElement.style.setProperty('--v-accent', color);
        // Save to localStorage so it persists between reloads
        localStorage.setItem('verlyn_accent_id', id);
        localStorage.setItem('verlyn_accent_color', color);
    };

    return (
        <div className="max-w-2xl animate-fade-in">
            <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-1">Appearance</h2>
                <p className="text-[14px] text-neutral-500">Customize how the platform looks on your device.</p>
            </div>

            <SettingsSection title="Theme Preferences">
                <SettingsSelect
                    label="Theme Mode"
                    value={theme}
                    onChange={(v: string) => setTheme(v as any)}
                    options={[
                        { label: 'System Theme', value: 'system' },
                        { label: 'Light Mode', value: 'light' },
                        { label: 'Dark Mode', value: 'midnight' },
                    ]}
                />
            </SettingsSection>

            <SettingsSection title="Accent Color">
                <div className="p-4 flex gap-4 overflow-x-auto">
                    {ACCENT_COLORS.map((a) => {
                        const active = accentId === a.id;
                        return (
                            <button
                                key={a.id}
                                onClick={() => handleAccent(a.id, a.color)}
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div 
                                    className="w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95"
                                    style={{ backgroundColor: a.color }}
                                >
                                    {active && <Check size={16} className="text-white" />}
                                </div>
                                <span className={clsx(
                                    "text-[12px] font-medium",
                                    active ? "text-neutral-200" : "text-neutral-500 group-hover:text-neutral-400"
                                )}>
                                    {a.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </SettingsSection>
        </div>
    );
}
