'use client';

import { useAppStore } from '@/lib/store';
import { Bell, MessageCircle, Menu, PanelLeft } from 'lucide-react';
import Link from 'next/link';
export default function Topbar() {
  const unreadNotifCount = useAppStore(s => s.unreadNotifCount);
  const setNotifPanelOpen = useAppStore(s => s.setNotifPanelOpen);
  const isMobileDrawerOpen = useAppStore(s => s.isMobileDrawerOpen);
  const setMobileDrawerOpen = useAppStore(s => s.setMobileDrawerOpen);
  const toggleSidebar = useAppStore(s => s.toggleSidebar);

  return (
    <header className="sticky top-0 z-30 w-full bg-obsidian-950/80 backdrop-blur-3xl">
      <div className="flex h-18 items-center px-6 md:px-10 justify-between max-w-[1400px] mx-auto w-full gap-8">

        {/* ── Mobile Menu Toggle (< 768px) ── */}
        <button 
          type="button"
          onClick={() => setMobileDrawerOpen(!isMobileDrawerOpen)} 
          className="md:hidden w-11 h-11 flex items-center justify-center rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:text-white hover:bg-white/[0.08] transition-all active:scale-[0.97] shadow-[0_2px_8px_rgba(0,0,0,0.35)] shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>

        {/* ── Tablet Sidebar Toggle (768–1280px) ── */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden md:flex xl:hidden w-11 h-11 items-center justify-center rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:text-white hover:bg-white/[0.08] transition-all active:scale-[0.97] shadow-[0_2px_8px_rgba(0,0,0,0.35)] shrink-0"
          aria-label="Toggle sidebar"
        >
          <PanelLeft size={20} />
        </button>

        <div className="flex-grow" />

        {/* ── Actions ── */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          <button 
            type="button"
            onClick={() => setNotifPanelOpen(true)}
            className="p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all relative group"
          >
            <Bell size={20} className="group-hover:rotate-12 transition-transform" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-tech-blue rounded-full border-2 border-obsidian-950 shadow-glow-primary" />
            )}
          </button>

          <Link href="/messages" className="p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all group">
            <MessageCircle size={20} className="group-hover:scale-110 transition-transform" />
          </Link>


        </div>
      </div>
    </header>
  );
}
