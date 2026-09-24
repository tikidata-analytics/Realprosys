const { Client } = require("pg");
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => {
  return client.query(`ALTER TABLE tiers ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false`);
}).then(r => {
  console.log("✅ featured column added to tiers");
  return client.query("SELECT name, featured FROM tiers");
}).then(r => {
  console.log("All tiers:", r.rows);
  client.end();
}).catch(e => { console.error(e.message); process.exit(1); });
