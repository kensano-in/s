'use server';



import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { isUserRestricted } from '@/lib/spamGuard';
import { recordActivityAndCheckSpam } from '@/lib/moderationEngine';

import { revalidatePath } from 'next/cache';

import { getCommunityIconUrl } from '@/lib/utils';

import {

  getDb,

  getCommunitiesMock,

  getCommunityByNameMock,

  createCommunityMock,

  getCommunityChannelsMock,

  getCommunityMessagesMock,

  sendCommunityMessageMock,

  toggleCommunityJoinMock,

  getCommunityMembersMock,

  deleteCommunityMessageDBMock,

  editCommunityMessageDBMock,

  reactCommunityMessageDBMock,

  updateCommunitySettingsMock,

  updateMemberRoleMock,

  deleteCommunityChannelDBMock,

  toggleCommunityMessagePinDBMock,

  deleteCommunityMock,

  createCommunityChannelDBMock

} from './mockDb';



// Lazy supabaseAdmin client proxy
const supabaseAdmin = new Proxy({}, {
  get(target, prop) {
    const client = createAdminClient();
    const value = Reflect.get(client, prop);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
}) as any;

// ── GOD MODE: Supabase connection caching & quick-race check ─────────────────

let isSupabaseOfflineCache: boolean | null = null;

let lastCheckTime = 0;

function isUuid(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

async function checkSupabaseOnline(): Promise<boolean> {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}





export async function getCommunities(userId?: string): Promise<{ success: boolean; communities?: any[]; error?: string }> {

  if (!await checkSupabaseOnline()) {

    return await getCommunitiesMock(userId || 'shinichiro-user-id');

  }

  try {

        if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();

        const actualUserId = user?.id || userId;



        // Fetch all communities and whether the current user is a member

        const { data: communities, error } = await supabaseAdmin

            .from('communities')

            .select(`

                *,

                members:community_members(user_id, role)

            `)

            .order('member_count', { ascending: false });



        if (error) throw error;



        const results = communities.map((c: any) => {

            const member = actualUserId ? c.members.find((m: any) => m.user_id === actualUserId) : null;

            return {

                ...c,

                isJoined: !!member,

                isAdmin: member ? (member.role === 'admin' || member.role === 'owner') : false

            };

        });



        return { success: true, communities: results };

    } catch (err: any) {

        console.warn("getCommunities failed, falling back to mock DB:", err.message);

        if (!supabaseAdmin) {

            return await getCommunitiesMock(userId || 'shinichiro-user-id');

        }

        return { success: false, error: err.message };

    }

}



export async function getCommunityByName(name: string): Promise<{ success: boolean; community?: any; error?: string }> {

  if (!await checkSupabaseOnline()) {

    return await getCommunityByNameMock(name, 'shinichiro-user-id');

  }

  try {

    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

    // Try to get session — but don't fail if unavailable

    let actualUserId: string | null = null;

    try {

      const supabase = await createClient();

      const { data: { user } } = await supabase.auth.getUser();

      actualUserId = user?.id ?? null;

    } catch { /* session unavailable — public read */ }



    const decodedName = decodeURIComponent(name).toLowerCase();

    const { data: community, error } = await supabaseAdmin

      .from('communities')

      .select(`

        *,

        members:community_members(user_id, role)

      `)

      .eq('name', decodedName)

      .maybeSingle();



    if (error) throw error;

    if (!community) return { success: false, error: 'Community not found' };



    const member = actualUserId ? community.members.find((m: any) => m.user_id === actualUserId) : null;

    const result = {

      ...community,

      isJoined: !!member,

      isAdmin: member ? (member.role === 'admin' || member.role === 'owner') : false,

      // Always include full member list so client can do its own admin check

      memberRoles: community.members as { user_id: string; role: string }[]

    };



    return { success: true, community: result };

  } catch (err: any) {

    console.warn("getCommunityByName failed, falling back to mock DB:", err.message);

    if (!supabaseAdmin) {

      return await getCommunityByNameMock(name, 'shinichiro-user-id');

    }

    return { success: false, error: err.message };

  }

}

export async function getCommunityNameById(communityId: string): Promise<{ success: boolean; name?: string; error?: string }> {
  if (!isUuid(communityId) || !await checkSupabaseOnline()) {
    const db = getDb();
    const comm = db.communities.find(c => c.id === communityId);
    if (comm) return { success: true, name: comm.name };
    return { success: false, error: 'Community not found in mock DB' };
  }

  try {
    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");
    const { data, error } = await supabaseAdmin
      .from('communities')
      .select('name')
      .eq('id', communityId)
      .single();

    if (error) throw error;
    if (!data) return { success: false, error: 'Community not found' };
    return { success: true, name: data.name };
  } catch (err: any) {
    const db = getDb();
    const comm = db.communities.find(c => c.id === communityId);
    if (comm) return { success: true, name: comm.name };
    return { success: false, error: err.message };
  }
}





export async function createCommunity(formData: { name: string; displayName: string; description: string; isPrivate: boolean; userId: string }): Promise<{ success: boolean; community?: any; error?: string }> {

  if (!await checkSupabaseOnline()) {

    return await createCommunityMock(formData);

  }

  try {

    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    const actualUserId = user.id;

    // Fetch follower count to enforce 250 follower limit
    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('follower_count')
      .eq('id', actualUserId)
      .maybeSingle();

    if (dbUser && (dbUser.follower_count || 0) < 250) {
      return { success: false, error: 'You need at least 250 followers to create a community.' };
    }

    if (await isUserRestricted(actualUserId, 'group_creation')) {
      return { success: false, error: 'You are restricted from creating communities due to spamming.' };
    }

    const spamResult = await recordActivityAndCheckSpam(actualUserId, 'create_community');
    if (spamResult.blocked) {
      if (spamResult.warning) {
        return { success: false, error: `Warning: ${spamResult.warning}` };
      }
      return { success: false, error: 'You are restricted from creating communities due to spamming.' };
    }



    const { name, displayName, description, isPrivate } = formData;



    if (!name || !displayName || !description) {

      return { success: false, error: 'All fields are required.' };

    }



    const cleanedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');



    const { data: community, error } = await supabaseAdmin

      .from('communities')

      .insert({

        name: cleanedName,

        display_name: displayName,

        description,

        is_private: isPrivate,

        icon_url: getCommunityIconUrl(cleanedName),

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

    await supabaseAdmin.from('community_members').insert({

      community_id: community.id,

      user_id: actualUserId,

      role: 'admin',

    });



    // Create a default 'general' text channel

    await supabaseAdmin.from('community_channels').insert({

      community_id: community.id,

      name: 'general'

    });



    revalidatePath('/communities');

    return { success: true, community };

  } catch (err: any) {

    console.warn("createCommunity failed, falling back to mock DB:", err.message);

    if (!supabaseAdmin) {

      return await createCommunityMock(formData);

    }

    return { success: false, error: err.message };

  }

}



export async function getCommunityChannels(communityId: string): Promise<{ success: boolean; channels?: any[]; error?: string }> {

  if (!isUuid(communityId) || !await checkSupabaseOnline()) {

    return await getCommunityChannelsMock(communityId);

  }

  try {

    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };



    // Check if community is private, if so, check membership

    const { data: community } = await supabaseAdmin

      .from('communities')

      .select('is_private')

      .eq('id', communityId)

      .single();



    if (community?.is_private) {

      const { data: member } = await supabaseAdmin

        .from('community_members')

        .select('role')

        .match({ community_id: communityId, user_id: user.id })

        .maybeSingle();

      if (!member) return { success: false, error: 'Access denied to this private community' };

    }



    const { data: channels, error } = await supabaseAdmin

      .from('community_channels')

      .select('*')

      .eq('community_id', communityId)

      .order('created_at', { ascending: true });



    if (error) throw error;

    return { success: true, channels: channels || [] };

  } catch (err: any) {

    console.warn("getCommunityChannels failed, falling back to mock DB:", err.message);

    if (!supabaseAdmin) {

      return await getCommunityChannelsMock(communityId);

    }

    return { success: false, error: err.message };

  }

}



export async function markCommunityMessagesSeen(
  messageIds: string[],
  userId: string
): Promise<{ success: boolean; viewedBy?: Record<string, string[]> }> {
  if (!messageIds.length || !userId || !supabaseAdmin) return { success: false };
  try {
    // Try atomic RPC first (eliminates race condition)
    const { error: rpcError } = await supabaseAdmin.rpc('mark_messages_seen', {
      p_message_ids: messageIds,
      p_user_id: userId,
    });

    if (rpcError) {
      // RPC function not created yet — use read-modify-write fallback
      const { data: rows } = await supabaseAdmin
        .from('community_messages')
        .select('id, viewed_by')
        .in('id', messageIds);

      await Promise.all(
        (rows || [])
          .filter((r: any) => !(r.viewed_by || []).includes(userId))
          .map((r: any) =>
            supabaseAdmin!
              .from('community_messages')
              .update({ viewed_by: [...(r.viewed_by || []), userId] })
              .eq('id', r.id)
          )
      );
    }

    // Re-fetch authoritative state AFTER write
    const { data: finalRows } = await supabaseAdmin
      .from('community_messages')
      .select('id, viewed_by')
      .in('id', messageIds);

    const viewedBy: Record<string, string[]> = {};
    (finalRows || []).forEach((r: any) => {
      viewedBy[r.id] = r.viewed_by || [];
    });

    return { success: true, viewedBy };
  } catch (err) {
    console.warn('[markCommunityMessagesSeen] failed:', err);
    return { success: false };
  }
}



export async function getCommunityMessages(
  channelId: string,
  before?: string,
  limit: number = 50
): Promise<{ success: boolean; messages?: any[]; error?: string }> {

  if (!isUuid(channelId) || !await checkSupabaseOnline()) {

    return await getCommunityMessagesMock(channelId, before, limit);

  }

  try {

    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");



    // Allow unauthenticated reads for public communities.

    // Auth check for private communities happens below.

    let userId: string | null = null;

    try {

      const supabase = await createClient();

      const { data: { user } } = await supabase.auth.getUser();

      userId = user?.id ?? null;

    } catch { /* session unavailable — allow public read */ }



    // Get community id for access control

    const { data: channel } = await supabaseAdmin

      .from('community_channels')

      .select('community_id')

      .eq('id', channelId)

      .single();



    if (!channel) return { success: false, error: 'Channel not found' };



    // Private community access control

    const { data: community } = await supabaseAdmin

      .from('communities')

      .select('is_private')

      .eq('id', channel.community_id)

      .single();



    if (community?.is_private) {
      if (!userId) {
        return { success: false, error: 'Access denied to this private community' };
      }
      const { data: member } = await supabaseAdmin
        .from('community_members')
        .select('role')
        .match({ community_id: channel.community_id, user_id: userId })
        .maybeSingle();

      if (!member) return { success: false, error: 'Access denied to this private community' };
    }



    // ─── Step 1: Fetch raw messages + reactions ───────────────────────────────

    // NO auth.users join — the "auth.users!sender_id" PostgREST syntax uses a

    // FK constraint name that doesn't exist, causing the whole query to throw.

    // When that throw hits the catch block, ALL messages go to the in-memory

    // mock DB. Mock DB has no Supabase connection so realtime NEVER fires.

    let dbQuery = supabaseAdmin

      .from('community_messages')

      .select(`

        *,

        reactions:community_message_reactions (

          id,

          emoji,

          user_id

        )

      `)

      .eq('channel_id', channelId);

    if (before) {
      dbQuery = dbQuery.lt('sent_at', before);
    }

    const { data: messages, error } = await dbQuery

      .order('sent_at', { ascending: false })

      .limit(limit);



    if (error) throw error;



    // ─── Step 2: Batch-fetch sender profiles from users table ─────────────────

    const senderIds = [...new Set(((messages as any[]) || []).map((m: any) => m.sender_id).filter(Boolean))];

    let usersMap: Record<string, any> = {};

    if (senderIds.length > 0) {

      const { data: profiles } = await supabaseAdmin

        .from('users')

        .select('id, username, display_name, avatar_url')

        .in('id', senderIds);

      if (profiles) {

        (profiles as any[]).forEach((u: any) => { usersMap[u.id] = u; });

      }

    }



    // ─── Step 3: Batch-fetch reply_to messages ─────────────────────────────────

    const replyToIds = [...new Set(((messages as any[]) || []).map((m: any) => m.reply_to_id).filter(Boolean))];

    const replyToMap: Record<string, any> = {};



    if (replyToIds.length > 0) {

      const { data: replyMessages } = await supabaseAdmin

        .from('community_messages')

        .select('id, content, sender_id')

        .in('id', replyToIds);



      if (replyMessages) {

        const replySenderIds = [...new Set((replyMessages as any[]).map((m: any) => m.sender_id).filter(Boolean))];

        const replyUsersMap: Record<string, any> = {};



        if (replySenderIds.length > 0) {

          const { data: replyProfiles } = await supabaseAdmin

            .from('users')

            .select('id, username, display_name')

            .in('id', replySenderIds);

          if (replyProfiles) {

            (replyProfiles as any[]).forEach((u: any) => { replyUsersMap[u.id] = u; });

          }

        }



        (replyMessages as any[]).forEach((m: any) => {

          const senderUser = replyUsersMap[m.sender_id];

          replyToMap[m.id] = {

            id: m.id,

            content: m.content,

            sender_display: senderUser?.display_name || senderUser?.username || "User",

          };

        });

      }

    }



    // ─── Step 4: Merge + reverse to chronological order ──────────────────────

    const parsed = ((messages as any[]) || []).map((m: any) => {
      const isOpened = m.view_once && userId && (m.viewed_by || []).includes(userId);
      return {
        ...m,
        content: isOpened ? "Opened" : m.content,
        media_url: isOpened ? null : m.media_url,
        sender_display: usersMap[m.sender_id]?.display_name || 'User',
        sender: {
          id: m.sender_id,
          display_name: usersMap[m.sender_id]?.display_name || 'User',
          username: usersMap[m.sender_id]?.username || 'user',
          avatar_url: usersMap[m.sender_id]?.avatar_url || null,
        },
        reactions: m.reactions || [],
        reply_to: m.reply_to_id ? replyToMap[m.reply_to_id] : null,
      };
    }).reverse();



    return { success: true, messages: parsed };

  } catch (err: any) {

    console.warn("getCommunityMessages failed, falling back to mock DB:", err.message);

    if (!supabaseAdmin) {

      return await getCommunityMessagesMock(channelId);

    }

    return { success: false, error: err.message };

  }

}



export async function sendCommunityMessage(
  channelId: string,
  senderId: string,
  content: string,
  type: string = 'text',
  mediaUrl?: string,
  senderInfo?: { display_name?: string; username?: string; avatar_url?: string },
  replyToId?: string | null,
  fileName?: string | null,
  mimeType?: string | null,
  mediaGroupId?: string | null,
  viewOnce?: boolean
): Promise<{ success: boolean; data?: any; error?: string }> {

  if (!isUuid(channelId) || !await checkSupabaseOnline()) {

    return await sendCommunityMessageMock(channelId, senderId || 'shinichiro-user-id', content, type, mediaUrl, senderInfo, viewOnce);

  }

  try {

    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    const actualSenderId = user.id;

    if (await isUserRestricted(actualSenderId, 'messages')) {
      return { success: false, error: 'You are restricted from sending messages due to spamming.' };
    }

    const spamResult = await recordActivityAndCheckSpam(actualSenderId, 'send_message', content, channelId);
    if (spamResult.blocked) {
      if (spamResult.warning) {
        return { success: false, error: `Warning: ${spamResult.warning}` };
      }
      return { success: false, error: 'You are restricted from sending messages due to spamming.' };
    }



    // Check membership

    const { data: channel } = await supabaseAdmin

      .from('community_channels')

      .select('community_id')

      .eq('id', channelId)

      .single();



    if (!channel) return { success: false, error: 'Channel not found' };



    const { data: member } = await supabaseAdmin

      .from('community_members')

      .select('role')

      .match({ community_id: channel.community_id, user_id: actualSenderId })

      .maybeSingle();



    if (!member) return { success: false, error: 'You are not a member of this community.' };



    // Use select('*') ONLY — no auth.users join. The "auth.users!sender_id"

    // PostgREST syntax fails because the FK constraint name doesn't match,

    // causing the entire insert+select to throw. That throw sends all messages

    // to the mock DB, where NO Supabase realtime events are ever emitted.

    const insertPayload: any = {
      channel_id: channelId,
      sender_id: actualSenderId,
      content,
      type,
      media_url: mediaUrl || null,
      reply_to_id: replyToId || null,
      file_name: fileName || null,
      mime_type: mimeType || null,
      media_group_id: mediaGroupId || null,
    };

    if (viewOnce) {
      insertPayload.view_once = true;
    }

    const { data, error } = await supabaseAdmin
      .from('community_messages')
      .insert(insertPayload)
      .select('*')
      .single();



    if (error) throw error;



    return { success: true, data };

  } catch (err: any) {

    console.warn("sendCommunityMessage failed, falling back to mock DB:", err.message);

    if (!supabaseAdmin) {

      return await sendCommunityMessageMock(channelId, senderId || 'shinichiro-user-id', content, type, mediaUrl, senderInfo, viewOnce);

    }

    return { success: false, error: err.message };

  }

}



export async function toggleCommunityJoin(communityId: string, userId: string, isJoining: boolean): Promise<{ success: boolean; error?: string }> {

  if (!isUuid(communityId) || !await checkSupabaseOnline()) {

    return await toggleCommunityJoinMock(communityId, userId || 'shinichiro-user-id', isJoining);

  }

  try {

    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    const actualUserId = user.id;



    if (isJoining) {

      if (await isUserRestricted(actualUserId, 'communities')) {
        return { success: false, error: 'You are restricted from joining communities due to spamming.' };
      }

      const spamResult = await recordActivityAndCheckSpam(actualUserId, 'join_community', undefined, communityId);
      if (spamResult.blocked) {
        if (spamResult.warning) {
          return { success: false, error: `Warning: ${spamResult.warning}` };
        }
        return { success: false, error: 'You are restricted from joining communities due to spamming.' };
      }

      const { error } = await supabaseAdmin.from('community_members').insert({

        community_id: communityId,

        user_id: actualUserId,

        role: 'member',

      });

      if (error) return { success: false, error: error.message };

    } else {

      const { error } = await supabaseAdmin.from('community_members')

        .delete()

        .match({ community_id: communityId, user_id: actualUserId });

      if (error) return { success: false, error: error.message };

    }

    revalidatePath('/communities');

    return { success: true };

  } catch(e: any) {

    console.warn("toggleCommunityJoin failed, falling back to mock DB:", e.message);

    if (!supabaseAdmin) {

      return await toggleCommunityJoinMock(communityId, userId || 'shinichiro-user-id', isJoining);

    }

    return { success: false, error: e.message };

  }

}



export async function getCommunityMembers(communityId: string): Promise<{ success: boolean; members?: any[]; error?: string }> {

  if (!isUuid(communityId) || !await checkSupabaseOnline()) {

    return await getCommunityMembersMock(communityId);

  }

  try {

    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

    // Try to get session but don't fail if unavailable

    let userId: string | null = null;

    try {

      const supabase = await createClient();

      const { data: { user } } = await supabase.auth.getUser();

      userId = user?.id ?? null;

    } catch { /* session unavailable */ }



    // For private communities, verify membership only when we have a userId

    const { data: community } = await supabaseAdmin

      .from('communities')

      .select('is_private')

      .eq('id', communityId)

      .single();



    if (community?.is_private) {
      if (!userId) {
        return { success: false, error: 'Access denied to this private community' };
      }
      const { data: member } = await supabaseAdmin
        .from('community_members')
        .select('role')
        .match({ community_id: communityId, user_id: userId })
        .maybeSingle();

      if (!member) return { success: false, error: 'Access denied to this private community' };
    }



    // Use users table join instead of auth.users for reliability

    const { data: members, error } = await supabaseAdmin

      .from('community_members')

      .select(`

        user_id,

        role,

        joined_at,

        user:users!community_members_user_id_fkey(

          id, username, display_name, avatar_url, is_verified, bio, follower_count, following_count

        )

      `)

      .eq('community_id', communityId);



    if (error) {

      // Fallback: fetch without join if FK name is different

      const { data: membersRaw, error: err2 } = await supabaseAdmin

        .from('community_members')

        .select('user_id, role, joined_at')

        .eq('community_id', communityId);

      if (err2) throw err2;

      return { success: true, members: membersRaw || [] };

    }



    const parsed = ((members as any[]) || []).map(m => ({

      ...m,

      display_name: m.user?.display_name || 'User',

      username: m.user?.username || 'user',

      avatar_url: m.user?.avatar_url,

      is_verified: m.user?.is_verified ?? false,

      bio: m.user?.bio || null,

      follower_count: m.user?.follower_count || 0,

      following_count: m.user?.following_count || 0,

    }));



    return { success: true, members: parsed };

  } catch (err: any) {

    console.warn("getCommunityMembers failed, falling back to mock DB:", err.message);

    if (!supabaseAdmin) {

      return await getCommunityMembersMock(communityId);

    }

    return { success: false, error: err.message };

  }

}



export async function deleteCommunityMessageDB(userId: string, messageId: string): Promise<{ success: boolean; error?: string }> {

  if (!isUuid(messageId) || !await checkSupabaseOnline()) {

    return await deleteCommunityMessageDBMock(userId || 'shinichiro-user-id', messageId);

  }

  try {

    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    const actualUserId = user.id;



    // Get message to verify ownership

    const { data: msg } = await supabaseAdmin

      .from('community_messages')

      .select('sender_id, channel_id')

      .eq('id', messageId)

      .single();

    if (!msg) return { success: false, error: 'Message not found' };



    let canDelete = msg.sender_id === actualUserId;

    if (!canDelete) {

      // Check if user is admin/moderator of the community

      const { data: channel } = await supabaseAdmin

        .from('community_channels')

        .select('community_id')

        .eq('id', msg.channel_id)

        .single();

      if (channel) {

        const { data: member } = await supabaseAdmin

          .from('community_members')

          .select('role')

          .match({ community_id: channel.community_id, user_id: actualUserId })

          .maybeSingle();

        if (member && (member.role === 'admin' || member.role === 'moderator')) {

          canDelete = true;

        }

      }

    }



    if (!canDelete) return { success: false, error: 'Unauthorized' };



    const { error } = await supabaseAdmin

      .from('community_messages')

      .delete()

      .eq('id', messageId);



    if (error) throw error;

    return { success: true };

  } catch (err: any) {

    console.warn("deleteCommunityMessageDB failed, falling back to mock DB:", err.message);

    if (!supabaseAdmin) {

      return await deleteCommunityMessageDBMock(userId || 'shinichiro-user-id', messageId);

    }

    return { success: false, error: err.message };

  }

}



export async function editCommunityMessageDB(userId: string, messageId: string, newContent: string): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!isUuid(messageId) || !await checkSupabaseOnline()) {
    return await editCommunityMessageDBMock(userId || 'shinichiro-user-id', messageId, newContent);
  }

  try {
    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    const actualUserId = user.id;

    if (await isUserRestricted(actualUserId, 'messages')) {
      return { success: false, error: 'You are restricted from editing messages due to spamming.' };
    }

    const spamResult = await recordActivityAndCheckSpam(actualUserId, 'send_message', newContent);
    if (spamResult.blocked) {
      return { success: false, error: spamResult.warning || 'You are restricted from editing messages due to spamming.' };
    }

    // Verify ownership
    const { data: msg } = await supabaseAdmin
      .from('community_messages')
      .select('sender_id, channel_id')
      .eq('id', messageId)
      .single();

    if (!msg) return { success: false, error: 'Message not found' };
    if (msg.sender_id !== actualUserId) return { success: false, error: 'Unauthorized to edit this message' };

    const editedAt = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('community_messages')
      .update({ content: newContent, edited_at: editedAt })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (err: any) {
    console.warn("editCommunityMessageDB failed, falling back to mock DB:", err.message);
    if (!supabaseAdmin) {
      return await editCommunityMessageDBMock(userId || 'shinichiro-user-id', messageId, newContent);
    }
    return { success: false, error: err.message };
  }
}



export async function toggleCommunityMessagePinDB(userId: string, messageId: string, currentPinState: boolean): Promise<{ success: boolean; is_pinned?: boolean; error?: string }> {
  if (!isUuid(messageId) || !await checkSupabaseOnline()) {
    return await toggleCommunityMessagePinDBMock(messageId);
  }

  try {
    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");
    const { data, error } = await supabaseAdmin
      .from('community_messages')
      .update({ is_pinned: !currentPinState })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, is_pinned: data.is_pinned };
  } catch (err: any) {
    console.warn("toggleCommunityMessagePinDB failed, falling back to mock DB:", err.message);
    return await toggleCommunityMessagePinDBMock(messageId);
  }
}

export async function reactCommunityMessageDB(userId: string, messageId: string, emoji: string): Promise<{ success: boolean; action?: 'added' | 'removed'; error?: string }> {

  if (!isUuid(messageId) || !await checkSupabaseOnline()) {

    const res = await reactCommunityMessageDBMock(userId || 'shinichiro-user-id', messageId, emoji);

    return {

      success: res.success,

      action: res.action as 'added' | 'removed',

    };

  }

  try {

    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    const actualUserId = user.id;

    if (await isUserRestricted(actualUserId, 'reactions')) {
      return { success: false, error: 'You are restricted from reacting to messages due to spamming.' };
    }

    const spamResult = await recordActivityAndCheckSpam(actualUserId, 'add_reaction', emoji, messageId);
    if (spamResult.blocked) {
      if (spamResult.warning) {
        return { success: false, error: `Warning: ${spamResult.warning}` };
      }
      return { success: false, error: 'You are restricted from reacting to messages due to spamming.' };
    }



    // Check if the exact reaction already exists to toggle it off
    const { data: existingExact } = await supabaseAdmin
      .from('community_message_reactions')
      .select('id')
      .match({ message_id: messageId, user_id: actualUserId, emoji })
      .maybeSingle();

    if (existingExact) {
      // Toggle off
      const { error } = await supabaseAdmin
        .from('community_message_reactions')
        .delete()
        .eq('id', existingExact.id);

      if (error) throw error;
      return { success: true, action: 'removed' };
    } else {
      // Toggle on:
      // 1. Delete any other reactions for this user on this message
      await supabaseAdmin
        .from('community_message_reactions')
        .delete()
        .match({ message_id: messageId, user_id: actualUserId });

      // 2. Insert the new reaction
      const { error } = await supabaseAdmin
        .from('community_message_reactions')
        .insert({
          message_id: messageId,
          user_id: actualUserId,
          emoji
        });

      if (error) throw error;
      return { success: true, action: 'added' };
    }

  } catch (err: any) {

    console.warn("reactCommunityMessageDB failed, falling back to mock DB:", err.message);

    if (!supabaseAdmin) {

      const res = await reactCommunityMessageDBMock(userId || 'shinichiro-user-id', messageId, emoji);

      return {

        success: res.success,

        action: res.action as 'added' | 'removed',

      };

    }

    return { success: false, error: err.message };

  }

}



export async function getPulseSignalsDB(): Promise<{ success: boolean; signals?: any[]; error?: string }> {

  try {

    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };



    // 1. Get top 3 communities by member count

    const { data: topCommunities, error: commError } = await supabaseAdmin

      .from('communities')

      .select('id, name, display_name, member_count')

      .order('member_count', { ascending: false })

      .limit(3);



    if (commError) throw commError;



    const signals: any[] = [];



    // 2. For each top community, get recent message count (last 24h)

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();



    for (const comm of (topCommunities || [])) {

      const channelRes = await supabaseAdmin

        .from('community_channels')

        .select('id')

        .eq('community_id', comm.id)

        .limit(1)

        .maybeSingle();

        

      if (channelRes.data?.id) {

        const { count, error: msgError } = await supabaseAdmin

          .from('community_messages')

          .select('*', { count: 'exact', head: true })

          .eq('channel_id', channelRes.data.id)

          .gte('sent_at', yesterday);

        

        // Add activity signal if there are recent messages

        if (count && count > 0) {

          signals.push({

            id: `msg_${comm.id}`,

            type: 'message',

            text: `new messages in ${comm.display_name}`,

            count: count,

            href: `/community/${comm.name}`,

            color: 'text-emerald-500'

          });

        }

      }

      

      // Add member growth signal

      signals.push({

        id: `mem_${comm.id}`,

        type: 'users',

        text: `members in ${comm.display_name}`,

        count: comm.member_count || 0,

        href: `/community/${comm.name}`,

        color: 'text-blue-500'

      });

    }



    return { success: true, signals: signals.slice(0, 3) };

  } catch (err: any) {

    console.warn("getPulseSignalsDB failed, falling back to mock DB:", err.message);

    try {

      const db = getDb();

      const signals = db.communities.slice(0, 3).flatMap((comm: any) => [

        {

          id: `msg_${comm.id}`,

          type: 'message',

          text: `new messages in ${comm.display_name}`,

          count: 5,

          href: `/community/${comm.name}`,

          color: 'text-emerald-500'

        },

        {

          id: `mem_${comm.id}`,

          type: 'users',

          text: `members in ${comm.display_name}`,

          count: comm.member_count || 1,

          href: `/community/${comm.name}`,

          color: 'text-blue-500'

        }

      ]).slice(0, 3);

      return { success: true, signals };

    } catch {

      return { success: true, signals: [] };

    }

  }

}



