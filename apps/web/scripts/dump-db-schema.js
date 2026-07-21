const postgres = require('postgres');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const directUrl = "postgresql://postgres:dNDaE5JHK7hBPCOB@db.xsjpydffohyjpvqzhxul.supabase.co:5432/postgres";
const sql = postgres(directUrl, { ssl: 'require' });

async function run() {
  try {
    const table = 'user_activity_logs';
    console.log(`=== TABLE: ${table} ===`);
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = ${table} AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    for (const col of columns) {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

run();
