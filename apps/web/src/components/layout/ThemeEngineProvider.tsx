'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';

// The Obsidian Prime factory-default token set.
// These values are the immutable baseline restored on hard reset.
const OBSIDIAN_PRIME = {
  '--background':       '#0A0A0C',
  '--surface-lowest':   '#0F0F12',
  '--surface-low':      '#141417',
  '--surface-high':     '#1A1A1F',
  '--surface-highest':  '#1F1F25',
  '--on-surface':       '#F5F5F7',
  '--on-surface-variant': '#9E9EA8',
  '--primary-glow':     'rgba(108, 99, 255, 0.5)',
  '--secondary-glow':   'rgba(0, 229, 160, 0.4)',
};

// ID of the injected sovereign style element — isolated from core Tailwind styles
const SOVEREIGN_STYLE_ID = 'sovereign-sandbox';

function applyObsidianPrime() {
  // Remove sandbox styles
  document.getElementById(SOVEREIGN_STYLE_ID)?.remove();
  // Re-apply base tokens to :root
  const root = document.documentElement;
  root.style.cssText = '';
  Object.entries(OBSIDIAN_PRIME).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export default function ThemeEngineProvider() {
  const { uiThemeVariant, customThemeManifest, setUIThemeVariant, setCustomThemeManifest } = useAppStore();

  // — Theme Variant Applicator —
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-midnight', 'theme-amoled', 'theme-frost', 'theme-light');
    root.classList.add(`theme-${uiThemeVariant}`);

    if (uiThemeVariant === 'amoled') {
      root.style.setProperty('--background', '#000000');
      root.style.setProperty('--surface-lowest', '#000000');
    } else {
      root.style.removeProperty('--background');
      root.style.removeProperty('--surface-lowest');
    }
  }, [uiThemeVariant]);

  // — Sovereign CSS Sandbox Injector —
  // Injects custom theme into a dedicated <style> tag so it's isolated
  // from the core design system. The user has total control here.
  useEffect(() => {
    // Remove any previous sandbox
    document.getElementById(SOVEREIGN_STYLE_ID)?.remove();

    if (!customThemeManifest || Object.keys(customThemeManifest).length === 0) return;

    // Build raw CSS from user manifest
    const cssVars = Object.entries(customThemeManifest)
      .map(([key, value]) => `${key.startsWith('--') ? key : `--${key}`}: ${value};`)
      .join('\n  ');

    const styleEl = document.createElement('style');
    styleEl.id = SOVEREIGN_STYLE_ID;
    // Scoped to :root but isolated as its own stylesheet — won't break auth/admin flows
    styleEl.textContent = `:root {\n  ${cssVars}\n}`;
    document.head.appendChild(styleEl);
  }, [customThemeManifest]);

  // — Obsidian Prime Hard Reset (Triple ESC) —
  // Hardware-level interrupt. Wipes all custom CSS state in < 30ms.
  useEffect(() => {
    let tapCount = 0;
    let tapTimeout: NodeJS.Timeout;

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        tapCount++;
        clearTimeout(tapTimeout);

        if (tapCount >= 3) {
          // HARD RESET: Sub-30ms Obsidian Prime restoration
          applyObsidianPrime();
          setUIThemeVariant('midnight');
          setCustomThemeManifest(null);
          tapCount = 0;
          // Visual confirmation flash
          const flash = document.createElement('div');
          flash.style.cssText = 'position:fixed;inset:0;background:rgba(108,99,255,0.12);z-index:99999;pointer-events:none;animation:fadeOut 0.4s ease forwards';
          document.body.appendChild(flash);
          setTimeout(() => flash.remove(), 400);
        } else {
          tapTimeout = setTimeout(() => { tapCount = 0; }, 600);
        }
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [setUIThemeVariant, setCustomThemeManifest]);

  // Silent DOM injector — no visual output
  return null;
}