export async function searchUsersForMention(query: string): Promise<{ success: boolean; users?: any[]; error?: string }> {

  try {

    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };



    let dbUsers: any[] = [];

    const q = query.trim();



    if (!q) {

      // Fetch people followed by this user

      const { data: outbound } = await supabaseAdmin

        .from('followers')

        .select(`

          following:users!following_id (id, username, display_name, avatar_url, is_verified, role)

        `)

        .eq('follower_id', user.id)

        .limit(10);

      

      if (outbound) {

        dbUsers = outbound.map((o: any) => o.following).filter(Boolean);

      }



      // People who follow this user

      const { data: inbound } = await supabaseAdmin

        .from('followers')

        .select(`

          follower:users!follower_id (id, username, display_name, avatar_url, is_verified, role)

        `)

        .eq('following_id', user.id)

        .limit(10);



      if (inbound) {

        const followers = inbound.map((i: any) => i.follower).filter(Boolean);

        followers.forEach((f: any) => {

          if (!dbUsers.some(u => u.id === f.id)) {

            dbUsers.push(f);

          }

        });

      }

    } else {

      // Search users matching the query

      const { data, error } = await supabaseAdmin

        .from('users')

        .select('id, username, display_name, avatar_url, is_verified, role')

        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)

        .limit(10);

      

      if (error) throw error;

      dbUsers = data || [];

    }



    return { success: true, users: dbUsers };

  } catch (err: any) {

    console.warn("searchUsersForMention failed, falling back to mock DB:", err.message);

    try {

      const db = getDb();

      const q = query.trim().toLowerCase();

      let matchedUsers = db.users;

      if (q) {

        matchedUsers = db.users.filter((u: any) => 

          (u.username && u.username.toLowerCase().includes(q)) || 

          (u.display_name && u.display_name.toLowerCase().includes(q))

        );

      }

      const mapped = matchedUsers.map((u: any) => ({

        id: u.id,

        username: u.username,

        display_name: u.display_name,

        avatar_url: u.avatar_url,

        is_verified: u.is_verified || false,

        role: u.role || 'member'

      }));

      return { success: true, users: mapped };

    } catch {

      return { success: true, users: [] };

    }

  }

}



