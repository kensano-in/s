import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Use the real ID found from previous search
  const convId = '6f659a82-9696-4afc-8e29-60f325ada984'; 

  console.log("1. Testing Member Load for ID:", convId);
  const { data: members, error: memErr } = await supabase
      .from('conversation_participants')
      .select(`
        role,
        joined_at,
        users (id, username, display_name, avatar_url)
      `)
      .eq('conversation_id', convId)
      .order('joined_at', { ascending: true });
      
  console.log("Member info:", { count: members?.length, error: memErr });
  if (members && members.length > 0) {
     console.log("First member:", JSON.stringify(members[0], null, 2));
  } else {
     // Check if ANY members exist in that table
     const { data: allMembers } = await supabase.from('conversation_participants').select('*').limit(5);
     console.log("Sample from conversation_participants:", allMembers);
  }
}

run();
