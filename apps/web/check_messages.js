import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('messages').select('id').limit(1);
  if (error) {
    console.log('TABLE ERROR:', error.message);
    if (error.message.includes('relation "public.messages" does not exist')) {
       // Create table
       const q = `
         CREATE TABLE IF NOT EXISTS messages (
           id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
           sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
           recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
           content TEXT NOT NULL,
           is_read BOOLEAN DEFAULT false,
           sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
         );
         ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
         CREATE POLICY "Public profiles are viewable by everyone." ON messages FOR SELECT USING (true);
         CREATE POLICY "Users can insert their own messages." ON messages FOR INSERT WITH CHECK (true);
       `;
       // we can't do raw sql directly through client, so I'll just print that it doesn't exist.
       console.log('MISSING');
    }
  } else {
    console.log('TABLE EXISTS');
  }
}
check();
