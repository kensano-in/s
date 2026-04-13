const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  console.log('\nTesting full payload insert...');
  const payload = {
    sender_id: 'eac50084-0ea1-4970-9013-b2e7f332eab0',
    recipient_id: 'bbf4cb98-d1bd-41d3-a6da-f35a182ed4fa',
    content: 'hello full payload',
    type: 'text',
    media_url: null,
    file_name: null,
    mime_type: null,
    reply_to_id: null,
    status: 'sent'
  };
  const { data, error } = await supabase.from('messages').insert(payload).select().single();
  console.log('Insert Result:', data);
  console.log('Insert Error:', error);
}

test();
