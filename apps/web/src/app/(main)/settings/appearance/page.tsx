'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Toast } from '../components';
import { 
    Eye, 
    Palette, 
    Type, 
    Accessibility,
    Sliders,
    Sparkles,
    Shield,
    Minimize2,
    Check,
    RotateCcw,
    Copy,
    Download,
    Upload,
    Save,
    Play,
    Pause,
    Moon,
    Sun,
    Type as FontIcon,
    Flame,
    Zap,
    Grid,
    SlidersHorizontal,
    Monitor,
    Cloud,
    CheckCircle2,
    Compass
} from 'lucide-react';
import clsx from 'clsx';
import { 
    VisualConfigV2, 
    PremiumTheme, 
    PREMIUM_THEMES, 
    DEFAULT_CONFIG, 
    applyVisualConfigV2, 
    hexToTailwindHsl,
    hexToHsl
} from '@/lib/personalization';

// Preset Setup Profiles
interface SetupPreset {
    id: string;
    name: string;
    description: string;
    config: Partial<VisualConfigV2>;
}

const SETUP_PRESETS: SetupPreset[] = [
    {
        id: 'gaming',
        name: 'Gaming Setup',
        description: 'High glow, razor sharp corners, neon accents, and liquid backgrounds.',
        config: {
            cornerProfile: 'sharp',
            glassGlowStrength: 12,
            animationProfile: 'gaming',
            bgMode: 'liquid',
            isGradientAccent: true
        }
    },
    {
        id: 'minimal',
        name: 'Minimalist',
        description: 'Reduced shadows, high transparency, subtle accents, and developer fonts.',
        config: {
            glassOpacity: 0.15,
            glassBlur: 12,
            glassDepth: 1,
            cornerProfile: 'developer',
            bgMode: 'static',
            animationProfile: 'minimal'
        }
    },
    {
        id: 'creator',
        name: 'Creator Studio',
        description: 'Vibrant mesh gradients, expressive animations, and rounded geometries.',
        config: {
            glassOpacity: 0.25,
            cornerProfile: 'ultra_rounded',
            bgMode: 'mesh-gradient',
            animationProfile: 'expressive'
        }
    },
    {
        id: 'work',
        name: 'Office & Work',
        description: 'Standard text sizes, clean borders, high contrast, and neutral backgrounds.',
        config: {
            glassOpacity: 0.4,
            glassBlur: 15,
            bgMode: 'static',
            animationProfile: 'balanced',
            fontScale: 'default'
        }
    },
    {
        id: 'oled',
        name: 'OLED Battery Saver',
        description: 'True pitch-black backgrounds, sharp borders, and low glows.',
        config: {
            themeId: 'obsidian-red',
            glassOpacity: 0.05,
            bgMode: 'static',
            glassDepth: 0
        }
    },
    {
        id: 'streamer',
        name: 'Streamer Mode',
        description: 'Aurora animated background, maximum glass glow, and luxury motion.',
        config: {
            glassGlowStrength: 20,
            bgMode: 'aurora',
            animationProfile: 'luxury',
            isGradientAccent: true
        }
    },
    {
        id: 'reading',
        name: 'Focus & Reading',
        description: 'Warm color pallets, large fonts, dyslexia-friendly serif font styles.',
        config: {
            fontScale: 'reading',
            fontFamilyStyle: 'serif',
            bgMode: 'noise',
            animationProfile: 'accessibility'
        }
    }
];

