'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRole);

export async function toggleFollowDB(followerId: string, followingId: string, isJoining: boolean) {
  try {
    if (isJoining) {
      // 1. Write the associative row
      await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId }).select().single();
      
      // 2. Fetch current counts via Supabase Admin (bypasses RLS read blocks)
      const { data: targetUser } = await supabase.from('users').select('follower_count').eq('id', followingId).single();
      const { data: actorUser } = await supabase.from('users').select('following_count').eq('id', followerId).single();

      // 3. Mutate table integers securely
      if (targetUser) await supabase.from('users').update({ follower_count: (targetUser.follower_count || 0) + 1 }).eq('id', followingId);
      if (actorUser) await supabase.from('users').update({ following_count: (actorUser.following_count || 0) + 1 }).eq('id', followerId);

    } else {
      // Remove follow
      await supabase.from('follows').delete().match({ follower_id: followerId, following_id: followingId });

      // Fetch
      const { data: targetUser } = await supabase.from('users').select('follower_count').eq('id', followingId).single();
      const { data: actorUser } = await supabase.from('users').select('following_count').eq('id', followerId).single();

      // Mutate negative
      if (targetUser && targetUser.follower_count > 0) await supabase.from('users').update({ follower_count: targetUser.follower_count - 1 }).eq('id', followingId);
      if (actorUser && actorUser.following_count > 0) await supabase.from('users').update({ following_count: actorUser.following_count - 1 }).eq('id', followerId);
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to sync follow to DB:', err.message);
    return { success: false, error: err.message };
  }
}
