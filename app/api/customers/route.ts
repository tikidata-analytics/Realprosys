import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { generateId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await pool.query(
      "SELECT * FROM customers WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, email, phone } = await req.json();
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const id = generateId();
    await pool.query(
      "INSERT INTO customers (id, user_id, name, email, phone) VALUES ($1,$2,$3,$4,$5)",
      [id, userId, name, email || null, phone || null]
    );
    return NextResponse.json({ id, user_id: userId, name, email, phone }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
