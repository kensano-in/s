const postgres = require('postgres');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Use direct database URL on port 5432
const directUrl = "postgresql://postgres:dNDaE5JHK7hBPCOB@db.xsjpydffohyjpvqzhxul.supabase.co:5432/postgres";
const sql = postgres(directUrl, { ssl: 'require' });

async function run() {
  try {
    const migrationPath = path.join(__dirname, 'migration.sql');
    console.log(`Reading migration script from: ${migrationPath}`);
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing migration on Supabase...');
    await sql.unsafe(sqlContent);
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sql.end();
  }
}

run();
