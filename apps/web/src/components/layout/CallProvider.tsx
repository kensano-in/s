'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useWebRTC } from '@/hooks/useWebRTC';
import CallModal from '@/components/Chat/CallModal';
import { useAppStore } from '@/lib/store';
import { logCallDB, checkBlockStatusDB, checkMyDetailedRestrictionsDB, registerCallActivityDB } from '@/app/(main)/messages/actions';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, X } from 'lucide-react';
import { getAvatarUrl } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { CallSounds } from '@/lib/callSounds';

interface CallerProfile {
  name: string;
  username: string;
  avatarUrl?: string | null;
}

interface CallContextType {
  callState: string;
  callType: 'audio' | 'video';
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  incomingCall: { from: string; type: 'audio' | 'video' } | null;
  activePartnerId: string | null;
  remoteMuted: boolean;
  remoteCamOff: boolean;
  upgradeRequestPending: boolean;
  upgradeRejectAlert: boolean;
  callError: string | null;
  isCallOpen: boolean;
  setIsCallOpen: (open: boolean) => void;
  callerProfile: CallerProfile | null;
  startCall: (targetUserId: string, profile: CallerProfile, type: 'audio' | 'video') => Promise<void>;
  acceptCall: (type: 'audio' | 'video') => Promise<void>;
  rejectCall: () => Promise<void>;
  hangUp: () => Promise<void>;
  sendPeerState: (isMuted: boolean, isCamOff: boolean) => Promise<void>;
  requestVideoUpgrade: () => Promise<void>;
  acceptVideoUpgrade: () => Promise<void>;
  rejectVideoUpgrade: () => Promise<void>;
  downgradeToAudio: () => Promise<void>;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
}

