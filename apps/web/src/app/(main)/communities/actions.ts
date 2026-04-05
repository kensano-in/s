'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRole);

export async function createCommunity(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const displayName = formData.get('displayName') as string;
    const description = formData.get('description') as string;
    const isPrivate = formData.get('isPrivate') === 'true';
    const userId = formData.get('userId') as string;

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
      console.error('Community creation error:', error);
      return { success: false, error: error.message };
    }

    // Bind Creator as Admin
    await supabase.from('community_members').insert({
      community_id: community.id,
      user_id: userId,
      role: 'admin',
    });

    return { success: true, community };
  } catch (err: any) {
    return { success: false, error: err.message || 'Internal error checking community' };
  }
}

export async function toggleCommunityJoin(communityId: string, userId: string, isJoining: boolean) {
  try {
    if (isJoining) {
      // INSERT triggers trg_community_member_count automatically — no RPC needed
      const { error } = await supabase.from('community_members').insert({
        community_id: communityId,
        user_id: userId,
        role: 'member',
      });
      if (error) return { success: false, error: error.message };
    } else {
      // DELETE triggers trg_community_member_count automatically
      const { error } = await supabase.from('community_members')
        .delete()
        .match({ community_id: communityId, user_id: userId });
      if (error) return { success: false, error: error.message };
    }
    return { success: true };
  } catch(e: any) {
    return { success: false, error: e.message };
  }
}
