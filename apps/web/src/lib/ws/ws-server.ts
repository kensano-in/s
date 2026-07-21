/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WS Server — Reliable Messaging Protocol (Node.js / ws)
 *
 * Architecture:
 *   • Pure Node.js HTTP server + 'ws' library WebSocket upgrade.
 *   • Can be run as a standalone process (workers/ dir) or mounted into a
 *     Next.js custom server (server.ts).
 *   • All state is kept in-memory for this skeleton; swap the SessionStore /
 *     MessageStore interfaces for Redis/Postgres adapters in production.
 *
 * Guarantee properties implemented here:
 *   [G1] At-least-once delivery   — server persists before ACK-ing
 *   [G2] Idempotent receipt       — de-dup via message id
 *   [G3] Ordered delivery         — server assigns monotonic seq per convo
 *   [G4] Seen receipt             — two-phase ACK: delivered → seen
 *   [G5] Reconnect replay         — server replays gap [lastSeq+1..head]
 *   [G6] Heartbeat liveness       — drop dead sockets on pong timeout
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createServer, IncomingMessage } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { randomUUID } from 'crypto';
import {
  WireFrame,
  MessageEnvelope,
  WsEvent,
  WsConfig,
  decodeFrame,
  encodeFrame,
  isMessageFrame,
} from './ws-protocol';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Per-connection session state. */
interface Session {
  ws: WebSocket;
  userId: string;
  clientId: string;
  /** Map of convoId → highest seq the client claims to have received. */
  seqMap: Map<string, number>;
  /** Timer ID for pong-timeout watchdog. */
  pongTimer: ReturnType<typeof setTimeout> | null;
  isAlive: boolean;
}

/** Persisted message record (would be a DB row in production). */
interface StoredMessage extends MessageEnvelope {
  tsServer: number;
  seq: number;
  seenBy: Set<string>;
}

// ── In-Memory Stores ──────────────────────────────────────────────────────────
// In production replace these Maps with Redis pipelines or Postgres queries.

/** userId → Session (one session per user for this skeleton). */
const sessions = new Map<string, Session>();

/** convoId → monotonic counter for seq assignment. */
const seqCounters = new Map<string, number>();

/** convoId → ordered StoredMessages (chronological). */
const messageStore = new Map<string, StoredMessage[]>();

/** Idempotency set: message ids we have already processed. */
const processedIds = new Set<string>();

// ── Utilities ─────────────────────────────────────────────────────────────────

function send(ws: WebSocket, frame: WireFrame): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(encodeFrame(frame));
  }
}

function nextSeq(convoId: string): number {
  const n = (seqCounters.get(convoId) ?? 0) + 1;
  seqCounters.set(convoId, n);
  return n;
}

function persist(msg: StoredMessage): void {
  const bucket = messageStore.get(msg.convoId) ?? [];
  bucket.push(msg);
  messageStore.set(msg.convoId, bucket);
}

/**
 * Retrieve all messages for a conversation with seq > afterSeq.
 * O(n) scan — add a sorted index / DB query in production.
 */
function getMissed(convoId: string, afterSeq: number): StoredMessage[] {
  return (messageStore.get(convoId) ?? []).filter(m => m.seq > afterSeq);
}

// ── Event Handlers ────────────────────────────────────────────────────────────

/**
 * [G1, G3] Handle an inbound message from the originating client:
 *   1. Idempotency check
 *   2. Assign seq & tsServer
 *   3. Persist
 *   4. Send 'delivered' back to sender with authoritative seq
 *   5. Fan-out to all online recipients
 */
function handleMessage(session: Session, frame: { type: 'message' } & MessageEnvelope): void {
  // [G2] Idempotency — drop duplicate deliveries
  if (processedIds.has(frame.id)) {
    console.log(`[WS] Duplicate message dropped: ${frame.id}`);
    return;
  }
  processedIds.add(frame.id);

  const seq = nextSeq(frame.convoId);
  const tsServer = Date.now();

  const stored: StoredMessage = {
    ...frame,
    tsServer,
    seq,
    seenBy: new Set(),
  };
  persist(stored);

  // [G1] Deliver ACK back to sender
  send(session.ws, {
    type: WsEvent.Delivered,
    id: frame.id,
    seq,
    tsServer,
  });

  // Fan-out: push to every other session subscribed to convoId.
  // In production, look up conversation_participants from DB/Redis.
  for (const [uid, recipientSession] of sessions) {
    if (uid === session.userId) continue;

    // ── Simple fan-out (no participant list in skeleton) ──────────────────
    // In production: only push if uid ∈ conversation_participants(frame.convoId)
    send(recipientSession.ws, { type: WsEvent.Send, ...stored });
  }
}

/**
 * [G4] Handle recipient ACK:
 *   1. Find the stored message
 *   2. Mark it seenBy the recipient
 *   3. Emit 'seen' back to the original sender
 */
function handleAck(session: Session, frame: { type: 'ack'; id: string; convoId: string }): void {
  const bucket = messageStore.get(frame.convoId) ?? [];
  const stored = bucket.find(m => m.id === frame.id);
  if (!stored) return;

  stored.seenBy.add(session.userId);

  const senderSession = sessions.get(stored.senderId);
  if (senderSession) {
    send(senderSession.ws, {
      type: WsEvent.Seen,
      id: frame.id,
      convoId: frame.convoId,
      seenBy: session.userId,
      tsServer: Date.now(),
    });
  }
}

