const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: convs, error: e1 } = await supabaseAdmin.from('conversations').select('*').limit(10);
  console.log('Groups in DB:', convs);

  const { data: users, error: e2 } = await supabaseAdmin.from('users').select('*').limit(10);
  console.log('Users in DB:', users.map(u => u.username));
}
check();
