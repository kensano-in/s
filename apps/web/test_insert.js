import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function run() {
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: group } = await adminClient.from('conversations').select('id, creator_id').eq('name', 'TEST HUB').limit(1).single();
  if(!group) return console.log('no group');

  const { data, error } = await adminClient.from('messages').insert({
    sender_id: group.creator_id,
    recipient_id: group.creator_id, // Simulate the group chat bypass
    conversation_id: group.id,
    chat_id: group.id,
    content: 'SIMULATED MESSAGE',
    type: 'text',
    status: 'sent'
  }).select().single();
  
  if (error) console.error('insert err:', error);
  else console.log('Insert success!', data?.id);
}
run();
