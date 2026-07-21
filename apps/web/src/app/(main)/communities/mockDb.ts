import fs from 'fs';
import path from 'path';
import os from 'os';
import { broadcastLocalSync } from '@/lib/syncManager';

const DB_PATH = path.join(os.tmpdir(), 'community_mock_db.json');

export type MockDb = {
  users: any[];
  communities: any[];
  community_members: any[];
  community_channels: any[];
  community_messages: any[];
  community_message_reactions: any[];
};

let cachedDb: MockDb | null = null;
let cachedDbMtime: number = 0;

export function getDb(): MockDb {
  // Check file mtime — if JSON was updated externally, invalidate the in-memory cache
  try {
    const mtime = fs.statSync(DB_PATH).mtimeMs;
    if (cachedDb && mtime === cachedDbMtime) {
      return cachedDb; // Cache is still fresh
    }
    // File changed (or first load) — fall through to read from disk
    cachedDb = null;
    cachedDbMtime = mtime;
  } catch {
    // File doesn't exist yet — fall through to create it
  }
  if (!fs.existsSync(DB_PATH)) {
    const initial: MockDb = {
      users: [
        { id: 'shinichiro-user-id', username: 'shinichiro', display_name: 'Shinichiro', avatar_url: '', follower_count: 280 },
        { id: 'sato-user-id', username: 'sato', display_name: 'Sato', avatar_url: '', follower_count: 150 },
        { id: 'aoi-user-id', username: 'aoi', display_name: 'Aoi', avatar_url: '', follower_count: 50 },
        { id: 'lumine-user-id', username: 'lumine', display_name: 'Lumine', avatar_url: '', follower_count: 10 },
        { id: 'kazu-user-id', username: 'kazu', display_name: 'Kazu', avatar_url: '', follower_count: 5 }
      ],
      communities: [
        {
          id: 'verlyn-community-id',
          name: 'verlyn',
          display_name: 'Verlyn',
          description: 'Zero-Knowledge Social Economy',
          icon_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60',
          member_count: 5,
          boost_level: 0
        }
      ],
      community_members: [
        { community_id: 'verlyn-community-id', user_id: 'shinichiro-user-id', role: 'owner' },
        { community_id: 'verlyn-community-id', user_id: 'sato-user-id', role: 'moderator' },
        { community_id: 'verlyn-community-id', user_id: 'aoi-user-id', role: 'moderator' },
        { community_id: 'verlyn-community-id', user_id: 'lumine-user-id', role: 'member' },
        { community_id: 'verlyn-community-id', user_id: 'kazu-user-id', role: 'member' }
      ],
      community_channels: [
        { id: 'general-channel-id', community_id: 'verlyn-community-id', name: 'general' }
      ],
      community_messages: [],
      community_message_reactions: []
    };
    saveDb(initial);
    return initial;
  }

  let attempts = 0;
  while (attempts < 5) {
    try {
      const content = fs.readFileSync(DB_PATH, 'utf8');
      const parsed = JSON.parse(content);
      // Validate schema minimally to verify it is not corrupted/empty
      if (parsed && Array.isArray(parsed.communities) && Array.isArray(parsed.community_channels)) {
        cachedDb = parsed;
        return parsed;
      }
      throw new Error('Invalid schema read from DB file');
    } catch (err) {
      attempts++;
      if (attempts >= 5) {
        console.error('Failed to read DB after 5 attempts:', err);
        break;
      }
      // Sync sleep for 10ms
      const start = Date.now();
      while (Date.now() - start < 10) {}
    }
  }

  // Fallback to memory cache if reading fails (avoids wiping out the database)
  if (cachedDb) {
    console.warn('Using cached in-memory DB fallback due to file read failure.');
    return cachedDb;
  }

  return {
    users: [],
    communities: [],
    community_members: [],
    community_channels: [],
    community_messages: [],
    community_message_reactions: []
  };
}

