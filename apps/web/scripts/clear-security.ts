import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function clearSecurityData() {
  console.log('Clearing Adaptive Blacklist (L8)...');
  const r1 = await supabase.from('rejected_usernames').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(r1.error ? `Error: ${r1.error.message}` : 'Cleared.');

  console.log('Clearing Rate Limits (L9)...');
  const r2 = await supabase.from('username_rate_limits').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(r2.error ? `Error: ${r2.error.message}` : 'Cleared.');

  console.log('Clearing IP Threat Scores (L10)...');
  const r3 = await supabase.from('ip_threat_scores').delete().neq('ip_address', '127.0.0.1');
  console.log(r3.error ? `Error: ${r3.error.message}` : 'Cleared.');

  console.log('Clearing Banned Identities...');
  const r4 = await supabase.from('banned_identities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(r4.error ? `Error: ${r4.error.message}` : 'Cleared.');

  console.log('Done.');
}

clearSecurityData();
