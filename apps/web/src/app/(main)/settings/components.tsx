'use client';

import React, { ReactNode, useState, useEffect, useRef } from 'react';
import { 
    ChevronRight, 
    Search, 
    X, 
    AlertTriangle, 
    Check, 
    Info, 
    Camera, 
    Sparkles, 
    ShieldAlert, 
    Trash2, 
    RefreshCw, 
    Laptop, 
    Smartphone, 
    Globe, 
    MapPin, 
    ArrowUpRight, 
    Download,
    Share2
} from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvatarUrl } from '@/lib/utils';

// Glassmorphic Premium settings card container
export function SettingsCard({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
    return (
        <div className={clsx(
            "bg-[#0B0B0B] border border-white/5 rounded-3xl p-6 mb-6 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-xl relative",
            className
        )}>
            {title && <h3 className="text-[14px] font-bold text-white mb-4 px-1">{title}</h3>}
            {children}
        </div>
    );
}

// SettingsSection wraps groupings with high fidelity border separation
export function SettingsSection({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
    return (
        <div className={clsx("mb-6", className)}>
            {title && (
                <h4 className="text-[11px] font-extrabold text-neutral-400 mb-2.5 px-2 uppercase tracking-[0.12em] select-none">
                    {title}
                </h4>
            )}
            <div className="bg-[#0D0D0D]/70 rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5 backdrop-blur-md">
                {children}
            </div>
        </div>
    );
}

// SettingsRow handles lists with options, text titles, descriptions and actions
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
    const textColor = destructive ? 'text-red-400 group-hover:text-red-300' : 'text-neutral-200 group-hover:text-white';
    const descColor = destructive ? 'text-red-500/60' : 'text-neutral-500 group-hover:text-neutral-400';
    const iconColor = destructive ? 'text-red-500' : 'text-neutral-400 group-hover:text-neutral-200';

    const content = (
        <div className="flex items-center justify-between p-4 min-h-[68px] hover:bg-white/[0.02] active:bg-white/[0.04] transition-all duration-200 cursor-pointer w-full text-left group">
            <div className="flex items-center gap-4 flex-1 min-w-0">
                {Icon && (
                    <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-neutral-900/80 border border-white/5 flex items-center justify-center transition-colors">
                        <Icon size={18} className={clsx("transition-transform group-hover:scale-105", iconColor)} />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className={clsx("text-[14px] font-bold tracking-tight transition-colors", textColor)}>{title}</p>
                    {desc && <p className={clsx("text-[12px] mt-0.5 leading-relaxed transition-colors", descColor)}>{desc}</p>}
                </div>
            </div>
            <div className="flex-shrink-0 flex items-center gap-3">
                {right}
                {variant === 'navigation' && (
                    <ChevronRight size={16} className="text-neutral-600 group-hover:text-neutral-400 transition-transform group-hover:translate-x-0.5" />
                )}
            </div>
        </div>
    );

    if (href) {
        return <Link href={href} className="block w-full">{content}</Link>;
    }

    if (onClick) {
        return <button type="button" onClick={onClick} className="block w-full">{content}</button>;
    }

    return <div>{content}</div>;
}

// Fully functional premium iOS-grade Toggle Row Component
export function ToggleRow({
    icon,
    title,
    desc,
    checked,
    onChange,
    disabled = false
}: {
    icon?: any;
    title: string;
    desc?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <SettingsRow
            icon={icon}
            title={title}
            desc={desc}
            right={
                <SettingsToggle checked={checked} onChange={onChange} disabled={disabled} />
            }
        />
    );
}

// iOS style switches
export function SettingsToggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={clsx(
                "relative inline-flex h-[26px] w-[46px] flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed",
                checked ? "bg-[var(--v-accent,#3B82F6)] shadow-[0_0_12px_rgba(59,130,246,0.3)]" : "bg-neutral-800"
            )}
        >
            <span
                className={clsx(
                    "pointer-events-none inline-block h-[22px] w-[22px] transform rounded-full bg-white shadow-md transition duration-300 ease-in-out ring-0",
                    checked ? "translate-x-[20px]" : "translate-x-0"
                )}
            />
        </button>
    );
}

// Premium input controls
export function SettingsInput({ label, type = "text", value, onChange, placeholder, disabled, error }: any) {
    return (
        <div className="px-5 py-4">
            {label && (
                <label className="block text-[11px] font-extrabold text-neutral-400 mb-1.5 uppercase tracking-[0.1em] select-none">
                    {label}
                </label>
            )}
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full bg-[#141414] border border-white/5 focus:border-white/10 rounded-xl px-4 py-3 text-[14px] text-neutral-100 placeholder-neutral-600 focus:outline-none disabled:opacity-40 transition-colors shadow-inner"
            />
            {error && (
                <p className="text-[12px] text-red-400 mt-2 flex items-center gap-1.5 font-medium animate-shake">
                    <AlertTriangle size={13} /> {error}
                </p>
            )}
        </div>
    );
}

// High visual textarea input
export function SettingsTextarea({ label, value, onChange, placeholder, disabled, error }: any) {
    return (
        <div className="px-5 py-4">
            {label && (
                <label className="block text-[11px] font-extrabold text-neutral-400 mb-1.5 uppercase tracking-[0.1em] select-none">
                    {label}
                </label>
            )}
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                rows={3}
                className="w-full bg-[#141414] border border-white/5 focus:border-white/10 rounded-xl px-4 py-3 text-[14px] text-neutral-100 placeholder-neutral-600 focus:outline-none resize-none disabled:opacity-40 transition-colors shadow-inner leading-relaxed"
            />
            {error && (
                <p className="text-[12px] text-red-400 mt-2 flex items-center gap-1.5 font-medium animate-shake">
                    <AlertTriangle size={13} /> {error}
                </p>
            )}
        </div>
    );
}

// Custom selectable boxes
export function SettingsSelect({ label, value, onChange, options, disabled }: any) {
    return (
        <div className="px-5 py-4 flex items-center justify-between gap-6">
            {label && <label className="text-[14px] font-bold text-neutral-200">{label}</label>}
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="bg-[#141414] border border-white/5 hover:border-white/10 rounded-xl px-3 py-2.5 text-[13px] text-neutral-300 focus:outline-none cursor-pointer min-w-[140px] text-right transition-colors"
            >
                {options.map((opt: any) => (
                    <option key={opt.value} value={opt.value} className="bg-[#0f0f0f] text-left">
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

// Search preferences engine
export function SettingsSearch({ value, onChange, placeholder = "Search parameters..." }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <div className="relative mb-5">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-[#0E0E0E] border border-white/5 focus:border-white/10 rounded-2xl pl-11 pr-10 py-3 text-[13px] text-neutral-200 placeholder-neutral-600 focus:outline-none transition-all shadow-inner"
            />
            {value && (
                <button 
                    type="button" 
                    onClick={() => onChange('')} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 p-0.5 rounded-full hover:bg-white/5 transition-colors"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}

// Fully loaded Focus-trapped glass overlay modal engine with escape hooks
export function ModalEngine({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: ReactNode }) {
    useEffect(() => {
        if (isOpen) {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onClose();
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => {
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
        return undefined;
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ scale: 0.96, opacity: 0, y: 15 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.96, opacity: 0, y: 15 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        className="w-full max-w-lg bg-[#0A0A0A]/95 border border-white/10 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative z-10 overflow-hidden backdrop-blur-2xl"
                    >
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">{title}</h3>
                            <button 
                                type="button" 
                                onClick={onClose} 
                                className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 max-h-[75vh] overflow-y-auto inner-scroll">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

// Side drawer component that slides out from right
export function DrawerEngine({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: ReactNode }) {
    useEffect(() => {
        if (isOpen) {
            // body overflow is managed by CSS -- do not override
        }
        return undefined;
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 backdrop-blur-xs"
                    />
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 28, stiffness: 260 }}
                        className="w-full max-w-md bg-[#090909] border-l border-white/5 h-full relative z-10 overflow-hidden flex flex-col shadow-2xl"
                    >
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                            <h3 className="text-base font-bold text-white">{title}</h3>
                            <button type="button" onClick={onClose} className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/5 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 inner-scroll">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

// iOS style bottom sheets for mobile actions
export function BottomSheet({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: ReactNode }) {
    useEffect(() => {
        if (isOpen) {
            // body overflow is managed by CSS -- do not override
        }
        return undefined;
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="w-full bg-[#0B0B0B] border-t border-white/10 rounded-t-[32px] shadow-2xl relative z-10 overflow-hidden pb-safe"
                    >
                        <div className="w-12 h-1 bg-white/10 rounded-full mx-auto my-3" />
                        <div className="flex items-center justify-between px-6 pb-4 border-b border-white/5">
                            <h3 className="text-sm font-extrabold text-neutral-400 uppercase tracking-wider">{title}</h3>
                            <button type="button" onClick={onClose} className="p-1.5 rounded-full text-neutral-400 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto inner-scroll">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

// Action dropdown selector menus
export function ActionMenu({ 
    trigger, 
    items 
}: { 
    trigger: ReactNode; 
    items: { label: string; icon?: any; onClick: () => void; destructive?: boolean }[] 
}) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative inline-block text-left" ref={containerRef}>
            <div onClick={() => setOpen(!open)}>{trigger}</div>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-48 rounded-xl bg-[#0F0F0F] border border-white/10 shadow-2xl z-20 py-1.5 overflow-hidden backdrop-blur-md"
                    >
                        {items.map((item, idx) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => { item.onClick(); setOpen(false); }}
                                    className={clsx(
                                        "w-full text-left px-4 py-2 text-[13px] font-semibold flex items-center gap-2.5 transition-colors",
                                        item.destructive 
                                            ? "text-red-400 hover:bg-red-500/10" 
                                            : "text-neutral-300 hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    {Icon && <Icon size={14} />}
                                    {item.label}
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Complete interactive dialog trigger
export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    destructive = false,
    loading = false
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
    loading?: boolean;
}) {
    return (
        <ModalEngine isOpen={isOpen} onClose={onClose} title={title}>
            <div className="text-center py-4">
                <div className={clsx(
                    "w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 border",
                    destructive 
                        ? "bg-red-500/5 text-red-400 border-red-500/10" 
                        : "bg-[var(--v-accent,#3B82F6)]/5 text-[var(--v-accent,#3B82F6)] border-[var(--v-accent,#3B82F6)]/10"
                )}>
                    <AlertTriangle size={24} />
                </div>
                <p className="text-[13.5px] text-neutral-400 leading-relaxed mb-6 px-2">{message}</p>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-neutral-300 font-bold rounded-xl transition-all disabled:opacity-40 active:scale-95"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={clsx(
                            "flex-1 py-3 text-white font-bold rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95",
                            destructive ? "bg-red-500 hover:bg-red-600" : "bg-[var(--v-accent,#3B82F6)] hover:opacity-90"
                        )}
                    >
                        {loading && (
                            <RefreshCw size={14} className="animate-spin" />
                        )}
                        {confirmText}
                    </button>
                </div>
            </div>
        </ModalEngine>
    );
}

// Profile Banner & Avatar Interactive Uploader with local crop simulator gates
export function ProfileUploader({
    avatarUrl,
    bannerUrl,
    onAvatarChange,
    onBannerChange,
    username = 'verlyn'
}: {
    avatarUrl: string;
    bannerUrl: string;
    onAvatarChange: (file: File) => Promise<void>;
    onBannerChange: (file: File) => Promise<void>;
    username?: string;
}) {
    const [avLoading, setAvLoading] = useState(false);
    const [baLoading, setBaLoading] = useState(false);

    const [cropImage, setCropImage] = useState<{ src: string; isBanner: boolean } | null>(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, isBanner: boolean) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Open crop simulator gate
        const reader = new FileReader();
        reader.onload = () => {
            setCropImage({ src: reader.result as string, isBanner });
        };
        reader.readAsDataURL(file);
    };

    const confirmCrop = async () => {
        if (!cropImage) return;
        
        // Mock a processed cropped file
        const blob = await fetch(cropImage.src).then(res => res.blob());
        const croppedFile = new File([blob], cropImage.isBanner ? 'banner.jpg' : 'avatar.jpg', { type: 'image/jpeg' });

        if (cropImage.isBanner) {
            setBaLoading(true);
            await onBannerChange(croppedFile);
            setBaLoading(false);
        } else {
            setAvLoading(true);
            await onAvatarChange(croppedFile);
            setAvLoading(false);
        }
        setCropImage(null);
    };

    return (
        <div className="relative mb-6 rounded-3xl overflow-hidden border border-white/5 bg-[#0D0D0D]">
            {/* Banner Section */}
            <div className="relative h-32 md:h-40 bg-gradient-to-r from-neutral-900 to-neutral-800 group overflow-hidden">
                {bannerUrl ? (
                    <img src={bannerUrl} alt="Profile Banner" className="w-full h-full object-cover" />
                ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-neutral-950 to-neutral-950" />
                )}
                
                {baLoading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-xs">
                        <RefreshCw size={20} className="animate-spin text-white" />
                    </div>
                )}
                
                <button
                    type="button"
                    onClick={() => document.getElementById('banner-input')?.click()}
                    className="absolute right-4 top-4 p-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-neutral-200 hover:text-white hover:scale-105 active:scale-95 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                    <Camera size={14} />
                    <input id="banner-input" type="file" className="hidden" accept="image/*" onChange={(e) => handleFile(e, true)} />
                </button>
            </div>

            {/* Avatar Row */}
            <div className="px-6 pb-6 pt-12 relative flex flex-col md:flex-row md:items-end justify-between gap-4">
                {/* Float avatar overlaps banner */}
                <div className="absolute -top-10 left-6">
                    <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-[#0B0B0B] bg-neutral-950 overflow-hidden group shadow-xl">
                        <img 
                            src={getAvatarUrl(username, avatarUrl)} 
                            alt="Avatar" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                        />
                        {avLoading && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-xs">
                                <RefreshCw size={16} className="animate-spin text-white" />
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => document.getElementById('avatar-file-up')?.click()}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                        >
                            <Camera size={16} />
                            <input id="avatar-file-up" type="file" className="hidden" accept="image/*" onChange={(e) => handleFile(e, false)} />
                        </button>
                    </div>
                </div>

                <div className="pl-0 md:pl-28 pt-2">
                    <h3 className="text-[14px] font-bold text-white">Profile Customizations</h3>
                    <p className="text-[11.5px] text-neutral-500 mt-0.5 leading-relaxed">Customize your public visuals for matching network feed profiles.</p>
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => document.getElementById('avatar-file-up')?.click()}
                        className="px-3.5 py-2 bg-neutral-900 border border-white/5 text-neutral-300 text-[12px] font-bold rounded-xl hover:bg-neutral-800 transition-colors"
                    >
                        Change Photo
                    </button>
                    <button
                        type="button"
                        onClick={() => document.getElementById('banner-input')?.click()}
                        className="px-3.5 py-2 bg-neutral-900 border border-white/5 text-neutral-300 text-[12px] font-bold rounded-xl hover:bg-neutral-800 transition-colors"
                    >
                        Change Banner
                    </button>
                </div>
            </div>

            {/* Crop Simulator Overlay */}
            <ModalEngine isOpen={!!cropImage} onClose={() => setCropImage(null)} title="Optimize Crop Composition">
                <div className="space-y-5 text-center">
                    <p className="text-[13px] text-neutral-400">Position photos cleanly within verlyn layout parameters.</p>
                    
                    <div className={clsx(
                        "relative bg-neutral-950 border border-white/5 flex items-center justify-center overflow-hidden mx-auto",
                        cropImage?.isBanner ? "aspect-[3/1] w-full rounded-xl" : "w-44 h-44 rounded-full"
                    )}>
                        {cropImage && (
                            <img src={cropImage.src} alt="Cropping preview" className="w-full h-full object-cover animate-pulse" />
                        )}
                        <div className="absolute inset-0 bg-transparent border-2 border-dashed border-[var(--v-accent,#3B82F6)] pointer-events-none" />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-white/5">
                        <button
                            type="button"
                            onClick={() => setCropImage(null)}
                            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-neutral-300 font-bold rounded-xl text-[13px] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={confirmCrop}
                            className="flex-1 py-2.5 bg-[var(--v-accent,#3B82F6)] text-white font-bold rounded-xl text-[13px] hover:opacity-90 transition-colors"
                        >
                            Apply Crop
                        </button>
                    </div>
                </div>
            </ModalEngine>
        </div>
    );
}

// Reusable Premium Button Component
export function SettingsButton({
    children,
    onClick,
    type = 'button',
    variant = 'primary',
    height = 36,
    disabled = false,
    loading = false,
    className,
    icon: Icon
}: {
    children: ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    height?: 36 | 42 | 48;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
    icon?: any;
}) {
    const heightClass = {
        36: 'h-[36px] px-4 rounded-lg text-[13px]',
        42: 'h-[42px] px-5 rounded-xl text-[14px]',
        48: 'h-[48px] px-6 rounded-xl text-[15px]'
    }[height];

    const variantClass = {
        primary: 'bg-[var(--v-accent,#3B82F6)] text-white hover:opacity-90 border border-transparent focus:ring-2 focus:ring-[var(--v-accent,#3B82F6)]/50',
        secondary: 'bg-white/5 text-neutral-200 hover:bg-white/10 hover:text-white border border-white/5 focus:ring-2 focus:ring-white/20',
        danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/10 focus:ring-2 focus:ring-red-500/30',
        ghost: 'bg-transparent text-neutral-400 hover:text-neutral-200 hover:bg-white/5 focus:ring-2 focus:ring-neutral-500/20'
    }[variant];

    return (
        <button
            type={type}
            disabled={disabled || loading}
            onClick={onClick}
            className={clsx(
                "inline-flex items-center justify-center gap-2 font-bold tracking-tight transition-all active:scale-[0.98] outline-none disabled:opacity-40 disabled:pointer-events-none focus-visible:ring-2 select-none",
                heightClass,
                variantClass,
                className
            )}
        >
            {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
            ) : Icon ? (
                <Icon size={height === 36 ? 14 : 16} className="shrink-0" />
            ) : null}
            <span>{children}</span>
        </button>
    );
}

// Security Active Sessions Visual Card
export function SecuritySessionCard({
    os = 'Unknown OS',
    browser = 'Web Browser',
    ip = '127.0.0.1',
    location = 'Unknown Location',
    lastActive = 'Active now',
    current = false,
    onRevoke
}: {
    os: string;
    browser: string;
    ip: string;
    location: string;
    lastActive: string;
    current?: boolean;
    onRevoke?: () => void;
}) {
    const isMobile = os.toLowerCase().includes('android') || os.toLowerCase().includes('ios') || os.toLowerCase().includes('iphone');
    const Icon = isMobile ? Smartphone : (os.toLowerCase().includes('windows') || os.toLowerCase().includes('mac') ? Laptop : Globe);

    return (
        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0A0A0A] border border-white/5 rounded-xl relative overflow-hidden transition-colors hover:bg-white/[0.02]">
            {current && (
                <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-[var(--v-accent,#3B82F6)]" />
            )}
            
            <div className="flex items-start gap-4">
                <div className={clsx(
                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border",
                    current ? "bg-[var(--v-accent,#3B82F6)]/5 text-[var(--v-accent,#3B82F6)] border-[var(--v-accent,#3B82F6)]/10" : "bg-neutral-900 text-neutral-400 border-white/5"
                )}>
                    <Icon size={16} />
                </div>
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-[13px] font-bold text-white">{os} • {browser}</h4>
                        {current && (
                            <span className="px-2 py-0.5 rounded bg-[var(--v-accent,#3B82F6)]/10 border border-[var(--v-accent,#3B82F6)]/20 text-[var(--v-accent,#3B82F6)] text-[9px] font-extrabold uppercase tracking-tight select-none">
                                Current Session
                            </span>
                        )}
                    </div>
                    <p className="text-[12px] text-neutral-500 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="flex items-center gap-1"><MapPin size={11} /> {location}</span>
                        <span>•</span>
                        <span>IP: {ip}</span>
                        <span>•</span>
                        <span>{lastActive}</span>
                    </p>
                </div>
            </div>

            {!current && onRevoke && (
                <SettingsButton
                    variant="danger"
                    height={36}
                    onClick={onRevoke}
                    className="shrink-0 self-start md:self-center"
                >
                    Revoke Session
                </SettingsButton>
            )}
        </div>
    );
}

// Storage Quota visual heatmap component
export function StorageAnalyticsCard({
    cacheSize = 1.2,
    mediaSize = 12.8,
    dbSize = 0.4,
    suggestions = ["Clear image cache (1.2 MB)", "Clean preloaded feeds data (0.4 MB)"],
    onPrune
}: {
    cacheSize: number; // in MB
    mediaSize: number; // in MB
    dbSize: number; // in MB
    suggestions: string[];
    onPrune?: (type: 'cache' | 'media' | 'db') => void;
}) {
    const total = cacheSize + mediaSize + dbSize;

    return (
        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 space-y-5">
            <div>
                <h4 className="text-[14px] font-bold text-white mb-1">Local Storage Breakdown</h4>
                <p className="text-[12px] text-neutral-500">View real-time client storage distributions mapped to this browser session.</p>
            </div>

            {/* Total display */}
            <div className="flex items-baseline gap-2 pb-2 border-b border-white/5">
                <span className="text-3xl font-black text-white tracking-tight">{total.toFixed(2)}</span>
                <span className="text-sm font-bold text-neutral-500">Megabytes (MB) Allocated</span>
            </div>

            {/* Tabular breakdown instead of heatmap */}
            <div className="space-y-3">
                <div className="flex items-center justify-between text-[13px] py-1">
                    <span className="font-medium text-neutral-400">Media Files (Cache & Assets)</span>
                    <span className="font-bold text-white">{mediaSize.toFixed(2)} MB</span>
                </div>
                <div className="flex items-center justify-between text-[13px] py-1 border-t border-white/5">
                    <span className="font-medium text-neutral-400">Cached Images & Thumbnails</span>
                    <span className="font-bold text-white">{cacheSize.toFixed(2)} MB</span>
                </div>
                <div className="flex items-center justify-between text-[13px] py-1 border-t border-white/5">
                    <span className="font-medium text-neutral-400">Database & State Indices</span>
                    <span className="font-bold text-white">{dbSize.toFixed(2)} MB</span>
                </div>
            </div>

            {/* Cleanup Suggestions */}
            {suggestions.length > 0 && onPrune && (
                <div className="border-t border-white/5 pt-4 space-y-3">
                    <h5 className="text-[11px] font-extrabold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
                        <Sparkles size={11} className="text-[var(--v-accent,#3B82F6)]" /> Cleanup Suggestions
                    </h5>
                    <div className="space-y-2">
                        {cacheSize > 0 && (
                            <div className="p-3 bg-[#0E0E0E] rounded-xl flex items-center justify-between border border-white/5">
                                <div className="text-[12.5px] font-medium text-neutral-300">{suggestions[0]}</div>
                                <SettingsButton
                                    variant="secondary"
                                    height={36}
                                    onClick={() => onPrune('cache')}
                                    icon={Trash2}
                                >
                                    Clear
                                </SettingsButton>
                            </div>
                        )}
                        {dbSize > 0 && (
                            <div className="p-3 bg-[#0E0E0E] rounded-xl flex items-center justify-between border border-white/5">
                                <div className="text-[12.5px] font-medium text-neutral-300">{suggestions[1] || "Optimize database indices"}</div>
                                <SettingsButton
                                    variant="secondary"
                                    height={36}
                                    onClick={() => onPrune('db')}
                                    icon={Trash2}
                                >
                                    Optimize
                                </SettingsButton>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Global animated feedback notification toast system
export function Toast({ show, message, type = 'success' }: { show: boolean; message: string; type?: 'success' | 'error' }) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 25, x: "-50%" }}
                    animate={{ opacity: 1, y: 0, x: "-50%" }}
                    exit={{ opacity: 0, y: 25, x: "-50%" }}
                    className="fixed bottom-10 left-1/2 z-55 pointer-events-none"
                >
                    <div className={clsx(
                        "px-5 py-3 rounded-full text-[13px] font-bold shadow-2xl backdrop-blur-md flex items-center gap-2.5 border tracking-tight",
                        type === 'success' 
                            ? "bg-[#141414]/90 text-neutral-100 border-white/10" 
                            : "bg-red-950/80 text-red-300 border-red-500/20"
                    )}>
                        {type === 'success' ? (
                            <span className="w-4 h-4 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                                <Check size={10} strokeWidth={4} />
                            </span>
                        ) : (
                            <AlertTriangle size={13} className="text-red-400" />
                        )}
                        {message}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export { ModalEngine as ModalSystem };

