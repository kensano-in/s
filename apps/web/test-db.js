const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  console.log('Testing messages fetch...');
  const { data: fetch, error: fetchErr } = await supabase.from('messages').select('*').limit(1);
  console.log('Fetch Result:', fetch);
  console.log('Fetch Error:', fetchErr);

  console.log('\nTesting message insert...');
  const payload = {
    sender_id: '00000000-0000-0000-0000-000000000000',
    recipient_id: '00000000-0000-0000-0000-000000000001',
    content: 'hello test',
  };
  const { data, error } = await supabase.from('messages').insert(payload);
  console.log('Insert Result:', data);
  console.log('Insert Error:', error);
}

test();
