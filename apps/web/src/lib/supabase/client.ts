import '@/lib/sanitize-env';
import { getSupabaseClient } from './factory';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Shared lazy browser client.
 */
export const supabase: ReturnType<typeof createBrowserClient> = new Proxy({}, {
  get(target, prop) {
    const client = getSupabaseClient('browser', 'supabase/client.ts', 'proxy');
    const value = Reflect.get(client, prop);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
}) as any;

export function createClientInstance() { return supabase; }
export { createClientInstance as createClient };
