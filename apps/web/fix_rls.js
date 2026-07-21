import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import postgres from 'postgres';

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Missing DATABASE_URL');
    return;
  }
  
  const sql = postgres(url, { ssl: 'require' });

  try {
    console.log('Applying RLS fixes for REALTIME messages...');

    await sql`ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;`;

    // Drop generic one if it exists
    try { await sql`DROP POLICY "Public view messages" ON public.messages;` } catch(e) {}
    try { await sql`DROP POLICY "Users can see messages they sent or received" ON public.messages;` } catch(e) {}
    try { await sql`DROP POLICY "Users can see group messages if participant" ON public.messages;` } catch(e) {}
    
    // Create new policies
    await sql`
      CREATE POLICY "Users can see messages they sent or received" 
      ON public.messages FOR SELECT 
      USING ( auth.uid() = sender_id OR auth.uid() = recipient_id );
    `;

    await sql`
      CREATE POLICY "Users can see group messages if participant" 
      ON public.messages FOR SELECT 
      USING ( 
        conversation_id IS NOT NULL AND 
        EXISTS (
          SELECT 1 FROM public.conversation_participants 
          WHERE conversation_id = public.messages.conversation_id 
          AND user_id = auth.uid()
        )
      );
    `;

    console.log('SUCCESS! Applied RLS for Realtime');
  } catch(e) {
    console.error('ERROR:', e.message);
  } finally {
    await sql.end();
  }
}
run();
