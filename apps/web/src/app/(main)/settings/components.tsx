'use client';

import React, { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

export function SettingsSection({ title, children }: { title?: string, children: ReactNode }) {
    return (
        <div className="mb-8">
            {title && <h2 className="text-[13px] font-medium text-neutral-400 mb-2 px-1 uppercase tracking-wide">{title}</h2>}
            <div className="bg-[#0f0f0f] rounded-2xl border border-white/5 overflow-hidden">
                {children}
            </div>
        </div>
    );
}

export function SettingsRow({
    icon: Icon,
    title,
    desc,
    right,
    onClick,
    href,
    variant = 'default',
    destructive = false,
}: {
    icon?: any;
    title: string;
    desc?: string;
    right?: ReactNode;
    onClick?: () => void;
    href?: string;
    variant?: 'default' | 'navigation';
    destructive?: boolean;
}) {
    const textColor = destructive ? 'text-red-500' : 'text-neutral-200';
    const iconColor = destructive ? 'text-red-500' : 'text-neutral-400';

    const content = (
        <div className="flex items-center justify-between p-4 min-h-[60px] border-b border-white/5 last:border-none hover:bg-white/[0.02] transition-colors cursor-pointer w-full text-left">
            <div className="flex items-center gap-4 flex-1 min-w-0">
                {Icon && (
                    <div className="flex-shrink-0 w-8 flex justify-center">
                        <Icon size={20} className={iconColor} />
                    </div>
                )}
                <div className="flex-1 min-w-0 pr-4">
                    <p className={`text-[15px] font-medium leading-tight ${textColor}`}>{title}</p>
                    {desc && <p className="text-[13px] text-neutral-500 mt-0.5 leading-snug">{desc}</p>}
                </div>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
                {right}
                {variant === 'navigation' && <ChevronRight size={18} className="text-neutral-500" />}
            </div>
        </div>
    );

    if (href) {
        return <Link href={href} className="block">{content}</Link>;
    }

    if (onClick) {
        return <button type="button" onClick={onClick} className="block w-full">{content}</button>;
    }

    return <div>{content}</div>;
}

export function SettingsToggle({ checked, onChange, disabled }: { checked: boolean, onChange: (v: boolean) => void, disabled?: boolean }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={clsx(
                "relative inline-flex h-[28px] w-[46px] flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] disabled:opacity-50",
                checked ? "bg-blue-500" : "bg-neutral-600"
            )}
        >
            <span
                className={clsx(
                    "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                    checked ? "translate-x-[18px]" : "translate-x-0"
                )}
            />
        </button>
    );
}

export function SettingsInput({ label, type = "text", value, onChange, placeholder, disabled, error }: any) {
    return (
        <div className="px-4 py-3 border-b border-white/5 last:border-none">
            {label && <label className="block text-[13px] text-neutral-400 mb-1.5">{label}</label>}
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full bg-transparent text-[15px] text-neutral-200 placeholder-neutral-600 focus:outline-none disabled:opacity-50"
            />
            {error && <p className="text-[12px] text-red-500 mt-1">{error}</p>}
        </div>
    );
}

export function SettingsTextarea({ label, value, onChange, placeholder, disabled, error }: any) {
    return (
        <div className="px-4 py-3 border-b border-white/5 last:border-none">
            {label && <label className="block text-[13px] text-neutral-400 mb-1.5">{label}</label>}
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                rows={3}
                className="w-full bg-transparent text-[15px] text-neutral-200 placeholder-neutral-600 focus:outline-none resize-none disabled:opacity-50"
            />
            {error && <p className="text-[12px] text-red-500 mt-1">{error}</p>}
        </div>
    );
}

export function SettingsSelect({ label, value, onChange, options, disabled }: any) {
    return (
        <div className="px-4 py-3 border-b border-white/5 last:border-none flex items-center justify-between">
            {label && <label className="text-[15px] text-neutral-200">{label}</label>}
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="bg-transparent border-none text-[15px] text-neutral-400 focus:outline-none text-right cursor-pointer"
            >
                {options.map((opt: any) => (
                    <option key={opt.value} value={opt.value} className="bg-[#1a1a1a]">
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

export function Toast({ show, message, type = 'success' }: { show: boolean, message: string, type?: 'success' | 'error' }) {
    if (!show) return null;
    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-fade-in pointer-events-none">
            <div className={clsx(
                "px-5 py-2.5 rounded-full text-[14px] font-medium shadow-xl backdrop-blur-md",
                type === 'success' ? "bg-[#1f1f1f] text-neutral-100 border border-white/10" : "bg-red-500/20 text-red-200 border border-red-500/20"
            )}>
                {message}
            </div>
        </div>
    );
}
