'use client';

import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Search, Bell, MessageCircle, Menu, User } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef } from 'react';
import clsx from 'clsx';

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
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#262626] bg-[#0A0A0A]">
      <div className="flex h-16 items-center px-4 md:px-6 justify-between max-w-[1200px] mx-auto w-full gap-4">

        {/* ── Mobile Menu Toggle ── */}
        <button 
          onClick={() => setMobileDrawerOpen(true)} 
          className="md:hidden p-2 text-neutral-400 hover:text-white"
        >
          <Menu size={24} />
        </button>

        {/* ── Search Bar ── */}
        <div className="flex-1 max-w-xl">
          <div className={clsx(
              "relative group flex items-center bg-[#1A1A1A] rounded-lg border transition-colors",
              isFocused ? "border-blue-600/50" : "border-[#262626]"
          )}>
            <div className="pl-3 text-neutral-500">
              <Search size={16} />
            </div>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={handleSearch}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full py-2 px-3 bg-transparent border-none focus:ring-0 text-sm text-white placeholder:text-neutral-500"
              autoComplete="off"
            />
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center gap-1 sm:gap-2">
          
          <button 
            onClick={() => setNotifPanelOpen(true)}
            className="p-2 text-neutral-400 hover:text-white relative"
          >
            <Bell size={20} />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full border border-[#0A0A0A]" />
            )}
          </button>

          <Link href="/messages" className="p-2 text-neutral-400 hover:text-white">
            <MessageCircle size={20} />
          </Link>

          <Link href="/profile" className="ml-1">
            <img 
              src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username || 'user'}`} 
              className="w-8 h-8 rounded-full object-cover border border-[#262626]" 
              alt="profile"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
