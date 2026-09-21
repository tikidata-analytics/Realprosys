// T1: DB Migration — add role/tier to users + create tier_limits table
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Add role ENUM type
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('webmaster', 'user');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Add tier ENUM type
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_tier AS ENUM ('free', 'premium');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 3. Add columns to users
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'user',
      ADD COLUMN IF NOT EXISTS tier user_tier NOT NULL DEFAULT 'free';
    `);

    // 4. Set inetvmart as webmaster
    const result = await client.query(`
      UPDATE users SET role = 'webmaster' WHERE email = 'inetvmart@gmail.com' RETURNING id, email, role;
    `);
    console.log('Webmaster updated:', result.rows);

    // 5. Create tier_limits table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tier_limits (
        id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tier      user_tier NOT NULL,
        resource  VARCHAR(50) NOT NULL,
        limit_val INT NOT NULL,
        UNIQUE(tier, resource)
      );
    `);

    // 6. Seed tier_limits
    const seedSql = `
      INSERT INTO tier_limits (tier, resource, limit_val) VALUES
        ('free',     'customers',      2),
        ('free',     'payment_plans',  2),
        ('free',     'schemes',       2),
        ('free',     'products',      2),
        ('free',     'projects',       2),
        ('premium',  'customers',      10),
        ('premium',  'payment_plans',  10),
        ('premium',  'schemes',       10),
        ('premium',  'products',      10),
        ('premium',  'projects',       10)
      ON CONFLICT (tier, resource) DO NOTHING;
    `;
    await client.query(seedSql);

    // Verify
    const tiers = await client.query('SELECT * FROM tier_limits ORDER BY tier, resource');
    console.log('Tier limits seeded:', tiers.rows);

    await client.query('COMMIT');
    console.log('Migration T1 complete.');
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
