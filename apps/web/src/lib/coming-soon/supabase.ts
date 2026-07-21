import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/factory';

// Single shared client for all browser operations (wrapped in a Proxy to remain lazy)
export const supabase = new Proxy({}, {
  get(target, prop) {
    const client = getSupabaseClient('browser', 'coming-soon/supabase.ts', 'proxy');
    const value = Reflect.get(client, prop);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
}) as any;

// Admin client factory (server-side only)
export const createAdminClient = () => {
  return getSupabaseClient('admin', 'coming-soon/supabase.ts', 'createAdminClient');
};

// Channel registry to prevent duplicate subscriptions
const channelRegistry = new Map<string, RealtimeChannel>();

export function getOrCreateChannel(name: string): RealtimeChannel {
  if (channelRegistry.has(name)) {
    return channelRegistry.get(name)!;
  }
  const channel = supabase.channel(name);
  channelRegistry.set(name, channel);
  return channel;
}

export function removeChannel(name: string): void {
  const ch = channelRegistry.get(name);
  if (ch) {
    supabase.removeChannel(ch);
    channelRegistry.delete(name);
  }
}
