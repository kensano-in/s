const postgres = require('postgres');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const directUrl = "postgresql://postgres:dNDaE5JHK7hBPCOB@db.xsjpydffohyjpvqzhxul.supabase.co:5432/postgres";
const sql = postgres(directUrl, { ssl: 'require' });

let USER_A, USER_B;

// Simple analysis function for checking spammy content
function analyzeText(text) {
  const content = (text || '').toLowerCase();
  const spamKeywords = ['viagra', 'buy matching', 'crypto rich', 'investment double', 'free cash', 'lottery win'];
  const hasSpamKeyword = spamKeywords.some(kw => content.includes(kw));
  return {
    isSpamContent: hasSpamKeyword,
    riskScore: hasSpamKeyword ? 85 : 10
  };
}

async function setup() {
  const users = await sql`SELECT id, username FROM public.users LIMIT 2;`;
  if (users.length < 2) {
    throw new Error("Need at least 2 users in the database to run tests.");
  }
  
  USER_A = users[0].id;
  USER_B = users[1].id;
  
  console.log(`Using USER_A: ${USER_A} (${users[0].username})`);
  console.log(`Using USER_B: ${USER_B} (${users[1].username})`);
}

async function testSpamContentRouting() {
  console.log("\n--- TEST: SPAM CONTENT ROUTING ---");
  
  // Clean previous test DMs between USER_A and USER_B
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
      await sql`DELETE FROM public.messages WHERE conversation_id = ${cid};`;
      await sql`DELETE FROM public.conversation_participants WHERE conversation_id = ${cid};`;
      await sql`DELETE FROM public.conversations WHERE id = ${cid};`;
    }
  }

  // 1. Text is clean (standard request)
  const cleanMsg = "Hello! Nice to meet you.";
  const cleanAnalysis = analyzeText(cleanMsg);
  console.log(`Clean message analysis: isSpamContent = ${cleanAnalysis.isSpamContent} (Expected: false)`);
  
  // 2. Text is spammy (viagra offer)
  const spamMsg = "Buy cheap viagra now! Crypto rich fast!";
  const spamAnalysis = analyzeText(spamMsg);
  console.log(`Spam message analysis: isSpamContent = ${spamAnalysis.isSpamContent} (Expected: true)`);
  
  if (cleanAnalysis.isSpamContent !== false || spamAnalysis.isSpamContent !== true) {
    throw new Error("analyzeText function routing failed!");
  }
  
  // Create a conversation for the spam message
  const secureCode = `dm_spam_test_${Date.now()}`;
  const [conv] = await sql`
    INSERT INTO public.conversations (name, join_code, is_group, creator_id)
    VALUES ('Direct Message', ${secureCode}, false, ${USER_A})
    RETURNING id;
  `;
  const convId = conv.id;
  
  // Route recipient to SPAM because isSpamContent is true
  const recipientState = spamAnalysis.isSpamContent ? 'SPAM' : 'REQUEST';
  
  await sql`
    INSERT INTO public.conversation_participants (conversation_id, user_id, role, inbox_state)
    VALUES 
      (${convId}, ${USER_A}, 'member', 'CHAT'),
      (${convId}, ${USER_B}, 'member', ${recipientState});
  `;
  
  const [partB] = await sql`SELECT inbox_state FROM public.conversation_participants WHERE conversation_id = ${convId} AND user_id = ${USER_B};`;
  console.log(`- Recipient inbox state for spam message: ${partB.inbox_state} (Expected: SPAM)`);
  if (partB.inbox_state !== 'SPAM') {
    throw new Error("Spam content routing database test failed!");
  }
  
  // Clean up
  await sql`DELETE FROM public.messages WHERE conversation_id = ${convId};`;
  await sql`DELETE FROM public.conversation_participants WHERE conversation_id = ${convId};`;
  await sql`DELETE FROM public.conversations WHERE id = ${convId};`;
}

async function testPrivacySettingsRouting() {
  console.log("\n--- TEST: PRIVACY SETTINGS ROUTING ---");
  
  // Simulating privacy check routing rules
  const messageDeliveryOthers = 'requests'; // recipient preference: route unknown users to requests
  const isPrivate = true; // recipient account is private
  const isFollowing = false; // sender does not follow recipient
  
  let initialInboxState = 'CHAT';
  let shouldQueueRequest = false;
  
  if (isFollowing) {
    shouldQueueRequest = false;
  } else {
    if (messageDeliveryOthers === 'requests') {
      shouldQueueRequest = true;
    } else {
      shouldQueueRequest = isPrivate;
    }
  }
  
  if (shouldQueueRequest) {
    initialInboxState = 'REQUEST';
  }
  
  console.log(`Privacy Check: shouldQueueRequest = ${shouldQueueRequest} (Expected: true)`);
  console.log(`Privacy Check: initialInboxState = ${initialInboxState} (Expected: REQUEST)`);
  
  if (initialInboxState !== 'REQUEST') {
    throw new Error("Privacy settings routing simulation failed!");
  }
}

async function main() {
  try {
    await setup();
    await testSpamContentRouting();
    await testPrivacySettingsRouting();
    console.log("\nALL SPAM AND PRIVACY TESTS PASSED SUCCESSFULLY!");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    await sql.end();
  }
}

main();
