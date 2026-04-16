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

// Second connection with ANON key to test RLS
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// We need a JWT to test RLS properly. We'll skip JWT for now unless needed.

setTimeout(() => {
  console.log("Inserting test message...");
  supabase.from('messages').insert({
    sender_id: '16d2ca01-cf95-46f9-aa2b-b4d45c6145dc', // We'll just put a dummy or null if allowed
    conversation_id: '6f659a82-9696-4afc-8e29-60f323e0ad94', // The TEST HUB from screenshot
    chat_id: '6f659a82-9696-4afc-8e29-60f323e0ad94',
    content: 'TASK FAILED (Realtime Probe)',
    type: 'text'
  }).then(res => console.log("Insert result:", res));
}, 3000);

setTimeout(() => {
  console.log("Timeout. Exiting.");
  process.exit(0);
}, 10000);