export function saveDb(db: MockDb) {
  cachedDb = db;
  const tmpPath = DB_PATH + '.tmp';
  let success = false;
  let attempts = 0;

  while (!success && attempts < 5) {
    try {
      fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf8');
      fs.renameSync(tmpPath, DB_PATH);
      success = true;
    } catch (err) {
      attempts++;
      if (attempts >= 5) {
        console.error('Failed to save DB after 5 attempts:', err);
        // Fallback: write directly to DB_PATH if rename failed
        try {
          fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
        } catch (innerErr) {
          console.error('Critical: Failed fallback write to DB_PATH:', innerErr);
        }
      } else {
        // Sync sleep for 10ms
        const start = Date.now();
        while (Date.now() - start < 10) {}
      }
    }
  }
}

// ─── Mock Database Actions ────────────────────────────────────────────────────

export async function getCommunitiesMock(userId?: string) {
  const db = getDb();
  const results = db.communities.map(c => {
    const member = userId ? db.community_members.find(m => m.community_id === c.id && m.user_id === userId) : null;
    return {
      ...c,
      isJoined: !!member,
      isAdmin: member ? (member.role === 'admin' || member.role === 'owner') : false
    };
  });
  return { success: true, communities: results };
}

export async function getCommunityByNameMock(name: string, userId?: string) {
  const db = getDb();
  const decodedName = decodeURIComponent(name).toLowerCase();
  const community = db.communities.find(c => c.name === decodedName);
  if (!community) return { success: false, error: 'Community not found' };

  const members = db.community_members.filter(m => m.community_id === community.id);
  const member = userId ? members.find(m => m.user_id === userId) : null;

  const result = {
    ...community,
    isJoined: !!member,
    isAdmin: member ? (member.role === 'admin' || member.role === 'owner') : false,
    memberRoles: members.map(m => ({ user_id: m.user_id, role: m.role }))
  };

  return { success: true, community: result };
}

export async function createCommunityMock(formData: { name: string; displayName: string; description: string; isPrivate: boolean; userId: string }) {
  const db = getDb();
  const user = db.users.find(u => u.id === formData.userId);
  if (user && (user.follower_count || 0) < 250) {
    return { success: false, error: 'You need at least 250 followers to create a community.' };
  }
  const cleanedName = formData.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (db.communities.some(c => c.name === cleanedName)) {
    return { success: false, error: 'Community name already exists.' };
  }

  const newComm = {
    id: Math.random().toString(36).substring(2, 9),
    name: cleanedName,
    display_name: formData.displayName,
    description: formData.description,
    is_private: formData.isPrivate,
    icon_url: `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60`,
    member_count: 1,
    boost_level: 0,
    created_at: new Date().toISOString()
  };

  db.communities.push(newComm);
  db.community_members.push({
    community_id: newComm.id,
    user_id: formData.userId || 'shinichiro-user-id',
    role: 'owner'
  });
  db.community_channels.push({
    id: Math.random().toString(36).substring(2, 9),
    community_id: newComm.id,
    name: 'general'
  });

  saveDb(db);
  return { success: true, community: newComm };
}

export async function getCommunityChannelsMock(communityId: string) {
  const db = getDb();
  const channels = db.community_channels.filter(c => c.community_id === communityId);
  return { success: true, channels };
}

export async function getCommunityMessagesMock(channelId: string, before?: string, limit: number = 50) {
  const db = getDb();
  let messages = db.community_messages.filter(m => m.channel_id === channelId);
  
  if (before) {
    const beforeTime = new Date(before).getTime();
    messages = messages.filter(m => new Date(m.sent_at).getTime() < beforeTime);
  }

  // Sort descending to get the newest messages first
  messages = [...messages].sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
  const sliced = messages.slice(0, limit);
  
  const parsed = sliced.map(m => {
    const user = db.users.find(u => u.id === m.sender_id) || { username: 'user', display_name: 'User', avatar_url: '' };
    const reactions = db.community_message_reactions.filter(r => r.message_id === m.id);
    return {
      ...m,
      sender_display: user.display_name,
      sender: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url
      },
      reactions: reactions.map(r => ({ id: r.id, emoji: r.emoji, user_id: r.user_id }))
    };
  });

  return { success: true, messages: parsed.reverse() };
}

