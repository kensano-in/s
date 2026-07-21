'use client';

import { useIdentitiesStore } from '@/lib/identities-store';
import { useAppStore } from '@/lib/store';
import { signOut, swapAccount } from '@/app/login/actions';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, LogOut, ShieldCheck, ArrowRightLeft, Lock, Loader2 } from 'lucide-react';
import { decryptData } from '@/lib/security/encryption';
import { useRouter } from 'next/navigation';
import { useTransition, useState, useEffect, useRef, RefObject, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface IdentitySwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Ref to the anchor element — popup positions itself relative to this.
   * Falls back to centered overlay when ref is empty.
   */
  anchorRef?: RefObject<HTMLElement | null>;
}

interface PopupPosition {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  transformOrigin: string;
}

const POPUP_WIDTH  = 260;
const POPUP_MARGIN = 12; // min distance from viewport edges

function computePosition(anchor: HTMLElement): PopupPosition {
  const rect   = anchor.getBoundingClientRect();
  const vw     = window.innerWidth;
  const vh     = window.innerHeight;

  // Horizontal: prefer left-aligned with anchor; flip if overflow right
  let left: number | undefined = rect.left;
  let right: number | undefined;
  if (left + POPUP_WIDTH > vw - POPUP_MARGIN) {
    right = vw - rect.right;
    left  = undefined;
  }

  // Vertical: prefer above anchor (popup opens upward from sidebar bottom card)
  // But if there's not enough space above, open downward
  const spaceAbove = rect.top;
  const spaceBelow = vh - rect.bottom;
  let top: number | undefined;
  let bottom: number | undefined;
  let origin: string;

  if (spaceAbove >= 320 || spaceAbove >= spaceBelow) {
    // open upward
    bottom = vh - rect.top + POPUP_MARGIN;
    origin = left !== undefined ? 'bottom left' : 'bottom right';
  } else {
    // open downward
    top    = rect.bottom + POPUP_MARGIN;
    origin = left !== undefined ? 'top left' : 'top right';
  }

  return {
    top,
    bottom,
    left: left !== undefined ? Math.max(POPUP_MARGIN, left) : undefined,
    right: right !== undefined ? Math.max(POPUP_MARGIN, right) : undefined,
    transformOrigin: origin,
  };
}

