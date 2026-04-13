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
import { useAppStore } from '@/lib/store';
import { useIdentitiesStore } from '@/lib/identities-store';
import { createClient } from '@/lib/supabase/client';
import { encryptData } from '@/lib/security/encryption';

export default function SystemBootstrap() {
  const { currentUser } = useAppStore();
  const { addIdentity, updateLastActive, setEncryptedSession } = useIdentitiesStore();
  const supabase = createClient();

  useEffect(() => {
    initSelfHealingLoop();

    // Mission-Critical: Auth Session Watcher
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        // 1. Sync basic metadata
        addIdentity({
          id: session.user.id,
          username: session.user.user_metadata.username || 'user',
          displayName: session.user.user_metadata.display_name || 'User',
          avatarUrl: session.user.user_metadata.avatar_url || null,
        });

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

  return null;
}
