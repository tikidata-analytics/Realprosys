import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { isWebmaster } from "@/lib/users";
import { getUserIdFromRequest } from "@/lib/auth-api";


// GET /api/config/tier-history
// Query params:
//   user_q    — filter by affected user's email (partial match)
//   action    — filter: "upgrade" | "downgrade" | undefined (all)
export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId || !(await isWebmaster(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const userQ = searchParams.get("user_q") || "";
  const action = searchParams.get("action") || "";

  try {
    const conditions: string[] = [];
    const params: string[] = [];

    if (userQ) {
      params.push(`%${userQ}%`);
      conditions.push(`LOWER(u.email) LIKE LOWER($${params.length})`);
    }

    if (action === "upgrade") {
      conditions.push(`tc.from_tier = 'free' AND tc.to_tier = 'premium'`);
    } else if (action === "downgrade") {
      conditions.push(`tc.from_tier = 'premium' AND tc.to_tier = 'free'`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT
        tc.id,
        tc.user_id,
        u.email   as user_email,
        u.username as user_username,
        tc.from_tier,
        tc.to_tier,
        tc.from_role,
        tc.to_role,
        tc.changed_by,
        cb.email  as changed_by_email,
        tc.changed_at
      FROM tier_changes tc
      JOIN users u  ON tc.user_id  = u.id
      JOIN users cb ON tc.changed_by = cb.id
      ${where}
      ORDER BY tc.changed_at DESC
      LIMIT 100
    `;

    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("GET /api/config/tier-history error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
