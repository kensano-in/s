const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase.from('messages').insert({
    sender_id: 'eac50084-0ea1-4970-9013-b2e7f332eab0',
    recipient_id: 'eac50084-0ea1-4970-9013-b2e7f332eab0', // Mirror sender
    conversation_id: '4eba0234-8d79-4aa4-a0cb-6019f1c0bf3a', // Real Sano Group
    content: 'hacky group message!'
  }).select();
  console.log('Result:', data || error);
}
test();
