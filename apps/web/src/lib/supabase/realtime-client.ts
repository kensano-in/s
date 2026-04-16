/**
 * REALTIME CLIENT
 * ───────────────────────────────────────────────────────────────────
 * Uses the native @supabase/supabase-js createClient (NOT the SSR browser
 * client) because the SSR client from @supabase/ssr uses cookie-based auth
 * sessions that break WebSocket upgrade handshakes in Next.js browser contexts,
 * causing the "WebSocket connection failed" + REST API fallback errors.
 *
 * This singleton is used ONLY for Realtime subscriptions in client components.
 * All server-side operations continue to use the server/admin clients.
 */
import { createClient } from '@supabase/supabase-js';

let _realtimeClient: ReturnType<typeof createClient> | null = null;

export function getRealtimeClient() {
  if (_realtimeClient) return _realtimeClient;

  _realtimeClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    }
  );

  return _realtimeClient;
}
