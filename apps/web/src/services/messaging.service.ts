/**
 * 📨 Messaging Service — Section 2.C: Core Services
 * 
 * Centralized logic for message delivery, synchronization, and realtime management.
 * Follows the flow: Service -> DB -> Realtime -> Store
 */

import { supabase } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import { useAppStore } from '@/lib/store';
import { ChatMessage } from '@/components/Chat/MessageItem';

class MessagingService {
  private module = 'MessagingService';

  /**
   * ── Send Flow (Blueprint Section 4) ─────────────────────────────────────────
   * User Action -> Service -> Optimistic UI -> DB -> Realtime Sync
   */
  async sendMessage(params: {
    content: string;
    senderId: string;
    activeConvId: string;
    isGroup: boolean;
    type?: 'text' | 'image' | 'file' | 'voice';
    mediaUrl?: string;
    replyToId?: string;
    viewOnce?: boolean;
  }) {
    const startTime = Date.now();
    const tempId = `temp_${Date.now()}`;
    const { 
      content, 
      senderId, 
      activeConvId, 
      isGroup, 
      type = 'text', 
      mediaUrl, 
      replyToId, 
      viewOnce = false 
    } = params;

    // 1. Optimistic Update (Zustand)
    const optimistic: ChatMessage = {
      id: tempId,
      sender_id: senderId,
      recipient_id: isGroup ? undefined : activeConvId,
      conversation_id: isGroup ? activeConvId : undefined,
      content,
      type,
      media_url: mediaUrl,
      status: 'local_sending' as const,
      sent_at: new Date().toISOString(),
      is_mine: true,
      client_temp_id: tempId,
      reactions: [],
      reply_to_id: replyToId,
      view_once: viewOnce,
    };

    logger.info(this.module, 'sendMessage:started', { activeConvId, tempId });

    // ── Local Sync ──
    const store = useAppStore.getState();
    store.upsertMessage(activeConvId, optimistic);

    // 2. Prepare DB Payload
    const payload = {
      sender_id: senderId,
      recipient_id: isGroup ? senderId : activeConvId, // Match DB constraint for groups
      conversation_id: isGroup ? activeConvId : null,
      content,
      type,
      media_url: mediaUrl || null,
      reply_to_id: replyToId || null,
      client_temp_id: tempId,
      status: 'sent',
      view_once: viewOnce,
    };

    try {
      // 3. DB Insert (Section 4)
      const { data, error } = await supabase
        .from('messages')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // 4. Success Reconciliation
      const latency = Date.now() - startTime;
      logger.metric(this.module, 'sendMessage:success', latency, { msgId: data.id });

      // BUG-03 NOTE: For groups, recipient_id = senderId to satisfy the DB NOT NULL
      // constraint. This means the block-check (validateMessagingPermission) would
      // perform a self-lookup — always passing but wasting a round-trip.
      // The block check is intentionally not called here for group messages.
      // Group access control is enforced by conversation_participants membership.

      store.upsertMessage(activeConvId, {
        ...optimistic,
        id: data.id,
        status: 'sent',
        created_at: data.created_at,
      });

      return { success: true, data };
    } catch (err: any) {
      logger.error(this.module, 'sendMessage:failed', err, { tempId });
      store.upsertMessage(activeConvId, { ...optimistic, status: 'failed' });
      return { success: false, error: err.message };
    }
  }

  /**
   * ── Load Lifecycle ─────────────────────────────────────────────────────────
   */
  async loadMessages(convId: string, isGroup: boolean, limit = 50) {
    const startTime = Date.now();
    logger.info(this.module, 'loadMessages:started', { convId });

    try {
      let query = supabase
        .from('messages')
        .select('*, sender:users!sender_id(display_name, username, avatar_url)')
        // Sort ASC so oldest message is first (consistent with main page loadMessages)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (isGroup) {
        query = query.eq('conversation_id', convId);
      } else {
        // BUG-03 FIX: The old .and() call is not a valid Supabase JS method
        // and generated a TS error. Use .or() with a compound filter instead.
        query = query
          .is('conversation_id', null)
          .or(`and(sender_id.eq.${convId},recipient_id.neq.${convId}),and(recipient_id.eq.${convId},sender_id.neq.${convId})`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const latency = Date.now() - startTime;
      logger.metric(this.module, 'loadMessages:success', latency, { count: data?.length });

      return { success: true, data };
    } catch (err: any) {
      logger.error(this.module, 'loadMessages:failed', err, { convId });
      return { success: false, error: err.message };
    }
  }
}

export const messagingService = new MessagingService();
