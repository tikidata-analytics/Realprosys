require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Add permanent column — true = no date window needed, false = date window required
    await client.query(`
      ALTER TABLE tiers
      ADD COLUMN IF NOT EXISTS permanent BOOLEAN NOT NULL DEFAULT TRUE
    `);
    // Set existing tiers to permanent (no date window = free-floating)
    await client.query(`UPDATE tiers SET permanent = TRUE WHERE permanent IS NULL`);
    await client.query('COMMIT');
    console.log('✅ Added permanent column to tiers table');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}
migrate();
