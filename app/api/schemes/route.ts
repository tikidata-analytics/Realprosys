import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { generateId } from "@/lib/auth";
import { checkLimit, limitResponse } from "@/lib/limits";
import { getUserIdFromRequest } from "@/lib/auth-api";
import { getUserResourceLimit } from "@/lib/resource-limits";


export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const sort = searchParams.get("sort") || "created_at:desc";
  const pageSize = 10;

  const [orderBy, orderDir] = sort.split(":");
  const allowedSorts = ["name", "created_at", "booking_date", "customer_name", "product_name", "payment_plan_name"];
  const safeOrderBy = allowedSorts.includes(orderBy) ? orderBy : "created_at";
  const safeOrderDir = orderDir === "asc" ? "ASC" : "DESC";
  const offset = (page - 1) * pageSize;

  try {
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM schemes s
       JOIN customers c ON s.customer_id = c.id
       JOIN products p ON s.product_id = p.id
       JOIN payment_plans pp ON s.payment_plan_id = pp.id
       WHERE s.user_id = $1 AND s.name ILIKE $2`,
      [userId, `%${q}%`]
    );
    const total = parseInt(countResult.rows[0].total);

    const result = await pool.query(
      `SELECT s.*, c.name as customer_name, p.name as product_name, pp.name as payment_plan_name
       FROM schemes s
       JOIN customers c ON s.customer_id = c.id
       JOIN products p ON s.product_id = p.id
       JOIN payment_plans pp ON s.payment_plan_id = pp.id
       WHERE s.user_id = $1 AND s.name ILIKE $2
       ORDER BY s.${safeOrderBy} ${safeOrderDir}
       LIMIT $3 OFFSET $4`,
      [userId, `%${q}%`, pageSize, offset]
    );

    const { limit } = await getUserResourceLimit(userId, "schemes");
    const locked = limit < Infinity;
    const rows = result.rows.map((row: any, idx: number) => ({ ...row, _locked: locked && idx >= limit }));

    return NextResponse.json({ rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize), limit });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await checkLimit(userId, "schemes");
  if (!limit) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!limit.allowed) return limitResponse("schemes");

  try {
    const { name, customer_id, product_id, payment_plan_id, booking_date } = await req.json();
    if (!name || !customer_id || !product_id || !payment_plan_id || !booking_date) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    // Get product
    const productRes = await pool.query("SELECT * FROM products WHERE id=$1 AND user_id=$2", [product_id, userId]);
    if (productRes.rows.length === 0) return NextResponse.json({ error: "Invalid product" }, { status: 400 });

    // Get plan with stages
    const planRes = await pool.query(
      `SELECT pp.*, COALESCE(json_agg(ps.* ORDER BY ps.stage_order) FILTER (WHERE ps.id IS NOT NULL), '[]') as stages
       FROM payment_plans pp
       LEFT JOIN payment_stages ps ON ps.payment_plan_id = pp.id
       WHERE pp.id=$1 AND pp.user_id=$2
       GROUP BY pp.id`,
      [payment_plan_id, userId]
    );
    if (planRes.rows.length === 0) return NextResponse.json({ error: "Invalid payment plan" }, { status: 400 });

    const plan = planRes.rows[0];
    const stages: any[] = plan.stages || [];
    const housePrice = Number(productRes.rows[0].price);

    // ─── Calculate each stage amount ───
    let otherStagesTotal = 0;
    let kprAmount = 0;
    let kprRate = 0;
    let kprTenor = 0;
    const scheduleRows: any[] = [];

    // Sort stages by stage_order
    const sortedStages = [...stages].sort((a, b) => a.stage_order - b.stage_order);

    let currentDate = new Date(booking_date);

    // Running total of what buyer has paid before this stage
    let paidBeforeStage = 0;

    for (const stage of sortedStages) {
      const stageType: string = (stage.stage_type || "").trim().toUpperCase();
      const amountType: string = (stage.amount_type || "").trim().toUpperCase();
      const value = Number(stage.stage_value || 0);
      const intervalMonths = Number(stage.interval_months || 0);

      if (stageType === "KPR") {
        kprRate = value; // for KPR, stage_value = interest_rate
        kprTenor = intervalMonths; // interval_months = tenor in years for KPR
        continue; // KPR amount calculated after all others
      }

      let amount = 0;
      if (amountType === "PERCENTAGE") {
        amount = housePrice * value / 100;
      } else {
        amount = value;
      }

      // Booking Fee with reduces_dp=true: reduces the effective house price for DP calculation
      // It does NOT count toward otherStagesTotal (which affects KPR)
      const reducesDp = !!stage.reduces_dp;

      if (!reducesDp) {
        otherStagesTotal += amount;
      }

      // Advance date by interval
      if (intervalMonths > 0) {
        currentDate = new Date(currentDate);
        currentDate.setMonth(currentDate.getMonth() + intervalMonths);
      }

      // sebelum_pengurangan = total yang sudah dibayar SEBELUM tahap ini
      // setelah_pengurangan = total yang sudah dibayar SETELAH tahap ini
      const sebelum = Math.round(paidBeforeStage * 100) / 100;
      paidBeforeStage += amount;
      const setelah = Math.round(paidBeforeStage * 100) / 100;

      scheduleRows.push({
        stage_type: stageType,
        reduces_dp: reducesDp,
        due_date: currentDate.toISOString().split("T")[0],
        amount: Math.round(amount * 100) / 100,
        sebelum_pengurangan: sebelum,
        setelah_pengurangan: setelah,
        is_kpr: false,
      });
    }

    // KPR = remaining after all non-KPR stages (BF with reduces_dp already excluded from otherStagesTotal)
    kprAmount = Math.max(0, housePrice - otherStagesTotal);

    // ─── Build KPR schedule ───
    let kprMonthlyPayment = 0;
    if (kprAmount > 0 && kprTenor > 0 && kprRate > 0) {
      const monthlyRate = kprRate / 100 / 12;
      const numPayments = kprTenor * 12;
      kprMonthlyPayment =
        (kprAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);
    } else if (kprAmount > 0 && kprTenor > 0) {
      kprMonthlyPayment = kprAmount / (kprTenor * 12);
    }

    if (kprAmount > 0 && kprTenor > 0) {
      // KPR starts 1 month after the last non-KPR stage's due date
      const kprStartDate = new Date(currentDate);
      kprStartDate.setMonth(kprStartDate.getMonth() + 1);
      let runningBalance = kprAmount;
      for (let i = 1; i <= kprTenor * 12; i++) {
        const dueDate = new Date(kprStartDate);
        dueDate.setMonth(dueDate.getMonth() + i - 1);
        // sebelum = saldo SEBELUM pembayaran ini (simpan SEBELUM kurangi)
        const sebelum = Math.round(runningBalance * 100) / 100;
        const interestPayment = runningBalance * (kprRate / 100 / 12);
        const principalPayment = kprMonthlyPayment - interestPayment;
        runningBalance -= principalPayment;
        const setelah = Math.max(0, Math.round(runningBalance * 100) / 100);
        scheduleRows.push({
          stage_type: "KPR",
          due_date: dueDate.toISOString().split("T")[0],
          amount: Math.round(kprMonthlyPayment * 100) / 100,
          principal: Math.round(principalPayment * 100) / 100,
          interest: Math.round(interestPayment * 100) / 100,
          sebelum_pengurangan: sebelum,
          setelah_pengurangan: setelah,
          is_kpr: true,
        });
      }
    }

    const id = generateId();
    const schedule = {
      housePrice,
      stages: scheduleRows,
      kprAmount: Math.round(kprAmount * 100) / 100,
      kprMonthlyPayment: Math.round(kprMonthlyPayment * 100) / 100,
    };

    await pool.query(
      "INSERT INTO schemes (id, user_id, name, customer_id, product_id, payment_plan_id, booking_date, schedule) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [id, userId, name, customer_id, product_id, payment_plan_id, booking_date, JSON.stringify(schedule)]
    );

    return NextResponse.json({ id, user_id: userId, name, customer_id, product_id, payment_plan_id, booking_date, schedule }, { status: 201 });
  } catch (err) {
    console.error("Scheme create error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
