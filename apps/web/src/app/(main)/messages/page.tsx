'use client';

import { useState, useRef, useEffect, useMemo, Suspense, useCallback } from 'react';
import { Search, Edit, Lock, Phone, Video, MoreHorizontal, Send, Smile, Paperclip, Mic, MessageCircle, Loader2, ArrowLeft, Check, CheckCheck, AlertCircle, Trash2, ShieldAlert, Sparkles, UserX, Ghost } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useAppStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams, useRouter } from 'next/navigation';
import { deleteMessageDB, validateMessagingPermission } from './actions';
import clsx from 'clsx';

interface DBConversation {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_username: string;
  participant_avatar: string | null;
  last_message: string;
  updated_at: string;
  unread: number;
}

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  sent_at: string;
  is_mine: boolean;
  status: 'sending' | 'sent' | 'error';
}

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('user_id');

  const [activeFolder, setActiveFolder] = useState<'all' | 'unread'>('all');
  const [activeConvId, setActiveConvId] = useState<string | null>(targetUserId || null);
  const [conversations, setConversations] = useState<DBConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msg, setMsg] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  
  // Real-time & Global Search extensions
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);

  // Typing state
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMsgs, setHasMoreMsgs] = useState(true);
  const observerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSendRef = useRef<number>(0);

  const { chatWallpaperUrl, chatWallpaperBlur, chatWallpaperDim, currentUser } = useAppStore();
  const bgRef = useRef<HTMLImageElement>(null);
  const supabase = useMemo(() => createClient(), []);

  // Audio Feedback Cache
  const playPopSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  }, []);

  const activeConv = useMemo(() => conversations.find(c => c.id === activeConvId), [conversations, activeConvId]);

  // --- INITIAL LOAD: Conversations ---
  useEffect(() => {
    if (!currentUser?.id) { setLoadingConvs(false); return; }
    async function loadConversations() {
      const { data } = await supabase.from('messages').select('*').or(`sender_id.eq.${currentUser!.id},recipient_id.eq.${currentUser!.id}`).order('sent_at', { ascending: false }).limit(60);
      const convMap = new Map<string, DBConversation>();
      if (data) {
        for (const m of data) {
          const otherId = m.sender_id === currentUser!.id ? m.recipient_id : m.sender_id;
          if (convMap.has(otherId)) continue;
          const { data: other } = await supabase.from('users').select('id, username, display_name, avatar_url').eq('id', otherId).single();
          convMap.set(otherId, { id: otherId, participant_id: otherId, participant_name: other?.display_name || other?.username || 'Unknown Node', participant_username: other?.username || '?', participant_avatar: other?.avatar_url || null, last_message: m.content, updated_at: m.sent_at, unread: 0 });
        }
      }
      if (targetUserId && !convMap.has(targetUserId)) {
        const { data: tu } = await supabase.from('users').select('id, username, display_name, avatar_url').eq('id', targetUserId).single();
        if (tu) convMap.set(targetUserId, { id: tu.id, participant_id: tu.id, participant_name: tu.display_name || tu.username, participant_username: tu.username, participant_avatar: tu.avatar_url, last_message: 'Initialize transmission signal...', updated_at: new Date().toISOString(), unread: 0 });
      }
      setConversations(Array.from(convMap.values()).sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
      if (!activeConvId && convMap.size > 0) setActiveConvId(Array.from(convMap.keys())[0]);
      setLoadingConvs(false);
    }
    loadConversations();
  }, [currentUser?.id, supabase, targetUserId]);

  // --- LOAD MESSAGES ---
  useEffect(() => {
    if (!activeConvId || !currentUser?.id) return;
    setPermError(null);
    async function checkPerms() {
        const res = await validateMessagingPermission(currentUser!.id, activeConvId!);
        if (!res.allowed) setPermError(res.error);
    }
    checkPerms();
    async function loadMessages() {
      const { data } = await supabase.from('messages').select('*').or(`and(sender_id.eq.${currentUser!.id},recipient_id.eq.${activeConvId}),and(sender_id.eq.${activeConvId},recipient_id.eq.${currentUser!.id})`).order('sent_at', { ascending: false }).limit(50);
      setHasMoreMsgs(!!data && data.length === 50);
      const parsed: ChatMessage[] = (data || []).map(m => ({ id: m.id, content: m.content, sender_id: m.sender_id, sent_at: m.sent_at, is_mine: m.sender_id === currentUser!.id, status: 'sent' as const })).reverse();
      setMessages(parsed);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
    }
    loadMessages();
  }, [activeConvId, currentUser?.id, supabase]);

  // --- REAL-TIME: Messages & Typing ---
  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase.channel(`chat:${activeConvId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msgEvent = payload.new as any;
        if (msgEvent.sender_id !== currentUser.id && msgEvent.recipient_id !== currentUser.id) return;

        // If it's for current active chat
        if (msgEvent.sender_id === activeConvId || msgEvent.recipient_id === activeConvId) {
            setMessages(prev => {
                if (prev.some(p => p.id === msgEvent.id)) return prev;
                const newMessage: ChatMessage = { id: msgEvent.id, content: msgEvent.content, sender_id: msgEvent.sender_id, sent_at: msgEvent.sent_at, is_mine: msgEvent.sender_id === currentUser.id, status: 'sent' };
                const optIndex = prev.findIndex(p => p.status === 'sending' && p.content === msgEvent.content);
                if (optIndex !== -1) { const n = [...prev]; n[optIndex] = newMessage; return n; }
                return [...prev, newMessage];
            });
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
            setOtherUserTyping(false);
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
          if (payload.userId === activeConvId) {
              setOtherUserTyping(payload.isTyping);
          }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, activeConvId, supabase]);

  // --- TYPING BROADCAST ---
  const handleTyping = (text: string) => {
      setMsg(text);
      if (!activeConvId || !currentUser?.id) return;
      if (!isTyping) {
          setIsTyping(true);
          supabase.channel(`chat:${activeConvId}`).send({ type: 'broadcast', event: 'typing', payload: { userId: currentUser.id, isTyping: true } });
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
          setIsTyping(false);
          supabase.channel(`chat:${activeConvId}`).send({ type: 'broadcast', event: 'typing', payload: { userId: currentUser.id, isTyping: false } });
      }, 3000);
  };

  const sendMessage = async (retryContent?: string) => {
    const rawContent = retryContent || msg.trim();
    if (!rawContent || !activeConvId || !currentUser?.id || permError) return;
    
    setIsSending(true);
    let trimmed = rawContent;
    
    // Commands
    if (trimmed.startsWith('/') && !retryContent) {
        if (trimmed === '/coinflip') trimmed = `🪙 ⚡️ **${Math.random() > 0.5 ? 'HEADS' : 'TAILS'}**`;
        else if (trimmed === '/shrug') trimmed = `¯\\_(ツ)_/¯`;
    }

    const optimistic: ChatMessage = { id: `opt_${Date.now()}`, content: trimmed, sender_id: currentUser.id, sent_at: new Date().toISOString(), is_mine: true, status: 'sending' };
    playPopSound();
    setMessages(prev => [...prev, optimistic]);
    setMsg('');
    setIsTyping(false);

    const { sendMessageDB } = await import('./actions');
    const res = await sendMessageDB(currentUser.id, activeConvId, trimmed);
    if (!res.success) {
        setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...m, status: 'error' } : m));
    } else {
        setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...m, id: (res.message as any).id, status: 'sent' } : m));
        // Bump conversation
        setConversations(prev => {
            const c = prev.find(x => x.id === activeConvId);
            if (!c) return prev;
            return [{ ...c, last_message: trimmed, updated_at: optimistic.sent_at }, ...prev.filter(x => x.id !== activeConvId)];
        });
    }
    setIsSending(false);
  };

  const deleteMsg = async (id: string) => {
      if (!currentUser?.id) return;
      const res = await deleteMessageDB(currentUser.id, id);
      if (res.success) setMessages(prev => prev.filter(m => m.id !== id));
  }

  const filteredConvs = conversations.filter(c => activeFolder === 'unread' ? c.unread > 0 : true);

  return (
    <div className="flex h-full w-full animate-fade-in bg-[#050505] text-on-surface font-sans italic selection:bg-v-cyan/30">
      <div className="w-[340px] flex-shrink-0 flex flex-col bg-[#0a0a0f] border-r border-white/5 relative z-10 shadow-[4px_0_24px_rgba(0,0,0,0.6)]">
        <div className="px-8 py-10 flex items-center justify-between border-b border-white/5">
          <div>
            <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase leading-none mb-1">Signals</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-v-cyan opacity-60">Intelligence Hub</p>
          </div>
          <button className="w-10 h-10 rounded-2xl bg-surface-high/50 flex items-center justify-center hover:bg-v-cyan hover:text-black transition-all border border-white/5 shadow-xl group">
            <Edit size={18} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>

        <div className="px-6 py-6 border-b border-white/5">
           <div className="relative group">
              <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-v-cyan transition-colors" />
              <input value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} placeholder="SCAN NETWORK FOR NODES..." className="w-full bg-surface-lowest/50 border border-white/5 text-xs font-black uppercase tracking-widest rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:ring-1 focus:ring-v-cyan/30 transition-all placeholder:text-on-surface-variant/40 italic" />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-1">
          {globalSearch.trim().length >= 2 ? (
            <div className="px-4">
               {isSearching ? <div className="flex items-center gap-3 p-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-50"><Loader2 size={16} className="animate-spin" /> Scanning Matrix...</div> : searchResults.map(u => (
                  <div key={u.id} onClick={() => { setGlobalSearch(''); if (!conversations.find(c => c.id === u.id)) setConversations(p => [{ id: u.id, participant_id: u.id, participant_name: u.display_name || u.username, participant_username: u.username, participant_avatar: u.avatar_url, last_message: 'INIT SIGNAL...', updated_at: new Date().toISOString(), unread: 0 }, ...p]); setActiveConvId(u.id); }} className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-white/5 italic">
                     <img src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} className="w-11 h-11 rounded-2xl object-cover border border-white/10" alt="avatar" />
                     <div><p className="text-xs font-black text-white">{u.display_name || u.username}</p><p className="text-[10px] font-bold text-v-cyan opacity-60 uppercase">@{u.username}</p></div>
                  </div>
               ))}
            </div>
          ) : loadingConvs ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-30"><Loader2 size={24} className="animate-spin mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Hydrating Sessions</p></div>
          ) : filteredConvs.map(conv => {
            const active = activeConvId === conv.id;
            return (
              <div key={conv.id} onClick={() => setActiveConvId(conv.id)} className={clsx('group mx-4 px-6 py-5 cursor-pointer transition-all duration-300 rounded-[28px] relative border border-transparent', active ? 'bg-surface-high/60 shadow-[0_15px_30px_rgba(0,0,0,0.4)] border-white/5' : 'hover:bg-white/[0.03]')}>
                {active && <motion.div layoutId="active-signal" className="absolute left-0 top-6 bottom-6 w-1 bg-v-cyan shadow-[0_0_15px_var(--v-cyan)] rounded-full" />}
                <div className="flex items-center gap-5">
                   <div className="relative flex-shrink-0">
                      <img src={conv.participant_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.participant_username}`} className="w-12 h-12 rounded-2xl object-cover border border-white/10 group-hover:scale-105 transition-transform duration-500" alt="avatar" />
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-v-emerald border-[3px] border-surface shadow-[0_0_10px_var(--v-emerald)]" />
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                         <h4 className="text-sm font-black text-white truncate scale-x-95 -ml-1 group-hover:ml-0 transition-all">{conv.participant_name}</h4>
                         <span className="text-[9px] font-bold text-on-surface-variant opacity-40 uppercase">{formatDistanceToNow(new Date(conv.updated_at), { addSuffix: false })}</span>
                      </div>
                      <p className="text-[11px] font-medium text-on-surface-variant/60 truncate group-hover:text-v-cyan transition-colors">{conv.last_message}</p>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activeConv ? (
        <div className="flex-1 flex flex-col min-w-0 relative bg-[#080810] overflow-hidden border-l border-white/5">
          {/* Header */}
          <div className="px-10 py-6 flex items-center justify-between border-b border-white/5 bg-black/60 backdrop-blur-2xl z-20">
             <div className="flex items-center gap-5">
                <div className="relative">
                    <img src={activeConv.participant_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeConv.participant_username}`} className="w-14 h-14 rounded-3xl object-cover border-2 border-white/5 shadow-2xl" alt="avatar" />
                    {otherUserTyping && <div className="absolute -bottom-2 -right-2 bg-v-cyan p-1.5 rounded-xl shadow-[0_0_15px_var(--v-cyan)]"><Sparkles size={12} className="text-black animate-pulse" /></div>}
                </div>
                <div>
                    <h3 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none mb-1 group-hover:text-v-cyan transition-colors">{activeConv.participant_name}</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-v-cyan opacity-80">@{activeConv.participant_username}</span>
                        {otherUserTyping && <span className="text-[9px] font-black uppercase text-v-cyan animate-pulse tracking-widest">• Modulating Signal...</span>}
                    </div>
                </div>
             </div>
             <div className="flex items-center gap-3">
                 <button className="w-11 h-11 rounded-2xl bg-surface-high/50 flex items-center justify-center text-v-cyan border border-white/5 hover:bg-white hover:text-black transition-all shadow-xl"><Phone size={18} /></button>
                 <button className="w-11 h-11 rounded-2xl bg-surface-high/50 flex items-center justify-center text-v-cyan border border-white/5 hover:bg-white hover:text-black transition-all shadow-xl"><Video size={18} /></button>
                 <button className="w-11 h-11 rounded-2xl flex items-center justify-center text-on-surface-variant hover:text-white transition-all"><MoreHorizontal size={20} /></button>
             </div>
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto px-10 py-10 space-y-8 z-10 custom-scrollbar-hidden select-text">
             <div className="flex justify-center mb-10">
                <div className="px-6 py-2.5 rounded-full bg-v-violet/10 border border-v-violet/20 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-v-violet shadow-2xl backdrop-blur-md">
                   <Lock size={12} className="shadow-[0_0_8px_currentColor]" /> Protocol E2EE: SECURED TRANSMISSION
                </div>
             </div>

             <AnimatePresence initial={false}>
                {messages.map((m) => (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 15, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`flex ${m.is_mine ? 'justify-end' : 'justify-start'} group relative`}>
                        <div className={`flex flex-col ${m.is_mine ? 'items-end' : 'items-start'} max-w-[70%] gap-2 transition-transform duration-300`}>
                           <div className={clsx('relative p-5 text-sm font-bold leading-relaxed shadow-3xl break-words italic tracking-tight', m.is_mine ? 'bg-primary-gradient text-white rounded-[32px] rounded-br-lg shadow-[0_15px_30px_rgba(108,99,255,0.25)]' : 'bg-surface-high/40 text-on-surface rounded-[32px] rounded-bl-lg border border-white/5')}>
                              {m.content}
                              {m.is_mine && (
                                 <div className="absolute bottom-2 right-4 flex items-center gap-1 opacity-40 scale-75">
                                    {m.status === 'sending' ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
                                 </div>
                              )}
                              {m.is_mine && (
                                 <button onClick={() => deleteMsg(m.id)} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 items-center justify-center opacity-0 group-hover:opacity-100 transition-all flex hover:bg-rose-500 hover:text-white">
                                    <Trash2 size={14} />
                                 </button>
                              )}
                           </div>
                           <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-0 group-hover:opacity-40 transition-opacity px-2">{formatDistanceToNow(new Date(m.sent_at), { addSuffix: true })}</span>
                        </div>
                    </motion.div>
                ))}
             </AnimatePresence>
             <div ref={messagesEndRef} />
          </div>

          {/* Footer & Signal Input */}
          <div className="px-10 pb-8 pt-2 z-20">
             {permError ? (
                <div className={clsx(
                    "p-8 rounded-[38px] border backdrop-blur-2xl flex flex-col items-center text-center gap-4 transition-all duration-700",
                    permError.includes('purged') ? "bg-white/[0.02] border-white/10" : "bg-rose-500/10 border-rose-500/20"
                )}>
                   {permError.includes('purged') ? (
                       <Ghost size={40} className="text-white/20 animate-pulse" />
                   ) : (
                       <ShieldAlert size={32} className="text-rose-500 animate-pulse" />
                   )}
                   <div className="max-w-md">
                       <p className={clsx(
                           "text-[10px] font-black uppercase tracking-[0.4em] mb-2",
                           permError.includes('purged') ? "text-white/40" : "text-rose-500"
                       )}>
                           {permError.includes('purged') ? 'Session_Archive_Active' : 'Signal_Blocked_by_Kernel'}
                       </p>
                       <p className="text-xs font-bold text-on-surface-variant opacity-80 leading-relaxed italic">
                           {permError.includes('purged') 
                             ? 'THIS_NODE_HAS_BEEN_PURGED_FROM_THE_MATRIX. COMMUNICATION_IS_NOW_ARCHIVED_IN_READ_ONLY_MODE.'
                             : permError}
                       </p>
                   </div>
                   {permError.includes('purged') && (
                       <div className="mt-2 px-6 py-2 rounded-full bg-white/5 border border-white/5 flex items-center gap-3">
                           <Lock size={12} className="text-white/20" />
                           <span className="text-[9px] font-black uppercase tracking-widest text-white/30">LOCKED_BY_SOVEREIGN_OS</span>
                       </div>
                   )}
                </div>
             ) : (
                <div className="relative">
                   <div className="flex items-center gap-4 p-4 bg-surface-lowest/60 backdrop-blur-3xl border border-white/5 rounded-full shadow-3xl group focus-within:ring-2 focus-within:ring-v-cyan/20 transition-all">
                      <button className="w-12 h-12 rounded-full flex items-center justify-center text-on-surface-variant hover:text-v-cyan transition-all"><Paperclip size={20} /></button>
                      <input value={msg} onChange={(e) => handleTyping(e.target.value)} onKeyDown={(e) => { if(e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Inject signal data..." className="flex-1 bg-transparent border-none text-on-surface text-sm font-bold italic focus:outline-none placeholder:text-on-surface-variant/30" />
                      <button className="w-12 h-12 rounded-full flex items-center justify-center text-on-surface-variant hover:text-v-cyan transition-all"><Smile size={20} /></button>
                      <button onClick={() => sendMessage()} className={clsx('w-14 h-14 rounded-full flex items-center justify-center text-white transition-all shadow-[0_10px_20px_rgba(108,99,255,0.4)]', msg.trim() ? 'bg-primary-gradient hover:scale-105 active:scale-95' : 'bg-surface-high opacity-40')}><Send size={18} className={msg.trim() ? '-ml-1' : ''} /></button>
                   </div>
                </div>
             )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#080810] border-l border-white/5">
             <div className="w-40 h-40 bg-surface-low rounded-[50px] flex items-center justify-center border border-white/5 shadow-2xl relative group overflow-hidden">
                <div className="absolute inset-0 bg-primary-gradient opacity-0 group-hover:opacity-20 transition-opacity" />
                <Ghost size={60} className="text-on-surface-variant/10 group-hover:text-v-cyan group-hover:scale-110 transition-all duration-700" />
             </div>
             <p className="mt-8 text-[10px] font-black uppercase tracking-[0.5em] text-on-surface-variant opacity-30 italic">Initialize Session</p>
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="flex h-full w-full items-center justify-center bg-[#050505]"><Loader2 className="w-12 h-12 animate-spin text-v-cyan shadow-[0_0_20px_var(--v-cyan)]" /></div>}>
      <MessagesContent />
    </Suspense>
  );
}
