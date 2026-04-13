const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: cols, error: e1 } = await supabaseAdmin.from('messages').select('client_temp_id').limit(1);
  console.log('Columns:', cols, e1);
}
check();
