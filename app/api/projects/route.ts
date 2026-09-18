import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { generateId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await pool.query("SELECT id, user_id, name, location, created_at FROM projects WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
    return NextResponse.json(result.rows);
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { name, location } = await req.json();
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    const id = generateId();
    await pool.query("INSERT INTO projects (id, user_id, name, location) VALUES ($1,$2,$3,$4)", [id, userId, name, location || null]);
    return NextResponse.json({ id, user_id: userId, name, location }, { status: 201 });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
