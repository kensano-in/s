import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const { data, error } = await supabase.from('users').select('id, username, display_name').limit(10).order('created_at', { ascending: false });
  console.log('Latest users:');
  console.log(JSON.stringify(data, null, 2));
}
run();
