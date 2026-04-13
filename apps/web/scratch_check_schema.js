const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envs = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0];
    const val = parts.slice(1).join('=').replace(/^"|"$/g, '').trim();
    acc[key] = val;
  }
  return acc;
}, {});

const supabase = createClient(envs.NEXT_PUBLIC_SUPABASE_URL, envs.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('dm_settings').select('*').limit(1);
  console.log('Columns:', data && data[0] ? Object.keys(data[0]) : 'Empty data');
  console.log('Error:', error);
}
run();
