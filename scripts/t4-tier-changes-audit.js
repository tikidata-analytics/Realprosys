// T4: Create tier_changes audit table for tier/role change tracking
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create tier_changes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tier_changes (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        from_tier  user_tier,
        to_tier    user_tier NOT NULL,
        from_role  user_role,
        to_role    user_role NOT NULL,
        changed_by TEXT NOT NULL REFERENCES users(id),
        changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Index for fast lookups by user_id
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tier_changes_user_id ON tier_changes(user_id);
    `);

    await client.query('COMMIT');
    console.log('Migration T4 complete: tier_changes table created.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e.message);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
