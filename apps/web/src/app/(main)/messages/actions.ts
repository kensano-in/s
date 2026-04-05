'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize an absolute-privilege Server Client to override RLS DB-blocks
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

export async function sendMessageDB(senderId: string, recipientId: string, content: string) {
  try {
    if (!senderId || !recipientId || !content) {
      return { success: false, error: 'Malformed message payload' };
    }

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
