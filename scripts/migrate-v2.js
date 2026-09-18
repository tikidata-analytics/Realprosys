const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  console.log("Migrating customers: adding birth_date, gender...");
  await pool.query(`
    ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS birth_date DATE,
    ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('LAKI', 'PEREMPUAN'))
  `);
  console.log("OK: customers");

  console.log("Counting orphaned products...");
  const { rows } = await pool.query("SELECT COUNT(*) FROM products WHERE project_id IS NULL");
  console.log("Orphaned products:", rows[0].count);

  if (parseInt(rows[0].count) > 0) {
    console.log("Deleting orphaned products...");
    await pool.query("DELETE FROM products WHERE project_id IS NULL");
    console.log("OK: deleted orphaned products");
  }

  console.log("Adding property fields to products...");
  await pool.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS land_area NUMERIC,
    ADD COLUMN IF NOT EXISTS building_area NUMERIC,
    ADD COLUMN IF NOT EXISTS bedrooms INTEGER,
    ADD COLUMN IF NOT EXISTS bathrooms INTEGER
  `);
  console.log("OK: products property fields");

  console.log("Making project_id NOT NULL...");
  await pool.query("ALTER TABLE products ALTER COLUMN project_id SET NOT NULL");
  console.log("OK: project_id NOT NULL");

  console.log("Done!");
  process.exit(0);
}

migrate().catch((e) => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});
