'use client';

import { useIdentitiesStore } from '@/lib/identities-store';
import { useAppStore } from '@/lib/store';
import { signOut, swapAccount } from '@/app/login/actions';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, LogOut, ShieldCheck, ArrowRightLeft, Lock } from 'lucide-react';
import { decryptData } from '@/lib/security/encryption';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

interface IdentitySwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IdentitySwitcher({ isOpen, onClose }: IdentitySwitcherProps) {
  const { identities, removeIdentity } = useIdentitiesStore();
  const { currentUser } = useAppStore();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSwitch = async (id: string, encryptedSession?: string | null) => {
    // 1. If it's already current, just close
    if (id === currentUser?.id) {
        onClose();
        return;
    }

    // 2. Automated Switch (Zero-Login)
    if (encryptedSession) {
      try {
        const sessionStr = await decryptData(encryptedSession);
        const session = JSON.parse(sessionStr);

        console.log('[Security] Triggering Server-Side Auth Swap...');
        // Execute server action natively to securely lock cookies BEFORE we navigate
        const res = await swapAccount(session.access_token, session.refresh_token);
        
        if (res.success) {
            console.log('[Security] Swap complete, executing violent DOM refresh...');
            // Hard SPA escape to reset all client state 
            window.location.href = '/feed';
            return;
        }
      } catch (e) {
        console.error('[Security] Corrupted session detected, purging identity:', e);
        // Clean up the ghost identity from Local Storage so they don't get stuck in a fake-loop.
        removeIdentity(id);
      }
    }
    
    // 3. Fallback: Manual Sign-In if session is missing or corrupted
    // MUST wrap in startTransition to prevent Next.js from swallowing the NEXT_REDIRECT exception!
    startTransition(() => {
      signOut();
    });
  };

  const handleAddAccount = async () => {
    if (identities.length >= 3) {
      alert("Account limit reached (Max 3). Please remove an identity to add another.");
      return;
    }
    startTransition(() => {
      signOut();
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md"
          />

          {/* Switcher Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            <div className="p-7">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3 text-v-cyan">
                  <div className="bg-v-cyan/10 p-2 rounded-lg">
                    <ArrowRightLeft size={16} />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-[0.25em] block">Identity Switcher</span>
                    <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">{identities.length} / 3 Accounts Used</span>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors text-neutral-500 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3 mb-8 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                {identities.map((id) => (
                  <motion.div
                    key={id.id}
                    layout
                    whileHover={{ scale: 1.01, x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSwitch(id.id, id.encryptedSession)}
                    className={`group cursor-pointer relative flex items-center justify-between p-4 rounded-3xl border transition-all duration-300 ${
                      id.id === currentUser?.id 
                        ? 'bg-blue-600/10 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                        : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.07]'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-800 border-2 border-transparent group-hover:border-v-cyan/40 transition-all">
                        {id.avatarUrl ? (
                          <img src={id.avatarUrl} alt={id.username} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-bold text-neutral-500 uppercase">
                            {id.username[0]}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                           <p className="text-[15px] font-extrabold text-white group-hover:text-v-cyan transition-colors truncate">
                             {id.displayName}
                           </p>
                           {id.encryptedSession && id.id !== currentUser?.id && (
                             <Lock size={10} className="text-neutral-600" />
                           )}
                        </div>
                        <p className="text-[12px] text-neutral-500 font-medium tracking-wide">@{id.username}</p>
                      </div>
                    </div>
                    {id.id === currentUser?.id ? (
                      <div className="bg-blue-500/20 text-blue-400 p-2 rounded-full shadow-inner">
                        <ShieldCheck size={18} />
                      </div>
                    ) : (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-neutral-500 flex items-center gap-2">
                             <span className="text-[10px] font-black uppercase tracking-tighter">Switch</span>
                             <ArrowRightLeft size={16} />
                        </div>
                    )}
                  </motion.div>
                ))}
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleAddAccount}
                  disabled={identities.length >= 3}
                  className={`w-full h-14 flex items-center justify-center gap-3 font-bold rounded-2xl transition-all active:scale-[0.98] ${
                    identities.length >= 3 
                      ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed' 
                      : 'bg-white text-black hover:bg-neutral-200'
                  }`}
                >
                  <UserPlus size={20} />
                  {identities.length >= 3 ? 'Identity Limit Reached' : 'Add New Identity'}
                </button>
                <button
                  onClick={() => {
                    startTransition(() => {
                      signOut();
                    });
                  }}
                  className="w-full h-14 flex items-center justify-center gap-3 bg-white/5 text-neutral-400 font-bold rounded-2xl hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-[0.98] border border-white/5"
                >
                  <LogOut size={20} />
                  Log Out Current
                </button>
              </div>
            </div>

            <div className="px-8 py-4 bg-white/5 border-t border-white/5">
                <p className="text-[10px] text-center text-neutral-600 font-medium uppercase tracking-widest italic">
                    Universal Identity Protocol v4.2 — Encrypted Auto-Switching
                </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
