'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { SettingsSection, SettingsRow, SettingsInput, SettingsTextarea, SettingsSelect, ModalSystem, SettingsToggle, Toast } from '../components';
import { 
    BookOpen, Mail, FileText, Activity, ShieldCheck, Terminal, 
    Loader2, Cpu, Monitor, Clock, Bug, CheckCircle2, Battery, Globe
} from 'lucide-react';

function DiagnosticCard({
    label,
    value,
    icon: Icon,
    color
}: {
    label: string;
    value: string;
    icon: any;
    color: string;
}) {
    return (
        <motion.div
            whileHover={{ 
                scale: 1.02, 
                borderColor: "rgba(255,255,255,0.12)",
                boxShadow: "0 12px 30px rgba(0,0,0,0.35)"
            }}
            className="p-4 rounded-2xl flex flex-col justify-between gap-3 transition-colors cursor-default"
            style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                backdropFilter: "blur(12px)",
                minHeight: "105px"
            }}
        >
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider select-none">{label}</span>
                <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center border"
                    style={{
                        background: `${color}12`,
                        borderColor: `${color}25`,
                        color: color
                    }}
                >
                    <Icon size={13} />
                </div>
            </div>
            <div className="flex items-baseline justify-between mt-1">
                <span className="font-mono text-[12.5px] text-neutral-100 font-semibold truncate max-w-full">{value}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0 ml-1.5" />
            </div>
        </motion.div>
    );
}

