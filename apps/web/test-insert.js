const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase.from('messages').insert({
    sender_id: 'eac50084-0ea1-4970-9013-b2e7f332eab0',
    conversation_id: 'bbf4cb98-d1bd-41d3-a6da-f35a182ed4fa',
    content: 'test group message'
  }).select();
  console.log('Result:', data || error);
}
test();
