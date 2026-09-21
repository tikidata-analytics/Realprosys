import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { isWebmaster } from "@/lib/users";
import { generateId } from "@/lib/auth";

// GET /api/config/users?q= — search users by email or username (webmaster only)
export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId || !(await isWebmaster(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q") || "";
  if (q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const result = await pool.query(
      `SELECT id, email, username, name, role, tier, created_at
       FROM users
       WHERE LOWER(email) LIKE LOWER($1) OR LOWER(username) LIKE LOWER($1)
       ORDER BY created_at DESC
       LIMIT 20`,
      [`%${q}%`]
    );
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
