const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  console.log('\nFetching users...');
  const { data, error } = await supabase.from('users').select('*').limit(10);
  console.log('Users:', data);
}
test();
