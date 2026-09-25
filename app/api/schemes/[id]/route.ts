import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth-api";
import { isResourceLocked } from "@/lib/resource-limits";


export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const result = await pool.query(
      `SELECT s.*, c.name as customer_name, p.name as product_name, p.type as product_type, p.price as product_price,
              p.land_area, p.building_area,
              pr.name as project_name,
              pp.name as payment_plan_name,
              u.username
       FROM schemes s
       JOIN customers c ON s.customer_id = c.id
       JOIN products p ON s.product_id = p.id
       JOIN projects pr ON pr.id = p.project_id
       JOIN payment_plans pp ON s.payment_plan_id = pp.id
       JOIN users u ON u.id = s.user_id
       WHERE s.id=$1 AND s.user_id=$2`,
      [id, userId]
    );
    if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (await isResourceLocked(userId, "schemes", id)) return NextResponse.json({ error: "Row locked" }, { status: 403 });
  try {
    const body = await req.json();
    const { name, payment_plan_id } = body;

    // If changing payment_plan_id, recalculate schedule from new plan
    let schedule = null;
    if (payment_plan_id) {
      const planRows = await pool.query(
        "SELECT * FROM payment_stages WHERE payment_plan_id=$1 ORDER BY stage_order",
        [payment_plan_id]
      );
      const planStages = planRows.rows;
      if (planStages.length === 0) return NextResponse.json({ error: "Payment plan not found" }, { status: 404 });

      // Get current scheme to read house price and dates
      const schemeRows = await pool.query(
        "SELECT s.*, p.name as product_name, p.price as product_price FROM schemes s JOIN products p ON s.product_id = p.id WHERE s.id=$1 AND s.user_id=$2",
        [id, userId]
      );
      if (schemeRows.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const scheme = schemeRows.rows[0];
      const housePrice = Number(scheme.product_price || 0);

      // Build non-KPR stages + KPR params
      const sorted = [...planStages].sort((a, b) => a.stage_order - b.stage_order);
      let otherTotal = 0;
      let kprRate = 0;
      let kprTenor = 0;
      let currentDate = new Date(scheme.booking_date);
      let paidBeforeStage = 0;

      for (const stage of sorted) {
        if ((stage.stage_type || "").toUpperCase() === "KPR") {
          kprRate = Number(stage.stage_value || 0);
          kprTenor = Number(stage.interval_months || 0);
          continue;
        }
        let amount = 0;
        if ((stage.amount_type || "").toUpperCase() === "PERCENTAGE") {
          amount = housePrice * Number(stage.stage_value || 0) / 100;
        } else {
          amount = Number(stage.stage_value || 0);
        }
        if (!stage.reduces_dp) otherTotal += amount;
        if (Number(stage.interval_months) > 0) {
          currentDate = new Date(currentDate);
          currentDate.setMonth(currentDate.getMonth() + Number(stage.interval_months));
        }
        paidBeforeStage += amount;
      }

      const kprAmount = Math.max(0, housePrice - otherTotal);
      let kprMonthly = 0;
      const kprSchedule: any[] = [];

      if (kprAmount > 0 && kprTenor > 0 && kprRate > 0) {
        const mr = kprRate / 100 / 12;
        const np = kprTenor * 12;
        const kprMonthly = (kprAmount * (mr * Math.pow(1 + mr, np))) / (Math.pow(1 + mr, np) - 1);
        const kprStartDate = new Date(currentDate);
        kprStartDate.setMonth(kprStartDate.getMonth() + 1);
        let runningBalance = kprAmount;
        for (let i = 1; i <= np; i++) {
          const dueDate = new Date(kprStartDate);
          dueDate.setMonth(dueDate.getMonth() + i - 1);
          const interestPayment = runningBalance * mr;
          const principalPayment = kprMonthly - interestPayment;
          runningBalance -= principalPayment;
          kprSchedule.push({
            due_date: dueDate.toISOString().split("T")[0],
            amount: Math.round(kprMonthly * 100) / 100,
            principal: Math.round(principalPayment * 100) / 100,
            interest: Math.round(interestPayment * 100) / 100,
            sebelum_pengurangan: Math.round((runningBalance + principalPayment) * 100) / 100,
            setelah_pengurangan: Math.max(0, Math.round(runningBalance * 100) / 100),
          });
        }
      }

      schedule = { housePrice, kprAmount, kprMonthly, kprRate, kprTenor, kprSchedule };
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;
    if (name !== undefined) { updates.push(`name=$${paramIdx++}`); values.push(name); }
    if (payment_plan_id !== undefined) { updates.push(`payment_plan_id=$${paramIdx++}`); values.push(payment_plan_id); }
    if (schedule !== null) { updates.push(`schedule=$${paramIdx++}`); values.push(JSON.stringify(schedule)); }
    if (updates.length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    values.push(id, userId);
    const result = await pool.query(
      `UPDATE schemes SET ${updates.join(", ")} WHERE id=$${paramIdx++} AND user_id=$${paramIdx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (await isResourceLocked(userId, "schemes", id)) return NextResponse.json({ error: "Row locked" }, { status: 403 });
  try {
    const result = await pool.query("DELETE FROM schemes WHERE id=$1 AND user_id=$2 RETURNING id", [id, userId]);
    if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
