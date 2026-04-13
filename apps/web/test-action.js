const { sendMessageDB } = require('./src/app/(main)/messages/actions');
require('dotenv').config({ path: '.env.local' });

async function test() {
  console.log('\nTesting sendMessageDB server action...');
  try {
    const res = await sendMessageDB(
      'eac50084-0ea1-4970-9013-b2e7f332eab0',
      'bbf4cb98-d1bd-41d3-a6da-f35a182ed4fa',
      'hello over action',
      'text',
      undefined, undefined, undefined, undefined,
      undefined,
      undefined
    );
    console.log('Action Result:', res);
  } catch (e) {
    console.error('Action Failed:', e);
  }
}

test();
