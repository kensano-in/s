'use client';

import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvatarUrl } from '@/lib/utils';

export type CallState = 'calling' | 'ringing' | 'connected' | 'ended';

interface CallModalProps {
  isOpen: boolean;
  callType: 'audio' | 'video';
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  participant: { name: string; username: string; avatarUrl?: string | null };
  onHangUp: () => void;
  onAccept: (type: 'audio' | 'video') => void;
  onReject: () => void;
  onClose: () => void;
}

export default function CallModal({
  isOpen,
  callType,
  callState,
  localStream,
  remoteStream,
  participant,
  onHangUp,
  onAccept,
  onReject,
  onClose,
}: CallModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
    if (callState === 'connected') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setDuration(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => { t.enabled = isMuted; });
      setIsMuted(m => !m);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => { t.enabled = isCamOff; });
      setIsCamOff(c => !c);
    }
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const statusLabel = {
    calling: 'Calling...',
    ringing: 'Ringing...',
    connected: formatDuration(duration),
    ended: 'Call Ended',
  }[callState];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-between p-8"
        >
          {/* Remote video (background) */}
          {callType === 'video' && remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            /* Audio call — avatar background */
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src={getAvatarUrl(participant.username, participant.avatarUrl)}
                alt={participant.name}
                className="w-56 h-56 rounded-[50px] object-cover opacity-20 blur-xl scale-150"
              />
            </div>
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/80" />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center w-full">
            {/* Participant info */}
            <img
              src={getAvatarUrl(participant.username, participant.avatarUrl)}
              alt={participant.name}
              className="w-24 h-24 rounded-[28px] object-cover border-2 border-white/20 shadow-2xl mb-4"
            />
            <h2 className="text-2xl font-bold text-white mb-1">{participant.name}</h2>
            <p className="text-sm text-white/60">
              {callType === 'video' ? 'Video Call' : 'Audio Call'} · {statusLabel}
            </p>
            {callState === 'calling' && (
              <div className="flex gap-1 mt-4">
                {[1,2,3,4].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ height: [8, 20, 8], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                    className="w-1 bg-indigo-500 rounded-full"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Local video (picture-in-picture) */}
          {callType === 'video' && localStream && !isCamOff && (
            <div className="absolute top-24 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
            </div>
          )}

          {/* Controls */}
          <div className="relative z-10 flex flex-col items-center gap-6">
            {callState === 'ringing' ? (
              <div className="flex gap-8">
                {/* Reject */}
                <button
                  onClick={onReject}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90"
                >
                  <PhoneOff size={28} />
                </button>
                {/* Accept */}
                <button
                  onClick={() => onAccept(callType)}
                  className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg animate-pulse transition-transform active:scale-90"
                >
                  {callType === 'video' ? <Video size={28} /> : <Phone size={28} />}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-5">
                {/* Mute */}
                <button
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    isMuted ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                </button>

                {/* Hang up */}
                <button
                  onClick={onHangUp}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-[0_8px_30px_rgba(239,68,68,0.5)] transition-all active:scale-95"
                >
                  <PhoneOff size={24} />
                </button>

                {/* Camera toggle (video only) */}
                {callType === 'video' ? (
                  <button
                    onClick={toggleCamera}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                      isCamOff ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {isCamOff ? <VideoOff size={22} /> : <Video size={22} />}
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="w-14 h-14 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all"
                  >
                    <X size={22} />
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
