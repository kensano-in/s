// ─── Message Types ────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'system';
export type MessageSender = 'user' | 'agent';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'seen' | 'failed';

export interface ChatMessage {
  id: string;
  case_id: string;
  sender: MessageSender;
  content: string;
  message_type: MessageType;
  media_url?: string | null;
  media_name?: string | null;
  media_size?: number | null;
  reply_to_id?: string | null;
  reactions: Record<string, string[]>; // emoji -> [sender_ids]
  seen_at?: string | null;
  delivered_at: string;
  idempotency_key?: string | null;
  created_at: string;

  // Client-only fields
  _status?: MessageStatus;
  _local_id?: string; // temp ID before server confirms
  _error?: string;
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

export interface TypingIndicator {
  id: string;
  case_id: string;
  sender: MessageSender;
  is_typing: boolean;
  updated_at: string;
}

// ─── Presence ─────────────────────────────────────────────────────────────────

export type PresenceStatus = 'online' | 'away' | 'offline';

export interface UserPresence {
  id: string;
  case_id: string;
  sender: MessageSender;
  status: PresenceStatus;
  last_seen: string;
}

// ─── Support Ticket ───────────────────────────────────────────────────────────

export interface SupportTicket {
  case_id: string;
  subject: string;
  status: 'Received' | 'In progress' | 'Completed';
  date_filed: string;
  description?: string;
  admin_reply?: string;
  unread_count?: number;
}

// ─── Chat Store State ─────────────────────────────────────────────────────────

export interface ChatState {
  messages: Record<string, ChatMessage[]>; // case_id -> messages
  typingAgents: Record<string, boolean>;   // case_id -> is_typing
  agentPresence: Record<string, PresenceStatus>;
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  unreadCounts: Record<string, number>;
}

// ─── Realtime Event Payloads ─────────────────────────────────────────────────

export interface RealtimeMessagePayload {
  new: ChatMessage;
  old: Partial<ChatMessage>;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
}

export interface RealtimeTypingPayload {
  new: TypingIndicator;
  eventType: 'INSERT' | 'UPDATE';
}

// ─── Media Upload ─────────────────────────────────────────────────────────────

export interface MediaAttachment {
  file: File;
  preview?: string;
  type: MessageType;
  progress?: number;
}

// ─── Message Reaction ─────────────────────────────────────────────────────────

export type Reaction = '👍' | '❤️' | '😂' | '😮' | '😢' | '🙏';
export const REACTIONS: Reaction[] = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