export async function getAllUsernames(): Promise<{ success: boolean; usernames?: string[]; error?: string }> {

  try {

    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

    const { data, error } = await supabaseAdmin

      .from('users')

      .select('username');

    if (error) throw error;

    return { success: true, usernames: (data || []).map((u: any) => u.username) };

  } catch (err: any) {

    console.warn("getAllUsernames failed, falling back to mock DB:", err.message);

    try {

      const db = getDb();

      return { success: true, usernames: db.users.map((u: any) => u.username) };

    } catch {

      return { success: true, usernames: [] };

    }

  }

}



export async function getUserAvatarsMap(): Promise<{ success: boolean; users?: any[]; error?: string }> {

  try {

    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

    const { data, error } = await supabaseAdmin

      .from('users')

      .select('username, display_name, avatar_url');

    if (error) throw error;

    return { success: true, users: data || [] };

  } catch (err: any) {

    console.warn("getUserAvatarsMap failed, falling back to mock DB:", err.message);

    try {

      const db = getDb();

      return { success: true, users: db.users.map((u: any) => ({ username: u.username, display_name: u.display_name, avatar_url: u.avatar_url })) };

    } catch {

      return { success: true, users: [] };

    }

  }

}



export async function updateCommunitySettings(communityId: string, updates: { displayName: string; description: string }): Promise<{ success: boolean; error?: string }> {

  if (!isUuid(communityId) || !await checkSupabaseOnline()) {

    return await updateCommunitySettingsMock(communityId, updates);

  }

  try {

    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };



    const { data: member, error: checkErr } = await supabaseAdmin

      .from('community_members')

      .select('role')

      .match({ community_id: communityId, user_id: user.id })

      .maybeSingle();



    if (checkErr || !member || (member.role !== 'admin' && member.role !== 'owner')) {

      return { success: false, error: 'Access denied: Administrators only' };

    }



    const { error: updateErr } = await supabaseAdmin

      .from('communities')

      .update({

        display_name: updates.displayName,

        description: updates.description,

      })

      .eq('id', communityId);



    if (updateErr) throw updateErr;



    revalidatePath('/communities');

    return { success: true };

  } catch (err: any) {

    console.warn("updateCommunitySettings failed, falling back to mock DB:", err.message);

    if (!supabaseAdmin) {

      return await updateCommunitySettingsMock(communityId, updates);

    }

    return { success: false, error: err.message };

  }

}



