const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  console.log('\nFetching all users...');
  const { data, error } = await supabase.from('users').select('id, username, display_name');
  if (data) {
    console.log(data);
  } else {
    console.log(error);
  }
}
test();