export default function IdentitySwitcher({ isOpen, onClose, anchorRef }: IdentitySwitcherProps) {
  const { identities, removeIdentity } = useIdentitiesStore();
  const currentUser = useAppStore(s => s.currentUser);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<PopupPosition | null>(null);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSwitchingTo(null);
    }
  }, [isOpen]);

  // Recompute position whenever the popup opens or window resizes
  useEffect(() => {
    const anchorEl = anchorRef?.current;
    if (!isOpen || !anchorEl) {
      setPosition(null);
      return;
    }

    const update = () => setPosition(computePosition(anchorEl!));
    update();

    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('scroll', update, { passive: true, capture: true });
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isOpen, anchorRef]);

  const popupRef = useRef<HTMLDivElement>(null);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const focusableEls = popupRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex="0"]');
      if (focusableEls && focusableEls.length > 0) {
        (focusableEls[0] as HTMLElement).focus();
      }
    }, 50);

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (!popupRef.current) return;
      const focusableEls = popupRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex="0"]');
      if (focusableEls.length === 0) return;
      const firstEl = focusableEls[0] as HTMLElement;
      const lastEl = focusableEls[focusableEls.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          lastEl.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastEl) {
          firstEl.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleFocusTrap);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleFocusTrap);
    };
  }, [isOpen]);

  const performClientSignOut = async (targetUrl: string) => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase.auth.signOut();
      
      // Clear current user state
      const { setUser, setFollowing } = useAppStore.getState();
      setUser(null);
      setFollowing([]);
      
      // Redirect
      window.location.href = targetUrl;
    } catch (e) {
      console.warn('Client signout failed:', e);
      window.location.href = targetUrl;
    }
  };

  const handleSwitch = async (id: string, encryptedSession?: string | null) => {
    if (id === currentUser?.id || switchingTo) return;
    setSwitchingTo(id);

    if (encryptedSession) {
      try {
        const sessionStr = await decryptData(encryptedSession);
        const session    = JSON.parse(sessionStr);
        const res        = await swapAccount(session.access_token, session.refresh_token);
        if (res && res.success) {
          window.location.href = '/feed';
          return;
        } else {
          // Session is stale — remove from store but DO NOT sign out the current user
          removeIdentity(id);
          setSwitchingTo(null);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('verlyn:toast', {
              detail: {
                message: 'Could not switch to this account — the saved session has expired. Please add the account again.',
                type: 'error',
              },
            }));
          }
          return;
        }
      } catch (e) {
        // Decryption or network failure — remove stale entry, keep current user active
        removeIdentity(id);
        setSwitchingTo(null);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('verlyn:toast', {
            detail: {
              message: 'Could not switch account. Please try adding it again.',
              type: 'error',
            },
          }));
        }
        return;
      }
    }

    // No saved session: need to sign in fresh.
    // Only sign out if there's NO encrypted session (i.e., a ghost entry with no credentials).
    await performClientSignOut('/login');
  };

  const handleAddAccount = async () => {
    if (switchingTo) return;
    if (identities.length >= 3) {
      alert('Account limit reached (Max 3). Please remove an identity to add another.');
      return;
    }
    setSwitchingTo('add');

    // Save the current user's active session BEFORE signing out.
    // This lets the user come back to this account via the switcher if they
    // cancel adding a new account or encounter an error on the login page.
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session && currentUser?.id) {
        const { encryptData } = await import('@/lib/security/encryption');
        const encrypted = await encryptData(JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }));
        const { setEncryptedSession } = useIdentitiesStore.getState();
        setEncryptedSession(currentUser.id, encrypted);
      }
    } catch (e) {
      console.warn('[IdentitySwitcher] Could not save session before add-account:', e);
    }

    await performClientSignOut('/login?mode=add');
  };

  const handleLogOutCurrent = async () => {
    if (switchingTo) return;
    setSwitchingTo('logout');
    await performClientSignOut('/login');
  };

  if (!mounted) return null;

  // If anchor provided but position not yet computed, skip first frame
  const anchorEl = anchorRef?.current;
  const useAnchorMode = !!anchorEl;
  const showPopup = isOpen && (!useAnchorMode || position !== null);

  const popupStyle: React.CSSProperties = useAnchorMode && position
    ? {
        position: 'fixed',
        top:    position.top    !== undefined ? `${position.top}px`    : 'auto',
        bottom: position.bottom !== undefined ? `${position.bottom}px` : 'auto',
        left:   position.left   !== undefined ? `${position.left}px`   : 'auto',
        right:  position.right  !== undefined ? `${position.right}px`  : 'auto',
        width:  `${POPUP_WIDTH}px`,
        maxHeight: 'min(380px, 80svh)',
        zIndex: 1000,
      }
    : {
        // Fallback: centered
        position: 'fixed',
        left: '50%',
        top:  '50%',
        transform: 'translate(-50%, -50%)',
        width:  `min(${POPUP_WIDTH}px, calc(100vw - 24px))`,
        maxHeight: 'min(380px, 80svh)',
        zIndex: 1000,
      };

  return createPortal(
    <AnimatePresence>
      {showPopup && (
        <>
          {/* Backdrop — full-screen dimmer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: 999 }}
          />

          {/* Switcher Card */}
          <motion.div
            ref={popupRef}
            initial={{ opacity: 0, scale: 0.92, y: useAnchorMode ? 6 : 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: useAnchorMode ? 6 : 16 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
            style={{
              ...popupStyle,
              backdropFilter: 'blur(40px) saturate(200%)',
              WebkitBackdropFilter: 'blur(40px) saturate(200%)',
              background: 'rgba(10, 10, 18, 0.96)',
              border: '1px solid rgba(255,255,255,0.09)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
              borderRadius: 24,
              overflow: 'hidden',
            }}
          >
            <div
              className="flex flex-col"
              style={{ maxHeight: 'min(380px, 80svh)', overflowY: 'auto' }}
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-white">
                    <div className="bg-primary/10 p-1.5 rounded-lg text-primary shrink-0">
                      <ArrowRightLeft size={13} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] block leading-none mb-0.5">Switch Account</span>
                      <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider block leading-none">
                        {identities.length} / 3 Accounts
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-neutral-500 hover:text-white"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Identity list */}
                <div className="space-y-1.5 mb-4">
                  {identities.map((id) => (
                    <motion.div
                      key={id.id}
                      layout
                      whileHover={{ scale: 1.01, x: 1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSwitch(id.id, id.encryptedSession)}
                      className={`group cursor-pointer relative flex items-center justify-between py-2 px-2.5 rounded-[16px] border transition-all duration-200 ${
                        id.id === currentUser?.id
                          ? 'bg-primary/10 border-primary/30'
                          : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-800 border border-transparent group-hover:border-primary/40 transition-all shrink-0">
                          {id.avatarUrl ? (
                            <img src={id.avatarUrl} alt={id.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-neutral-400 uppercase">
                              {id.username[0]}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-[13px] font-extrabold text-white group-hover:text-primary transition-colors truncate">
                              {id.displayName}
                            </p>
                            {id.encryptedSession && id.id !== currentUser?.id && (
                              <Lock size={8} className="text-neutral-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-500 font-medium tracking-wide truncate">@{id.username}</p>
                        </div>
                      </div>

                      {id.id === currentUser?.id ? (
                        <div className="bg-blue-500/20 text-blue-400 p-1 rounded-full shrink-0">
                          <ShieldCheck size={12} />
                        </div>
                      ) : switchingTo === id.id ? (
                        <div className="p-1 text-neutral-500 shrink-0">
                          <Loader2 size={12} className="animate-spin" />
                        </div>
                      ) : (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-neutral-500 flex items-center gap-0.5 shrink-0">
                          <span className="text-[8px] font-black uppercase tracking-tighter">Switch</span>
                          <ArrowRightLeft size={10} />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={handleAddAccount}
                    disabled={identities.length >= 3 || !!switchingTo}
                    className={`w-full h-10 flex items-center justify-center gap-2 text-xs font-bold rounded-xl transition-all active:scale-[0.98] ${
                      identities.length >= 3 || !!switchingTo
                        ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                        : 'bg-white text-black hover:bg-neutral-100 shadow-md'
                    }`}
                  >
                    {switchingTo === 'add' ? (
                      <Loader2 size={14} className="animate-spin text-black" />
                    ) : (
                      <UserPlus size={14} />
                    )}
                    {switchingTo === 'add' ? 'Loading...' : (identities.length >= 3 ? 'Account Limit Reached' : 'Add Account')}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogOutCurrent}
                    disabled={!!switchingTo}
                    className={`w-full h-10 flex items-center justify-center gap-2 bg-white/5 text-neutral-400 text-xs font-bold rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all active:scale-[0.98] border border-white/5 ${
                      switchingTo ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {switchingTo === 'logout' ? (
                      <Loader2 size={14} className="animate-spin text-red-400" />
                    ) : (
                      <LogOut size={14} />
                    )}
                    {switchingTo === 'logout' ? 'Logging Out...' : 'Log Out Current'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
