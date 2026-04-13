import { getMessagesDB } from './src/app/(main)/messages/actions';

async function test() {
  console.log('\nTesting getMessagesDB server action...');
  try {
    const res = await getMessagesDB(
      'eac50084-0ea1-4970-9013-b2e7f332eab0',
      'bbf4cb98-d1bd-41d3-a6da-f35a182ed4fa',
      false,
      50,
      undefined
    );
    console.log('Action Result Success:', res.success);
    console.log('Action Result Error:', res.error);
    if (res.data) console.log('Action Result Data Length:', res.data.length);
  } catch (e) {
    console.error('Action Failed:', e);
  }
}

test();
