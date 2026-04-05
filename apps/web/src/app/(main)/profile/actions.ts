'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRole);

export async function toggleFollowDB(followerId: string, followingId: string, isJoining: boolean) {
  try {
    if (isJoining) {
      // Add follow
      await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId }).select().single();
      // Optimistic upate user counts using RPC or ignore
    } else {
      // Remove follow
      await supabase.from('follows').delete().match({ follower_id: followerId, following_id: followingId });
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to sync follow to DB:', err.message);
    return { success: false, error: err.message };
  }
}
