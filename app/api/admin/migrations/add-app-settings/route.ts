import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      INSERT INTO app_settings (key, value)
      VALUES ('admin_wa', '')
      ON CONFLICT (key) DO NOTHING
    `);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
