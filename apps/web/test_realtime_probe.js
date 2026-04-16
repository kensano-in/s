import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role temporarily to bypass RLS and see if publication itself works!
);

console.log("Connecting to Supabase Realtime...");

const channel = supabase.channel('test-messages-admin');

channel.on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
  console.log("🟢 REALTIME PAYLOAD (ADMIN):", payload);
}).subscribe((status) => {
  console.log("WebSocket Status (ADMIN):", status);
});