export async function updateMemberRole(communityId: string, targetUserId: string, newRole: 'admin' | 'moderator' | 'member'): Promise<{ success: boolean; error?: string }> {

  if (!isUuid(communityId) || !await checkSupabaseOnline()) {

    return await updateMemberRoleMock(communityId, targetUserId, newRole);

  }

  try {

    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };



    const { data: member, error: checkErr } = await supabaseAdmin

      .from('community_members')

      .select('role')

      .match({ community_id: communityId, user_id: user.id })

      .maybeSingle();



    if (checkErr || !member || (member.role !== 'admin' && member.role !== 'owner')) {

      return { success: false, error: 'Access denied: Administrators only' };

    }



    const { error: updateErr } = await supabaseAdmin

      .from('community_members')

      .update({ role: newRole })

      .match({ community_id: communityId, user_id: targetUserId });



    if (updateErr) throw updateErr;



    revalidatePath('/communities');

    return { success: true };

  } catch (err: any) {

    console.warn("updateMemberRole failed, falling back to mock DB:", err.message);

    if (!supabaseAdmin) {

      return await updateMemberRoleMock(communityId, targetUserId, newRole);

    }

    return { success: false, error: err.message };

  }

}



export async function createCommunityChannelDB(
  communityId: string,
  channelName: string,
  description?: string,
  options?: {
    type?: 'text' | 'voice';
    password?: string;
    maxMembers?: number;
    slowModeCooldown?: number;
    requiresApproval?: boolean;
  }
): Promise<{ success: boolean; channel?: any; error?: string }> {

  if (!isUuid(communityId) || !await checkSupabaseOnline()) {

    return await createCommunityChannelDBMock(communityId, channelName, description);

  }

  try {

    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    if (await isUserRestricted(user.id, 'group_creation')) {
      return { success: false, error: 'You are restricted from creating channels due to spamming.' };
    }

    const spamResult = await recordActivityAndCheckSpam(user.id, 'create_community', channelName);
    if (spamResult.blocked) {
      return { success: false, error: spamResult.warning || 'You are restricted from creating channels due to spamming.' };
    }

    // Check if user is admin/owner

    const { data: member, error: checkErr } = await supabaseAdmin

      .from('community_members')

      .select('role')

      .match({ community_id: communityId, user_id: user.id })

      .maybeSingle();

    if (checkErr || !member || (member.role !== 'admin' && member.role !== 'owner')) {

      return { success: false, error: 'Access denied: Administrators only' };

    }

    const cleanedName = channelName.toLowerCase().replace(/[^a-z0-9-]/g, '');

    const insertPayload: any = {
      community_id: communityId,
      name: cleanedName,
      description: description || null,
      type: options?.type || 'text',
      password: options?.password || null,
      max_members: options?.maxMembers || null,
      slow_mode_cooldown: options?.slowModeCooldown || 0,
      requires_approval: options?.requiresApproval || false,
    };

    const { data: channel, error } = await supabaseAdmin

      .from('community_channels')

      .insert(insertPayload)
      .select()
      .single();

    if (error) throw error;

    return { success: true, channel };

  } catch (err: any) {

    console.warn("createCommunityChannelDB failed, falling back to mock DB:", err.message);

    if (!supabaseAdmin) {

      return await createCommunityChannelDBMock(communityId, channelName);

    }

    return { success: false, error: err.message };

  }

}