export default function CallProvider({ children }: { children: React.ReactNode }) {
  const currentUser = useAppStore(s => s.currentUser);
  const supabase = useMemo(() => createClient(), []);

  const {
    callState,
    callType,
    localStream,
    remoteStream,
    incomingCall,
    activePartnerId,
    remoteMuted,
    remoteCamOff,
    upgradeRequestPending,
    upgradeRejectAlert,
    callError,
    startCall: webRTCStartCall,
    acceptCall: webRTCAcceptCall,
    rejectCall: webRTCRejectCall,
    hangUp: webRTCHangUp,
    sendPeerState,
    requestVideoUpgrade,
    acceptVideoUpgrade,
    rejectVideoUpgrade,
    downgradeToAudio,
  } = useWebRTC({ myUserId: currentUser?.id });

  const [isCallOpen, setIsCallOpen] = useState(false);
  const [callerProfile, setCallerProfile] = useState<CallerProfile | null>(null);

  // Pre-warm audio contexts on mount
  useEffect(() => {
    CallSounds.prewarm();
  }, []);

  // Tracking call stats for database logging
  const [callWasConnected, setCallWasConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [duration, setDuration] = useState(0);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync isCallOpen for incoming/outgoing call states
  useEffect(() => {
    if (callState === 'connected') {
      setIsCallOpen(true);
      setCallWasConnected(true);
      
      // Start duration counter
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      durationTimerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } else if (callState === 'ended' || callState === 'unavailable') {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
  }, [callState]);

  // Synchronize dynamic duration to callDuration state
  useEffect(() => {
    setCallDuration(duration);
  }, [duration]);

  // Fetch incoming caller's profile details
  useEffect(() => {
    if (!incomingCall) return;

    // Show a default profile immediately so the popup is not blocked
    setCallerProfile(prev => prev ?? { name: 'Incoming Call', username: '', avatarUrl: null });

    const fetchProfile = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('display_name, username, avatar_url')
          .eq('id', incomingCall.from)
          .single();

        if (data) {
          setCallerProfile({
            name: data.display_name || data.username || 'Incoming Call',
            username: data.username || '',
            avatarUrl: data.avatar_url,
          });
        } else {
          setCallerProfile({ name: 'Incoming Call', username: '', avatarUrl: null });
        }
      } catch {
        // Network / auth failure — keep the default placeholder so the popup still shows
        setCallerProfile({ name: 'Incoming Call', username: '', avatarUrl: null });
      }
    };
    void fetchProfile();

    // Web Notification — fires immediately for background tabs / other windows
    if (typeof Notification !== 'undefined') {
      const fire = (name: string) => {
        try {
          new Notification(`Incoming ${incomingCall.type === 'video' ? 'Video' : 'Voice'} Call`, {
            body: `${name} is calling…`,
            icon: '/favicon.ico',
            tag: 'verlyn-call',
            requireInteraction: true,
          });
        } catch { /* Safari/Firefox may block */ }
      };

      if (Notification.permission === 'granted') {
        fire('Incoming Call');
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => {
          if (p === 'granted') fire('Incoming Call');
        }).catch(() => {});
      }
    }
  }, [incomingCall]);

  // Handle call completion logging (Initiator only logs to avoid duplicate logs in the same chat)
  useEffect(() => {
    if (callState === 'ended' || callState === 'unavailable') {
      const handleLogging = async () => {
        if (activePartnerId && !incomingCall) {
          await logCallDB(
            activePartnerId,
            callType,
            callWasConnected ? callDuration : null,
            callWasConnected
          );
        }
        
        // Reset tracking states
        setCallWasConnected(false);
        setCallDuration(0);
        setDuration(0);
        setIsCallOpen(false);
        setCallerProfile(null);
      };
      handleLogging();
    }
  }, [callState, activePartnerId, incomingCall, callType, callWasConnected, callDuration]);

  // Sound effects coordinator
  useEffect(() => {
    if (callError) {
      CallSounds.playDisconnect();
      return;
    }
    if (callState === 'calling') {
      CallSounds.startDialing();
    } else if (callState === 'ringing') {
      CallSounds.startRinging();
    } else if (callState === 'connected') {
      CallSounds.playConnect();
    } else if (callState === 'ended' || callState === 'unavailable') {
      CallSounds.playDisconnect();
    } else {
      CallSounds.stopDialing();
      CallSounds.stopRinging();
    }

    return () => {
      CallSounds.stopDialing();
      CallSounds.stopRinging();
    };
  }, [callState, callError]);

  const [blockError, setBlockError] = React.useState<string | null>(null);

  const startCall = useCallback(async (targetUserId: string, profile: CallerProfile, type: 'audio' | 'video') => {
    const res = await registerCallActivityDB(targetUserId);
    if (!res.success) {
      setBlockError(res.error || 'Your calling privileges are temporarily suspended due to spamming.');
      setTimeout(() => setBlockError(null), 4000);
      return;
    }

    // Block guard: refuse to initiate a call if either party has blocked the other.
    // This prevents presence leaks and enforces the block relationship on calls.
    const blockStatus = await checkBlockStatusDB(targetUserId);
    if (blockStatus.success && blockStatus.data && (blockStatus.data.isBlockedByMe || blockStatus.data.hasBlockedMe)) {
      setBlockError('This call could not be connected. The user is unavailable.');
      setTimeout(() => setBlockError(null), 4000);
      return;
    }
    setCallerProfile(profile);
    setIsCallOpen(true);
    await webRTCStartCall(targetUserId, type);
  }, [webRTCStartCall]);

  const acceptCall = useCallback(async (type: 'audio' | 'video') => {
    setIsCallOpen(true);
    await webRTCAcceptCall(type);
  }, [webRTCAcceptCall]);

  const rejectCall = useCallback(async () => {
    setIsCallOpen(false);
    await webRTCRejectCall();
  }, [webRTCRejectCall]);

  const hangUp = useCallback(async () => {
    setIsCallOpen(false);
    await webRTCHangUp();
  }, [webRTCHangUp]);

  return (
    <CallContext.Provider
      value={{
        callState,
        callType,
        localStream,
        remoteStream,
        incomingCall,
        activePartnerId,
        remoteMuted,
        remoteCamOff,
        upgradeRequestPending,
        upgradeRejectAlert,
        callError,
        isCallOpen,
        setIsCallOpen,
        callerProfile,
        startCall,
        acceptCall,
        rejectCall,
        hangUp,
        sendPeerState,
        requestVideoUpgrade,
        acceptVideoUpgrade,
        rejectVideoUpgrade,
        downgradeToAudio,
      }}
    >
      {children}

      {/* Block error notification — shown when a call is attempted to a blocked user */}
      <AnimatePresence>
        {blockError && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-neutral-900/95 border border-red-500/30 shadow-xl backdrop-blur-xl"
          >
            <PhoneOff className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-sm text-white font-medium">{blockError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Incoming Call Popup Toast (if online in app but not inside the call screen modal) */}
      <AnimatePresence>
        {incomingCall && callState === 'ringing' && !isCallOpen && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] w-[90%] max-w-sm bg-[#0a0a0f]/95 border border-white/10 p-4 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl flex items-center justify-between pointer-events-auto"
          >
            <div className="flex items-center gap-3">
              {callerProfile ? (
                <img
                  src={getAvatarUrl(callerProfile.username, callerProfile.avatarUrl)}
                  alt={callerProfile.name}
                  className="w-12 h-12 rounded-2xl object-cover border border-white/5 shadow-md"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-white/10 animate-pulse" />
              )}
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white leading-tight">
                  {callerProfile?.name ?? '…'}
                </span>
                <span className="text-[10px] text-indigo-400 font-mono tracking-wider uppercase mt-0.5 animate-pulse">
                  Incoming {incomingCall.type === 'video' ? 'Video' : 'Voice'} Call...
                </span>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              {/* Decline */}
              <button
                type="button"
                onClick={() => {
                  // Dismiss Web Notification if it's showing
                  if (typeof Notification !== 'undefined' && 'close' in Notification.prototype) {
                    try {
                      // Safari doesn't support getNotifications(), so ignore errors
                      if ('getNotifications' in (navigator as any).serviceWorker) {
                        (navigator as any).serviceWorker.ready.then((sw: any) => {
                          sw.getNotifications({ tag: 'verlyn-call' }).then((ns: any[]) => ns.forEach((n: any) => n.close()));
                        });
                      }
                    } catch { /* ignore */ }
                  }
                  rejectCall();
                }}
                className="w-10 h-10 rounded-xl bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all active:scale-90"
              >
                <PhoneOff size={16} />
              </button>
              {/* Accept */}
              <button
                type="button"
                onClick={() => acceptCall(incomingCall.type)}
                className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center animate-pulse transition-all active:scale-90"
              >
                {incomingCall.type === 'video' ? <Video size={16} /> : <Phone size={16} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Call Modal Overlay */}
      {isCallOpen && callerProfile && (
        <CallModal
          isOpen={isCallOpen}
          callType={callType}
          callState={callState === 'idle' ? 'ended' : callState}
          localStream={localStream}
          remoteStream={remoteStream}
          participant={{
            name: callerProfile.name,
            username: callerProfile.username,
            avatarUrl: callerProfile.avatarUrl,
          }}
          remoteMuted={remoteMuted}
          remoteCamOff={remoteCamOff}
          upgradeRequestPending={upgradeRequestPending}
          upgradeRejectAlert={upgradeRejectAlert}
          callError={callError}
          onHangUp={hangUp}
          onAccept={acceptCall}
          onReject={rejectCall}
          onClose={() => setIsCallOpen(false)}
          sendPeerState={sendPeerState}
          requestVideoUpgrade={requestVideoUpgrade}
          acceptVideoUpgrade={acceptVideoUpgrade}
          rejectVideoUpgrade={rejectVideoUpgrade}
          downgradeToAudio={downgradeToAudio}
        />
      )}
    </CallContext.Provider>
  );
}
