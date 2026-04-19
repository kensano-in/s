import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', { query: "SELECT tablename, policyname, roles, cmd, qual FROM pg_policies WHERE tablename = 'messages';" });
  if (error) {
    console.error("RPC Error:", error);
    // try typical RPC names
    const r2 = await supabase.rpc('run_sql', { sql_query: "SELECT * FROM pg_policies WHERE tablename = 'messages';" });
    console.log("R2:", r2.error ? r2.error.message : r2.data);
  } else {
    console.log("DATA:", data);
  }
}
run();