export async function updateCommunityChannelDB(
  communityId: string,
  channelId: string,
  updates: {
    name?: string;
    description?: string;
    type?: 'text' | 'voice';
    password?: string | null;
    maxMembers?: number | null;
    slowModeCooldown?: number;
    requiresApproval?: boolean;
  }
): Promise<{ success: boolean; channel?: any; error?: string }> {
  try {
    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Check if user is admin/owner
    const { data: member, error: checkErr } = await supabaseAdmin
      .from('community_members')
      .select('role')
      .match({ community_id: communityId, user_id: user.id })
      .maybeSingle();

    if (checkErr || !member || (member.role !== 'admin' && member.role !== 'owner')) {
      return { success: false, error: 'Access denied: Administrators only' };
    }

    const dbPayload: any = {};
    if (updates.name !== undefined) dbPayload.name = updates.name;
    if (updates.description !== undefined) dbPayload.description = updates.description;
    if (updates.type !== undefined) dbPayload.type = updates.type;
    if (updates.password !== undefined) dbPayload.password = updates.password;
    if (updates.maxMembers !== undefined) dbPayload.max_members = updates.maxMembers;
    if (updates.slowModeCooldown !== undefined) dbPayload.slow_mode_cooldown = updates.slowModeCooldown;
    if (updates.requiresApproval !== undefined) dbPayload.requires_approval = updates.requiresApproval;

    const { data: channel, error } = await supabaseAdmin
      .from('community_channels')
      .update(dbPayload)
      .eq('id', channelId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, channel };
  } catch (err: any) {
    console.error("updateCommunityChannelDB failed:", err.message);
    return { success: false, error: err.message };
  }
}

