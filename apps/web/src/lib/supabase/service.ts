import '@/lib/sanitize-env';
import { getSupabaseClient } from './factory';

/**
 * Creates a service client using the service role key.
 */
export function createServiceClient() {
  return getSupabaseClient('admin', 'supabase/service.ts', 'createServiceClient');
}
