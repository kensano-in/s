const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase.from('messages').select('conversation_id, recipient_id').not('conversation_id', 'is', null).limit(5);
  console.log('Group Msgs:', data);
}
test();
