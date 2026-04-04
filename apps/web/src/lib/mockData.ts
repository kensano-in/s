// Mock data for Verlyn UI prototyping
import type { User, Post, Story, Conversation, Message, Community, Notification, MiniGame } from './types';

// ── Users ────────────────────────────────────────────────────────────
export const CURRENT_USER: User = {
  id: 'u_current',
  username: 'shinichiro',
  displayName: 'Shinichiro',
  avatar: 'https://i.pravatar.cc/150?img=11',
  bio: 'Building things that matter. Founder @verlyn.in · Tech · Design · Philosophy',
  isVerified: true,
  karmaScore: 48_350,
  followerCount: 12_480,
  followingCount: 342,
  isOnline: true,
  theme: 'midnight',
  role: 'PRIME',
  richPresence: 'Writing the Sovereign Architecture',
  trustScore: 99,
  createdAt: '2024-01-01T00:00:00Z',
};

export const MOCK_USERS: User[] = [
  { id: 'u1', username: 'ayla_dev', displayName: 'Ayla Chen', avatar: 'https://i.pravatar.cc/150?img=1', isVerified: true, karmaScore: 18900, followerCount: 5200, followingCount: 201, isOnline: true, role: 'PUBLIC', createdAt: '2024-03-01T00:00:00Z' },
  { id: 'u2', username: 'rohan_writes', displayName: 'Rohan Mehta', avatar: 'https://i.pravatar.cc/150?img=3', isVerified: false, karmaScore: 7200, followerCount: 1800, followingCount: 430, isOnline: false, role: 'PUBLIC', createdAt: '2024-02-10T00:00:00Z' },
  { id: 'u3', username: 'luna_xo', displayName: 'Luna Vasquez', avatar: 'https://i.pravatar.cc/150?img=5', isVerified: true, karmaScore: 33100, followerCount: 22100, followingCount: 150, isOnline: true, role: 'PUBLIC', createdAt: '2023-11-15T00:00:00Z' },
  { id: 'u4', username: 'dev_kris', displayName: 'Kris Andersson', avatar: 'https://i.pravatar.cc/150?img=7', isVerified: false, karmaScore: 4500, followerCount: 920, followingCount: 640, isOnline: false, role: 'PUBLIC', createdAt: '2024-05-01T00:00:00Z' },
  { id: 'u5', username: 'zara.builds', displayName: 'Zara Osei', avatar: 'https://i.pravatar.cc/150?img=9', isVerified: true, karmaScore: 61000, followerCount: 44200, followingCount: 89, isOnline: true, role: 'PUBLIC', createdAt: '2023-08-20T00:00:00Z' },
  { id: 'u6', username: 'marco_ui', displayName: 'Marco Fiore', avatar: 'https://i.pravatar.cc/150?img=13', isVerified: false, karmaScore: 9800, followerCount: 3100, followingCount: 312, isOnline: false, role: 'PUBLIC', createdAt: '2024-01-20T00:00:00Z' },
];

// ── Stories ───────────────────────────────────────────────────────────
export const MOCK_STORIES: Story[] = [
  { id: 's1', author: MOCK_USERS[0], mediaUrl: 'https://picsum.photos/seed/s1/400/700', mediaType: 'image', viewCount: 342, isViewed: false, expiresAt: '2026-04-04T18:00:00Z', createdAt: '2026-04-03T18:00:00Z' },
  { id: 's2', author: MOCK_USERS[2], mediaUrl: 'https://picsum.photos/seed/s2/400/700', mediaType: 'image', viewCount: 1204, isViewed: true, expiresAt: '2026-04-04T12:00:00Z', createdAt: '2026-04-03T12:00:00Z' },
  { id: 's3', author: MOCK_USERS[4], mediaUrl: 'https://picsum.photos/seed/s3/400/700', mediaType: 'image', viewCount: 5810, isViewed: false, expiresAt: '2026-04-04T09:00:00Z', createdAt: '2026-04-03T09:00:00Z' },
  { id: 's4', author: MOCK_USERS[1], mediaUrl: 'https://picsum.photos/seed/s4/400/700', mediaType: 'image', viewCount: 280, isViewed: false, expiresAt: '2026-04-04T15:00:00Z', createdAt: '2026-04-03T15:00:00Z' },
  { id: 's5', author: MOCK_USERS[3], mediaUrl: 'https://picsum.photos/seed/s5/400/700', mediaType: 'image', viewCount: 142, isViewed: true, expiresAt: '2026-04-04T10:00:00Z', createdAt: '2026-04-03T10:00:00Z' },
];

