import '@/lib/sanitize-env';
import { getSupabaseClient } from './factory';

/**
 * Creates an admin client using the service role key.
 */
export function createAdminClient() {
  return getSupabaseClient('admin', 'supabase/admin.ts', 'createAdminClient');
}
