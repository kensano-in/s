'use server';

import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createAdminClient(supabaseUrl, supabaseServiceRole);

export async function getCommunities(userId?: string) {
    try {
        // Fetch all communities and whether the current user is a member
        const { data: communities, error } = await supabase
            .from('communities')
            .select(`
                *,
                members:community_members(user_id)
            `)
            .order('member_count', { ascending: false });

        if (error) throw error;

        const results = communities.map(c => ({
            ...c,
            isJoined: userId ? c.members.some((m: any) => m.user_id === userId) : false
        }));

        return { success: true, communities: results };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function createCommunity(formData: { name: string; displayName: string; description: string; isPrivate: boolean; userId: string }) {
  try {
    const { name, displayName, description, isPrivate, userId } = formData;

    if (!name || !displayName || !description || !userId) {
      return { success: false, error: 'All fields and authentication are required.' };
    }

    const cleanedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    const { data: community, error } = await supabase
      .from('communities')
      .insert({
        name: cleanedName,
        display_name: displayName,
        description,
        is_private: isPrivate,
        icon_url: `https://api.dicebear.com/7.x/shapes/svg?seed=${cleanedName}`,
        member_count: 1,
        boost_level: 0,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return { success: false, error: 'Protocol identifier already registered.' };
      return { success: false, error: error.message };
    }

    // Bind Creator as Admin
    await supabase.from('community_members').insert({
      community_id: community.id,
      user_id: userId,
      role: 'admin',
    });

    revalidatePath('/communities');
    return { success: true, community };
  } catch (err: any) {
    return { success: false, error: err.message || 'Internal error checking community' };
  }
}

export async function toggleCommunityJoin(communityId: string, userId: string, isJoining: boolean) {
  try {
    if (isJoining) {
      const { error } = await supabase.from('community_members').insert({
        community_id: communityId,
        user_id: userId,
        role: 'member',
      });
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from('community_members')
        .delete()
        .match({ community_id: communityId, user_id: userId });
      if (error) return { success: false, error: error.message };
    }
    revalidatePath('/communities');
    return { success: true };
  } catch(e: any) {
    return { success: false, error: e.message };
  }
}
