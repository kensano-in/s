import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initializeSocket = (userId: string) => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      query: { userId },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Verlyn WSS] Connected to real-time chat nodes:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('[Verlyn WSS] Disconnected from nodes. Reconnecting...');
    });
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    console.warn('[Verlyn WSS] WARNING: Socket requested before initialization.');
  }
  return socket;
};
