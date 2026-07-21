/**
 * ─── Verlyn Performance Instrumentation ───────────────────────────────────────
 * Principal Engineer Grade: No guesses. Every metric is timestamped and structured.
 *
 * Usage:
 *   perf.mark('msg_list_render_start');
 *   perf.mark('msg_list_render_end');
 *   perf.measure('msg_list_render', 'msg_list_render_start', 'msg_list_render_end');
 *   perf.report(); // dumps full telemetry to console
 */

export type Severity = 'CRITICAL' | 'HIGH' | 'MED' | 'LOW';

interface PerfEntry {
  name: string;
  start: number;
  end?: number;
  duration?: number;
  meta?: Record<string, any>;
}

interface WSEvent {
  type: 'emit' | 'receive' | 'ack' | 'dropped' | 'duplicate';
  event: string;
  timestamp: number;
  convId?: string;
  messageId?: string;
  roundTripMs?: number;
}

interface ApiEntry {
  endpoint: string;
  method: string;
  start: number;
  end?: number;
  durationMs?: number;
  statusCode?: number;
  payloadBytes?: number;
  responseBytes?: number;
}

class PerfCollector {
  private marks: Map<string, number> = new Map();
  private measures: PerfEntry[] = [];
  private wsEvents: WSEvent[] = [];
  private apiEntries: ApiEntry[] = [];
  private renderCounts: Map<string, number> = new Map();
  private enabled = typeof window !== 'undefined';

