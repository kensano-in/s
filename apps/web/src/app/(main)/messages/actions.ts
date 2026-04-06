'use server';

import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize an absolute-privilege Server Client to override RLS DB-blocks
const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceRole);

/**
 * Validates if the sender is allowed to message the recipient based on privacy protocols.
 */
export async function validateMessagingPermission(senderId: string, recipientId: string) {
    try {
        const { data: recipient, error: userErr } = await supabaseAdmin
            .from('users')
            .select('messaging_permission, is_private')
            .eq('id', recipientId)
            .single();

        if (userErr || !recipient) return { allowed: false, error: 'Recipient node not found' };

        const permission = recipient.messaging_permission;
        
        if (permission === 'none') return { allowed: false, error: 'Recipient has locked all incoming signals' };
        
        if (permission === 'followers') {
            const { data: isFollowing, error: followErr } = await supabaseAdmin
                .from('follows')
                .select('follower_id')
                .match({ follower_id: senderId, following_id: recipientId })
                .single();
            
            if (followErr || !isFollowing) return { allowed: false, error: 'Communication restricted to followers only' };
        }

        // Check if blocked
        const { data: isBlocked } = await supabaseAdmin
            .from('blocked_users')
            .select('user_id')
            .match({ user_id: recipientId, blocked_user_id: senderId })
            .single();

        if (isBlocked) return { allowed: false, error: 'Signal rejected by recipient node' };

        return { allowed: true };
    } catch (err: any) {
        return { allowed: false, error: err.message };
    }
}

/**
 * Sends a message to the database and updates last_message index.
 */
export async function sendMessageDB(senderId: string, recipientId: string, content: string) {
  try {
    if (!senderId || !recipientId || !content) {
      return { success: false, error: 'Malformed message payload' };
    }

    // Secondary permission check at the gate
    const { allowed, error: permErr } = await validateMessagingPermission(senderId, recipientId);
    if (!allowed) return { success: false, error: permErr };

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        content: content,
      })
      .select()
      .single();

    if (error) {
      console.error('Database Sync Error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, message: data };
  } catch (err: any) {
    console.error('Failed to sync message to DB:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Deletes a message permanently from the sovereign database.
 */
export async function deleteMessageDB(userId: string, messageId: string) {
    try {
        const { error } = await supabaseAdmin
            .from('messages')
            .delete()
            .match({ id: messageId, sender_id: userId });
        
        if (error) return { success: false, error: error.message };
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