export async function unlockChannelWithPasswordDB(
  channelId: string,
  passwordEntered: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Fetch the channel's actual password
    const { data: channel, error: chErr } = await supabaseAdmin
      .from('community_channels')
      .select('password')
      .eq('id', channelId)
      .single();

    if (chErr || !channel) throw new Error("Channel not found");
    if (channel.password && channel.password !== passwordEntered) {
      return { success: false, error: "Incorrect passcode entered." };
    }

    // Insert user into community_channel_members to persist unlock!
    const { error: insErr } = await supabaseAdmin
      .from('community_channel_members')
      .insert({
        channel_id: channelId,
        user_id: user.id
      });

    // Ignore duplicate key error (if already a member)
    if (insErr && !insErr.message.includes("duplicate key")) throw insErr;

    return { success: true };
  } catch (err: any) {
    console.error("unlockChannelWithPasswordDB failed:", err.message);
    return { success: false, error: err.message };
  }
}

export async function requestChannelAccessDB(
  channelId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Insert a PENDING approval request
    const { error } = await supabaseAdmin
      .from('community_channel_approvals')
      .insert({
        channel_id: channelId,
        user_id: user.id,
        status: 'PENDING'
      });

    if (error && !error.message.includes("duplicate key")) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("requestChannelAccessDB failed:", err.message);
    return { success: false, error: err.message };
  }
}

