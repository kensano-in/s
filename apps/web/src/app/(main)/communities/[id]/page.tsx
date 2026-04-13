'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, Settings, Users, ChevronLeft, Loader2, Radio } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';

import { getCommunityChannels, getCommunityMessages, sendCommunityMessage, getCommunityMembers, deleteCommunityMessageDB, reactCommunityMessageDB } from '../actions';
import MessageList from '@/components/Chat/MessageList';
import ChatInput from '@/components/Chat/ChatInput';
import { ChatMessage } from '@/components/Chat/MessageItem';
import TypingIndicator from '@/components/Chat/TypingIndicator';

function groupReactions(rawReactions: any[], currentUserId?: string) {
   const map: Record<string, { emoji: string; count: number; reacted: boolean; userIds: string[] }> = {};
   rawReactions.forEach(r => {
      if (!map[r.emoji]) {
         map[r.emoji] = { emoji: r.emoji, count: 0, reacted: false, userIds: [] };
      }
      map[r.emoji].count++;
      map[r.emoji].userIds.push(r.user_id);
      if (r.user_id === currentUserId) {
         map[r.emoji].reacted = true;
      }
   });
   return Object.values(map);
}

function MembersPanel({ members, onlineUsers }: { members: any[]; onlineUsers: Set<string> }) {
   const onlineMembers = members.filter(m => onlineUsers.has(m.user_id));
   const offlineMembers = members.filter(m => !onlineUsers.has(m.user_id));

   return (
      <div className="w-60 flex-shrink-0 bg-[#050505] border-l border-white/5 flex flex-col h-full hidden xl:flex">
         <div className="h-14 flex items-center px-4 border-b border-white/5 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
               <Users size={12} /> Members
            </span>
         </div>
         <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-6">
            <div>
               <h4 className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-3 px-1">Online — {onlineMembers.length}</h4>
               <div className="space-y-2">
                  {onlineMembers.map((m) => (
                     <div key={m.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group">
                        <div className="relative">
                           <img src={m.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${m.display_name}`} className="w-8 h-8 rounded-full border border-white/10" alt="" />
                           <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-[#050505]" />
                        </div>
                        <span className="text-xs font-bold text-neutral-300 group-hover:text-white truncate">{m.display_name}</span>
                     </div>
                  ))}
               </div>
            </div>
            
            {offlineMembers.length > 0 && (
               <div>
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-neutral-600 mb-3 px-1">Offline — {offlineMembers.length}</h4>
                  <div className="space-y-2 opacity-50">
                     {offlineMembers.map((m) => (
                        <div key={`off${m.id}`} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group">
                           <div className="relative">
                              <img src={m.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${m.display_name}`} className="w-8 h-8 rounded-full border border-white/10 grayscale opacity-50" alt="" />
                           </div>
                           <span className="text-xs font-bold text-neutral-500 group-hover:text-neutral-400 truncate">{m.display_name}</span>
                        </div>
                     ))}
                  </div>
               </div>
            )}
         </div>
      </div>
   );
}

