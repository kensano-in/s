'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { format, formatDistanceToNow } from 'date-fns';
import { getUserActivityData, deleteCommentLog, getActiveSessions } from '../actions';
import { SettingsSection, SettingsRow } from '../components';
import { 
    Heart, 
    MessageSquare, 
    Search, 
    UserPlus, 
    MapPin, 
    Trash2, 
    ShieldCheck, 
    Globe, 
    Smartphone, 
    Laptop, 
    Clock, 
    Check, 
    RefreshCw,
    X
} from 'lucide-react';
import clsx from 'clsx';

interface CommentLog {
    id: string;
    postTitle: string;
    content: string;
    timestamp: string;
}

interface FollowLog {
    id: string;
    username: string;
    displayName: string;
    action: 'follow' | 'unfollow';
    timestamp: string;
}

interface LoginLog {
    id: string;
    device: string;
    location: string;
    ip: string;
    timestamp: string;
    isCurrent: boolean;
}

export default function YourActivitySettings() {
    const currentUser = useAppStore(s => s.currentUser);
    const setUser = useAppStore(s => s.setUser);
    const userId = currentUser?.id || 'guest';
    const [likesCount, setLikesCount] = useState(0);
    const [comments, setComments] = useState<CommentLog[]>([]);
    const [followsLog, setFollowsLog] = useState<FollowLog[]>([]);
    const [searchLogs, setSearchLogs] = useState<string[]>([]);
    const [loginHistory, setLoginHistory] = useState<LoginLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);

    const syncActivityMetadata = async (updates: Record<string, any>) => {
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

        const loadRealActivity = async () => {
            setLoadingData(true);
            try {
                // 1. Fetch real comments, follows and likes from db
                const res = await getUserActivityData(currentUser.id);
                if (res.success) {
                    setLikesCount(res.likesCount || 0);
                    setComments((res.comments || []).map((c: any) => ({
                        id: c.id,
                        postTitle: c.postTitle,
                        content: c.content,
                        timestamp: c.timestamp ? formatDistanceToNow(new Date(c.timestamp), { addSuffix: true }) : 'N/A'
                    })));
                    setFollowsLog((res.follows || []).map((f: any) => ({
                        id: f.id,
                        username: f.username,
                        displayName: f.displayName,
                        action: f.action,
                        timestamp: f.timestamp ? formatDistanceToNow(new Date(f.timestamp), { addSuffix: true }) : 'N/A'
                    })));
                }

                // 2. Fetch real active sessions
                const sessionRes = await getActiveSessions(currentUser.id);
                if (sessionRes.success && sessionRes.sessions) {
                    setLoginHistory(sessionRes.sessions.map((s: any) => ({
                        id: s.id,
                        device: s.device,
                        location: 'Network Endpoint',
                        ip: s.ip,
                        timestamp: s.lastActive ? formatDistanceToNow(new Date(s.lastActive), { addSuffix: true }) : 'Active Now',
                        isCurrent: s.id === 'sess-current'
                    })));
                }
            } catch (e) {
                console.error('Failed to load activity logs:', e);
            }

            // 3. Fetch search history from metadata or local storage fallback
            const metadata = currentUser.metadata || {};
            const savedSearches = metadata.search_logs || JSON.parse(localStorage.getItem(`verlyn_searches_${currentUser.id}`) || '[]');
            setSearchLogs(savedSearches);

            setLoadingData(false);
        };

        loadRealActivity();
    }, [currentUser?.id, userId]);

    const handleClearSearch = async (index: number) => {
        if (!currentUser?.id) return;
        const updated = searchLogs.filter((_, i) => i !== index);
        setSearchLogs(updated);
        localStorage.setItem(`verlyn_searches_${currentUser.id}`, JSON.stringify(updated));
        await syncActivityMetadata({ search_logs: updated });
    };

    const handleClearAllSearches = async () => {
        if (!currentUser?.id) return;
        setSearchLogs([]);
        localStorage.setItem(`verlyn_searches_${currentUser.id}`, JSON.stringify([]));
        await syncActivityMetadata({ search_logs: [] });
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!currentUser?.id) return;
        try {
            const res = await deleteCommentLog(commentId, currentUser.id);
            if (res.success) {
                const updated = comments.filter(c => c.id !== commentId);
                setComments(updated);
            } else {
                console.error('Failed to delete comment:', res.error);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleResetAllActivity = async () => {
        if (!currentUser?.id) return;
        setLoading(true);
        try {
            setSearchLogs([]);
            localStorage.setItem(`verlyn_searches_${currentUser.id}`, JSON.stringify([]));
            await syncActivityMetadata({ search_logs: [] });
            
            for (const comment of comments) {
                await deleteCommentLog(comment.id, currentUser.id);
            }
            setComments([]);
            setLikesCount(0);
            setFollowsLog([]);
        } catch (e) {
            console.error('Failed to purge all activity logs:', e);
        }
        setLoading(false);
    };

    return (
        <div className="w-full pb-12 animate-fade-in space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white mb-1">Your Activity</h2>
                <p className="text-[12.5px] text-neutral-500 font-medium">Track your engagement footprint, comments made, search history, and active sessions on Verlyn.</p>
            </div>

            {/* Core Stats Overview Widget */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-[#0A0A0A] border border-white/5 rounded-2xl flex flex-col justify-between">
                    <span className="text-[11px] font-extrabold uppercase text-neutral-500 tracking-wider">Total Likes Given</span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-2xl font-black text-white">{likesCount}</span>
                        <Heart size={14} className="text-red-500 fill-red-500/20" />
                    </div>
                </div>
                <div className="p-4 bg-[#0A0A0A] border border-white/5 rounded-2xl flex flex-col justify-between">
                    <span className="text-[11px] font-extrabold uppercase text-neutral-500 tracking-wider">Comments Logged</span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-2xl font-black text-white">{comments.length}</span>
                        <MessageSquare size={14} className="text-blue-500" />
                    </div>
                </div>
                <div className="p-4 bg-[#0A0A0A] border border-white/5 rounded-2xl flex flex-col justify-between">
                    <span className="text-[11px] font-extrabold uppercase text-neutral-500 tracking-wider">Searches Made</span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-2xl font-black text-white">{searchLogs.length}</span>
                        <Search size={14} className="text-green-500" />
                    </div>
                </div>
                <div className="p-4 bg-[#0A0A0A] border border-white/5 rounded-2xl flex flex-col justify-between">
                    <span className="text-[11px] font-extrabold uppercase text-neutral-500 tracking-wider">Follow Activity</span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-2xl font-black text-white">{followsLog.length}</span>
                        <UserPlus size={14} className="text-purple-500" />
                    </div>
                </div>
            </div>

            {/* Comment History List */}
            <SettingsSection title="Comments History">
                {comments.length === 0 ? (
                    <div className="p-8 text-center text-[12.5px] text-neutral-600 italic">No comments log found.</div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="p-4 flex items-start justify-between gap-4">
                            <div className="space-y-1.5 min-w-0">
                                <span className="text-[10px] font-bold text-neutral-500 flex items-center gap-1.5">
                                    <MessageSquare size={10} />
                                    Post: <span className="text-neutral-400 truncate max-w-[150px] sm:max-w-xs">{comment.postTitle}</span> • {comment.timestamp}
                                </span>
                                <p className="text-[13px] text-neutral-200 font-semibold leading-relaxed break-words">{comment.content}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-2 bg-neutral-900 border border-white/5 hover:border-red-500/20 text-neutral-500 hover:text-red-400 rounded-xl transition-all"
                                aria-label="Delete comment log"
                            >
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))
                )}
            </SettingsSection>

            {/* Search History */}
            <SettingsSection title="Recent Search History">
                {searchLogs.length === 0 ? (
                    <div className="p-8 text-center text-[12.5px] text-neutral-600 italic">Search history is empty.</div>
                ) : (
                    <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Search History</span>
                            <button
                                type="button"
                                onClick={handleClearAllSearches}
                                className="text-[11px] font-extrabold text-blue-400 hover:underline"
                            >
                                Clear All Searches
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {searchLogs.map((search, idx) => (
                                <div 
                                    key={idx}
                                    className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-neutral-900 border border-white/5 text-[12px] text-neutral-300 rounded-lg hover:border-white/10"
                                >
                                    <span>{search}</span>
                                    <button 
                                        type="button" 
                                        onClick={() => handleClearSearch(idx)}
                                        className="text-neutral-500 hover:text-white transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </SettingsSection>

            {/* Follow Activity History */}
            <SettingsSection title="Follow Activity History">
                {followsLog.length === 0 ? (
                    <div className="p-8 text-center text-[12.5px] text-neutral-600 italic">No follow logs found.</div>
                ) : (
                    followsLog.map((log) => (
                        <div key={log.id} className="p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className={clsx(
                                    "w-8 h-8 rounded-full border flex items-center justify-center shrink-0",
                                    log.action === 'follow' ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                                )}>
                                    <UserPlus size={14} />
                                </div>
                                <div>
                                    <h5 className="text-[13px] font-bold text-white flex items-center gap-1.5">
                                        {log.displayName}
                                        <span className="text-[10px] text-neutral-500">@{log.username}</span>
                                    </h5>
                                    <p className="text-[11.5px] text-neutral-500 mt-0.5">
                                        Action: {log.action === 'follow' ? 'Followed user' : 'Unfollowed user'} • {log.timestamp}
                                    </p>
                                </div>
                            </div>
                            <span className={clsx(
                                "text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full border",
                                log.action === 'follow' ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                            )}>
                                {log.action}
                            </span>
                        </div>
                    ))
                )}
            </SettingsSection>

            {/* Login Sessions Info */}
            <SettingsSection title="Login Activity & Sessions">
                {loginHistory.map((sess) => (
                    <div key={sess.id} className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                            <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-white/5 flex items-center justify-center text-neutral-400 shrink-0 mt-0.5">
                                {sess.device.includes('iPhone') ? <Smartphone size={16} /> : sess.device.includes('Chrome') ? <Laptop size={16} /> : <Globe size={16} />}
                            </div>
                            <div>
                                <h5 className="text-[13.5px] font-bold text-white flex items-center gap-2">
                                    {sess.device}
                                    {sess.isCurrent && (
                                        <span className="text-[9px] uppercase font-extrabold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full text-blue-400">Current Device</span>
                                    )}
                                </h5>
                                <div className="flex items-center gap-2 text-[11.5px] text-neutral-500 mt-1 font-medium">
                                    <MapPin size={11} className="text-neutral-600" />
                                    <span>{sess.location}</span>
                                    <span>•</span>
                                    <span>IP: {sess.ip}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 select-none">
                            <span className={clsx(
                                "text-[10px] font-extrabold uppercase tracking-wide",
                                sess.isCurrent ? "text-green-400" : "text-neutral-500"
                            )}>{sess.timestamp}</span>
                            <span className="text-[10px] font-bold text-neutral-600 flex items-center gap-1">
                                <ShieldCheck size={11} className="text-neutral-500" /> Verified
                            </span>
                        </div>
                    </div>
                ))}
            </SettingsSection>

            {/* Reset Activity History */}
            <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0A0A0A] p-5 rounded-2xl border border-red-500/10">
                <div className="space-y-1">
                    <h4 className="text-[13.5px] font-bold text-white flex items-center gap-2">
                        <Trash2 size={14} className="text-red-400" /> Reset Activity History
                    </h4>
                    <p className="text-[12px] text-neutral-500 leading-normal max-w-lg">
                        Permanently delete comment history, like history, and search history. This cannot be undone.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleResetAllActivity}
                    disabled={loading}
                    className="px-4 py-2.5 bg-red-600/10 hover:bg-red-600 border border-red-500/20 hover:text-white text-red-400 text-[12px] font-extrabold rounded-xl transition-all flex items-center gap-2 self-start sm:self-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <RefreshCw size={13} className="animate-spin" />
                    ) : (
                        <Trash2 size={13} />
                    )}
                    Purge All Logs
                </button>
            </div>
        </div>
    );
}
