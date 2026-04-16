// Verlyn Platform — Shared TypeScript Types

export type Theme = 'midnight' | 'amoled' | 'frost' | 'light';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;           // Available post-auth from Supabase session
  avatar: string;
  bio?: string;
  isVerified: boolean;
  isPrivate?: boolean;
  karmaScore: number;
  followerCount: number;
  followingCount: number;
  isOnline?: boolean;
  theme?: Theme;
  role: 'PRIME' | 'PUBLIC';
  richPresence?: string;
  trustScore?: number;
  storyHighlights?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface Post {
  id: string;
  author: User;
  content: string;
  mediaUrls?: string[];
  postType: 'text' | 'image' | 'video' | 'poll';
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  communityId?: string;
  communityName?: string;
  communityIcon?: string;
  createdAt: string;
  isStory?: boolean;
  expiresAt?: string;
}

export interface Comment {
  id: string;
  postId: string;
  author: User;
  content: string;
  likeCount: number;
  createdAt: string;
}

export interface Story {
  id: string;
  author: User;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  viewCount: number;
  isViewed: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'voice' | 'file' | 'system';
  isRead: boolean;
  isEncrypted?: boolean;
  selfDestructAt?: string | null;
  sentAt: string;
  reactions?: { emoji: string; count: number }[];
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  groupName?: string;
  groupIcon?: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned?: boolean;
  isEncrypted?: boolean;
  updatedAt: string;
}

export interface Community {
  id: string;
  name: string;
  displayName: string;
  description: string;
  iconUrl: string;
  bannerUrl?: string;
  memberCount: number;
  isPrivate: boolean;
  boostLevel: 0 | 1 | 2 | 3;
  isJoined?: boolean;
  tags?: string[];
  karmaRequired?: number;
  postCount?: number;
  category?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'dm' | 'community' | 'system' | 'award';
  title: string;
  body: string;
  fromUser?: User;
  link?: string;
  isRead: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  createdAt: string;
}

export interface MiniGame {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  category: 'puzzle' | 'arcade' | 'strategy' | 'trivia' | 'community';
  players?: number;
  isHot?: boolean;
  isCommunity?: boolean;
  url?: string;
}

export interface ContactInfo {
  platform: string;
  label: string;
  value: string;
  url: string;
  icon: string;
}

// Developer Contact
export const VERLYN_CONTACT: ContactInfo[] = [
  { platform: 'Instagram', label: '@shinichiro.2', value: 'shinichiro.2', url: 'https://instagram.com/shinichiro.2', icon: '📸' },
  { platform: 'Telegram', label: '@shinichirofr', value: 'shinichirofr', url: 'https://t.me/shinichirofr', icon: '✈️' },
  { platform: 'X (Twitter)', label: '@Shinichirofr', value: 'Shinichirofr', url: 'https://x.com/Shinichirofr', icon: '🐦' },
  { platform: 'WhatsApp', label: '+1 709 700 7361', value: '+17097007361', url: 'https://wa.me/17097007361', icon: '💬' },
  { platform: 'Email', label: 'support.verlyn@proton.me', value: 'support.verlyn@proton.me', url: 'mailto:support.verlyn@proton.me', icon: '📧' },
];
