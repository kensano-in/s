import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const channel = supabase.channel('test-meta-new-2');

channel.on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, (payload) => {
  console.log('🟢 CONVERSATIONS EVENT:', payload.new?.id);
});
channel.on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
  console.log('🟢 MESSAGES EVENT:', payload.new?.id, payload.new?.content);
});

channel.subscribe((status) => {
  console.log('WebSocket Status:', status);
  if (status === 'SUBSCRIBED') {
    setTimeout(async () => {
       try {
       const userRes = await supabase.from('users').select('id').limit(1).single();
       if (!userRes.data) return console.log('no user');

       const {data, error} = await supabase.from('conversations').insert({ 
         name: 'TEST META TRASH', 
         is_group: true,
         creator_id: userRes.data.id,
         join_code: 'TRASHX'
       }).select('id').single();
       if(error) console.log('Error C:', error);
       console.log('Inserted conversation:', data?.id);
       
       if(data) {
         const {data: mdata, error: merr} = await supabase.from('messages').insert({
            sender_id: userRes.data.id,
            recipient_id: userRes.data.id,
            conversation_id: data.id,
            chat_id: data.id,
            content: 'META TEST MSG ' + Date.now(),
            type: 'text',
            status: 'sent'
         }).select('id').single();
         if(merr) console.log('Error M:', merr);
         console.log('Inserted message:', mdata?.id);
       }
       } catch (err) { console.error(err); }
    }, 1000);
  }
});

setTimeout(() => process.exit(0), 8000);
