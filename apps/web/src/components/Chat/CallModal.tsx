'use client';

import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X, ArrowUpRight, ArrowDownLeft, ShieldAlert, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvatarUrl } from '@/lib/utils';
import { CallSounds } from '@/lib/callSounds';

export type CallState = 'calling' | 'ringing' | 'connected' | 'ended' | 'unavailable';

interface CallModalProps {
  isOpen: boolean;
  callType: 'audio' | 'video';
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  participant: { name: string; username: string; avatarUrl?: string | null };
  remoteMuted: boolean;
  remoteCamOff: boolean;
  upgradeRequestPending: boolean;
  upgradeRejectAlert: boolean;
  callError: string | null;
  onHangUp: () => void;
  onAccept: (type: 'audio' | 'video') => void;
  onReject: () => void;
  onClose: () => void;
  sendPeerState: (isMuted: boolean, isCamOff: boolean) => Promise<void>;
  requestVideoUpgrade: () => Promise<void>;
  acceptVideoUpgrade: () => Promise<void>;
  rejectVideoUpgrade: () => Promise<void>;
  downgradeToAudio: () => Promise<void>;
}

export default function CallModal({
  isOpen,
  callType,
  callState,
  localStream,
  remoteStream,
  participant,
  remoteMuted,
  remoteCamOff,
  upgradeRequestPending,
  upgradeRejectAlert,
  callError,
  onHangUp,
  onAccept,
  onReject,
  onClose,
  sendPeerState,
  requestVideoUpgrade,
  acceptVideoUpgrade,
  rejectVideoUpgrade,
  downgradeToAudio,
}: CallModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [upgradeRequesting, setUpgradeRequesting] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);



  // Wire streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Duration timer
  useEffect(() => {
    if (callState === 'connected' && !callError) {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setDuration(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState, callError]);

  // Reset upgrade state on connect or close
  useEffect(() => {
    if (callType === 'video') {
      setUpgradeRequesting(false);
    } else {
      setIsCamOff(false);
    }
  }, [callType]);

  useEffect(() => {
    if (upgradeRejectAlert) {
      setUpgradeRequesting(false);
    }
  }, [upgradeRejectAlert]);

  const toggleMute = () => {
    if (localStream) {
      const nextMuted = !isMuted;
      localStream.getAudioTracks().forEach(t => { t.enabled = !nextMuted; });
      setIsMuted(nextMuted);
      sendPeerState(nextMuted, isCamOff);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const nextCamOff = !isCamOff;
      localStream.getVideoTracks().forEach(t => { t.enabled = !nextCamOff; });
      setIsCamOff(nextCamOff);
      sendPeerState(isMuted, nextCamOff);
    }
  };

  const handleStartUpgrade = async () => {
    setUpgradeRequesting(true);
    await requestVideoUpgrade();
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const statusLabel: Record<string, string> = {
    calling: 'Calling...',
    ringing: 'Incoming call',
    connected: formatDuration(duration),
    ended: 'Call Ended',
    unavailable: 'User unavailable',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[9999] bg-[#050508]/95 backdrop-blur-3xl flex flex-col items-center justify-between p-8 overflow-hidden select-none"
        >
          {/* Remote video (background) */}
          {callType === 'video' && remoteStream && !remoteCamOff && !callError ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover z-0"
            />
          ) : (
            /* Audio call — avatar background */
            <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
              <img
                src={getAvatarUrl(participant.username, participant.avatarUrl)}
                alt={participant.name}
                className="w-72 h-72 rounded-[50px] object-cover opacity-10 blur-2xl scale-150 animate-pulse"
              />
            </div>
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#050508]/80 via-transparent to-[#050508]/90 z-0 pointer-events-none" />

          {/* Content Header */}
          <div className="relative z-10 flex flex-col items-center w-full pt-6">
            <div className="relative">
              <img
                src={getAvatarUrl(participant.username, participant.avatarUrl)}
                alt={participant.name}
                className="w-24 h-24 rounded-[32px] object-cover border-2 border-white/10 shadow-2xl mb-4"
              />
              {remoteMuted && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-rose-500 border border-white/10 flex items-center justify-center shadow-lg animate-bounce">
                  <MicOff size={14} className="text-white" />
                </div>
              )}
            </div>

            <h2 className="text-2xl font-black tracking-tight text-white mb-1">{participant.name}</h2>
            <p className={`text-xs font-mono uppercase tracking-widest ${callState === 'unavailable' || callError ? 'text-rose-500 font-bold animate-pulse' : 'text-indigo-400'}`}>
              {callError ? 'Call Error' : (callType === 'video' ? 'Video Session' : 'Voice Session')} · {callError ? 'Failed' : statusLabel[callState]}
            </p>

            {/* Dynamic visualizers */}
            {callState === 'calling' && !callError && (
              <div className="flex gap-1.5 mt-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <motion.div
                    key={i}
                    animate={{ height: [6, 18, 6], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12 }}
                    className="w-1 bg-indigo-500 rounded-full"
                  />
                ))}
              </div>
            )}

            {/* Remote Peer status warning labels */}
            {callState === 'connected' && !callError && (
              <div className="flex flex-col gap-2 items-center mt-3">
                {remoteMuted && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400/90 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
                    Mic Muted by partner
                  </span>
                )}
                {callType === 'video' && remoteCamOff && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                    Camera Off by partner
                  </span>
                )}
              </div>
            )}

            {/* Call Error Banner */}
            <AnimatePresence>
              {callError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col gap-2.5 items-center text-center w-80 z-20"
                >
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                    <ShieldAlert size={14} className="animate-pulse" />
                    <span>Connection Blocked</span>
                  </div>
                  <p className="text-xs text-rose-300/80 leading-relaxed font-sans px-2">
                    {callError}
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-1 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold uppercase tracking-wider transition-colors active:scale-95 shadow-md shadow-rose-600/20"
                  >
                    Dismiss
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Local video (picture-in-picture) */}
          {callType === 'video' && localStream && !isCamOff && !callError && (
            <div className="absolute top-24 right-6 w-28 h-42 rounded-2xl overflow-hidden border border-white/10 shadow-2xl z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
            </div>
          )}

          {/* Upgrade Reject Alert */}
          <AnimatePresence>
            {upgradeRejectAlert && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="relative z-50 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 w-80"
              >
                <ShieldAlert className="text-rose-400 shrink-0" size={18} />
                <p className="text-xs text-rose-300 font-medium leading-normal">
                  Video upgrade request was declined by the partner.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Confirm Video Upgrade Overlay */}
          <AnimatePresence>
            {upgradeRequestPending && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 bg-[#050508]/90 z-50 flex flex-col items-center justify-center p-6"
              >
                <div className="bg-[#0f0f15] border border-white/[0.08] p-6 rounded-[28px] max-w-xs text-center space-y-5 shadow-2xl">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                    <Video size={24} />
                  </div>
                  <div>
                    <h3 className="text-md font-bold text-white mb-1">Upgrade to Video?</h3>
                    <p className="text-xs text-white/50 leading-relaxed font-sans">
                      {participant.name} wants to switch this call to a video session.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={rejectVideoUpgrade}
                      className="py-3 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-bold text-white/70 hover:bg-white/[0.08] active:scale-95 transition-all"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={acceptVideoUpgrade}
                      className="py-3 px-4 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 active:scale-95 transition-all"
                    >
                      Upgrade
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls Panel */}
          <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm pb-10">
            {callState === 'ringing' ? (
              <div className="flex gap-8">
                {/* Reject */}
                <button
                  type="button"
                  onClick={onReject}
                  className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 transition-transform active:scale-90"
                >
                  <PhoneOff size={24} />
                </button>
                {/* Accept */}
                <button
                  type="button"
                  onClick={() => onAccept(callType)}
                  className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-pulse transition-transform active:scale-90"
                >
                  {callType === 'video' ? <Video size={24} /> : <Phone size={24} />}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 w-full items-center">
                {/* Mid-call Switching Alerts */}
                {upgradeRequesting && !callError && (
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-indigo-400 font-bold bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/20">
                    <Loader2 size={12} className="animate-spin" />
                    <span>Awaiting partner response...</span>
                  </div>
                )}

                <div className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.05] p-3 rounded-full backdrop-blur-2xl">
                  {/* Mute/Unmute */}
                  <button
                    type="button"
                    onClick={toggleMute}
                    disabled={!!callError}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-20 ${
                      isMuted ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>

                  {/* Hang Up (Red Center) */}
                  <button
                    type="button"
                    onClick={onHangUp}
                    className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-[0_8px_30px_rgba(239,68,68,0.4)] transition-all active:scale-90"
                  >
                    <PhoneOff size={24} />
                  </button>

                  {/* Camera on/off or Upgrade/Downgrade controls */}
                  {callType === 'video' ? (
                    <div className="flex items-center gap-1.5">
                      {/* Camera Toggle */}
                      <button
                        type="button"
                        onClick={toggleCamera}
                        disabled={!!callError}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-20 ${
                          isCamOff ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-white/5 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {isCamOff ? <VideoOff size={20} /> : <Video size={20} />}
                      </button>
                      
                      {/* Downgrade to Audio */}
                      <button
                        type="button"
                        onClick={downgradeToAudio}
                        disabled={!!callError}
                        className="w-14 h-14 rounded-full bg-white/5 text-white/70 hover:bg-white/10 flex items-center justify-center transition-all active:scale-95 disabled:opacity-20"
                        title="Switch to Voice Call"
                      >
                        <Phone size={18} />
                      </button>
                    </div>
                  ) : (
                    /* Switch to Video (Audio call mode) */
                    <button
                      type="button"
                      onClick={handleStartUpgrade}
                      disabled={upgradeRequesting || callState !== 'connected' || !!callError}
                      className="w-14 h-14 rounded-full bg-white/5 text-white/70 hover:bg-white/10 flex items-center justify-center transition-all active:scale-95 disabled:opacity-30"
                      title="Request Video Call"
                    >
                      <Video size={20} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
