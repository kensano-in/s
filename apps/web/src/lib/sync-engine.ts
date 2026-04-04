/**
 * SHINKEN Sync Engine — Local-First Architecture
 * 
 * Core principle: UI state is the Source of Truth.
 * The database is a downstream replica that catches up silently.
 * 
 * Failure strategy: Exponential backoff with up to 5 retries.
 * The user NEVER sees a "Saving..." spinner.
 */

import { createClient } from '@/lib/supabase/client';

// Retry configuration
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 300;

/**
 * Wraps any async operation with exponential backoff.
 * e.g. attempt 1 → 300ms wait, attempt 2 → 600ms, attempt 3 → 1200ms...
 */
async function withExponentialBackoff<T>(
  fn: () => Promise<T>, 
  retries = MAX_RETRIES
): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries - 1) throw err;
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

export interface ProfileSyncPayload {
  displayName?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
}

/**
 * Silently syncs a profile update to Supabase.
 * Called from the Zustand store after an optimistic UI update.
 * Fires and forgets — does NOT block the UI thread.
 */
export async function syncProfileToSupabase(
  userId: string, 
  updates: ProfileSyncPayload
): Promise<void> {
  const supabase = createClient();
  
  const dbPayload: Record<string, unknown> = {};
  if (updates.displayName !== undefined) dbPayload.display_name = updates.displayName;
  if (updates.username !== undefined) dbPayload.username = updates.username.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (updates.bio !== undefined) dbPayload.bio = updates.bio;
  if (updates.avatarUrl !== undefined) dbPayload.avatar_url = updates.avatarUrl;

  if (Object.keys(dbPayload).length === 0) return;

  await withExponentialBackoff(async () => {
    const { error } = await supabase
      .from('users')
      .update(dbPayload)
      .eq('id', userId);
    
    if (error) throw error;
  });
}

/**
 * Dispatch a profile sync without blocking — 
 * errors are logged silently, never surfaced to the user.
 */
export function dispatchProfileSync(userId: string, updates: ProfileSyncPayload): void {
  syncProfileToSupabase(userId, updates).catch((err) => {
    // Silent failure — a future telemetry system can log this
    console.warn('[SyncEngine] Profile sync failed after all retries:', err?.message);
  });
}
