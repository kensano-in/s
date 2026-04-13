const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: users, error: e1 } = await supabaseAdmin
    .from('users')
    .select('id, username')
    .eq('username', 'shinichiro')
    .single();
  
  console.log('User shinichiro:', users, e1);
}
check();
