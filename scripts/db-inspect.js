require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED,
  ssl: { rejectUnauthorized: false }
});
pool.query(`
  SELECT table_name, column_name, data_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
  ORDER BY table_name, ordinal_position
`).then(r => {
  const rows = r.rows;
  const tables = [...new Set(rows.map(r => r.table_name))];
  tables.forEach(t => {
    console.log('\n=== ' + t + ' ===');
    rows.filter(r => r.table_name === t).forEach(c =>
      console.log(c.column_name + ' [' + c.data_type + ']')
    );
  });
}).catch(e => console.error(e.message)).finally(() => pool.end());
