import { useState, useEffect, useCallback, useRef } from 'react';
import { WebRTCManager, CallState } from '@/lib/webrtc';

export interface UseWebRTCProps {
  myUserId: string | undefined;
}

const AUTO_CANCEL_MS = 15_000; // 15s auto-cancel if nobody answers

export function useWebRTC({ myUserId }: UseWebRTCProps) {
  const managerRef = useRef<WebRTCManager | null>(null);
  const autoCancelRef = useRef<NodeJS.Timeout | null>(null);

  const [callState, setCallState] = useState<CallState>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ from: string; type: 'audio' | 'video' } | null>(null);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);

  const clearAutoCancel = () => {
    if (autoCancelRef.current) {
      clearTimeout(autoCancelRef.current);
      autoCancelRef.current = null;
    }
  };

  const resetAllState = useCallback(() => {
    setCallState('idle');
    setLocalStream(null);
    setRemoteStream(null);
    setActivePartnerId(null);
    setIncomingCall(null);
    clearAutoCancel();
  }, []);

  useEffect(() => {
    if (!myUserId) return;

    const manager = new WebRTCManager(myUserId);
    managerRef.current = manager;

    manager.onCallStateChange = (state) => {
      setCallState(state);
      if (state === 'connected') {
        // Connected — clear cancel timer
        clearAutoCancel();
      }
      if (state === 'ended') {
        setLocalStream(null);
        setRemoteStream(null);
        setActivePartnerId(null);
        setIncomingCall(null);
        clearAutoCancel();
        // Auto-reset to idle after a brief pause so UI can show "ended"
        setTimeout(() => setCallState('idle'), 1200);
      }
    };

    manager.onLocalStream = (stream) => setLocalStream(stream);
    manager.onRemoteStream = (stream) => setRemoteStream(stream);

    manager.onIncomingCall = (from, type) => {
      setIncomingCall({ from, type });
      setActivePartnerId(from);
      setCallState('ringing');
      // Auto-reject after 30s if user doesn't answer
      autoCancelRef.current = setTimeout(() => {
        manager.rejectCall();
        resetAllState();
      }, 30_000);
    };

    return () => {
      clearAutoCancel();
      manager.destroy();
    };
  }, [myUserId, resetAllState]);

  const startCall = useCallback(async (targetUserId: string, type: 'audio' | 'video') => {
    if (!managerRef.current) return;
    setActivePartnerId(targetUserId);
    await managerRef.current.startCall(targetUserId, type);
    // 15s auto-cancel if receiver doesn't answer
    clearAutoCancel();
    autoCancelRef.current = setTimeout(async () => {
      if (managerRef.current) {
        await managerRef.current.hangUp();
      }
      resetAllState();
    }, AUTO_CANCEL_MS);
  }, [resetAllState]);

  const acceptCall = useCallback(async (type: 'audio' | 'video') => {
    if (!managerRef.current || !incomingCall) return;
    clearAutoCancel();
    await managerRef.current.acceptCall(type);
    setIncomingCall(null);
  }, [incomingCall]);

  const rejectCall = useCallback(async () => {
    if (!managerRef.current) return;
    clearAutoCancel();
    await managerRef.current.rejectCall();
    resetAllState();
  }, [resetAllState]);

  const hangUp = useCallback(async () => {
    if (!managerRef.current) return;
    clearAutoCancel();
    await managerRef.current.hangUp();
    // State will reset via onCallStateChange → 'ended'
  }, []);

  return {
    callState,
    localStream,
    remoteStream,
    incomingCall,
    activePartnerId,
    startCall,
    acceptCall,
    rejectCall,
    hangUp,
  };
}
