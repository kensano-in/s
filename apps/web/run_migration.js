/**
 * Execute migration via Supabase Management API.
 * Requires SUPABASE_ACCESS_TOKEN (personal access token from app.supabase.com/account/tokens)
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '039_fix_rls_realtime_full.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  if (!accessToken) {
    console.log('❌ No SUPABASE_ACCESS_TOKEN found.');
    console.log('   Get one at: https://app.supabase.com/account/tokens');
    console.log('   Add to .env.local as: SUPABASE_ACCESS_TOKEN=sbp_...');
    
    // Try alternative: pg connection string
    const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
    if (dbUrl) {
      console.log('\n📡 Found DATABASE_URL, attempting direct PG connection...');
      await runViaPg(dbUrl, sql);
    } else {
      console.log('\n🛑 Cannot run migration automatically. Please run manually:');
      console.log('   1. Go to https://supabase.com/dashboard/project/' + projectRef + '/sql');
      console.log('   2. Paste contents of: supabase/migrations/039_fix_rls_realtime_full.sql');
      console.log('   3. Click "Run"');
    }
    return;
  }

  // Call Management API
  const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
  
  console.log(`📡 Running migration via Management API on project: ${projectRef}`);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const body = await response.text();
  
  if (response.ok) {
    console.log('✅ Migration executed successfully!');
    console.log('🟢 Realtime should now be working. Test by opening two browser windows.');
  } else {
    console.log(`❌ Management API returned ${response.status}: ${body}`);
    console.log('\n📋 Please run manually in Supabase Dashboard → SQL Editor');
  }
}

async function runViaPg(connectionString, sql) {
  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();
    await client.query(sql);
    await client.end();
    console.log('✅ Migration executed via direct Postgres connection!');
  } catch (err) {
    console.error('❌ Direct PG connection failed:', err.message);
  }
}

runMigration();
