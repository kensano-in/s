const postgres = require('postgres');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const directUrl = "postgresql://postgres:dNDaE5JHK7hBPCOB@db.xsjpydffohyjpvqzhxul.supabase.co:5432/postgres";
const sql = postgres(directUrl, { ssl: 'require' });

async function verifyIntegrity() {
  console.log("Checking database integrity and constraints...\n");

  // 1. Check Primary and Unique keys
  console.log("=== Unique/Primary Constraints ===");
  const constraints = await sql`
    SELECT 
      tc.table_name, 
      tc.constraint_name, 
      tc.constraint_type,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public' 
      AND tc.table_name IN ('conversations', 'conversation_participants', 'blocks', 'users')
    ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;
  `;
  
  const groups = {};
  for (const row of constraints) {
    const key = `${row.table_name}.${row.constraint_name} (${row.constraint_type})`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row.column_name);
  }
  for (const [key, cols] of Object.entries(groups)) {
    console.log(`- ${key}: [${cols.join(', ')}]`);
  }

  // 2. Check foreign keys
  console.log("\n=== Foreign Key Relations ===");
  const fkeys = await sql`
    SELECT
      tc.table_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_schema = 'public'
      AND tc.table_name IN ('conversations', 'conversation_participants', 'messages', 'blocks');
  `;
  for (const fk of fkeys) {
    console.log(`- ${fk.table_name}.${fk.column_name} references ${fk.foreign_table_name}.${fk.foreign_column_name}`);
  }

  // 3. Check CHECK constraints
  console.log("\n=== CHECK Constraints ===");
  const checkConstraints = await sql`
    SELECT 
      tc.table_name, 
      tc.constraint_name,
      cc.check_clause
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
      ON tc.constraint_name = ccu.constraint_name
    JOIN information_schema.check_constraints cc 
      ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'conversation_participants';
  `;
  for (const cc of checkConstraints) {
    console.log(`- Table: ${cc.table_name}, Constraint: ${cc.constraint_name}`);
    console.log(`  Clause: ${cc.check_clause}`);
  }
}

async function main() {
  try {
    await verifyIntegrity();
  } catch (err) {
    console.error("Integrity verification failed:", err);
  } finally {
    await sql.end();
  }
}

main();
