import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function run() {
  const { data, error } = await supabase.storage.from('chat-files').list('voice-notes', {
    limit: 5,
    sortBy: { column: 'created_at', order: 'desc' }
  });

  if (error) {
    console.error('Error fetching files:', error);
    return;
  }

  console.log('Latest 5 voice notes:');
  data.forEach(file => {
    console.log(`- ${file.name} | Size: ${file.metadata?.size} bytes | Mime: ${file.metadata?.mimetype}`);
  });
}

run();
