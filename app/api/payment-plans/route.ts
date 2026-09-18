import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { generateId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await pool.query(
      "SELECT * FROM payment_plans WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    return NextResponse.json(result.rows);
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { name, down_payment_pct, loan_tenor_years, interest_rate } = await req.json();
    if (!name || down_payment_pct == null || !loan_tenor_years || interest_rate == null) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }
    const id = generateId();
    await pool.query(
      "INSERT INTO payment_plans (id, user_id, name, down_payment_pct, loan_tenor_years, interest_rate) VALUES ($1,$2,$3,$4,$5,$6)",
      [id, userId, name, down_payment_pct, loan_tenor_years, interest_rate]
    );
    return NextResponse.json({ id, user_id: userId, name, down_payment_pct, loan_tenor_years, interest_rate }, { status: 201 });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
