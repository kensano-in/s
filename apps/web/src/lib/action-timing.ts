"use client";

/**
 * ─── Server Action Timing Interceptor ─────────────────────────────────────────
 * Wraps every server action in a timing harness.
 * Records per-endpoint p50/p95/p99 in perf.ts collector.
 */

import { perf } from "@/lib/perf";

type ActionFn<T extends any[], R> = (...args: T) => Promise<R>;

export function withTiming<T extends any[], R>(
  name: string,
  fn: ActionFn<T, R>
): ActionFn<T, R> {
  return async (...args: T): Promise<R> => {
    perf.mark(`${name}_start`);
    perf.apiStart(name, "SERVER_ACTION", estimateBytes(args));
    try {
      const result = await fn(...args);
      perf.measure(name, `${name}_start`);
      perf.apiEnd(name, 200, estimateBytes(result));
      return result;
    } catch (err) {
      perf.measure(name, `${name}_start`);
      perf.apiEnd(name, 500);
      throw err;
    }
  };
}

function estimateBytes(value: any): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return 0;
  }
}

// ── Pre-instrumented action wrappers ─────────────────────────────────────────
// Import these in page.tsx instead of the raw actions.


