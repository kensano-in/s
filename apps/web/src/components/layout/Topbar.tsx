'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Search, Bell, MessageCircle, Menu } from 'lucide-react';
import Link from 'next/link';

export default function Topbar() {
  const { setSearchOpen, unreadNotifCount, setNotifPanelOpen, toggleSidebar, currentUser } = useAppStore();
  const [searchVal, setSearchVal] = useState('');

  return (
    <header className="sticky top-0 z-40 w-full bg-surface-highest/60 backdrop-blur-2xl shadow-ambient border-b border-outline-variant/15 transition-all duration-300">
      <div className="flex h-16 items-center px-4 md:px-6 justify-between max-w-[1400px] mx-auto w-full">
        {/* Left: Mobile Menu & Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="md:hidden icon-btn text-on-surface hover:bg-surface-high"
          >
            <Menu size={24} />
          </button>
          
          <h1 className="text-xl font-display font-bold tracking-tight bg-primary-gradient text-transparent bg-clip-text hidden md:block">
            Verlyn.
          </h1>
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-md mx-6">
          <div className="relative group w-full">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none group-hover:text-primary-light transition-colors"
            />
            <input
              type="text"
              placeholder="Search people, tags..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              className="w-full bg-surface-low border border-outline-variant/30 text-on-surface rounded-full py-2.5 pl-10 pr-10 focus:outline-none focus:ring-1 focus:ring-primary-light transition-all duration-300 focus:bg-surface-high placeholder:text-on-surface-variant text-sm truncate"
              id="global-search"
            />
            {searchVal && (
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded bg-surface-high text-on-surface-variant border border-outline-variant">
                ESC
              </kbd>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Notifications */}
          <button
            id="notif-btn"
            className="icon-btn relative text-on-surface transition-all group"
            onClick={() => setNotifPanelOpen(true)}
            title="Notifications"
          >
            <Bell size={20} className="icon-burst" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1 right-1.5 w-2.5 h-2.5 border-2 border-surface-highest rounded-full bg-secondary-light shadow-[0_0_8px_var(--secondary-glow)]"></span>
            )}
          </button>

          {/* Messages */}
          <Link href="/messages" className="icon-btn relative text-on-surface transition-all group" title="Messages">
            <MessageCircle size={20} className="icon-burst" />
          </Link>

          {/* Avatar */}
          <Link
            href="/profile"
            id="profile-btn"
            className="relative ml-2 flex items-center justify-center rounded-full transition-all duration-200 ring-2 ring-transparent hover:ring-primary-light"
            title="My Profile"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentUser?.avatar}
              alt={currentUser?.displayName}
              className="w-8 h-8 rounded-full object-cover shadow-ambient"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-secondary-light border-2 border-surface-highest rounded-full" />
          </Link>
        </div>
      </div>
    </header>
  );
}
