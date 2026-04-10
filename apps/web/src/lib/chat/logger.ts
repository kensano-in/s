/**
 * ─────────────────────────────────────────────────────────────────────────────
 * VERLYN CHAT — FE Instrumentation Logger
 * Phase 0 of the Engineering Contract
 *
 * Responsibilities:
 *  - Emit structured console logs with level + timestamp
 *  - Maintain an in-memory ring buffer (last 200 entries) on window.__vl_log
 *  - Compute per-message E2E latency: T_client_receive - T_send_click
 *  - Expose per-message latency report to console
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'METRIC';

export interface LogEntry {
  ts: number;           // epoch ms
  level: LogLevel;
  event: string;
  payload?: Record<string, unknown>;
}

// ── Ring buffer ───────────────────────────────────────────────────────────────
const RING_SIZE = 200;
const _ring: LogEntry[] = [];

function push(entry: LogEntry) {
  if (_ring.length >= RING_SIZE) _ring.shift();
  _ring.push(entry);

  // Expose on window for QA inspection: window.__vl_log
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__vl_log = _ring;
  }
}

// ── Core emit ────────────────────────────────────────────────────────────────
function emit(level: LogLevel, event: string, payload?: Record<string, unknown>) {
  const ts = Date.now();
  const entry: LogEntry = { ts, level, event, payload };
  push(entry);

  const label = `[VL:${level}] ${new Date(ts).toISOString()} ${event}`;
  if (level === 'ERROR') {
    console.error(label, payload ?? '');
  } else if (level === 'WARN') {
    console.warn(label, payload ?? '');
  } else {
    console.log(label, payload ?? '');
  }
}

// ── Per-message latency tracking ──────────────────────────────────────────────
const _sendClicks = new Map<string, number>(); // tempId → T_send_click

export function recordSendClick(tempId: string): number {
  const t = Date.now();
  _sendClicks.set(tempId, t);
  return t;
}

export function computeE2E(tempId: string, label = ''): number | null {
  const t0 = _sendClicks.get(tempId);
  if (t0 == null) return null;
  const latencyMs = Date.now() - t0;
  emit('METRIC', 'e2e_latency', { tempId, latencyMs, label });
  console.log(
    `%c⏱ E2E Latency [${label || tempId}]: ${latencyMs}ms`,
    'color: #6366f1; font-weight: bold;'
  );
  _sendClicks.delete(tempId);
  return latencyMs;
}

// ── Named log functions ───────────────────────────────────────────────────────

/** FE: User clicked send */
export function logSendClick(payload: { tempId: string; content: string; convId: string }) {
  recordSendClick(payload.tempId);
  emit('INFO', 'onSendClick', payload);
}

/** FE: Optimistic message inserted into state */
export function logOptimisticAdd(payload: { tempId: string; convId: string }) {
  emit('INFO', 'optimisticAdd', payload);
}

/** FE: API request start/end */
export function logApiRequest(phase: 'start' | 'end', payload: { tempId: string; status?: number | string }) {
  emit('INFO', `apiRequest:${phase}`, payload);
}

/** FE: WebSocket channel subscribed */
export function logWsSubscribe(payload: { channel: string; convId: string }) {
  emit('INFO', 'wsSubscribe', payload);
}

/** FE: WebSocket INSERT event received */
export function logWsEventReceived(payload: { messageId: string; convId: string }) {
  const t = Date.now();
  emit('INFO', 'wsEventReceived', { ...payload, receivedAt: t });
}

/** FE: State updated (source: optimistic | realtime | refetch) */
export function logStateUpdate(source: 'optimistic' | 'realtime' | 'refetch', payload: Record<string, unknown>) {
  emit('INFO', `stateUpdate:${source}`, payload);
}

/** FE: Component render cycle */
export function logRenderCycle(component: string, count: number) {
  emit('INFO', 'renderCycle', { component, count });
}

/** FE: Reconciliation — temp replaced by real */
export function logReconcile(payload: { tempId: string; realId: string; method: 'client_temp_id' | 'id_match' }) {
  emit('INFO', 'reconcile', payload);
}

/** FE: WS reconnect detected */
export function logWsReconnect(payload: { channel: string }) {
  emit('WARN', 'wsReconnect', payload);
}

/** Generic error */
export function logError(event: string, error: unknown) {
  emit('ERROR', event, { error: String(error) });
}

/** Dump the full ring buffer to console (for QA) */
export function dumpLog() {
  console.table(_ring.map(e => ({
    time: new Date(e.ts).toISOString(),
    level: e.level,
    event: e.event,
    payload: JSON.stringify(e.payload ?? {}).slice(0, 120)
  })));
}
