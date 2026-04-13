const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const payload = {
    sender_id: 'eac50084-0ea1-4970-9013-b2e7f332eab0', // replace with a real user id if needed
    content: 'test',
    type: 'text',
    status: 'sent',
    conversation_id: 'bbf4cb98-d1bd-41d3-a6da-f35a182ed4fa', // test hub or fake
    recipient_id: 'eac50084-0ea1-4970-9013-b2e7f332eab0',
    client_temp_id: 'temp_debug_123'
  };

  const { data, error } = await supabaseAdmin.from('messages').insert(payload).select().single();
  console.log('Admin Insert Result:', data || error);

  // Let's also check anon insert just in case RLS is needed for edge cases
  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  // since anon can't insert a fake user ID without JWT, we'll see if we get RLS error
  const { data: d2, error: e2 } = await supabaseAnon.from('messages').insert(payload).select().single();
  console.log('Anon Insert Result:', d2 || e2);
}

main();
