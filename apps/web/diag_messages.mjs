import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GROUP_ID = '6f659a82-9696-4afc-8e29-60f325ada984';

// Count messages in TEST HUB
const { count } = await supabase
  .from('messages')
  .select('*', { count: 'exact', head: true })
  .eq('conversation_id', GROUP_ID);
console.log('Messages in TEST HUB group:', count);

// Get last 5 messages
const { data, error } = await supabase
  .from('messages')
  .select('id, sender_id, recipient_id, conversation_id, content, sent_at, thread_root_id')
  .eq('conversation_id', GROUP_ID)
  .order('sent_at', { ascending: false })
  .limit(5);

if (error) console.error('Query error:', error);
else {
  data.forEach((m, i) => {
    console.log(`[${i+1}] "${m.content}" sent_at=${m.sent_at} thread_root=${m.thread_root_id ?? 'null'}`);
  });
}

// Also check all messages with null conversation_id for the user eac50084
const userId = 'eac50084-0ea1-4970-9013-b2e7f332eab0';
const { count: dmCount } = await supabase
  .from('messages')
  .select('*', { count: 'exact', head: true })
  .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
  .is('conversation_id', null);
console.log('\nDM messages (conv_id=null):', dmCount);

// Check if DM thread uses a different conv ID or no conv_id
const { data: dmData } = await supabase
  .from('messages')
  .select('id, sender_id, recipient_id, conversation_id, content, sent_at, chat_id')
  .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
  .neq('conversation_id', GROUP_ID)
  .order('sent_at', { ascending: false })
  .limit(5);
console.log('\nOther messages for user:');
dmData?.forEach((m, i) => {
  console.log(`[${i+1}] "${m.content}" conv=${m.conversation_id?.slice(0,8) ?? 'NULL'} chat_id=${m.chat_id?.slice(0,16) ?? 'NULL'} recip=${m.recipient_id?.slice(0,8) ?? 'NULL'}`);
});