export async function sendCommunityMessageMock(
  channelId: string,
  senderId: string,
  content: string,
  type: string = 'text',
  mediaUrl?: string,
  senderInfo?: { display_name?: string; username?: string; avatar_url?: string },
  viewOnce?: boolean
) {
  const db = getDb();
  let user = db.users.find(u => u.id === senderId);
  if (!user) {
    // Register real user with their actual display_name so it shows correctly
    const newUser = {
      id: senderId,
      username: senderInfo?.username || 'user_' + senderId.slice(0, 6),
      display_name: senderInfo?.display_name || senderInfo?.username || 'User',
      avatar_url: senderInfo?.avatar_url || ''
    };
    db.users.push(newUser);
    user = newUser;
  } else if (senderInfo?.display_name && user.display_name === 'User') {
    // Update placeholder with real info if we now have it
    user.display_name = senderInfo.display_name;
    if (senderInfo.username) user.username = senderInfo.username;
    if (senderInfo.avatar_url) user.avatar_url = senderInfo.avatar_url;
  }

  const newMsg = {
    id: Math.random().toString(36).substring(2, 9),
    channel_id: channelId,
    sender_id: senderId,
    content,
    type,
    media_url: mediaUrl,
    sent_at: new Date().toISOString(),
    view_once: viewOnce || false
  };

  db.community_messages.push(newMsg);
  saveDb(db);

  const senderObj = db.users.find(u => u.id === senderId);

  const parsed = {
    ...newMsg,
    sender_display: senderObj.display_name,
    sender: {
      id: senderObj.id,
      username: senderObj.username,
      display_name: senderObj.display_name,
      avatar_url: senderObj.avatar_url
    }
  };

  // Broadcast new message over SSE
  broadcastLocalSync(channelId, 'message_sent', {
    channelId,
    message: {
      id: parsed.id,
      content: parsed.content,
      sender_id: parsed.sender_id,
      sent_at: parsed.sent_at,
      is_mine: false,
      status: 'sent' as const,
      type: parsed.type,
      media_url: parsed.media_url,
      reactions: [],
      sender: {
        display_name: parsed.sender.display_name,
        username: parsed.sender.username,
        avatar_url: parsed.sender.avatar_url
      }
    }
  });

  return { success: true, data: parsed };
}

export async function toggleCommunityJoinMock(communityId: string, userId: string, isJoining: boolean) {
  const db = getDb();
  if (isJoining) {
    if (!db.community_members.some(m => m.community_id === communityId && m.user_id === userId)) {
      db.community_members.push({
        community_id: communityId,
        user_id: userId,
        role: 'member'
      });
    }
  } else {
    db.community_members = db.community_members.filter(m => !(m.community_id === communityId && m.user_id === userId));
  }

  const comm = db.communities.find(c => c.id === communityId);
  if (comm) {
    comm.member_count = Math.max(0, comm.member_count + (isJoining ? 1 : -1));
  }

  saveDb(db);
  return { success: true };
}

export async function getCommunityMembersMock(communityId: string) {
  const db = getDb();
  const members = db.community_members.filter(m => m.community_id === communityId);
  
  const parsed = members.map(m => {
    const user = db.users.find(u => u.id === m.user_id) || { username: 'user', display_name: 'User', avatar_url: '', bio: '', follower_count: 0, following_count: 0 };
    return {
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at || new Date().toISOString(),
      display_name: user.display_name,
      username: user.username,
      avatar_url: user.avatar_url,
      is_verified: false,
      bio: (user as any).bio || '',
      follower_count: (user as any).follower_count || 0,
      following_count: (user as any).following_count || 0
    };
  });

  return { success: true, members: parsed };
}

export async function deleteCommunityMessageDBMock(userId: string, messageId: string) {
  const db = getDb();
  const msg = db.community_messages.find(m => m.id === messageId);
  if (!msg) return { success: true };

  db.community_messages = db.community_messages.filter(m => m.id !== messageId);
  saveDb(db);

  // Broadcast deletion over SSE
  broadcastLocalSync(msg.channel_id, 'message_deleted', { 
    channelId: msg.channel_id, 
    messageId 
  });

  return { success: true };
}

