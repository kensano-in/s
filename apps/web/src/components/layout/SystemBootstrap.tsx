'use client';

/**
 * SystemBootstrap — Axiom 15: Self-Healing Loop
 *
 * Initializes the self-healing loop once at app startup.
 * This is a zero-render client component — it renders null and only
 * runs the side-effect of registering the visibilitychange listener.
 *
 * Must be mounted in the root layout so it runs on all routes.
 */

import { useEffect } from 'react';
import { initSelfHealingLoop } from '@/lib/sync-engine';

export default function SystemBootstrap() {
  useEffect(() => {
    initSelfHealingLoop();
  }, []);

  return null;
}
