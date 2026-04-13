const { getConversationsDB } = require('./src/app/(main)/messages/actions');
require('dotenv').config({ path: '.env.local' });

async function test() {
  console.log('\nTesting getConversationsDB...');
  const res = await getConversationsDB('eac50084-0ea1-4970-9013-b2e7f332eab0');
  if (res.data) {
    res.data.forEach((c: any) => {
      console.log(`Conv: ${c.name} | ID: ${c.id} | Group: ${c.isGroup}`);
    });
  } else {
    console.log('Error:', res.error);
  }
}
test();