/**
 * [G5] Handle reconnect sync:
 *   1. Record the client's last known seq for this convo
 *   2. Reply with the authoritative current seq (SyncFrame)
 *   3. Replay any missed messages
 */
function handleSync(
  session: Session,
  frame: { type: 'sync'; convoId: string; lastSeq: number },
): void {
  session.seqMap.set(frame.convoId, frame.lastSeq);

  const authoritative = seqCounters.get(frame.convoId) ?? 0;
  send(session.ws, {
    type: WsEvent.Sync,
    convoId: frame.convoId,
    lastSeq: authoritative,
  });

  const missed = getMissed(frame.convoId, frame.lastSeq);
  if (missed.length > 0) {
    send(session.ws, {
      type: WsEvent.Replay,
      convoId: frame.convoId,
      messages: missed.map(m => ({
        id: m.id,
        clientId: m.clientId,
        convoId: m.convoId,
        senderId: m.senderId,
        tsClient: m.tsClient,
        tsServer: m.tsServer,
        seq: m.seq,
        payload: m.payload,
      })),
    });
  }
}

/**
 * [G6] Handle heartbeat ping — reset liveness flag, reply with pong.
 */
function handlePing(session: Session, frame: { type: 'ping'; ts: number }): void {
  session.isAlive = true;
  send(session.ws, {
    type: WsEvent.Pong,
    ts: frame.ts,
    serverTs: Date.now(),
  });
}

/** Broadcast a typing frame to all other conversation participants. */
function handleTyping(
  session: Session,
  frame: { type: 'typing'; convoId: string; senderId: string; isTyping: boolean },
): void {
  for (const [uid, s] of sessions) {
    if (uid === session.userId) continue;
    send(s.ws, frame);
  }
}

// ── Connection Lifecycle ──────────────────────────────────────────────────────

function attachSession(ws: WebSocket, req: IncomingMessage): void {
  // In production, parse a signed JWT from the upgrade request URL / cookies.
  // For the skeleton we read ?userId=... from the handshake URL.
  const url = new URL(req.url ?? '/', 'http://localhost');
  const userId = url.searchParams.get('userId') ?? randomUUID();
  const clientId = url.searchParams.get('clientId') ?? randomUUID();

  const session: Session = {
    ws,
    userId,
    clientId,
    seqMap: new Map(),
    pongTimer: null,
    isAlive: true,
  };

  // Replace any stale session for this user (e.g. page refresh).
  sessions.set(userId, session);
  console.log(`[WS] Connected: userId=${userId} clientId=${clientId}`);

  // ── Pong-timeout watchdog ─────────────────────────────────────────────────
  // [G6] If we haven't heard from the client in PONG_TIMEOUT_MS, close it.
  function resetPongTimer() {
    if (session.pongTimer) clearTimeout(session.pongTimer);
    session.pongTimer = setTimeout(() => {
      if (!session.isAlive) {
        console.warn(`[WS] Pong timeout — terminating userId=${userId}`);
        ws.terminate();
        return;
      }
      session.isAlive = false;
      resetPongTimer();
    }, WsConfig.PONG_TIMEOUT_MS);
  }
  resetPongTimer();

  ws.on('message', (raw) => {
    const frame = decodeFrame(raw.toString());
    if (!frame) return;

    // Reset liveness on any inbound traffic.
    session.isAlive = true;
    if (session.pongTimer) resetPongTimer();

    switch (frame.type) {
      case WsEvent.Send:
        if (isMessageFrame(frame)) handleMessage(session, frame);
        break;
      case WsEvent.Ack:
        handleAck(session, frame as any);
        break;
      case WsEvent.Sync:
        handleSync(session, frame as any);
        break;
      case WsEvent.Ping:
        handlePing(session, frame as any);
        break;
      case WsEvent.Typing:
        handleTyping(session, frame as any);
        break;
      default:
        console.warn(`[WS] Unknown frame type: ${(frame as any).type}`);
    }
  });

  ws.on('close', () => {
    if (session.pongTimer) clearTimeout(session.pongTimer);
    sessions.delete(userId);
    console.log(`[WS] Disconnected: userId=${userId}`);
  });

  ws.on('error', (err) => {
    console.error(`[WS] Socket error for userId=${userId}:`, err.message);
  });
}

// ── Server Bootstrap ──────────────────────────────────────────────────────────

/**
 * Creates and starts the WebSocket server.
 *
 * @param port - TCP port to listen on (default: 4001).
 * @returns The HTTP server instance (useful for testing / graceful shutdown).
 *
 * @example
 * ```ts
 * import { startWsServer } from './ws-server';
 * const httpServer = startWsServer(4001);
 * ```
 */
export function startWsServer(port = 4001) {
  const httpServer = createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Verlyn WS Server');
  });

  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    attachSession(ws, req);
  });

  wss.on('error', (err) => {
    console.error('[WSS] Server error:', err);
  });

  httpServer.listen(port, () => {
    console.log(`[WSS] Reliable messaging server listening on ws://localhost:${port}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    wss.close(() => {
      httpServer.close();
      console.log('[WSS] Shutdown complete');
    });
  });

  return httpServer;
}

// ── Entrypoint (run directly: `ts-node ws-server.ts`) ────────────────────────
if (require.main === module) {
  startWsServer(Number(process.env.WS_PORT ?? 4001));
}
