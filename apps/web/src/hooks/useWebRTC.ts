import { useState, useEffect, useCallback, useRef } from 'react';
import { WebRTCManager, CallState } from '@/lib/webrtc';

export interface UseWebRTCProps {
  myUserId: string | undefined;
}

export function useWebRTC({ myUserId }: UseWebRTCProps) {
  const managerRef = useRef<WebRTCManager | null>(null);
  const [callState, setCallState] = useState<CallState>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ from: string; type: 'audio' | 'video' } | null>(null);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);

  useEffect(() => {
    if (!myUserId) return;

    const manager = new WebRTCManager(myUserId);
    managerRef.current = manager;

    manager.onCallStateChange = (state) => {
      setCallState(state);
      if (state === 'ended' || state === 'idle') {
        setLocalStream(null);
        setRemoteStream(null);
        setActivePartnerId(null);
        setIncomingCall(null);
      }
    };

    manager.onLocalStream = (stream) => setLocalStream(stream);
    manager.onRemoteStream = (stream) => setRemoteStream(stream);
    manager.onIncomingCall = (from, type) => {
      setIncomingCall({ from, type });
      setActivePartnerId(from);
    };

    return () => {
      manager.destroy();
    };
  }, [myUserId]);

  const startCall = useCallback(async (targetUserId: string, type: 'audio' | 'video') => {
    if (!managerRef.current) return;
    setActivePartnerId(targetUserId);
    await managerRef.current.startCall(targetUserId, type);
  }, []);

  const acceptCall = useCallback(async (type: 'audio' | 'video') => {
    if (!managerRef.current || !incomingCall) return;
    await managerRef.current.acceptCall(type);
    setIncomingCall(null);
  }, [incomingCall]);

  const rejectCall = useCallback(async () => {
    if (!managerRef.current) return;
    await managerRef.current.rejectCall();
    setIncomingCall(null);
  }, []);

  const hangUp = useCallback(async () => {
    if (!managerRef.current) return;
    await managerRef.current.hangUp();
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
    hangUp
  };
}
