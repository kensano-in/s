const { Client } = require('pg');

const client = new Client({
  host: 'db.xsjpydffohyjpvqzhxul.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'dNDaE5JHK7hBPCOB',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_followers_follower_status ON public.followers (follower_id, status);
  `);
  console.log('✅ Created index idx_followers_follower_status');

  const res = await client.query(`
    EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
    SELECT following_id
    FROM followers
    WHERE follower_id = '00000000-0000-0000-0000-000000000000'::uuid
      AND status = 'accepted';
  `);
  console.log('--- NEW EXPLAIN ANALYZE OUTPUT ---');
  console.log(res.rows.map(r => r['QUERY PLAN']).join('\n'));
  await client.end();
}

main().catch(console.error);