  // ── User Timing API Marks ─────────────────────────────────────────────────
  mark(name: string, meta?: Record<string, any>) {
    if (!this.enabled) return;
    const now = performance.now();
    this.marks.set(name, now);
    performance.mark(name);
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[perf:mark] ${name} @ ${now.toFixed(1)}ms`, meta ?? '');
    }
  }

  measure(name: string, startMark: string, endMark?: string, meta?: Record<string, any>) {
    if (!this.enabled) return;
    const start = this.marks.get(startMark);
    if (start === undefined) return;
    const end = endMark ? (this.marks.get(endMark) ?? performance.now()) : performance.now();
    const duration = end - start;
    const entry: PerfEntry = { name, start, end, duration, meta };
    this.measures.push(entry);
    try {
      performance.measure(name, startMark, endMark);
    } catch {}
    if (process.env.NODE_ENV === 'development') {
      const flag = duration > 500 ? '🔴' : duration > 100 ? '🟡' : '🟢';
      console.debug(`[perf:measure] ${flag} ${name}: ${duration.toFixed(1)}ms`, meta ?? '');
    }
    return duration;
  }

  // ── Render Count Tracking ─────────────────────────────────────────────────
  trackRender(componentName: string) {
    const current = this.renderCounts.get(componentName) ?? 0;
    this.renderCounts.set(componentName, current + 1);
  }

  // ── WebSocket Event Tracking ──────────────────────────────────────────────
  wsEmit(event: string, messageId: string, convId?: string) {
    this.wsEvents.push({ type: 'emit', event, messageId, convId, timestamp: Date.now() });
  }

  wsReceive(event: string, messageId: string, convId?: string) {
    this.wsEvents.push({ type: 'receive', event, messageId, convId, timestamp: Date.now() });
    // Check for duplicate
    const dupes = this.wsEvents.filter(e => e.messageId === messageId && e.type === 'receive');
    if (dupes.length > 1) {
      this.wsEvents.push({ type: 'duplicate', event, messageId, convId, timestamp: Date.now() });
      console.warn(`[perf:ws] DUPLICATE message received: ${messageId}`);
    }
  }

  wsAck(event: string, messageId: string, emitTimestamp: number) {
    const roundTripMs = Date.now() - emitTimestamp;
    this.wsEvents.push({ type: 'ack', event, messageId, timestamp: Date.now(), roundTripMs });
    if (roundTripMs > 1000) {
      console.warn(`[perf:ws] SLOW ACK: ${messageId} took ${roundTripMs}ms`);
    }
  }

  wsDropped(event: string, messageId: string) {
    this.wsEvents.push({ type: 'dropped', event, messageId, timestamp: Date.now() });
    console.error(`[perf:ws] DROP detected: ${messageId}`);
  }

  // ── API Timing ────────────────────────────────────────────────────────────
  apiStart(endpoint: string, method = 'POST', payloadBytes?: number): string {
    const id = `${endpoint}_${Date.now()}`;
    this.apiEntries.push({
      endpoint,
      method,
      start: Date.now(),
      payloadBytes,
    });
    return id;
  }

  apiEnd(endpoint: string, statusCode: number, responseBytes?: number) {
    const entry = [...this.apiEntries].reverse().find(e => e.endpoint === endpoint && !e.end);
    if (!entry) return;
    entry.end = Date.now();
    entry.durationMs = entry.end - entry.start;
    entry.statusCode = statusCode;
    entry.responseBytes = responseBytes;
    if (entry.durationMs > 500) {
      console.warn(`[perf:api] SLOW: ${entry.method} ${endpoint} → ${entry.durationMs}ms`);
    }
  }

  // ── Summary Report ────────────────────────────────────────────────────────
  report() {
    const completedMeasures = this.measures.filter(m => m.duration !== undefined);

    // Group by name and compute p50/p95/p99
    const grouped: Map<string, number[]> = new Map();
    for (const m of completedMeasures) {
      const arr = grouped.get(m.name) ?? [];
      arr.push(m.duration!);
      grouped.set(m.name, arr);
    }

    const latencyTable: Record<string, { p50: number; p95: number; p99: number; count: number }> = {};
    for (const [name, durations] of grouped) {
      const sorted = [...durations].sort((a, b) => a - b);
      latencyTable[name] = {
        count: sorted.length,
        p50: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
        p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
        p99: sorted[Math.floor(sorted.length * 0.99)] ?? 0,
      };
    }

    const wsStats = {
      total: this.wsEvents.length,
      emitted: this.wsEvents.filter(e => e.type === 'emit').length,
      received: this.wsEvents.filter(e => e.type === 'receive').length,
      acked: this.wsEvents.filter(e => e.type === 'ack').length,
      dropped: this.wsEvents.filter(e => e.type === 'dropped').length,
      duplicates: this.wsEvents.filter(e => e.type === 'duplicate').length,
      avgRoundTripMs: (() => {
        const acks = this.wsEvents.filter(e => e.type === 'ack' && e.roundTripMs);
        if (!acks.length) return null;
        return acks.reduce((s, e) => s + e.roundTripMs!, 0) / acks.length;
      })(),
    };

    const apiTable = this.apiEntries
      .filter(e => e.durationMs)
      .sort((a, b) => b.durationMs! - a.durationMs!);

    const renderTable = Object.fromEntries(this.renderCounts);

    console.group('[VERLYN PERF REPORT]');
    console.log('── Latency (ms) per operation ──');
    console.table(latencyTable);
    console.log('── API Calls (slowest first) ──');
    console.table(apiTable.map(e => ({
      endpoint: e.endpoint,
      method: e.method,
      durationMs: e.durationMs,
      status: e.statusCode,
      payloadB: e.payloadBytes,
      responseB: e.responseBytes,
    })));
    console.log('── WebSocket Stats ──');
    console.table(wsStats);
    console.log('── Render Counts ──');
    console.table(renderTable);
    console.groupEnd();

    return { latencyTable, apiTable, wsStats, renderTable };
  }

  reset() {
    this.marks.clear();
    this.measures = [];
    this.wsEvents = [];
    this.apiEntries = [];
    this.renderCounts.clear();
  }
}

export const perf = new PerfCollector();

// ── Expose to window for DevTools access ────────────────────────────────────
if (typeof window !== 'undefined') {
  (window as any).__verlynPerf = perf;
}
