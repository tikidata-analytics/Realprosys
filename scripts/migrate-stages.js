// Migration: dynamic payment stages
// 1. Create payment_stages table
// 2. Migrate existing payment_plans data to stages (1 stage = DP)
// 3. Update payment_plans columns (remove down_payment_pct, loan_tenor_years, interest_rate for now)

const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  console.log('Creating payment_stages table...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_stages (
      id VARCHAR(36) PRIMARY KEY,
      payment_plan_id VARCHAR(36) NOT NULL,
      stage_type VARCHAR(20) NOT NULL, -- BOOKING_FEE, DOWN_PAYMENT, KPR, SETTLEMENT
      stage_order INTEGER NOT NULL,
      amount_type VARCHAR(10) NOT NULL, -- FIXED, PERCENTAGE
      stage_value NUMERIC(15,2), -- null for KPR (auto-calculated)
      interval_months INTEGER DEFAULT 0, -- months from previous stage
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log('Creating index...');
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_payment_stages_plan_order
    ON payment_stages(payment_plan_id, stage_order);
  `);

  console.log('Migrating existing payment plans to stages...');
  // Migrate existing plans: convert down_payment_pct to a single DOWN_PAYMENT stage
  await pool.query(`
    INSERT INTO payment_stages (id, payment_plan_id, stage_type, stage_order, amount_type, stage_value, interval_months)
    SELECT
      gen_random_uuid()::varchar,
      id,
      'DOWN_PAYMENT',
      0,
      'PERCENTAGE',
      down_payment_pct,
      0
    FROM payment_plans
    WHERE down_payment_pct IS NOT NULL
    ON CONFLICT DO NOTHING;
  `);

  console.log('Migration complete.');
  await pool.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
