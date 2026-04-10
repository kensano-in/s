'use client';

import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/layout/Sidebar';
import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function MobileDrawer() {
  const { isMobileDrawerOpen, setMobileDrawerOpen } = useAppStore();

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
        <motion.div
          key="drawer"
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
          className="fixed inset-y-0 left-0 z-50 w-64 md:hidden shadow-2xl bg-[#0A0A0A]"
        >
          <div className="relative h-full">
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 text-neutral-400 hover:text-white"
              aria-label="Close navigation menu"
            >
              <X size={20} />
            </button>
            <Sidebar />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
