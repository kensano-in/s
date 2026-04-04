'use client';

import { useState, useRef, useEffect } from 'react';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from '@/lib/mockData';
import type { Conversation } from '@/lib/types';
import { Search, Edit, Lock, Phone, Video, MoreHorizontal, Send, Smile, Paperclip, Mic, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAppStore } from '@/lib/store';
import clsx from 'clsx';

export default function MessagesPage() {
  const [activeFolder, setActiveFolder] = useState<'all' | 'work' | 'personal'>('all');
  const [activeConv, setActiveConv] = useState<Conversation | null>(MOCK_CONVERSATIONS[0]);
  const [msg, setMsg] = useState('');
  const [sentMessages, setSentMessages] = useState<{id: string, content: string, sentAt: string}[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { chatWallpaperUrl, chatWallpaperBlur, chatWallpaperDim } = useAppStore();
  const bgRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const isVideo = chatWallpaperUrl?.match(/\.(mp4|webm|ogg)$/i);

  const sendMessage = () => {
    const trimmed = msg.trim();
    if (!trimmed) return;
    setSentMessages((prev) => [...prev, {
      id: `sent_${Date.now()}`,
      content: trimmed,
      sentAt: new Date().toISOString(),
    }]);
    setMsg('');
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView();
  }, [activeConv]);

  // 120 FPS Telegram Parallax Engine Loop
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!bgRef.current) return;
    const scrollY = e.currentTarget.scrollTop;
    // GPU Accelerated strict transform rules
    window.requestAnimationFrame(() => {
      bgRef.current!.style.transform = `scale(1.1) translate3d(0, ${scrollY * 0.15}px, 0)`;
    });
  };

  const participant = activeConv?.isGroup
    ? null
    : activeConv?.participants[0];

  return (
    <div className="flex h-full w-full animate-fade-in bg-background text-on-surface">
      {/* Conversation List Sidebar */}
      <div className="w-[320px] flex-shrink-0 flex flex-col bg-surface-low border-r border-outline-variant/15 relative z-10 shadow-ambient">
        
        {/* Header */}
        <div className="px-5 py-5 flex items-center justify-between border-b border-outline-variant/10">
          <h2 className="font-display font-bold text-lg tracking-tight">Messages</h2>
          <button className="icon-btn bg-surface-high hover:bg-surface-highest transition-colors text-on-surface rounded-xl p-2" title="New Message">
            <Edit size={18} />
          </button>
        </div>

        {/* Global Search */}
        <div className="px-4 py-3 border-b border-outline-variant/10 bg-surface-lowest/50">
          <div className="relative group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary-light transition-colors" />
            <input
              placeholder="Search conversations..."
              className="w-full bg-surface-high border-none text-on-surface rounded-2xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-1 focus:ring-primary-light transition-all placeholder:text-on-surface-variant text-sm"
              id="message-search"
            />
          </div>
        </div>

        {/* Discord/Telegram Styled Folder Tabs */}
        <div className="px-5 py-2 flex gap-2 overflow-x-auto hide-scrollbar border-b border-outline-variant/10">
          {[ 
            { id: 'all', label: 'All Messages' },
            { id: 'work', label: 'Work HQ' },
            { id: 'personal', label: 'Personal' }
          ].map((folder) => (
            <button
              key={folder.id}
              onClick={() => setActiveFolder(folder.id as any)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border",
                activeFolder === folder.id 
                  ? "bg-primary-dark/20 text-primary-light border-primary-DEFAULT/30 shadow-[0_0_10px_rgba(208,188,255,0.1)]"
                  : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-high"
              )}
            >
              {folder.label}
            </button>
          ))}
        </div>

        {/* Conversation Feed */}
        <div className="flex-1 overflow-y-auto hide-scrollbar py-2">
          {MOCK_CONVERSATIONS.filter(conv => {
            if (activeFolder === 'all') return true;
            if (activeFolder === 'work') return conv.isGroup; // Auto-sort groups to work
            if (activeFolder === 'personal') return !conv.isGroup; // DMs to personal
            return true;
          }).map((conv) => {
            const other = conv.isGroup ? null : conv.participants[0];
            const isActive = activeConv?.id === conv.id;
            
            return (
              <div
                key={conv.id}
                onClick={() => setActiveConv(conv)}
                className={clsx(
                  'flex items-center gap-4 px-4 py-3.5 mx-2 cursor-pointer transition-all duration-200 rounded-2xl relative',
                  isActive ? 'bg-surface-high shadow-ambient' : 'hover:bg-surface-high/50'
                )}
              >
                {/* Active Indicator Glow */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-light rounded-r-full shadow-[0_0_12px_rgba(208,188,255,0.6)]" />
                )}

                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {conv.isGroup ? (
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl bg-surface-highest border border-outline-variant/10 shadow-ambient">
                      {conv.groupIcon}
                    </div>
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={other?.avatar} alt={other?.displayName} className="w-12 h-12 rounded-full object-cover shadow-ambient border border-outline-variant/10" />
                      {other?.isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-secondary-light border-2 border-surface-high rounded-full" />}
                    </>
                  )}
                </div>

                {/* Meta */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-semibold truncate text-on-surface">
                        {conv.isGroup ? conv.groupName : other?.displayName}
                      </span>
                      {conv.isEncrypted && <Lock size={12} className="text-secondary-light flex-shrink-0" />}
                    </div>
                    <span className="text-[10px] flex-shrink-0 ml-2 text-on-surface-variant font-medium">
                      {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: false })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={clsx('text-xs truncate font-medium', conv.unreadCount > 0 ? 'text-on-surface' : 'text-on-surface-variant')}>
                      {conv.lastMessage?.content}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-primary-gradient text-white shadow-ambient">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Active Chat Area */}
      {activeConv ? (
        <div 
          className="flex-1 flex flex-col min-w-0 relative overflow-hidden bg-surface-lowest"
        >
          {/* Wallpaper Injection Engine (Parallax + Video Node) */}
          {chatWallpaperUrl ? (
            <>
              {isVideo ? (
                <video 
                  ref={videoRef}
                  autoPlay loop muted playsInline
                  src={chatWallpaperUrl}
                  className="absolute inset-0 z-0 object-cover w-full h-full"
                  style={{ 
                    filter: `blur(${chatWallpaperBlur}px)`,
                    transform: 'scale(1.1) translate3d(0, 0, 0)',
                    willChange: 'transform'
                  }}
                />
              ) : (
                <div 
                  ref={bgRef}
                  className="absolute inset-0 z-0 bg-cover bg-center"
                  style={{ 
                    backgroundImage: `url(${chatWallpaperUrl})`,
                    filter: `blur(${chatWallpaperBlur}px)`,
                    transform: 'scale(1.1) translate3d(0, 0, 0)', 
                    willChange: 'transform'
                  }}
                />
              )}
              <div 
                className="absolute inset-0 z-0 bg-black transition-opacity duration-300" 
                style={{ opacity: chatWallpaperDim }}
              />
            </>
          ) : (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-primary-dark/20 rounded-full blur-[100px] pointer-events-none opacity-20 object-cover z-0" />
          )}

          {/* Active Chat Header */}
          <div className="flex items-center gap-4 px-6 py-4 bg-surface-highest/80 backdrop-blur-3xl border-b border-outline-variant/15 flex-shrink-0 z-10 shadow-ambient">
            <div className="relative flex-shrink-0">
              {activeConv.isGroup ? (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-surface-low border border-outline-variant/10 shadow-ambient">
                  {activeConv.groupIcon}
                </div>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={participant?.avatar} alt={participant?.displayName} className="w-10 h-10 rounded-full object-cover shadow-ambient border border-outline-variant/10" />
                  {participant?.isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-secondary-light border-2 border-surface-highest rounded-full" />}
                </>
              )}
            </div>
            
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base tracking-tight text-on-surface">
                  {activeConv.isGroup ? activeConv.groupName : participant?.displayName}
                </span>
                {activeConv.isEncrypted && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-[6px] bg-secondary-dark/30 text-secondary-light border border-secondary-DEFAULT/20">
                    <Lock size={10} /> E2EE
                  </span>
                )}
              </div>
              <div className="text-xs font-medium text-secondary-light mt-0.5">
                {participant?.isOnline ? 'Active right now' : 'Last seen recently'}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="icon-btn hover:bg-surface-low p-2.5 rounded-2xl text-primary-light transition-colors shadow-ambient border border-outline-variant/5 bg-surface-highest"><Phone size={18} /></button>
              <button className="icon-btn hover:bg-surface-low p-2.5 rounded-2xl text-primary-light transition-colors shadow-ambient border border-outline-variant/5 bg-surface-highest"><Video size={18} /></button>
              <div className="w-px h-6 bg-outline-variant/20 mx-1"></div>
              <button className="icon-btn hover:bg-surface-low p-2.5 rounded-2xl text-on-surface-variant transition-colors"><MoreHorizontal size={18} /></button>
            </div>
          </div>

          {/* Messages Feed - GPU Parallax Listener Attached */}
          <div 
            className="flex-1 overflow-y-auto px-6 py-6 space-y-6 z-10 hide-scrollbar"
            onScroll={handleScroll}
          >
            {/* E2EE Context Notice */}
            {activeConv.isEncrypted && (
              <div className="flex justify-center mb-6">
                <span className="text-xs px-4 py-2 rounded-2xl flex items-center gap-2 bg-secondary-dark/20 text-secondary-light border border-secondary-DEFAULT/20 backdrop-blur-md shadow-ambient font-medium">
                  <Lock size={12} className="opacity-80" />
                  Secured by Verlyn Matrix End-to-End Encryption
                </span>
              </div>
            )}

              {MOCK_MESSAGES.map((message) => {
                const isMine = message.senderId === 'u_current';
                return (
                  <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} gap-3 items-end relative group`}>
                    {!isMine && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={participant?.avatar || '/fallback-avatar.png'} alt={`${participant?.displayName}'s avatar`} width={32} height={32} className="w-8 h-8 rounded-full object-cover flex-shrink-0 shadow-ambient mb-1" onError={(e) => { (e.target as HTMLImageElement).src = '/fallback-avatar.png'; }} />
                    )}
                    <div className="flex flex-col max-w-[65%] gap-1.5">
                      <div className={clsx('px-5 py-3 shadow-ambient backdrop-blur-md text-[15px] leading-relaxed', isMine ? 'bg-primary-gradient text-white rounded-[24px] rounded-br-[6px]' : 'bg-surface-highest border border-outline-variant/15 text-on-surface rounded-[24px] rounded-bl-[6px]')}>
                        {message.content}
                      </div>
                      <div className={clsx('text-[10px] font-medium text-on-surface-variant transition-opacity duration-200', isMine ? 'text-right' : 'text-left', 'opacity-0 group-hover:opacity-100')}>
                        {formatDistanceToNow(new Date(message.sentAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Optimistic sent messages */}
              {sentMessages.map((message) => (
                <div key={message.id} className="flex justify-end gap-3 items-end">
                  <div className="flex flex-col max-w-[65%] gap-1.5">
                    <div className="px-5 py-3 bg-primary-gradient text-white rounded-[24px] rounded-br-[6px] shadow-ambient text-[15px] leading-relaxed">
                      {message.content}
                    </div>
                    <div className="text-[10px] text-on-surface-variant text-right opacity-60">just now</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
          </div>

          {/* Dynamic Input Engine */}
          <div className="px-6 pb-6 pt-2 z-10 flex-shrink-0 bg-transparent">
            <div className="flex items-center gap-3 p-2 bg-surface-highest/80 backdrop-blur-3xl border border-outline-variant/20 rounded-full shadow-ambient">
              
              <button className="p-2.5 rounded-full text-on-surface-variant hover:bg-surface-high hover:text-on-surface transition-all flex-shrink-0" title="Attach media">
                <Paperclip size={20} />
              </button>
              
              <div className="flex-1 relative">
                <input
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder="Type a message... (Enter to send)"
                  className="w-full bg-transparent border-none text-on-surface py-2 focus:outline-none placeholder:text-on-surface-variant/70 text-[15px]"
                  id="message-input"
                  aria-label="Type a message"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                />
              </div>

              <button className="p-2.5 rounded-full text-on-surface-variant hover:bg-surface-high hover:text-on-surface transition-all flex-shrink-0" title="Select Emoji">
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
                <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface flex-shrink-0 transition-transform duration-200 hover:bg-surface-high bg-surface-high border border-outline-variant/10 shadow-ambient" title="Voice Message">
                  <Mic size={18} />
                </button>
              )}

            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-surface-lowest">
          <div className="w-24 h-24 rounded-full bg-surface-high/50 border border-outline-variant/10 flex items-center justify-center mb-4 shadow-ambient">
            <MessageCircle size={32} className="text-on-surface-variant/50" />
          </div>
          <p className="text-on-surface-variant font-medium">Select a conversation to begin</p>
        </div>
      )}
    </div>
  );
}
