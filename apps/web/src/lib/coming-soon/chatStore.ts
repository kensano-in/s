import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  ChatMessage,
  PresenceStatus,
  SupportTicket,
  MessageStatus,
} from '@/types/chat';

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface ChatStore {
  // Messages per case_id
  messages: Record<string, ChatMessage[]>;
  // Is history fully loaded for a case
  historyLoaded: Record<string, boolean>;
  // Loading state per case
  loadingHistory: Record<string, boolean>;
  // Typing state per case
  agentTyping: Record<string, boolean>;
  // Presence per case (agent online status)
  agentPresence: Record<string, PresenceStatus>;
  // Unread counts per case
  unreadCounts: Record<string, number>;
  // Connection status
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  // Active case
  activeCaseId: string | null;
  // Tickets cache
  tickets: SupportTicket[];

  // ─── Actions ──────────────────────────────────────────────────────────────

  setConnectionStatus: (s: 'connecting' | 'connected' | 'reconnecting' | 'disconnected') => void;
  setActiveCaseId: (id: string | null) => void;

  // Message actions
  addMessage: (msg: ChatMessage) => void;
  prependMessages: (caseId: string, msgs: ChatMessage[]) => void;
  updateMessageStatus: (caseId: string, localId: string, patch: Partial<ChatMessage>) => void;
  replaceLocalMessage: (caseId: string, localId: string, serverMsg: ChatMessage) => void;
  markMessageFailed: (caseId: string, localId: string) => void;
  setMessages: (caseId: string, msgs: ChatMessage[]) => void;

  // History
  setHistoryLoaded: (caseId: string, v: boolean) => void;
  setLoadingHistory: (caseId: string, v: boolean) => void;

  // Presence
  setAgentTyping: (caseId: string, v: boolean) => void;
  setAgentPresence: (caseId: string, v: PresenceStatus) => void;

  // Unread
  incrementUnread: (caseId: string) => void;
  clearUnread: (caseId: string) => void;

  // Tickets
  setTickets: (tickets: SupportTicket[]) => void;
  addTicket: (t: SupportTicket) => void;
  updateTicketStatus: (caseId: string, status: SupportTicket['status']) => void;

  // Seen receipts
  markSeen: (caseId: string) => void;
}

// ─── Deduplication helper ─────────────────────────────────────────────────────

function dedupeMessages(msgs: ChatMessage[]): ChatMessage[] {
  const seen = new Set<string>();
  const out: ChatMessage[] = [];
  for (const m of msgs) {
    const key = m.idempotency_key ?? m.id;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(m);
    }
  }
  return out.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useChatStore = create<ChatStore>()(
  subscribeWithSelector((set, get) => ({
    messages: {},
    historyLoaded: {},
    loadingHistory: {},
    agentTyping: {},
    agentPresence: {},
    unreadCounts: {},
    connectionStatus: 'disconnected',
    activeCaseId: null,
    tickets: [],

    setConnectionStatus: (s) => set({ connectionStatus: s }),
    setActiveCaseId: (id) => set({ activeCaseId: id }),

    // ── Messages ──────────────────────────────────────────────────────────────

    addMessage: (msg) =>
      set((state) => {
        const caseId = msg.case_id;
        const existing = state.messages[caseId] ?? [];
        return {
          messages: {
            ...state.messages,
            [caseId]: dedupeMessages([...existing, msg]),
          },
        };
      }),

    prependMessages: (caseId, msgs) =>
      set((state) => {
        const existing = state.messages[caseId] ?? [];
        return {
          messages: {
            ...state.messages,
            [caseId]: dedupeMessages([...msgs, ...existing]),
          },
        };
      }),

    setMessages: (caseId, msgs) =>
      set((state) => ({
        messages: {
          ...state.messages,
          [caseId]: dedupeMessages(msgs),
        },
      })),

    updateMessageStatus: (caseId, localId, patch) =>
      set((state) => {
        const msgs = state.messages[caseId] ?? [];
        return {
          messages: {
            ...state.messages,
            [caseId]: msgs.map((m) =>
              (m._local_id === localId || m.id === localId) ? { ...m, ...patch } : m
            ),
          },
        };
      }),

    replaceLocalMessage: (caseId, localId, serverMsg) =>
      set((state) => {
        const msgs = state.messages[caseId] ?? [];
        const filtered = msgs.filter((m) => m._local_id !== localId && m.id !== localId);
        return {
          messages: {
            ...state.messages,
            [caseId]: dedupeMessages([...filtered, serverMsg]),
          },
        };
      }),

    markMessageFailed: (caseId, localId) =>
      set((state) => {
        const msgs = state.messages[caseId] ?? [];
        return {
          messages: {
            ...state.messages,
            [caseId]: msgs.map((m) =>
              m._local_id === localId ? { ...m, _status: 'failed' as MessageStatus } : m
            ),
          },
        };
      }),

    // ── History ───────────────────────────────────────────────────────────────

    setHistoryLoaded: (caseId, v) =>
      set((state) => ({ historyLoaded: { ...state.historyLoaded, [caseId]: v } })),

    setLoadingHistory: (caseId, v) =>
      set((state) => ({ loadingHistory: { ...state.loadingHistory, [caseId]: v } })),

    // ── Presence ──────────────────────────────────────────────────────────────

    setAgentTyping: (caseId, v) =>
      set((state) => ({ agentTyping: { ...state.agentTyping, [caseId]: v } })),

    setAgentPresence: (caseId, v) =>
      set((state) => ({ agentPresence: { ...state.agentPresence, [caseId]: v } })),

    // ── Unread ────────────────────────────────────────────────────────────────

    incrementUnread: (caseId) =>
      set((state) => ({
        unreadCounts: {
          ...state.unreadCounts,
          [caseId]: (state.unreadCounts[caseId] ?? 0) + 1,
        },
      })),

    clearUnread: (caseId) =>
      set((state) => ({
        unreadCounts: { ...state.unreadCounts, [caseId]: 0 },
      })),

    // ── Tickets ───────────────────────────────────────────────────────────────

    setTickets: (tickets) => set({ tickets }),

    addTicket: (t) =>
      set((state) => ({
        tickets: [t, ...state.tickets.filter((x) => x.case_id !== t.case_id)],
      })),

    updateTicketStatus: (caseId, status) =>
      set((state) => ({
        tickets: state.tickets.map((t) =>
          t.case_id === caseId ? { ...t, status } : t
        ),
      })),

    // ── Seen Receipts ─────────────────────────────────────────────────────────

    markSeen: (caseId) =>
      set((state) => {
        const msgs = state.messages[caseId] ?? [];
        const now = new Date().toISOString();
        return {
          messages: {
            ...state.messages,
            [caseId]: msgs.map((m) =>
              m.sender === 'agent' && !m.seen_at ? { ...m, seen_at: now } : m
            ),
          },
          unreadCounts: { ...state.unreadCounts, [caseId]: 0 },
        };
      }),
  }))
);
