const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// We need an auth session to simulate a real user request.
async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Authenticate as shinichiro or test user
  // I need to know a user's password to login and get the token, or I can just use supabase-admin to fetch a user id
}
main();
