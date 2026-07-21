'use client';

import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/layout/Sidebar';
import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function MobileDrawer() {
  const isMobileDrawerOpen = useAppStore(s => s.isMobileDrawerOpen);
  const setMobileDrawerOpen = useAppStore(s => s.setMobileDrawerOpen);

  // Escape key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileDrawerOpen(false);
    };
    if (isMobileDrawerOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isMobileDrawerOpen, setMobileDrawerOpen]);

  return (
    <AnimatePresence>
      {isMobileDrawerOpen && (
        <>
          {/* Backdrop — tap to close */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-md md:hidden"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />
          <motion.div
            key="drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-y-0 left-0 z-50 w-[230px] md:hidden shadow-2xl bg-[#0A0A0A]/40 backdrop-blur-3xl border-r border-white/[0.04]"
          >
            <div className="relative h-full">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="absolute top-4 right-4 z-[60] p-2 text-neutral-400 hover:text-white"
                aria-label="Close navigation menu"
              >
                <X size={20} />
              </button>
              <Sidebar />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
