import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getMessagesDB } from './src/app/(main)/messages/actions.js';

async function test() {
  const res = await getMessagesDB(
    'eac50084-0ea1-4970-9013-b2e7f332eab0', // User
    '6f659a82-9696-4afc-8e29-60f325ada984', // Group
    true, // isGroup
    5
  );
  console.log(JSON.stringify(res, null, 2));
}

test();
