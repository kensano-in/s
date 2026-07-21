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

import { useEffect, useMemo } from 'react';
import { initSelfHealingLoop } from '@/lib/sync-engine';
import { useAppStore } from '@/lib/store';
import { useIdentitiesStore } from '@/lib/identities-store';
import { createClient } from '@/lib/supabase/client';
import { encryptData } from '@/lib/security/encryption';
import { applyVisualConfigV2 } from '@/lib/personalization';

export default function SystemBootstrap() {
  const currentUser = useAppStore(s => s.currentUser);
  const theme = useAppStore(s => s.theme);
  const _hasHydrated = useAppStore(s => s._hasHydrated);

  const { addIdentity, updateLastActive, setEncryptedSession } = useIdentitiesStore();
  const supabase = useMemo(() => createClient(), []);

  // ── Theme Rehydration Fix ────────────────────────────────────────────────────
  // Zustand's persist middleware restores the raw `theme` value from localStorage
  // but does NOT call `setTheme()` — which is the only place that mutates the DOM.
  // This effect fires once after hydration completes to re-apply data-theme + dark class.
  useEffect(() => {
    if (!_hasHydrated) return;
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, [_hasHydrated, theme]);

  useEffect(() => {
    initSelfHealingLoop();

    // Mission-Critical: Auth Session Watcher
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.user) {
        // 1. Sync basic metadata (ONLY if we have metadata, or if it doesn't exist yet to avoid overwriting real DB profile)
        const currentIdentities = useIdentitiesStore.getState().identities;
        const exists = currentIdentities.some(i => i.id === session.user.id);
        const metaUsername = session.user.user_metadata.username;
        const metaDisplayName = session.user.user_metadata.display_name;

        if (metaUsername || !exists) {
          addIdentity({
            id: session.user.id,
            username: metaUsername || 'user',
            displayName: metaDisplayName || 'User',
            avatarUrl: session.user.user_metadata.avatar_url || null,
          });
        }

        // 2. Encrypt and stash session for auto-switching
        const sessionStr = JSON.stringify(session);
        const encrypted = await encryptData(sessionStr);
        setEncryptedSession(session.user.id, encrypted);
        
        console.log(`[Security] Session stashed for ${session.user.id}`);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, addIdentity, setEncryptedSession]);

  // Sync active status and true profile for current user
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentUser?.id) {
        updateLastActive(currentUser.id);
        
        // Auto-heal missing JWT metadata (e.g., 'User / @user') by synchronizing with the true DB profile
        useIdentitiesStore.getState().updateIdentity(currentUser.id, {
          username: currentUser.username,
          displayName: currentUser.displayName,
          avatarUrl: currentUser.avatar,
        });
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [currentUser?.id, currentUser?.username, currentUser?.displayName, currentUser?.avatar, updateLastActive]);

  // Global High-Fidelity Shell Appearance Synchronizer
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const frameId = requestAnimationFrame(() => {
      const applyAmoled = (active: boolean) => {
        if (active) {
          document.documentElement.classList.add('amoled-mode');
        } else {
          document.documentElement.classList.remove('amoled-mode');
        }
      };

      const applyCompactMode = (active: boolean) => {
        if (active) {
          document.documentElement.classList.add('compact-mode');
        } else {
          document.documentElement.classList.remove('compact-mode');
        }
      };

      const applyMotion = (reduce: boolean) => {
        if (reduce) {
          document.documentElement.classList.add('reduce-motion');
        } else {
          document.documentElement.classList.remove('reduce-motion');
        }
      };

      const applyContrast = (contrast: boolean) => {
        if (contrast) {
          document.documentElement.classList.add('high-contrast');
        } else {
          document.documentElement.classList.remove('high-contrast');
        }
      };

      const applyFontScale = (scale: string) => {
        const html = document.documentElement;
        if (scale === 'small') {
          html.style.fontSize = '14px';
        } else if (scale === 'large') {
          html.style.fontSize = '17px';
        } else if (scale === 'extra_large') {
          html.style.fontSize = '18.5px';
        } else {
          html.style.fontSize = '16px'; // default
        }
      };

      const applyAnimationIntensity = (intensity: string) => {
        const html = document.documentElement;
        let durationMultiplier = '1';
        if (intensity === 'none') {
          durationMultiplier = '0';
          html.classList.add('no-animations');
        } else {
          html.classList.remove('no-animations');
          if (intensity === 'balanced') {
            durationMultiplier = '0.7';
          } else if (intensity === 'minimal') {
            durationMultiplier = '0.4';
          } else {
            durationMultiplier = '1'; // expressive
          }
        }
        html.style.setProperty('--v-animation-duration-multiplier', durationMultiplier);
      };

      const userId = currentUser?.id || 'guest';
      const metadata = currentUser?.metadata || {};

      let v2ConfigStr: string | null = null;
      try {
        v2ConfigStr = localStorage.getItem(`verlyn_personalization_v2_${userId}`);
      } catch (e) {}

      let v2ConfigObj: any = null;
      if (v2ConfigStr) {
        try {
          v2ConfigObj = JSON.parse(v2ConfigStr);
        } catch (e) {}
      }

      if (metadata.personalization_v2) {
        v2ConfigObj = { ...v2ConfigObj, ...metadata.personalization_v2 };
      }

      if (v2ConfigObj) {
        applyVisualConfigV2(v2ConfigObj);
        
        // Sync legacy switches if present so they remain correct in other parts of code
        if (v2ConfigObj.accessibilityHighContrast !== undefined) {
          applyContrast(v2ConfigObj.accessibilityHighContrast);
        }
        if (v2ConfigObj.accessibilityMotionReduce !== undefined) {
          applyMotion(v2ConfigObj.accessibilityMotionReduce);
        }
        if (v2ConfigObj.fontScale !== undefined) {
          applyFontScale(v2ConfigObj.fontScale);
        }
        if (v2ConfigObj.themeId === 'oled-black') {
          applyAmoled(true);
        } else if (v2ConfigObj.themeId) {
          applyAmoled(false);
        }
      } else {
        // Legacy Fallbacks
        // 1. Accent Color
        const savedColor = metadata.accent_color || localStorage.getItem(`verlyn_accent_color_${userId}`);
        if (savedColor) {
          document.documentElement.style.setProperty('--v-accent', savedColor);
        } else {
          document.documentElement.style.setProperty('--v-accent', '#00D1FF'); // Fallback Cyan default
        }

        // 2. Font Scale
        const savedFont = metadata.font_scale || localStorage.getItem(`verlyn_font_scale_${userId}`);
        if (savedFont) {
          applyFontScale(savedFont);
        } else {
          applyFontScale('default');
        }

        // 3. Compact Mode
        const savedCompact = metadata.compact_mode !== undefined ? String(metadata.compact_mode) : localStorage.getItem(`verlyn_compact_mode_${userId}`);
        if (savedCompact) {
          applyCompactMode(savedCompact === 'true');
        } else {
          applyCompactMode(false);
        }

        // 4. Motion Reduction
        const savedMotion = metadata.reduce_motion !== undefined ? String(metadata.reduce_motion) : localStorage.getItem(`verlyn_reduce_motion_${userId}`);
        if (savedMotion) {
          applyMotion(savedMotion === 'true');
        } else {
          applyMotion(false);
        }

        // 5. High Contrast
        const savedContrast = metadata.high_contrast !== undefined ? String(metadata.high_contrast) : localStorage.getItem(`verlyn_high_contrast_${userId}`);
        if (savedContrast) {
          applyContrast(savedContrast === 'true');
        } else {
          applyContrast(false);
        }

        // 6. AMOLED Mode
        const savedAmoled = metadata.amoled !== undefined ? String(metadata.amoled) : localStorage.getItem(`verlyn_amoled_${userId}`);
        if (savedAmoled) {
          applyAmoled(savedAmoled === 'true');
        } else {
          applyAmoled(false);
        }

        // 7. Animation Intensity
        const savedAnim = metadata.animation_intensity || localStorage.getItem(`verlyn_animation_intensity_${userId}`);
        if (savedAnim) {
          applyAnimationIntensity(savedAnim);
        } else {
          applyAnimationIntensity('expressive');
        }
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [currentUser?.id, currentUser?.metadata]);

  return null;
}
