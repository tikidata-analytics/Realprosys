import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Create payment_stages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_stages (
        id VARCHAR(36) PRIMARY KEY,
        payment_plan_id VARCHAR(36) NOT NULL,
        stage_type VARCHAR(20) NOT NULL,
        stage_order INTEGER NOT NULL,
        amount_type VARCHAR(10) NOT NULL,
        stage_value NUMERIC(15,2),
        interval_months INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_stages_plan_order
      ON payment_stages(payment_plan_id, stage_order)
    `);

    // Migrate existing plans
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
    `);

    return NextResponse.json({ ok: true, message: "Migration complete" });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Migration failed" }, { status: 500 });
  }
}
