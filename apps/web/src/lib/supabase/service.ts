import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with the SERVICE ROLE key.
 * Bypasses Row Level Security — use ONLY in server-side security modules
 * (rate limiting, threat scoring, rejection logging).
 * NEVER expose this client to the browser.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('[ServiceClient] Missing SUPABASE_URL or SERVICE_ROLE_KEY');
  }

  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  });
}
