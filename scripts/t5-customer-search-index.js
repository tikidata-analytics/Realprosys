/**
 * Add composite index for customer search scalability.
 * Covers: WHERE user_id = $1 AND (name ILIKE $2 OR email ILIKE $2 OR phone ILIKE $2)
 */
const { Pool } = require("pg");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  console.log("Running migration: customer search index...");

  try {
    // Composite index covering all three search columns + user_id
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_user_id_search
      ON customers (user_id, name, email, phone)
    `);
    console.log("OK: idx_customers_user_id_search created");

    // GIN trigram index for faster ILIKE '%query%' on name/email/phone
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_name_trgm
      ON customers USING gin (name gin_trgm_ops)
    `);
    console.log("OK: idx_customers_name_trgm created");

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_email_trgm
      ON customers USING gin (email gin_trgm_ops)
    `);
    console.log("OK: idx_customers_email_trgm created");

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_phone_trgm
      ON customers USING gin (phone gin_trgm_ops)
    `);
    console.log("OK: idx_customers_phone_trgm created");

  } catch (err) {
    console.error("ERROR:", err.message);
  }

  console.log("Done.");
  process.exit(0);
}

migrate();
