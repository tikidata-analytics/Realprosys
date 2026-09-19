import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { generateId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const plans = await pool.query(
      "SELECT id, user_id, name, created_at FROM payment_plans WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    // Fetch stages for all plans
    const planIds = plans.rows.map((p) => p.id);
    let stages: Record<string, any[]> = {};
    if (planIds.length > 0) {
      const stageRes = await pool.query(
        `SELECT id, payment_plan_id, stage_type, stage_order, amount_type, stage_value, interval_months, reduces_dp, created_at
         FROM payment_stages WHERE payment_plan_id = ANY($1) ORDER BY payment_plan_id, stage_order`,
        [planIds]
      );
      for (const row of stageRes.rows) {
        if (!stages[row.payment_plan_id]) stages[row.payment_plan_id] = [];
        stages[row.payment_plan_id].push(row);
      }
    }
    const result = plans.rows.map((p) => ({ ...p, stages: stages[p.id] || [] }));
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { name, stages } = await req.json();
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    if (!stages || !Array.isArray(stages) || stages.length === 0) {
      return NextResponse.json({ error: "Minimal satu tahap pembayaran" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const planId = generateId();
      await client.query(
        "INSERT INTO payment_plans (id, user_id, name) VALUES ($1,$2,$3)",
        [planId, userId, name]
      );

      for (const stage of stages) {
        if (!stage.stage_type || stage.amount_type == null) continue;
        const stageId = generateId();
        await client.query(
          `INSERT INTO payment_stages (id, payment_plan_id, stage_type, stage_order, amount_type, stage_value, interval_months, reduces_dp)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            stageId,
            planId,
            stage.stage_type,
            stage.stage_order ?? 0,
            stage.amount_type,
            stage.stage_value ?? null,
            stage.interval_months ?? 0,
            stage.stage_type === "BOOKING_FEE" ? !!stage.reduces_dp : false,
          ]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ id: planId, user_id: userId, name, stages }, { status: 201 });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("PP POST error:", err);
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}
