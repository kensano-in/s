'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Phase 5 FIX: Atomic follow via Postgres RPC — eliminates read-then-write race condition
export async function toggleFollowDB(followerId: string, followingId: string, isJoining: boolean) {
  try {
    const { error } = await supabaseAdmin.rpc('toggle_follow', {
      p_follower: followerId,
      p_following: followingId,
      p_is_following: isJoining,
    });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Failed to sync follow:', err.message);
    return { success: false, error: err.message };
  }
}
