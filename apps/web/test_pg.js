const postgres = require('postgres');

async function test() {
  const sql = postgres('postgres://postgres:VERLYN_PRIME_2026@db.xsjpydffohyjpvqzhxul.supabase.co:5432/postgres', { ssl: 'require' });
  try {
    console.log("Connected!");
    await sql`
      DROP POLICY IF EXISTS "Members can post to conversations" ON public.messages;
      DROP POLICY IF EXISTS "Users can insert messages they send" ON public.messages;
      
      CREATE POLICY "Members can post to conversations" ON public.messages
      FOR INSERT
      WITH CHECK (
        auth.uid() = sender_id 
        AND (
          -- Group handling
          (conversation_id IS NOT NULL AND public.is_member_of_conversation(conversation_id))
          OR
          -- DM handling
          (conversation_id IS NULL AND recipient_id IS NOT NULL)
        )
      );
    `;
    console.log("RLS Fixed!");
    await sql.end();
  } catch (e) {
    console.error(e);
  }
}
test();
