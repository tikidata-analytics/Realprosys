import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const result = await pool.query("SELECT id, user_id, name, down_payment_pct, loan_tenor_years, interest_rate, created_at FROM payment_plans WHERE id=$1 AND user_id=$2", [id, userId]);
    if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const { name, down_payment_pct, loan_tenor_years, interest_rate } = await req.json();
    const result = await pool.query(
      "UPDATE payment_plans SET name=COALESCE($1,name), down_payment_pct=COALESCE($2,down_payment_pct), loan_tenor_years=COALESCE($3,loan_tenor_years), interest_rate=COALESCE($4,interest_rate) WHERE id=$5 AND user_id=$6 RETURNING *",
      [name, down_payment_pct, loan_tenor_years, interest_rate, id, userId]
    );
    if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const result = await pool.query("DELETE FROM payment_plans WHERE id=$1 AND user_id=$2 RETURNING id", [id, userId]);
    if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
