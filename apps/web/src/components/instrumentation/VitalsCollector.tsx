"use client";

/**
 * ─── Web Vitals Collector ─────────────────────────────────────────────────────
 * Instruments LCP, CLS, INP, FID, TTFB and logs to console + perf collector.
 * Add <VitalsCollector /> once in root layout.
 */

import { useEffect } from "react";

type Metric = { name: string; value: number; rating: "good" | "needs-improvement" | "poor"; id: string };

const THRESHOLDS: Record<string, [number, number]> = {
  LCP:  [2500, 4000],
  CLS:  [0.1,  0.25],
  INP:  [200,  500],
  FID:  [100,  300],
  TTFB: [800,  1800],
};

function classify(name: string, value: number): Metric["rating"] {
  const [good, poor] = THRESHOLDS[name] ?? [0, Infinity];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

function logMetric(metric: Metric) {
  const icon = metric.rating === "good" ? "🟢" : metric.rating === "needs-improvement" ? "🟡" : "🔴";
  const unit = metric.name === "CLS" ? "" : "ms";
  console.log(
    `[web-vital] ${icon} ${metric.name}: ${metric.value.toFixed(metric.name === "CLS" ? 4 : 0)}${unit} [${metric.rating.toUpperCase()}]`
  );

  // Persist to window for DevTools access
  if (typeof window !== "undefined") {
    (window as any).__verlynVitals = (window as any).__verlynVitals ?? {};
    (window as any).__verlynVitals[metric.name] = {
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      timestamp: Date.now(),
    };
  }
}

export default function VitalsCollector() {
  useEffect(() => {
    // Dynamically import web-vitals to avoid SSR issues
    import("web-vitals").then(({ onLCP, onCLS, onINP, onTTFB }) => {
      const handle = (metric: any) => {
        const rating = classify(metric.name, metric.value);
        logMetric({ name: metric.name, value: metric.value, rating, id: metric.id });
      };
      onLCP(handle);
      onCLS(handle);
      onINP(handle);
      onTTFB(handle);
    }).catch(() => {
      console.warn("[VitalsCollector] web-vitals not installed. Run: npm install web-vitals");
    });
  }, []);

  return null;
}
