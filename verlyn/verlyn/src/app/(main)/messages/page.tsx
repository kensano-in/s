'use client';

import { useState } from 'react';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES, CURRENT_USER } from '@/lib/mockData';
import type { Conversation } from '@/lib/types';
import { Search, Edit, Lock, Phone, Video, MoreHorizontal, Send, Smile, Paperclip, Mic } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';



export default function MessagesPage() {
  const [activeConv, setActiveConv] = useState<Conversation | null>(MOCK_CONVERSATIONS[0]);
  const [msg, setMsg] = useState('');

  const participant = activeConv?.isGroup
    ? null
    : activeConv?.participants[0];

  return (
    <div
      className="-mx-4 -my-6 flex"
      style={{ height: 'calc(100vh - 64px)' }}
    >
      {/* Conversation List */}
      <div
        className="w-[300px] flex-shrink-0 border-r flex flex-col"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
      >
        {/* Header */}
        <div className="px-4 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Messages</h2>
          <button className="icon-btn" title="New message" id="new-message-btn">
            <Edit size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
            <input
              placeholder="Search messages…"
              className="v-input pl-9 py-2 text-xs"
              id="message-search"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {MOCK_CONVERSATIONS.map((conv) => {
            const other = conv.isGroup ? null : conv.participants[0];
            const isActive = activeConv?.id === conv.id;
            return (
              <div
                key={conv.id}
                onClick={() => setActiveConv(conv)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 relative',
                  isActive ? '' : 'hover:opacity-90'
                )}
                style={{
                  background: isActive ? 'rgba(108,99,255,0.08)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--v-violet)' : '3px solid transparent',
                }}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {conv.isGroup ? (
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl" style={{ background: 'var(--surface)' }}>
                      {conv.groupIcon}
                    </div>
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={other?.avatar} alt={other?.displayName} className="w-11 h-11 rounded-full object-cover" />
                      {other?.isOnline && <span className="online-dot" />}
                    </>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {conv.isGroup ? conv.groupName : other?.displayName}
                      </span>
                      {conv.isEncrypted && <Lock size={10} style={{ color: 'var(--v-green)', flexShrink: 0 }} />}
                    </div>
                    <span className="text-[10px] flex-shrink-0 ml-1" style={{ color: 'var(--text-tertiary)' }}>
                      {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: false })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs truncate" style={{ color: conv.unreadCount > 0 ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>
                      {conv.lastMessage?.content}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span
                        className="text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--v-violet)', color: '#fff' }}
                      >
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

      {/* Chat Window */}
      {activeConv ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div
            className="flex items-center gap-3 px-5 py-3.5 border-b flex-shrink-0"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
          >
            <div className="relative flex-shrink-0">
              {activeConv.isGroup ? (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg" style={{ background: 'var(--surface)' }}>
                  {activeConv.groupIcon}
                </div>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={participant?.avatar} alt={participant?.displayName} className="w-9 h-9 rounded-full object-cover" />
                  {participant?.isOnline && <span className="online-dot" />}
                </>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {activeConv.isGroup ? activeConv.groupName : participant?.displayName}
                </span>
                {activeConv.isEncrypted && (
                  <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(0,229,160,0.1)', color: 'var(--v-green)', border: '1px solid rgba(0,229,160,0.2)' }}>
                    <Lock size={10} /> E2EE
                  </span>
                )}
              </div>
              <div className="text-xs" style={{ color: 'var(--v-green)' }}>
                {participant?.isOnline ? 'Online now' : 'Last seen recently'}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="icon-btn" title="Voice call" id="voice-call-btn"><Phone size={18} /></button>
              <button className="icon-btn" title="Video call" id="video-call-btn"><Video size={18} /></button>
              <button className="icon-btn" title="More options"><MoreHorizontal size={18} /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* E2EE notice */}
            {activeConv.isEncrypted && (
              <div className="flex justify-center">
                <span
                  className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5"
                  style={{ background: 'rgba(0,229,160,0.08)', color: 'var(--v-green)', border: '1px solid rgba(0,229,160,0.15)' }}
                >
                  <Lock size={10} />
                  Messages are end-to-end encrypted. Only you and {participant?.displayName ?? 'participants'} can read them.
                </span>
              </div>
            )}

            {MOCK_MESSAGES.map((message) => {
              const isMine = message.senderId === 'u_current';
              return (
                <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} gap-2`}>
                  {!isMine && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={participant?.avatar} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-auto" />
                  )}
                  <div className="flex flex-col max-w-xs gap-1">
                    <div className={isMine ? 'bubble-sent' : 'bubble-recv'}>
                      {message.content}
                    </div>
                    <div
                      className={`text-[10px] ${isMine ? 'text-right' : 'text-left'}`}
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {formatDistanceToNow(new Date(message.sentAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input bar */}
          <div
            className="flex items-center gap-3 px-4 py-3 border-t"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
          >
            <button className="icon-btn flex-shrink-0" title="Attach file">
              <Paperclip size={18} />
            </button>
            <div className="flex-1 relative">
              <input
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Type a message…"
                className="v-input py-2.5 pr-10"
                id="message-input"
                onKeyDown={(e) => { if (e.key === 'Enter') setMsg(''); }}
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 icon-btn" title="Emoji">
                <Smile size={16} />
              </button>
            </div>
            {msg ? (
              <button
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 transition-transform hover:scale-105 active:scale-95 shine"
                style={{ background: 'linear-gradient(135deg, var(--v-violet), var(--v-cyan))' }}
                onClick={() => setMsg('')}
                id="send-btn"
              >
                <Send size={16} />
              </button>
            ) : (
              <button className="icon-btn flex-shrink-0" title="Voice message" id="voice-msg-btn">
                <Mic size={18} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p style={{ color: 'var(--text-tertiary)' }}>Select a conversation</p>
        </div>
      )}
    </div>
  );
}
