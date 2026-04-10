'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, Settings, Users, ChevronLeft, Loader2, Radio } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';

import { getCommunityChannels, getCommunityMessages, sendCommunityMessage } from '../actions';
import MessageList from '@/components/Chat/MessageList';
import ChatInput from '@/components/Chat/ChatInput';
import { ChatMessage } from '@/components/Chat/MessageItem';

function SimulatedMembersPanel({ baseCount }: { baseCount: number }) {
   const [online, setOnline] = useState(Math.max(1, Math.floor(baseCount * 0.3)));
   
   useEffect(() => {
     const interval = setInterval(() => {
        const diff = Math.floor(Math.random() * 3) - 1; 
        setOnline(prev => Math.max(1, Math.min(baseCount, prev + diff)));
     }, 8000);
     return () => clearInterval(interval);
   }, [baseCount]);

   return (
      <div className="w-60 flex-shrink-0 bg-[#050505] border-l border-white/5 flex flex-col h-full hidden xl:flex">
         <div className="h-14 flex items-center px-4 border-b border-white/5 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
               <Users size={12} /> Members
            </span>
         </div>
         <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-6">
            <div>
               <h4 className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-3 px-1">Online — {online}</h4>
               <div className="space-y-2">
                  {Array.from({ length: Math.min(15, online) }).map((_, i) => (
                     <div key={i} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group">
                        <div className="relative">
                           <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`} className="w-8 h-8 rounded-full border border-white/10" alt="" />
                           <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-[#050505]" />
                        </div>
                        <span className="text-xs font-bold text-neutral-300 group-hover:text-white truncate">User {Math.floor(Math.random() * 9000) + 1000}</span>
                     </div>
                  ))}
               </div>
            </div>
            
            {baseCount > online && (
               <div>
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-neutral-600 mb-3 px-1">Offline — {baseCount - online}</h4>
                  <div className="space-y-2 opacity-50">
                     {Array.from({ length: Math.min(10, baseCount - online) }).map((_, i) => (
                        <div key={`off${i}`} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group">
                           <div className="relative">
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=off${i}`} className="w-8 h-8 rounded-full border border-white/10 grayscale opacity-50" alt="" />
                           </div>
                           <span className="text-xs font-bold text-neutral-500 group-hover:text-neutral-400 truncate">OfflineUser {Math.floor(Math.random() * 90) + 10}</span>
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

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);

  const activeChannel = channels.find(c => c.id === activeChannelId);

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
      setLoadingChannels(false);
    }
    loadData();
  }, [id, supabase]);

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
    const channel = supabase.channel(`community_messages:${activeChannelId}`)
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
          } as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      type: 'text'
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

  const simulatedLiveCount = Math.max(1, Math.floor((community?.member_count || 1) * 0.3));

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
                    <span className="text-emerald-400">{simulatedLiveCount} Online</span>
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
                 onDelete={async (id) => {}}
               />
            </div>

            <div className="p-4 bg-[#0A0A0A]">
              <ChatInput
                onSendText={handleSendText}
                onSendFile={handleSendFile}
                onTyping={() => {}}
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
      <SimulatedMembersPanel baseCount={community?.member_count || 1} />

    </div>
  );
}
