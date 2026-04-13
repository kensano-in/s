const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  console.log('\nIntrospecting active schema...');
  const { data, error } = await supabase.from('messages').select('*').limit(1);
  if (error) {
    console.error('Fetch Error:', error);
  } else if (data && data.length > 0) {
    console.log('Columns in DB:', Object.keys(data[0]));
  } else {
    console.log('Table is empty, fetching empty array.');
  }

  // Also query schema directly if possible, or just insert an empty row to see exactly what fails
  console.log('\nTesting pure insert...');
  const { error: insErr } = await supabase.from('messages').insert({
    sender_id: 'eac50084-0ea1-4970-9013-b2e7f332eab0',
    recipient_id: 'bbf4cb98-d1bd-41d3-a6da-f35a182ed4fa',
    content: 'diag message'
  });
  console.log('Insert Error:', insErr);
}
test();
