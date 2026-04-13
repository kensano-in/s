const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: parts, error: e1 } = await supabaseAdmin
    .from('conversation_participants')
    .select('*')
    .eq('conversation_id', '6f659a82-9696-4afc-8e29-60f325ada984');
  
  console.log('Participants of TEST HUB:', parts, e1);
}
check();
