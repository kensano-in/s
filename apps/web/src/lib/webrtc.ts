/**
 * WebRTC engine using Supabase Realtime as a signaling channel.
 * Supports 1:1 audio and video calls between two authenticated users.
 *
 * FIX: acceptCall now correctly processes the stored offer and creates answer.
 *      callType is stored on call-request and threaded through to handleOffer.
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export type WebRTCSignalType = 
  | 'offer' 
  | 'answer' 
  | 'ice-candidate' 
  | 'hang-up' 
  | 'call-request' 
  | 'call-unavailable'
  | 'peer-state-change'
  | 'upgrade-to-video-request'
  | 'upgrade-to-video-accept'
  | 'upgrade-to-video-reject'
  | 'downgrade-to-audio';

export interface WebRTCSignal {
  type: WebRTCSignalType;
  from: string;
  to: string;
  callType?: 'audio' | 'video';
  payload?: any;
}

export type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'unavailable';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    ...(typeof window !== 'undefined' && process.env.NEXT_PUBLIC_TURN_URL
      ? [
          {
            urls: process.env.NEXT_PUBLIC_TURN_URL,
            username: process.env.NEXT_PUBLIC_TURN_USERNAME || '',
            credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || '',
          },
        ]
      : []),
  ],
};

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private supabase: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private myUserId: string;
  private remoteUserId: string = '';
  // Store the pending offer until user accepts
  private pendingOffer: RTCSessionDescriptionInit | null = null;
  private pendingCallType: 'audio' | 'video' = 'audio';

  public onLocalStream: ((stream: MediaStream) => void) | null = null;
  public onRemoteStream: ((stream: MediaStream) => void) | null = null;
  public onCallStateChange: ((state: CallState) => void) | null = null;
  public onIncomingCall: ((from: string, callType: 'audio' | 'video') => void) | null = null;
  public onPeerStateChange: ((state: { isMuted: boolean; isCamOff: boolean }) => void) | null = null;
  public onCallTypeChange: ((type: 'audio' | 'video') => void) | null = null;
  public onUpgradeRequest: (() => void) | null = null;
  public onUpgradeReject: (() => void) | null = null;
  public onCallError: ((message: string) => void) | null = null;

  private activeChannels = new Map<string, RealtimeChannel>();
  private signalingChannel: RealtimeChannel | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private boundVisibilityHandler: (() => void) | null = null;

  public getUserId(): string {
    return this.myUserId;
  }

  constructor(myUserId: string) {
    this.myUserId = myUserId;
    this.supabase = createClient();

    if (typeof document !== 'undefined') {
      this.boundVisibilityHandler = () => this.handleVisibilityChange();
      document.addEventListener('visibilitychange', this.boundVisibilityHandler);
    }

    this.subscribeToGlobalSignaling();
  }

  private handleVisibilityChange() {
    if (typeof document === 'undefined') return;
    if (document.visibilityState === 'visible') {
      if (!this.channel) {
        console.log('[WebRTC] Tab became visible — resuming global signal channel');
        this.reconnectAttempts = 0;
        this.subscribeToGlobalSignaling();
      }
    } else {
      console.log('[WebRTC] Tab backgrounded — pausing background channel reconnect attempts');
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    }
  }

  // Global signaling just for incoming "call-request"
  private subscribeToGlobalSignaling() {
    const channelName = `webrtc:global:${this.myUserId}`;
    if (this.channel) return;

    // Defer socket channel creation if tab is hidden to save mobile CPU/battery
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      console.log(`[WebRTC] Deferring signal channel connection for ${channelName} (tab hidden)`);
      return;
    }

    this.channel = this.supabase.channel(channelName)
      .on('broadcast', { event: 'signal' }, ({ payload }: { payload: WebRTCSignal }) => {
        this.handleSignal(payload);
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[WebRTC] Global signal channel joined: ${channelName}`);
          this.reconnectAttempts = 0;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
            console.log(`[WebRTC] Global signal channel ${status} while tab hidden — tearing down channel and deferring reconnect`);
            this.cleanupGlobalChannel();
            return;
          }
          this.reconnectAttempts++;
          const delay = Math.min(3000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
          console.warn(`[WebRTC] Global signal channel ${status} – retrying in ${delay}ms (attempt #${this.reconnectAttempts})`, err);
          if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => this.resubscribeGlobalSignaling(), delay);
        }
      });
  }

  private cleanupGlobalChannel() {
    if (this.channel) {
      this.supabase.removeChannel(this.channel).catch(() => {});
      this.channel = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private resubscribeGlobalSignaling() {
    this.cleanupGlobalChannel();
    this.subscribeToGlobalSignaling();
  }

  private getOrCreateChannel(channelName: string): RealtimeChannel {
    let channel = this.activeChannels.get(channelName);
    if (!channel) {
      channel = this.supabase.channel(channelName);
      this.activeChannels.set(channelName, channel);
      channel.subscribe();
    }
    return channel;
  }

  private sendSignal(signal: Omit<WebRTCSignal, 'from'>): Promise<void> {
    const channelName = `webrtc:global:${signal.to}`;
    const channel = this.getOrCreateChannel(channelName);

    const broadcast = () => {
      channel.send({
        type: 'broadcast',
        event: 'signal',
        payload: { ...signal, from: this.myUserId },
      });
    };

    if (channel.state === 'joined') {
      broadcast();
      return Promise.resolve();
    }

    // Wait for the channel to reach 'joined' state before broadcasting.
    // The old setInterval approach would silently drop signals on timeout.
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`[WebRTC] sendSignal timeout: channel ${channelName} never joined`));
      }, 5000);

      const checkJoined = () => {
        if (channel.state === 'joined') {
          clearTimeout(timeout);
          broadcast();
          resolve();
        }
      };

      // Poll at high frequency — channel.subscribe() callback is not always reliable
      const interval = setInterval(() => {
        if (channel.state === 'joined') {
          clearInterval(interval);
          clearTimeout(timeout);
          broadcast();
          resolve();
        }
      }, 30);

      // Also try immediately in case it joined between the check and now
      checkJoined();
    }).catch((err) => {
      console.error('[WebRTC] sendSignal failed (signal may have been lost):', err.message, '| target:', signal.to, '| type:', signal.type);
    });
  }

  private async handleSignal(signal: WebRTCSignal) {
    if (signal.to !== this.myUserId) return;

    // Security validation: verify the signal originates from the correct active partner
    if (signal.type !== 'call-request' && this.remoteUserId && signal.from !== this.remoteUserId) {
      console.warn(`[Security WebRTC] Blocked signal from unauthorized sender: ${signal.from}`);
      return;
    }

    switch (signal.type) {
      case 'call-request':
        this.remoteUserId = signal.from;
        this.pendingCallType = signal.callType || 'audio';
        this.onIncomingCall?.(signal.from, signal.callType || 'audio');
        break;

      case 'offer':
        this.pendingOffer = signal.payload;
        this.pendingCallType = signal.callType || 'audio';
        this.remoteUserId = signal.from;
        if (this.pc) {
          // If we already have a connection (renegotiation), apply the offer instantly
          await this.pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);
          await this.sendSignal({ type: 'answer', to: this.remoteUserId, payload: answer });
          this.onCallTypeChange?.(signal.callType || 'audio');
        }
        break;

      case 'answer':
        if (this.pc) {
          await this.pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
          this.onCallStateChange?.('connected');
        }
        break;

      case 'ice-candidate':
        if (this.pc && signal.payload) {
          try {
            await this.pc.addIceCandidate(new RTCIceCandidate(signal.payload));
          } catch (_) { /* ICE errors are non-fatal */ }
        }
        break;

      case 'hang-up':
        this.cleanup();
        this.onCallStateChange?.('ended');
        break;

      case 'call-unavailable':
        this.cleanup();
        this.onCallStateChange?.('unavailable');
        setTimeout(() => this.onCallStateChange?.('idle'), 3000);
        break;

      case 'peer-state-change':
        if (signal.payload) {
          this.onPeerStateChange?.(signal.payload);
        }
        break;

      case 'upgrade-to-video-request':
        this.onUpgradeRequest?.();
        break;

      case 'upgrade-to-video-accept':
        await this.handleUpgradeAccept();
        break;

      case 'upgrade-to-video-reject':
        this.onUpgradeReject?.();
        break;

      case 'downgrade-to-audio':
        if (this.pc && this.localStream) {
          const senders = this.pc.getSenders();
          const videoSender = senders.find(s => s.track?.kind === 'video');
          if (videoSender) {
            this.pc.removeTrack(videoSender);
          }
          this.localStream.getVideoTracks().forEach(t => {
            t.stop();
            this.localStream?.removeTrack(t);
          });
          this.onLocalStream?.(this.localStream);
        }
        this.onCallTypeChange?.('audio');
        break;
    }
  }

  async sendPeerState(isMuted: boolean, isCamOff: boolean) {
    if (this.remoteUserId) {
      await this.sendSignal({
        type: 'peer-state-change',
        to: this.remoteUserId,
        payload: { isMuted, isCamOff }
      });
    }
  }

  async requestVideoUpgrade() {
    if (this.remoteUserId) {
      await this.sendSignal({ type: 'upgrade-to-video-request', to: this.remoteUserId });
    }
  }

  async acceptVideoUpgrade() {
    if (!this.remoteUserId || !this.localStream || !this.pc) return;
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = videoStream.getVideoTracks()[0];
      
      this.localStream.addTrack(videoTrack);
      this.pc.addTrack(videoTrack, this.localStream);
      
      this.onLocalStream?.(this.localStream);
      await this.sendSignal({ type: 'upgrade-to-video-accept', to: this.remoteUserId });
      this.onCallTypeChange?.('video');
    } catch (err: any) {
      console.error('[WebRTC] acceptVideoUpgrade error:', err.message);
      await this.rejectVideoUpgrade();
    }
  }

  async rejectVideoUpgrade() {
    if (this.remoteUserId) {
      await this.sendSignal({ type: 'upgrade-to-video-reject', to: this.remoteUserId });
    }
  }

  async handleUpgradeAccept() {
    if (!this.remoteUserId || !this.localStream || !this.pc) return;
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = videoStream.getVideoTracks()[0];
      
      this.localStream.addTrack(videoTrack);
      this.pc.addTrack(videoTrack, this.localStream);

      this.onLocalStream?.(this.localStream);
      this.onCallTypeChange?.('video');
      await this.renegotiate('video');
    } catch (err: any) {
      console.error('[WebRTC] handleUpgradeAccept error:', err.message);
    }
  }

  async downgradeToAudio() {
    if (!this.remoteUserId || !this.localStream || !this.pc) return;
    try {
      const senders = this.pc.getSenders();
      const videoSender = senders.find(s => s.track?.kind === 'video');
      if (videoSender) {
        this.pc.removeTrack(videoSender);
      }

      this.localStream.getVideoTracks().forEach(t => {
        t.stop();
        this.localStream?.removeTrack(t);
      });

      this.onLocalStream?.(this.localStream);
      await this.sendSignal({ type: 'downgrade-to-audio', to: this.remoteUserId });
      this.onCallTypeChange?.('audio');
      await this.renegotiate('audio');
    } catch (err: any) {
      console.error('[WebRTC] downgradeToAudio error:', err.message);
    }
  }

  private async renegotiate(callType: 'audio' | 'video') {
    if (!this.pc || !this.remoteUserId) return;
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await this.sendSignal({ type: 'offer', to: this.remoteUserId, payload: offer, callType });
  }

  async startCall(targetUserId: string, callType: 'audio' | 'video') {
    this.remoteUserId = targetUserId;
    this.onCallStateChange?.('calling');

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      this.onLocalStream?.(this.localStream);

      this.pc = new RTCPeerConnection(ICE_SERVERS);
      this.setupPCListeners();
      this.localStream.getTracks().forEach(t => this.pc!.addTrack(t, this.localStream!));

      // Signal intent first via the global inbox (shows incoming call UI on receiver)
      await this.sendSignal({ type: 'call-request', to: targetUserId, callType });

      // Send the actual offer
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      await this.sendSignal({ type: 'offer', to: targetUserId, payload: offer, callType });
    } catch (err: any) {
      console.warn('[WebRTC] Start call error:', err.message);
      let friendlyMsg = 'Failed to access camera or microphone.';
      if (err.name === 'NotAllowedError') {
        friendlyMsg = 'Microphone/Camera permission denied. Please allow access in your browser settings.';
      } else if (err.name === 'NotFoundError') {
        friendlyMsg = 'No audio or video input devices were found.';
      } else if (err.name === 'NotReadableError' || err.message?.includes('Could not start') || err.message?.includes('Source')) {
        friendlyMsg = 'Microphone/Camera is busy. Please close other apps using it.';
      } else if (err.message) {
        friendlyMsg = err.message;
      }
      
      this.onCallError?.(friendlyMsg);

      // Notify receiver we're unavailable
      if (this.remoteUserId) {
        await this.sendSignal({ type: 'call-unavailable', to: this.remoteUserId });
      }
      this.cleanup();
      this.onCallStateChange?.('ended');
    }
  }

  /**
   * Accept an incoming call.
   * Creates PeerConnection, gets local stream, processes stored offer, creates answer.
   */
  async acceptCall(callType: 'audio' | 'video') {
    if (!this.remoteUserId) return;

    try {
      // Get local media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      this.onLocalStream?.(this.localStream);

      // Create peer connection
      this.pc = new RTCPeerConnection(ICE_SERVERS);
      this.setupPCListeners();
      this.localStream.getTracks().forEach(t => this.pc!.addTrack(t, this.localStream!));

      // Process the stored offer
      if (this.pendingOffer) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(this.pendingOffer));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        await this.sendSignal({ type: 'answer', to: this.remoteUserId, payload: answer });
        this.pendingOffer = null;
        this.onCallStateChange?.('connected');
      } else {
        // Offer not received yet (race: user clicked accept before offer arrived)
        // Wait up to 5 seconds for it
        let waited = 0;
        // PATCH WR-02: Store ref so interval can be cleared on teardown
        let offerPollInterval: ReturnType<typeof setInterval> | null = null;
        offerPollInterval = setInterval(async () => {
          waited += 200;
          if (this.pendingOffer) {
            clearInterval(offerPollInterval!);
            if (this.pc) {
              await this.pc.setRemoteDescription(new RTCSessionDescription(this.pendingOffer));
              const answer = await this.pc.createAnswer();
              await this.pc.setLocalDescription(answer);
              await this.sendSignal({ type: 'answer', to: this.remoteUserId, payload: answer });
            }
            this.pendingOffer = null;
            this.onCallStateChange?.('connected');
          } else if (waited >= 5000) {
            clearInterval(offerPollInterval!);
            this.cleanup();
            this.onCallStateChange?.('ended');
          }
        }, 200);
      }
    } catch (err: any) {
      console.warn('[WebRTC] acceptCall error:', err.message);
      let friendlyMsg = 'Failed to access camera or microphone.';
      if (err.name === 'NotAllowedError') {
        friendlyMsg = 'Microphone/Camera permission denied. Please allow access in your browser settings.';
      } else if (err.name === 'NotFoundError') {
        friendlyMsg = 'No audio or video input devices were found.';
      } else if (err.name === 'NotReadableError' || err.message?.includes('Could not start') || err.message?.includes('Source')) {
        friendlyMsg = 'Microphone/Camera is busy. Please close other apps.';
      } else if (err.message) {
        friendlyMsg = err.message;
      }

      this.onCallError?.(friendlyMsg);
      this.cleanup();
      this.onCallStateChange?.('ended');
    }
  }

  async rejectCall() {
    if (this.remoteUserId) {
      await this.sendSignal({ type: 'hang-up', to: this.remoteUserId });
    }
    this.pendingOffer = null;
    this.cleanup();
    this.onCallStateChange?.('ended');
  }

  async hangUp() {
    if (this.remoteUserId) {
      // PATCH WR-03: Await the signal BEFORE cleaning up so remote receives hang-up
      await this.sendSignal({ type: 'hang-up', to: this.remoteUserId });
    }
    this.cleanup();
    this.onCallStateChange?.('ended');
  }

  private setupPCListeners() {
    if (!this.pc) return;

    this.pc.onicecandidate = (e) => {
      if (e.candidate && this.remoteUserId) {
        this.sendSignal({ type: 'ice-candidate', to: this.remoteUserId, payload: e.candidate });
      }
    };

    this.pc.ontrack = (e) => {
      const [remoteStream] = e.streams;
      if (remoteStream) this.onRemoteStream?.(remoteStream);
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState;
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        // PATCH WR-06: cleanup() already calls onCallStateChange('ended') via hangUp/rejectCall
        // Only call it here if pc died unexpectedly (no hangUp initiated)
        const wasConnected = state !== 'closed';
        this.cleanup();
        if (wasConnected) this.onCallStateChange?.('ended');
      }
    };

    this.pc.onsignalingstatechange = () => {
      // Handle unexpected signaling state changes
      if (this.pc?.signalingState === 'closed') {
        this.onCallStateChange?.('ended');
      }
    };
  }

  private cleanup() {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;
    this.pc?.close();
    this.pc = null;
    this.remoteUserId = '';
    this.pendingOffer = null;
    this.cleanupChannels();
  }

  private cleanupChannels() {
    for (const channel of this.activeChannels.values()) {
      this.supabase.removeChannel(channel).catch(() => {});
    }
    this.activeChannels.clear();
  }

  destroy() {
    this.cleanup();
    // Do not close persistent global signaling channel on hook unmount/route change
  }

  forceDestroy() {
    this.cleanup();
    this.cleanupGlobalChannel();
    if (typeof document !== 'undefined' && this.boundVisibilityHandler) {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
      this.boundVisibilityHandler = null;
    }
  }
}

let globalWebRTCInstance: WebRTCManager | null = null;

export function getGlobalWebRTCManager(userId: string): WebRTCManager {
  if (globalWebRTCInstance && globalWebRTCInstance.getUserId() === userId) {
    return globalWebRTCInstance;
  }
  if (globalWebRTCInstance) {
    globalWebRTCInstance.forceDestroy();
  }
  globalWebRTCInstance = new WebRTCManager(userId);
  return globalWebRTCInstance;
}
