/**
 * WebRTC engine using Supabase Realtime as a signaling channel.
 * Supports 1:1 audio and video calls between two authenticated users.
 *
 * FIX: acceptCall now correctly processes the stored offer and creates answer.
 *      callType is stored on call-request and threaded through to handleOffer.
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export type WebRTCSignalType = 'offer' | 'answer' | 'ice-candidate' | 'hang-up' | 'call-request' | 'call-unavailable';

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

  private signalingChannel: RealtimeChannel | null = null;

  constructor(myUserId: string) {
    this.myUserId = myUserId;
    this.supabase = createClient();
    this.subscribeToGlobalSignaling();
  }

  // Global signaling just for incoming "call-request"
  private subscribeToGlobalSignaling() {
    const channelName = `webrtc:global:${this.myUserId}`;
    this.channel = this.supabase.channel(channelName)
      .on('broadcast', { event: 'signal' }, ({ payload }: { payload: WebRTCSignal }) => {
        this.handleSignal(payload);
      })
      .subscribe();
  }

  private getRoomId(userId1: string, userId2: string) {
    // Predictable shared room ID
    return `webrtc:room:${[userId1, userId2].sort().join('-')}`;
  }

  // Active call bidirectional multiplexing
  private async joinCallRoom(targetUserId: string) {
    if (this.signalingChannel) {
      await this.supabase.removeChannel(this.signalingChannel);
    }
    const room = this.getRoomId(this.myUserId, targetUserId);
    this.signalingChannel = this.supabase.channel(room)
      .on('broadcast', { event: 'signal' }, ({ payload }: { payload: WebRTCSignal }) => {
        this.handleSignal(payload);
      });
      
    // Return a promise to ensure we are connected before sending ICE candidates
    return new Promise<void>((resolve) => {
      this.signalingChannel!.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
      });
    });
  }

  private async sendSignal(signal: Omit<WebRTCSignal, 'from'>) {
    // If it's a call-request, we MUST use the target's global inbox because they aren't in the shared room yet
    if (signal.type === 'call-request') {
      const inbox = this.supabase.channel(`webrtc:global:${signal.to}`);
      inbox.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          inbox.send({
            type: 'broadcast',
            event: 'signal',
            payload: { ...signal, from: this.myUserId },
          }).then(() => this.supabase.removeChannel(inbox));
        }
      });
      return;
    }

    // For all other high-frequency signals (offer, answer, ice), emit directly into the pre-established shared room
    if (this.signalingChannel) {
      this.signalingChannel.send({
        type: 'broadcast',
        event: 'signal',
        payload: { ...signal, from: this.myUserId },
      });
    }
  }

  private async handleSignal(signal: WebRTCSignal) {
    if (signal.to !== this.myUserId) return;

    switch (signal.type) {
      case 'call-request':
        // Store remoteUserId for the incoming call
        this.remoteUserId = signal.from;
        this.pendingCallType = signal.callType || 'audio';
        this.onIncomingCall?.(signal.from, signal.callType || 'audio');
        break;

      case 'offer':
        // Store the offer — will be processed when user accepts
        this.pendingOffer = signal.payload;
        this.pendingCallType = signal.callType || 'audio';
        this.remoteUserId = signal.from;
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
        // Auto-reset after showing "unavailable" state
        setTimeout(() => this.onCallStateChange?.('idle'), 3000);
        break;
    }
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

      // Join the multiplexed active call room before sending the offer
      await this.joinCallRoom(targetUserId);

      // Send the actual offer
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      await this.sendSignal({ type: 'offer', to: targetUserId, payload: offer, callType });
    } catch (err: any) {
      console.error('[WebRTC] Start call error:', err.message);
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

      // Join the multiplexed active call room
      await this.joinCallRoom(this.remoteUserId);

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
      console.error('[WebRTC] acceptCall error:', err.message);
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
    // PATCH WR-05: Remove signaling channel to prevent per-call channel accumulation
    if (this.signalingChannel) {
      this.supabase.removeChannel(this.signalingChannel).catch(() => {});
      this.signalingChannel = null;
    }
  }

  destroy() {
    this.cleanup();
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    if (this.signalingChannel) {
      this.supabase.removeChannel(this.signalingChannel);
      this.signalingChannel = null;
    }
  }
}