// ── Posts ─────────────────────────────────────────────────────────────
export const MOCK_POSTS: Post[] = [
  {
    id: 'p1', author: MOCK_USERS[4], postType: 'image',
    content: 'Just shipped the new design system for Verlyn. Every pixel intentional, every interaction deliberate. This is what premium feels like. 🎨✨',
    mediaUrls: ['https://picsum.photos/seed/p1/800/500'],
    likeCount: 2418, commentCount: 187, shareCount: 341,
    isLiked: true, isSaved: false, communityId: 'c1', communityName: 'Design Systems', communityIcon: '🎨',
    createdAt: '2026-04-03T16:30:00Z',
  },
  {
    id: 'p2', author: MOCK_USERS[0], postType: 'text',
    content: 'Hot take: The Erlang VM is genuinely the most underrated piece of technology in existence. Building real-time systems for Verlyn has been an absolute joy. The actor model just *makes sense* at scale.\n\nThread on what I learned 👇',
    likeCount: 1893, commentCount: 312, shareCount: 204,
    isLiked: false, isSaved: true,
    createdAt: '2026-04-03T14:00:00Z',
  },
  {
    id: 'p3', author: MOCK_USERS[2], postType: 'image',
    content: 'Golden hour hits different when you\'re building something meaningful. Excited for what\'s coming on Verlyn 🌅',
    mediaUrls: ['https://picsum.photos/seed/p3/800/500', 'https://picsum.photos/seed/p3b/800/500'],
    likeCount: 8201, commentCount: 547, shareCount: 1200,
    isLiked: true, isSaved: true,
    createdAt: '2026-04-03T11:00:00Z',
  },
  {
    id: 'p4', author: MOCK_USERS[1], postType: 'text',
    content: 'Privacy isn\'t a feature, it\'s a fundamental right. End-to-end encryption should be the floor, not the ceiling. Verlyn\'s Signal Protocol implementation is going to set a new standard for what social privacy looks like.',
    likeCount: 4512, commentCount: 289, shareCount: 870,
    isLiked: false, isSaved: false, communityId: 'c2', communityName: 'Privacy & Security', communityIcon: '🔒',
    createdAt: '2026-04-03T09:30:00Z',
  },
  {
    id: 'p5', author: MOCK_USERS[5], postType: 'image',
    content: 'UI component library v2.0 just dropped. 140+ components, full dark mode, motion primitives included. Verlyn design standards, open for all. 🚀',
    mediaUrls: ['https://picsum.photos/seed/p5/800/500'],
    likeCount: 3100, commentCount: 203, shareCount: 560,
    isLiked: false, isSaved: true, communityId: 'c3', communityName: 'Open Source', communityIcon: '💻',
    createdAt: '2026-04-02T22:00:00Z',
  },
];

