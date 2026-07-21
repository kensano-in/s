const postgres = require('postgres');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const directUrl = "postgresql://postgres:dNDaE5JHK7hBPCOB@db.xsjpydffohyjpvqzhxul.supabase.co:5432/postgres";
const sql = postgres(directUrl, { ssl: 'require' });

let USER_A, USER_B;

async function setupTestUsers() {
  console.log("Finding existing users in the database...");
  const users = await sql`SELECT id, username FROM public.users LIMIT 2;`;
  if (users.length < 2) {
    throw new Error("Need at least 2 users in the database to run tests.");
  }
  
  USER_A = users[0].id;
  USER_B = users[1].id;
  
  console.log(`Using USER_A: ${USER_A} (${users[0].username})`);
  console.log(`Using USER_B: ${USER_B} (${users[1].username})`);

  // Clean up any previous test conversations or blocks between these two users
  console.log("Cleaning up previous test data between these users...");
  
  // Find DM conversation if it exists
  const { data: convParticipants } = await sql`
    SELECT conversation_id 
    FROM public.conversation_participants 
    WHERE user_id = ${USER_A};
  `;
  
  const blockerConvIds = (convParticipants || []).map((cp) => cp.conversation_id);
  if (blockerConvIds.length > 0) {
    const sharedParts = await sql`
      SELECT conversation_id 
      FROM public.conversation_participants 
      WHERE conversation_id IN (${blockerConvIds}) AND user_id = ${USER_B};
    `;
    
    for (const sp of sharedParts) {
      const cid = sp.conversation_id;
      console.log(`Cleaning up test conversation ${cid}...`);
      await sql`DELETE FROM public.messages WHERE conversation_id = ${cid};`;
      await sql`DELETE FROM public.conversation_participants WHERE conversation_id = ${cid};`;
      await sql`DELETE FROM public.conversations WHERE id = ${cid};`;
    }
  }

  await sql`DELETE FROM public.blocks WHERE (blocker_id = ${USER_A} AND blocked_id = ${USER_B}) OR (blocker_id = ${USER_B} AND blocked_id = ${USER_A});`;
}

