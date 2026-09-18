import pg from "pg";

const { Pool } = pg;

function getDatabaseUrl(): string {
  // Use Neon env vars set by Vercel integration, or fallback to DATABASE_URL
  const host = process.env.rps_PGHOST || process.env.PGHOST;
  const database = process.env.rps_PGDATABASE || process.env.PGDATABASE;
  const user = process.env.rps_POSTGRES_USER || process.env.PGUSER;
  const password = process.env.rps_POSTGRES_PASSWORD || process.env.PGPASSWORD;

  if (host && database && user && password) {
    return `postgresql://${user}:${password}@${host}/${database}?sslmode=require`;
  }
  return process.env.DATABASE_URL!;
}

const pool = new Pool({
  connectionString: getDatabaseUrl(),
  ssl: { rejectUnauthorized: false },
});

export default pool;
