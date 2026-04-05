'use client';

import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Search, Bell, MessageCircle, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

export default function Topbar() {
  const { unreadNotifCount, setNotifPanelOpen, setMobileDrawerOpen, currentUser } = useAppStore();
  const [searchVal, setSearchVal] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      router.push(`/explore?q=${encodeURIComponent(searchVal.trim())}`);
      setSearchVal('');
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setSearchVal('');
      inputRef.current?.blur();
    }
  };

  const handleSearchClick = () => {
    if (searchVal.trim()) {
      router.push(`/explore?q=${encodeURIComponent(searchVal.trim())}`);
      setSearchVal('');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] transition-all duration-300"
      style={{ background: 'rgba(10,8,20,0.75)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
      <div className="flex h-14 items-center px-4 md:px-6 justify-between max-w-[1400px] mx-auto w-full gap-3">

        {/* Left: Mobile Menu */}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/8 transition-colors text-on-surface flex-shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>

        {/* Logo — mobile only */}
        <Link href="/feed" className="md:hidden flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary-gradient flex items-center justify-center text-white font-black text-base shadow-ambient">V</div>
          <span className="text-base font-display font-black tracking-tight text-on-surface">Verlyn</span>
        </Link>

        {/* ── Premium Search Bar ── */}
        <div className="flex-1 max-w-lg mx-auto hidden sm:block">
          <div
            className="relative group transition-all duration-300"
            style={{
              filter: isFocused ? 'drop-shadow(0 0 16px rgba(147,51,234,0.25))' : 'none',
            }}
          >
            {/* Glow border on focus */}
            <div
              className="absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none"
              style={{
                opacity: isFocused ? 1 : 0,
                background: 'linear-gradient(135deg, rgba(147,51,234,0.5), rgba(79,209,197,0.5))',
                padding: '1px',
                borderRadius: '16px',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
              }}
            />

            {/* Search icon */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Search
                size={15}
                className="transition-colors duration-200"
                style={{ color: isFocused ? 'rgba(167,139,250,1)' : 'rgba(255,255,255,0.3)' }}
              />
            </div>

            <input
              ref={inputRef}
              type="text"
              placeholder="Search people, posts, tags…"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={handleSearch}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full py-2.5 pl-11 pr-12 rounded-2xl text-[13.5px] font-medium transition-all duration-200 focus:outline-none"
              style={{
                background: isFocused ? 'rgba(147,51,234,0.06)' : 'rgba(255,255,255,0.05)',
                border: isFocused ? '1px solid rgba(147,51,234,0.4)' : '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.9)',
                caretColor: 'rgba(167,139,250,1)',
              }}
              id="global-search"
              aria-label="Search Verlyn"
              autoComplete="off"
            />

            {/* Right side: clear or Enter hint */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchVal ? (
                <>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); setSearchVal(''); }}
                    className="w-5 h-5 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(255,255,255,0.12)' }}
                    aria-label="Clear search"
                  >
                    <X size={10} color="white" />
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); handleSearchClick(); }}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors"
                    style={{ background: 'rgba(147,51,234,0.3)', color: 'rgba(167,139,250,1)', border: '1px solid rgba(147,51,234,0.4)' }}
                    aria-label="Search"
                  >
                    ↵
                  </button>
                </>
              ) : (
                <kbd
                  className="text-[10px] px-1.5 py-0.5 rounded opacity-0 group-focus-within:opacity-100 transition-opacity hidden md:block"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  ⌘K
                </kbd>
              )}
            </div>
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
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 border-2 border-surface-highest rounded-full bg-secondary-light shadow-[0_0_8px_var(--secondary-glow)]" />
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
            className="relative ml-1 flex-shrink-0 transition-all duration-200"
            title="My Profile"
            aria-label="Go to my profile"
          >
            <div className="p-[2px] rounded-full transition-all duration-200 hover:scale-105"
              style={{ background: 'linear-gradient(135deg, rgba(147,51,234,0.7), rgba(79,209,197,0.7))' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentUser?.avatar || '/fallback-avatar.png'}
                alt={`${currentUser?.displayName || 'User'}'s avatar`}
                width={34} height={34}
                className="w-[34px] h-[34px] rounded-full object-cover block"
                style={{ display: 'block' }}
                onError={(e) => { (e.target as HTMLImageElement).src = '/fallback-avatar.png'; }}
              />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-secondary-light border-2 border-surface-highest rounded-full" />
          </Link>
        </div>
      </div>
    </header>
  );
}
