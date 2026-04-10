/**
 * WebRTC engine using Supabase Realtime as a signaling channel.
 * Supports 1:1 audio and video calls between two authenticated users.
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export type WebRTCSignalType = 'offer' | 'answer' | 'ice-candidate' | 'hang-up' | 'call-request';

export interface WebRTCSignal {
  type: WebRTCSignalType;
  from: string;
  to: string;
  callType?: 'audio' | 'video';
  payload?: any;
}

export type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private supabase: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private myUserId: string;
  private remoteUserId: string = '';

  public onLocalStream: ((stream: MediaStream) => void) | null = null;
  public onRemoteStream: ((stream: MediaStream) => void) | null = null;
  public onCallStateChange: ((state: CallState) => void) | null = null;
  public onIncomingCall: ((from: string, callType: 'audio' | 'video') => void) | null = null;

  constructor(myUserId: string) {
    this.myUserId = myUserId;
    this.supabase = createClient();
    this.subscribeToSignaling();
  }

  private subscribeToSignaling() {
    const channelName = `webrtc:${this.myUserId}`;
    this.channel = this.supabase.channel(channelName)
      .on('broadcast', { event: 'signal' }, ({ payload }: { payload: WebRTCSignal }) => {
        this.handleSignal(payload);
      })
      .subscribe();
  }

  private async sendSignal(signal: Omit<WebRTCSignal, 'from'>) {
    const targetChannel = this.supabase.channel(`webrtc:${signal.to}`);
    await targetChannel.send({
      type: 'broadcast',
      event: 'signal',
      payload: { ...signal, from: this.myUserId },
    });
  }

  private async handleSignal(signal: WebRTCSignal) {
    if (signal.to !== this.myUserId) return;

    switch (signal.type) {
      case 'call-request':
        this.remoteUserId = signal.from;
        this.onIncomingCall?.(signal.from, signal.callType || 'audio');
        break;

      case 'offer':
        await this.handleOffer(signal.payload, signal.from, signal.callType || 'audio');
        break;

      case 'answer':
        await this.pc?.setRemoteDescription(new RTCSessionDescription(signal.payload));
        this.onCallStateChange?.('connected');
        break;

      case 'ice-candidate':
        if (this.pc && signal.payload) {
          try {
            await this.pc.addIceCandidate(new RTCIceCandidate(signal.payload));
          } catch (e) { /* swallow */ }
        }
        break;

      case 'hang-up':
        this.cleanup();
        this.onCallStateChange?.('ended');
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

      // Signal intent first
      await this.sendSignal({ type: 'call-request', to: targetUserId, callType });

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      await this.sendSignal({ type: 'offer', to: targetUserId, payload: offer, callType });
    } catch (err: any) {
      console.error('[WebRTC] Start call error:', err.message);
      this.cleanup();
      this.onCallStateChange?.('ended');
    }
  }

  async acceptCall(callType: 'audio' | 'video') {
    if (!this.remoteUserId) return;

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      this.onLocalStream?.(this.localStream);
      this.onCallStateChange?.('ringing');
    } catch (err: any) {
      console.error('[WebRTC] Accept call error:', err.message);
    }
  }

  async rejectCall() {
    if (this.remoteUserId) {
      await this.sendSignal({ type: 'hang-up', to: this.remoteUserId });
    }
    this.cleanup();
    this.onCallStateChange?.('ended');
  }

  async hangUp() {
    if (this.remoteUserId) {
      await this.sendSignal({ type: 'hang-up', to: this.remoteUserId });
    }
    this.cleanup();
    this.onCallStateChange?.('ended');
  }

  private async handleOffer(offer: RTCSessionDescriptionInit, from: string, callType: 'audio' | 'video') {
    this.remoteUserId = from;

    if (!this.localStream) {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === 'video',
        });
        this.onLocalStream?.(this.localStream);
      } catch (e) { return; }
    }

    this.pc = new RTCPeerConnection(ICE_SERVERS);
    this.setupPCListeners();
    this.localStream.getTracks().forEach(t => this.pc!.addTrack(t, this.localStream!));

    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await this.sendSignal({ type: 'answer', to: from, payload: answer });
    this.onCallStateChange?.('connected');
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
      if (this.pc?.connectionState === 'disconnected' || this.pc?.connectionState === 'failed') {
        this.cleanup();
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
  }

  destroy() {
    this.cleanup();
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
