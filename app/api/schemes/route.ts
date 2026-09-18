import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { generateId } from "@/lib/auth";
import { calculateAmortization } from "@/lib/amortization";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await pool.query(
      `SELECT s.*, c.name as customer_name, p.name as product_name, pp.name as payment_plan_name, pp.interest_rate, pp.down_payment_pct, pp.loan_tenor_years
       FROM schemes s
       JOIN customers c ON s.customer_id = c.id
       JOIN products p ON s.product_id = p.id
       JOIN payment_plans pp ON s.payment_plan_id = pp.id
       WHERE s.user_id = $1 ORDER BY s.created_at DESC`,
      [userId]
    );
    return NextResponse.json(result.rows);
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { name, customer_id, product_id, payment_plan_id, booking_date } = await req.json();
    if (!name || !customer_id || !product_id || !payment_plan_id || !booking_date) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    // Get product and payment plan
    const [productRes, planRes] = await Promise.all([
      pool.query("SELECT * FROM products WHERE id=$1 AND user_id=$2", [product_id, userId]),
      pool.query("SELECT * FROM payment_plans WHERE id=$1 AND user_id=$2", [payment_plan_id, userId]),
    ]);

    if (productRes.rows.length === 0 || planRes.rows.length === 0) {
      return NextResponse.json({ error: "Invalid product or payment plan" }, { status: 400 });
    }

    const product = productRes.rows[0];
    const plan = planRes.rows[0];

    // Calculate amortization schedule
    const schedule = calculateAmortization(
      Number(product.price),
      Number(plan.down_payment_pct),
      Number(plan.loan_tenor_years),
      Number(plan.interest_rate),
      new Date(booking_date)
    );

    const id = generateId();
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