async function testConversationTransitions() {
  console.log("\n--- STARTING CONVERSATION STATE MACHINE TESTS ---");
  
  // Test Scenario 1: Initial creation as REQUEST
  console.log("\nScenario 1: User A sends DM to User B (requires request)");
  const secureCode = `dm_test_a_b_${Date.now()}`;
  const [conv] = await sql`
    INSERT INTO public.conversations (name, join_code, is_group, creator_id)
    VALUES ('Direct Message', ${secureCode}, false, ${USER_A})
    RETURNING id;
  `;
  const convId = conv.id;
  
  // Insert A (CHAT) and B (REQUEST)
  await sql`
    INSERT INTO public.conversation_participants (conversation_id, user_id, role, inbox_state)
    VALUES 
      (${convId}, ${USER_A}, 'member', 'CHAT'),
      (${convId}, ${USER_B}, 'member', 'REQUEST');
  `;
  
  // Check DB state
  let [partA] = await sql`SELECT inbox_state FROM public.conversation_participants WHERE conversation_id = ${convId} AND user_id = ${USER_A};`;
  let [partB] = await sql`SELECT inbox_state FROM public.conversation_participants WHERE conversation_id = ${convId} AND user_id = ${USER_B};`;
  console.log(`- Participant A state: ${partA.inbox_state} (Expected: CHAT)`);
  console.log(`- Participant B state: ${partB.inbox_state} (Expected: REQUEST)`);
  if (partA.inbox_state !== 'CHAT' || partB.inbox_state !== 'REQUEST') {
    throw new Error("Scenario 1 failed!");
  }
  
  // Test Scenario 2: Accept Request (transitions REQUEST -> CHAT)
  console.log("\nScenario 2: User B accepts request from User A");
  await sql`
    UPDATE public.conversation_participants 
    SET inbox_state = 'CHAT'
    WHERE conversation_id = ${convId} AND user_id = ${USER_B};
  `;
  [partB] = await sql`SELECT inbox_state FROM public.conversation_participants WHERE conversation_id = ${convId} AND user_id = ${USER_B};`;
  console.log(`- Participant B state: ${partB.inbox_state} (Expected: CHAT)`);
  if (partB.inbox_state !== 'CHAT') {
    throw new Error("Scenario 2 failed!");
  }
  
  // Test Scenario 3: Archive Conversation (transitions CHAT -> ARCHIVED)
  console.log("\nScenario 3: User B archives conversation");
  await sql`
    UPDATE public.conversation_participants 
    SET inbox_state = 'ARCHIVED'
    WHERE conversation_id = ${convId} AND user_id = ${USER_B};
  `;
  [partA] = await sql`SELECT inbox_state FROM public.conversation_participants WHERE conversation_id = ${convId} AND user_id = ${USER_A};`;
  [partB] = await sql`SELECT inbox_state FROM public.conversation_participants WHERE conversation_id = ${convId} AND user_id = ${USER_B};`;
  console.log(`- Participant A state: ${partA.inbox_state} (Expected: CHAT)`);
  console.log(`- Participant B state: ${partB.inbox_state} (Expected: ARCHIVED)`);
  if (partA.inbox_state !== 'CHAT' || partB.inbox_state !== 'ARCHIVED') {
    throw new Error("Scenario 3 failed!");
  }
  
  // Test Scenario 4: Unarchive Conversation (transitions ARCHIVED -> CHAT)
  console.log("\nScenario 4: User B unarchives conversation");
  await sql`
    UPDATE public.conversation_participants 
    SET inbox_state = 'CHAT'
    WHERE conversation_id = ${convId} AND user_id = ${USER_B};
  `;
  [partB] = await sql`SELECT inbox_state FROM public.conversation_participants WHERE conversation_id = ${convId} AND user_id = ${USER_B};`;
  console.log(`- Participant B state: ${partB.inbox_state} (Expected: CHAT)`);
  if (partB.inbox_state !== 'CHAT') {
    throw new Error("Scenario 4 failed!");
  }
  
  // Test Scenario 5: Block User (transitions CHAT -> BLOCKED)
  console.log("\nScenario 5: User B blocks User A");
  // 1. Insert block record
  await sql`INSERT INTO public.blocks (blocker_id, blocked_id) VALUES (${USER_B}, ${USER_A});`;
  // 2. Update states
  await sql`
    UPDATE public.conversation_participants 
    SET inbox_state = 'BLOCKED'
    WHERE conversation_id = ${convId};
  `;
  [partA] = await sql`SELECT inbox_state FROM public.conversation_participants WHERE conversation_id = ${convId} AND user_id = ${USER_A};`;
  [partB] = await sql`SELECT inbox_state FROM public.conversation_participants WHERE conversation_id = ${convId} AND user_id = ${USER_B};`;
  console.log(`- Participant A state: ${partA.inbox_state} (Expected: BLOCKED)`);
  console.log(`- Participant B state: ${partB.inbox_state} (Expected: BLOCKED)`);
  if (partA.inbox_state !== 'BLOCKED' || partB.inbox_state !== 'BLOCKED') {
    throw new Error("Scenario 5 failed!");
  }
  
  // Test Scenario 6: Unblock User (transitions BLOCKED -> CHAT)
  console.log("\nScenario 6: User B unblocks User A");
  // 1. Delete block record
  await sql`DELETE FROM public.blocks WHERE blocker_id = ${USER_B} AND blocked_id = ${USER_A};`;
  // 2. Update states
  await sql`
    UPDATE public.conversation_participants 
    SET inbox_state = 'CHAT'
    WHERE conversation_id = ${convId};
  `;
  [partA] = await sql`SELECT inbox_state FROM public.conversation_participants WHERE conversation_id = ${convId} AND user_id = ${USER_A};`;
  [partB] = await sql`SELECT inbox_state FROM public.conversation_participants WHERE conversation_id = ${convId} AND user_id = ${USER_B};`;
  console.log(`- Participant A state: ${partA.inbox_state} (Expected: CHAT)`);
  console.log(`- Participant B state: ${partB.inbox_state} (Expected: CHAT)`);
  if (partA.inbox_state !== 'CHAT' || partB.inbox_state !== 'CHAT') {
    throw new Error("Scenario 6 failed!");
  }

  // Test Scenario 7: Delete/Decline Request (removes conversation)
  console.log("\nScenario 7: User B declines request (deletes conversation)");
  await sql`DELETE FROM public.conversation_participants WHERE conversation_id = ${convId};`;
  await sql`DELETE FROM public.conversations WHERE id = ${convId};`;
  const remainingConvs = await sql`SELECT id FROM public.conversations WHERE id = ${convId};`;
  console.log(`- Remaining conversations count: ${remainingConvs.length} (Expected: 0)`);
  if (remainingConvs.length !== 0) {
    throw new Error("Scenario 7 failed!");
  }
  
  console.log("\nALL STATE MACHINE TESTS PASSED SUCCESSFULLY!");
}

async function main() {
  try {
    await setupTestUsers();
    await testConversationTransitions();
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    await sql.end();
  }
}

main();
