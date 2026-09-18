import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const result = await pool.query(
      "SELECT * FROM customers WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const { name, email, phone, birth_date, gender } = await req.json();
    if (email) {
      const existing = await pool.query("SELECT id FROM customers WHERE user_id=$1 AND LOWER(email)=LOWER($2) AND id!=$3", [userId, email, id]);
      if (existing.rows.length > 0) return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
    }
    const result = await pool.query(
      "UPDATE customers SET name=COALESCE(NULLIF($1,''),name), email=$2, phone=COALESCE(NULLIF($3,''),phone), birth_date=$4, gender=$5 WHERE id=$6 AND user_id=$7 RETURNING *",
      [name, email || null, phone, birth_date || null, gender || null, id, userId]
    );
    if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const result = await pool.query(
      "DELETE FROM customers WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId]
    );
    if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
