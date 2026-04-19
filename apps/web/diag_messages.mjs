import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get one message to see all column names
const { data, error } = await supabase
  .from('messages')
  .select('*')
  .limit(1)
  .single();

if (error) {
  console.error('ERROR:', error);
} else {
  console.log('=== MESSAGES TABLE COLUMNS ===');
  console.log(Object.keys(data).join('\n'));
  console.log('\n=== SAMPLE ROW ===');
  console.log(JSON.stringify(data, null, 2));
}
