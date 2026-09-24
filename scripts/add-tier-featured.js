import pg from "pg";

const { Client } = pg;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Add featured BOOLEAN column
  await client.query(`
    ALTER TABLE tiers
    ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false
  `);
  console.log("✅ Column 'featured' added to tiers");

  // Report existing featured tiers
  const { rows } = await client.query(`SELECT name FROM tiers WHERE featured = true`);
  if (rows.length === 0) {
    console.log("ℹ️  No tier has featured=true");
  } else {
    console.log(`ℹ️  Tiers with featured=true: ${rows.map(r => r.name).join(", ")}`);
  }

  await client.end();
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
