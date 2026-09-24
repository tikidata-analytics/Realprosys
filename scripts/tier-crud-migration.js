/**
 * Tier CRUD migration
 * Creates the `tiers` table and migrates existing free/premium data.
 * Safe to re-run: uses IF NOT EXISTS / ON CONFLICT.
 */
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

    // 1. Create tiers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tiers (
        name         VARCHAR(50) PRIMARY KEY,
        monthly_price NUMERIC(12, 2) DEFAULT 0,
        yearly_price  NUMERIC(12, 2) DEFAULT 0,
        start_date    DATE,
        end_date      DATE,
        is_active     BOOLEAN DEFAULT TRUE,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ tiers table created');

    // 2. Seed existing tiers (free + premium) if not present
    await client.query(`
      INSERT INTO tiers (name, monthly_price, yearly_price, is_active)
      VALUES
        ('free',    0,      0,      TRUE),
        ('premium', 0,      0,      TRUE)
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✓ seeded free + premium tiers');

    // 3. tier_limits already has 'tier' column — verify it references our tiers
    const tl = await client.query('SELECT DISTINCT tier FROM tier_limits');
    console.log('existing tiers in tier_limits:', tl.rows.map(r => r.tier));

    // 4. Add columns to tier_limits for start_date/end_date (per-limit date ranges)
    //    Actually — start/end dates are per-TIER (promo window), not per-limit.
    //    So we put them on the tiers table. Done.

    await client.query('COMMIT');
    console.log('\n✅ Migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
