import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { generateId } from "@/lib/auth";
import { getUserIdFromRequest } from "@/lib/auth-api";
import { isResourceLocked } from "@/lib/resource-limits";


export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const plan = await pool.query(
      "SELECT id, user_id, name, created_at FROM payment_plans WHERE id=$1 AND user_id=$2",
      [id, userId]
    );
    if (plan.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const stages = await pool.query(
      `SELECT id, payment_plan_id, stage_type, stage_order, amount_type, stage_value, interval_months, reduces_dp, created_at
       FROM payment_stages WHERE payment_plan_id=$1 ORDER BY stage_order`,
      [id]
    );

    return NextResponse.json({ ...plan.rows[0], stages: stages.rows });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (await isResourceLocked(userId, "payment_plans", id)) return NextResponse.json({ error: "Row locked" }, { status: 403 });
  try {
    const { name, stages } = await req.json();

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const existing = await client.query(
        "SELECT id FROM payment_plans WHERE id=$1 AND user_id=$2",
        [id, userId]
      );
      if (existing.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      if (name != null) {
        await client.query("UPDATE payment_plans SET name=$1 WHERE id=$2 AND user_id=$3", [name, id, userId]);
      }

      if (stages != null) {
        await client.query("DELETE FROM payment_stages WHERE payment_plan_id=$1", [id]);
        for (const stage of stages) {
          if (!stage.stage_type || stage.amount_type == null) continue;
          const stageId = generateId();
          await client.query(
            `INSERT INTO payment_stages (id, payment_plan_id, stage_type, stage_order, amount_type, stage_value, interval_months, reduces_dp)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              stageId, id,
              stage.stage_type,
              stage.stage_order ?? 0,
              stage.amount_type,
              stage.stage_value ?? null,
              stage.interval_months ?? 0,
              stage.stage_type === "BOOKING_FEE" ? !!stage.reduces_dp : false,
            ]
          );
        }
      }

      await client.query("COMMIT");
      const updated = await pool.query("SELECT id, user_id, name, created_at FROM payment_plans WHERE id=$1 AND user_id=$2", [id, userId]);
      const updatedStages = await pool.query("SELECT * FROM payment_stages WHERE payment_plan_id=$1 ORDER BY stage_order", [id]);
      return NextResponse.json({ ...updated.rows[0], stages: updatedStages.rows });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (await isResourceLocked(userId, "payment_plans", id)) return NextResponse.json({ error: "Row locked" }, { status: 403 });
  try {
    const result = await pool.query("DELETE FROM payment_plans WHERE id=$1 AND user_id=$2 RETURNING id", [id, userId]);
    if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
