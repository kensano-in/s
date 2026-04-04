export interface IUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isVerified: boolean;
}

export interface IMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}
