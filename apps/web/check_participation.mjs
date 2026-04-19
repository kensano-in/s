import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GROUP_ID = '6f659a82-9696-4afc-8e29-60f325ada984';
const USER_ID = 'eac50084-0ea1-4970-9013-b2e7f332eab0';

async function run() {
  console.log("Checking participation...");
  const { data, error } = await supabase
    .from('conversation_participants')
    .select('*')
    .eq('conversation_id', GROUP_ID)
    .eq('user_id', USER_ID);
  
  console.log("Data:", data);
  if (error) console.error("Error:", error);
}

run();
