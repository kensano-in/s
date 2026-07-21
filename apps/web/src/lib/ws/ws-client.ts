/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WS Client — Reliable Messaging Protocol (browser)
 *
 * Responsibilities:
 *   [C1] Envelope construction     — wraps every outbound payload in the
 *                                    canonical MessageEnvelope
 *   [C2] ACK tracking & retry      — per-message timer with exponential
 *                                    backoff; up to N=3 retries
 *   [C3] Out-of-order buffering     — buffers messages with seq gaps and
 *                                    delivers in order once the gap closes
 *   [C4] Reconnect w/ seq resume   — on reconnect sends a 'sync' frame so
 *                                    the server can replay missed messages
 *   [C5] Heartbeat                 — client-initiated ping every 15 s;
 *                                    declare dead after 30 s without pong
 *   [C6] Idempotency               — tracks delivered ids; ignores re-delivers
 *
 * The class emits typed events via a simple EventEmitter-style registry so
 * the React hook (useWsMessaging.ts) can bind lifecycle listeners without
 * coupling to a specific framework.
 * ═══════════════════════════════════════════════════════════════════════════
 */

function uuidv4(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
import {
  MessageEnvelope,
  WireFrame,
  WsConfig,
  WsEvent,
  WsEventName,
  decodeFrame,
  encodeFrame,
} from './ws-protocol';

// ── Internal types ────────────────────────────────────────────────────────────

interface PendingMessage {
  envelope: { type: 'message' } & MessageEnvelope;
  attempts: number;
  timerId: ReturnType<typeof setTimeout>;
}

type EventMap = {
  delivered: { id: string; seq: number; tsServer: number };
  seen: { id: string; convoId: string; seenBy: string; tsServer: number };
  message: { type: 'message' } & MessageEnvelope;
  replay: { convoId: string; messages: MessageEnvelope[] };
  sync: { convoId: string; lastSeq: number };
  typing: { convoId: string; senderId: string; isTyping: boolean };
  connect: void;
  disconnect: { code: number; reason: string };
  pong: { rtt: number };
};

type Listener<K extends keyof EventMap> = (data: EventMap[K]) => void;

// ── WsClient ──────────────────────────────────────────────────────────────────

export class WsClient {
  private url: string;
  private userId: string;
  /** Stable device identifier — survives page refreshes via localStorage. */
  private clientId: string;

  private ws: WebSocket | null = null;

  /** Map of message id → pending retry state. */
  private pending = new Map<string, PendingMessage>();

  /**
   * Per-conversation in-order delivery buffer.
   * convoId → { nextExpectedSeq, buffer[] }
   */
  private orderBuffer = new Map<
    string,
    { nextExpected: number; buffer: Array<{ type: 'message' } & MessageEnvelope> }
  >();

  /** Last known seq per conversation — sent in the 'sync' frame on reconnect. */
  private lastSeq = new Map<string, number>();

  /** Idempotency guard — message ids we have already surfaced to callers. */
  private deliveredIds = new Set<string>();

  /** Event listener registry. */
  private listeners = new Map<string, Set<Function>>();

  /** Heartbeat timers. */
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongWatchdog: ReturnType<typeof setTimeout> | null = null;
  private lastPingTs = 0;

  /** Reconnect state. */
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(url: string, userId: string) {
    this.url = url;
    this.userId = userId;
    this.clientId = WsClient.getOrCreateClientId();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Open the WebSocket connection. */
  connect(): void {
    this.stopped = false;
    this.openSocket();
  }

  /** Permanently close the connection — no further reconnects. */
  disconnect(): void {
    this.stopped = true;
    this.clearHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close(1000, 'client disconnect');
    this.ws = null;
  }

  /**
   * [C1] Send a user message.
   *
   * @param convoId - Target conversation UUID.
   * @param payload - Application-level data (ChatMessage body etc.).
   * @returns The client-generated message id (UUID v4) for optimistic UI use.
   */
  sendMessage(convoId: string, payload: unknown): string {
    const id = uuidv4();
    const envelope: { type: 'message' } & MessageEnvelope = {
      type: 'message',
      id,
      clientId: this.clientId,
      convoId,
      senderId: this.userId,
      tsClient: Date.now(),
      tsServer: 0,    // filled in by server
      seq: 0,         // filled in by server
      payload,
    };

    this.scheduleSend(envelope, 0);
    return id;
  }

  /** Send a typing indicator frame (fire-and-forget, no retry). */
  sendTyping(convoId: string, isTyping: boolean): void {
    this.rawSend({
      type: WsEvent.Typing,
      convoId,
      senderId: this.userId,
      isTyping,
    });
  }

  /**
   * Register an event listener.
   * Returns an unsubscribe function.
   */
  on<K extends keyof EventMap>(event: K, listener: Listener<K>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener as Function);
    return () => this.off(event, listener);
  }

  off<K extends keyof EventMap>(event: K, listener: Listener<K>): void {
    this.listeners.get(event)?.delete(listener as Function);
  }

  // ── Connection management ──────────────────────────────────────────────────

  private openSocket(): void {
    // Build handshake URL: ?userId=…&clientId=…
    const wsUrl = new URL(this.url);
    wsUrl.searchParams.set('userId', this.userId);
    wsUrl.searchParams.set('clientId', this.clientId);

    const ws = new WebSocket(wsUrl.toString());
    this.ws = ws;

    ws.onopen = () => {
      console.info('[WsClient] Connected');
      this.reconnectAttempt = 0;

      // [C4] Resume: send a 'sync' for every convo we were tracking.
      for (const [convoId, seq] of this.lastSeq) {
        this.rawSend({ type: WsEvent.Sync, convoId, lastSeq: seq });
      }

      // [C5] Start heartbeat.
      this.startHeartbeat();

      // Re-transmit any messages that were pending when we disconnected.
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timerId);
        this.scheduleSend(pending.envelope, pending.attempts);
      }

      this.emit('connect', undefined as any);
    };

    ws.onmessage = (evt) => {
      const frame = decodeFrame(evt.data);
      if (!frame) return;
      this.handleFrame(frame);
    };

    ws.onclose = (evt) => {
      this.clearHeartbeat();
      this.emit('disconnect', { code: evt.code, reason: evt.reason });
      if (!this.stopped) this.scheduleReconnect();
    };

    ws.onerror = (err) => {
      console.error('[WsClient] Socket error', err);
    };
  }

  // ── Frame dispatch ─────────────────────────────────────────────────────────

  private handleFrame(frame: WireFrame): void {
    switch (frame.type) {
      case WsEvent.Delivered:
        this.handleDelivered(frame as any);
        break;
      case WsEvent.Seen:
        this.emit('seen', frame as any);
        break;
      case WsEvent.Send:
        this.handleIncomingMessage(frame as any);
        break;
      case WsEvent.Replay:
        this.handleReplay(frame as any);
        break;
      case WsEvent.Sync:
        this.emit('sync', frame as any);
        break;
      case WsEvent.Typing:
        this.emit('typing', frame as any);
        break;
      case WsEvent.Pong:
        this.handlePong(frame as any);
        break;
    }
  }

  // ── Delivered (sender side) ────────────────────────────────────────────────

  private handleDelivered(frame: { type: 'delivered'; id: string; seq: number; tsServer: number }): void {
    const pending = this.pending.get(frame.id);
    if (pending) {
      clearTimeout(pending.timerId);
      this.pending.delete(frame.id);
    }
    // Track the authoritative seq for this convo so we can resume on reconnect.
    const convoId = pending?.envelope.convoId;
    if (convoId) {
      const current = this.lastSeq.get(convoId) ?? 0;
      if (frame.seq > current) this.lastSeq.set(convoId, frame.seq);
    }
    this.emit('delivered', { id: frame.id, seq: frame.seq, tsServer: frame.tsServer });
  }

  // ── Incoming message (recipient side) ─────────────────────────────────────

  /**
   * [C6] Idempotency guard → [C3] in-order delivery.
   */
  private handleIncomingMessage(frame: { type: 'message' } & MessageEnvelope): void {
    // [C6] De-dup
    if (this.deliveredIds.has(frame.id)) return;
    this.deliveredIds.add(frame.id);

    // Send ACK back to server [G4]
    this.rawSend({ type: WsEvent.Ack, id: frame.id, convoId: frame.convoId });

    // [C3] Update our last known seq for this convo
    const current = this.lastSeq.get(frame.convoId) ?? 0;
    if (frame.seq > current) this.lastSeq.set(frame.convoId, frame.seq);

    this.deliverInOrder(frame);
  }

  /**
   * [C3] Buffer any message that arrives out of order; flush when gap closes.
   *
   * Messages for a conversation are expected to arrive with seq values
   * nextExpected, nextExpected+1, …  If seq > nextExpected we buffer.
   * Once the missing seq arrives the buffer is drained.
   */
  private deliverInOrder(frame: { type: 'message' } & MessageEnvelope): void {
    const { convoId, seq } = frame;

    if (!this.orderBuffer.has(convoId)) {
      this.orderBuffer.set(convoId, { nextExpected: seq, buffer: [] });
    }

    const state = this.orderBuffer.get(convoId)!;

    if (seq === state.nextExpected) {
      // Deliver immediately.
      this.emit('message', frame);
      state.nextExpected = seq + 1;

      // Drain any buffered messages that now follow in order.
      state.buffer.sort((a, b) => a.seq - b.seq);
      while (state.buffer.length > 0 && state.buffer[0].seq === state.nextExpected) {
        const next = state.buffer.shift()!;
        this.emit('message', next);
        state.nextExpected = next.seq + 1;
      }
    } else if (seq > state.nextExpected) {
      // Out-of-order: buffer it.
      state.buffer.push(frame);
    }
    // seq < nextExpected → already delivered (stale re-delivery); drop silently.
  }

  // ── Replay ────────────────────────────────────────────────────────────────

  private handleReplay(frame: { type: 'replay'; convoId: string; messages: MessageEnvelope[] }): void {
    // De-dup against already-delivered ids before surfacing to caller.
    const fresh = frame.messages.filter(m => !this.deliveredIds.has(m.id));
    fresh.forEach(m => this.deliveredIds.add(m.id));

    if (fresh.length > 0) {
      this.emit('replay', { convoId: frame.convoId, messages: fresh });
    }
  }

  // ── [C2] Retry machinery ──────────────────────────────────────────────────

  /**
   * Schedule the first (or a retry) send attempt for an envelope.
   *
   * Timer fires after ACK_TIMEOUT_MS × BACKOFF_FACTOR^attempt.
   * If no 'delivered' event is received in that window, we retry.
   * After MAX_RETRIES, the message is marked as permanently failed.
   */
  private scheduleSend(
    envelope: { type: 'message' } & MessageEnvelope,
    attempt: number,
  ): void {
    // Send immediately on first attempt.
    this.rawSend(envelope);

    const delay =
      WsConfig.ACK_TIMEOUT_MS * Math.pow(WsConfig.BACKOFF_FACTOR, attempt);

    const timerId = setTimeout(() => {
      if (!this.pending.has(envelope.id)) return; // already ACK'd

      const next = attempt + 1;
      if (next >= WsConfig.MAX_RETRIES) {
        // Permanent failure — surface to caller.
        this.pending.delete(envelope.id);
        console.error(`[WsClient] Message permanently failed after ${WsConfig.MAX_RETRIES} retries: ${envelope.id}`);
        return;
      }

      console.warn(`[WsClient] Retry ${next}/${WsConfig.MAX_RETRIES} for message: ${envelope.id}`);
      const updated: PendingMessage = { envelope, attempts: next, timerId: 0 as any };
      this.pending.set(envelope.id, updated);
      this.scheduleSend(envelope, next);
    }, delay);

    const entry: PendingMessage = { envelope, attempts: attempt, timerId };
    this.pending.set(envelope.id, entry);
  }

  // ── [C5] Heartbeat ────────────────────────────────────────────────────────

  private startHeartbeat(): void {
    this.clearHeartbeat();

    this.pingTimer = setInterval(() => {
      this.lastPingTs = Date.now();
      this.rawSend({ type: WsEvent.Ping, ts: this.lastPingTs });

      // Arm the pong watchdog.
      this.pongWatchdog = setTimeout(() => {
        console.warn('[WsClient] Pong timeout — reconnecting');
        this.ws?.close(4000, 'pong timeout');
      }, WsConfig.PONG_TIMEOUT_MS - WsConfig.PING_INTERVAL_MS);
    }, WsConfig.PING_INTERVAL_MS);
  }

  private handlePong(frame: { type: 'pong'; ts: number; serverTs: number }): void {
    if (this.pongWatchdog) {
      clearTimeout(this.pongWatchdog);
      this.pongWatchdog = null;
    }
    const rtt = Date.now() - frame.ts;
    this.emit('pong', { rtt });
  }

  private clearHeartbeat(): void {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
    if (this.pongWatchdog) { clearTimeout(this.pongWatchdog); this.pongWatchdog = null; }
  }

  // ── [C4] Reconnect ────────────────────────────────────────────────────────

  private scheduleReconnect(): void {
    if (this.stopped) return;
    const delay = Math.min(
      WsConfig.RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempt),
      WsConfig.RECONNECT_MAX_MS,
    );
    this.reconnectAttempt++;
    console.info(`[WsClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`);
    this.reconnectTimer = setTimeout(() => this.openSocket(), delay);
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private rawSend(frame: WireFrame): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(encodeFrame(frame));
    }
  }

  private emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.listeners.get(event)?.forEach(fn => {
      try { fn(data); } catch (e) { console.error(`[WsClient] Listener error on "${event}":`, e); }
    });
  }

  // ── Static helpers ────────────────────────────────────────────────────────

  /** Returns a stable client id from localStorage, creating one if absent. */
  private static getOrCreateClientId(): string {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return uuidv4();
    const key = 'verlyn:clientId';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = uuidv4();
    localStorage.setItem(key, id);
    return id;
  }
}
