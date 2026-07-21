'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { SettingsSection, SettingsButton, ModalSystem, Toast } from '../components';
import { checkMyDetailedRestrictionsDB, submitDetailedAppealDB } from '@/app/(main)/messages/actions';
import { 
    ShieldCheck, 
    ShieldAlert, 
    AlertTriangle, 
    Clock, 
    Send, 
    Info, 
    Gavel
} from 'lucide-react';
import clsx from 'clsx';

interface Strike {
    id: string;
    type: string;
    description: string;
    date: string;
    contentPreview?: string;
    status: 'active' | 'appealed' | 'expired' | 'resolved';
    appealDetails?: string;
    appealDate?: string;
}

export default function AccountStatusSettings() {
    const currentUser = useAppStore(s => s.currentUser);
    const [strikes, setStrikes] = useState<Strike[]>([]);
    const [activeRestrictions, setActiveRestrictions] = useState<any[]>([]);
    const [offenseCount, setOffenseCount] = useState(0);
    const [needsManualReview, setNeedsManualReview] = useState(false);
    const [loading, setLoading] = useState(true);

    const [selectedStrike, setSelectedStrike] = useState<Strike | null>(null);
    const [appealText, setAppealText] = useState('');
    const [appealLoading, setAppealLoading] = useState(false);
    const [showAppealModal, setShowAppealModal] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

    const fetchStatus = async () => {
        if (!currentUser?.id) return;
        setLoading(true);
        const res = await checkMyDetailedRestrictionsDB();
        if (res.success && res.data) {
            const data = res.data;
            setOffenseCount(data.offenseCount);
            setNeedsManualReview(data.needsManualReview);
            setActiveRestrictions(data.activeRestrictions || []);

            // Build strikes list from history
            const history = data.history || [];
            
            // Map history events to UI Strikes
            const strikesList: Strike[] = [];

            // Helper to check if a strike has been appealed in history
            // We search if there's any 'appeal_submitted' action logged after this strike
            const getStrikeStatus = (action: any, idx: number): 'active' | 'appealed' | 'expired' | 'resolved' => {
                const strikeTime = new Date(action.created_at).getTime();
                
                // Find if an appeal was submitted for this level/strike later in the history
                const hasAppeal = history.some((h: any) => 
                    h.action_type === 'appeal_submitted' && 
                    new Date(h.created_at).getTime() > strikeTime
                );

                if (hasAppeal) return 'appealed';

                if (action.action_type === 'warning') {
                    // Warnings expire in 90 days
                    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
                    if (Date.now() - strikeTime > ninetyDays) {
                        return 'expired';
                    }
                    return 'active';
                }

                if (action.action_type === 'restriction') {
                    const expiresAt = action.details?.expires_at;
                    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
                        return 'expired';
                    }
                    return 'active';
                }

                return 'expired';
            };

            const getAppealInfo = (action: any) => {
                const strikeTime = new Date(action.created_at).getTime();
                const appeal = history.find((h: any) => 
                    h.action_type === 'appeal_submitted' && 
                    new Date(h.created_at).getTime() > strikeTime
                );
                if (appeal) {
                    return {
                        appealDetails: appeal.reason.replace('Appeal submitted: ', ''),
                        appealDate: new Date(appeal.created_at).toISOString().split('T')[0]
                    };
                }
                return {};
            };

            history.forEach((action: any, idx: number) => {
                if (action.action_type === 'warning' || action.action_type === 'restriction') {
                    const status = getStrikeStatus(action, idx);
                    const appealInfo = getAppealInfo(action);

                    strikesList.push({
                        id: action.id,
                        type: action.action_type === 'warning' 
                            ? 'Guidelines Warning' 
                            : `Guidelines Restriction Level ${action.offense_level}`,
                        description: action.reason,
                        date: new Date(action.created_at).toISOString().split('T')[0],
                        status,
                        ...appealInfo
                    });
                }
            });

            setStrikes(strikesList);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchStatus();
    }, [currentUser?.id]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    const handleOpenAppeal = (strike: Strike) => {
        if (strike.status !== 'active') return;
        setSelectedStrike(strike);
        setAppealText('');
        setShowAppealModal(true);
    };

    const handleSubmitAppeal = async () => {
        if (!currentUser?.id || !selectedStrike || !appealText.trim()) return;

        setAppealLoading(true);
        const res = await submitDetailedAppealDB(appealText);

        if (res.success) {
            showToast('Appeal request submitted to safety team');
            await fetchStatus(); // Reload list
        } else {
            showToast(res.error || 'Failed to submit appeal', 'error');
        }

        setAppealLoading(false);
        setShowAppealModal(false);
        setSelectedStrike(null);
    };

    // Calculate active strikes (non-expired, non-resolved)
    const activeStrikesCount = strikes.filter(s => s.status === 'active').length;

    // Standing score
    const standingScore = Math.max(0, 100 - (offenseCount * 25));
    let standingText = "Good Standing";
    let standingColor = "text-green-400";
    let standingBg = "bg-green-500/10 border-green-500/20";
    let IconComponent = ShieldCheck;

    if (offenseCount > 0) {
        standingText = "Warning Active";
        standingColor = "text-yellow-400";
        standingBg = "bg-yellow-500/10 border-yellow-500/20";
        IconComponent = AlertTriangle;
    }
    if (offenseCount >= 3 || needsManualReview) {
        standingText = "Restricted Standing";
        standingColor = "text-red-400";
        standingBg = "bg-red-500/10 border-red-500/20";
        IconComponent = ShieldAlert;
    }

    // Helper to format remaining restriction time or return normal status
    const getRestrictionStatusText = (type: string) => {
        if (needsManualReview) {
            return { text: "Manual Review Block (All Actions Suspended)", cls: "text-red-400 font-bold" };
        }
        const active = activeRestrictions.find(r => r.restriction_type === type);
        if (active) {
            const timeRemaining = new Date(active.expires_at).getTime() - Date.now();
            if (timeRemaining > 0) {
                const hours = Math.ceil(timeRemaining / (3600 * 1000));
                return { text: `Suspended (expires in ~${hours}h)`, cls: "text-red-400 font-bold" };
            }
        }
        return { text: "Normal (Unlimited)", cls: "text-green-400 font-bold" };
    };

    if (loading && strikes.length === 0) {
        return (
            <div className="w-full py-12 flex items-center justify-center">
                <Clock className="animate-spin text-neutral-500" size={24} />
            </div>
        );
    }

    return (
        <div className="w-full pb-12 animate-fade-in space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white mb-1">Account Status</h2>
                <p className="text-[12.5px] text-neutral-500 font-medium">
                    Monitor guideline violations, submit appeals, and view restricted features for your profile.
                </p>
            </div>

            {/* Overall Standing Card */}
            <div className={clsx("p-5 border rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 backdrop-blur-md", standingBg)}>
                <div className="flex items-center gap-4">
                    <div className={clsx("w-12 h-12 rounded-full flex items-center justify-center border shrink-0", 
                        offenseCount === 0 ? "bg-green-500/5 border-green-500/15 text-green-400" :
                        offenseCount < 3 ? "bg-yellow-500/5 border-yellow-500/15 text-yellow-400" :
                        "bg-red-500/5 border-red-500/15 text-red-400"
                    )}>
                        <IconComponent size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[14px] font-black text-white">Standing Score: {standingScore}/100</span>
                            <span className={clsx("text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full border", 
                                offenseCount === 0 ? "bg-green-500/10 border-green-500/20 text-green-400" :
                                offenseCount < 3 ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" :
                                "bg-red-500/10 border-red-500/20 text-red-400"
                            )}>
                                {standingText}
                            </span>
                        </div>
                        <p className="text-[12px] text-neutral-400 mt-1 leading-relaxed max-w-xl">
                            {offenseCount === 0 
                                ? "Your account is in good standing with zero active community guidelines violations. Continue following Verlyn terms." 
                                : `You have registered ${offenseCount} guideline infraction(s). Subsequent violations trigger escalating feature suspensions.`
                            }
                            {needsManualReview && " Your account requires manual safety review and all features are currently locked."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Current Feature Limits */}
            <SettingsSection title="Feature Limitations">
                <div className="p-4 flex items-center justify-between text-[13px] bg-[#0A0A0A]/30">
                    <span className="font-medium text-neutral-300">Direct & Group Messaging</span>
                    <span className={getRestrictionStatusText('messages').cls}>
                        {getRestrictionStatusText('messages').text}
                    </span>
                </div>
                <div className="p-4 flex items-center justify-between text-[13px] border-t border-white/5 bg-[#0A0A0A]/30">
                    <span className="font-medium text-neutral-300">Likes & Reactions</span>
                    <span className={getRestrictionStatusText('reactions').cls}>
                        {getRestrictionStatusText('reactions').text}
                    </span>
                </div>
                <div className="p-4 flex items-center justify-between text-[13px] border-t border-white/5 bg-[#0A0A0A]/30">
                    <span className="font-medium text-neutral-300">Commenting & Replies</span>
                    <span className={getRestrictionStatusText('comments').cls}>
                        {getRestrictionStatusText('comments').text}
                    </span>
                </div>
                <div className="p-4 flex items-center justify-between text-[13px] border-t border-white/5 bg-[#0A0A0A]/30">
                    <span className="font-medium text-neutral-300">Post & Story Creation</span>
                    <span className={getRestrictionStatusText('posts').cls}>
                        {getRestrictionStatusText('posts').text}
                    </span>
                </div>
                <div className="p-4 flex items-center justify-between text-[13px] border-t border-white/5 bg-[#0A0A0A]/30">
                    <span className="font-medium text-neutral-300">Group & Community Creation</span>
                    <span className={getRestrictionStatusText('group_creation').cls}>
                        {getRestrictionStatusText('group_creation').text}
                    </span>
                </div>
            </SettingsSection>

            {/* Strikes History List */}
            <div className="space-y-3">
                <h4 className="text-[11px] font-extrabold text-neutral-400 px-2 uppercase tracking-[0.12em] select-none">
                    Violations & Warnings History
                </h4>
                
                {strikes.length === 0 ? (
                    <div className="p-6 text-center text-[13px] text-neutral-600 border border-white/5 bg-[#080808] rounded-2xl">
                        <ShieldCheck size={22} className="mx-auto mb-2 text-neutral-700" />
                        <span>Zero records found. Your account is completely clean.</span>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {strikes.map((strike) => (
                            <div 
                                key={strike.id}
                                className="bg-[#0D0D0D]/70 border border-white/5 rounded-2xl p-5 space-y-4 hover:border-white/10 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h5 className="text-[13.5px] font-bold text-white">{strike.type}</h5>
                                            <span className={clsx(
                                                "text-[9px] uppercase font-extrabold border px-2 py-0.5 rounded-full select-none",
                                                strike.status === 'active' && "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
                                                strike.status === 'appealed' && "bg-blue-500/10 border-blue-500/20 text-blue-400",
                                                strike.status === 'expired' && "bg-neutral-800 border-neutral-700 text-neutral-500",
                                                strike.status === 'resolved' && "bg-green-500/10 border-green-500/20 text-green-400"
                                            )}>
                                                {strike.status}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-neutral-500 font-medium">Logged on: {strike.date}</p>
                                    </div>
                                    
                                    {strike.status === 'active' && (
                                        <SettingsButton
                                            variant="secondary"
                                            height={36}
                                            onClick={() => handleOpenAppeal(strike)}
                                            icon={Gavel}
                                        >
                                            Appeal
                                        </SettingsButton>
                                    )}
                                </div>

                                <p className="text-[12.5px] text-neutral-300 leading-relaxed bg-[#050505]/40 border border-white/5 rounded-xl p-3">
                                    {strike.description}
                                </p>

                                {strike.appealDate && (
                                    <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-1 text-[12px]">
                                        <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                                            <Clock size={12} /> Appeal Under Review (Submitted {strike.appealDate})
                                        </div>
                                        <p className="text-neutral-400 italic font-medium leading-relaxed">
                                            "{strike.appealDetails}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Appeal Modal */}
            <ModalSystem 
                isOpen={showAppealModal} 
                onClose={() => {
                    if (!appealLoading) {
                        setShowAppealModal(false);
                        setSelectedStrike(null);
                    }
                }} 
                title="Submit Moderation Appeal"
            >
                {selectedStrike && (
                    <div className="space-y-4">
                        <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl text-[12.5px] text-yellow-300 flex items-start gap-2.5">
                            <Info size={16} className="shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold block mb-0.5">Appealing violation warning:</span>
                                <span>{selectedStrike.type} logged on {selectedStrike.date}</span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-extrabold text-neutral-400 uppercase tracking-wider">
                                Rationale & Description
                            </label>
                            <textarea
                                value={appealText}
                                onChange={(e) => setAppealText(e.target.value)}
                                placeholder="Explain why this action is incorrect, outlining credential corrections or mistaken automated triggers..."
                                rows={4}
                                disabled={appealLoading}
                                className="w-full bg-[#141414] border border-white/5 rounded-xl px-4 py-3 text-[13px] text-neutral-100 placeholder-neutral-600 focus:outline-none resize-none disabled:opacity-40 transition-colors shadow-inner leading-relaxed"
                            />
                            <p className="text-[11px] text-neutral-500 leading-normal">
                                Appeals are routed to human safety moderators. A response will update this record within 48-72 hours.
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAppealModal(false);
                                    setSelectedStrike(null);
                                }}
                                disabled={appealLoading}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-neutral-300 font-bold rounded-xl text-[13px] transition-colors disabled:opacity-40"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmitAppeal}
                                disabled={appealLoading || !appealText.trim()}
                                className="flex-1 py-3 bg-blue-600 hover:opacity-90 active:scale-95 text-white font-bold rounded-xl text-[13px] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
                            >
                                {appealLoading ? (
                                    <Clock size={14} className="animate-pulse" />
                                ) : (
                                    <Send size={14} />
                                )}
                                Submit Appeal
                            </button>
                        </div>
                    </div>
                )}
            </ModalSystem>

            {/* Guidelines info box */}
            <div className="p-5 bg-neutral-900 border border-white/5 rounded-2xl flex gap-3 text-neutral-400 text-[12px] leading-relaxed">
                <Info size={16} className="text-neutral-500 shrink-0 mt-0.5" />
                <div>
                    <span className="font-bold text-white block mb-0.5">Verlyn Community Standards & Rules</span>
                    <span>
                        Warnings expire automatically 90 days after logging, provided no subsequent warnings are registered. Direct repeated infractions will cause account suspension or permanent termination.
                    </span>
                </div>
            </div>

            <Toast show={toast.show} message={toast.message} type={toast.type} />
        </div>
    );
}
