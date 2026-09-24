import { NextResponse } from "next/server";
import db from "@/lib/db";

// POST /api/admin/migrations/add-user-memberships
// Creates user_memberships table — run once
export async function POST() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        tier VARCHAR(50) NOT NULL DEFAULT 'free',
        start_date DATE NOT NULL DEFAULT CURRENT_DATE,
        end_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_user_memberships_user_id ON user_memberships(user_id)`);

    const { rows } = await db.query(`SELECT COUNT(*) as cnt FROM user_memberships`);
    return NextResponse.json({ ok: true, count: rows[0].cnt });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