export async function getChannelApprovalStatusDB(
  channelId: string
): Promise<{ success: boolean; status?: 'PENDING' | 'APPROVED' | 'DECLINED' | null; isUnlocked?: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // 1. Check if user is already a channel member (unlocked/approved)
    const { data: membership, error: memErr } = await supabaseAdmin
      .from('community_channel_members')
      .select('channel_id')
      .match({ channel_id: channelId, user_id: user.id })
      .maybeSingle();

    if (membership) {
      return { success: true, status: 'APPROVED', isUnlocked: true };
    }

    // 2. Check if user has an approval request
    const { data: approval, error: appErr } = await supabaseAdmin
      .from('community_channel_approvals')
      .select('status')
      .match({ channel_id: channelId, user_id: user.id })
      .maybeSingle();

    return { 
      success: true, 
      status: approval ? (approval.status as any) : null, 
      isUnlocked: false 
    };
  } catch (err: any) {
    console.error("getChannelApprovalStatusDB failed:", err.message);
    return { success: false, error: err.message };
  }
}

export async function approveChannelRequestDB(
  channelId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

    // 1. Update status to APPROVED
    const { error: appErr } = await supabaseAdmin
      .from('community_channel_approvals')
      .update({ status: 'APPROVED' })
      .match({ channel_id: channelId, user_id: userId });

    if (appErr) throw appErr;

    // 2. Add to membership table
    const { error: memErr } = await supabaseAdmin
      .from('community_channel_members')
      .insert({
        channel_id: channelId,
        user_id: userId
      });

    if (memErr && !memErr.message.includes("duplicate key")) throw memErr;
    return { success: true };
  } catch (err: any) {
    console.error("approveChannelRequestDB failed:", err.message);
    return { success: false, error: err.message };
  }
}