export default function SupportSettings() {
    const currentUser = useAppStore(s => s.currentUser);
    const setUser = useAppStore(s => s.setUser);
    const userId = currentUser?.id || 'guest';
    const [tickets, setTickets] = useState<{ id: string; category: string; subject: string; desc: string; date: string; status: string; diagnostics?: any }[]>([]);

    const [showReportModal, setShowReportModal] = useState(false);
    const [reportCategory, setReportCategory] = useState('ui');
    const [reportSubject, setReportSubject] = useState('');
    const [reportDesc, setReportDesc] = useState('');
    const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

    const syncSupportMetadata = async (updates: Record<string, any>) => {
        if (!currentUser) return;
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        
        const newMetadata = {
            ...(currentUser.metadata || {}),
            ...updates
        };

        const { error } = await supabase.auth.updateUser({
            data: newMetadata
        });

        if (!error) {
            setUser({
                ...currentUser,
                metadata: newMetadata
            });
        }
    };

    useEffect(() => {
        if (!currentUser?.id) return;
        const metadata = currentUser.metadata || {};
        const savedTickets = metadata.support_tickets || JSON.parse(localStorage.getItem(`verlyn_${userId}_tickets`) || '[]');
        setTickets(savedTickets);
    }, [currentUser?.id, userId]);

    // Live diagnostics
    const [diagnostics, setDiagnostics] = useState({
        browser: 'Detecting...',
        os: 'Detecting...',
        screenSize: 'Detecting...',
        cookies: 'Detecting...',
        battery: 'Detecting...',
        memory: 'Detecting...',
        jsHeap: 'Detecting...',
        timezone: 'Detecting...',
        language: 'Detecting...'
    });

    useEffect(() => {
        const ua = navigator.userAgent;
        let browserName = 'Unknown Browser';
        let osName = 'Unknown OS';

        if (ua.includes('Firefox')) browserName = 'Mozilla Firefox';
        else if (ua.includes('SamsungBrowser')) browserName = 'Samsung Internet';
        else if (ua.includes('OPR') || ua.includes('Opera')) browserName = 'Opera';
        else if (ua.includes('Edg')) browserName = 'Microsoft Edge';
        else if (ua.includes('Chrome')) browserName = 'Google Chrome';
        else if (ua.includes('Safari')) browserName = 'Apple Safari';

        if (ua.includes('Win')) osName = 'Windows OS';
        else if (ua.includes('Mac')) osName = 'macOS';
        else if (/Android/.test(ua)) osName = 'Android OS';
        else if (/iPhone|iPad|iPod/.test(ua)) osName = 'iOS';
        else if (ua.includes('Linux')) osName = 'Linux';

        const ram = (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : 'Not reported';
        const cores = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} logical cores` : '';

        // JS Heap
        const perf = (performance as any).memory;
        const heap = perf ? `${(perf.usedJSHeapSize / (1024 * 1024)).toFixed(1)} MB / ${(perf.jsHeapSizeLimit / (1024 * 1024)).toFixed(0)} MB` : 'N/A';

        setDiagnostics(prev => ({
            ...prev,
            browser: browserName,
            os: osName,
            screenSize: `${window.innerWidth} × ${window.innerHeight}`,
            cookies: navigator.cookieEnabled ? 'Enabled' : 'Disabled',
            memory: `${ram}${cores ? ` / ${cores}` : ''}`,
            jsHeap: heap,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language
        }));

        // Battery
        if ('getBattery' in navigator) {
            (navigator as any).getBattery().then((bat: any) => {
                const level = Math.round(bat.level * 100);
                const state = bat.charging ? '⚡ Charging' : 'Discharging';
                setDiagnostics(prev => ({ ...prev, battery: `${level}% (${state})` }));
            }).catch(() => setDiagnostics(prev => ({ ...prev, battery: 'AC Interface' })));
        } else {
            setDiagnostics(prev => ({ ...prev, battery: 'AC Interface' }));
        }
    }, []);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    const handleReportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reportSubject.trim() || !reportDesc.trim()) {
            showToast('Please complete all report fields', 'error');
            return;
        }
        setIsSubmitting(true);
        await new Promise(resolve => setTimeout(resolve, 1800));
        
        const ticketId = `VR-${Math.floor(100000 + Math.random() * 900000)}`;
        const newTicket = {
            id: ticketId,
            category: reportCategory,
            subject: reportSubject,
            desc: reportDesc,
            date: format(new Date(), 'MMM dd, yyyy HH:mm'),
            status: 'PENDING',
            ...(includeDiagnostics ? { diagnostics } : {})
        };

        const updatedTickets = [newTicket, ...tickets];
        setTickets(updatedTickets);
        localStorage.setItem(`verlyn_${userId}_tickets`, JSON.stringify(updatedTickets));
        await syncSupportMetadata({ support_tickets: updatedTickets });

        setIsSubmitting(false);
        setShowReportModal(false);
        setReportSubject('');
        setReportDesc('');
        showToast(`Bug reported. Ticket: ${ticketId}`);
    };

    return (
        <div className="max-w-2xl animate-fade-in pb-16 space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white mb-1">Help & Diagnostics</h2>
                <p className="text-[13px] text-neutral-500 font-medium">Get platform support, view precise system diagnostics, and report issues.</p>
            </div>

            {/* Bug Report Hero Widget */}
            <div className="p-6 bg-gradient-to-br from-[#0B0B0B] to-[#0d0d0d] border border-white/5 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider">
                            Support Interface
                        </span>
                        <h3 className="text-lg font-bold text-white mt-2">Encountered a bug or issue?</h3>
                        <p className="text-[13px] text-neutral-400 mt-1 max-w-md leading-relaxed">
                            Submit a detailed bug report directly to our support team. Optionally include system diagnostics.
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
                        <Bug size={18} />
                    </div>
                </div>
                <a
                    href="https://verlyn.in/report"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 px-5 py-2.5 rounded-full transition-all mt-2"
                >
                    Report a Problem
                </a>
            </div>

            {/* Help Center */}
            <SettingsSection title="Help Center Documents">
                <SettingsRow
                    icon={BookOpen}
                    title="Help Center & Guides"
                    desc="Search documentation, interface tutorials, and general platform guidelines."
                    variant="navigation"
                    onClick={() => window.open('https://verlyn.in/help', '_blank')}
                />
                <SettingsRow
                    icon={Mail}
                    title="Contact Support Infrastructure"
                    desc="Direct engineering email: helpline@shinken.in"
                    right={
                        <a href="mailto:helpline@shinken.in" className="text-[13px] text-neutral-300 font-semibold bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-colors">
                            Email Support
                        </a>
                    }
                />
            </SettingsSection>

            <SettingsSection title="Legal & Policies">
                <SettingsRow
                    icon={FileText}
                    title="Privacy Policy Agreement"
                    desc="Review data handling and privacy policy."
                    variant="navigation"
                    onClick={() => window.open('https://verlyn.in/privacy', '_blank')}
                />
                <SettingsRow
                    icon={ShieldCheck}
                    title="Terms of Service"
                    desc="Guidelines and rules governing your use of Verlyn."
                    variant="navigation"
                    onClick={() => window.open('https://verlyn.in/terms', '_blank')}
                />
            </SettingsSection>

            {/* Device Diagnostics - Redesigned Grid */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <Activity size={13} className="text-neutral-400" />
                    <h3 className="text-[11px] font-extrabold text-neutral-400 uppercase tracking-[0.12em] select-none">Device Diagnostics</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {[
                        { label: 'Web Engine', icon: Monitor, value: diagnostics.browser, color: '#3b82f6' },
                        { label: 'Base System', icon: Cpu, value: diagnostics.os, color: '#8b5cf6' },
                        { label: 'Viewport Node', icon: Activity, value: diagnostics.screenSize, color: '#ec4899' },
                        { label: 'Timezone', icon: Clock, value: diagnostics.timezone, color: '#f59e0b' },
                        { label: 'Language', icon: Globe, value: diagnostics.language, color: '#14b8a6' },
                        { label: 'Sandbox Cookies', icon: ShieldCheck, value: diagnostics.cookies, color: '#10b981' },
                        { label: 'Battery Status', icon: Battery, value: diagnostics.battery, color: '#f43f5e' },
                        { label: 'System Memory (RAM)', icon: Cpu, value: diagnostics.memory, color: '#ef4444' },
                        { label: 'JS Heap Usage', icon: Terminal, value: diagnostics.jsHeap, color: '#0ea5e9' },
                    ].map(({ label, icon: Icon, value, color }) => (
                        <DiagnosticCard
                            key={label}
                            label={label}
                            value={value}
                            icon={Icon}
                            color={color}
                        />
                    ))}
                </div>
            </div>

            {/* Bug Report Modal */}
            <ModalSystem
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                title="Submit Bug Report"
            >
                <form onSubmit={handleReportSubmit} className="space-y-4">
                    <p className="text-[13px] text-neutral-400 leading-normal">
                        Submit a diagnostics report and explanation. This report is sent to our support team.
                    </p>
                    <SettingsSelect
                        label="Report Category"
                        value={reportCategory}
                        onChange={setReportCategory}
                        options={[
                            { value: 'ui', label: 'UI & Layout Rendering' },
                            { value: 'messaging', label: 'Realtime Messages & Feeds' },
                            { value: 'security', label: '2FA & Access Security' },
                            { value: 'performance', label: 'Latency & Frame Drops' },
                            { value: 'other', label: 'General Bug / Suggestion' }
                        ]}
                    />
                    <SettingsInput
                        label="Subject Description"
                        value={reportSubject}
                        onChange={setReportSubject}
                        placeholder="e.g. Chat window collapses on small-screen Safari"
                    />
                    <SettingsTextarea
                        label="Reproduction Steps & Details"
                        value={reportDesc}
                        onChange={setReportDesc}
                        placeholder="Describe exactly what actions were taken and what error occurred."
                    />
                    <div className="px-4 py-3 flex items-center justify-between border border-white/5 rounded-xl mt-2 bg-white/[0.01]">
                        <div className="flex flex-col">
                            <span className="text-[13px] font-semibold text-neutral-200">Include Diagnostics Dump</span>
                            <span className="text-[11px] text-neutral-500">Includes system info, viewport, and environment details</span>
                        </div>
                        <SettingsToggle checked={includeDiagnostics} onChange={setIncludeDiagnostics} />
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-white/5">
                        <button
                            type="button"
                            onClick={() => setShowReportModal(false)}
                            disabled={isSubmitting}
                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-neutral-300 font-semibold rounded-xl transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <><Loader2 size={16} className="animate-spin" /><span>Submitting...</span></>
                            ) : (
                                <><CheckCircle2 size={16} /><span>Submit Report</span></>
                            )}
                        </button>
                    </div>
                </form>
            </ModalSystem>

            {/* Tickets History List */}
            {tickets.length > 0 && (
                <div className="space-y-2.5">
                    <div className="flex items-center gap-2 px-1">
                        <FileText size={13} className="text-neutral-400" />
                        <h3 className="text-[11px] font-extrabold text-neutral-400 uppercase tracking-[0.12em] select-none">Submitted Bug Reports</h3>
                    </div>
                    <div className="bg-[#0f0f0f] rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
                        {tickets.map(ticket => (
                            <div key={ticket.id} className="p-4 space-y-2 hover:bg-white/[0.01] transition-colors animate-fade-in">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-[12px] font-bold text-neutral-200">{ticket.id}</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-400 capitalize">
                                            {ticket.category === 'ui' ? 'UI & Layout' : ticket.category === 'messaging' ? 'Messaging' : ticket.category === 'security' ? 'Security' : ticket.category === 'performance' ? 'Performance' : 'General'}
                                        </span>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-black tracking-wider uppercase ${
                                        ticket.status === 'RESOLVED' 
                                            ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400' 
                                            : ticket.status === 'INVESTIGATING' 
                                                ? 'bg-amber-500/15 border border-amber-500/20 text-amber-400' 
                                                : 'bg-blue-500/15 border border-blue-500/20 text-blue-400'
                                    }`}>
                                        {ticket.status}
                                    </span>
                                </div>
                                <h4 className="text-[13px] font-semibold text-white">{ticket.subject}</h4>
                                <p className="text-[12px] text-neutral-400 leading-relaxed">{ticket.desc}</p>
                                <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1">
                                    <span>Submitted: {ticket.date}</span>
                                    {ticket.diagnostics && (
                                        <span className="text-[9px] font-mono text-neutral-600">diagnostics snapshot included</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Toast show={toast.show} message={toast.message} type={toast.type} />
        </div>
    );
}
