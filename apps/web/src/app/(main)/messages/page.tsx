'use client';

import { useState, useRef, useEffect, useMemo, Suspense, useCallback } from 'react';
import { Search, Edit, Lock, Phone, Video, MoreHorizontal, Send, Smile, Paperclip, Mic, MessageCircle, Loader2, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAppStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams, useRouter } from 'next/navigation';
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
  const lastSendRef = useRef<number>(0);

  // Pagination states
  const [hasMoreMsgs, setHasMoreMsgs] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { chatWallpaperUrl, chatWallpaperBlur, chatWallpaperDim, currentUser } = useAppStore();
  const bgRef = useRef<HTMLImageElement>(null);
  const supabase = useMemo(() => createClient(), []);

  // UX Micro-detailing: High-performance Synthesized Audio Feedback
  const playPopSound = () => {
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
  };

  const isVideo = chatWallpaperUrl?.match(/\.(mp4|webm|ogg)$/i);
  const activeConv = conversations.find(c => c.id === activeConvId) || null;

  // Load real conversations
  useEffect(() => {
    async function loadConversations() {
      if (!currentUser?.id) { setLoadingConvs(false); return; }
      // Query messages sent/received by current user, group by conversation
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
        .order('sent_at', { ascending: false })
        .limit(50);

      const convMap = new Map<string, DBConversation>();
      
      if (data && data.length > 0) {
        // Build conversation list from messages
        for (const m of data) {
          const otherId = m.sender_id === currentUser.id ? m.recipient_id : m.sender_id;
          if (convMap.has(otherId)) continue;

          const { data: other } = await supabase
            .from('users')
            .select('id, username, display_name, avatar_url')
            .eq('id', otherId)
            .single();

          convMap.set(otherId, {
            id: otherId,
            participant_id: otherId,
            participant_name: other?.display_name || other?.username || 'Unknown',
            participant_username: other?.username || '?',
            participant_avatar: other?.avatar_url || null,
            last_message: m.content,
            updated_at: m.sent_at,
            unread: 0,
          });
        }
      }

      // If we jumped here with a target user but they aren't in our history yet
      if (targetUserId && !convMap.has(targetUserId) && targetUserId !== currentUser.id) {
        const { data: targetUser } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url')
          .eq('id', targetUserId)
          .single();
          
        if (targetUser) {
          convMap.set(targetUserId, {
            id: targetUserId,
            participant_id: targetUserId,
            participant_name: targetUser.display_name || targetUser.username,
            participant_username: targetUser.username,
            participant_avatar: targetUser.avatar_url,
            last_message: '',
            updated_at: new Date().toISOString(),
            unread: 0,
          });
        }
      }

      setConversations(Array.from(convMap.values()).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
      
      if (!targetUserId && convMap.size > 0) {
        setActiveConvId(Array.from(convMap.keys())[0]);
      }
      setLoadingConvs(false);
    }
    loadConversations();
  }, [currentUser?.id, supabase, targetUserId]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConvId || !currentUser?.id) return;
    async function loadMessages() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUser!.id},recipient_id.eq.${activeConvId}),and(sender_id.eq.${activeConvId},recipient_id.eq.${currentUser!.id})`
        )
        .order('sent_at', { ascending: false })
        .limit(50);

      if (!data || data.length < 50) setHasMoreMsgs(false);
      else setHasMoreMsgs(true);

      const parsed = (data || []).map(m => ({
        id: m.id,
        content: m.content,
        sender_id: m.sender_id,
        sent_at: m.sent_at,
        is_mine: m.sender_id === currentUser!.id,
      })).reverse(); // Reverse because we fetched desc

      setMessages(parsed);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
    }
    loadMessages();
  }, [activeConvId, currentUser?.id, supabase]);

  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMoreMsgs || messages.length === 0 || !activeConvId || !currentUser?.id) return;
    setLoadingMore(true);
    
    // The cursor is the sent_at of the oldest message we currently have
    const oldestMsgTime = messages[0].sent_at;
    
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUser.id},recipient_id.eq.${activeConvId}),and(sender_id.eq.${activeConvId},recipient_id.eq.${currentUser.id})`
      )
      .lt('sent_at', oldestMsgTime)
      .order('sent_at', { ascending: false })
      .limit(50);

    if (!data || data.length < 50) setHasMoreMsgs(false);

    if (data && data.length > 0) {
      const parsed = data.map(m => ({
        id: m.id,
        content: m.content,
        sender_id: m.sender_id,
        sent_at: m.sent_at,
        is_mine: m.sender_id === currentUser.id,
      })).reverse();
      
      setMessages(prev => [...parsed, ...prev]);
    }
    setLoadingMore(false);
  }, [loadingMore, hasMoreMsgs, messages, activeConvId, currentUser?.id, supabase]);

  // Viewport Observer for Infinite Scroll Trigger
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMoreMessages();
      }
    }, { threshold: 1.0 });

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loadMoreMessages]);

  // Global User Search Logic for New Chats
  useEffect(() => {
    if (!globalSearch.trim() || globalSearch.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const { data } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${globalSearch}%,display_name.ilike.%${globalSearch}%`)
        .limit(10);
      setSearchResults(data || []);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [globalSearch, supabase]);

  // Real-Time Transport Protocol (Postgres WebSockets)
  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msgEvent = payload.new as any;
        if (msgEvent.sender_id !== currentUser.id && msgEvent.recipient_id !== currentUser.id) return; // Not our message
        
        // Append dynamically if active conversation
        if (msgEvent.sender_id === activeConvId || msgEvent.recipient_id === activeConvId) {
          setMessages(prev => {
            // Deduplicate if optimistic update already pushed this content recently matching the ID
            if (prev.some(p => p.id === msgEvent.id || (p.content === msgEvent.content && Date.now() - new Date(p.sent_at).getTime() < 5000))) return prev;
            
            // Mark optimistic ID as finalized, or just append 
            return [...prev, {
              id: msgEvent.id,
              content: msgEvent.content,
              sender_id: msgEvent.sender_id,
              sent_at: msgEvent.sent_at,
              is_mine: msgEvent.sender_id === currentUser.id
            }];
          });
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, activeConvId, supabase]);

  const sendMessage = async () => {
    const now = Date.now();
    // Security: Token Bucket / Debounce (preventing 10ms INSERT spams locking DB)
    if (now - lastSendRef.current < 500) return;

    let trimmed = msg.trim();
    if (!trimmed || !activeConvId || !currentUser?.id) return;
    
    setIsSending(true);
    lastSendRef.current = now;

    // Command Membrane Logic
    if (trimmed.startsWith('/')) {
      const args = trimmed.split(' ');
      const command = args[0].toLowerCase();
      if (command === '/shrug') {
        trimmed = (args.slice(1).join(' ') + ' ¯\\_(ツ)_/¯').trim();
      } else if (command === '/coinflip') {
        const result = Math.random() > 0.5 ? 'Heads' : 'Tails';
        trimmed = `🪙 Flipped a coin: **${result}**`;
      } else if (command === '/ai') {
        trimmed = `🤖 Processing query: "${args.slice(1).join(' ')}"... (AI Node offline)`;
      }
    }

    const optimistic: ChatMessage = {
      id: `opt_${Date.now()}`,
      content: trimmed,
      sender_id: currentUser.id,
      sent_at: new Date().toISOString(),
      is_mine: true,
    };
    
    // Kinetic Feedback
    playPopSound();

    setMessages(prev => [...prev, optimistic]);
    setMsg('');
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    // Save to DB
    await supabase.from('messages').insert({
      sender_id: currentUser.id,
      recipient_id: activeConvId,
      content: trimmed,
    });
    
    setIsSending(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!bgRef.current) return;
    const scrollY = e.currentTarget.scrollTop;
    window.requestAnimationFrame(() => {
      bgRef.current!.style.transform = `scale(1.1) translate3d(0, ${scrollY * 0.15}px, 0)`;
    });
  };

  const filteredConvs = conversations.filter(c =>
    activeFolder === 'unread' ? c.unread > 0 : true
  );

  return (
    <div className="flex h-full w-full animate-fade-in bg-background text-on-surface">
      {/* Conversation List */}
      <div className="w-[320px] flex-shrink-0 flex flex-col bg-surface-low border-r border-outline-variant/15 relative z-10 shadow-ambient">
        <div className="px-5 py-5 flex items-center justify-between border-b border-outline-variant/10">
          <h2 className="font-display font-bold text-lg tracking-tight">Messages</h2>
          <button className="icon-btn bg-surface-high hover:bg-surface-highest transition-colors text-on-surface rounded-xl p-2" title="New Message">
            <Edit size={18} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-outline-variant/10 bg-surface-lowest/50">
          <div className="relative group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary-light transition-colors" />
            <input
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search users to message..."
              className="w-full bg-surface-high border-none text-on-surface rounded-2xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-1 focus:ring-primary-light transition-all placeholder:text-on-surface-variant text-sm"
              id="message-search"
            />
          </div>
        </div>

        <div className="px-5 py-2 flex gap-2 border-b border-outline-variant/10">
          {[{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFolder(f.id as 'all' | 'unread')}
              className={clsx(
                'px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border',
                activeFolder === f.id
                  ? 'bg-primary-dark/20 text-primary-light border-primary-DEFAULT/30'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-high'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar py-2">
          {globalSearch.trim().length >= 2 ? (
            <div className="px-2">
              <div className="px-3 py-2 text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider">Directory Search</div>
              {isSearching ? (
                 <div className="flex px-4 py-3 text-sm text-on-surface-variant"><Loader2 size={16} className="animate-spin text-primary-light mr-2" /> Searching...</div>
              ) : searchResults.length === 0 ? (
                 <div className="flex px-4 py-3 text-sm text-on-surface-variant">No users found</div>
              ) : searchResults.map(user => (
                 <div
                   key={user.id}
                   onClick={() => {
                     setGlobalSearch('');
                     // Inject if they don't exist yet
                     if (!conversations.find(c => c.id === user.id)) {
                       setConversations(prev => [{
                         id: user.id,
                         participant_id: user.id,
                         participant_name: user.display_name || user.username,
                         participant_username: user.username,
                         participant_avatar: user.avatar_url,
                         last_message: 'Start a new conversation',
                         updated_at: new Date().toISOString(),
                         unread: 0
                       }, ...prev]);
                     }
                     setActiveConvId(user.id);
                   }}
                   className="flex items-center gap-3 px-3 py-2.5 mx-1 hover:bg-surface-high rounded-xl cursor-pointer transition-colors"
                 >
                   <img src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} className="w-10 h-10 rounded-full object-cover shadow-ambient border border-outline-variant/10" onError={(e) => { (e.target as HTMLImageElement).src = '/fallback-avatar.svg'; }} />
                   <div>
                     <div className="text-sm font-bold text-on-surface">{user.display_name || user.username}</div>
                     <div className="text-xs text-on-surface-variant/70">@{user.username}</div>
                   </div>
                 </div>
              ))}
            </div>
          ) : loadingConvs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-primary-light" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
              <MessageCircle size={36} className="text-on-surface-variant/30" />
              <p className="text-sm font-semibold text-on-surface-variant">No messages yet</p>
              <p className="text-xs text-on-surface-variant/60">Start a conversation from someone's profile</p>
            </div>
          ) : (
            filteredConvs.map((conv) => {
              const isActive = activeConvId === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={clsx(
                    'flex items-center gap-4 px-4 py-3.5 mx-2 cursor-pointer transition-all duration-200 rounded-2xl relative',
                    isActive ? 'bg-surface-high shadow-ambient' : 'hover:bg-surface-high/50'
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-light rounded-r-full shadow-[0_0_12px_rgba(208,188,255,0.6)]" />
                  )}
                  <div className="relative flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={conv.participant_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.participant_username}`}
                      alt={conv.participant_name}
                      className="w-12 h-12 rounded-full object-cover shadow-ambient border border-outline-variant/10"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/fallback-avatar.svg'; }}
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold truncate text-on-surface">{conv.participant_name}</span>
                      <span className="text-[10px] flex-shrink-0 ml-2 text-on-surface-variant font-medium">
                        {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: false })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs truncate font-medium text-on-surface-variant">{conv.last_message}</p>
                      {conv.unread > 0 && (
                        <span className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-primary-gradient text-white">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      {activeConv ? (
        <div className="flex-1 flex flex-col min-w-0 bg-background relative -ml-4 z-0 rounded-l-3xl shadow-[-10px_0_30px_rgba(0,0,0,0.3)] border-l border-outline-variant/10 overflow-hidden transform transition-transform duration-300">
          
          {/* Dynamic Background */}
          {chatWallpaperUrl && (
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              {isVideo ? (
                <video src={chatWallpaperUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
              ) : (
                <img ref={bgRef} src={chatWallpaperUrl} alt="" className="w-full h-full object-cover will-change-transform" />
              )}
              <div 
                className="absolute inset-0 transition-opacity duration-300" 
                style={{ 
                  backdropFilter: `blur(${chatWallpaperBlur}px)`, 
                  backgroundColor: `rgba(0,0,0,${chatWallpaperDim})` 
                }} 
              />
            </div>
          )}

          {/* Active Chat Header */}
          <div className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-outline-variant/10 bg-surface/80 backdrop-blur-md relative z-10 sticky top-0">
            <div className="flex items-center gap-4">
              <div className="flex sm:hidden mr-2 cursor-pointer" onClick={() => setActiveConvId(null)}><ArrowLeft size={20} /></div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeConv.participant_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeConv.participant_username}`}
                alt={activeConv.participant_name}
                className="w-12 h-12 rounded-full object-cover shadow-ambient border border-outline-variant/20"
                onError={(e) => { (e.target as HTMLImageElement).src = '/fallback-avatar.svg'; }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base sm:text-lg text-on-surface">{activeConv.participant_name}</h3>
                </div>
                <div className="text-[14px] text-on-surface-variant">@{activeConv.participant_username}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="icon-btn hover:bg-surface-low p-2.5 rounded-2xl text-primary-light transition-colors shadow-ambient border border-outline-variant/5 bg-surface-highest"><Phone size={18} /></button>
              <button className="icon-btn hover:bg-surface-low p-2.5 rounded-2xl text-primary-light transition-colors shadow-ambient border border-outline-variant/5 bg-surface-highest"><Video size={18} /></button>
              <div className="w-px h-6 bg-outline-variant/20 mx-1" />
              <button className="icon-btn hover:bg-surface-low p-2.5 rounded-2xl text-on-surface-variant transition-colors"><MoreHorizontal size={18} /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 z-10 hide-scrollbar" onScroll={handleScroll}>
            <div className="flex justify-center mb-6">
              <span className="text-xs px-4 py-2 rounded-2xl flex items-center gap-2 bg-secondary-dark/20 text-secondary-light border border-secondary-DEFAULT/20 backdrop-blur-md shadow-ambient font-medium">
                <Lock size={12} className="opacity-80" /> Secured by Verlyn Matrix End-to-End Encryption
              </span>
            </div>
            
            {hasMoreMsgs && (
              <div ref={observerRef} className="h-8 flex items-center justify-center mb-4">
                {loadingMore && <Loader2 size={16} className="animate-spin text-primary-light" />}
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.is_mine ? 'justify-end' : 'justify-start'} gap-3 items-end relative group`}>
                {!message.is_mine && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeConv.participant_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeConv.participant_username}`}
                    alt={activeConv.participant_name}
                    width={32} height={32}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 shadow-ambient mb-1"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/fallback-avatar.svg'; }}
                  />
                )}
                <div className="flex flex-col max-w-[65%] gap-1.5">
                  <div className={clsx(
                    'px-5 py-3 shadow-ambient backdrop-blur-md text-[15px] leading-relaxed',
                    message.is_mine
                      ? 'bg-primary-gradient text-white rounded-[24px] rounded-br-[6px]'
                      : 'bg-surface-highest border border-outline-variant/15 text-on-surface rounded-[24px] rounded-bl-[6px]'
                  )}>
                    {message.content}
                  </div>
                  <div className={clsx('text-[10px] font-medium text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity duration-200', message.is_mine ? 'text-right' : 'text-left')}>
                    {formatDistanceToNow(new Date(message.sent_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 mt-16 opacity-50">
                <MessageCircle size={32} className="text-on-surface-variant" />
                <p className="text-sm text-on-surface-variant">No messages yet. Say hi 👋</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-6 pb-6 pt-2 z-10 flex-shrink-0 bg-transparent">
            <div className="flex items-center gap-3 p-2 bg-surface-highest/80 backdrop-blur-3xl border border-outline-variant/20 rounded-full shadow-ambient">
              <button className="p-2.5 rounded-full text-on-surface-variant hover:bg-surface-high hover:text-on-surface transition-all flex-shrink-0" title="Attach media">
                <Paperclip size={20} />
              </button>
              <div className="flex-1 relative">
                <input
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder="Type a message… (Enter to send)"
                  className="w-full bg-transparent border-none text-on-surface py-2 focus:outline-none placeholder:text-on-surface-variant/70 text-[15px]"
                  id="message-input"
                  aria-label="Type a message"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                />
              </div>
              <button className="p-2.5 rounded-full text-on-surface-variant hover:bg-surface-high hover:text-on-surface transition-all flex-shrink-0">
                <Smile size={20} />
              </button>
              {msg ? (
                <button
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 transition-transform duration-200 hover:scale-105 active:scale-95 bg-primary-gradient shadow-ambient"
                  onClick={sendMessage}
                  id="send-btn"
                  aria-label="Send message"
                >
                  <Send size={16} className="-ml-0.5" />
                </button>
              ) : (
                <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface flex-shrink-0 transition-transform duration-200 hover:bg-surface-high bg-surface-high border border-outline-variant/10 shadow-ambient">
                  <Mic size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : !loadingConvs ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-surface-lowest">
          <div className="w-24 h-24 rounded-full bg-surface-high/50 border border-outline-variant/10 flex items-center justify-center mb-4 shadow-ambient">
            <MessageCircle size={32} className="text-on-surface-variant/50" />
          </div>
          <p className="text-on-surface-variant font-medium">No conversations yet</p>
          <p className="text-xs text-on-surface-variant/60 mt-1">Go to a user profile and start a conversation</p>
        </div>
      ) : null}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full w-full items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
