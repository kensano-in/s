/**
 * Block Utilities — shared across server and client modules.
 *
 * NO 'use server' directive — importable from both server actions
 * (explore/actions.ts, story-actions.ts) and client-side query files
 * (feed.ts) that use the Supabase JS client directly.
 *
 * Pattern: caller provides their own supabase instance.
 *
 * IMPORTANT: The blocks table RLS allows authenticated users to read rows
 * where they are either blocker_id OR blocked_id (bidirectional).
 * Run 060_block_enforcement.sql in Supabase to ensure this policy is active.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Returns a Set of all user IDs that should be invisible to `userId`.
 * Covers BOTH directions:
 *   - Users that `userId` has blocked
 *   - Users that have blocked `userId`
 *
 * @param supabase  - Any supabase client (anon, server, or admin)
 * @param userId    - The current user's ID
 */
export async function getBlockedAndBlockedByIds(
  supabase: SupabaseClient,
  userId: string | undefined | null
): Promise<Set<string>> {
  if (!userId) return new Set();

  try {
    // Try the RPC first — works with all auth levels and bypasses RLS confusion
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_blocked_ids_for_user', { p_user_id: userId });

    if (!rpcError && Array.isArray(rpcData)) {
      return new Set<string>(rpcData);
    }

    // Fallback: direct table query (requires correct RLS policy from migration 060)
    const { data, error } = await supabase
      .from('blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

    if (error || !data) return new Set();

    const ids = new Set<string>();
    for (const row of data as { blocker_id: string; blocked_id: string }[]) {
      if (row.blocker_id === userId) {
        ids.add(row.blocked_id);
      } else {
        ids.add(row.blocker_id);
      }
    }
    return ids;
  } catch {
    // Fail open — never crash a page because of a block lookup failure
    return new Set();
  }
}

/**
 * Convenience: same as getBlockedAndBlockedByIds but returns array or null.
 * Returns null when the set is empty (no filter needed — skips the DB query).
 */
export async function getBlockedIdsArray(
  supabase: SupabaseClient,
  userId: string | undefined | null
): Promise<string[] | null> {
  const ids = await getBlockedAndBlockedByIds(supabase, userId);
  if (ids.size === 0) return null;
  return Array.from(ids);
}
