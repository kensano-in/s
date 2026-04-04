'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';

export default function ThemeEngineProvider() {
  const { uiThemeVariant, customThemeManifest, setUIThemeVariant, setCustomThemeManifest } = useAppStore();

  useEffect(() => {
    const root = document.documentElement;
    
    // Reset classes
    root.classList.remove('theme-midnight', 'theme-amoled', 'theme-frost', 'theme-light');
    root.classList.add(`theme-${uiThemeVariant}`);

    // AMOLED Override: Forces true black background values immediately into Tailwind classes
    if (uiThemeVariant === 'amoled') {
      root.style.setProperty('--background', '#000000');
      // Overriding surface lowest to true black
      root.style.setProperty('--surface-lowest', '#000000');
    } else {
      root.style.removeProperty('--background');
      root.style.removeProperty('--surface-lowest');
    }

    // Sovereign "Right to Fail" Injection
    if (customThemeManifest) {
      Object.entries(customThemeManifest).forEach(([key, value]) => {
        // We do absolutely zero validation here. Total unhinged control.
        root.style.setProperty(key.startsWith('--') ? key : `--${key}`, value);
      });
    }

  }, [uiThemeVariant, customThemeManifest]);

  // Obsidian Fallback (Hardware Layer Trigger)
  useEffect(() => {
    let tapCount = 0;
    let tapTimeout: NodeJS.Timeout;
    
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        tapCount++;
        if (tapCount >= 3) {
          // OMNIPOTENT OVERRIDE: Purge custom manifests instantly < 50ms
          const root = document.documentElement;
          root.style.cssText = ''; // Brutal purge
          setUIThemeVariant('midnight');
          setCustomThemeManifest(null);
          tapCount = 0;
        }
        clearTimeout(tapTimeout);
        tapTimeout = setTimeout(() => { tapCount = 0; }, 500); 
      }
    };
    
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [setUIThemeVariant, setCustomThemeManifest]);

  // This is a silent DOM injector, no physical rendering
  return null;
}
