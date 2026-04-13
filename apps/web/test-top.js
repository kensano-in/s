const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  console.log('\nFetching top messages...');
  const { data, error } = await supabase
    .from('messages')
    .select('content, sent_at, status, sender_id, recipient_id')
    .order('sent_at', { ascending: false })
    .limit(5);
  
  if (data) {
    console.log(data);
  } else {
    console.log(error);
  }
}
test();
