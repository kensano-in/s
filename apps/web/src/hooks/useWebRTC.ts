import { useState, useEffect, useCallback, useRef } from 'react';
import { WebRTCManager, CallState, getGlobalWebRTCManager } from '@/lib/webrtc';

export interface UseWebRTCProps {
  myUserId: string | undefined;
}

const AUTO_CANCEL_MS = 45_000; // 45s auto-cancel if nobody answers

export function useWebRTC({ myUserId }: UseWebRTCProps) {
  const managerRef = useRef<WebRTCManager | null>(null);
  const autoCancelRef = useRef<NodeJS.Timeout | null>(null);

  const [callState, setCallState] = useState<CallState>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ from: string; type: 'audio' | 'video' } | null>(null);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);

  // Advanced state indicators
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [remoteCamOff, setRemoteCamOff] = useState(false);
  const [upgradeRequestPending, setUpgradeRequestPending] = useState(false);
  const [upgradeRejectAlert, setUpgradeRejectAlert] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);

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
    setRemoteMuted(false);
    setRemoteCamOff(false);
    setUpgradeRequestPending(false);
    setUpgradeRejectAlert(false);
    setCallError(null);
    clearAutoCancel();
  }, []);

  useEffect(() => {
    if (!myUserId) return;

    const manager = getGlobalWebRTCManager(myUserId);
    managerRef.current = manager;

    manager.onCallStateChange = (state) => {
      setCallState(state);
      if (state === 'connected') {
        clearAutoCancel();
      }
      if (state === 'ended') {
        setLocalStream(null);
        setRemoteStream(null);
        setActivePartnerId(null);
        setIncomingCall(null);
        setRemoteMuted(false);
        setRemoteCamOff(false);
        setUpgradeRequestPending(false);
        setUpgradeRejectAlert(false);
        clearAutoCancel();
        setTimeout(() => setCallState('idle'), 1200);
      }
    };

    manager.onLocalStream = (stream) => setLocalStream(stream);
    manager.onRemoteStream = (stream) => setRemoteStream(stream);

    manager.onIncomingCall = (from, type) => {
      setIncomingCall({ from, type });
      setCallType(type);
      setActivePartnerId(from);
      setCallState('ringing');
      setCallError(null);
      
      autoCancelRef.current = setTimeout(() => {
        manager.rejectCall();
        resetAllState();
      }, 45_000);
    };

    manager.onPeerStateChange = (state) => {
      setRemoteMuted(state.isMuted);
      setRemoteCamOff(state.isCamOff);
    };

    manager.onCallTypeChange = (type) => {
      setCallType(type);
    };

    manager.onUpgradeRequest = () => {
      setUpgradeRequestPending(true);
    };

    manager.onUpgradeReject = () => {
      setUpgradeRejectAlert(true);
      setTimeout(() => setUpgradeRejectAlert(false), 5000);
    };

    manager.onCallError = (msg) => {
      setCallError(msg);
    };

    return () => {
      clearAutoCancel();
      manager.destroy();
    };
  }, [myUserId, resetAllState]);

  const startCall = useCallback(async (targetUserId: string, type: 'audio' | 'video') => {
    if (!managerRef.current) return;
    setCallType(type);
    setCallError(null);
    setActivePartnerId(targetUserId);
    await managerRef.current.startCall(targetUserId, type);
    
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
    setCallType(type);
    setCallError(null);
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
  }, []);

  return {
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
    startCall,
    acceptCall,
    rejectCall,
    hangUp,
    sendPeerState: useCallback(async (isMuted: boolean, isCamOff: boolean) => {
      if (managerRef.current) await managerRef.current.sendPeerState(isMuted, isCamOff);
    }, []),
    requestVideoUpgrade: useCallback(async () => {
      if (managerRef.current) await managerRef.current.requestVideoUpgrade();
    }, []),
    acceptVideoUpgrade: useCallback(async () => {
      setUpgradeRequestPending(false);
      if (managerRef.current) await managerRef.current.acceptVideoUpgrade();
    }, []),
    rejectVideoUpgrade: useCallback(async () => {
      setUpgradeRequestPending(false);
      if (managerRef.current) await managerRef.current.rejectVideoUpgrade();
    }, []),
    downgradeToAudio: useCallback(async () => {
      if (managerRef.current) await managerRef.current.downgradeToAudio();
    }, []),
  };
}
