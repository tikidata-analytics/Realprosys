import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const result = await pool.query(
      "SELECT id, email, name FROM users WHERE id = $1",
      [userId]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ user: null }, { status: 404 });
    }
    return NextResponse.json({ user: result.rows[0] });
  } catch {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
