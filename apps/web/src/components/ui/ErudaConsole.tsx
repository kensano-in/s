'use client';

import React, { useEffect, useState } from 'react';

/**
 * Eruda Mobile Debug Console
 * Dynamic loader for Eruda on-device developer console on mobile devices.
 * Triggered via URL param `?debug=1`, `?eruda=true`, or localStorage key `verlyn_eruda=true`.
 */
export default function ErudaConsole() {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const hasDebugParam = params.get('debug') === '1' || params.get('eruda') === 'true';
    const hasStorageFlag = localStorage.getItem('verlyn_eruda') === 'true';

    if (hasDebugParam) {
      localStorage.setItem('verlyn_eruda', 'true');
    }

    if (hasDebugParam || hasStorageFlag) {
      setIsEnabled(true);

      // Avoid double initialization if script already injected
      if ((window as any).eruda) {
        try {
          (window as any).eruda.init();
        } catch {
          // Already initialized
        }
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/eruda';
      script.async = true;
      script.onload = () => {
        try {
          if ((window as any).eruda) {
            (window as any).eruda.init({
              theme: 'dark',
              defaults: {
                displaySize: 50,
                transparency: 0.9,
                theme: 'Dark',
              },
            });
            console.log('[Eruda] Mobile Debug Console initialized successfully.');
          }
        } catch (err) {
          console.warn('[Eruda] Initialization warning:', err);
        }
      };
      document.body.appendChild(script);
    }
  }, []);

  if (!isEnabled) return null;

  return null;
}
