/**
 * 🔔 Notification Service — Section 2.D: Core Services
 * 
 * Manages fetching, marking as read, and triggering notification events.
 * Implements batching awareness and prioritization.
 */

import { supabase } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import { useAppStore } from '@/lib/store';

import { Notification } from '@/lib/types';

class NotificationService {
  private module = 'NotificationService';

  /**
   * ── Fetch Lifecycle ────────────────────────────────────────────────────────
   */
  async fetchNotifications(userId: string, limit = 50) {
    const startTime = Date.now();
    logger.info(this.module, 'fetchNotifications:started', { userId });

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          actor:users!actor_id(id, username, display_name, avatar_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const latency = Date.now() - startTime;
      logger.metric(this.module, 'fetchNotifications:success', latency, { count: data?.length });

      // Transform for aggregation display if actor_ids is present
      const processed: Notification[] = data.map((n: any) => ({
        ...n,
        isRead: n.is_read // Standardize naming
      }));

      return { success: true, data: processed };
    } catch (err: any) {
      logger.error(this.module, 'fetchNotifications:failed', err, { userId });
      return { success: false, error: err.message };
    }
  }

  /**
   * ── Mutation Actions ───────────────────────────────────────────────────────
   */
  async markAsRead(notifId: string, userId: string) {
    logger.info(this.module, 'markAsRead:started', { notifId });
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notifId)
        .eq('user_id', userId);

      if (error) throw error;
      
      useAppStore.getState().markNotifRead(notifId);
      return { success: true };
    } catch (err: any) {
      logger.error(this.module, 'markAsRead:failed', err, { notifId });
      return { success: false, error: err.message };
    }
  }

  async markAllAsRead(userId: string) {
    logger.info(this.module, 'markAllAsRead:started', { userId });
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      
      useAppStore.getState().markAllNotifsRead();
      return { success: true };
    } catch (err: any) {
      logger.error(this.module, 'markAllAsRead:failed', err, { userId });
      return { success: false, error: err.message };
    }
  }

  /**
   * ── Preference Management ──────────────────────────────────────────────────
   */
  async getPreferences(userId: string) {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async updatePreference(userId: string, type: string, updates: { enabled_in_app?: boolean, enabled_push?: boolean }) {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({ user_id: userId, type, ...updates });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export const notificationService = new NotificationService();