// ── Conversations ─────────────────────────────────────────────────────
export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'cv1', isGroup: false, participants: [MOCK_USERS[0]],
    lastMessage: { id: 'm_last1', conversationId: 'cv1', senderId: 'u1', content: 'Can you review the latest PR? I pushed the auth flow changes 🙏', messageType: 'text', isRead: false, sentAt: '2026-04-03T17:45:00Z' },
    unreadCount: 3, isPinned: true, isEncrypted: true, updatedAt: '2026-04-03T17:45:00Z',
  },
  {
    id: 'cv2', isGroup: true, groupName: 'Verlyn Core Team', groupIcon: '⚡',
    participants: [MOCK_USERS[0], MOCK_USERS[2], MOCK_USERS[4]],
    lastMessage: { id: 'm_last2', conversationId: 'cv2', senderId: 'u5', content: 'The SFU load tests are looking incredible. Sub-100ms latency at 10k concurrent connections!', messageType: 'text', isRead: true, sentAt: '2026-04-03T16:20:00Z' },
    unreadCount: 0, isPinned: true, updatedAt: '2026-04-03T16:20:00Z',
  },
  {
    id: 'cv3', isGroup: false, participants: [MOCK_USERS[2]],
    lastMessage: { id: 'm_last3', conversationId: 'cv3', senderId: 'u_current', content: 'The brand shoot turned out amazing! Sending the finals now 📸', messageType: 'text', isRead: true, sentAt: '2026-04-03T14:00:00Z' },
    unreadCount: 1, isEncrypted: true, updatedAt: '2026-04-03T14:00:00Z',
  },
  {
    id: 'cv4', isGroup: false, participants: [MOCK_USERS[4]],
    lastMessage: { id: 'm_last4', conversationId: 'cv4', senderId: 'u5', content: 'Let\'s sync on the rec engine design tomorrow. I have some ideas around the two-tower model.', messageType: 'text', isRead: true, sentAt: '2026-04-03T10:15:00Z' },
    unreadCount: 0, updatedAt: '2026-04-03T10:15:00Z',
  },
  {
    id: 'cv5', isGroup: false, participants: [MOCK_USERS[1]],
    lastMessage: { id: 'm_last5', conversationId: 'cv5', senderId: 'u2', content: 'Read your thread on E2EE. Brilliant insights on the web client key derivation problem.', messageType: 'text', isRead: true, sentAt: '2026-04-02T22:30:00Z' },
    unreadCount: 0, updatedAt: '2026-04-02T22:30:00Z',
  },
];

export const MOCK_MESSAGES: Message[] = [
  { id: 'm1', conversationId: 'cv1', senderId: 'u1', content: 'Hey! Hope you\'re doing well 👋', messageType: 'text', isRead: true, isEncrypted: true, sentAt: '2026-04-03T17:30:00Z' },
  { id: 'm2', conversationId: 'cv1', senderId: 'u_current', content: 'All good! Just wrapping up the new feed component 🔥', messageType: 'text', isRead: true, sentAt: '2026-04-03T17:35:00Z' },
  { id: 'm3', conversationId: 'cv1', senderId: 'u1', content: 'Nice! I wanted to ask about the auth flow changes I pushed yesterday.', messageType: 'text', isRead: true, sentAt: '2026-04-03T17:40:00Z' },
  { id: 'm4', conversationId: 'cv1', senderId: 'u1', content: 'Can you review the latest PR? I pushed the auth flow changes 🙏', messageType: 'text', isRead: false, sentAt: '2026-04-03T17:45:00Z' },
];

// ── Communities ───────────────────────────────────────────────────────
export const MOCK_COMMUNITIES: Community[] = [
  { id: 'c1', name: 'design-systems', displayName: 'Design Systems', description: 'The art and science of building scalable, beautiful design systems. UI components, tokens, and more.', iconUrl: '🎨', memberCount: 142_800, isPrivate: false, boostLevel: 3, isJoined: true, tags: ['design', 'ui', 'frontend'], postCount: 48200, category: 'Technology', createdAt: '2023-01-01T00:00:00Z' },
  { id: 'c2', name: 'privacy-security', displayName: 'Privacy & Security', description: 'Digital privacy, cryptography, security research, and pen testing. No skids.', iconUrl: '🔒', memberCount: 89_400, isPrivate: false, boostLevel: 2, isJoined: true, tags: ['security', 'crypto', 'privacy'], karmaRequired: 500, createdAt: '2023-03-15T00:00:00Z' },
  { id: 'c3', name: 'open-source', displayName: 'Open Source', description: 'Celebrating the open-source ecosystem. Projects, contributions, and community spotlights.', iconUrl: '💻', memberCount: 234_100, isPrivate: false, boostLevel: 3, isJoined: false, tags: ['oss', 'github', 'code'], createdAt: '2023-02-01T00:00:00Z' },
  { id: 'c4', name: 'elixir-erlang', displayName: 'Elixir & Erlang', description: 'BEAM VM, Phoenix, Liveview, OTP — the best platform for building real-time systems.', iconUrl: '⚗️', memberCount: 31_200, isPrivate: false, boostLevel: 1, isJoined: true, tags: ['elixir', 'erlang', 'beam'], createdAt: '2023-06-01T00:00:00Z' },
  { id: 'c5', name: 'ai-ml-lab', displayName: 'AI/ML Lab', description: 'Cutting-edge research, papers, and practical ML engineering. From transformers to recommendation systems.', iconUrl: '🤖', memberCount: 187_000, isPrivate: false, boostLevel: 2, isJoined: false, tags: ['ai', 'ml', 'llm'], createdAt: '2023-04-10T00:00:00Z' },
  { id: 'c6', name: 'verlyn-builders', displayName: 'Verlyn Builders', description: 'Official community for Verlyn developers, designers, and power users. Shape the future of Verlyn.', iconUrl: '🚀', memberCount: 14_200, isPrivate: false, boostLevel: 3, isJoined: true, tags: ['verlyn', 'official'], createdAt: '2024-01-01T00:00:00Z' },
];