export default function SPlusPersonalizationEngine() {
    const currentUser = useAppStore(s => s.currentUser);
    const setUser = useAppStore(s => s.setUser);
    const theme = useAppStore(s => s.theme);
    const setTheme = useAppStore(s => s.setTheme);
    const userId = currentUser?.id || 'guest';

    // Core configuration state
    const [config, setConfig] = useState<VisualConfigV2>(DEFAULT_CONFIG);
    
    // UI Local state
    const [activeTab, setActiveTab] = useState<'themes' | 'colors' | 'glass' | 'background' | 'typography' | 'access'>('themes');
    const [customThemes, setCustomThemes] = useState<PremiumTheme[]>([]);
    const [themeNameInput, setThemeNameInput] = useState('');
    const [importText, setImportText] = useState('');
    const [showImportArea, setShowImportArea] = useState(false);
    const [isPlayingBg, setIsPlayingBg] = useState(true);
    
    // Preset configuration setup selection
    const [selectedPresetId, setSelectedPresetId] = useState<string>('');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

    // References for Background Canvas Preview
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    // Load custom themes and initial config from localStorage / metadata
    useEffect(() => {
        if (!userId) return;

        // Custom Themes
        const storedCustomThemes = localStorage.getItem(`verlyn_custom_themes_${userId}`);
        if (storedCustomThemes) {
            try {
                setCustomThemes(JSON.parse(storedCustomThemes));
            } catch (e) {}
        }

        // Active personalization configuration
        let savedConfig: any = null;
        const storedConfig = localStorage.getItem(`verlyn_personalization_v2_${userId}`);
        if (storedConfig) {
            try {
                savedConfig = JSON.parse(storedConfig);
            } catch (e) {}
        }

        // Supabase metadata fallback
        const metadata = currentUser?.metadata || {};
        if (metadata.personalization_v2) {
            savedConfig = { ...savedConfig, ...metadata.personalization_v2 };
        }

        if (savedConfig) {
            setConfig(prev => ({ ...prev, ...savedConfig }));
            applyVisualConfigV2({ ...DEFAULT_CONFIG, ...savedConfig });
        } else {
            // Apply default config first
            applyVisualConfigV2(DEFAULT_CONFIG);
        }
    }, [userId, currentUser?.metadata]);

    // Live update settings globally (without save)
    const updateConfigField = (updates: Partial<VisualConfigV2>) => {
        setConfig(prev => {
            const next = { ...prev, ...updates };
            applyVisualConfigV2(next);
            return next;
        });
    };

    // Save configuration permanently to local storage & Supabase
    const handleSaveConfig = async () => {
        try {
            localStorage.setItem(`verlyn_personalization_v2_${userId}`, JSON.stringify(config));
            
            // Sync to Supabase metadata if logged in
            if (currentUser) {
                const { createClient } = await import('@/lib/supabase/client');
                const supabase = createClient();
                
                const newMetadata = {
                    ...(currentUser.metadata || {}),
                    personalization_v2: config
                };

                const { error } = await supabase.auth.updateUser({
                    data: newMetadata
                });

                if (error) throw error;
                
                setUser({
                    ...currentUser,
                    metadata: newMetadata
                });
            }

            showToast('Personalization engine synchronized successfully!');
        } catch (err: any) {
            console.error('Failed to sync settings:', err);
            showToast('Saved to local storage. Cloud sync failed.', 'error');
        }
    };

    // Reset settings to defaults
    const handleResetDefaults = () => {
        setConfig(DEFAULT_CONFIG);
        applyVisualConfigV2(DEFAULT_CONFIG);
        showToast('Restored default visual settings');
    };

    // Dynamic background canvas preview logic
    useEffect(() => {
        if (!canvasRef.current || !isPlayingBg) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = (canvas.width = canvas.offsetWidth);
        let height = (canvas.height = canvas.offsetHeight);

        const resizeObserver = new ResizeObserver(() => {
            if (canvas) {
                width = canvas.width = canvas.offsetWidth;
                height = canvas.height = canvas.offsetHeight;
            }
        });
        resizeObserver.observe(canvas);

        // Particle configuration for particles, constellations, nebulae
        const particlesList: Array<{ x: number; y: number; vx: number; vy: number; radius: number; color: string }> = [];
        const initParticles = (count: number) => {
            particlesList.length = 0;
            for (let i = 0; i < count; i++) {
                particlesList.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    radius: Math.random() * 2 + 1,
                    color: i % 2 === 0 ? config.accentColor : config.secondaryColor
                });
            }
        };
        initParticles(40);

        let tick = 0;

        const render = () => {
            tick += 0.002;
            ctx.clearRect(0, 0, width, height);

            const activeTheme = PREMIUM_THEMES.find(t => t.id === config.themeId) || PREMIUM_THEMES[4];

            // Render backgrounds
            if (config.bgMode === 'mesh-gradient' || config.bgMode === 'aurora') {
                const grad = ctx.createRadialGradient(
                    width * 0.3 + Math.sin(tick) * width * 0.2,
                    height * 0.3 + Math.cos(tick) * height * 0.2,
                    10,
                    width * 0.5,
                    height * 0.5,
                    width * 0.8
                );
                grad.addColorStop(0, config.accentColor + '33');
                grad.addColorStop(0.5, config.secondaryColor + '22');
                grad.addColorStop(1, activeTheme.background);
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);
            } 
            else if (config.bgMode === 'liquid') {
                // Liquid organic moving blobs
                ctx.fillStyle = activeTheme.background;
                ctx.fillRect(0, 0, width, height);

                ctx.save();
                ctx.filter = 'blur(40px)';
                
                const blob1X = width * 0.5 + Math.sin(tick * 2) * width * 0.2;
                const blob1Y = height * 0.5 + Math.cos(tick * 1.5) * height * 0.2;
                const blob2X = width * 0.3 + Math.cos(tick * 1.2) * width * 0.15;
                const blob2Y = height * 0.4 + Math.sin(tick * 2.1) * height * 0.15;

                ctx.fillStyle = config.accentColor + '55';
                ctx.beginPath();
                ctx.arc(blob1X, blob1Y, 70, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = config.secondaryColor + '44';
                ctx.beginPath();
                ctx.arc(blob2X, blob2Y, 90, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
            else if (config.bgMode === 'particles' || config.bgMode === 'constellation') {
                ctx.fillStyle = activeTheme.background;
                ctx.fillRect(0, 0, width, height);

                particlesList.forEach((p, idx) => {
                    p.x += p.vx;
                    p.y += p.vy;

                    if (p.x < 0 || p.x > width) p.vx *= -1;
                    if (p.y < 0 || p.y > height) p.vy *= -1;

                    ctx.fillStyle = p.color + 'aa';
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fill();

                    // Constellation lines connection
                    if (config.bgMode === 'constellation') {
                        for (let j = idx + 1; j < particlesList.length; j++) {
                            const p2 = particlesList[j];
                            const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                            if (dist < 75) {
                                ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - dist / 75) * 0.12})`;
                                ctx.lineWidth = 0.5;
                                ctx.beginPath();
                                ctx.moveTo(p.x, p.y);
                                ctx.lineTo(p2.x, p2.y);
                                ctx.stroke();
                            }
                        }
                    }
                });
            } 
            else if (config.bgMode === 'gradient') {
                const grad = ctx.createLinearGradient(0, 0, width, height);
                grad.addColorStop(0, config.bgCustomColors[0] || activeTheme.background);
                grad.addColorStop(1, config.bgCustomColors[1] || activeTheme.surface);
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);
            }
            else if (config.bgMode === 'animated-gradient') {
                const shift = Math.abs(Math.sin(tick * 0.5));
                const grad = ctx.createLinearGradient(0, 0, width, height);
                grad.addColorStop(0, config.accentColor + '30');
                grad.addColorStop(shift, activeTheme.background);
                grad.addColorStop(1, config.secondaryColor + '20');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);
            }
            else {
                // Static background mode
                ctx.fillStyle = activeTheme.background;
                ctx.fillRect(0, 0, width, height);
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
            resizeObserver.disconnect();
        };
    }, [config.bgMode, config.accentColor, config.secondaryColor, config.themeId, isPlayingBg, config.bgCustomColors]);

    // Apply specific preset
    const handleApplyPreset = (preset: SetupPreset) => {
        setSelectedPresetId(preset.id);
        const merged = { ...config, ...preset.config };
        
        // If theme overrides accent, match presets
        if (preset.config.themeId) {
            const themeObj = PREMIUM_THEMES.find(t => t.id === preset.config.themeId);
            if (themeObj) {
                merged.accentColor = themeObj.primary;
                merged.secondaryColor = themeObj.secondary;
            }
        }
        
        setConfig(merged);
        applyVisualConfigV2(merged);
        showToast(`Setup Preset '${preset.name}' loaded instantly!`);
    };

    // Save Custom User Theme
    const handleSaveCustomTheme = () => {
        if (!themeNameInput.trim()) {
            showToast('Please enter a theme name', 'error');
            return;
        }

        const newTheme: PremiumTheme = {
            id: `custom-${Date.now()}`,
            name: themeNameInput.trim(),
            background: PREMIUM_THEMES.find(t => t.id === config.themeId)?.background || '#050508',
            surface: config.isGradientAccent ? config.accentColor : '#0f0f12',
            surfaceElevated: '#17171c',
            foreground: '#ffffff',
            foregroundMuted: '#94a3b8',
            primary: config.accentColor,
            secondary: config.secondaryColor,
            border: '#27272a',
            glow: config.accentColor + '40',
            glassOpacity: config.glassOpacity,
            glassBlur: config.glassBlur,
            bgMode: config.bgMode
        };

        const updated = [...customThemes, newTheme];
        setCustomThemes(updated);
        localStorage.setItem(`verlyn_custom_themes_${userId}`, JSON.stringify(updated));
        setThemeNameInput('');
        showToast(`Custom theme '${newTheme.name}' saved!`);
    };

    // Delete Custom Theme
    const handleDeleteCustomTheme = (id: string, name: string) => {
        const updated = customThemes.filter(t => t.id !== id);
        setCustomThemes(updated);
        localStorage.setItem(`verlyn_custom_themes_${userId}`, JSON.stringify(updated));
        showToast(`Theme '${name}' deleted.`);
    };

    // Duplicate existing theme
    const handleDuplicateTheme = (t: PremiumTheme) => {
        const dup: PremiumTheme = {
            ...t,
            id: `custom-${Date.now()}`,
            name: `${t.name} (Copy)`
        };
        const updated = [...customThemes, dup];
        setCustomThemes(updated);
        localStorage.setItem(`verlyn_custom_themes_${userId}`, JSON.stringify(updated));
        showToast(`Theme '${dup.name}' duplicated`);
    };

    // Export theme JSON
    const handleExportTheme = (themeObj: PremiumTheme) => {
        const exportStr = JSON.stringify(themeObj);
        navigator.clipboard.writeText(exportStr);
        showToast('Theme JSON copied to clipboard!');
    };

    // Import theme from JSON
    const handleImportTheme = () => {
        try {
            const parsed = JSON.parse(importText.trim());
            if (!parsed.name || !parsed.primary) {
                throw new Error('Invalid theme keys');
            }
            parsed.id = `custom-${Date.now()}`;
            const updated = [...customThemes, parsed];
            setCustomThemes(updated);
            localStorage.setItem(`verlyn_custom_themes_${userId}`, JSON.stringify(updated));
            setImportText('');
            setShowImportArea(false);
            showToast(`Theme '${parsed.name}' imported successfully!`);
        } catch (e) {
            showToast('Invalid theme format. Check your JSON.', 'error');
        }
    };

    // Auto generate harmonized secondary and shadow colors based on primary
    const handleGeneratePalette = (primaryHex: string) => {
        const { h, s, l } = hexToHsl(primaryHex);
        
        // Secondary: rotate hue by 30 degrees, adjust lightness
        const secH = (h + 30) % 360;
        const secL = Math.max(20, Math.min(80, l + 10));
        const secondaryHex = hslToHex(secH, s, secL);

        updateConfigField({
            accentColor: primaryHex,
            secondaryColor: secondaryHex
        });

        showToast('Color palette generated automatically!');
    };

    // Helper: Hsl to Hex conversion
    function hslToHex(h: number, s: number, l: number): string {
        s /= 100;
        l /= 100;
        const a = s * Math.min(l, 1 - l);
        const f = (n: number) => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    // Toggle high-contrast setting
    const toggleHighContrast = (checked: boolean) => {
        updateConfigField({ accessibilityHighContrast: checked });
        // Set class directly
        if (checked) {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }
    };

    // Toggle reduce-motion
    const toggleReduceMotion = (checked: boolean) => {
        updateConfigField({ accessibilityMotionReduce: checked });
        if (checked) {
            document.documentElement.classList.add('reduce-motion');
        } else {
            document.documentElement.classList.remove('reduce-motion');
        }
    };

    // Combined all themes list
    const allThemes = useMemo(() => {
        return [...PREMIUM_THEMES, ...customThemes];
    }, [customThemes]);

    const activeThemeObj = useMemo(() => {
        return allThemes.find(t => t.id === config.themeId) || PREMIUM_THEMES[4];
    }, [allThemes, config.themeId]);

    return (
        <div className="w-full pb-16 animate-fade-in max-w-7xl mx-auto flex flex-col xl:flex-row gap-8 items-start relative z-10 font-sans">
            
            {/* LEFT OPTIONS PANEL */}
            <div className="flex-1 w-full xl:max-w-[62%]">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-black text-white flex items-center gap-2.5 tracking-tight">
                            <Sparkles className="text-[var(--v-accent,#3B82F6)] w-6 h-6 animate-pulse" />
                            PERSONAL VISUAL OPERATING SYSTEM
                        </h1>
                        <p className="text-[12px] text-neutral-400 mt-1 leading-relaxed">
                            Upgrade layout density, animation spring stiffness, glass blurs, custom theme modules, and accessibility engines.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleResetDefaults}
                            title="Reset all settings to default values"
                            className="px-3.5 py-2 rounded-xl bg-neutral-900 border border-white/5 hover:bg-neutral-800 text-neutral-300 text-[12px] font-bold flex items-center gap-2 transition-all active:scale-95"
                        >
                            <RotateCcw size={13} />
                            Reset Defaults
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveConfig}
                            className="px-4 py-2 rounded-xl bg-[var(--v-accent,#3B82F6)] hover:brightness-95 text-white text-[12px] font-bold flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-blue-500/10"
                        >
                            <Save size={13} />
                            Save Config
                        </button>
                    </div>
                </div>

                {/* Setup Preset Grid */}
                <div className="mb-6 bg-neutral-950/80 border border-white/5 rounded-2xl p-4">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2 px-1">Setup Presets</span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {SETUP_PRESETS.map((p) => {
                            const isSelected = selectedPresetId === p.id;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handleApplyPreset(p)}
                                    className={clsx(
                                        "p-2.5 rounded-xl border text-left transition-all active:scale-[0.98]",
                                        isSelected 
                                            ? "bg-[var(--v-accent,#3B82F6)]/10 border-[var(--v-accent,#3B82F6)] text-white" 
                                            : "bg-neutral-900/50 border-white/5 hover:bg-neutral-900 hover:border-white/10 text-neutral-300"
                                    )}
                                >
                                    <div className="text-[11.5px] font-bold truncate">{p.name}</div>
                                    <div className="text-[9.5px] text-neutral-500 line-clamp-1 mt-0.5">{p.description}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tabs bar */}
                <div className="flex overflow-x-auto scroll-none border-b border-white/5 mb-6 gap-2 pb-1">
                    {[
                        { id: 'themes', label: 'Theme Collections', icon: Palette },
                        { id: 'colors', label: 'Accents & Custom', icon: Flame },
                        { id: 'glass', label: 'Glass & Geometry', icon: Minimize2 },
                        { id: 'background', label: 'Background Layer', icon: Compass },
                        { id: 'typography', label: 'Type & Motion', icon: Type },
                        { id: 'access', label: 'Accessibility & Sync', icon: Accessibility }
                    ].map((t) => {
                        const Icon = t.icon;
                        const active = activeTab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setActiveTab(t.id as any)}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12.5px] font-bold transition-all whitespace-nowrap border border-transparent",
                                    active 
                                        ? "bg-white/[0.04] text-white border-white/5" 
                                        : "text-neutral-400 hover:text-neutral-200"
                                )}
                            >
                                <Icon size={14} className={active ? "text-[var(--v-accent,#3B82F6)]" : ""} />
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {/* CONTENT OPTIONS CONTAINER */}
                <div className="space-y-6">
                    
                    {/* TAB: THEMES */}
                    {activeTab === 'themes' && (
                        <div className="space-y-6">
                            
                            {/* Premium Themes Grid */}
                            <div className="bg-[#0D0D0D]/60 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
                                <h3 className="text-[13px] font-black text-white uppercase tracking-wider mb-4">Verlyn Premium Shells</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {PREMIUM_THEMES.map((t) => {
                                        const active = config.themeId === t.id;
                                        return (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => {
                                                    updateConfigField({
                                                        themeId: t.id,
                                                        accentColor: t.primary,
                                                        secondaryColor: t.secondary,
                                                        bgMode: t.bgMode,
                                                        glassOpacity: t.glassOpacity,
                                                        glassBlur: t.glassBlur
                                                    });
                                                }}
                                                className={clsx(
                                                    "p-3 rounded-xl border text-left transition-all relative overflow-hidden group hover:scale-[1.02]",
                                                    active ? "border-[var(--v-accent,#3B82F6)] bg-white/[0.02]" : "border-white/5 bg-neutral-950/40 hover:border-white/10"
                                                )}
                                            >
                                                {/* Mini Color Swatches */}
                                                <div className="flex gap-1.5 mb-2.5">
                                                    <span className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: t.primary }} />
                                                    <span className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: t.secondary }} />
                                                    <span className="w-3.5 h-3.5 rounded bg-neutral-800 border border-white/10" style={{ backgroundColor: t.background }} />
                                                </div>
                                                <div className="text-[12px] font-black text-white tracking-wide">{t.name}</div>
                                                <div className="text-[9.5px] text-neutral-500 uppercase font-bold tracking-widest mt-0.5">{t.bgMode}</div>

                                                {active && (
                                                    <span className="absolute right-2.5 bottom-2.5 w-4 h-4 rounded-full bg-[var(--v-accent,#3B82F6)] flex items-center justify-center text-white border border-white/10">
                                                        <Check size={8} strokeWidth={4} />
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Custom & Community Themes */}
                            <div className="bg-[#0D0D0D]/60 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[13px] font-black text-white uppercase tracking-wider">Custom Created Themes</h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowImportArea(!showImportArea)}
                                        className="text-[11.5px] text-[var(--v-accent,#3B82F6)] hover:underline font-bold"
                                    >
                                        Import theme
                                    </button>
                                </div>

                                {showImportArea && (
                                    <div className="mb-4 space-y-2 p-3 bg-neutral-900/60 rounded-xl border border-white/5">
                                        <textarea
                                            value={importText}
                                            onChange={(e) => setImportText(e.target.value)}
                                            placeholder='Paste theme JSON block here...'
                                            className="w-full h-16 bg-black/50 border border-white/5 focus:border-white/10 rounded-lg p-2 text-[11px] font-mono text-neutral-300 resize-none focus:outline-none"
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowImportArea(false)}
                                                className="px-2.5 py-1 text-[11px] text-neutral-500 font-bold"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleImportTheme}
                                                className="px-3 py-1 text-[11px] bg-[var(--v-accent,#3B82F6)] hover:brightness-95 text-white rounded-lg font-bold"
                                            >
                                                Load Theme
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {customThemes.length === 0 ? (
                                    <div className="text-center py-6 border border-dashed border-white/5 rounded-xl bg-neutral-950/20">
                                        <Palette className="w-7 h-7 mx-auto text-neutral-600 mb-2" />
                                        <p className="text-[11.5px] text-neutral-500 font-medium">No custom themes saved yet. Create one below!</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {customThemes.map((t) => {
                                            const active = config.themeId === t.id;
                                            return (
                                                <div 
                                                    key={t.id} 
                                                    className={clsx(
                                                        "p-3 rounded-xl border flex items-center justify-between bg-neutral-950/30",
                                                        active ? "border-[var(--v-accent,#3B82F6)]" : "border-white/5"
                                                    )}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            updateConfigField({
                                                                themeId: t.id,
                                                                accentColor: t.primary,
                                                                secondaryColor: t.secondary,
                                                                bgMode: t.bgMode,
                                                                glassOpacity: t.glassOpacity,
                                                                glassBlur: t.glassBlur
                                                            });
                                                        }}
                                                        className="flex-1 text-left"
                                                    >
                                                        <span className="text-[12px] font-black text-neutral-200 block">{t.name}</span>
                                                        <span className="text-[9.5px] text-neutral-500 block uppercase font-bold tracking-wide mt-0.5">Custom / {t.bgMode}</span>
                                                    </button>

                                                    <div className="flex items-center gap-1.5">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleExportTheme(t)} 
                                                            title="Export JSON"
                                                            className="p-1.5 rounded hover:bg-white/5 text-neutral-400 hover:text-white"
                                                        >
                                                            <Copy size={12} />
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleDuplicateTheme(t)} 
                                                            title="Duplicate"
                                                            className="p-1.5 rounded hover:bg-white/5 text-neutral-400 hover:text-white"
                                                        >
                                                            <Download size={12} />
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleDeleteCustomTheme(t.id, t.name)}
                                                            title="Delete"
                                                            className="p-1.5 rounded hover:bg-white/5 text-red-400/80 hover:text-red-400"
                                                        >
                                                            <CheckCircle2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Save current theme layout */}
                                <div className="mt-4 pt-4 border-t border-white/5 flex gap-2.5">
                                    <input
                                        type="text"
                                        value={themeNameInput}
                                        onChange={(e) => setThemeNameInput(e.target.value)}
                                        placeholder="Name your custom style configuration..."
                                        className="flex-1 bg-black/60 border border-white/5 focus:border-white/10 rounded-xl px-3.5 py-2 text-[12px] text-neutral-200 placeholder-neutral-600 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSaveCustomTheme}
                                        className="px-4 py-2 rounded-xl bg-white text-black hover:bg-neutral-100 text-[12px] font-black tracking-tight"
                                    >
                                        Save Custom Theme
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: COLORS */}
                    {activeTab === 'colors' && (
                        <div className="space-y-6">
                            
                            {/* Color Selector Controls */}
                            <div className="bg-[#0D0D0D]/60 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
                                <h3 className="text-[13px] font-black text-white uppercase tracking-wider mb-4">Color Palette Orchestrator</h3>
                                
                                <div className="space-y-5">
                                    {/* Primary Picker */}
                                    <div>
                                        <label className="text-[11.5px] font-bold text-neutral-400 block mb-2">Accent Primary Color</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={config.accentColor}
                                                onChange={(e) => {
                                                    updateConfigField({ accentColor: e.target.value });
                                                }}
                                                className="w-10 h-10 rounded-xl border border-white/10 bg-transparent cursor-pointer overflow-hidden p-0"
                                            />
                                            <input
                                                type="text"
                                                value={config.accentColor.toUpperCase()}
                                                onChange={(e) => {
                                                    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                                                        updateConfigField({ accentColor: e.target.value });
                                                    }
                                                }}
                                                placeholder="#3B82F6"
                                                className="bg-black/60 border border-white/5 focus:border-white/10 rounded-xl px-3 py-2 text-[12px] text-neutral-200 placeholder-neutral-600 focus:outline-none w-28 uppercase"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleGeneratePalette(config.accentColor)}
                                                className="px-3 py-2 rounded-xl bg-neutral-900 border border-white/5 text-[11.5px] text-neutral-300 font-bold hover:bg-neutral-800"
                                            >
                                                Auto-Generate Palette
                                            </button>
                                        </div>
                                    </div>

                                    {/* Secondary Picker */}
                                    <div>
                                        <label className="text-[11.5px] font-bold text-neutral-400 block mb-2">Accent Secondary Color</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={config.secondaryColor}
                                                onChange={(e) => {
                                                    updateConfigField({ secondaryColor: e.target.value });
                                                }}
                                                className="w-10 h-10 rounded-xl border border-white/10 bg-transparent cursor-pointer overflow-hidden p-0"
                                            />
                                            <input
                                                type="text"
                                                value={config.secondaryColor.toUpperCase()}
                                                onChange={(e) => {
                                                    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                                                        updateConfigField({ secondaryColor: e.target.value });
                                                    }
                                                }}
                                                placeholder="#60A5FA"
                                                className="bg-black/60 border border-white/5 focus:border-white/10 rounded-xl px-3 py-2 text-[12px] text-neutral-200 placeholder-neutral-600 focus:outline-none w-28 uppercase"
                                            />
                                        </div>
                                    </div>

                                    {/* Gradient Accent Flag */}
                                    <div className="flex items-center justify-between p-3.5 bg-neutral-950/40 rounded-xl border border-white/5">
                                        <div>
                                            <span className="text-[12px] font-black text-neutral-200 block">Gradient accents on bubbles & panels</span>
                                            <span className="text-[10px] text-neutral-500 block mt-0.5">Fuses primary and secondary accents into smooth linear CSS gradients.</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => updateConfigField({ isGradientAccent: !config.isGradientAccent })}
                                            className={clsx(
                                                "w-12 h-6.5 rounded-full p-0.5 transition-colors relative flex items-center",
                                                config.isGradientAccent ? "bg-[var(--v-accent,#3B82F6)] justify-end" : "bg-neutral-800 justify-start"
                                            )}
                                        >
                                            <span className="w-5.5 h-5.5 rounded-full bg-white shadow" />
                                        </button>
                                    </div>

                                    {config.isGradientAccent && (
                                        <div>
                                            <div className="flex justify-between text-[11px] font-bold text-neutral-400 mb-1.5">
                                                <span>Gradient Linear Angle</span>
                                                <span>{config.gradientAngle}°</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="360"
                                                value={config.gradientAngle}
                                                onChange={(e) => updateConfigField({ gradientAngle: parseInt(e.target.value) })}
                                                className="w-full accent-[var(--v-accent,#3B82F6)] bg-neutral-800 h-1 rounded"
                                            />
                                        </div>
                                    )}

                                </div>
                            </div>

                        </div>
                    )}

                    {/* TAB: GLASS */}
                    {activeTab === 'glass' && (
                        <div className="space-y-6">
                            
                            {/* Glass Opacity and Blur Controls */}
                            <div className="bg-[#0D0D0D]/60 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
                                <h3 className="text-[13px] font-black text-white uppercase tracking-wider mb-4">Frosted Glass Density Controls</h3>
                                <div className="space-y-4">
                                    {/* Opacity */}
                                    <div>
                                        <div className="flex justify-between text-[11px] font-bold text-neutral-400 mb-1.5">
                                            <span>Glass Surface Opacity</span>
                                            <span>{Math.round(config.glassOpacity * 100)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="5"
                                            max="90"
                                            value={config.glassOpacity * 100}
                                            onChange={(e) => updateConfigField({ glassOpacity: parseFloat(e.target.value) / 100 })}
                                            className="w-full accent-[var(--v-accent,#3B82F6)] bg-neutral-800 h-1 rounded"
                                        />
                                    </div>

                                    {/* Blur */}
                                    <div>
                                        <div className="flex justify-between text-[11px] font-bold text-neutral-400 mb-1.5">
                                            <span>Layer blur amount</span>
                                            <span>{config.glassBlur}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="64"
                                            value={config.glassBlur}
                                            onChange={(e) => updateConfigField({ glassBlur: parseInt(e.target.value) })}
                                            className="w-full accent-[var(--v-accent,#3B82F6)] bg-neutral-800 h-1 rounded"
                                        />
                                    </div>

                                    {/* Border Brightness */}
                                    <div>
                                        <div className="flex justify-between text-[11px] font-bold text-neutral-400 mb-1.5">
                                            <span>Glass Edge highlight / border opacity</span>
                                            <span>{Math.round(config.glassBorderBrightness * 100)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="40"
                                            value={config.glassBorderBrightness * 100}
                                            onChange={(e) => updateConfigField({ glassBorderBrightness: parseFloat(e.target.value) / 100 })}
                                            className="w-full accent-[var(--v-accent,#3B82F6)] bg-neutral-800 h-1 rounded"
                                        />
                                    </div>

                                    {/* Glow Strength */}
                                    <div>
                                        <div className="flex justify-between text-[11px] font-bold text-neutral-400 mb-1.5">
                                            <span>Glass Highlight glow strength</span>
                                            <span>{config.glassGlowStrength}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="30"
                                            value={config.glassGlowStrength}
                                            onChange={(e) => updateConfigField({ glassGlowStrength: parseInt(e.target.value) })}
                                            className="w-full accent-[var(--v-accent,#3B82F6)] bg-neutral-800 h-1 rounded"
                                        />
                                    </div>

                                    {/* Depth Level */}
                                    <div>
                                        <div className="flex justify-between text-[11px] font-bold text-neutral-400 mb-1.5">
                                            <span>Glass Depth / Ambient shadows hierarchy</span>
                                            <span>Level {config.glassDepth}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="5"
                                            value={config.glassDepth}
                                            onChange={(e) => updateConfigField({ glassDepth: parseInt(e.target.value) })}
                                            className="w-full accent-[var(--v-accent,#3B82F6)] bg-neutral-800 h-1 rounded"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Corner Profile Selection */}
                            <div className="bg-[#0D0D0D]/60 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
                                <h3 className="text-[13px] font-black text-white uppercase tracking-wider mb-4">Corner Geometry Engine</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    {[
                                        { id: 'sharp', name: 'Sharp (0px)', desc: 'Windows Classic' },
                                        { id: 'developer', name: 'Developer (4px)', desc: 'Coding terminals' },
                                        { id: 'discord', name: 'Discord (8px)', desc: 'Gamers default' },
                                        { id: 'windows11', name: 'Windows 11 (11px)', desc: 'Modern system shell' },
                                        { id: 'apple', name: 'Apple (14px)', desc: 'Squircle macOS standard' },
                                        { id: 'rounded', name: 'Rounded (12px)', desc: 'Standard curvature' },
                                        { id: 'ultra_rounded', name: 'Ultra (28px)', desc: 'Extra bubbly surfaces' },
                                        { id: 'custom', name: 'Custom Radius', desc: 'Set slider below' }
                                    ].map((cStyle) => {
                                        const active = config.cornerProfile === cStyle.id;
                                        return (
                                            <button
                                                key={cStyle.id}
                                                type="button"
                                                onClick={() => updateConfigField({ cornerProfile: cStyle.id as any })}
                                                className={clsx(
                                                    "p-2.5 rounded-xl border text-left transition-all active:scale-[0.98]",
                                                    active ? "border-[var(--v-accent,#3B82F6)] bg-white/[0.02]" : "border-white/5 bg-neutral-950/40 hover:border-white/10"
                                                )}
                                            >
                                                <span className="text-[11.5px] font-black text-white block">{cStyle.name}</span>
                                                <span className="text-[9.5px] text-neutral-500 block leading-tight mt-0.5">{cStyle.desc}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {config.cornerProfile === 'custom' && (
                                    <div className="mt-4 pt-4 border-t border-white/5">
                                        <div className="flex justify-between text-[11px] font-bold text-neutral-400 mb-1.5">
                                            <span>Custom Border Radius Value</span>
                                            <span>{config.cornerCustomRadius}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="32"
                                            value={config.cornerCustomRadius}
                                            onChange={(e) => updateConfigField({ cornerCustomRadius: parseInt(e.target.value) })}
                                            className="w-full accent-[var(--v-accent,#3B82F6)] bg-neutral-800 h-1 rounded"
                                        />
                                    </div>
                                )}
                            </div>

                        </div>
                    )}

                    {/* TAB: BACKGROUND */}
                    {activeTab === 'background' && (
                        <div className="space-y-6">
                            
                            {/* Canvas Background modes */}
                            <div className="bg-[#0D0D0D]/60 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[13px] font-black text-white uppercase tracking-wider">Visual Background Canvas Modes</h3>
                                    <button
                                        type="button"
                                        onClick={() => setIsPlayingBg(!isPlayingBg)}
                                        className="text-[11px] font-bold text-neutral-400 hover:text-white flex items-center gap-1.5 bg-neutral-900 border border-white/5 px-2 py-1 rounded"
                                    >
                                        {isPlayingBg ? <Pause size={10} /> : <Play size={10} />}
                                        {isPlayingBg ? 'Freeze Animation' : 'Animate preview'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {[
                                        { id: 'static', name: 'Solid Canvas', desc: 'Flat background' },
                                        { id: 'gradient', name: 'Linear Gradient', desc: 'Preset gradients' },
                                        { id: 'animated-gradient', name: 'Shifting Linear', desc: 'Slow color transition' },
                                        { id: 'mesh-gradient', name: 'Mesh Gradient', desc: 'Dynamic color meshes' },
                                        { id: 'aurora', name: 'Aurora Shifting', desc: 'Organic light waves' },
                                        { id: 'particles', name: 'Space Motes', desc: 'Twinkling particles' },
                                        { id: 'constellation', name: 'Constellations', desc: 'Connected lines grid' },
                                        { id: 'nebula', name: 'Nebula Cloud', desc: 'Ambient dust' },
                                        { id: 'liquid', name: 'Organic Liquid', desc: 'Morphing blobs' }
                                    ].map((bgStyle) => {
                                        const active = config.bgMode === bgStyle.id;
                                        return (
                                            <button
                                                key={bgStyle.id}
                                                type="button"
                                                onClick={() => updateConfigField({ bgMode: bgStyle.id as any })}
                                                className={clsx(
                                                    "p-2.5 rounded-xl border text-left transition-all active:scale-[0.98]",
                                                    active ? "border-[var(--v-accent,#3B82F6)] bg-white/[0.02]" : "border-white/5 bg-neutral-950/40 hover:border-white/10"
                                                )}
                                            >
                                                <span className="text-[11.5px] font-black text-white block">{bgStyle.name}</span>
                                                <span className="text-[9.5px] text-neutral-500 block leading-tight mt-0.5">{bgStyle.desc}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                
                                {config.bgMode === 'gradient' && (
                                    <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                                        <span className="text-[11px] font-bold text-neutral-400 block">Gradient Custom Palette Colors</span>
                                        <div className="flex gap-2.5">
                                            {config.bgCustomColors.map((color, idx) => (
                                                <input
                                                    key={idx}
                                                    type="color"
                                                    value={color}
                                                    onChange={(e) => {
                                                        const copy = [...config.bgCustomColors];
                                                        copy[idx] = e.target.value;
                                                        updateConfigField({ bgCustomColors: copy });
                                                    }}
                                                    className="w-10 h-10 rounded-xl border border-white/10 bg-transparent cursor-pointer overflow-hidden p-0"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    )}

                    {/* TAB: TYPOGRAPHY & MOTION */}
                    {activeTab === 'typography' && (
                        <div className="space-y-6">
                            
                            {/* Advanced Typography Options */}
                            <div className="bg-[#0D0D0D]/60 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
                                <h3 className="text-[13px] font-black text-white uppercase tracking-wider mb-4">Typography Layout Controls</h3>
                                <div className="space-y-4">
                                    {/* Font scale dropdown */}
                                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                                        <div>
                                            <span className="text-[12.5px] font-black text-neutral-200 block">Typography Scaling</span>
                                            <span className="text-[10px] text-neutral-500 block mt-0.5">Increases base shell font scale proportionally.</span>
                                        </div>
                                        <select
                                            value={config.fontScale}
                                            onChange={(e) => updateConfigField({ fontScale: e.target.value as any })}
                                            className="bg-black/60 border border-white/5 rounded-xl px-3 py-2 text-[12px] text-neutral-300 focus:outline-none cursor-pointer"
                                        >
                                            <option value="small">Small (13px)</option>
                                            <option value="default">Default (15px)</option>
                                            <option value="large">Large (17.5px)</option>
                                            <option value="extra_large">Extra Large (19px)</option>
                                            <option value="reading">Warm Reader (18px)</option>
                                            <option value="developer">Developer Layout (13.5px)</option>
                                        </select>
                                    </div>

                                    {/* Font Spacing */}
                                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                                        <div>
                                            <span className="text-[12.5px] font-black text-neutral-200 block">Letter Spacing</span>
                                        </div>
                                        <select
                                            value={config.fontLetterSpacing}
                                            onChange={(e) => updateConfigField({ fontLetterSpacing: e.target.value as any })}
                                            className="bg-black/60 border border-white/5 rounded-xl px-3 py-2 text-[12px] text-neutral-300 focus:outline-none cursor-pointer"
                                        >
                                            <option value="tight">Tight</option>
                                            <option value="normal">Normal</option>
                                            <option value="wide">Wide</option>
                                        </select>
                                    </div>

                                    {/* Font Line Height */}
                                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                                        <div>
                                            <span className="text-[12.5px] font-black text-neutral-200 block">Line Spacing (Height)</span>
                                        </div>
                                        <select
                                            value={config.fontLineHeight}
                                            onChange={(e) => updateConfigField({ fontLineHeight: e.target.value as any })}
                                            className="bg-black/60 border border-white/5 rounded-xl px-3 py-2 text-[12px] text-neutral-300 focus:outline-none cursor-pointer"
                                        >
                                            <option value="snug">Snug</option>
                                            <option value="normal">Normal</option>
                                            <option value="loose">Loose</option>
                                        </select>
                                    </div>

                                    {/* Font weight scale */}
                                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                                        <div>
                                            <span className="text-[12.5px] font-black text-neutral-200 block">Font Weight Multiplier</span>
                                        </div>
                                        <select
                                            value={config.fontWeightScale}
                                            onChange={(e) => updateConfigField({ fontWeightScale: e.target.value as any })}
                                            className="bg-black/60 border border-white/5 rounded-xl px-3 py-2 text-[12px] text-neutral-300 focus:outline-none cursor-pointer"
                                        >
                                            <option value="light">Lightweight</option>
                                            <option value="normal">Normal</option>
                                            <option value="medium">Medium Bold</option>
                                            <option value="bold">Heavy Bold</option>
                                        </select>
                                    </div>

                                    {/* Font Style selection */}
                                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                                        <div>
                                            <span className="text-[12.5px] font-black text-neutral-200 block">Font Style Family</span>
                                        </div>
                                        <select
                                            value={config.fontFamilyStyle}
                                            onChange={(e) => updateConfigField({ fontFamilyStyle: e.target.value as any })}
                                            className="bg-black/60 border border-white/5 rounded-xl px-3 py-2 text-[12px] text-neutral-300 focus:outline-none cursor-pointer"
                                        >
                                            <option value="sans">Modern Sans-Serif</option>
                                            <option value="serif">Classic Editorial Serif</option>
                                            <option value="mono">Developer Mono</option>
                                            <option value="dyslexic">Dyslexia-Friendly</option>
                                        </select>
                                    </div>

                                    {/* Rounded corners on fonts toggle */}
                                    <div className="flex items-center justify-between py-2">
                                        <div>
                                            <span className="text-[12.5px] font-black text-neutral-200 block">Soft Round Typography</span>
                                            <span className="text-[10px] text-neutral-500 block mt-0.5">Enforces rounded lettering (Plus Jakarta Sans).</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => updateConfigField({ fontRounded: !config.fontRounded })}
                                            className={clsx(
                                                "w-12 h-6.5 rounded-full p-0.5 transition-colors relative flex items-center",
                                                config.fontRounded ? "bg-[var(--v-accent,#3B82F6)] justify-end" : "bg-neutral-800 justify-start"
                                            )}
                                        >
                                            <span className="w-5.5 h-5.5 rounded-full bg-white shadow" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Animation Profiles selection */}
                            <div className="bg-[#0D0D0D]/60 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
                                <h3 className="text-[13px] font-black text-white uppercase tracking-wider mb-4">Visual Motion Profiles</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {[
                                        { id: 'none', name: 'None', desc: 'No animations' },
                                        { id: 'minimal', name: 'Minimal', desc: 'Subtle transitions' },
                                        { id: 'balanced', name: 'Balanced', desc: 'Default smooth springs' },
                                        { id: 'expressive', name: 'Expressive', desc: 'Tactile responsive snaps' },
                                        { id: 'luxury', name: 'Luxury Motion', desc: 'Calibrated slow curves' },
                                        { id: 'gaming', name: 'Gaming FPS', desc: 'Instant micro fades' },
                                        { id: 'performance', name: 'High Perf', desc: 'GPU low-load fades' },
                                        { id: 'accessibility', name: 'Accessible', desc: 'Motion reduction force' }
                                    ].map((aProfile) => {
                                        const active = config.animationProfile === aProfile.id;
                                        return (
                                            <button
                                                key={aProfile.id}
                                                type="button"
                                                onClick={() => {
                                                    updateConfigField({ 
                                                        animationProfile: aProfile.id as any,
                                                        accessibilityMotionReduce: aProfile.id === 'none' || aProfile.id === 'accessibility'
                                                    });
                                                }}
                                                className={clsx(
                                                    "p-2.5 rounded-xl border text-left transition-all active:scale-[0.98]",
                                                    active ? "border-[var(--v-accent,#3B82F6)] bg-white/[0.02]" : "border-white/5 bg-neutral-950/40 hover:border-white/10"
                                                )}
                                            >
                                                <span className="text-[11.5px] font-black text-white block">{aProfile.name}</span>
                                                <span className="text-[9.5px] text-neutral-500 block leading-tight mt-0.5">{aProfile.desc}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>
                    )}

                    {/* TAB: ACCESSIBILITY & SYNC */}
                    {activeTab === 'access' && (
                        <div className="space-y-6">
                            
                            {/* Accessibility Controls */}
                            <div className="bg-[#0D0D0D]/60 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
                                <h3 className="text-[13px] font-black text-white uppercase tracking-wider mb-4">Accessibility Adjustments</h3>
                                <div className="space-y-4">
                                    {/* High Contrast */}
                                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                                        <div>
                                            <span className="text-[12.5px] font-black text-neutral-200 block">High Contrast Boost</span>
                                            <span className="text-[10px] text-neutral-500 block mt-0.5">Maximizes border values and scales element readability.</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => toggleHighContrast(!config.accessibilityHighContrast)}
                                            className={clsx(
                                                "w-12 h-6.5 rounded-full p-0.5 transition-colors relative flex items-center",
                                                config.accessibilityHighContrast ? "bg-[var(--v-accent,#3B82F6)] justify-end" : "bg-neutral-800 justify-start"
                                            )}
                                        >
                                            <span className="w-5.5 h-5.5 rounded-full bg-white shadow" />
                                        </button>
                                    </div>

                                    {/* Motion Reduce */}
                                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                                        <div>
                                            <span className="text-[12.5px] font-black text-neutral-200 block">Motion Reduction</span>
                                            <span className="text-[10px] text-neutral-500 block mt-0.5">Freezes layout springs and high load canvas calculations.</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => toggleReduceMotion(!config.accessibilityMotionReduce)}
                                            className={clsx(
                                                "w-12 h-6.5 rounded-full p-0.5 transition-colors relative flex items-center",
                                                config.accessibilityMotionReduce ? "bg-[var(--v-accent,#3B82F6)] justify-end" : "bg-neutral-800 justify-start"
                                            )}
                                        >
                                            <span className="w-5.5 h-5.5 rounded-full bg-white shadow" />
                                        </button>
                                    </div>

                                    {/* Color Blind Selection */}
                                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                                        <div>
                                            <span className="text-[12.5px] font-black text-neutral-200 block">Color Blind Filter Adjustment</span>
                                            <span className="text-[10px] text-neutral-500 block mt-0.5">Applies real-time SVG matrix overlay filters.</span>
                                        </div>
                                        <select
                                            value={config.accessibilityColorBlind}
                                            onChange={(e) => updateConfigField({ accessibilityColorBlind: e.target.value as any })}
                                            className="bg-black/60 border border-white/5 rounded-xl px-3 py-2 text-[12px] text-neutral-300 focus:outline-none cursor-pointer"
                                        >
                                            <option value="none">None (Standard)</option>
                                            <option value="protanopia">Protanopia (Red-Blind)</option>
                                            <option value="deuteranopia">Deuteranopia (Green-Blind)</option>
                                            <option value="tritanopia">Tritanopia (Blue-Blind)</option>
                                            <option value="achromatopsia">Achromatopsia (Monochrome)</option>
                                        </select>
                                    </div>

                                    {/* Large Click Targets */}
                                    <div className="flex items-center justify-between py-2">
                                        <div>
                                            <span className="text-[12.5px] font-black text-neutral-200 block">Enlarged Click Targets</span>
                                            <span className="text-[10px] text-neutral-500 block mt-0.5">Ensures tap regions satisfy accessibility standards.</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => updateConfigField({ accessibilityLargeClickTargets: !config.accessibilityLargeClickTargets })}
                                            className={clsx(
                                                "w-12 h-6.5 rounded-full p-0.5 transition-colors relative flex items-center",
                                                config.accessibilityLargeClickTargets ? "bg-[var(--v-accent,#3B82F6)] justify-end" : "bg-neutral-800 justify-start"
                                            )}
                                        >
                                            <span className="w-5.5 h-5.5 rounded-full bg-white shadow" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Sync Preferences */}
                            <div className="bg-[#0D0D0D]/60 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
                                <h3 className="text-[13px] font-black text-white uppercase tracking-wider mb-4">Device Cloud Sync Modes</h3>
                                <div className="space-y-3">
                                    {[
                                        { id: 'cross-device', name: 'Sync Across All Devices', desc: 'Updates will instantly replicate via cloud metadata to your mobile and desktop instances.' },
                                        { id: 'local-only', name: 'Local Device Only', desc: 'Styles are saved strictly to local localStorage cache. Prevents overwrite on other screens.' },
                                        { id: 'mobile-desktop-independent', name: 'Mobile / Desktop Independent', desc: 'Allows unique configurations. Automatically isolates mobile styling presets.' }
                                    ].map((sPref) => {
                                        const active = config.syncPreference === sPref.id;
                                        return (
                                            <button
                                                key={sPref.id}
                                                type="button"
                                                onClick={() => updateConfigField({ syncPreference: sPref.id as any })}
                                                className={clsx(
                                                    "w-full p-3 rounded-xl border text-left transition-all active:scale-[0.99] flex items-start gap-3",
                                                    active ? "border-[var(--v-accent,#3B82F6)] bg-white/[0.02]" : "border-white/5 bg-neutral-950/40 hover:border-white/10"
                                                )}
                                            >
                                                <div className="mt-0.5">
                                                    {active ? (
                                                        <Cloud className="text-[var(--v-accent,#3B82F6)] w-4 h-4" />
                                                    ) : (
                                                        <Monitor className="text-neutral-500 w-4 h-4" />
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="text-[12px] font-black text-white block">{sPref.name}</span>
                                                    <span className="text-[10px] text-neutral-500 block leading-relaxed mt-0.5">{sPref.desc}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>
                    )}

                </div>

            </div>

            {/* RIGHT LIVE PREVIEW PANEL */}
            <div className="w-full xl:max-w-[35%] xl:sticky xl:top-6 bg-black/60 border border-white/5 rounded-3xl p-5 backdrop-blur-xl relative overflow-hidden shadow-[0_12px_50px_rgba(0,0,0,0.8)]">
                
                {/* Dynamic Canvas Background */}
                <canvas 
                    ref={canvasRef} 
                    className="absolute inset-0 w-full h-full pointer-events-none z-0" 
                    style={{ mixBlendMode: 'normal' }}
                />
                
                {/* Soft Vignette Overlay */}
                <div className="absolute inset-0 bg-black/30 pointer-events-none z-0" />

                {/* Content Overlay */}
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2.5">
                        <span className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                            <Monitor size={12} className="text-[var(--v-accent,#3B82F6)]" />
                            Live Workspace Preview
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                        </div>
                    </div>

                    {/* Miniature Mock Interface */}
                    <div 
                        className="w-full bg-[#050508]/85 border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[320px] transition-all"
                        style={{
                            borderRadius: config.cornerProfile === 'sharp' ? '0px' : 
                                          config.cornerProfile === 'developer' ? '4px' :
                                          config.cornerProfile === 'apple' ? '18px' : '12px'
                        }}
                    >
                        {/* Mock header bar */}
                        <div className="h-10 bg-black/65 border-b border-white/5 flex items-center justify-between px-3">
                            <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded bg-white/10 flex items-center justify-center text-[8px] font-black text-white">V</span>
                                <span className="text-[9.5px] font-bold text-neutral-300">Verlyn Client Shell</span>
                            </div>
                            <span className="text-[8.5px] text-neutral-500">12:00 PM</span>
                        </div>

                        {/* Core body split */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Left mock sidebar */}
                            <div className="w-14 bg-black/30 border-r border-white/5 p-1.5 flex flex-col gap-1 items-center">
                                <span className="w-7 h-7 rounded-lg bg-[var(--v-accent,#3B82F6)]/10 text-[var(--v-accent,#3B82F6)] flex items-center justify-center text-[9px] font-bold">
                                    💬
                                </span>
                                <span className="w-7 h-7 rounded-lg bg-neutral-900 text-neutral-500 flex items-center justify-center text-[9px]">
                                    🧭
                                </span>
                                <span className="w-7 h-7 rounded-lg bg-neutral-900 text-neutral-500 flex items-center justify-center text-[9px]">
                                    🔔
                                </span>
                                <span className="w-7 h-7 rounded-lg bg-neutral-900 text-neutral-500 flex items-center justify-center text-[9px] mt-auto">
                                    ⚙️
                                </span>
                            </div>

                            {/* Mock chat workspace */}
                            <div className="flex-1 flex flex-col bg-transparent p-2.5 justify-between">
                                {/* Conversation stream */}
                                <div className="space-y-2">
                                    {/* Received message */}
                                    <div className="flex items-start gap-1.5">
                                        <span className="w-4.5 h-4.5 rounded-full bg-blue-500/20 text-[7px] flex items-center justify-center font-bold">S</span>
                                        <div 
                                            className="p-2 rounded-xl text-[10px] leading-snug max-w-[80%]"
                                            style={{
                                                background: `rgba(255, 255, 255, ${config.glassOpacity})`,
                                                backdropFilter: `blur(${config.glassBlur}px)`,
                                                border: `1px solid rgba(255, 255, 255, ${config.glassBorderBrightness})`,
                                                color: '#ffffff',
                                                borderRadius: config.cornerProfile === 'sharp' ? '0px' : '10px'
                                            }}
                                        >
                                            <p className="font-medium text-neutral-200">How does the new glass layout density look to you?</p>
                                        </div>
                                    </div>

                                    {/* Sent message */}
                                    <div className="flex items-start gap-1.5 justify-end">
                                        <div 
                                            className="p-2 rounded-xl text-[10px] leading-snug max-w-[80%] text-right font-bold"
                                            style={{
                                                background: config.isGradientAccent 
                                                    ? `linear-gradient(${config.gradientAngle}deg, ${config.accentColor}, ${config.secondaryColor})` 
                                                    : config.accentColor,
                                                color: '#ffffff',
                                                borderRadius: config.cornerProfile === 'sharp' ? '0px' : '10px'
                                            }}
                                        >
                                            <p>Absolutely stunning. Real-time updates feel premium!</p>
                                        </div>
                                        <span className="w-4.5 h-4.5 rounded-full bg-white/20 text-[7px] flex items-center justify-center font-bold">Me</span>
                                    </div>
                                </div>

                                {/* Mock input bar */}
                                <div 
                                    className="bg-black/50 border border-white/5 p-1.5 flex items-center justify-between"
                                    style={{
                                        borderRadius: config.cornerProfile === 'sharp' ? '0px' : '8px'
                                    }}
                                >
                                    <span className="text-[9px] text-neutral-600 px-1">Write premium response...</span>
                                    <button 
                                        type="button" 
                                        className="px-2 py-0.5 rounded text-[8px] font-bold text-white"
                                        style={{ backgroundColor: config.accentColor }}
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preview details metadata */}
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-2 text-[11px] text-neutral-400">
                        <div className="flex justify-between">
                            <span>Selected Preset Theme:</span>
                            <span className="font-black text-white">{activeThemeObj.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Current Background:</span>
                            <span className="font-bold text-neutral-200 uppercase">{config.bgMode}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Corner Radius Profile:</span>
                            <span className="font-bold text-neutral-200 uppercase">{config.cornerProfile}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Motion Timing:</span>
                            <span className="font-bold text-neutral-200 uppercase">{config.animationProfile}</span>
                        </div>
                    </div>
                </div>

            </div>

            <Toast show={toast.show} message={toast.message} type={toast.type} />
        </div>
    );
}
