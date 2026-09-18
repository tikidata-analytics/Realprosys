const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  console.log("Adding token_version to users (for logout revocation)...");
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1
  `).catch(e => { if (!e.message.includes('already exists')) throw e; });
  console.log("OK");

  console.log("Adding amortization_version to schemes...");
  await pool.query(`
    ALTER TABLE schemes
    ADD COLUMN IF NOT EXISTS amortization_version INTEGER DEFAULT 1
  `).catch(e => { if (!e.message.includes('already exists')) throw e; });
  console.log("OK");

  console.log("Done!");
  process.exit(0);
}

migrate().catch((e) => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});