// ── Notifications ─────────────────────────────────────────────────────
export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'dm', title: 'New message from Ayla Chen', body: 'Can you review the latest PR?', fromUser: MOCK_USERS[0], link: '/messages/cv1', isRead: false, priority: 'high', createdAt: '2026-04-03T17:45:00Z' },
  { id: 'n2', type: 'like', title: 'Zara Osei and 234 others liked your post', body: '"Just shipped the new design system..."', fromUser: MOCK_USERS[4], link: '/feed/p5', isRead: false, priority: 'medium', createdAt: '2026-04-03T16:00:00Z' },
  { id: 'n3', type: 'follow', title: 'Marco Fiore started following you', body: '', fromUser: MOCK_USERS[5], link: '/profile/marco_ui', isRead: false, priority: 'low', createdAt: '2026-04-03T15:00:00Z' },
  { id: 'n4', type: 'mention', title: 'Luna Vasquez mentioned you', body: '...@shinichiro has been absolutely killing the UX game...', fromUser: MOCK_USERS[2], link: '/feed/p3', isRead: true, priority: 'high', createdAt: '2026-04-03T11:30:00Z' },
  { id: 'n5', type: 'award', title: 'Your post received a Gemstone Award 💎', body: 'Community members recognized your excellence.', isRead: true, priority: 'medium', createdAt: '2026-04-03T09:00:00Z' },
  { id: 'n6', type: 'community', title: 'New post in Design Systems', body: 'Kris Andersson posted: "Atomic design isn\'t enough anymore"', fromUser: MOCK_USERS[3], link: '/communities/design-systems', isRead: true, priority: 'low', createdAt: '2026-04-02T22:00:00Z' },
];

// ── Mini Games ─────────────────────────────────────────────────────
export const MOCK_GAMES: MiniGame[] = [
  { id: 'g1', title: 'Pixel Rush', description: 'Fast-paced arcade pixel art adventure. Race against time and community rivals.', thumbnail: '🎮', category: 'arcade', players: 8420, isHot: true },
  { id: 'g2', title: 'Cipher Quest', description: 'Cryptography puzzle game. Crack codes and climb the global leaderboard.', thumbnail: '🔐', category: 'puzzle', players: 3210, isHot: false },
  { id: 'g3', title: 'Verlyn Trivia', description: 'Community-created trivia battles. Test your knowledge across 50+ categories.', thumbnail: '🧠', category: 'trivia', players: 12800, isHot: true, isCommunity: true },
  { id: 'g4', title: 'Stack Wars', description: 'Build tech stacks and defend your architecture against incoming bugs.', thumbnail: '🏗️', category: 'strategy', players: 1900, isHot: false },
  { id: 'g5', title: 'Neon Drift', description: 'Synthwave infinite runner with global ghost racing.', thumbnail: '🏎️', category: 'arcade', players: 6100, isHot: true },
  { id: 'g6', title: 'Word Architect', description: 'Community word-building game. Build vocabulary empires with your friends.', thumbnail: '📝', category: 'community', players: 4300, isCommunity: true },
];
