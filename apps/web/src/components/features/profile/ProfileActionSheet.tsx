"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Copy, QrCode, VolumeX, ShieldAlert, Ban, Loader2 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { useAppStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { submitReport } from '@/app/(main)/feed/report-actions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  displayName: string;
  isOwner?: boolean;
  avatarUrl?: string;
  isBlocked?: boolean;
  onBlockToggle?: (shouldBlock: boolean) => void;
}

export default function ProfileActionSheet({ isOpen, onClose, userId, username, displayName, isOwner = false, avatarUrl, isBlocked = false, onBlockToggle }: Props) {
  const router = useRouter();
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const currentUser = useAppStore(state => state.currentUser);
  const setUser = useAppStore(state => state.setUser);

  const metadata = useMemo(() => currentUser?.metadata || {}, [currentUser?.metadata]);
  const isMuted = useMemo(() => (metadata.muted_users || []).includes(username), [metadata.muted_users, username]);
  const isRestricted = useMemo(() => (metadata.restricted_users || []).includes(username), [metadata.restricted_users, username]);

  const profileUrl = typeof window !== 'undefined' ? `${window.location.origin}/profile/${username}` : `/profile/${username}`;

  useEffect(() => {
    if (!isOpen) {
      setShowQR(false);
      setQrDataUrl('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (showQR && profileUrl) {
      QRCode.toDataURL(profileUrl, {
        margin: 1,
        width: 300,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#ffffff',
          light: '#000000'
        }
      })
      .then((url: string) => {
        setQrDataUrl(url);
      })
      .catch((err: any) => {
        console.error('Failed to generate QR code locally:', err);
      });
    }
  }, [showQR, profileUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${displayName}'s Verlyn Profile`,
          text: `Check out @${username} on Verlyn.`,
          url: profileUrl,
        });
      } else {
        handleCopyLink();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAction = async (actionType: string) => {
    if (!currentUser?.id) return;
    setLoadingAction(actionType);

    const supabase = createClient();
    let updatedList: string[] = [];
    let msg = "";

    try {
      if (actionType === 'mute') {
        const currentMuted = metadata.muted_users || [];
        const isCurrentlyMuted = currentMuted.includes(username);
        if (isCurrentlyMuted) {
          updatedList = currentMuted.filter((u: string) => u !== username);
          msg = `Unmuted @${username}`;
        } else {
          updatedList = [...currentMuted, username];
          msg = `Muted @${username}`;
        }
        
        localStorage.setItem(`verlyn_muted_users_${currentUser.id}`, JSON.stringify(updatedList));
        const { data: { user } } = await supabase.auth.updateUser({
          data: { muted_users: updatedList }
        });
        if (user) {
          setUser({ ...currentUser, metadata: user.user_metadata || {} });
        }
      } else if (actionType === 'restrict') {
        const currentRestricted = metadata.restricted_users || [];
        const isCurrentlyRestricted = currentRestricted.includes(username);
        if (isCurrentlyRestricted) {
          updatedList = currentRestricted.filter((u: string) => u !== username);
          msg = `Unrestricted @${username}`;
        } else {
          updatedList = [...currentRestricted, username];
          msg = `Restricted @${username}`;
        }

        localStorage.setItem(`verlyn_restricted_users_${currentUser.id}`, JSON.stringify(updatedList));
        const { data: { user } } = await supabase.auth.updateUser({
          data: { restricted_users: updatedList }
        });
        if (user) {
          setUser({ ...currentUser, metadata: user.user_metadata || {} });
        }
      } else if (actionType === 'report') {
        const res = await submitReport({
          targetType: 'user',
          targetId: userId,
          reportedUserId: userId,
          reason: 'other',
          details: `Reported user @${username} via Profile Action Sheet Options.`
        });
        if (!res.success) {
          throw new Error(res.message || 'Report submission failed');
        }
        msg = `Report submitted for @${username}`;
      }
    } catch (e) {
      console.error(e);
      msg = `Failed to perform action: ${actionType}`;
    }

    setLoadingAction(null);
    onClose();

    window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: msg, type: 'success' } }));
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]"
          />

          {/* Action Sheet Container */}
          <div className="fixed inset-x-0 bottom-0 md:inset-0 flex items-end md:items-center justify-center pointer-events-none z-[160]">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="w-full md:max-w-[400px] bg-[#0A0A0A] border-t md:border border-white/[0.08] rounded-t-[24px] md:rounded-[24px] overflow-hidden pointer-events-auto shadow-2xl relative"
            >
              {/* Pull Bar for Mobile */}
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto my-3 md:hidden" />

              {/* Close Button on Desktop */}
              <button
                onClick={onClose}
                className="hidden md:flex absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>

              <div className="p-6 space-y-5">
                {/* Title */}
                {!showQR ? (
                  <>
                    <div className="text-center pb-2 border-b border-white/[0.04]">
                      <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest leading-none">Options</h3>
                    </div>

                    <div className="space-y-1.5">
                      {!isOwner && (
                        <button
                          onClick={() => {
                            router.push(`/messages/${userId}`);
                            onClose();
                          }}
                          className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] text-white transition-all text-sm font-bold active:scale-[0.98]"
                        >
                          <Send size={18} className="text-white/40" />
                          Send Direct Message
                        </button>
                      )}

                      <button
                        onClick={handleShare}
                        className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] text-white transition-all text-sm font-bold active:scale-[0.98]"
                      >
                        <Copy size={18} className="text-white/40" />
                        {copied ? 'Link Copied!' : 'Share Profile'}
                      </button>

                      <button
                        onClick={() => setShowQR(true)}
                        className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] text-white transition-all text-sm font-bold active:scale-[0.98]"
                      >
                        <QrCode size={18} className="text-white/40" />
                        Display Profile QR
                      </button>

                      {!isOwner && (
                        <div className="pt-2 space-y-1.5">
                          <button
                            onClick={() => handleAction('mute')}
                            disabled={!!loadingAction}
                            className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-amber-500/[0.02] hover:bg-amber-500/[0.06] border border-amber-500/10 text-amber-400 transition-all text-sm font-bold active:scale-[0.98]"
                          >
                            <span className="flex items-center gap-3.5">
                              <VolumeX size={18} />
                              {isMuted ? 'Unmute Profile' : 'Mute Profile'}
                            </span>
                            {loadingAction === 'mute' && <Loader2 size={16} className="animate-spin" />}
                          </button>

                          <button
                            onClick={() => handleAction('restrict')}
                            disabled={!!loadingAction}
                            className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-blue-500/[0.02] hover:bg-blue-500/[0.06] border border-blue-500/10 text-blue-400 transition-all text-sm font-bold active:scale-[0.98]"
                          >
                            <span className="flex items-center gap-3.5">
                              <ShieldAlert size={18} />
                              {isRestricted ? 'Unrestrict Profile' : 'Restrict Profile'}
                            </span>
                            {loadingAction === 'restrict' && <Loader2 size={16} className="animate-spin" />}
                          </button>

                           <button
                            onClick={() => {
                              onClose();
                              if (onBlockToggle) {
                                onBlockToggle(!isBlocked);
                              } else {
                                handleAction('block');
                              }
                            }}
                            disabled={!!loadingAction}
                            className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-rose-500/[0.02] hover:bg-rose-500/[0.06] border border-rose-500/10 text-rose-400 transition-all text-sm font-bold active:scale-[0.98] cursor-pointer"
                          >
                            <span className="flex items-center gap-3.5">
                              <Ban size={18} />
                              {isBlocked ? 'Unblock User' : 'Block User'}
                            </span>
                            {loadingAction === 'block' && <Loader2 size={16} className="animate-spin" />}
                          </button>

                          <button
                            onClick={() => handleAction('report')}
                            disabled={!!loadingAction}
                            className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-rose-500/[0.02] hover:bg-rose-500/[0.06] border border-rose-500/10 text-rose-400 transition-all text-sm font-bold active:scale-[0.98]"
                          >
                            <span className="flex items-center gap-3.5">
                              <ShieldAlert size={18} />
                              Report Account
                            </span>
                            {loadingAction === 'report' && <Loader2 size={16} className="animate-spin" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center py-4 space-y-6 w-full relative">
                    <div className="text-center">
                      <h3 className="text-base font-black text-white tracking-tight">@{username}</h3>
                      <p className="text-[11px] text-white/50 font-medium mt-0.5">Verlyn Profile Card</p>
                    </div>

                    {/* Futuristic Glassmorphic QR Container */}
                    <div className="relative w-full max-w-[280px] p-6 rounded-3xl border border-white/[0.08] bg-[#0F0F0F]/80 backdrop-blur-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center">
                      {/* Blurred Avatar Background for Crazy Depth Effect */}
                      {avatarUrl && (
                        <>
                          <img
                            src={avatarUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-20 blur-2xl scale-125 pointer-events-none"
                          />
                          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-black/90 pointer-events-none" />
                        </>
                      )}

                      {/* QR Frame Container */}
                      <div className="relative p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-md flex items-center justify-center w-[200px] h-[200px] z-10">
                        {/* Scanner Corners */}
                        <div className="absolute -top-1.5 -left-1.5 w-5 h-5 border-t-[1.5px] border-l-[1.5px] border-white/25 rounded-tl-lg" />
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 border-t-[1.5px] border-r-[1.5px] border-white/25 rounded-tr-lg" />
                        <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 border-b-[1.5px] border-l-[1.5px] border-white/25 rounded-bl-lg" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-b-[1.5px] border-r-[1.5px] border-white/25 rounded-br-lg" />

                        {qrDataUrl ? (
                          <div className="relative w-[168px] h-[168px] flex items-center justify-center">
                            <img
                              src={qrDataUrl}
                              alt="QR Code"
                              style={{ mixBlendMode: 'screen' }}
                              className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]"
                            />
                            {/* Centered Avatar Overlay */}
                            {avatarUrl && (
                              <div className="absolute w-[44px] h-[44px] rounded-full p-[2px] bg-neutral-900 border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.5)] overflow-hidden flex items-center justify-center">
                                <img
                                  src={avatarUrl}
                                  alt={displayName}
                                  className="w-full h-full object-cover rounded-full"
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <Loader2 size={24} className="animate-spin text-white/40" />
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-white/40 text-center max-w-[200px] leading-relaxed">
                      Scan this code to instantly view this Verlyn profile.
                    </p>
                    <button
                      onClick={() => setShowQR(false)}
                      className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-colors border border-white/[0.06] active:scale-[0.98]"
                    >
                      Back to options
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
