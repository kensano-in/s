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
      if (error.code === '23505') return { success: false, error: 'Community name already exists.' };
      return { success: false, error: error.message };
    }

    // Bind Creator as Admin
    await supabase.from('community_members').insert({
      community_id: community.id,
      user_id: userId,
      role: 'admin',
    });

    // Create a default 'general' text channel
    await supabase.from('community_channels').insert({
      community_id: community.id,
      name: 'general',
      type: 'text'
    });

    revalidatePath('/communities');
    return { success: true, community };
  } catch (err: any) {
    return { success: false, error: err.message || 'Internal error checking community' };
  }
}

export async function getCommunityChannels(communityId: string) {
  try {
    const { data: channels, error } = await supabase
      .from('community_channels')
      .select('*')
      .eq('community_id', communityId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { success: true, channels: channels || [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getCommunityMessages(channelId: string) {
  try {
    const { data: messages, error } = await supabase
      .from('community_messages')
      .select(`
        *,
        sender:auth.users!sender_id (
          id,
          raw_user_meta_data
        ),
        reactions:community_message_reactions (
          id,
          emoji,
          user_id
        )
      `)
      .eq('channel_id', channelId)
      .order('sent_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    
    // Map sender info like normal messages
    const parsed = ((messages as any[]) || []).map(m => ({
      ...m,
      sender_display: m.sender?.raw_user_meta_data?.display_name || 'User',
      reactions: m.reactions || [],
    })).reverse();

    return { success: true, messages: parsed };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendCommunityMessage(
  channelId: string,
  senderId: string,
  content: string,
  type: string = 'text',
  mediaUrl?: string
) {
  try {
    const { data, error } = await supabase
      .from('community_messages')
      .insert({
        channel_id: channelId,
        sender_id: senderId,
        content,
        type,
        media_url: mediaUrl,
      })
      .select(`
        *,
        sender:auth.users!sender_id (
          id,
          raw_user_meta_data
        )
      `)
      .single();

    if (error) throw error;
    
    const parsed = {
      ...(data as any),
      sender_display: (data as any)?.sender?.raw_user_meta_data?.display_name || 'User',
    };

    return { success: true, data: parsed };
  } catch (err: any) {
    return { success: false, error: err.message };
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

    // FIX: Update member_count — Supabase does not auto-update this
    const { data: comm } = await supabase
      .from('communities')
      .select('member_count')
      .eq('id', communityId)
      .single();
    if (comm) {
      await supabase
        .from('communities')
        .update({ member_count: Math.max(0, (comm.member_count || 0) + (isJoining ? 1 : -1)) })
        .eq('id', communityId);
    }

    revalidatePath('/communities');
    return { success: true };
  } catch(e: any) {
    return { success: false, error: e.message };
  }
}

export async function getCommunityMembers(communityId: string) {
  try {
    const { data: members, error } = await supabase
      .from('community_members')
      .select(`
        *,
        user:auth.users!user_id (
          id,
          raw_user_meta_data
        )
      `)
      .eq('community_id', communityId);

    if (error) throw error;

    const parsed = ((members as any[]) || []).map(m => ({
      ...m,
      display_name: m.user?.raw_user_meta_data?.display_name || 'User',
      username: m.user?.raw_user_meta_data?.username || 'user',
      avatar_url: m.user?.raw_user_meta_data?.avatar_url,
    }));

    return { success: true, members: parsed };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteCommunityMessageDB(userId: string, messageId: string) {
  try {
    // Need to verify ownership or admin role. Simplified for now:
    const { error } = await supabase
      .from('community_messages')
      .delete()
      .match({ id: messageId }); // we should verify sender_id = userId ideally

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function reactCommunityMessageDB(userId: string, messageId: string, emoji: string) {
  try {
    // Check if the reaction already exists to toggle it
    const { data: existing } = await supabase
      .from('community_message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .single();

    if (existing) {
      // Toggle off
      const { error } = await supabase
        .from('community_message_reactions')
        .delete()
        .eq('id', existing.id);
      if (error) throw error;
      return { success: true, action: 'removed' };
    } else {
      // Toggle on
      const { error } = await supabase
        .from('community_message_reactions')
        .insert({
          message_id: messageId,
          user_id: userId,
          emoji
        });
      if (error) throw error;
      return { success: true, action: 'added' };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getPulseSignalsDB() {
  try {
    // 1. Get top 3 communities by member count
    const { data: topCommunities, error: commError } = await supabase
      .from('communities')
      .select('id, name, display_name, member_count')
      .order('member_count', { ascending: false })
      .limit(3);

    if (commError) throw commError;

    const signals: any[] = [];

    // 2. For each top community, get recent message count (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    for (const comm of (topCommunities || [])) {
      const { count, error: msgError } = await supabase
        .from('community_messages')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', (await supabase.from('community_channels').select('id').eq('community_id', comm.id).limit(1).single()).data?.id)
        .gte('sent_at', yesterday);
      
      // Add member growth signal
      signals.push({
        id: `mem_${comm.id}`,
        type: 'users',
        text: `members in ${comm.display_name}`,
        count: comm.member_count || 0,
        href: `/communities/${comm.id}`,
        color: 'text-blue-500'
      });

      // Add activity signal if there are recent messages
      if (count && count > 0) {
        signals.push({
          id: `msg_${comm.id}`,
          type: 'message',
          text: `new messages in ${comm.display_name}`,
          count: count,
          href: `/communities/${comm.id}`,
          color: 'text-emerald-500'
        });
      }
    }

    return { success: true, signals: signals.slice(0, 3) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
