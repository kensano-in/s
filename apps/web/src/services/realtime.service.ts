/**
 * 📡 Realtime Service — Section 2.E / 4
 * 
 * Manages scoped subscriptions and system-wide WebSocket events.
 * Rule: "Scoped subscriptions, no global listeners, always cleanup."
 */

import { RealtimeChannel, RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import { useAppStore } from '@/lib/store';
import { ChatMessage } from '@/components/Chat/MessageItem';
import { perf } from '@/lib/perf';

// Timestamp map: messageId → emit time. Used for RTT calculation.
const _emitTimes = new Map<string, number>();

class RealtimeService {
  private module = 'RealtimeService';
  private channels: Map<string, RealtimeChannel> = new Map();

  /**
   * ── Messaging Subscription ────────────────────────────────────────────────
   * Scoped to a specific conversation or user.
   */
  subscribeToChat(activeConvId: string, currentUserId: string) {
    const channelName = `chat:${activeConvId}`;
    
    // Cleanup existing if already subscribed
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    const channel = supabase.channel(channelName);
    const store = useAppStore.getState();

    logger.info(this.module, 'subscribe:started', { channelName });
    perf.mark(`ws_subscribe_${activeConvId}_start`);

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          // Scoped filtering: either the conversation matches OR it's a DM to/from us
          filter: `conversation_id=eq.${activeConvId}`,
        },
        (payload: RealtimePostgresInsertPayload<any>) => {
          perf.wsReceive('postgres_changes:INSERT', payload.new?.id ?? 'unknown', activeConvId);
          this.handleIncomingMessage(payload.new, activeConvId, currentUserId);
        }
      )
      // Section 4: Fallback Broadcast track
      .on('broadcast', { event: 'message' }, (payload: any) => {
        perf.wsReceive('broadcast:message', payload.payload?.id ?? 'unknown', activeConvId);
        this.handleIncomingMessage(payload.payload, activeConvId, currentUserId, true);
      })
      .subscribe((status: any) => {
        logger.info(this.module, `status:${status}`, { channelName });
        if (status === 'SUBSCRIBED') {
          const subscribeMs = perf.measure(
            `ws_subscribe_${activeConvId}`,
            `ws_subscribe_${activeConvId}_start`
          );
          console.log(`[perf:ws] Subscribed to ${channelName} in ${subscribeMs?.toFixed(0)}ms`);
        }
        // NOTE: Do NOT call setWsStatus here. Supabase channel lifecycle events
        // (SUBSCRIBING → SUBSCRIBED) fire on every conversation switch and caused
        // the amber↔green status pill to flash on every nav action. The WsClient
        // singleton in lib/ws/ws-client.ts is the sole authority over wsStatus.
      });

    this.channels.set(channelName, channel);
    return () => this.unsubscribe(channelName);
  }

  // Call this when the client sends a message (to track RTT)
  trackEmit(messageId: string, convId?: string) {
    _emitTimes.set(messageId, Date.now());
    perf.wsEmit('message:send', messageId, convId);
  }

  private handleIncomingMessage(
    raw: any, 
    activeConvId: string, 
    currentUserId: string, 
    isBroadcast = false
  ) {
    const store = useAppStore.getState();
    const receiveTs = Date.now();

    // RTT: if this message was emitted by us, compute round-trip
    if (raw?.client_temp_id && _emitTimes.has(raw.client_temp_id)) {
      const emitTs = _emitTimes.get(raw.client_temp_id)!;
      const rtt = receiveTs - emitTs;
      perf.wsAck('message:ack', raw.client_temp_id, emitTs);
      console.log(`[perf:ws] RTT for msg ${raw.client_temp_id}: ${rtt}ms`);
      _emitTimes.delete(raw.client_temp_id);
    }

    // Mapping raw DB record to ChatMessage type
    const msg: ChatMessage = {
      ...raw,
      is_mine: raw.sender_id === currentUserId,
      status: 'sent',
      sent_at: raw.sent_at || raw.created_at,
    };

    logger.info(this.module, 'message:received', { 
      id: msg.id, 
      isBroadcast, 
      from: msg.sender_id 
    });

    store.upsertMessage(activeConvId, msg);
  }

  unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      logger.info(this.module, 'unsubscribe', { channelName });
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  /**
   * ── Cleanup ───────────────────────────────────────────────────────────────
   */
  destroy() {
    this.channels.forEach((_, name) => this.unsubscribe(name));
  }
}

export const realtimeService = new RealtimeService();
