import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Single shared browser-side Supabase client.
 *
 * MUST use createBrowserClient (from @supabase/ssr) so that the auth
 * session stored in HTTP-only cookies by Next.js server actions is visible
 * to the client. Using the plain supabase-js client causes a session-key
 * mismatch (localStorage vs cookie) that makes Realtime WebSocket auth
 * fail and retry in an infinite loop.
 *
 * NOTE: Do NOT pass a `realtime` config block here — @supabase/ssr silently
 * drops realtime options, leading to a malformed RealtimeClient init.
 * Defaults are correct for production use.
 */
export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY)

// Keep backward compatibility so the rest of the app doesn't crash:
export function createClientInstance() { return supabase; }
export { createClientInstance as createClient };
