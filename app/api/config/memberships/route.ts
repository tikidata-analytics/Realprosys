import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { isWebmaster } from "@/lib/users";
import { getUserIdFromRequest } from "@/lib/auth-api";

// GET /api/config/memberships — list all memberships with user info
export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isWebmaster(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  try {
    const countResult = await db.query(`SELECT COUNT(*) as total FROM user_memberships`);
    const total = parseInt(countResult.rows[0].total);

    const result = await db.query(
      `SELECT um.*, u.email, u.username, u.name as user_name
       FROM user_memberships um
       JOIN users u ON um.user_id = u.id
       ORDER BY um.created_at DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );

    return NextResponse.json({ rows: result.rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

// POST /api/config/memberships — assign a membership to a user
export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isWebmaster(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { user_id, tier, start_date, end_date, duration_value, duration_unit } = body;

  if (!user_id) return NextResponse.json({ error: "User wajib dipilih." }, { status: 400 });
  if (!tier) return NextResponse.json({ error: "Tier wajib dipilih." }, { status: 400 });

  // Validate user exists
  const userRes = await db.query(`SELECT id, email FROM users WHERE id = $1`, [user_id]);
  if (userRes.rows.length === 0) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

  // Compute end_date from duration if provided
  let computedEndDate = end_date || null;
  if (!computedEndDate && duration_value && duration_unit) {
    const start = start_date ? new Date(start_date) : new Date();
    if (duration_unit === "months") start.setMonth(start.getMonth() + parseInt(duration_value));
    else if (duration_unit === "years") start.setFullYear(start.getFullYear() + parseInt(duration_value));
    // Subtract 1 day so it ends at end of that day (e.g. 1 month from Jan 1 = Jan 31)
    start.setDate(start.getDate() - 1);
    computedEndDate = start.toISOString().split("T")[0];
  }

  const computedStartDate = start_date || new Date().toISOString().split("T")[0];

  try {
    const result = await db.query(
      `INSERT INTO user_memberships (user_id, tier, start_date, end_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, tier, computedStartDate, computedEndDate]
    );

    // Update user's tier to match
    await db.query(`UPDATE users SET tier = $1 WHERE id = $2`, [tier, user_id]);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (e: any) {
    if (e.code === "23505") return NextResponse.json({ error: "User sudah memiliki membership aktif." }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