export default function CommunityPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { currentUser } = useAppStore();
  const supabase = createClient();

  const [community, setCommunity] = useState<any>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [loadingChannels, setLoadingChannels] = useState(true);

  // Members + Presence
  const [communityMembers, setCommunityMembers] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const presenceChannelRef = useRef<any>(null);
  const typingChannelRef = useRef<any>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  const activeChannel = channels.find(c => c.id === activeChannelId);

  // ── Load Data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      setLoadingChannels(true);
      const { data: comm } = await supabase.from('communities').select('*').eq('id', id).single();
      if (comm) setCommunity(comm);

      const res = await getCommunityChannels(id);
      if (res.success && res.channels) {
        setChannels(res.channels);
        if (res.channels.length > 0) {
          setActiveChannelId(res.channels[0].id);
        }
      }

      const memRes = await getCommunityMembers(id);
      if (memRes.success && memRes.members) {
        setCommunityMembers(memRes.members);
      }

      setLoadingChannels(false);
    }
    loadData();
  }, [id, supabase]);

  // ── Realtime Presence ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.id || !id) return;
    if (presenceChannelRef.current) return;

    const channel = supabase.channel(`community_presence:${id}`, {
      config: { presence: { key: currentUser.id } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const onlineSet = new Set<string>();
      for (const [key] of Object.entries(state)) {
        onlineSet.add(key);
      }
      setOnlineUsers(onlineSet);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });

    presenceChannelRef.current = channel;

    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
    };
  }, [id, currentUser?.id, supabase]);

  // ── Typing Indicators ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeChannelId || !currentUser?.id) return;

    const channel = supabase.channel(`community_typing:${activeChannelId}`);
    
    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const { userId, typing } = payload;
        if (userId === currentUser.id) return;
        
        setTypingUsers(prev => {
          const next = new Set(prev);
          if (typing) next.add(userId);
          else next.delete(userId);
          return next;
        });
      })
      .subscribe();

    typingChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      typingChannelRef.current = null;
    };
  }, [activeChannelId, currentUser?.id, supabase]);

  const handleTyping = (isTyping: boolean = true) => {
    if (typingChannelRef.current && currentUser?.id) {
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUser.id, typing: isTyping }
      });
    }
  };

  // ── Messages Loader ───────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (chanId: string) => {
    setLoadingMsgs(true);
    const res = await getCommunityMessages(chanId);
    if (res.success && res.messages) {
      setMessages(res.messages.map((m: any) => ({
        id: m.id,
        content: m.content,
        sender_id: m.sender_id,
        sent_at: m.sent_at,
        is_mine: m.sender_id === currentUser?.id,
        status: 'sent',
        type: m.type as any,
        media_url: m.media_url,
        reactions: groupReactions(m.reactions || [], currentUser?.id),
        sender: {
          display_name: m.sender_display || 'User',
          username: 'user',
          avatar_url: null, // fallback to dicebear in MessageItem via component defaults if null
        }
      })));
    } else {
      setMessages([]);
    }
    setLoadingMsgs(false);
  }, [currentUser?.id]);

  useEffect(() => {
    if (activeChannelId) {
      fetchMessages(activeChannelId);
    }
  }, [activeChannelId, fetchMessages]);

  useEffect(() => {
    if (!activeChannelId) return;
    
    const msgChannel = supabase.channel(`community_messages:${activeChannelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `channel_id=eq.${activeChannelId}` },
        async (payload) => {
          if (payload.new.sender_id === currentUser?.id) return;
          
          setMessages(prev => [...prev, {
            id: payload.new.id,
            content: payload.new.content,
            sender_id: payload.new.sender_id,
            sent_at: payload.new.sent_at,
            is_mine: false,
            status: 'sent',
            type: payload.new.type,
            media_url: payload.new.media_url,
            reactions: [],
          } as ChatMessage]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_messages', filter: `channel_id=eq.${activeChannelId}` },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      )
      .subscribe();

    const reactChannel = supabase.channel(`community_reactions:${activeChannelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_message_reactions' },
        (payload) => {
          // Simplified: just refetch or update state
          // For now, let's update state manually to avoid full refetch
          if (payload.eventType === 'INSERT') {
            setMessages(prev => prev.map(m => {
              if (m.id === payload.new.message_id) {
                // Since ChatMessage.reactions is the grouped format, we'd need to regroups or just refetch.
                // Re-calculating correctly requires all raw reactions.
                // For optimal performance, let's do a quick local update of the grouped structure.
                const currentReactions = m.reactions || [];
                const existingGroup = currentReactions.find(r => r.emoji === payload.new.emoji);
                let nextReactions;
                if (existingGroup) {
                  nextReactions = currentReactions.map(r => 
                    r.emoji === payload.new.emoji 
                      ? { ...r, count: r.count + 1, reacted: r.reacted || payload.new.user_id === currentUser?.id, userIds: [...(r.userIds || []), payload.new.user_id] }
                      : r
                  );
                } else {
                  nextReactions = [...currentReactions, { 
                    emoji: payload.new.emoji, 
                    count: 1, 
                    reacted: payload.new.user_id === currentUser?.id, 
                    userIds: [payload.new.user_id] 
                  }];
                }
                return { ...m, reactions: nextReactions };
              }
              return m;
            }));
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.map(m => {
              if (m.id === payload.old.message_id) {
                const currentReactions = m.reactions || [];
                const nextReactions = currentReactions.map(r => {
                  if (r.emoji === payload.old.emoji) {
                    const nextCount = Math.max(0, r.count - 1);
                    const newUserIds = (r.userIds || []).filter(uid => uid !== payload.old.user_id);
                    return { ...r, count: nextCount, reacted: newUserIds.includes(currentUser?.id || ''), userIds: newUserIds };
                  }
                  return r;
                }).filter(r => r.count > 0);
                return { ...m, reactions: nextReactions };
              }
              return m;
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(reactChannel);
    };
  }, [activeChannelId, currentUser?.id, supabase]);

  const handleSendText = async (content: string) => {
    if (!activeChannelId || !currentUser?.id) return;
    
    const optId = `opt_${Date.now()}`;
    const optimistic: ChatMessage = {
      id: optId,
      content,
      sender_id: currentUser.id,
      sent_at: new Date().toISOString(),
      is_mine: true,
      status: 'sending',
      type: 'text',
      sender: {
        display_name: currentUser.displayName,
        username: currentUser.username,
        avatar_url: currentUser.avatar,
      }
    };

    setMessages(prev => [...prev, optimistic]);

    const res = await sendCommunityMessage(activeChannelId, currentUser.id, content, 'text');
    if (!res.success) {
      setMessages(prev => prev.map(m => m.id === optId ? { ...m, status: 'error' } : m));
    } else {
      setMessages(prev => prev.map(m => m.id === optId ? { ...m, id: res.data.id, status: 'sent' } : m));
    }
  };

  const handleSendFile = async (url: string, fileName: string, mime: string) => {
    if (!activeChannelId || !currentUser?.id) return;
    
    const isImage = mime.startsWith('image/');
    const type = isImage ? 'image' : 'file';

    const optId = `opt_${Date.now()}`;
    const optimistic: ChatMessage = {
      id: optId,
      content: fileName || 'Attachment',
      sender_id: currentUser.id,
      sent_at: new Date().toISOString(),
      is_mine: true,
      status: 'sending',
      type,
      media_url: url
    };

    setMessages(prev => [...prev, optimistic]);

    const res = await sendCommunityMessage(activeChannelId, currentUser.id, fileName || 'Attachment', type, url);
    if (!res.success) {
      setMessages(prev => prev.map(m => m.id === optId ? { ...m, status: 'error' } : m));
    } else {
      setMessages(prev => prev.map(m => m.id === optId ? { ...m, id: res.data.id, status: 'sent' } : m));
    }
  };

  const handleDeleteMessage = useCallback(async (id: string) => {
    if (!currentUser?.id) return;
    setMessages(prev => prev.filter(m => m.id !== id));
    await deleteCommunityMessageDB(currentUser.id, id);
  }, [currentUser?.id]);

  const handleReactMessage = useCallback(async (id: string, emoji: string) => {
    if (!currentUser?.id) return;
    await reactCommunityMessageDB(currentUser.id, id, emoji);
  }, [currentUser?.id]);

  const onlineCount = onlineUsers.size;

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden w-full mx-auto italic bg-[#0A0A0A] md:pb-0 relative text-white">
      
      {/* 1. Sidebar: Channels */}
      <div className="w-64 flex-shrink-0 border-r border-[#1f1f1f] bg-[#050505] flex flex-col h-full z-10">
        <div className="h-14 border-b border-[#1f1f1f] flex items-center px-4 shrink-0 transition-colors cursor-pointer hover:bg-white/5">
          <button onClick={() => router.push('/communities')} className="mr-3 text-neutral-500 hover:text-white transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
             <h2 className="text-sm font-black tracking-tight uppercase truncate">{community?.display_name || 'Loading...'}</h2>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
          {loadingChannels ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-v-cyan opacity-50" /></div>
          ) : (
            <div>
               <h3 className="text-[9px] font-black uppercase tracking-widest text-neutral-500 px-2 mb-2">Text Channels</h3>
               <div className="space-y-1">
                  {channels.map(c => (
                     <button
                        key={c.id}
                        onClick={() => setActiveChannelId(c.id)}
                        className={clsx(
                           "w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-all text-left group relative",
                           activeChannelId === c.id ? "bg-[#1f1f1f] text-white" : "hover:bg-[#121212] text-neutral-400 hover:text-neutral-200"
                        )}
                     >
                        {activeChannelId === c.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-md shadow-glow-primary" />}
                        <Hash size={14} className={activeChannelId === c.id ? "text-blue-500" : "text-neutral-600 group-hover:text-neutral-400"} />
                        <span className="text-xs font-bold uppercase tracking-tight">{c.name}</span>
                     </button>
                  ))}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Chat View */}
      <div className="flex-1 flex flex-col bg-[#0A0A0A] relative z-0">
        {activeChannel ? (
          <>
            <div className="h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-[#1f1f1f] bg-[#050505] z-10">
              <div className="flex items-center gap-3">
                <Hash size={16} className="text-neutral-500" />
                <h3 className="text-sm font-black uppercase tracking-tight text-white">{activeChannel.name}</h3>
              </div>
                <div className="flex items-center gap-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                 <div className="flex items-center gap-2">
                    <span className="live-dot w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="text-emerald-400">{onlineCount} Online</span>
                 </div>
              </div>
            </div>

            <div className="flex-1 custom-scrollbar overflow-y-auto">
               <MessageList
                 messages={messages}
                 loading={loadingMsgs}
                 isOtherTyping={false}
                 onLoadMore={() => {}}
                 hasMore={false}
                 loadingMore={false}
                 onRetry={() => {}}
                 onDelete={handleDeleteMessage}
                 onReact={handleReactMessage}
                 currentUserId={currentUser?.id}
               />
            </div>

            <div className="p-4 bg-[#0A0A0A] relative">
              <AnimatePresence>
                {typingUsers.size > 0 && (
                  <div className="absolute bottom-full left-0 z-10">
                    <TypingIndicator />
                  </div>
                )}
              </AnimatePresence>
              <ChatInput
                onSendText={handleSendText}
                onSendFile={handleSendFile}
                onTyping={handleTyping}
                disabled={false}
                placeholder={`Message #${activeChannel.name}...`}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-600">
            <div className="text-center">
              <Hash size={40} className="mx-auto mb-4 opacity-30" />
              <p className="text-[11px] font-black uppercase tracking-widest">Select a channel to start</p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Members Panel (Desktop) */}
      <MembersPanel members={communityMembers} onlineUsers={onlineUsers} />

    </div>
  );
}
