'use client';

import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Search, Bell, MessageCircle, Menu } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function Topbar() {
  const { unreadNotifCount, setNotifPanelOpen, setMobileDrawerOpen, currentUser } = useAppStore();
  const [searchVal, setSearchVal] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      router.push(`/explore?q=${encodeURIComponent(searchVal.trim())}`);
      setSearchVal('');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-surface-highest/60 backdrop-blur-2xl shadow-ambient border-b border-outline-variant/15 transition-all duration-300">
      <div className="flex h-14 items-center px-4 md:px-6 justify-between max-w-[1400px] mx-auto w-full gap-3">
        {/* Left: Mobile Menu Button */}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-high transition-colors text-on-surface flex-shrink-0"
          title="Open menu"
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>

        {/* Logo — mobile only center, hidden on desktop (sidebar has it) */}
        <Link href="/feed" className="md:hidden flex items-center justify-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary-gradient flex items-center justify-center text-white font-black text-base shadow-ambient">V</div>
          <span className="text-base font-display font-black tracking-tight text-on-surface">Verlyn</span>
        </Link>

        {/* Search bar */}
        <div className="flex-1 max-w-md mx-auto hidden sm:block">
          <div className="relative group w-full">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none group-focus-within:text-primary-light transition-colors"
            />
            <input
              type="text"
              placeholder="Search people, tags... (Enter to search)"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={handleSearch}
              className="w-full bg-surface-low border border-outline-variant/30 text-on-surface rounded-full py-2 pl-9 pr-10 focus:outline-none focus:ring-1 focus:ring-primary-light transition-all duration-300 focus:bg-surface-high placeholder:text-on-surface-variant text-sm"
              id="global-search"
              aria-label="Search Verlyn"
            />
            {searchVal && (
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded bg-surface-high text-on-surface-variant border border-outline-variant">
                ↵
              </kbd>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto">
          {/* Notifications */}
          <button
            id="notif-btn"
            className="relative flex items-center justify-center w-10 h-10 rounded-full text-on-surface hover:bg-surface-high transition-colors"
            onClick={() => setNotifPanelOpen(true)}
            title="Notifications"
            aria-label="Open notifications"
          >
            <Bell size={20} />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 border-2 border-surface-highest rounded-full bg-secondary-light shadow-[0_0_8px_var(--secondary-glow)]"></span>
            )}
          </button>

          {/* Messages */}
          <Link
            href="/messages"
            className="flex items-center justify-center w-10 h-10 rounded-full text-on-surface hover:bg-surface-high transition-colors"
            title="Messages"
            aria-label="Go to messages"
          >
            <MessageCircle size={20} />
          </Link>

          {/* Avatar */}
          <Link
            href="/profile"
            id="profile-btn"
            className="relative ml-1 flex items-center justify-center rounded-full transition-all duration-200 ring-2 ring-transparent hover:ring-primary-light focus-visible:ring-primary-light"
            title="My Profile"
            aria-label="Go to my profile"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentUser?.avatar || '/fallback-avatar.png'}
              alt={`${currentUser?.displayName || 'User'}'s avatar`}
              width={32} height={32}
              className="w-8 h-8 rounded-full object-cover shadow-ambient"
              onError={(e) => { (e.target as HTMLImageElement).src = '/fallback-avatar.png'; }}
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-secondary-light border-2 border-surface-highest rounded-full" />
          </Link>
        </div>
      </div>
    </header>
  );
}
