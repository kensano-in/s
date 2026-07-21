import '@/lib/sanitize-env';
import { getCachedServerClient } from './factory';

/**
 * Creates a request-scoped Server Client with cookies.
 */
export async function createClient() {
  return getCachedServerClient('supabase/server.ts', 'createClient');
}
