import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkSchema() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log("--- SCHEMA CHECK ---");
  
  const tables = [
    'messages',
    'conversations',
    'conversation_participants',
    'dm_settings',
    'chat_theme',
    'chat_nicknames'
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      console.log(`[X] Table '${table}' check failed: ${error.message}`);
    } else {
      console.log(`[V] Table '${table}' exists.`);
    }
  }

  console.log("\n--- COLUMN CHECK ---");
  // Check messages columns
  const { data: cols, error: colErr } = await supabase.rpc('get_table_columns', { table_name: 'messages' });
  if (colErr) {
    // Fallback: fetch one row and check keys
    const { data } = await supabase.from('messages').select('*').limit(1);
    if (data && data[0]) {
      console.log("Messages columns:", Object.keys(data[0]));
    } else {
      console.log("Could not determine columns for 'messages'");
    }
  } else {
    console.log("Messages columns:", cols);
  }
}

checkSchema();