export async function declineChannelRequestDB(
  channelId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

    const { error } = await supabaseAdmin
      .from('community_channel_approvals')
      .update({ status: 'DECLINED' })
      .match({ channel_id: channelId, user_id: userId });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("declineChannelRequestDB failed:", err.message);
    return { success: false, error: err.message };
  }
}

export async function getPendingApprovalsDB(
  communityId: string
): Promise<{ success: boolean; approvals?: any[]; error?: string }> {
  try {
    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

    // Query pending approvals for any channel within this community
    const { data, error } = await supabaseAdmin
      .from('community_channel_approvals')
      .select('*, community_channels!inner(name, community_id), users:user_id(username, avatar_url)')
      .eq('status', 'PENDING')
      .eq('community_channels.community_id', communityId);

    if (error) throw error;
    return { success: true, approvals: data };
  } catch (err: any) {
    console.error("getPendingApprovalsDB failed:", err.message);
    return { success: false, error: err.message };
  }
}



export async function deleteCommunityChannelDB(communityId: string, channelId: string): Promise<{ success: boolean; error?: string }> {

  if (!isUuid(communityId) || !isUuid(channelId) || !await checkSupabaseOnline()) {

    return await deleteCommunityChannelDBMock(communityId, channelId);

  }

  try {

    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };



    // Check if user is admin/owner

    const { data: member, error: checkErr } = await supabaseAdmin

      .from('community_members')

      .select('role')

      .match({ community_id: communityId, user_id: user.id })

      .maybeSingle();



    if (checkErr || !member || (member.role !== 'admin' && member.role !== 'owner')) {

      return { success: false, error: 'Access denied: Administrators only' };

    }



    const { error } = await supabaseAdmin

      .from('community_channels')

      .delete()

      .eq('id', channelId);



    if (error) throw error;



    return { success: true };

  } catch (err: any) {

    console.warn("deleteCommunityChannelDB failed, falling back to mock DB:", err.message);

    if (!supabaseAdmin) {

      return await deleteCommunityChannelDBMock(communityId, channelId);

    }

    return { success: false, error: err.message };

  }

}

export async function clearChannelMembersDB(
  channelId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { error } = await supabaseAdmin
      .from('community_channel_members')
      .delete()
      .eq('channel_id', channelId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("clearChannelMembersDB failed:", err.message);
    return { success: false, error: err.message };
  }
}

export async function getUserChannelMembershipsDB(
  communityId: string
): Promise<{ success: boolean; channelIds?: string[]; error?: string }> {
  try {
    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, channelIds: [] };

    const { data, error } = await supabaseAdmin
      .from('community_channel_members')
      .select('channel_id, community_channels!inner(community_id)')
      .eq('user_id', user.id)
      .eq('community_channels.community_id', communityId);

    if (error) throw error;
    return { success: true, channelIds: (data || []).map((r: any) => r.channel_id) };
  } catch (err: any) {
    console.error("getUserChannelMembershipsDB failed:", err.message);
    return { success: false, channelIds: [], error: err.message };
  }
}

export async function deleteCommunity(communityId: string): Promise<{ success: boolean; error?: string }> {
  if (!isUuid(communityId) || !await checkSupabaseOnline()) {
    return await deleteCommunityMock(communityId);
  }
  try {
    if (!supabaseAdmin) throw new Error("Supabase admin client not initialized");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Check if user is owner
    const { data: member, error: checkErr } = await supabaseAdmin
      .from('community_members')
      .select('role')
      .match({ community_id: communityId, user_id: user.id })
      .maybeSingle();

    if (checkErr || !member || member.role !== 'owner') {
      return { success: false, error: 'Access denied: Community Owner only' };
    }

    const { error } = await supabaseAdmin
      .from('communities')
      .delete()
      .eq('id', communityId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.warn("deleteCommunity failed, falling back to mock DB:", err.message);
    if (!supabaseAdmin) {
      return await deleteCommunityMock(communityId);
    }
    return { success: false, error: err.message };
  }
}