export async function editCommunityMessageDBMock(userId: string, messageId: string, newContent: string) {
  const db = getDb();
  const msg = db.community_messages.find(m => m.id === messageId);
  if (!msg) return { success: false, error: 'Message not found' };

  msg.content = newContent;
  msg.edited_at = new Date().toISOString();
  saveDb(db);

  // Broadcast edit over SSE
  broadcastLocalSync(msg.channel_id, 'message_edited', { 
    channelId: msg.channel_id, 
    messageId,
    content: newContent,
    editedAt: msg.edited_at
  });

  return { success: true, data: msg };
}

export async function reactCommunityMessageDBMock(userId: string, messageId: string, emoji: string) {
  const db = getDb();
  const msg = db.community_messages.find(m => m.id === messageId);
  if (!msg) return { success: false, error: 'Message not found' };

  const existingExact = db.community_message_reactions.find(r => r.message_id === messageId && r.user_id === userId && r.emoji === emoji);
  let action: 'added' | 'removed';
  if (existingExact) {
    db.community_message_reactions = db.community_message_reactions.filter(r => r.id !== existingExact.id);
    action = 'removed';
  } else {
    // Delete any other reactions for this user on this message
    db.community_message_reactions = db.community_message_reactions.filter(r => !(r.message_id === messageId && r.user_id === userId));
    
    db.community_message_reactions.push({
      id: Math.random().toString(36).substring(2, 9),
      message_id: messageId,
      user_id: userId,
      emoji
    });
    action = 'added';
  }
  saveDb(db);

  // Broadcast reaction toggle over SSE
  broadcastLocalSync(msg.channel_id, 'message_reacted', {
    channelId: msg.channel_id,
    messageId,
    emoji,
    userId
  });

  return { success: true, action };
}

export async function updateCommunitySettingsMock(communityId: string, updates: { displayName: string; description: string }) {
  const db = getDb();
  const comm = db.communities.find(c => c.id === communityId);
  if (comm) {
    comm.display_name = updates.displayName;
    comm.description = updates.description;
    saveDb(db);
  }
  return { success: true };
}

export async function updateMemberRoleMock(communityId: string, targetUserId: string, newRole: string) {
  const db = getDb();
  const member = db.community_members.find(m => m.community_id === communityId && m.user_id === targetUserId);
  if (member) {
    member.role = newRole;
    saveDb(db);
  }
  return { success: true };
}

export async function createCommunityChannelDBMock(communityId: string, channelName: string, description?: string) {
  const db = getDb();
  const cleanedName = channelName.toLowerCase().replace(/[^a-z0-9-]/g, '');
  const newChan = {
    id: Math.random().toString(36).substring(2, 9),
    community_id: communityId,
    name: cleanedName,
    description: description || null
  };
  db.community_channels.push(newChan);
  saveDb(db);
  return { success: true, channel: newChan };
}

export async function deleteCommunityChannelDBMock(communityId: string, channelId: string) {
  const db = getDb();
  db.community_channels = db.community_channels.filter(c => c.id !== channelId);
  db.community_messages = db.community_messages.filter(m => m.channel_id !== channelId);
  saveDb(db);
  return { success: true };
}

export async function toggleCommunityMessagePinDBMock(messageId: string) {
  const db = getDb();
  const msg = db.community_messages.find(m => m.id === messageId);
  if (!msg) return { success: false, error: 'Message not found' };

  msg.is_pinned = !msg.is_pinned;
  saveDb(db);

  // Broadcast pin status over SSE
  broadcastLocalSync(msg.channel_id, 'message_pinned_toggled', { 
    channelId: msg.channel_id, 
    messageId,
    is_pinned: msg.is_pinned
  });

  return { success: true, is_pinned: msg.is_pinned };
}

export async function deleteCommunityMock(communityId: string) {
  const db = getDb();
  db.communities = db.communities.filter(c => c.id !== communityId);
  db.community_members = db.community_members.filter(m => m.community_id !== communityId);
  const deletedChannelIds = new Set(db.community_channels.filter(ch => ch.community_id === communityId).map(ch => ch.id));
  db.community_channels = db.community_channels.filter(ch => ch.community_id !== communityId);
  db.community_messages = db.community_messages.filter(m => !deletedChannelIds.has(m.channel_id));
  saveDb(db);
  return { success: true };
}
