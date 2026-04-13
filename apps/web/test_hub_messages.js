const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: msgs, error: e1 } = await supabaseAdmin
    .from('messages')
    .select('id, content, sent_at, client_temp_id, status')
    .eq('conversation_id', '6f659a82-9696-4afc-8e29-60f325ada984')
    .order('sent_at', { ascending: false })
    .limit(5);
  
  console.log('Recent Messages in TEST HUB:', msgs, e1);
}
check();
