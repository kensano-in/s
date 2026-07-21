import '@/lib/sanitize-env';
import { getSupabaseClient } from './factory';

/**
 * Creates or gets the shared realtime client instance.
 */
export function getRealtimeClient() {
  return getSupabaseClient('realtime', 'supabase/realtime-client.ts', 'getRealtimeClient');
}
