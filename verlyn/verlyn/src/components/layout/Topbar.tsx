'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { CURRENT_USER } from '@/lib/mockData';
import { Search, Bell, MessageCircle, Menu } from 'lucide-react';

export default function Topbar() {
  const { setSearchOpen, unreadNotifCount, setNotifPanelOpen, toggleSidebar } = useAppStore();
  const [searchVal, setSearchVal] = useState('');

  return (
    <header
      className="flex items-center gap-4 px-4 h-16 border-b flex-shrink-0 z-20"
      style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
    >
      {/* Mobile menu */}
      <button className="icon-btn lg:hidden" onClick={toggleSidebar}>
        <Menu size={20} />
      </button>

      {/* Search bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-tertiary)' }}
          />
          <input
            type="text"
            placeholder="Search people, posts, communities…"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            className="v-input pl-10 pr-4 py-2 text-sm"
            id="global-search"
          />
          {searchVal && (
            <kbd
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: 'var(--surface-hover)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}
            >
              ESC
            </kbd>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 ml-auto">
        {/* Notifications */}
        <button
          id="notif-btn"
          className="icon-btn relative"
          onClick={() => setNotifPanelOpen(true)}
          title="Notifications"
        >
          <Bell size={20} />
          {unreadNotifCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
              style={{ background: 'var(--v-pink)', boxShadow: '0 0 8px var(--v-pink)' }}
            >
              {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
            </span>
          )}
        </button>

        {/* Messages */}
        <button className="icon-btn relative" title="Messages">
          <MessageCircle size={20} />
          <span className="notif-dot" />
        </button>

        {/* Avatar */}
        <button
          id="profile-btn"
          className="relative ml-1 rounded-full transition-all duration-200 hover:ring-2 hover:ring-offset-2"
          style={{ '--tw-ring-color': 'var(--v-violet)', '--tw-ring-offset-color': 'var(--bg-elevated)' } as React.CSSProperties}
          title="My Profile"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CURRENT_USER.avatar}
            alt={CURRENT_USER.displayName}
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="online-dot" style={{ width: '9px', height: '9px' }} />
        </button>
      </div>
    </header>
  );
}
